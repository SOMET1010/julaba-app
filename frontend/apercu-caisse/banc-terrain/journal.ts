/**
 * OBSERVATION DU BANC TERRAIN — se branche, ne change rien.
 *
 * Deux instrumentations EXISTANTES sont lues ici, aucune n'est inventée :
 *
 *  1. `i18n/voice/contrat-audio.enregistrerRenduVocal` — le point d'entrée que
 *     Manus utilisera. On s'y enregistre en ENVELOPPE : on note `{ id, locale,
 *     texte, variables }` du message résolu, puis on rend la main au rendu qui
 *     était en place. Le texte n'est pas réécrit, la décision n'est pas prise
 *     ici, le son est produit exactement comme sans le banc.
 *
 *  2. `utils/voiceTrace` — le journal de voix en anneau du lot E (TTS_DEMANDE,
 *     TTS_IGNOREE, TTS_DEBUT/TTS_FIN, TTS_MOTEUR, ECRAN…). C'est LUI qui dit ce
 *     qui a été RÉELLEMENT demandé au moteur audio, et ce qu'il en est advenu :
 *     un clip demandé puis refusé (« muet », « anti-répétition ») ou dont la
 *     lecture échoue n'est pas une phrase entendue. Une capture d'écran ne le
 *     dit jamais.
 *
 * POURQUOI LES DEUX. `speakMessage` ne fait passer la CLÉ du catalogue que par
 * (1) ; les voix de Tantie (`direIntro`, `direAccueilMarchand`) ne passent que
 * par (2), via `audioManager.playClip`. Un banc qui n'écoute qu'un seul des
 * deux déclare muet un écran qui parle, ou parlant un écran muet.
 *
 * L'enregistrement du rendu vocal est REARMABLE (`__banc.armer()`) : les écrans
 * sont chargés en différé, et `i18n/voice/speakMessage` réenregistre SON rendu
 * au moment où il est évalué. Le banc réarme donc avant chaque mesure ;
 * l'enveloppe se reconnaît elle-même et ne s'empile jamais.
 */
import { enregistrerRenduVocal, renduVocalCourant, type RenduVocal } from '../../src/app/i18n/voice/contrat-audio';
import * as vtrace from '../../src/app/utils/voiceTrace';

const MARQUE = '__bancTerrain';

interface CleDite {
  id: string;
  locale?: string;
  texte: string;
  variables?: Record<string, unknown>;
  t: number;
}

const fenetre = window as unknown as {
  __bancCles?: CleDite[];
  __banc?: Record<string, unknown>;
};

function armer(): void {
  const courant = renduVocalCourant() as RenduVocal & { [MARQUE]?: true };
  if (courant[MARQUE]) return;
  const enveloppe: RenduVocal & { [MARQUE]?: true } = (message, direTexte) => {
    try {
      (fenetre.__bancCles ??= []).push({
        id: String(message.id),
        locale: (message as { locale?: string }).locale,
        texte: String(message.texte),
        variables: message.variables as Record<string, unknown> | undefined,
        t: Date.now(),
      });
    } catch { /* une trace qui casse la voix serait pire que pas de trace */ }
    return courant(message, direTexte);
  };
  enveloppe[MARQUE] = true;
  enregistrerRenduVocal(enveloppe);
}

fenetre.__banc = {
  armer,
  /** Les clés du catalogue réellement résolues et rendues depuis le dernier `vider`. */
  cles: () => fenetre.__bancCles ?? [],
  /** Le journal de voix existant, brut. */
  journal: () => vtrace.entrees(),
  /** Le même, mis en forme par l'application elle-même (une ligne par événement). */
  rendu: () => vtrace.rendu(),
  vider: () => { fenetre.__bancCles = []; vtrace.vider(); },
};

armer();
