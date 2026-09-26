import { playClip } from './audioManager';
import type { ResultatEntree, ResultatLecture } from './entreeVoixAvantConnexion';

export type EntreeVoiceKey =
  | 'numero'
  | 'numeroVoix'
  | 'code'
  | 'codeErreur'
  | 'connexionIndisponible'
  | 'reconnaissance'
  // ── LOT A, 26/09/2026 — voir `lotA` plus bas ────────────────────────────
  | 'pinImages'
  | 'pinChiffres'
  | 'effacement'
  | 'numeroIncomplet'
  | 'reconnaissanceEchouee'
  | 'tropDEssais'
  | 'microIndisponible'
  | 'codeVide'
  | 'serveurLent'
  | 'choixEnregistre'
  | 'choixConserve';

export interface EntreeVoiceClip {
  file: string;
  texte: string;
  /** Validé par une oreille ivoirienne. Ne se coche qu'après écoute humaine. */
  atteste: boolean;
  prototype?: boolean;
  /**
   * LOT A — VOIX DE SYNTHÈSE CONTRÔLÉE, PAS ENCORE ÉCOUTÉE.
   *
   * Pourquoi un troisième état plutôt que `atteste: true`. Ces clips ont passé
   * un contrôle MÉCANIQUE complet — nom, texte identique à ce que l'écran dit,
   * fréquence, canaux, niveau, silences (scripts/voix/ingerer-clips.mjs). Mais
   * personne ne les a ÉCOUTÉS. Les cocher `atteste` mettrait deux sens dans un
   * seul champ : « validé par une oreille » et « bon pour la production ». On
   * ne donne pas deux sens à la même donnée, surtout pas à celle qui décide de
   * ce qu'une marchande entend.
   *
   * Ils passent quand même en production : Patrick l'a tranché le 26/09, et
   * une phrase dite dans une voix contrôlée vaut mieux qu'une phrase muette.
   * Le jour où une oreille ivoirienne les valide, `atteste` passe à `true` et
   * ce champ disparaît.
   */
  lotA?: boolean;
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
  // ── PASSAGE CHIFFRES ⇄ IMAGES — LOT A, 26/09/2026 ────────────────────────
  //
  // LE DÉFAUT QU'ON FERME. `LoginPassword.basculerPinEnImages` annonce le
  // changement de mode par `parle(...)`, donc par `direEntreeTexte`, qui ne
  // connaît que les clés de ce fichier. La phrase n'y était pas : l'écran
  // annonçait le basculement EN SILENCE. Pas une panne — une clé jamais
  // ajoutée, et rien pour le signaler.
  //
  // ET LE TEXTE DIT MAINTENANT PLUS QU'AVANT. Le code disait « Maintenant,
  // des images à la place des chiffres. » ; le clip ajoute « Ton code n'a pas
  // changé. » C'est la question que se pose une marchande au moment précis où
  // son pavé change sous ses yeux. On ne remplace pas une consigne par une
  // plus pauvre — ici on la remplace par une plus complète.
  pinImages: {
    file: '/voix/tata/login-21.mp3',
    texte: 'Voilà les photos qui sont sorties à la place des chiffres. Ton code n\'a pas changé.',
    atteste: false,
    lotA: true,
  },
  pinChiffres: {
    file: '/voix/tata/login-22.mp3',
    texte: 'Voilà les chiffres maintenant. Mets ton code comme d\'habitude.',
    atteste: false,
    lotA: true,
  },

  // ── EFFACER UN CHIFFRE — AUTH_24, LOT A ──────────────────────────────────
  //
  // `handleKeyDelete` disait déjà `parle('Effacé.')` — mais ce texte n'était
  // dans aucune clé, donc il ne sortait pas. Un mot prononcé par personne.
  //
  // Le commentaire d'origine explique POURQUOI un seul mot : « Effacé » ne
  // révèle aucun chiffre, contrairement au numéro lui-même. Le clip respecte
  // cette règle — « C'est effacé net. » ne dit rien de ce qui a été tapé.
  effacement: {
    file: '/voix/tata/login-24.mp3',
    texte: 'C\'est effacé net.',
    atteste: false,
    lotA: true,
  },

