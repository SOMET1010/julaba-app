// ──────────────────────────────────────────────────────────────────────────
// STT hors-ligne pour Julaba — transcription 100 % SUR L'APPAREIL.
//
// MOTEUR UNIQUE : sherpa-onnx (vocs. Vosk définitivement retiré, août 2026).
//   - APK Android : plugin NATIF (SherpaSttPlugin.java, OnlineRecognizer).
//   - Web/PWA : WASM (streaming zipformer FR int8) — runtime vendored dans
//     public/voix/sherpa/, modèle FR (~128 Mo) téléchargé à l'installation
//     (consentement) puis persisté dans la Cache API.
//     Le WASM exige une origine « cross-origin isolated » (COOP + COEP,
//     SharedArrayBuffer) : sans elle, le mode hors-ligne est simplement
//     indisponible (plus de repli Vosk — message clair dans InstallerOffline).
//
// Interface publique conservée (transcribeWav, ensureOfflineModel,
// offlineModelReady, offlineModelInstalled, warmOfflineModelIfInstalled,
// startLiveDictation) : rien d'autre ne change pour les consommateurs.
// ──────────────────────────────────────────────────────────────────────────

import { nativeStt } from './nativeStt';
import {
  SHERPA_API_JS,
  SHERPA_RUNTIME_GLUE_JS,
  SHERPA_MODEL_FILES,
  SHERPA_NATIVE_FILES,
  SHERPA_SAMPLE_RATE,
  buildSherpaOnlineConfig,
} from './sherpaModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let modelPromise: Promise<Any> | null = null;
let modelReady = false;
let sharedCtx: AudioContext | null = null;

/**
 * Télémétrie d'init du moteur STT (event `stt_init` → EventMonitor backoffice).
 * Défensive : ne casse JAMAIS l'init (import différé, échec avalé).
 */
function trackInit(
  engine: 'native' | 'wasm',
  success: boolean,
  phase: 'prepare' | 'load' | 'recognizer',
  durationMs: number,
  error?: string,
): void {
  import('../services/voiceTelemetry')
    .then((m) => m.trackSttInit(engine, success, phase, durationMs, error))
    .catch(() => { /* la télémétrie ne casse jamais la voix */ });
}

// Drapeau PERSISTANT : le modèle a déjà été installé une fois sur cet appareil
// (il reste en cache navigateur). `modelReady`, lui, est une variable mémoire
// remise à zéro à CHAQUE rechargement de page — sans ce drapeau, l'appli
// « oubliait » le mode hors-ligne après un reload et retombait sur le cloud.
const INSTALL_KEY = 'julaba_offline_installed';

// ── Moteur installé (persistant) ───────────────────────────────────────────
// Seul sherpa existe désormais (natif APK ou WASM web) : le drapeau mémorise
// que le mode hors-ligne a été installé pour ré-échauffer sans re-télécharger.
// Un ancien appareil Vosk (INSTALL_KEY posé, moteur 'vosk') n'est pas considéré
// comme installé : il devra (re)installer sherpa via InstallerOffline (migration).
const ENGINE_KEY = 'julaba_offline_engine';            // 'sherpa' uniquement
const SHERPA_UNAVAILABLE_KEY = 'julaba_sherpa_unavailable';

function readEngine(): 'sherpa' | null {
  try {
    return localStorage.getItem(ENGINE_KEY) === 'sherpa' ? 'sherpa' : null;
  } catch { return null; }
}
function writeEngine(): void {
  try { localStorage.setItem(ENGINE_KEY, 'sherpa'); } catch { /* ignore */ }
}
function sherpaUnavailable(): boolean {
  try { return localStorage.getItem(SHERPA_UNAVAILABLE_KEY) === '1'; } catch { return false; }
}
function setSherpaUnavailable(): void {
  try { localStorage.setItem(SHERPA_UNAVAILABLE_KEY, '1'); } catch { /* ignore */ }
}

/**
 * Oublie un échec sherpa précédent permet de re-tenter (bouton UI).
 *
 * IMPORTANT (race condition) : on ne touche PAS à un `modelPromise` en vol.
 * Si une init est en cours, l'invalider maintenant lancerait une DEUXIÈME init
 * en parallèle au prochain `ensureOfflineModel()` double `createOnlineRecognizer`,
 * fuite du premier recognizer (jamais `.free()`). On bump juste un numéro de
 * génération : l'init en cours reste valide, mais son succès ne marquera plus
 * sherpa « disponible » si une nouvelle génération a démarré entre-temps.
 */
