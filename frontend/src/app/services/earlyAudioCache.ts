/**
 * earlyAudioCache.ts — RÉSIDU ASSAINI (hygiène post-audit voix, C5).
 *
 * Historique : ce module pré-générait des « sons instantanés » via le TTS cloud
 * (/tts/openai) et les jouait en WebAudio SANS passer par l'audioManager. La
 * voix par Internet est désactivée (décision produit) : tout le corps cloud
 * (préchargement réseau, cache AudioBuffer, lecture directe) a été SUPPRIMÉ
 * pour qu'il ne puisse pas être réactivé par accident — la voix passe
 * exclusivement par les clips embarqués de Tata + la voix du téléphone, via
 * l'audioManager (créneau exclusif).
 *
 * Restent deux utilitaires vivants, sans réseau :
 * - unlockAudioContextIOS : déblocage de l'AudioContext au premier geste
 *   (iOS Safari / Android Chrome) — utilisé par TantieSagesseModal ;
 * - preloadEarlyAudios : no-op conservé pour compatibilité (useVoiceCore).
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === "closed") {
    // Android Chrome : webkitAudioContext fallback
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _ctx = new AC();
  }
  // iOS Safari + Android Chrome — toujours résoudre le contexte suspendu
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

/** iOS Safari : débloquer l'AudioContext sur le premier geste utilisateur. */
export function unlockAudioContextIOS(): void {
  const ctx = getCtx();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/** No-op conservé pour compatibilité (aucun préchargement réseau — jamais). */
export async function preloadEarlyAudios(): Promise<void> {
  return;
}
