/**
 * CE QUE LE MICRO DE LA CAISSE A LE DROIT DE FAIRE, ET D'AFFICHER — VOX-01.
 *
 * LE DÉFAUT, vu sur le téléphone de Patrick. La bulle affichait :
 *
 *   « J'ai compris : En outre. Est-ce que j'ai pas supprimé ça ? Il m'a semblé
 *     que j'ai aimé ça pour dire un stop mais sauf que nous parlant ajoute dix
 *     piments à cinq cents et par d'autre »
 *
 * Six lignes de transcription brute, sous un « J'ai compris » — alors que rien
 * n'avait été compris, et qu'aucune vente n'était partie. Ses mots : « cette
 * interface de vente vocale est complètement ingérable ».
 *
 * TROIS FAUTES, UNE SEULE FAMILLE.
 *
 *   1. LE MICRO NE SAIT PAS QUAND ELLE A FINI. `useVoiceCore` est lancé avec
 *      `maxRecordingSeconds: 60` et rien d'autre : il accumule une minute de
 *      tout ce qui passe. L'écran du NUMÉRO, lui, a un « minuteur d'apaisement »
 *      pour la fin de phrase — l'écran qui saisit un téléphone a été soigné,
 *      celui qui manipule l'argent n'avait rien.
 *
 *   2. « J'AI COMPRIS » ÉTAIT UN MENSONGE. Le moteur avait TRANSCRIT, pas
 *      compris. C'est la même faute que « 0 F » quand on n'a rien lu, et que
 *      « Aucun produit » quand on n'a pas pu demander : une phrase qui a deux
 *      sens. Ici, « compris » voulait dire « entendu ».
 *
 *   3. L'ÉCRAN MONTRAIT LA SORTIE BRUTE DE LA MACHINE. Pour une marchande qui
 *      ne lit pas, un paragraphe est du bruit. Pour celle qui lit, c'est la
 *      preuve que ça ne marche pas. Ce texte est du DÉBOGAGE ; il n'a jamais
 *      été de l'interface.
 *
 * CE MODULE EST PUR. Il ne touche ni au DOM, ni au micro, ni à l'argent : il
 * répond à deux questions, et il est relisible seul.
 */

// ── 1. QUAND CESSER D'ÉCOUTER ──────────────────────────────────────────────

/** Le silence qui clôt une phrase. Assez long pour qu'elle hésite, assez court
 *  pour qu'elle n'ait pas à y penser. */
export const SILENCE_FIN_MS = 1500;

/** Le plafond dur. Une vente au marché se dit en quelques secondes : au-delà,
 *  ce n'est plus une phrase, c'est une conversation — et ce n'est pas à nous. */
export const ECOUTE_MAX_MS = 12000;

/** Le temps qu'on lui laisse AVANT qu'elle commence. Elle touche, elle réfléchit,
 *  elle regarde son étal. Couper là serait couper avant le premier mot. */
export const AVANT_PREMIER_MOT_MS = 6000;

export interface FaitsEcoute {
  /** Le micro est-il ouvert ? */
  readonly ecoute: boolean;
  /** Depuis combien de temps le texte entendu n'a plus bougé. */
  readonly msDepuisDernierMot: number;
  /** Depuis combien de temps le micro est ouvert. */
  readonly msDepuisOuverture: number;
  /** A-t-elle dit quelque chose, ne serait-ce qu'un mot ? */
  readonly aParle: boolean;
}

export type FinDEcoute =
  | { readonly cesser: false }
  /** Elle a fini sa phrase : le silence l'a dit mieux qu'un bouton. */
  | { readonly cesser: true; readonly raison: 'silence' }
  /** Le plafond. On coupe, et on le DIT — un micro qui s'arrête sans raison
   *  ressemble à une panne. */
  | { readonly cesser: true; readonly raison: 'trop-long' }
  /** Elle n'a rien dit du tout. Ce n'est pas un échec, c'est un renoncement. */
  | { readonly cesser: true; readonly raison: 'rien-dit' };

export function finDEcoute(faits: FaitsEcoute): FinDEcoute {
  if (!faits.ecoute) return { cesser: false };

  // Le plafond dur prime : même si elle parle encore, une minute de micro
  // ouvert ne produit pas une vente, elle produit le paragraphe de Patrick.
  if (faits.msDepuisOuverture >= ECOUTE_MAX_MS) return { cesser: true, raison: 'trop-long' };

  if (!faits.aParle) {
    return faits.msDepuisOuverture >= AVANT_PREMIER_MOT_MS
      ? { cesser: true, raison: 'rien-dit' }
      : { cesser: false };
  }

  return faits.msDepuisDernierMot >= SILENCE_FIN_MS
    ? { cesser: true, raison: 'silence' }
    : { cesser: false };
}

// ── 2. CE QUE LA BULLE A LE DROIT D'AFFICHER ───────────────────────────────