let initGeneration = 0;
export function clearSherpaUnavailable(): void {
  try { localStorage.removeItem(SHERPA_UNAVAILABLE_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(ENGINE_KEY); } catch { /* ignore */ }
  // On n'invalide une promesse en vol que si elle a déjà résolu/rejeté
  // (sinon on crée la double-init décrite ci-dessus). Comme on ne peut pas le
  // savoir synchroniquement, on ne reset QUE les flags persistants + mémoire
  // d'échec — la promesse en cours se terminera et fixera `modelReady` à son
  // résultat réel. Un NOUVEL appel `ensureOfflineModel` (via le bouton) trouvera
  // `modelPromise` non null et attendra la fin de l'init courante.
  modelReady = false;
}

// ── Moteur sherpa-onnx (état) ──────────────────────────────────────────────
let sherpaRuntime: Promise<Any> | null = null; // résout vers le Module Emscripten
let sherpaRecognizer: Any | null = null;       // OnlineRecognizer (créé 1×/page)
const MODEL_CACHE = 'julaba-sherpa-stt-v1';

// Marqueur : le moteur actif est le sherpa NATIF (APK Capacitor). La
// transcription et la dictée passent alors par le plugin SherpaSttPlugin.java.
const NATIVE_ENGINE = { native: true } as const;

/**
 * Prépare le moteur NATIF : le plugin télécharge les modèles (filesDir) puis
 * initialise son OnlineRecognizer. Idempotent — sans réseau si déjà téléchargé.
 * @returns vrai si le recognizer natif est prêt
 */
async function prepareNativeEngine(
  onProgress?: (doneBytes: number, totalBytes: number) => void,
): Promise<boolean> {
  const grandTotal = SHERPA_NATIVE_FILES.reduce((s, f) => s + f.size, 0);
  // Sommes cumulées avant chaque fichier progression GLOBALE pour l'UI
  // (le plugin rapporte la progression par fichier).
  const prefix: number[] = [];
  let acc = 0;
  for (const f of SHERPA_NATIVE_FILES) { prefix.push(acc); acc += f.size; }
  return nativeStt.prepare(SHERPA_NATIVE_FILES, (name, done, total) => {
    if (!onProgress || !total) return;
    const idx = SHERPA_NATIVE_FILES.findIndex((f) => f.name === name);
    const base = idx >= 0 ? prefix[idx] : 0;
    onProgress(base + Math.min(done, total), grandTotal);
  });
}

// ── Notifications de préparation du modèle ─────────────────────────────────
// Permet à l'UI (badge moteur, mains libres…) de réagir quand le moteur passe
// à « prêt » en tâche de fond (installation, ré-échauffement au boot).
type ModelListener = () => void;
const modelListeners = new Set<ModelListener>();

/** S'abonner aux changements d'état du modèle vocal. Renvoie une fonction de désabonnement. */
export function subscribeModelReady(cb: () => void): () => void {
  modelListeners.add(cb);
  return () => { modelListeners.delete(cb); };
}
function emitModelReady(): void {
  modelListeners.forEach((l) => { try { l(); } catch { /* ignore */ } });
}

/** Vrai si le navigateur peut charger le runtime sherpa (SAB COOP/COEP). */
export function sherpaSupported(): boolean {
  try {
    return typeof crossOriginIsolated === 'boolean' && crossOriginIsolated;
  } catch { return false; }
}

/**
 * Nom du moteur visé pour l'UI (InstallerOffline) : 'sherpa' si le contexte le
 * permet (natif APK, ou WASM sur origine isolée, et pas en échec), sinon null
 * (le mode hors-ligne est indisponible — plus de repli Vosk).
 */
export function sttEngine(): 'sherpa' | null {
  // APK Capacitor : sherpa NATIF (aucune exigence COOP/COEP).
  if (nativeStt.present()) return 'sherpa';
  if (sherpaSupported() && !sherpaUnavailable()) return 'sherpa';
  return null;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`impossible de charger ${src} (runtime non déployé ?)`));
    document.head.appendChild(s);
  });
}

