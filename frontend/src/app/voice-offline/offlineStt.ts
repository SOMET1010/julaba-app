// ──────────────────────────────────────────────────────────────────────────
// STT hors-ligne pour Julaba — transcription 100 % SUR L'APPAREIL.
//
// MOTEUR PRINCIPAL (Phase 1) : sherpa-onnx WASM (streaming zipformer FR int8).
//   - Runtime vendored dans public/voix/sherpa/ (scripts/install-sherpa-stt.sh)
//   - Modèle FR (~128 Mo int8) téléchargé à l'installation (consentement) puis
//     persisté dans la Cache API → recharge hors-ligne instantanée.
//   - ⚠️ Exige une origine « cross-origin isolated » (headers COOP + COEP,
//     SharedArrayBuffer). Sinon on bascule AUTOMATIQUEMENT sur Vosk : jamais
//     de régression, le mode hors-ligne continue de marcher partout.
//
// MOTEUR DE REPLI : vosk-browser (WASM, modèle ~40 Mo) — import DYNAMIQUE,
// n'entre dans le bundle que si le mode hors-ligne est utilisé.
//
// Interface publique IDENTIQUE à l'ancienne version (transcribeWav,
// ensureOfflineModel, offlineModelReady, offlineModelInstalled,
// warmOfflineModelIfInstalled, startLiveDictation) : rien d'autre ne change.
// ──────────────────────────────────────────────────────────────────────────

import { GRAMMAR_WORDS } from './vocabulaire';
import { VOSK_MODEL_URL } from './voskModel';
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

// Drapeau PERSISTANT : le modèle a déjà été installé une fois sur cet appareil
// (il reste en cache navigateur). `modelReady`, lui, est une variable mémoire
// remise à zéro à CHAQUE rechargement de page — sans ce drapeau, l'appli
// « oubliait » le mode hors-ligne après un reload et retombait sur le cloud.
const INSTALL_KEY = 'julaba_offline_installed';

// ── Préférence de moteur (persistante) ─────────────────────────────────────
// Évite les surprises de données : un appareil qui a déjà installé Vosk ne
// re-télécharge PAS ~128 Mo de sherpa en silence. Le moteur installé est
// mémorisé, et un échec sherpa est marqué pour ne pas re-tenter sans cesse.
const ENGINE_KEY = 'julaba_offline_engine';            // 'sherpa' | 'vosk'
const SHERPA_UNAVAILABLE_KEY = 'julaba_sherpa_unavailable';

function readEngine(): 'sherpa' | 'vosk' | null {
  try {
    const v = localStorage.getItem(ENGINE_KEY);
    return v === 'sherpa' || v === 'vosk' ? v : null;
  } catch { return null; }
}
function writeEngine(e: 'sherpa' | 'vosk'): void {
  try { localStorage.setItem(ENGINE_KEY, e); } catch { /* ignore */ }
}
function sherpaUnavailable(): boolean {
  try { return localStorage.getItem(SHERPA_UNAVAILABLE_KEY) === '1'; } catch { return false; }
}
function setSherpaUnavailable(): void {
  try { localStorage.setItem(SHERPA_UNAVAILABLE_KEY, '1'); } catch { /* ignore */ }
}

/**
 * Oublie un échec sherpa précédent → permet de re-tenter (bouton UI).
 * Réinitialise aussi la préférence et l'état mémoire : sinon le prochain
 * install réutiliserait le repli Vosk déjà résolu (modelPromise) au lieu de
 * re-tenter réellement sherpa.
 */
