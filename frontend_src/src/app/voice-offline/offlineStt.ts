// ──────────────────────────────────────────────────────────────────────────
// STT hors-ligne pour Julaba — transcription 100 % SUR L'APPAREIL (Vosk WASM).
//
// Le flux voix de Julaba enregistre un blob WAV (MediaRecorder -> convertToWav)
// puis l'envoie au serveur. Ce module fournit la version OFFLINE : on transcrit
// le même blob dans le navigateur, sans réseau.
//
// vosk-browser (~5,8 Mo) est chargé par un import DYNAMIQUE : il n'entre dans le
// bundle que lorsqu'on active/utilise le mode hors-ligne. Le modèle (~40 Mo) est
// téléchargé une fois puis mis en cache par le navigateur (offline ensuite).
// ──────────────────────────────────────────────────────────────────────────

import { GRAMMAR_WORDS } from './vocabulaire';
import { VOSK_MODEL_URL } from './voskModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let modelPromise: Promise<Any> | null = null;
let modelReady = false;
let sharedCtx: AudioContext | null = null;

// Drapeau PERSISTANT : le modèle (~40 Mo) a déjà été téléchargé une fois sur cet
// appareil (il reste en cache navigateur). `modelReady`, lui, est une variable
// mémoire remise à zéro à CHAQUE rechargement de page — sans ce drapeau, l'appli
// « oubliait » le mode hors-ligne après un reload et retombait sur le cloud (mort),
// d'où le « petit souci technique ». On mémorise donc l'installation durablement.
const INSTALL_KEY = 'julaba_offline_installed';

/** Vrai si le modèle est chargé EN MÉMOIRE, prêt à transcrire tout de suite. */
export function offlineModelReady(): boolean {
  return modelReady;
}

/** Vrai si le modèle a déjà été installé sur cet appareil (persistant, survit au reload). */
export function offlineModelInstalled(): boolean {
  try { return localStorage.getItem(INSTALL_KEY) === '1'; } catch { return false; }
}

/** Télécharge + initialise le modèle une seule fois (idempotent). */
export function ensureOfflineModel(): Promise<Any> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { createModel } = await import('vosk-browser'); // code-split ici
      const model = await createModel(VOSK_MODEL_URL);
      modelReady = true;
      try { localStorage.setItem(INSTALL_KEY, '1'); } catch { /* ignore */ }
      return model;
    })().catch((e) => {
      modelPromise = null;
      modelReady = false;
      throw e;
    });
  }
  return modelPromise;
}

/**
 * Au démarrage : si le mode hors-ligne a déjà été installé, on RÉ-ACTIVE le modèle
 * en tâche de fond (rapide, depuis le cache navigateur) pour qu'il soit prêt sans
 * que la marchande ait à ré-installer. Ne fait rien si jamais installé.
 */
export function warmOfflineModelIfInstalled(): void {
  if (modelReady || modelPromise) return;
  if (!offlineModelInstalled()) return;
  ensureOfflineModel().catch(() => { /* ré-échauffement silencieux */ });
}

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Enveloppe un Float32Array en AudioBuffer au sample rate donné. */
function makeAudioBuffer(sampleRate: number, data: Float32Array): AudioBuffer {
  const ctx = new OfflineAudioContext(1, data.length, sampleRate);
  const ab = ctx.createBuffer(1, data.length, sampleRate);
  ab.getChannelData(0).set(data); // évite la contrainte de type de copyToChannel
  return ab;
}

/**
 * Transcrit un blob/ArrayBuffer WAV hors-ligne et renvoie le texte final.
 * @param wav      le WAV (16 kHz mono attendu, mais tout format décodable marche)
 * @param useGrammar limite au vocabulaire du marché (améliore la précision)
 */
export async function transcribeWav(wav: Blob | ArrayBuffer, useGrammar = true): Promise<string> {
  const model = await ensureOfflineModel();
  const arrayBuf = wav instanceof Blob ? await wav.arrayBuffer() : wav.slice(0);
  const audioBuf = await getCtx().decodeAudioData(arrayBuf as ArrayBuffer);

  const sampleRate = audioBuf.sampleRate;
  const grammar = useGrammar ? JSON.stringify(GRAMMAR_WORDS) : undefined;
  const recognizer: Any = grammar
    ? new model.KaldiRecognizer(sampleRate, grammar)
    : new model.KaldiRecognizer(sampleRate);

  const channel = audioBuf.getChannelData(0);
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