/** Charge le runtime sherpa (scripts classiques + Module Emscripten). */
async function loadSherpaRuntime(): Promise<Any> {
  if (sherpaRuntime) return sherpaRuntime;
  sherpaRuntime = (async () => {
    if (!sherpaSupported()) {
      throw new Error('sherpa nécessite une origine cross-origin isolée (COOP/COEP)');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.Module) w.Module = {};
    // Court-circuite le téléchargement du .data anglais embarqué (~190 Mo) :
    // le runtime démarre avec une FS virtuelle vide, on y écrit le modèle FR.
    w.Module.getPreloadedPackage = () => new ArrayBuffer(0);
    // La glue API (createOnlineRecognizer…) est un script classique global.
    if (typeof w.createOnlineRecognizer !== 'function') {
      await loadScript(SHERPA_API_JS);
    }
    if (!w.__julabaSherpaLoaded) {
      w.__julabaSherpaLoaded = true;
      const ready = new Promise<Any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout init runtime sherpa')), 90000);
        w.Module.onRuntimeInitialized = () => { clearTimeout(timer); resolve(w.Module); };
      });
      await loadScript(SHERPA_RUNTIME_GLUE_JS); // instancie le module (pthreads)
      await ready;
    }
    return w.Module;
  })().catch((e) => {
    // Réinitialise tout pour permettre un NOUVEL essai (sinon le callback
    // onRuntimeInitialized, à usage unique, ne se redéclencherait jamais).
    sherpaRuntime = null;
    try { (window as any).__julabaSherpaLoaded = false; } catch { /* ignore */ }
    throw e;
  });
  return sherpaRuntime;
}

async function cacheGet(url: string): Promise<Response | null> {
  try {
    if (typeof caches === 'undefined') return null;
    return (await caches.match(url)) ?? null;
  } catch { return null; }
}

async function cachePut(url: string, resp: Response): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    await caches.open(MODEL_CACHE).then((c) => c.put(url, resp));
  } catch { /* quota navigateur — on continue sans cache (re-téléchargera) */ }
}

/** Vrai si les 4 fichiers du modèle sont déjà dans la Cache API (repli hors-ligne). */
async function sherpaModelCached(): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false;
    const c = await caches.open(MODEL_CACHE);
    for (const f of SHERPA_MODEL_FILES) {
      const r = await c.match(f.url);
      if (!r) return false;
    }
    return true;
  } catch { return false; }
}

/** Écrit le modèle FR dans la FS virtuelle Emscripten (cache d'abord, sinon réseau). */
async function ensureModelInFs(
  mod: Any,
  onProgress?: (doneBytes: number, totalBytes: number) => void,
): Promise<void> {
  const total = SHERPA_MODEL_FILES.reduce((s, f) => s + f.size, 0);
  let done = 0;
  for (const f of SHERPA_MODEL_FILES) {
    let resp = await cacheGet(f.url);
    if (!resp || !resp.ok) {
      resp = await fetch(f.url);
      if (!resp.ok) throw new Error(`Modèle vocal : HTTP ${resp.status}`);
      await cachePut(f.url, resp.clone());
    }
    const bytes = new Uint8Array(await resp.arrayBuffer());
    // Même appel que le runtime officiel : chemin complet + null + data.
    // Idempotent : si un essai précédent a déjà écrit ce fichier (reprise),
    // FS_createDataFile lèverait EEXIST on continue.
    try {
      mod.FS_createDataFile(f.fsPath, null, bytes, true, true, true);
    } catch (e) {
      // Fichier déjà présent (reprise après échec partiel) ou FS pleine — on
      // continue ; un fichier manquant fera échouer l'init du recognizer
      // (l'erreur remonte à ensureOfflineModel — plus de repli Vosk).
      // eslint-disable-next-line no-console
      console.warn('[offlineStt] écriture FS modèle ignorée :', f.fsPath, e);
    }
    done += f.size;
    onProgress?.(done, total);
  }
}

/** Vrai si le modèle est chargé EN MÉMOIRE, prêt à transcrire tout de suite. */
export function offlineModelReady(): boolean {
  return modelReady;
}

