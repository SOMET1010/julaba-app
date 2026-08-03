// ──────────────────────────────────────────────────────────────────────────
// Pont vers le moteur vocal Sherpa NATIF (Route B).
//
// Quand Julaba tourne dans sa coquille Android (Capacitor), la reconnaissance
// vocale ne passe PLUS par le navigateur (Vosk WASM) mais par le moteur
// sherpa-onnx NATIF embarqué dans l'APK — celui qui a donné les résultats
// « bluffants » en test. Ce module est le côté JS du pont ; le côté natif est
// le plugin Kotlin `SherpaStt` (voir native/android/SherpaSttPlugin.kt).
//
// Sur le web pur (navigateur, aperçu de dev), `Capacitor.isNativePlatform()`
// vaut false : ce module n'est jamais utilisé et l'appli retombe sur Vosk.
// ──────────────────────────────────────────────────────────────────────────
import { Capacitor, registerPlugin } from '@capacitor/core';

// Contrat du plugin natif. Le WAV est décodé côté JS en échantillons Float32
// mono ; on les transmet en base64 (octets Float32 little-endian) + la
// fréquence d'échantillonnage. Le natif rééchantillonne à 16 kHz si besoin.
export interface SherpaSttPlugin {
  /** Le moteur natif est-il chargé et prêt (modèle présent dans l'APK) ? */
  isAvailable(): Promise<{ available: boolean }>;
  /** Transcrit un clip complet. `pcm` = base64 d'un Float32Array little-endian. */
  transcribe(options: { pcm: string; sampleRate: number }): Promise<{ text: string }>;
}

const SherpaStt = registerPlugin<SherpaSttPlugin>('SherpaStt');

/** Vrai uniquement dans la coquille native (Android). Faux dans un navigateur. */
export function estNatif(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// Encode un Float32Array en base64 (octets bruts LE) sans exploser la pile
// d'appels sur les gros buffers (String.fromCharCode par tranches).
function float32EnBase64(f: Float32Array): string {
  const octets = new Uint8Array(f.buffer, f.byteOffset, f.byteLength);
  let binaire = '';
  const TRANCHE = 0x8000;
  for (let i = 0; i < octets.length; i += TRANCHE) {
    binaire += String.fromCharCode(...octets.subarray(i, i + TRANCHE));
  }
  return btoa(binaire);
}

/**
 * Transcrit un clip (échantillons Float32 mono) via le moteur Sherpa natif.
 * @param samples    audio mono en Float32 (−1..1)
 * @param sampleRate fréquence d'échantillonnage d'origine
 * @returns le texte reconnu (chaîne vide si rien)
 */
export async function transcribeNative(samples: Float32Array, sampleRate: number): Promise<string> {
  const { text } = await SherpaStt.transcribe({ pcm: float32EnBase64(samples), sampleRate });
  return (text || '').trim();
}

/** Le moteur natif est-il utilisable ? (natif + modèle chargé). */
export async function nativeSttPret(): Promise<boolean> {
  if (!estNatif()) return false;
  try { return (await SherpaStt.isAvailable()).available; } catch { return false; }
}
