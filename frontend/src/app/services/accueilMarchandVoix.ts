import { playClip } from './audioManager';
import { resolveLocalVoiceChoice } from './localVoiceChoice';

export type AccueilMarchandVoiceKey =
  | 'comptoir'
  | 'caisse'
  | 'reconnaissanceProposition'
  // SECOND VOLET DE L'AUDIT (Patrick, 26/10) : la proposition s'entend
  // RÉPONDRE — la consigne (login-85) dit « dis oui ou non » après la
  // question, et l'écran écoute (commandesEntree.intentionOuiNon).
  | 'reconnaissanceConsigneVoix'
  | 'reconnaissanceReussie'
  | 'reconnaissanceSession'
  | 'reconnaissanceErreur'
  | 'reconnaissanceRefus';

interface AccueilMarchandVoiceClip {
  file: string;
  texte: string;
  prototype: true;
  /** Clip disponible dans le parcours livré, même sans mode preview. */
  lotA?: true;
}

const BASE = '/voix/fr-CI/prototype';

/**
 * Le drapeau des clips « prototype », lu AU MOMENT OÙ ON EN A BESOIN.
 *
 * Il valait une constante de module. C'est la même constante de build — Vite
 * remplace `import.meta.env.VITE_JULABA_VOICE_PREVIEW` par un littéral où
 * qu'elle soit écrite, donc le build livré est identique au caractère près.
 * Mais à la racine du module, elle s'évaluait au simple IMPORT : hors Vite
 * (`tsx`), importer ce fichier jetait, et la règle « une seule sortie » ne
 * pouvait être prouvée nulle part. Une décision qu'on ne peut pas tester est
 * une décision qu'on ne peut pas défendre.
 */
function prototypesVoixActifs(): boolean {
  return import.meta.env.VITE_JULABA_VOICE_PREVIEW === 'true';
}

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
    lotA: true,
  },
  // SECOND VOLET (26/10) : après la question, le geste vocal se NOMME. Le
  // clip vit dans la série login (mêmes specs lot A : Denise, −16 LUFS) et
  // est partagé avec l'index d'entrée (`entreeVoix.propositionConsigneVoix`).
  reconnaissanceConsigneVoix: {
    file: '/voix/tata/login-85.mp3',
    texte: 'Dis oui ou non, ou touche un bouton.',
    prototype: true,
    lotA: true,
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
  const clip = ACCUEIL_MARCHAND_VOICE_CLIPS[key];
  return clip.lotA || prototypesVoixActifs() ? clip.file : null;
}

// ── LE TOUR DE PAROLE DE L'ACCUEIL (Patrick, 26/10 : « la question ne joue pas ») ──
//
// LE FAIT (journal d'un vrai téléphone, recette 26/10) : la question de la
// reconnaissance part 1,5 s après le montage, PILE pendant la phrase de la
// caisse (« Ta caisse aujourd'hui : … », priorité 'user' elle aussi) — une
// preuve de parole coupe l'autre, et l'oreille ne garde qu'un fragment.
// C'est la MÊME course que le rappel login-09 coupait login-06 (e5ebc902),
// côté accueil : la règle « les rappels attendent leur tour » s'applique ici
// avec le miroir en plus — la caisse peut arriver TARD (réseau réel : les
// transactions mettent 2 à 5 s), donc la question doit (a) attendre AVANT de
// parler et (b) laisser la place si la caisse se réserve PENDANT sa question.
//
// Le protocole est un CRENEAU, pas une promesse : `speakMessage` ne rend pas
// sa fin (contrat i18n, non modifiable ici), donc l'accueil RÉSERVE une
// fenêtre généreuse à chaque prise de parole, et le demandeur interroge
// `tourVoixAccueilLibre()`. Six secondes couvrent la phrase de caisse (UNE
// phrase, ACC-01 : « Ta caisse aujourd'hui : N francs » ≈ 3-4 s dites, marge
// ×1,5-2) sans faire traîner la question — elle part au plus tard ~7,5 s
// après l'arrivée. Jamais plus tôt que le créneau, quel que soit le réseau.
let tourVoixJusquA = 0;

/** L'accueil prend la parole (phrase de caisse, bonjour) : il RÉSERVE son
 *  créneau. Appeler AVANT de parler — c'est le créneau que la question de la
 *  reconnaissance doit respecter. Idempotent : la réservation la plus
 *  récente gagne, jamais un raccourcissement. */
export function reserverVoixAccueil(ms = 6_000): void {
  tourVoixJusquA = Math.max(tourVoixJusquA, Date.now() + ms);
}