/**
 * Vrai si le mode hors-ligne sherpa a été installé sur cet appareil
 * (persistant, survit au reload). Exige le moteur sherpa : un ancien appareil
 * Vosk (INSTALL_KEY posé, moteur mémorisé 'vosk') est considéré comme NON
 * installé : l'UI propose de (ré)installer sherpa (migration automatique).
 */
export function offlineModelInstalled(): boolean {
  try { return localStorage.getItem(INSTALL_KEY) === '1' && readEngine() === 'sherpa'; } catch { return false; }
}

/**
 * Télécharge + initialise le moteur une seule fois (idempotent).
 * @param onProgress  callback de progression du téléchargement modèle (sherpa) :
 *                    (octets faits, octets totaux) — appelé après chaque fichier.
 * @param forcer     true si appelé depuis une installation EXPLICITE (bouton
 *                    InstallerOffline) : on réessaie même si un échec précédent
 *                    a marqué sherpa indisponible. En auto, un échec marqué
 *                    évite de re-télécharger ~128 Mo à chaque tentative.
 * @throws si aucun moteur ne peut être chargé (contexte non isolé sans APK,
 *         échec réseau…) — l'appelant affiche le message.
 */
export function ensureOfflineModel(
  onProgress?: (doneBytes: number, totalBytes: number) => void,
  forcer = false,
): Promise<Any> {
  if (!modelPromise) {
    modelPromise = (async () => {
      let dernierEchec: unknown = null;

      // ── Garde connectivité (offline-first) ────────────────────────────────
      // Avant de tenter un téléchargement de ~128 Mo (STT) ou l'init du plugin
      // natif (qui télécharge aussi les modèles s'ils manquent), on vérifie
      // qu'Internet est VRAIMENT joignable — pas juste navigator.onLine (qui
      // ment sur les portails captifs / Wi-Fi sans Internet). Si le modèle est
      // DÉJÀ en cache (ré-installation), on saute le garde (pas de réseau requis).
      // On ne bloque jamais le ré-échauffement (warmOfflineModelIfInstalled).
      const dejaEnCacheWeb = await sherpaModelCached();
      if (!dejaEnCacheWeb && !nativeStt.present()) {
        const { hasInternet } = await import('../utils/connectivity');
        if (!(await hasInternet())) {
          throw new Error(
            "Pas de connexion Internet. Le téléchargement de la voix (~128 Mo) " +
            "nécessite du réseau. Branche du Wi-Fi (gratuit) et réessaie."
          );
        }
      }

      // APK Android : moteur sherpa NATIF d'abord (meilleure perf CPU que le
      // WASM dans la WebView, qui exige COOP/COEP absents de Capacitor).
      if (nativeStt.present() && (forcer || !sherpaUnavailable())) {
        const t0 = Date.now();
        try {
          const ok = await prepareNativeEngine(onProgress);
          if (ok) {
            trackInit('native', true, 'prepare', Date.now() - t0);
            modelReady = true;
            try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ }
            writeEngine();
            try { localStorage.removeItem(SHERPA_UNAVAILABLE_KEY); } catch { /* ignore */ }
            emitModelReady();
            return NATIVE_ENGINE;
          }
          dernierEchec = new Error('modèle non prêt (plugin natif)');
          trackInit('native', false, 'prepare', Date.now() - t0, 'modèle non prêt (plugin natif)');
        } catch (e) {
          dernierEchec = e;
          // eslint-disable-next-line no-console
          console.warn('[offlineStt] sherpa natif indisponible :', e);
          trackInit('native', false, 'prepare', Date.now() - t0, e instanceof Error ? e.message : String(e));
        }
        // Échec (rejet ou prepare false) : on marque sherpa indisponible pour éviter des
        // re-téléchargements de 128 Mo à chaque tentative (l'UI peut réessayer
        // explicitement via clearSherpaUnavailable).
        setSherpaUnavailable();
      }

      if (sherpaSupported() && (forcer || !sherpaUnavailable())) {
        let t0 = Date.now();
        let phase: 'load' | 'recognizer' = 'load';
        try {
          const mod = await loadSherpaRuntime();
          trackInit('wasm', true, 'load', Date.now() - t0);
          t0 = Date.now();
          phase = 'recognizer';
          await ensureModelInFs(mod, onProgress);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sherpaRecognizer = (window as any).createOnlineRecognizer(mod, buildSherpaOnlineConfig());
          trackInit('wasm', true, 'recognizer', Date.now() - t0);
          modelReady = true;
          try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ }
          writeEngine();
          try { localStorage.removeItem(SHERPA_UNAVAILABLE_KEY); } catch { /* ignore */ }
          emitModelReady();
          return sherpaRecognizer;
        } catch (e) {
          dernierEchec = e;
          // eslint-disable-next-line no-console
          console.warn('[offlineStt] sherpa WASM indisponible :', e);
          trackInit('wasm', false, phase, Date.now() - t0, e instanceof Error ? e.message : String(e));
          setSherpaUnavailable();
        }
      }

      // Plus de repli Vosk : si aucun moteur n'a pu se charger, on échoue avec
      // un message clair (cause réelle si un essai a eu lieu).
      if (dernierEchec) {
        const cause = dernierEchec instanceof Error && dernierEchec.message
          ? `: ${dernierEchec.message}`
          : '';
        throw new Error(`La voix hors-ligne n'a pas pu démarrer${cause}.`);
      }
      throw new Error('La voix hors-ligne exige sherpa (APK Android, ou navigateur isolé COOP/COEP).');
    })().catch((e) => {
      modelPromise = null;
      modelReady = false;
      throw e;
    });
  }
  return modelPromise;
}

