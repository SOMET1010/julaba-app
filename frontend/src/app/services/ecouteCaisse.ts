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
import { plurielNom } from './accordFrancais';

// ── 1. QUAND CESSER D'ÉCOUTER ──────────────────────────────────────────────

/**
 * Le silence qui clôt une phrase. Assez long pour qu'elle hésite, assez court
 * pour qu'elle n'ait pas à y penser.
 *
 * MIC-02A — 1 500 ms COUPAIT LA PHRASE EN DEUX. Arbitrage de Patrick,
 * 02/10/2026, sur mesure du banc OSS-02 (`spike/oss-02-vad/EXPERIENCE-2.md`) :
 * une marchande qui hésite deux secondes — elle regarde son étal, elle cherche
 * son prix, elle reprend — voyait le micro se fermer à 4,26 s alors qu'elle
 * parlait encore jusqu'à 5,50 s. Sa phrase partait en deux morceaux, et une
 * demi-phrase sur une vente, c'est un montant faux ou une vente perdue.
 *
 * LE COÛT EST MESURÉ ET IL EST PETIT : +0,51 s d'attente après une phrase
 * normale (2,27 s → 2,78 s). Et il faut connaître ce second chiffre : l'attente
 * RESSENTIE n'est pas le réglage. La queue de voix — souffle, réverbération —
 * maintient le niveau au-dessus du seuil ~0,8 s après la dernière syllabe. Donc
 * 2 200 ms se vivent comme 2,8 s. C'est ce chiffre-là qui a été arbitré.
 *
 * `AVANT_PREMIER_MOT_MS` et `ECOUTE_MAX_MS` ne bougent pas :
 * 6 s pour commencer → 2,2 s pour hésiter → 12 s au plafond.
 */
export const SILENCE_FIN_MS = 2200;

/** Le plafond dur. Une vente au marché se dit en quelques secondes : au-delà,
 *  ce n'est plus une phrase, c'est une conversation — et ce n'est pas à nous. */
export const ECOUTE_MAX_MS = 12000;

/** Le temps qu'on lui laisse AVANT qu'elle commence. Elle touche, elle réfléchit,
 *  elle regarde son étal. Couper là serait couper avant le premier mot. */
export const AVANT_PREMIER_MOT_MS = 6000;

/**
 * MIC-01 — CE QUI PROUVE QU'ELLE PARLE : LE SON, PAS LE TEXTE.
 *
 * LE DÉFAUT TERRAIN, APK 0459dc0. L'écran alimentait `aParle` avec
 * `liveTranscript` — or `useVoiceCore` ne l'écrit JAMAIS pendant l'écoute :
 * la chaîne est MediaRecorder → blob → sherpa, il n'y a pas de transcription
 * en direct, et `startSilenceDetection` y est un no-op assumé
 * (« push-to-talk uniquement »). `aParle` valait donc TOUJOURS faux, et
 * `finDEcoute` fermait le micro à 6 000 ms avec la raison « elle n'a rien
 * dit » — pendant qu'elle parlait. La fin de phrase à 1,5 s et le plafond à
 * 12 s étaient inatteignables.
 *
 * VOX-01 ne faisait donc pas ce qu'il annonce (« le micro s'arrête quand
 * elle s'arrête ») : il s'arrêtait au bout de six secondes, quoi qu'elle dise.
 *
 * LA RÈGLE N'A PAS CHANGÉ D'UN IOTA — c'est sa SOURCE qui était fausse. Le
 * niveau du micro, lui, est vivant en direct (`useVoiceCore.volume`,
 * rafraîchi à chaque image). C'est lui qui dit qu'une voix porte.
 */

/** Le niveau (0-100) au-dessus duquel on considère qu'une voix porte, QUAND on
 *  n'a pas pu mesurer le fond. Au-dessus du bruit d'une pièce calme, sous une
 *  parole normale. C'est le repli de `seuilDeParole`, plus son défaut. */
export const NIVEAU_PAROLE = 12;

