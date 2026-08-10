// ──────────────────────────────────────────────────────────────────────────
// Pont JS → plugin natif SherpaStt (Capacitor) pour la transcription vocale
// hors-ligne sur l'APK Android.
//
// Sur le web (navigateur), ce module est une NON-opération : il n'y a pas de
// plugin natif, le repli reste Vosk WASM (voir offlineStt.ts). Sur l'APK
// Capacitor, on appelle le plugin natif enregistré dans MainActivity.java
// (SherpaSttPlugin.java) via le mécanisme officiel `registerPlugin`.
//
// Contrat canonique (implémenté par SherpaSttPlugin.java) :
//   - isAvailable(): { available: boolean }
//   - prepare({ dir, files }): { available: boolean }
//       files : [{ name, url, size }] — téléchargés dans filesDir/<dir> puis
//               utilisés pour construire l'OnlineRecognizer natif. Événement
//               « modelProgress » ({ name, doneBytes, totalBytes }) pendant
//               le téléchargement.
//   - transcribe({ pcm, sampleRate }): { text: string }
//       pcm : base64 d'un Float32Array little-endian (échantillons bruts)
//       sampleRate : fréquence d'origine, le natif rééchantillonne à 16 kHz.
//   - release(): libère le recognizer.
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

/** Vrai si le plugin natif est présent (sans vérifier s'il est déjà prêt). */
export function nativePresent(): boolean {
  return getPlugin() != null;
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

/** Fichier modèle attendu par le plugin natif (nom court dans filesDir). */
export interface NativeModelFile {
  name: string;
  url: string;
  size: number;
}

/**
 * Télécharge (si absent) les fichiers du modèle puis initialise le recognizer
 * natif. Idempotent : si les modèles sont déjà dans filesDir, pas de réseau.
 * @param modelFiles fichiers du modèle FR (noms courts : encoder.onnx, …)
 * @param onProgress progression par fichier : (name, doneBytes, totalBytes)
 * @returns vrai si le recognizer natif est prêt
 */
export async function prepareNative(
  modelFiles: NativeModelFile[],
  onProgress?: (name: string, doneBytes: number, totalBytes: number) => void,
): Promise<boolean> {
  const p = getPlugin();
  if (!p || typeof p.prepare !== 'function') return false;
  let handle: Any = null;
  if (onProgress && typeof p.addListener === 'function') {
    try {
      handle = await p.addListener('modelProgress', (d: Any) => {
        onProgress(d?.name ?? '', d?.doneBytes ?? 0, d?.totalBytes ?? 0);
      });
    } catch {
      handle = null; // progression optionnelle
    }
  }
  try {
    const res = await p.prepare({ dir: 'sherpa-stt', files: modelFiles });
    return Boolean(res?.available);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[nativeStt] prepare échoué', e);
    return false;
  } finally {
    try { if (handle && typeof handle.remove === 'function') handle.remove(); } catch { /* */ }
  }
}

/** Libère le recognizer natif (mémoire). */
export async function releaseNative(): Promise<void> {
  const p = getPlugin();
  if (!p || typeof p.release !== 'function') return;
  try { await p.release(); } catch { /* */ }
}

/** API d'installation/capacités — appelé en garde par la couche vocale. */
export const nativeStt = {
  isAvailable: sherpaNativeAvailable,
  present: nativePresent,
  prepare: prepareNative,
  transcribe: transcribeNative,
  release: releaseNative,
};