/**
 * Au démarrage : si le mode hors-ligne sherpa a déjà été installé, on RÉ-ACTIVE
 * le moteur en tâche de fond pour qu'il soit prêt sans ré-installer. Le
 * ré-échauffement est SANS RÉSEAU (cache/filesDir uniquement) : on ne déclenche
 * jamais un téléchargement de 128 Mo en silence — c'est le choix de la marchande.
 * Un ancien appareil Vosk est migré via InstallerOffline (le modèle n'est plus utilisable).
 */
export function warmOfflineModelIfInstalled(): void {
  if (modelReady || modelPromise) return;
  if (!offlineModelInstalled()) return;
  const engine = readEngine();
  if (engine !== 'sherpa' || sherpaUnavailable()) return; // pas de sherpa installé
  // APK : ré-échauffement du moteur NATIF (idempotent, sans réseau si les
  // modèles sont déjà dans filesDir).
  if (nativeStt.present()) {
    ensureOfflineModel().catch(() => { /* ré-échauffement silencieux */ });
    return;
  }
  // Web : ré-échauffement du WASM, cache uniquement.
  if (sherpaSupported()) {
    sherpaModelCached()
      .then((ok) => { if (ok) ensureOfflineModel().catch(() => { /* silencieux */ }); })
      .catch(() => { /* silencieux */ });
  }
}

/**
 * Libère les ressources WASM/audioclients du moteur STT hors-ligne (reconizer
 * sherpa + AudioContext partagé). À appeler au déchargement de la page (SPA
 * logout) pour éviter les fuites : un AudioContext ouvert consomme un slot
 * (limité à ~6 sur Chrome) et le recognizer sherpa occupe la mémoire WASM.
 * Idempotent. Ne détruit PAS le cache modèle (re-téléchargement inutile).
 */
export function disposeOfflineStt(): void {
  // Reconizer sherpa (WASM) — libération défensive.
  if (sherpaRecognizer) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = sherpaRecognizer as any;
      if (typeof r.free === 'function') r.free();
      else if (typeof r.release === 'function') r.release();
    } catch { /* déjà libéré */ }
    sherpaRecognizer = null;
  }
  // Runtime Emscripten (Module) — reset pour permettre un re-chargement propre.
  sherpaRuntime = null;
  // AudioContext partagé du décodage WAV (un par page sinon).
  if (sharedCtx && sharedCtx.state !== 'closed') {
    try { void sharedCtx.close(); } catch { /* déjà fermé */ }
  }
  sharedCtx = null;
  // États mémoire : un prochain ensureOfflineModel rechargera depuis le cache.
  modelPromise = null;
  modelReady = false;
}