export function clearSherpaUnavailable(): void {
  try { localStorage.removeItem(SHERPA_UNAVAILABLE_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(ENGINE_KEY); } catch { /* ignore */ }
  modelPromise = null;
  modelReady = false;
}

// ── Moteur sherpa-onnx (état) ──────────────────────────────────────────────
let sherpaRuntime: Promise<Any> | null = null; // résout vers le Module Emscripten
let sherpaRecognizer: Any | null = null;       // OnlineRecognizer (créé 1×/page)
let voskModel: Any | null = null;              // modèle vosk-browser (repli)
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
  // Sommes cumulées avant chaque fichier → progression GLOBALE pour l'UI
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

/** Vrai si le navigateur peut charger le runtime sherpa (SAB → COOP/COEP). */
export function sherpaSupported(): boolean {
  try {
    return typeof crossOriginIsolated === 'boolean' && crossOriginIsolated;
  } catch { return false; }
}

/** Nom du moteur visé pour l'UI (InstallerOffline) : sherpa ou vosk. */
export function sttEngine(): 'sherpa' | 'vosk' {
  // APK Capacitor : sherpa NATIF (aucune exigence COOP/COEP).
  if (nativeStt.present()) return 'sherpa';
  if (!sherpaSupported() || sherpaUnavailable()) return 'vosk';
  return 'sherpa';
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
    // La glue API (createOnlineRecognizer…) est un script classique → global.
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
    // FS_createDataFile lèverait EEXIST → on continue.
    try {
      mod.FS_createDataFile(f.fsPath, null, bytes, true, true, true);
    } catch (e) {
      // Fichier déjà présent (reprise après échec partiel) ou FS pleine — on
      // continue ; un fichier manquant se verra à l'init du recognizer → repli Vosk.
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

/** Vrai si le modèle a déjà été installé sur cet appareil (persistant, survit au reload). */
export function offlineModelInstalled(): boolean {
  try { return localStorage.getItem(INSTALL_KEY) === '1'; } catch { return false; }
}

/** Charge le moteur Vosk (repli) et mémorise la préférence. */
async function loadVosk(): Promise<Any> {
  const { createModel } = await import('vosk-browser');
  voskModel = await createModel(VOSK_MODEL_URL);
  modelReady = true;
  try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ }
  writeEngine('vosk');
  emitModelReady();
  return voskModel;
}

/**
 * Télécharge + initialise le moteur une seule fois (idempotent).
 * @param onProgress  callback de progression du téléchargement modèle (sherpa) :
 *                    (octets faits, octets totaux) — appelé après chaque fichier.
 * @param preferSherpa force sherpa même si le moteur installé est Vosk (appel
 *                    depuis le bouton d'installation explicite — l'utilisatrice
 *                    a choisi). L'auto (transcription) respecte le moteur déjà
 *                    installé pour ne jamais télécharger ~128 Mo en silence.
 */
export function ensureOfflineModel(
  onProgress?: (doneBytes: number, totalBytes: number) => void,
  preferSherpa = false,
): Promise<Any> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const engine = readEngine();

      // APK Android : moteur sherpa NATIF d'abord (meilleure perf CPU que le
      // WASM dans la WebView, qui exige COOP/COEP absents de Capacitor).
      // MÊME GARDE que le WASM : jamais de téléchargement de ~128 Mo en silence
      // sur un appareil qui a déjà installé Vosk (moteur mémorisé), sauf demande
      // explicite (preferSherpa).
      const canNative = nativeStt.present()
        && (preferSherpa || (engine !== 'vosk' && !sherpaUnavailable()));
      if (canNative) {
        try {
          const ok = await prepareNativeEngine(onProgress);
          if (ok) {
            modelReady = true;
            try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ }
            writeEngine('sherpa');
            try { localStorage.removeItem(SHERPA_UNAVAILABLE_KEY); } catch { /* ignore */ }
            emitModelReady();
            return NATIVE_ENGINE;
          }
        } catch (e) {
          // Repli local (plugin absent/erreur) — on ne casse jamais le hors-ligne.
          // eslint-disable-next-line no-console
          console.warn('[offlineStt] sherpa natif indisponible, repli local :', e);
        }
        // Échec (rejet ou prepare false) → on marque sherpa indisponible pour
        // éviter des re-téléchargements de 128 Mo à chaque tentative (l'UI peut
        // réessayer explicitement via clearSherpaUnavailable).
        setSherpaUnavailable();
      }

      const canSherpa = sherpaSupported()
        && (preferSherpa || (engine !== 'vosk' && !sherpaUnavailable()));
      if (canSherpa) {
        try {
          const mod = await loadSherpaRuntime();
          await ensureModelInFs(mod, onProgress);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sherpaRecognizer = (window as any).createOnlineRecognizer(mod, buildSherpaOnlineConfig());
          modelReady = true;
          try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ }
          writeEngine('sherpa');
          try { localStorage.removeItem(SHERPA_UNAVAILABLE_KEY); } catch { /* ignore */ }
          emitModelReady();
          return sherpaRecognizer;
        } catch (e) {
          // Repli Vosk (WebView sans COOP/COEP, runtime absent, réseau…) — on
          // ne casse JAMAIS le mode hors-ligne.
          // eslint-disable-next-line no-console
          console.warn('[offlineStt] sherpa indisponible, repli Vosk :', e);
          setSherpaUnavailable();
          // (writeEngine('vosk') est fait par loadVosk ci-dessous)
        }
      }
      return loadVosk();
    })().catch((e) => {
      modelPromise = null;
      modelReady = false;
      throw e;
    });
  }
  return modelPromise;
}

