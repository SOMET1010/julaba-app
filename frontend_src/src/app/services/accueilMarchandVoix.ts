import { playClip } from './audioManager';
import { playTataChoice, resolveLocalVoiceChoice } from './localVoiceChoice';

export type AccueilMarchandVoiceKey =
  | 'comptoir'
  | 'caisse'
  | 'reconnaissanceProposition'
  | 'reconnaissanceReussie'
  | 'reconnaissanceSession'
  | 'reconnaissanceErreur'
  | 'reconnaissanceRefus';

interface AccueilMarchandVoiceClip {
  file: string;
  texte: string;
  prototype: true;
}

const PROTOTYPES_VOIX_ACTIFS = import.meta.env.VITE_JULABA_VOICE_PREVIEW === 'true';
const BASE = '/voix/fr-CI/prototype';

/**
 * Phrases fixes de l'Accueil marchand. Toutes utilisent la même voix Callirrhoe
 * que l'entrée. Une phrase absente reste visuelle : jamais de voix navigateur.
 */
export const ACCUEIL_MARCHAND_VOICE_CLIPS: Record<AccueilMarchandVoiceKey, AccueilMarchandVoiceClip> = {
  comptoir: {
    file: `${BASE}/tata-accueil-comptoir.mp3`,
    texte: "Ton comptoir est prêt. On vend ensemble aujourd'hui.",
    prototype: true,
  },
  caisse: {
    file: `${BASE}/tata-accueil-caisse.mp3`,
    texte: "Le montant de ta caisse est affiché ici. Touche l'œil pour le cacher.",
    prototype: true,
  },
  reconnaissanceProposition: {
    file: `${BASE}/tata-reconnaissance-proposition.mp3`,
    texte: 'Veux-tu que ton téléphone te reconnaisse la prochaine fois ? Ce sera plus rapide.',
    prototype: true,
  },
  reconnaissanceReussie: {
    file: `${BASE}/tata-reconnaissance-reussie.mp3`,
    texte: "C'est fait. La prochaine fois, ton téléphone te reconnaîtra.",
    prototype: true,
  },
  reconnaissanceSession: {
    file: `${BASE}/tata-reconnaissance-session.mp3`,
    texte: 'Ta session est terminée. Reconnecte-toi, puis on réessaiera.',
    prototype: true,
  },
  reconnaissanceErreur: {
    file: `${BASE}/tata-reconnaissance-erreur.mp3`,
    texte: "Ça n'a pas marché ici. Tu pourras réessayer plus tard dans les réglages.",
    prototype: true,
  },
  reconnaissanceRefus: {
    file: `${BASE}/tata-reconnaissance-refus.mp3`,
    texte: "D'accord. On ne change rien.",
    prototype: true,
  },
};

export function accueilMarchandClipUrl(key: AccueilMarchandVoiceKey): string | null {
  return PROTOTYPES_VOIX_ACTIFS ? ACCUEIL_MARCHAND_VOICE_CLIPS[key].file : null;
}

/** Joue un clip exact ou reste silencieux. Ne synthétise jamais un texte. */
export async function direAccueilMarchand(key: AccueilMarchandVoiceKey): Promise<void> {
  const choice = resolveLocalVoiceChoice(accueilMarchandClipUrl(key));
  await playTataChoice(choice, (clipUrl) => playClip({ url: clipUrl }));
}