// ── Utilitaires audio ──────────────────────────────────────────────────────

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Rééchantillonne linéairement un signal mono vers 16 kHz (exigence sherpa). */
function resampleTo16k(samples: Float32Array, srcRate: number): Float32Array {
  if (samples.length === 0 || srcRate === SHERPA_SAMPLE_RATE) return samples;
  const ratio = srcRate / SHERPA_SAMPLE_RATE;
  const out = new Float32Array(Math.max(1, Math.round(samples.length / ratio)));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = i0 + 1 < samples.length ? i0 + 1 : i0;
    const frac = pos - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return out;
}

/** Décodage WAV échantillons Float32 + sample rate (fait une seule fois par transcription). */
async function decodeWavToSamples(wav: Blob | ArrayBuffer): Promise<{ samples: Float32Array; sampleRate: number }> {
  const arrayBuf = wav instanceof Blob ? await wav.arrayBuffer() : wav.slice(0);
  const audioBuf = await getCtx().decodeAudioData(arrayBuf as ArrayBuffer);
  return { samples: audioBuf.getChannelData(0), sampleRate: audioBuf.sampleRate };
}

// ── Transcription sherpa (fichier) ─────────────────────────────────────────

async function transcribeSherpa(samples: Float32Array, sampleRate: number): Promise<string> {
  const rec = sherpaRecognizer;
  if (!rec) return '';
  const pcm16 = resampleTo16k(samples, sampleRate);
  if (pcm16.length === 0) return '';

  const stream = rec.createStream();
  const CHUNK = 4096;
  const t0 = Date.now();
  let resultText = '';
  let failed = false;
  try {
    for (let off = 0; off < pcm16.length; off += CHUNK) {
      stream.acceptWaveform(SHERPA_SAMPLE_RATE, pcm16.subarray(off, off + CHUNK));
      while (rec.isReady(stream)) rec.decode(stream);
      // Laisser tourner la boucle d'évènements (callbacks WASM / workers).
      await new Promise<void>((r) => setTimeout(r, 0));
    }
    stream.inputFinished();
    while (rec.isReady(stream)) rec.decode(stream);
    const res = rec.getResult(stream);
    resultText = (res?.text || '').trim();
    return resultText;
  } catch (e) {
    failed = true;
    // Télémétrie : on logge l'échec AVANT de relancer (sinon le finally le masque).
    import('../services/voiceTelemetry')
      .then((m) => m.trackSttTranscribe('wasm', false, Date.now() - t0, 0, e instanceof Error ? e.message : String(e)))
      .catch(() => { /* télémétrie défensive */ });
    throw e;
  } finally {
    try { stream.free(); } catch { /* déjà libéré */ }
    if (!failed) {
      import('../services/voiceTelemetry')
        .then((m) => m.trackSttTranscribe('wasm', true, Date.now() - t0, resultText.length))
        .catch(() => { /* télémétrie défensive */ });
    }
  }
}

// ── Dictée live sherpa (au fil de l'eau) ───────────────────────────────────