  // ── IL MANQUE DES CHIFFRES — AUTH_11, LOT A ──────────────────────────────
  //
  // Ce que la dictée disait jusqu'ici quand le numéro était trop court :
  // « Je n'ai pas compris. Tape ton numéro, ou réessaie. » — vrai, mais
  // générique : elle ne sait pas CE QUI manque. L'écran, lui, l'écrivait
  // (« Il manque des chiffres… 👇 ») — donc l'information existait, et seule
  // la marchande qui lit y avait droit.
  //
  // C'est exactement le défaut que le projet poursuit partout : une
  // information qui existe, et que quelqu'un en aval ne transmet pas.
  //
  // Le clip la dit, et garde le geste : « Continue. »
  //
  // AUTH_12 (« Regarde bien, y'a un chiffre qui n'est pas bon dedans. ») N'EST
  // PAS branché, et c'est délibéré : il nomme mieux le défaut mais perd le
  // geste que la phrase actuelle donne (« Tape ton numéro, ou réessaie »).
  // On ne remplace pas une consigne par une plus pauvre. OUVERT.
  numeroIncomplet: {
    file: '/voix/tata/login-11.mp3',
    texte: 'Il manque encore des chiffres dedans. Continue.',
    atteste: false,
    lotA: true,
  },

  // ── TREIZE ERREURS, ZÉRO DITE — AUTH-ERR, 26/09/2026 ─────────────────────
  //
  // CE QU'ON A TROUVÉ. `LoginPassword` fait `parle(error)` sur CHAQUE message
  // d'erreur (l.317). Mais `parle` passe par `direEntreeTexte`, qui ne dit
  // que ce qui a une clé ici — et aucun des treize messages d'erreur de cet
  // écran n'en avait. L'écran vibrait, affichait un texte, et se taisait.
  //
  // À une marchande qui ne sait pas lire, sur l'écran QUI CONNECTE. Si elle
  // n'entre pas, rien d'autre dans l'application ne compte.
  //
  // POURQUOI ON ACCEPTE UN TEXTE LÉGÈREMENT DIFFÉRENT. La règle est « on ne
  // remplace jamais une consigne par une plus pauvre ». Elle tient toujours —
  // mais une consigne qu'on ne dit pas n'est pas une consigne. Ces deux-là
  // gardent le geste (« on passe par ton code », « patiente avant de
  // réessayer ») et perdent une nuance : la cause exacte pour l'une, la durée
  // pour l'autre. De muet à parlé, l'échange est largement gagnant.
  //
  // ONZE AUTRES RESTENT MUETS, faute de clip : « Numéro non reconnu »,
  // « Autorise le micro », « Entre ton mot de passe », « Réponse serveur
  // invalide »… OUVERT, et c'est le plus gros trou de voix du parcours.
  reconnaissanceEchouee: {
    file: '/voix/tata/login-26.mp3',
    texte: 'Ça n\'a pas pris. On passe par ton code directement.',
    atteste: false,
    lotA: true,
  },
  tropDEssais: {
    file: '/voix/tata/login-30.mp3',
    texte: 'Tu as trop forcé. Patiente un peu d\'abord avant de réessayer.',
    atteste: false,
    lotA: true,
  },

  // ── CINQ SILENCES DE PLUS, FERMÉS SANS RIEN ENREGISTRER ──────────────────
  //
  // Repérés en dépouillant les treize erreurs muettes (AUTH-ERR) : chacun de
  // ces moments a DÉJÀ un appel de parole au bon endroit dans l'écran. Il ne
  // manquait que la clé — la phrase partait, et rien ne sortait.
  //
  // Les cinq gardent le problème ET le geste. Aucun ne recule.
  microIndisponible: {
    file: '/voix/tata/login-16.mp3',
    texte: 'Le micro ne prend pas là. Faut taper ton numéro ici.',
    atteste: false,
    lotA: true,
  },
  codeVide: {
    file: '/voix/tata/login-19.mp3',
    texte: 'Bon, mets les quatre chiffres de ton code secret.',
    atteste: false,
    lotA: true,
  },
  serveurLent: {
    file: '/voix/tata/login-33.mp3',
    texte: 'Ça pèse un peu. Patiente, je suis en train de relancer.',
    atteste: false,
    lotA: true,
  },
  choixEnregistre: {
    file: '/voix/tata/login-35.mp3',
    texte: 'D\'accord, c\'est calé comme ça.',
    atteste: false,
    lotA: true,
  },
  choixConserve: {
    file: '/voix/tata/login-36.mp3',
    texte: 'D\'accord, on continue comme d\'habitude.',
    atteste: false,
    lotA: true,
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
  return clip.atteste || clip.lotA || (clip.prototype && actifs) ? clip.file : null;
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
