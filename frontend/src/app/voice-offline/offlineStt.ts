// ──────────────────────────────────────────────────────────────────────────
// STT hors-ligne pour Julaba — moteur UNIQUE : sherpa-onnx NATIF (APK Android).
//
// Décision du 11/08/2026 (docs/INCLUSION.md) : Vosk WASM est RETIRÉ. Il créait
// un conflit de double moteur — sur l'APK, la dictée en direct téléchargeait
// encore le modèle Vosk (~40 Mo) alors que sherpa-onnx est déjà embarqué et lit
// « 12 500 » directement, hors-ligne, sans grammaire.
//
// Ce module garde la MÊME interface qu'avant (les appelants ne changent pas) :
// - offlineModelReady()/offlineModelInstalled() : sherpa natif disponible ?
// - ensureOfflineModel() : vérifie le moteur (plus aucun téléchargement).
// - startLiveDictation() : dictée « en direct » re-transcrite par lots courts
//   (pseudo-live) via le moteur natif — les chiffres se remplissent à l'écran.
// - transcribeWav() : transcription d'un blob complet.
//
// Sur le WEB (navigateur, pas d'APK) : pas de moteur natif → pas de STT
// hors-ligne. Le clavier reste le filet ; la voix complète vit dans l'appli
// Android. C'est un choix assumé (un seul moteur, zéro téléchargement surprise).
// ──────────────────────────────────────────────────────────────────────────

import { nativeStt } from './nativeStt';

// Drapeau PERSISTANT : le moteur natif a déjà répondu « disponible » sur cet
// appareil. Permet à offlineModelInstalled() (synchrone) d'être juste dès le
// lancement, avant que la sonde asynchrone n'ait re-confirmé.
const INSTALL_KEY = 'julaba_offline_installed';

let engineReady = false;          // sherpa natif confirmé DISPONIBLE (sonde ok)
let probePromise: Promise<boolean> | null = null;

/** Vrai si le moteur natif est confirmé disponible, prêt à transcrire. */
export function offlineModelReady(): boolean {
  return engineReady;
}

/** Vrai si le moteur a déjà été vu disponible sur cet appareil (persistant). */
export function offlineModelInstalled(): boolean {
  if (engineReady) return true;
  try { return localStorage.getItem(INSTALL_KEY) === '1'; } catch { return false; }
}

/** Sonde le moteur natif (idempotent, partagé). Met à jour les drapeaux. */
function probeEngine(): Promise<boolean> {
  if (!probePromise) {
    probePromise = (async () => {
      const ok = await nativeStt.isAvailable();
      engineReady = ok;
      if (ok) { try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ } }
      return ok;
    })().catch(() => { probePromise = null; return false; });
  }
  return probePromise;
}

/**
 * Vérifie que le moteur est là (plus AUCUN téléchargement : sherpa est embarqué
 * dans l'APK). Rejette avec un message simple si on n'est pas dans l'appli.
 */
export async function ensureOfflineModel(): Promise<void> {
  const ok = await probeEngine();
  if (!ok) throw new Error("La voix marche dans l'application Julaba installée sur le téléphone.");
}

/** Au démarrage : sonde le moteur en tâche de fond (rapide, aucun réseau). */
export function warmOfflineModelIfInstalled(): void {
  void probeEngine();
}

/**
 * Écoute EN DIRECT et transcrit au fil de l'eau, 100 % sur l'appareil.
 * Sherpa natif ne fait que du « par lots » : on accumule le son du micro et on
 * re-transcrit TOUT le tampon à intervalles courts (~0,9 s) — à l'écran, les
 * chiffres se remplissent comme avant. `stop()` fait la passe finale.
 *
 * `grammaireIgnoree` : l'ancien moteur (Vosk) acceptait une liste de mots ;
 * sherpa n'en a pas besoin (il écrit « 12 500 » directement). Paramètre gardé
 * pour ne pas casser les appelants, valeur ignorée.
 */