/**
 * Au démarrage : si le mode hors-ligne a déjà été installé, on RÉ-ACTIVE le
 * moteur en tâche de fond pour qu'il soit prêt sans ré-installer. Pour sherpa,
 * le ré-échauffement est SANS RÉSEAU (cache uniquement) : on ne déclenche
 * jamais un téléchargement de 128 Mo en silence — c'est le choix de la marchande.
 */
export function warmOfflineModelIfInstalled(): void {
  if (modelReady || modelPromise) return;
  if (!offlineModelInstalled()) return;
  const engine = readEngine();
  // APK : ré-échauffement du moteur NATIF (idempotent, sans réseau si les
  // modèles sont déjà dans filesDir).
  if (nativeStt.present() && engine !== 'vosk' && !sherpaUnavailable()) {
    ensureOfflineModel().catch(() => { /* ré-échauffement silencieux */ });
    return;
  }
  if (sherpaSupported() && engine !== 'vosk' && !sherpaUnavailable()) {
    sherpaModelCached()
      .then((ok) => { if (ok) ensureOfflineModel().catch(() => { /* silencieux */ }); })
      .catch(() => { /* silencieux */ });
    return;
  }
  ensureOfflineModel().catch(() => { /* ré-échauffement silencieux */ });
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

/** Enveloppe un Float32Array en AudioBuffer au sample rate donné (Vosk). */
function makeAudioBuffer(sampleRate: number, data: Float32Array): AudioBuffer {
  const ctx = new OfflineAudioContext(1, data.length, sampleRate);
  const ab = ctx.createBuffer(1, data.length, sampleRate);
  ab.getChannelData(0).set(data); // évite la contrainte de type de copyToChannel
  return ab;
}

/** Décodage WAV → échantillons Float32 + sample rate (fait une seule fois par transcription). */
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
    return (res?.text || '').trim();
  } finally {
    try { stream.free(); } catch { /* déjà libéré */ }
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
  let acc = ''; // phrases DÉJÀ finalisées (endpoint)
  let framesSeen = 0;
  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    if (framesSeen === 0) dbg('LIVE_AUDIO_FIRST');
    framesSeen++;
    try {
      const chunk = resampleTo16k(ev.inputBuffer.getChannelData(0), ctx.sampleRate);
      recStream.acceptWaveform(SHERPA_SAMPLE_RATE, chunk);
      while (rec.isReady(recStream)) rec.decode(recStream);
      const text = (rec.getResult(recStream).text || '').trim();
      onText((acc + ' ' + text).trim(), false);
      if (rec.isEndpoint(recStream)) {
        if (text) acc = (acc + ' ' + text).trim();
        rec.reset(recStream);
        onText(acc, true);
      }
    } catch { /* ignore une trame */ }
  };
  dbg('LIVE_WIRED');

  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
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
  let chain: Promise<void> = Promise.resolve(); // sérialise les transcriptions

  const flush = (final: boolean): Promise<void> => {
    const batch = pending;
    pending = [];
    if (batch.length === 0) {
      if (final) { try { onText(acc.trim(), true); } catch { /* ignore */ } }
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
      if (text) acc = (acc + ' ' + text).trim();
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

  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    try { processor.onaudioprocess = null as unknown as (ev: AudioProcessingEvent) => void; } catch { /* */ }
    try { processor.disconnect(); } catch { /* */ }
    try { source.disconnect(); } catch { /* */ }
    try { mute.disconnect(); } catch { /* */ }
    await chain;      // attend les lots déjà en cours
    await flush(true); // dernier lot → texte final
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
  customGrammar?: string[],
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

  // ── Repli Vosk (ancien moteur, inchangé) ────────────────────────────────
  dbg('LIVE_MODEL_OK');
  // ensureOfflineModel peut faire GAGNER sherpa (moteur installé = sherpa après
  // un reload) : on redirige alors vers la dictée sherpa (le recognizer Vosk
  // n'existe pas dans ce cas → sinon crash `model.KaldiRecognizer`). Idem pour
  // le NATIF : le modèle résolu peut être le moteur natif de l'APK.
  await ensureOfflineModel();
  if (sherpaRecognizer) {
    return startSherpaLiveDictation(stream, onText, onDebug);
  }
  if (nativeStt.present() && await nativeStt.isAvailable()) {
    return startNativeLiveDictation(stream, onText, onDebug);
  }
  const model = voskModel;
  if (!model) throw new Error('aucun moteur de dictée disponible');
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  dbg('LIVE_CTX', { state: ctx.state, sampleRate: ctx.sampleRate });
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
    dbg('LIVE_RESUME', { state: ctx.state });
  }
  const grammar = customGrammar ? JSON.stringify(customGrammar)
    : JSON.stringify(GRAMMAR_WORDS);
  const recognizer: Any = new model.KaldiRecognizer(ctx.sampleRate, grammar);

  let acc = '';
  recognizer.on('result', (m: { result?: { text?: string } }) => {
    const t = (m?.result?.text || '').trim();
    if (t) acc = (acc + ' ' + t).trim();
    onText(acc, true);
  });
  recognizer.on('partialresult', (m: { result?: { partial?: string } }) => {
    const p = (m?.result?.partial || '').trim();
    onText((acc + ' ' + p).trim(), false);
  });

  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);
  let framesSeen = 0;
  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    if (framesSeen === 0) dbg('LIVE_AUDIO_FIRST');
    framesSeen++;
    try { recognizer.acceptWaveform(ev.inputBuffer); } catch { /* ignore une trame */ }
  };
  dbg('LIVE_WIRED');

  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    try { processor.onaudioprocess = null as unknown as (ev: AudioProcessingEvent) => void; } catch { /* */ }
    try { processor.disconnect(); } catch { /* */ }
    try { source.disconnect(); } catch { /* */ }
    try { mute.disconnect(); } catch { /* */ }
    try { if (typeof recognizer.remove === 'function') recognizer.remove(); } catch { /* */ }
    try { await ctx.close(); } catch { /* */ }
  };

  return { stop };
}

