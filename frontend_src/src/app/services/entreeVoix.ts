import { playClip } from './audioManager';
import { playTataChoice, resolveLocalVoiceChoice } from './localVoiceChoice';

export type EntreeVoiceKey =
  | 'numero'
  | 'numeroVoix'
  | 'code'
  | 'codeErreur'
  | 'connexionIndisponible'
  | 'reconnaissance';

export interface EntreeVoiceClip {
  file: string;
  texte: string;
  atteste: boolean;
  prototype?: boolean;
}

const PROTOTYPES_VOIX_ACTIFS = import.meta.env.VITE_JULABA_VOICE_PREVIEW === 'true';
const BASE = '/voix/fr-CI/prototype';

/**
 * Petit noyau vocal de l'entrée. Tous ces clips utilisent exactement la même voix
 * Callirrhoe et le même prompt de direction que le clip d'accueil v5.
 * Ils restent marqués « prototype » jusqu'à validation humaine ivoirienne.
 */
export const ENTREE_VOICE_CLIPS: Record<EntreeVoiceKey, EntreeVoiceClip> = {
  numero: {
    file: `${BASE}/tata-entree-numero.mp3`,
    texte: 'Tape les chiffres de ton numéro, un par un. Les ronds en haut vont se remplir.',
    atteste: false,
    prototype: true,
  },
  numeroVoix: {
    file: `${BASE}/tata-entree-numero-voix.mp3`,
    texte: 'Dis ton numéro, ou tape les chiffres un par un. Les ronds en haut vont se remplir.',
    atteste: false,
    prototype: true,
  },
  code: {
    file: `${BASE}/tata-entree-code.mp3`,
    texte: 'Entre ton code secret à quatre chiffres.',
    atteste: false,
    prototype: true,
  },
  codeErreur: {
    file: `${BASE}/tata-entree-code-erreur.mp3`,
    texte: "Ce n'est pas le bon code. Réessaie doucement.",
    atteste: false,
    prototype: true,
  },
  connexionIndisponible: {
    file: `${BASE}/tata-entree-connexion.mp3`,
    texte: 'La connexion ne passe pas pour le moment. Attends un peu, puis réessaie.',
    atteste: false,
    prototype: true,
  },
  reconnaissance: {
    file: `${BASE}/tata-entree-reconnaissance.mp3`,
    texte: 'Touche le grand bouton. Ton téléphone va te reconnaître.',
    atteste: false,
    prototype: true,
  },
};

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDEX_TEXTE = new Map<string, EntreeVoiceKey>(
  Object.entries(ENTREE_VOICE_CLIPS).map(([key, clip]) => [normaliser(clip.texte), key as EntreeVoiceKey]),
);

export function entreeClipUrl(key: EntreeVoiceKey): string | null {
  const clip = ENTREE_VOICE_CLIPS[key];
  return clip.atteste || (clip.prototype && PROTOTYPES_VOIX_ACTIFS) ? clip.file : null;
}

/** Joue un clip local exact, ou reste silencieux. Jamais de voix du navigateur. */
export async function direEntree(key: EntreeVoiceKey): Promise<void> {
  const choice = resolveLocalVoiceChoice(entreeClipUrl(key));
  await playTataChoice(choice, (clipUrl) => playClip({ url: clipUrl }));
}

/** Résout une phrase fixe vers son clip exact ; toute phrase dynamique reste visuelle. */
export async function direEntreeTexte(texte: string): Promise<void> {
  const key = INDEX_TEXTE.get(normaliser(texte));
  if (!key) return;
  await direEntree(key);
}