async function startSherpaLiveDictation(
  mic: MediaStream,
  onText: (texte: string, estFinal: boolean) => void,
  onDebug?: (tag: string, data?: unknown) => void,
): Promise<{ stop: () => Promise<void> }> {
  const dbg = (t: string, d?: unknown) => { try { onDebug?.(t, d); } catch { /* ignore */ } };
  const rec = sherpaRecognizer;
  if (!rec) throw new Error('moteur sherpa non prêt');
  dbg('LIVE_MODEL_OK');
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  dbg('LIVE_CTX', { state: ctx.state, sampleRate: ctx.sampleRate });
  // ANDROID : l'AudioContext démarre souvent « suspended » après le getUserMedia.
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
    dbg('LIVE_RESUME', { state: ctx.state });
  }

  const source = ctx.createMediaStreamSource(mic);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);

  const recStream = rec.createStream();
  let lastText = '';     // dernier texte cumulé émis (dédoublonnage)
  let endpointOn = false; // flag d'endpoint en cours (front montant = phrase finalisée)
  let framesSeen = 0;
  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    if (framesSeen === 0) dbg('LIVE_AUDIO_FIRST');
    framesSeen++;
    try {
      const chunk = resampleTo16k(ev.inputBuffer.getChannelData(0), ctx.sampleRate);
      recStream.acceptWaveform(SHERPA_SAMPLE_RATE, chunk);
      while (rec.isReady(recStream)) rec.decode(recStream);
      // NB : on NE resets JAMAIS le stream (les 2 chiffres puis « plus rien »
      // venaient d'un reset au premier endpoint : la reconnaissance ne repartait
      // pas dans ce build WASM). Le texte partiel sherpa s'ACCUMULE tout seul
      // d'une phrase à l'autre — exactement ce qu'il faut pour une dictée.
      const text = (rec.getResult(recStream).text || '').trim();
      const ep = rec.isEndpoint(recStream);
      // Front montant d'endpoint = fin de phrase : on la notifie en « final ».
      if (ep && !endpointOn) {
        if (text) onText(text, true);
      } else if (text && text !== lastText) {
        onText(text, false); // partiel cumulé
      }
      endpointOn = ep;
      if (text) lastText = text;
    } catch { /* ignore une trame */ }
  };
  dbg('LIVE_WIRED');

  let stopped = false;
  // Garde-fou anti-fuite : si l'appelant oublie d'appeler stop() (effet React
  // qui se démonte avant l'affectation de `session`, crash…), on ferme tout
  // après 10 min. Le timer est annulé par stop(). Sans ça, l'AudioContext, le
  // ScriptProcessor ET le stream WASM (recStream.free()) fuient pour la durée
  // de vie de la page.
  const safety = setTimeout(() => { void stop(); }, 10 * 60 * 1000);

  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    clearTimeout(safety);
    try { processor.onaudioprocess = null as unknown as (ev: AudioProcessingEvent) => void; } catch { /* */ }
    try { processor.disconnect(); } catch { /* */ }
    try { source.disconnect(); } catch { /* */ }
    try { mute.disconnect(); } catch { /* */ }
    try { recStream.free(); } catch { /* */ }
    try { await ctx.close(); } catch { /* */ }
  };

  return { stop };
}

/**
 * Dictée « par lots » sur le plugin NATIF (APK) : l'audio est découpé en blocs
 * d'environ 2 s, chaque bloc est transcrit par le natif (sans état inter-blocs)
 * puis les textes sont concaténés. Suffisant pour la dictée d'un numéro, sans
 * méthode de streaming dédiée dans le plugin.
 */
async function startNativeLiveDictation(
  mic: MediaStream,
  onText: (texte: string, estFinal: boolean) => void,
  onDebug?: (tag: string, data?: unknown) => void,
): Promise<{ stop: () => Promise<void> }> {
  const dbg = (t: string, d?: unknown) => { try { onDebug?.(t, d); } catch { /* ignore */ } };
  dbg('LIVE_MODEL_OK');
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  dbg('LIVE_CTX', { state: ctx.state, sampleRate: ctx.sampleRate });
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
    dbg('LIVE_RESUME', { state: ctx.state });
  }

  const source = ctx.createMediaStreamSource(mic);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);

  let acc = '';                         // texte déjà reconnu (concaténé)
  let pending: Float32Array[] = [];     // blocs audio en attente d'envoi
  let framesSeen = 0;
  let stopped = false;                   // mis à vrai par stop() : bloque onText post-stop
  let chain: Promise<void> = Promise.resolve(); // sérialise les transcriptions

  const flush = (final: boolean): Promise<void> => {
    const batch = pending;
    pending = [];
    if (batch.length === 0) {
      // Pas d'event final après stop() : le caller croit la dictée terminée.
      if (final && !stopped) { try { onText(acc.trim(), true); } catch { /* ignore */ } }
      return chain;
    }
    const run = async (): Promise<void> => {
      let text = '';
      try {
        let total = 0;
        for (const b of batch) total += b.length;
        const merged = new Float32Array(total);
        let off = 0;
        for (const b of batch) { merged.set(b, off); off += b.length; }
        text = await nativeStt.transcribe(merged, ctx.sampleRate);
      } catch {
        // Un lot raté ne bloque pas la dictée.
      }
      // Guard post-stop : une transcription en vol peut se terminer APRÈS que
      // stop() a été appelé. On n'émet pas l'event (le caller a déjà bouclé).
      if (stopped) return;
      if (text) acc = (acc + '' + text).trim();
      try { onText(acc, final); } catch { /* ignore */ }
    };
    chain = chain.then(run);
    return chain;
  };

  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    if (framesSeen === 0) dbg('LIVE_AUDIO_FIRST');
    framesSeen++;
    pending.push(ev.inputBuffer.getChannelData(0).slice());
    // ~2 s de parole (4096 / 48 kHz ≈ 0,085 s par trame, ×20 ≈ 1,7 s).
    if (framesSeen % 20 === 0) void flush(false);
  };
  dbg('LIVE_WIRED');

  // Garde-fou anti-fuite (cf. startSherpaLiveDictation) : stop auto après 10 min.
  const safety = setTimeout(() => { void stop(); }, 10 * 60 * 1000);

  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    clearTimeout(safety);
    try { processor.onaudioprocess = null as unknown as (ev: AudioProcessingEvent) => void; } catch { /* */ }
    try { processor.disconnect(); } catch { /* */ }
    try { source.disconnect(); } catch { /* */ }
    try { mute.disconnect(); } catch { /* */ }
    await chain;      // attend les lots déjà en cours
    await flush(true); // dernier lot : texte final
    await chain;
    try { await ctx.close(); } catch { /* */ }
  };

  return { stop };
}

