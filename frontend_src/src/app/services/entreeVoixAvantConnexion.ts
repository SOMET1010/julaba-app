/**
 * LE BONJOUR DU PREMIER ÉCRAN — AKW-01.
 *
 * LE DÉFAUT QU'ON FERME. Banc terrain, écran 1 (Akwaba) : « MUET » et
 * « 1 impasse /2 ». Le bouton « Écouter Tantie Nanti Lou » touché, rien ne
 * bouge. C'est le tout premier écran du téléphone, et il ne dit pas bonjour.
 *
 * LA CAUSE, IDENTIQUE À CELLE DE L'ACCUEIL MARCHAND. `onboardingVoix.direIntro`
 * ne joue qu'un clip enregistré, et rend `Promise<void>` quand il n'y en a
 * pas : `if (!clipUrl) return;`. Dans tout build livré, le drapeau des
 * prototypes est éteint, donc il n'y a pas de clip, donc il ne se passe rien
 * — et personne n'en est averti. Un bouton câblé sur le vide.
 *
 * POURQUOI UN MODULE DE PLUS PLUTÔT QU'UN CORRECTIF SUR PLACE.
 * `services/onboardingVoix.ts` est FIGÉ par VOICE-01 contre 3917bb7 : « règle
 * de choix de voix intouchée ». Desserrer une garde est une décision de
 * Patrick, jamais l'effet de bord d'un lot. On n'y touche pas.
 *
 * CE QUE CELA COÛTE, ET COMMENT ON LE PAIE. La règle de disponibilité existe
 * donc à deux endroits — ici et là-bas. Deux copies finissent toujours par
 * diverger. `entreeVoixAvantConnexion.test.mts` relit le fichier figé et vérifie que
 * l'expression y est mot pour mot celle qu'on reprend : si elle change
 * là-bas, le test tombe ici. C'est un constat, pas un desserrage.
 *
 * `packClipUrl` (services/voicePacksRuntime.ts) rend `null` au runtime — aucun
 * manifeste distant n'est lu. On ne le rejoue donc pas : le reprendre ferait
 * croire à un chemin qui n'existe pas. Le test surveille qu'il le reste.
 */
import { playClip } from './audioManager';

/**
 * Les clés du registre figé que l'ENTRÉE utilise, avant toute connexion.
 *
 *   accueil / retour  — écran 1, Akwaba (première venue, ou retour)
 *   histoire1         — écran 2, Tantie se présente
 *   bravo             — écran 2, la récompense avant d'entrer
 */
export type CleEntree = 'accueil' | 'retour' | 'histoire1' | 'bravo';

/**
 * CE QUI S'EST RÉELLEMENT PASSÉ — même dessin qu'à l'accueil marchand, et
 * volontairement : deux écrans, une seule façon de dire « un son est sorti ».
 *
 * Une lecture COUPÉE n'appelle aucun recours : ici c'est le barge-in (la
 * marchande touche « Écouter et entrer » pendant le bonjour) et le changement
 * d'écran. Rattraper ce silence par une voix de synthèse la contredirait.
 */
export type ResultatEntree =
  | { readonly lu: true; readonly par: 'clip'; readonly doitDireLeTexte: false }
  | { readonly lu: false; readonly raison: 'aucun-clip' | 'clip-echoue'; readonly doitDireLeTexte: true }
  | { readonly lu: false; readonly raison: 'coupe'; readonly doitDireLeTexte: false };

export type ResultatLecture = 'ended' | 'failed' | 'cancelled';

/**
 * Le drapeau des clips « prototype », lu au moment où on en a besoin — même
 * constante de build (Vite remplace l'expression où qu'elle soit écrite), mais
 * le module s'importe alors hors Vite, donc la règle est prouvable.
 */
function prototypesVoixActifs(): boolean {
  return import.meta.env.VITE_JULABA_VOICE_PREVIEW === 'true';
}

/** La forme d'une entrée du registre figé — celle dont dépend la règle. */
export interface ClipIntro {
  readonly file: string;
  readonly atteste: boolean;
  readonly prototype?: boolean;
}

/**
 * Y a-t-il un clip pour ce bonjour ? Reprise mot pour mot de la règle de
 * `direIntro`, et PURE : elle prend l'entrée et l'état du drapeau en
 * arguments. C'est l'idiome du dépôt (drapeauxDyu.test.mts) — une décision
 * qu'on peut appeler dans les deux mondes, dans le même processus, sans
 * navigateur. Le test la compare à l'expression du fichier figé.
 */
export function urlDuClip(clip: ClipIntro | undefined, actifs: boolean): string | null {
  if (!clip) return null;
  return clip.atteste || (clip.prototype && actifs) ? clip.file : null;
}

export interface DepsEntree {
  readonly clipUrl: (cle: CleEntree) => Promise<string | null>;
  readonly jouer: (clipUrl: string) => Promise<ResultatLecture>;
}

/**
 * DETTE ACC-05, LA MÊME QU'À L'ACCUEIL. `audioManager.playClip` rend
 * `Promise<void>` : il connaît le résultat et le jette. On lit donc ce qui est
 * observable — une exception — et rien de plus. Le type porte déjà les trois
 * issues ; le jour où VOICE-01 est desserrée, il y a un mot à changer.
 */
const DEPS_REELLES: DepsEntree = {
  // IMPORT PARESSEUX, ET C'EST VOULU. `onboardingVoix` lit
  // `import.meta.env` à la racine de son module : l'importer statiquement
  // rendrait CE fichier inchargeable hors Vite, donc sa règle improuvable.
  // Le registre est figé ; on va le chercher au moment de s'en servir.
  clipUrl: async (cle) => {
    const { INTRO_CLIPS } = await import('./onboardingVoix');
    return urlDuClip(INTRO_CLIPS[cle], prototypesVoixActifs());
  },
  jouer: async (clipUrl) => {
    try { await playClip({ url: clipUrl }); return 'ended'; }
    catch { return 'failed'; }
  },
};

/** Joue le clip s'il existe, et RAPPORTE s'il reste quelque chose à dire. */
export async function direEntreeAvantConnexion(
  cle: CleEntree,
  deps: DepsEntree = DEPS_REELLES,
): Promise<ResultatEntree> {
  const url = await deps.clipUrl(cle);
  if (!url) return { lu: false, raison: 'aucun-clip', doitDireLeTexte: true };
  const r = await deps.jouer(url);
  if (r === 'failed') return { lu: false, raison: 'clip-echoue', doitDireLeTexte: true };
  if (r === 'cancelled') return { lu: false, raison: 'coupe', doitDireLeTexte: false };
  return { lu: true, par: 'clip', doitDireLeTexte: false };
}
