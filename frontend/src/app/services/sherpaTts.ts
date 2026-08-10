// ─────────────────────────────────────────────────────────────────────────────
// sherpaTts.ts — TTS neuronal OFFLINE via sherpa-onnx (WASM navigateur).
//
// Place la voix de Tata Nanti Lou (modèle vits-piper FR, par ex. fr_FR-siwis-low)
// AVANT la voix de secours du navigateur (speakBrowser). Le runtime est le build
// WASM officiel de sherpa-onnx (Emscripten) : un Worker « module » charge
// sherpa-onnx-wasm-main-tts.js + .wasm + .data, puis createOfflineTts() génère
// { samples: Float32Array, sampleRate } que l'on joue via AudioContext.
//
// RÈGLE D'OR (comme le reste de la voix Julaba) : ce service est DÉFENSIF.
// Si les fichiers du runtime/modèle sont absents, que le chargement échoue ou que
// la génération renvoie rien, on RETOMBE sur la voix navigateur (speakBrowser) :
// l'assistante n'est JAMAIS muette, aucune régression.
//
// Installation des fichiers (à lancer une fois, comme le modèle STT Vosk) :
//   scripts/install-sherpa-tts.sh
// → dépose le runtime WASM + le modèle dans frontend/public/voix/sherpa/.
// Une seule constante à changer pour pointer ailleurs (CDN souverain) : SHERPA_TTS_BASE.
// ─────────────────────────────────────────────────────────────────────────────

import { getSharedAudioContext } from './elevenlabs';

// ── Config (UNE constante à changer pour un autre hébergement) ────────────────
const SHERPA_TTS_BASE = '/voix/sherpa';
const SHERPA_TTS_WORKER = `${SHERPA_TTS_BASE}/sherpa-onnx-tts.worker.js`;

// Drapeau PERSISTANT : le TTS sherpa a déjà été installé/activé sur cet appareil.
const INSTALL_KEY = 'julaba_tts_installed';

// ── État global ───────────────────────────────────────────────────────────────
let worker: Worker | null = null;
let workerPromise: Promise<Worker | null> | null = null;
let ready = false;
let activeSource: AudioBufferSourceNode | null = null;

/** Vrai si le moteur est chargé et prêt à générer immédiatement. */
export function sherpaTtsReady(): boolean {
  return ready;
}

/** Vrai si l'utilisatrice a déjà installé/activé le TTS sherpa (persistant). */
export function sherpaTtsInstalled(): boolean {
  try { return localStorage.getItem(INSTALL_KEY) === '1'; } catch { return false; }
}

/**
 * Charge (une seule fois) le worker WASM sherpa-onnx TTS et attend son signal
 * « ready ». Renvoie false si indisponible → l'appelant retombe sur la voix
 * navigateur. Silencieux et défensif.
 */
export function ensureSherpaTts(): Promise<Worker | null> {
  if (workerPromise) return workerPromise;
  if (!sherpaTtsInstalled()) {
    // ⚠️ Ne PAS mettre ce null en cache : l'utilisatrice peut installer APRÈS
    // une première phrase (repli navigateur). Sinon l'installation suivante
    // retomberait sur ce null figé et échouerait à tort.
    return Promise.resolve(null);
  }
  workerPromise = (async () => {
    try {
      const w = new Worker(SHERPA_TTS_WORKER, { type: 'module' });
      const ok = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 30000); // 30 s max de chargement
        w.onmessage = (e: MessageEvent) => {
          const d = e.data as { type?: string };
          if (d?.type === 'sherpa-onnx-tts-ready') {
            clearTimeout(timer);
            ready = true;
            resolve(true);
          } else if (d?.type === 'error') {
            clearTimeout(timer);
            resolve(false);
          }
        };
        w.onerror = () => { clearTimeout(timer); resolve(false); };
      });
      if (!ok) {
        w.terminate();
        workerPromise = null;
        return null;
      }
      worker = w;
      return w;
    } catch {
      workerPromise = null;
      return null;
    }
  })();
  return workerPromise;
}