/**
 * Écoute EN DIRECT et transcrit au fil de l'eau (100 % sur l'appareil). Sert à
 * la dictée d'un numéro : on veut voir les chiffres se remplir et s'ARRÊTER dès
 * qu'on a le numéro complet — pas attendre un minuteur.
 *
 * `onText(texte, estFinal)` : résultat partiel (false) ou phrase finalisée (true).
 * Renvoie `{ stop }` : appeler `stop()` coupe tout proprement (micro compris).
 */
export async function startLiveDictation(
  stream: MediaStream,
  onText: (texte: string, estFinal: boolean) => void,
  _customGrammar?: string[],
  onDebug?: (tag: string, data?: unknown) => void,
): Promise<{ stop: () => Promise<void> }> {
  const dbg = (t: string, d?: unknown) => { try { onDebug?.(t, d); } catch { /* ignore */ } };

  // APK : moteur NATIF si prêt.
  if (nativeStt.present() && await nativeStt.isAvailable()) {
    return startNativeLiveDictation(stream, onText, onDebug);
  }

  // Moteur sherpa (streaming natif) si prêt.
  if (sherpaRecognizer) {
    return startSherpaLiveDictation(stream, onText, onDebug);
  }

  // ensureOfflineModel peut faire GAGNER sherpa (installation en cours au
  // premier appel, ou moteur natif qui se prépare) : on re-teste après.
  dbg('LIVE_MODEL_OK');
  await ensureOfflineModel();
  if (sherpaRecognizer) {
    return startSherpaLiveDictation(stream, onText, onDebug);
  }
  if (nativeStt.present() && await nativeStt.isAvailable()) {
    return startNativeLiveDictation(stream, onText, onDebug);
  }
  throw new Error('aucun moteur de dictée disponible');
}

/**
 * Transcrit un blob/ArrayBuffer WAV hors-ligne et renvoie le texte final.
 * Moteurs (plus de Vosk) : sherpa natif (APK) puis sherpa WASM (web).
 * `useGrammar` / `customGrammar` sont conservés pour la compatibilité d'appel
 * mais IGNORÉS : sherpa est à vocabulaire ouvert (l'ancienne grammaire fermée
 * Vosk a disparu).
 */
export async function transcribeWav(wav: Blob | ArrayBuffer, _useGrammar = true, _customGrammar?: string[]): Promise<string> {
  // Décodage UNIQUE du WAV — partagé par le natif et le WASM.
  const { samples, sampleRate } = await decodeWavToSamples(wav);

  // APK Android : moteur sherpa-onnx NATIF (bascule automatique).
  if (await nativeStt.isAvailable()) {
    try {
      const nativeText = await nativeStt.transcribe(samples, sampleRate);
      if (nativeText) return nativeText;
    } catch { /* le WASM reprend la main */ }
  }

  // Moteur sherpa WASM (prêt) — vocabulaire ouvert.
  if (sherpaRecognizer) {
    try {
      const text = await transcribeSherpa(samples, sampleRate);
      if (text) return text;
      return ''; // texte vide pas de transcription
    } catch { /* le WASM a échoué (plus de repli Vosk) */ }
  }
  // Aucun moteur de transcription disponible (le WASM n'est pas prêt).
  return '';
}