export interface FaitsAffichage {
  /** Le micro est-il ouvert ? */
  readonly ecoute: boolean;
  /** La transcription BRUTE. Elle entre ici et n'en ressort JAMAIS : c'est
   *  tout l'objet de ce module, et un test le vérifie sur des cas réels. */
  readonly transcription: string;
  /** Ce que le moteur a réellement EXTRAIT, déjà mis en mots par l'appelant
   *  (« 3 piments à 500 F »). `null` = il n'a rien tiré de la phrase. */
  readonly compris: string | null;
  /**
   * CAI-07 — UN AUTRE ÉCRAN PORTE-T-IL DÉJÀ LA PAROLE ?
   *
   * Vrai quand la saisie guidée est ouverte. Ce fait est REQUIS, pas
   * optionnel : un appelant qui l'oublierait retomberait en silence sur
   * l'ancien comportement, et c'est exactement comme ça que le défaut a
   * vécu. Chaque écran doit RÉPONDRE à la question, pas la laisser deviner.
   */
  readonly saisieOuverte: boolean;
}

export type AfficheEcoute =
  /** Rien à dire. La bulle invite, comme au repos. */
  | { readonly type: 'repos' }
  /** Le micro est ouvert. On montre qu'on écoute — PAS ce qu'on entend. */
  | { readonly type: 'ecoute' }
  /** Une vente a été extraite. C'est la SEULE situation où « J'ai compris »
   *  est vrai, et ce qui s'affiche est la vente, jamais la phrase. */
  | { readonly type: 'compris'; readonly libelle: string }
  /** Elle a parlé, le moteur n'a rien tiré. On le dit, et on ne lui renvoie
   *  pas ses propres mots à la figure. */
  | { readonly type: 'incompris' };

export function afficheEcoute(faits: FaitsAffichage): AfficheEcoute {
  // PENDANT L'ÉCOUTE, AUCUN TEXTE. La transcription en direct était un retour
  // honnête pour un ingénieur et un mur de mots pour une marchande. Le micro
  // qui bat et la bulle « Je t'écoute » disent déjà qu'on l'entend.
  if (faits.ecoute) return { type: 'ecoute' };

  // CAI-07 — UN SEUL « J'AI COMPRIS » À LA FOIS. Arbitrage de Patrick, 23/09.
  //
  // Le bandeau du micro est TRANSITOIRE : il dit « j'ai extrait une vente de
  // ta phrase ». La saisie guidée, elle, mène à `ConfirmationLigne`, qui dit
  // « voici ce que je vais enregistrer, confirme » — la même formule, mais
  // qui engage l'argent. Les deux ont cohabité à l'écran, et le premier
  // contredisait le second à l'instant où elle décide.
  //
  // C'EST UN RETRAIT, PAS UN RENOMMAGE. On n'a pas changé les mots de l'un
  // pour qu'ils cessent de ressembler à ceux de l'autre : la formule est
  // juste dans les deux cas. Ce qui était faux, c'est qu'elle soit là deux
  // fois.
  //
  // ET SÛREMENT PAS « INCOMPRIS ». Le repli naturel serait de laisser la
  // suite retomber sur « Je n'ai pas compris » puisque la transcription n'est
  // pas vide. Ce serait remplacer un doublon par un MENSONGE : elle avait
  // compris, et c'est même pour ça que la saisie s'est ouverte. Repos.
  if (faits.saisieOuverte) return { type: 'repos' };

  const compris = (faits.compris ?? '').trim();
  if (compris) return { type: 'compris', libelle: compris };

  return faits.transcription.trim() ? { type: 'incompris' } : { type: 'repos' };
}

// ── 3. METTRE EN MOTS CE QUE LE MOTEUR A EXTRAIT ───────────────────────────

/** La forme minimale d'une action de vente, telle que `intentLocalCaisse` la
 *  rend. On ne dépend pas de son type complet : ce module reste pur. */
export interface ActionVenteComprise {
  readonly type?: string;
  readonly produit?: unknown;
  readonly quantite?: unknown;
  readonly montant?: unknown;
}

/**
 * Ce qui s'affiche après « J'ai compris ». JAMAIS la phrase entendue : la
 * VENTE, dans les mots de la marchande — « 3 piments à 500 F ».
 *
 * `null` quand il n'y a rien à annoncer, et c'est le cas le plus important :
 * c'est lui qui distingue « compris » de « entendu ».
 *
 * POURQUOI ICI ET PAS DANS L'ÉCRAN. `caisseMicroPermanent` interdit le
 * littéral `return null` dans `MicroVenteCaisse.tsx` — le micro ne doit jamais
 * se retirer de lui-même, et le garde-fou le vérifie sur le fichier entier.
 * La règle est de toute façon PURE : sa place est ici, où elle se teste seule.
 */
export function libelleVenteComprise(action: ActionVenteComprise | null | undefined): string | null {
  if (!action || action.type !== 'vendre') return null;
  const nom = String(action.produit ?? '').trim();
  if (!nom) return null;
  const qte = Number(action.quantite);
  const quantite = Number.isFinite(qte) && qte > 0 ? Math.trunc(qte) : 1;
  const montant = Number(action.montant);
  // Sans prix, on annonce ce qu'on a — et rien de plus. Inventer un « 0 F »
  // ici serait exactement la faute qu'on ferme partout ailleurs.
  return Number.isFinite(montant) && montant > 0
    ? `${quantite} ${nom} à ${Math.round(montant).toLocaleString('fr-FR')} F`
    : `${quantite} ${nom}`;
}