/** Le créneau de l'accueil est-il rendu ? (pur, testable sans navigateur) */
export function tourVoixAccueilLibre(maintenant: number = Date.now()): boolean {
  return maintenant >= tourVoixJusquA;
}

/**
 * CE QUI S'EST RÉELLEMENT PASSÉ — et non ce qu'on avait l'intention de faire.
 *
 * `lu` ne dit pas « un clip existait » : il dit « un son est sorti ». Et
 * `doitDireLeTexte` est la DÉCISION, prise ici, une seule fois — pas
 * reconstituée par chaque appelant à partir d'indices.
 *
 * La nuance qui compte : une lecture COUPÉE (muet global, changement d'écran)
 * n'appelle aucun recours. Ce silence-là est une décision de la marchande ou
 * de l'application ; le rattraper par une voix de synthèse la contredirait.
 */
export type ResultatVoixTata =
  | { readonly lu: true; readonly par: 'clip'; readonly doitDireLeTexte: false }
  | { readonly lu: false; readonly raison: 'aucun-clip' | 'clip-echoue'; readonly doitDireLeTexte: true }
  | { readonly lu: false; readonly raison: 'coupe'; readonly doitDireLeTexte: false };

export type ResultatLecture = 'ended' | 'failed' | 'cancelled';

/** Les deux seules choses que ce service va chercher dehors. Injectables pour
 *  que la règle soit prouvable sans navigateur ni fichier audio. */
export interface DepsAccueilVoix {
  readonly clipUrl: (key: AccueilMarchandVoiceKey) => string | null;
  readonly jouer: (clipUrl: string) => Promise<ResultatLecture>;
}

/**
 * CE QUE LE LECTEUR RÉEL SAIT DIRE, ET CE QU'IL NE SAIT PAS — dette ACC-05.
 *
 * `audioManager.playClip` rend `Promise<void>` : il connaît le résultat
 * (`ended` / `failed` / `cancelled`) et le jette. On lit donc ce qui est
 * observable — une exception — et rien de plus. Un clip dont le fichier
 * manque de l'APK se résout silencieusement en `failed` et nous parvient
 * comme « joué » : le bouton resterait muet sans que le texte rattrape.
 *
 * Le corriger demande un `playClipRapporte` dans `services/audioManager.ts`,
 * FIGÉ par VOICE-01 contre 3917bb7 (« seules des lignes de journal peuvent y
 * être ajoutées »). Desserrer une garde est une décision de Patrick, pas un
 * effet de bord de ce lot. La dette est donc NOMMÉE, ouverte, au backlog — et
 * le type, lui, porte déjà les trois issues : le jour où le lecteur sait les
 * dire, il n'y a qu'un mot à changer ici.
 */
const DEPS_REELLES: DepsAccueilVoix = {
  clipUrl: accueilMarchandClipUrl,
  jouer: async (clipUrl) => {
    try { await playClip({ url: clipUrl }); return 'ended'; }
    catch { return 'failed'; }
  },
};

/**
 * Joue le clip exact de Tantie, et RAPPORTE ce qu'il en est advenu.
 *
 * CE SERVICE NE SYNTHÉTISE TOUJOURS RIEN — c'est la règle d'origine, et elle
 * tient : la voix de Tantie est une voix enregistrée, pas une voix de machine.
 * Ce qui change, c'est qu'il ne laisse plus l'appelant dans le noir. Avant, il
 * rendait `Promise<void>` : un clip joué et un clip absent étaient
 * indiscernables. L'écran d'accueil appelait donc les deux — le clip ET la clé
 * de catalogue — et là où le clip existe vraiment, la marchande entendait
 * Tantie deux fois, l'une sur l'autre.
 *
 * `doitDireLeTexte` porte la décision. Elle est prise ICI, une seule fois.
 */
export async function direAccueilMarchand(
  key: AccueilMarchandVoiceKey,
  deps: DepsAccueilVoix = DEPS_REELLES,
): Promise<ResultatVoixTata> {
  // `resolveLocalVoiceChoice` reste le seul juge de « y a-t-il un clip » —
  // c'est la règle du choix B, figée par VOICE-01, et on ne la réécrit pas.
  const choix = resolveLocalVoiceChoice(deps.clipUrl(key));
  if (choix.mode !== 'clip') return { lu: false, raison: 'aucun-clip', doitDireLeTexte: true };
  const r = await deps.jouer(choix.clipUrl);
  if (r === 'failed') return { lu: false, raison: 'clip-echoue', doitDireLeTexte: true };
  if (r === 'cancelled') return { lu: false, raison: 'coupe', doitDireLeTexte: false };
  return { lu: true, par: 'clip', doitDireLeTexte: false };
}