/**
 * Génère l'audio pour `text` via le worker et le JOUE via AudioContext.
 * Renvoie true si la phrase a été dite, false si indisponible/échec
 * (→ l'appelant retombe sur la voix navigateur).
 */
export async function speakSherpaTts(text: string): Promise<boolean> {
  if (!text?.trim()) return false;
  const w = await ensureSherpaTts();
  if (!w || !ready) return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (ok: boolean) => { if (!settled) { settled = true; resolve(ok); } };
    const timer = setTimeout(() => done(false), 15000); // 15 s max par phrase

    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; samples?: Float32Array; sampleRate?: number; message?: string };
      if (d?.type === 'sherpa-onnx-tts-result' && d.samples && d.sampleRate) {
        clearTimeout(timer);
        w.removeEventListener('message', onMsg);
        // Jouer dans le thread principal (le worker a déjà transféré le buffer).
        void playSamples(d.samples, d.sampleRate)
          .then(() => done(true))
          .catch(() => done(false));
      } else if (d?.type === 'error') {
        clearTimeout(timer);
        w.removeEventListener('message', onMsg);
        done(false);
      }
    };
    w.addEventListener('message', onMsg);
    try {
      w.postMessage({ type: 'generate', text, sid: 0, speed: 1.0 });
    } catch {
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      done(false);
    }
  });
}

/**
 * Joue des échantillons Float32 (sampleRate du moteur) via AudioContext, annulable.
 * On réutilise le contexte PARTAGÉ de l'appli (getSharedAudioContext d'elevenlabs.ts)
 * — un seul AudioContext par page, moins coûteux sur mobile.
 */
function playSamples(samples: Float32Array, sampleRate: number): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getSharedAudioContext();
    const buffer = ctx.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    activeSource = source;
    source.onended = () => {
      if (activeSource === source) activeSource = null;
      resolve();
    };
    source.start();
  });
}

/** Coupe la lecture sherpa en cours (appelé par le chef d'orchestre au stop). */
export function stopSherpaTts(): void {
  if (activeSource) {
    try { activeSource.stop(); } catch { /* déjà arrêté */ }
    // source.stop() déclenche onended → activeSource repassera à null et la
    // promesse de lecture se résoudra. On force le nettoyage immédiat au cas où.
    activeSource = null;
  }
}

/**
 * Point d'entrée utilisé par audioManager : essaie le TTS neuronal sherpa,
 * sinon retombe sur la voix navigateur (jamais muet).
 */
export async function speakChunkSherpaOrBrowser(chunk: string): Promise<void> {
  const ok = await speakSherpaTts(chunk);
  if (!ok) {
    const { speakBrowser } = await import('./elevenlabs');
    await speakBrowser(chunk);
  }
}

/**
 * Au démarrage : si la voix neuronale a déjà été installée, on PRÉ-CHARGE le
 * worker en tâche de fond (depuis le cache navigateur / même origine) pour qu'il
 * soit prêt sans attente à la première phrase. Ne fait rien si jamais installé.
 */
export function warmSherpaTtsIfInstalled(): void {
  if (ready || workerPromise) return;
  if (!sherpaTtsInstalled()) return;
  ensureSherpaTts().catch(() => { /* ré-échauffement silencieux */ });
}

/**
 * Installation / activation : vérifie que le runtime répond (fichiers déposés par
 * scripts/install-sherpa-tts.sh), marque l'installation et pré-charge le worker.
 * Renvoie true si tout est bon. Ne déclenche AUCUN téléchargement réseau ici : le
 * script d'installation dépose les fichiers (ou le CDN souverain les sert).
 */
export async function installSherpaTtsModel(): Promise<boolean> {
  try {
    // 1. Le worker doit répondre (fichiers présents dans public/voix/sherpa).
    const head = await fetch(`${SHERPA_TTS_BASE}/sherpa-onnx-tts.worker.js`, { method: 'HEAD' });
    if (!head.ok) return false;
    // 2. Marquer installé puis charger (le chargement réel échouera proprement
    //    si un fichier manque → repli navigateur, aucune régression).
    try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ }
    const w = await ensureSherpaTts();
    return !!w;
  } catch {
    return false;
  }
}