/**
 * Transcrit un blob/ArrayBuffer WAV hors-ligne et renvoie le texte final.
 * @param wav      le WAV (16 kHz mono attendu, mais tout format décodable marche)
 * @param useGrammar limite au vocabulaire du marché (moteur Vosk uniquement —
 *        sherpa est à vocabulaire ouvert, le paramètre est alors ignoré)
 */
export async function transcribeWav(wav: Blob | ArrayBuffer, useGrammar = true, customGrammar?: string[]): Promise<string> {
  // Décodage UNIQUE du WAV — partagé par le natif, sherpa et Vosk.
  const { samples, sampleRate } = await decodeWavToSamples(wav);

  // APK Android : on PRÉFÈRE le moteur sherpa-onnx NATIF (bascule automatique).
  if (await nativeStt.isAvailable()) {
    try {
      const nativeText = await nativeStt.transcribe(samples, sampleRate);
      if (nativeText) return nativeText;
    } catch { /* repli local si le natif échoue */ }
  }

  // Moteur sherpa WASM (prêt) — vocabulaire ouvert.
  if (sherpaRecognizer) {
    try {
      const text = await transcribeSherpa(samples, sampleRate);
      if (text) return text;
      if (!voskModel) return ''; // silence — inutile de charger Vosk
    } catch { /* repli Vosk */ }
  }

  // ── Repli Vosk (ancien moteur, inchangé) ────────────────────────────────
  if (!voskModel) {
    try { await loadVosk(); } catch { return ''; }
  }
  const grammar = customGrammar ? JSON.stringify(customGrammar)
    : useGrammar ? JSON.stringify(GRAMMAR_WORDS) : undefined;
  const recognizer: Any = grammar
    ? new voskModel.KaldiRecognizer(sampleRate, grammar)
    : new voskModel.KaldiRecognizer(sampleRate);

  const channel = samples;
  const CHUNK = 4096;

  return new Promise<string>((resolve, reject) => {
    let finalText = '';
    let resolved = false;

    const cleanup = () => { if (typeof recognizer.remove === 'function') { try { recognizer.remove(); } catch { /* */ } } };
    const done = (t: string) => { if (resolved) return; resolved = true; cleanup(); resolve((t || '').trim()); };

    recognizer.on('result', (m: { result: { text: string } }) => {
      const t = m?.result?.text ?? '';
      if (t) finalText = t;
    });

    (async () => {
      try {
        for (let off = 0; off < channel.length; off += CHUNK) {
          const slice = channel.slice(off, off + CHUNK);
          recognizer.acceptWaveform(makeAudioBuffer(sampleRate, slice));
          // Laisser tourner la boucle d'évènements pour les callbacks WASM.
          await new Promise<void>((r) => setTimeout(r, 0));
        }
        // Laisser le dernier 'result' arriver, puis finaliser.
        await new Promise<void>((r) => setTimeout(r, 350));
        done(finalText);
      } catch (e) {
        if (!resolved) { resolved = true; cleanup(); reject(e); }
      }
    })();
  });
}
