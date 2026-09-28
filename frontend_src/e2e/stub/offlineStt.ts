/**
 * STUB DE RECETTE — remplace le SEUL maillon que le navigateur ne peut pas
 * jouer : sherpa-onnx, qui n'existe que dans l'APK.
 *
 * Tout le reste tourne pour de vrai — `useVoiceCore`, `MicroVenteCaisse`,
 * `POSCaisse`, la machine d'encaissement, le panier. Ce fichier ne remplace
 * que la TRANSCRIPTION, et la recette dit explicitement que la transcription
 * elle-même n'est donc pas prouvée ici.
 *
 * Le script de recette pose la phrase dans `window.__transcriptScripte` juste
 * avant de toucher le micro.
 */
export function offlineModelReady(): boolean { return true; }
export async function ensureOfflineModel(): Promise<void> { /* déjà prêt */ }
export async function transcribeWav(): Promise<string> {
  const w = window as unknown as { __transcriptScripte?: string };
  const t = w.__transcriptScripte ?? '';
  // Une phrase ne se rejoue pas toute seule : on la consomme.
  w.__transcriptScripte = '';
  return t;
}
export function sttDisponible(): boolean { return true; }

// Les autres exports du vrai module, pour que l'alias soit un remplacement
// COMPLET : un import manquant casserait le build sans que ça se voie.
export function offlineModelInstalled(): boolean { return true; }
export function warmOfflineModelIfInstalled(): void { /* rien à préchauffer */ }
export async function startLiveDictation(): Promise<null> { return null; }