export async function startLiveDictation(
  stream: MediaStream,
  onText: (texte: string, estFinal: boolean) => void,
  grammaireIgnoree?: string[],
  onDebug?: (tag: string, data?: unknown) => void,
): Promise<{ stop: () => Promise<void> }> {
  void grammaireIgnoree;
  const dbg = (t: string, d?: unknown) => { try { onDebug?.(t, d); } catch { /* ignore */ } };
  await ensureOfflineModel();
  dbg('LIVE_MODEL_OK', { engine: 'sherpa-native' });

  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  dbg('LIVE_CTX', { state: ctx.state, sampleRate: ctx.sampleRate });
  // ANDROID : l'AudioContext démarre souvent « suspended » après le getUserMedia
  // (le geste tactile est « consommé »). Sans resume(), onaudioprocess ne se
  // déclenche JAMAIS → le moteur ne reçoit aucun son → transcription muette.
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* ignore */ }
    dbg('LIVE_RESUME', { state: ctx.state });
  }

  // Tampon d'échantillons bruts (mono). Borné à 90 s : au-delà on garde la fin
  // (les dictées Julaba durent quelques secondes, c'est un simple garde-fou).
  const MAX_SAMPLES = ctx.sampleRate * 90;
  let chunks: Float32Array[] = [];
  let totalSamples = 0;

  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor : simple et fiable sur Android/WebView (cible Julaba). On le
  // relie à un gain MUET → destination (certains navigateurs n'exécutent le
  // traitement que si le nœud est connecté ; le gain 0 évite tout retour son).
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);
  let framesSeen = 0;
  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    if (framesSeen === 0) dbg('LIVE_AUDIO_FIRST'); // 1re trame reçue = le micro pousse bien
    framesSeen++;
    chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
    totalSamples += ev.inputBuffer.length;
    while (totalSamples > MAX_SAMPLES && chunks.length > 1) {
      totalSamples -= chunks[0].length;
      chunks.shift();
    }
  };
  dbg('LIVE_WIRED');

  const concat = (): Float32Array => {
    const out = new Float32Array(totalSamples);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  };

  // Re-transcription périodique du tampon complet. Une seule passe à la fois :
  // si le moteur est encore occupé, on saute le tour (le suivant rattrape).
  let stopped = false;
  let busy = false;
  let lastLen = 0;
  const INTERVAL_MS = 900;
  const passe = async (finale: boolean): Promise<string> => {
    if (busy) return '';
    busy = true;
    try {
      const texte = await nativeStt.transcribe(concat(), ctx.sampleRate);
      if (!stopped || finale) onText(texte, finale);
      return texte;
    } catch { return ''; }
    finally { busy = false; }
  };
  const timer = setInterval(() => {
    if (stopped) return;
    if (totalSamples === lastLen) return; // rien de neuf depuis la dernière passe
    lastLen = totalSamples;
    void passe(false);
  }, INTERVAL_MS);

  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    try { processor.onaudioprocess = null as unknown as (ev: AudioProcessingEvent) => void; } catch { /* */ }
    try { processor.disconnect(); } catch { /* */ }
    try { source.disconnect(); } catch { /* */ }
    try { mute.disconnect(); } catch { /* */ }
    // Passe FINALE sur tout ce qui a été entendu (attend la fin d'une passe en
    // cours : petite boucle de politesse, jamais plus de ~1,5 s).
    for (let i = 0; busy && i < 15; i++) await new Promise<void>(r => setTimeout(r, 100));
    await passe(true);
    chunks = [];
    totalSamples = 0;
    try { await ctx.close(); } catch { /* */ }
  };

  return { stop };
}

let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/**
 * Transcrit un blob/ArrayBuffer audio hors-ligne et renvoie le texte final.
 * Les paramètres de grammaire de l'ancien moteur sont gardés (ignorés) pour ne
 * pas casser les appelants.
 */
export async function transcribeWav(wav: Blob | ArrayBuffer, useGrammar = true, customGrammar?: string[]): Promise<string> {
  void useGrammar; void customGrammar;
  await ensureOfflineModel();
  const arrayBuf = wav instanceof Blob ? await wav.arrayBuffer() : wav.slice(0);
  const audioBuf = await getCtx().decodeAudioData(arrayBuf as ArrayBuffer);
  return nativeStt.transcribe(audioBuf.getChannelData(0), audioBuf.sampleRate);
}
