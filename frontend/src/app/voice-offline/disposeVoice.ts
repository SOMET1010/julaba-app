/**
 * disposeVoice.ts — Libération des moteurs vocaux hors-ligne au logout /
 * déchargement de la page, pour éviter les fuites mémoire : le recognizer
 * sherpa (WASM), le worker TTS (WASM + modèle ~13 Mo) et l'AudioContext
 * partagé resteraient vivants pour la durée de vie de l'onglet sinon.
 *
 * Imports DYNAMIQUES : ces modules (~Mo de runtime) ne doivent pas grossir le
 * bundle critique ; ils ne sont chargés qu'à la déconnexion / fermeture.
 * Totalement défensif : une erreur de libération ne casse jamais le logout.
 */
export async function disposeVoiceEngines(): Promise<void> {
  try {
    const { disposeOfflineStt } = await import('./offlineStt');
    disposeOfflineStt();
  } catch { /* silencieux — la voix ne bloque jamais la déconnexion */ }
  try {
    const { disposeSherpaTts } = await import('../services/sherpaTts');
    disposeSherpaTts();
  } catch { /* silencieux */ }
}
