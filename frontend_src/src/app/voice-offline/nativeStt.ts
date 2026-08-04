// ──────────────────────────────────────────────────────────────────────────
// Pont JS → plugin natif SherpaStt (Capacitor) pour la transcription vocale
// hors-ligne sur l'APK Android.
//
// Sur le web (navigateur), ce module est une NON-opération : il n'y a pas de
// plugin natif, le repli reste Vosk WASM (voir offlineStt.ts). Sur l'APK
// Capacitor, on appelle le plugin natif enregistré dans SherpaSttPlugin.kt
// via le mécanisme officiel `Capacitor.getPlatform() === 'android'` +
// `registerPlugin`.
//
// Contrat canonique (à respecter par SherpaSttPlugin.kt) :
//   - isAvailable(): { available: boolean }
//   - transcribe({ pcm, sampleRate }): { text: string }
//       pcm : base64 d'un Float32Array little-endian (échantillons bruts)
//       sampleRate : fréquence d'origine, le natif rééchantillonne à 16 kHz.
// ──────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let plugin: Any | null | undefined; // undefined = pas encore évalué

function getPlugin(): Any | null {
  if (plugin !== undefined) return plugin;
  try {
    // Capacitor 8 : import dynamique, réduit l'impact sur le bundle web.
    const cap = (window as unknown as Any).Capacitor;
    if (cap && cap.getPlatform() === 'android') {
      // L'enregistrement est déclaré du côté natif (MainActivity). On y accède
      // par le pont global fourni par Capacitor.
      plugin = cap.Plugins?.SherpaStt ?? null;
    } else {
      plugin = null;
    }
  } catch {
    plugin = null;
  }
  return plugin;
}

/** Vrai si le plugin natif Sherpa est présent ET disponible (moteur chargé). */
export async function sherpaNativeAvailable(): Promise<boolean> {
  const p = getPlugin();
  if (!p || typeof p.isAvailable !== 'function') return false;
  try {
    const res = await p.isAvailable();
    return Boolean(res?.available);
  } catch {
    return false;
  }
}

function float32ToBase64LittleEndian(samples: Float32Array): string {
  const buffer = new ArrayBuffer(samples.length * 4);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    view.setFloat32(i * 4, samples[i], true); // little-endian
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

/**
 * Transcrit un paquet d'échantillons Float32 via le plugin natif Sherpa.
 * @param samples    échantillons mono bruts (Float32Array) extraits du WAV décodé
 * @param sampleRate fréquence d'origine (le natif rééchantillonne vers 16 kHz)
 * @returns le texte reconnu (string vide si rien / erreur)
 */
export async function transcribeNative(samples: Float32Array, sampleRate: number): Promise<string> {
  const p = getPlugin();
  if (!p || typeof p.transcribe !== 'function') return '';

  const pcm = float32ToBase64LittleEndian(samples);
  try {
    const res = await p.transcribe({ pcm, sampleRate });
    const text = typeof res?.text === 'string' ? res.text.trim() : '';
    return normalize(text);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[nativeStt] transcribe échoué', e);
    return '';
  }
}

/** Nettoie le texte du moteur : espaces multiples, casse, ponctuation de garde. */
function normalize(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]+$/g, '');
}

/** API d'installation/capacités — appelé en garde par la couche vocale. */
export const nativeStt = {
  isAvailable: sherpaNativeAvailable,
  transcribe: transcribeNative,
};