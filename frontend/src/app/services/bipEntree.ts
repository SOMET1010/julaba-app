/**
 * LE BIP QUI PRÉCÈDE L'ÉCOUTE — audit Patrick, 26/10 (second volet).
 *
 * « Dis ton numéro après le bip » : pour celle qui ne lit pas, le bip est la
 * frontière AUDIBLE entre la consigne de Tantie et le moment de parler. Sans
 * lui, « après » ne dit rien que l'oreille puisse attendre.
 *
 * WebAudio SEUL, sans réseau, sans clip : un oscillateur de 880 Hz, une
 * enveloppe douce (0,35 s), jamais un son de téléphones d'usine. Le contexte
 * est déjà réveillé au moment où on l'appelle — un geste a forcément eu lieu
 * (l'accueil a parlé, donc l'audio est débloqué) ; un échec se tait et ne
 * bloque JAMAIS l'écoute qui suit.
 *
 * CE MODULE NE DÉMARRE AUCUN MICRO, NE PARLE PAS, NE DÉCIDE RIEN. Il sonne,
 * c'est tout — la politique (quand biper, quand écouter) reste dans l'écran,
 * même frontière que `commandesEntree` (grammaire pure) et
 * `useCommandesVocales` (rouage pur).
 */

let _ctx: AudioContext | null = null;

/** Pure pour les tests : la fabrique de l'enveloppe, sans WebAudio. */
export const BIP_FREQUENCE_HZ = 880;
export const BIP_DUREE_S = 0.35;

export function sonnerBipEntree(): void {
  try {
    const AC = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return; // sans AudioContext : le silence ne doit pas planter
    if (!_ctx || _ctx.state === 'closed') _ctx = new AC();
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => { /* ignore */ });
    const t0 = _ctx.currentTime + 0.02;
    const osc = _ctx.createOscillator();
    const gain = _ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(BIP_FREQUENCE_HZ, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + BIP_DUREE_S);
    osc.connect(gain).connect(_ctx.destination);
    osc.start(t0);
    osc.stop(t0 + BIP_DUREE_S + 0.05);
  } catch { /* un bip qui casse ne bloque jamais l'écoute */ }
}