/**
 * MIC-02B — LE SEUIL S'ADAPTE AU FOND, PARCE QU'UN MARCHÉ N'EST PAS UNE PIÈCE.
 *
 * `NIVEAU_PAROLE = 12` était un seuil FIXE, et le banc OSS-02 a mesuré ce qu'il
 * coûte sous un bruit continu (`spike/oss-02-vad/EXPERIENCE-2.md`) :
 *   · sur du bruit SEUL, il déclarait qu'elle parlait dès 0,00 s — un FAUX
 *     POSITIF : le micro restait ouvert sur rien, puis se fermait pour
 *     « silence », et la marchande recevait une réponse à une phrase qu'elle
 *     n'avait pas dite ;
 *   · sous du bruit AVEC parole, il ouvrait à 0,03 s au lieu de 1,34 s — le
 *     début capté n'était pas de la voix.
 * Au marché, ce n'est pas un cas limite : c'est la journée entière.
 *
 * LA RÈGLE : on écoute le fond avant d'écouter la voix. Le seuil devient
 * `plancher + MARGE_VOIX`. En pièce calme le plancher est proche de zéro et le
 * seuil tombe SOUS 12 — c'est ce qui rattrape une voix faible. Au marché il
 * monte avec le fond — c'est ce qui supprime le faux positif.
 *
 * MESURÉ SUR LES 8 CAS DU BANC, MÊME VÉRITÉ TERRAIN : défauts cumulés 5,34 →
 * 2,98. Le faux positif disparaît. Régressions : latence de fin +0,2 s sur deux
 * cas, départ −0,03 s sur un autre.
 *
 * CE QUI RESTE IMPARFAIT, et il faut le savoir : sous bruit + parole, le départ
 * passe à 0,42 s au lieu de 1,34. On capte encore ~0,9 s de fond avant la voix.
 * Sherpa VAD fait mieux (1,48 s) et reste candidat post-pilote — mais ce bruit
 * entre dans la transcription, il ne fabrique pas de montant.
 */

/** Ce qu'une voix doit dépasser le fond pour compter comme une voix. */
export const MARGE_VOIX = 6;

/** La durée pendant laquelle on écoute le FOND, au tout début, avant d'écouter
 *  la voix. C'est le temps qu'elle met à approcher le micro de sa bouche. */
export const ECOUTE_PLANCHER_MS = 400;

/**
 * Le plancher de bruit, à partir des niveaux relevés pendant
 * `ECOUTE_PLANCHER_MS`. MÉDIANE, et pas moyenne : un claquement de cageot, un
 * raclement de gorge, et une moyenne porterait le plancher — donc le seuil —
 * pour toute la phrase. La médiane ne bouge pas pour un échantillon isolé.
 *
 * Rend `null` quand il n'y a rien à mesurer : l'appelant retombe alors sur
 * `NIVEAU_PAROLE`, et le comportement est exactement celui d'avant ce lot.
 */
export function plancherDeBruit(niveaux: readonly number[]): number | null {
  const valides = niveaux.filter((n) => Number.isFinite(n) && n >= 0);
  if (valides.length === 0) return null;
  const tries = [...valides].sort((a, b) => a - b);
  return tries[Math.floor(tries.length / 2)];
}

/**
 * Le seuil à retenir pour toute la durée d'une écoute.
 *
 * IL EST CALCULÉ UNE FOIS ET FIGÉ — contrainte de Patrick, 02/10/2026, et elle
 * est juste : un seuil recalculé en continu monterait avec la voix de la
 * marchande elle-même. Plus elle parle fort, plus le seuil grimpe, et il finit
 * par passer AU-DESSUS d'elle : le micro se fermerait au milieu de sa phrase,
 * d'autant plus vite qu'elle parle. Un capteur ne se règle pas sur ce qu'il est
 * en train de mesurer.
 */
export function seuilDeParole(plancher: number | null): number {
  if (plancher === null || !Number.isFinite(plancher)) return NIVEAU_PAROLE;
  return Math.max(0, plancher) + MARGE_VOIX;
}

/** Vrai quand le micro entend une voix, à cet instant. Le seuil est celui de
 *  l'écoute en cours ; sans seuil, c'est `NIVEAU_PAROLE`, comme avant. */
export function parleMaintenant(niveau: number, seuil: number = NIVEAU_PAROLE): boolean {
  return Number.isFinite(niveau) && niveau >= seuil;
}

