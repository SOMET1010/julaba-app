import { playClip } from './audioManager';
import type { ResultatEntree, ResultatLecture } from './entreeVoixAvantConnexion';

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

const BASE = '/voix/fr-CI/prototype';

/**
 * Le drapeau des clips « prototype », lu au moment où on en a besoin plutôt
 * qu'à la racine du module. Même constante de build — Vite remplace
 * l'expression où qu'elle soit écrite — mais le module s'importe alors hors
 * Vite, donc sa règle est prouvable. Une décision qu'on ne peut pas tester
 * est une décision qu'on ne peut pas défendre.
 */
function prototypesVoixActifs(): boolean {
  return import.meta.env.VITE_JULABA_VOICE_PREVIEW === 'true';
}

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

/** La règle de disponibilité, PURE : elle prend l'état du drapeau en argument,
 *  donc elle s'appelle dans les deux mondes, dans le même processus. */
export function urlClipEntree(key: EntreeVoiceKey, actifs: boolean = prototypesVoixActifs()): string | null {
  const clip = ENTREE_VOICE_CLIPS[key];
  if (!clip) return null;
  return clip.atteste || (clip.prototype && actifs) ? clip.file : null;
}

export function entreeClipUrl(key: EntreeVoiceKey): string | null {
  return urlClipEntree(key);
}

export interface DepsEntreeVoix {
  readonly clipUrl: (key: EntreeVoiceKey) => Promise<string | null>;
  readonly jouer: (clipUrl: string) => Promise<ResultatLecture>;
}

/**
 * DETTE ACC-05, LA MÊME QU'AUX ÉCRANS 1 ET 4. `audioManager.playClip` rend
 * `Promise<void>` : il connaît le résultat et le jette. On lit donc ce qui est
 * observable — une exception — et rien de plus. Le type porte déjà les trois
 * issues ; le jour où VOICE-01 est desserrée, il y a un mot à changer.
 */
const DEPS_REELLES: DepsEntreeVoix = {
  clipUrl: async (key) => urlClipEntree(key),
  jouer: async (clipUrl) => {
    try { await playClip({ url: clipUrl }); return 'ended'; }
    catch { return 'failed'; }
  },
};

/**
 * Joue le clip local exact, et RAPPORTE ce qu'il en advient — NUM-01.
 *
 * LE DÉFAUT QU'ON FERME. Banc terrain, écran 3 : « MUET » et « 1 impasse /14 ».
 * Cette fonction rendait `Promise<void>` : un clip joué et un clip absent
 * étaient indiscernables. L'écran appelait donc sa consigne au montage et sous
 * le bouton « Écouter Tantie Nanti Lou », et dans tout build livré — drapeau
 * des prototypes éteint — il ne se passait rien. Personne n'en était averti.
 *
 * On ne synthétise toujours RIEN ici : la voix de Tantie est une voix
 * enregistrée. `doitDireLeTexte` porte la décision, prise une seule fois, et
 * c'est l'écran qui dit la clé de catalogue quand il ne reste que ça.
 *
 * Une lecture COUPÉE ne se rattrape pas : quand la marchande tape un chiffre
 * pendant la consigne, ce silence est sa décision.
 */
export async function direEntree(
  key: EntreeVoiceKey,
  deps: DepsEntreeVoix = DEPS_REELLES,
): Promise<ResultatEntree> {
  const url = await deps.clipUrl(key);
  if (!url) return { lu: false, raison: 'aucun-clip', doitDireLeTexte: true };
  const r = await deps.jouer(url);
  if (r === 'failed') return { lu: false, raison: 'clip-echoue', doitDireLeTexte: true };
  if (r === 'cancelled') return { lu: false, raison: 'coupe', doitDireLeTexte: false };
  return { lu: true, par: 'clip', doitDireLeTexte: false };
}

/**
 * Résout une phrase FIXE vers son clip exact ; toute phrase dynamique reste
 * visuelle — et le RESTE, volontairement (NUM-02).
 *
 * Cette porte-là ne gagne AUCUN repli parlé, et ce n'est pas un oubli.
 * `LoginPassword` s'en sert aussi pour relire le numéro composé
 * (`parle(chiffresEpeles(phone))`). Lui donner une voix de secours ferait
 * prononcer le numéro de téléphone de la marchande à voix haute, au marché.
 * Une phrase inconnue ne produit donc rien, et ne demande rien.
 */
export async function direEntreeTexte(
  texte: string,
  deps: DepsEntreeVoix = DEPS_REELLES,
): Promise<ResultatEntree> {
  const key = INDEX_TEXTE.get(normaliser(texte));
  if (!key) return { lu: false, raison: 'coupe', doitDireLeTexte: false };
  return direEntree(key, deps);
}