export interface FaitsEcoute {
  /** Le micro est-il ouvert ? */
  readonly ecoute: boolean;
  /**
   * Depuis combien de temps on n'entend plus de voix (MIC-01 : mesuré sur le
   * NIVEAU du micro, pas sur un texte qui n'arrive qu'à la fin).
   */
  readonly msDepuisDernierMot: number;
  /** Depuis combien de temps le micro est ouvert. */
  readonly msDepuisOuverture: number;
  /** A-t-elle émis un son de voix, ne serait-ce qu'une fois ? */
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
  /**
   * ENC-01 — LE MOTEUR A-T-IL TIRÉ *QUELQUE CHOSE* DE LA PHRASE ?
   *
   * `compris` ne parle que des VENTES. Tout le reste — les quatre commandes
   * d'encaissement (« encaisser », « combien elle doit », « oui valide »,
   * « non annule »), une dépense — donnait `compris = null` avec une
   * transcription non vide, et retombait donc sur « Je n'ai pas compris ».
   *
   * LE DÉFAUT TERRAIN, APK 0459dc0, deux captures de Patrick. Panier à
   * 5 000 F, l'écran promet « Dis "encaisser" pour terminer », il le dit, et
   * le bandeau répond « Je n'ai pas compris. Redis-moi. » — pendant que
   * `intentLocal` rendait `{ type: 'encaisser' }` et que la machine
   * d'encaissement entrait en préparation avec « Elle doit 5 000 francs.
   * Touche les billets qu'elle te donne. » L'écran démentait le moteur.
   *
   * C'EST LA FAUTE VOX-01 RETOURNÉE. Là-bas, « J'ai compris » voulait dire
   * « j'ai entendu ». Ici, « Je n'ai pas compris » voulait dire « ce n'était
   * pas une vente ». Ne jamais donner deux sens à la même donnée.
   *
   * REQUIS, comme `saisieOuverte`, et pour la même raison : un appelant qui
   * l'oublierait retomberait en silence sur l'ancien comportement.
   */
  readonly intentionComprise: boolean;
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

  // ENC-01 — COMPRISE, MAIS PAS PAR CE BANDEAU. C'est exactement le
  // raisonnement de CAI-07 six lignes plus haut, appliqué à l'autre cas : la
  // phrase A été comprise, une AUTRE surface y répond (la relecture
  // financière de `POSCaisse` pour l'encaissement, la confirmation parlée
  // pour la dépense), et le bandeau du micro se retire.
  //
  // REPOS, ET SÛREMENT PAS UN SECOND « J'AI COMPRIS ». Le repli tentant
  // serait d'afficher ici « J'ai compris : encaisser ». Ce serait rouvrir
  // CAI-07 : deux « J'ai compris » à l'écran au même instant, dont l'un
  // (la relecture) engage l'argent. Un seul, et c'est celui qui engage.
  if (faits.intentionComprise) return { type: 'repos' };

  return faits.transcription.trim() ? { type: 'incompris' } : { type: 'repos' };
}

// ── 3. METTRE EN MOTS CE QUE LE MOTEUR A EXTRAIT ───────────────────────────
//
// `accordFrancais` n'importe rien : ce module reste PUR en s'en servant. Il
// était impossible de partager la règle d'accord tant qu'elle vivait dans
// `dialoguesTata`, qui tire le catalogue i18n — d'où « 2 piments » à la voix
// et « 2 piment » à l'écran, sur la même vente (VOIX-07).

/** La forme minimale d'une action de vente, telle que `intentLocalCaisse` la
 *  rend. On ne dépend pas de son type complet : ce module reste pur. */
export interface ActionVenteComprise {
  readonly type?: string;
  readonly produit?: unknown;
  readonly quantite?: unknown;
  readonly montant?: unknown;
  /** VOIX-07 — l'unité telle qu'elle l'a DITE (« tas », « sacs », « kilos »).
   *  Le type ne l'avait pas : c'est là que l'information mourait. */
  readonly unite?: unknown;
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
  /**
   * L'UNITÉ FAIT PARTIE DE LA VENTE — VOIX-07.
   *
   * Cet aperçu affichait « 2 piment » pendant qu'elle disait « 2 tas de
   * piments », et le toast d'après affichait « 2 tas de piments ». Deux
   * libellés pour la même vente, sur le même écran.
   *
   * On reprend SON mot, sans le ré-accorder : `uniteParlee` arrive déjà tel
   * qu'elle l'a prononcé (« sac » / « sacs », « tas » invariable).
   *
   * DETTE QUI RESTE OUVERTE, et qu'on ne prétend pas fermer ici : ce libellé
   * se compose en dur, pas par le catalogue i18n, parce que ce module est PUR
   * et n'importe rien. Il ne traversera donc pas les langues, contrairement à
   * `resumeQuantite` qui passe par `TATA_QUANTITE_UNITE_PRODUIT`. La
   * divergence est antérieure à ce lot ; elle est nommée, pas close.
   */
  const unite = String(action.unite ?? '').trim();
  // Avec unité, c'est l'UNITÉ qui porte le nombre et le produit reste au
  // singulier (« 2 tas de piment ») — même règle que `resumeQuantite`.
  const bloc = unite
    ? `${quantite} ${unite} de ${nom}`
    : `${quantite} ${quantite > 1 ? plurielNom(nom) : nom}`;
  // Sans prix, on annonce ce qu'on a — et rien de plus. Inventer un « 0 F »
  // ici serait exactement la faute qu'on ferme partout ailleurs.
  return Number.isFinite(montant) && montant > 0
    ? `${bloc} à ${Math.round(montant).toLocaleString('fr-FR')} F`
    : bloc;
}
