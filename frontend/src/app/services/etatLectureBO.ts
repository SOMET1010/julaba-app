/**
 * CE QUE LE BACK-OFFICE A LE DROIT D'AFFIRMER — BO-01.
 *
 * LE DÉFAUT, mesuré le 22/09 (docs/parcours/MESURE-BACKOFFICE.md) : 76 replis
 * qui fabriquent une liste vide, 158 qui fabriquent un zéro, 8 erreurs avalées
 * dans le seul `BackOfficeContext`, et 32 écrans sur 37 qui n'affichent JAMAIS
 * une erreur. Le tableau de bord porte le commentaire « KPIs - 100 % données
 * réelles » juste au-dessus de sept compteurs qui valent zéro quand rien n'a
 * été lu.
 *
 * C'est la faute fermée cinq fois de suite côté marchande — ACC-02, CAI-01,
 * HIS-01, DEP-02, STK-01 : une lecture ratée devient un chiffre affirmé.
 *
 * ICI ELLE EST PIRE, PARCE QU'UNE INSTITUTION DÉCIDE SUR CES CHIFFRES.
 * « 0 marchande active dans cette zone » ne veut pas dire la même chose selon
 * qu'on l'a comptée ou qu'on n'a pas pu la lire. Un programme se taille sur ce
 * genre de nombre.
 *
 * ── LES TROIS ÉTATS, ET IL N'Y EN A PAS QUATRE ────────────────────────────
 *
 *   attente        on n'a pas encore la réponse (jamais demandé, ou en cours)
 *   indisponible   on a demandé, ça a échoué — et on sait POURQUOI
 *   lue            on a la réponse, quelle qu'elle soit, ZÉRO COMPRIS
 *
 * Un zéro LU est une réponse et s'affiche. Un zéro FABRIQUÉ n'existe plus :
 * la fonction de mesure n'est appelée que sur l'état `lue`, et il n'y a aucun
 * chemin, dans ce module, qui produise un nombre depuis `attente` ou
 * `indisponible`. C'est la garantie qui tient tout le reste.
 *
 * ── CHAQUE SOURCE GARDE SON PROPRE ÉCHEC ──────────────────────────────────
 *
 * `BackOfficeContext` n'avait qu'UN champ `error` pour tout le back-office :
 * une panne sur les zones effaçait l'erreur des acteurs, et on ne pouvait même
 * pas dire à l'agent CE QUI manquait. Ici, chaque source porte le sien : une
 * lecture qui échoue n'a aucun effet sur celles qui ont réussi.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */

// ── 1. L'état d'une lecture ─────────────────────────────────────────────────

export type EtatLecture<T> =
  /** Rien n'est encore revenu. On n'a jamais demandé, ou on attend. */
  | { readonly type: 'attente' }
  /** On a demandé, ça a échoué. La raison est gardée : « indisponible » sans
   *  raison, c'est un autre silence. */
  | { readonly type: 'indisponible'; readonly raison: string }
  /** On a la réponse. Elle peut valoir zéro, et c'est une réponse. */
  | { readonly type: 'lue'; readonly valeur: T };

export const RAISON_PAR_DEFAUT = 'Lecture impossible';

/** Le texte d'une raison, quelle que soit la forme de ce qui a été attrapé. */
export function raisonDe(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message.trim();
  if (typeof cause === 'string' && cause.trim()) return cause.trim();
  return RAISON_PAR_DEFAUT;
}

export function enAttente<T>(): EtatLecture<T> {
  return { type: 'attente' };
}

export function indisponible<T>(cause: unknown): EtatLecture<T> {
  return { type: 'indisponible', raison: raisonDe(cause) };
}

export function lue<T>(valeur: T): EtatLecture<T> {
  return { type: 'lue', valeur };
}

// ── 2. Ce qu'un compteur affiche ────────────────────────────────────────────

export type AffichageKpi =
  /** On attend. L'écran le dit ; il n'affiche pas un nombre en attendant. */
  | { readonly type: 'chargement' }
  /** On ne sait pas, et on le DIT — avec la raison, pour l'agent qui doit agir. */
  | { readonly type: 'indisponible'; readonly raison: string }
  /** Le nombre, tel qu'il a été compté. Zéro inclus. */
  | { readonly type: 'nombre'; readonly valeur: number };

/**
 * UN COMPTEUR, DEPUIS UNE SEULE SOURCE.
 *
 * `mesure` n'est appelée QUE sur `lue` : c'est ce qui rend impossible de
 * produire un nombre à partir d'une lecture ratée. Un `mesure` qui rendrait
 * autre chose qu'un nombre fini (NaN sur une donnée abîmée) ne fabrique pas
 * un zéro non plus — il rend « indisponible », ce qui est la vérité.
 */
export function kpiDepuis<T>(etat: EtatLecture<T>, mesure: (valeur: T) => number): AffichageKpi {
  if (etat.type === 'attente') return { type: 'chargement' };
  if (etat.type === 'indisponible') return { type: 'indisponible', raison: etat.raison };
  const n = mesure(etat.valeur);
  if (!Number.isFinite(n)) return { type: 'indisponible', raison: 'Donnée illisible' };
  return { type: 'nombre', valeur: n };
}

export interface SourceKpi<T = any> {
  readonly etat: EtatLecture<T>;
  readonly mesure: (valeur: T) => number;
}

/**
 * UN COMPTEUR QUI A UNE SOURCE PRÉFÉRÉE ET UN SECOURS.
 *
 * Le tableau de bord le faisait déjà, à la main et sans le dire :
 * `stats?.total_acteurs ?? acteurs.length` — le serveur d'abord, le comptage
 * local ensuite. Ce qu'il ne savait pas faire, c'est le cas où AUCUNE des deux
 * n'a répondu : il affichait alors `0`.
 *
 * Les règles, dans l'ordre :
 *   1. la première source LUE gagne — l'ordre des arguments est la préférence ;
 *   2. sinon, si l'une attend encore, on attend (elle peut arriver) ;
 *   3. sinon, toutes ont échoué : indisponible, avec la première raison.
 */
export function kpiParmi(...toutes: ReadonlyArray<SourceKpi | null>): AffichageKpi {
  // `null` = source MUETTE : elle a répondu, mais elle ne porte pas ce
  // chiffre-là. Ce n'est ni une attente ni un échec — elle sort du calcul.
  // Sans cette distinction, des statistiques lues SANS `total_acteurs`
  // laisseraient le compteur en « chargement » pour toujours.
  const sources = toutes.filter((s): s is SourceKpi => s !== null);
  for (const s of sources) {
    if (s.etat.type === 'lue') {
      const rendu = kpiDepuis(s.etat, s.mesure);
      if (rendu.type === 'nombre') return rendu;
    }
  }
  if (sources.some(s => s.etat.type === 'attente')) return { type: 'chargement' };
  const echec = sources.find(s => s.etat.type === 'indisponible');
  if (echec && echec.etat.type === 'indisponible') {
    return { type: 'indisponible', raison: echec.etat.raison };
  }
  // Aucune source du tout : ce n'est pas zéro, c'est une absence de question.
  return { type: 'chargement' };
}

// ── 3. Les sept compteurs du tableau de bord ────────────────────────────────

/** Les formes minimales dont les compteurs ont besoin. On ne dépend pas des
 *  types complets de l'API : ce module reste pur et relisible seul. */
export interface ActeurCompte { readonly statut?: string }
export interface DossierCompte { readonly statut?: string }
export interface ZoneCompte { readonly actif?: boolean }
export interface TransactionCompte { readonly montant?: number }
export interface StatsBO {
  readonly total_acteurs?: number;
  readonly utilisateurs_actifs?: number;
  readonly montant_total?: number;
}

/** Ce que la liste des acteurs rapporte : les lignes ET le total serveur. */
export interface LectureActeurs {
  readonly liste: readonly ActeurCompte[];
  readonly total: number;
}
export interface LectureTransactions {
  readonly liste: readonly TransactionCompte[];
  readonly total: number;
}

export interface LecturesTableauDeBord {
  readonly stats: EtatLecture<StatsBO | null>;
  readonly acteurs: EtatLecture<LectureActeurs>;
  readonly dossiers: EtatLecture<readonly DossierCompte[]>;
  readonly zones: EtatLecture<readonly ZoneCompte[]>;
  readonly transactions: EtatLecture<LectureTransactions>;
}

export interface KpisTableauDeBord {
  readonly totalActeurs: AffichageKpi;
  readonly actifs: AffichageKpi;
  readonly volumeTotal: AffichageKpi;
  readonly suspendus: AffichageKpi;
  readonly enAttente: AffichageKpi;
  readonly transactions: AffichageKpi;
  readonly zonesActives: AffichageKpi;
  /** Le dénominateur de « zones actives sur N » — lui aussi peut manquer. */
  readonly zonesTotal: AffichageKpi;
}

/** Une source de stats n'est « lue » que si le serveur a donné CE champ-là :
 *  des stats lues sans `total_acteurs` ne comptent pas les acteurs. */
function champDesStats(
  etat: EtatLecture<StatsBO | null>,
  champ: keyof StatsBO,
): SourceKpi<StatsBO | null> | null {
  if (etat.type !== 'lue') return { etat, mesure: (s) => Number(s?.[champ]) };
  const valeur = etat.valeur?.[champ];
  // Lues MAIS sans ce champ : la source est muette sur ce chiffre. On la
  // retire du calcul plutôt que de la faire passer pour une attente, qui
  // bloquerait le compteur, ou pour un zéro, qui mentirait.
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return null;
  return { etat, mesure: (s) => Number(s?.[champ]) };
}

/**
 * LES SEPT COMPTEURS, CALCULÉS UNE FOIS, ICI.
 *
 * La logique métier ne change pas d'un chiffre : mêmes filtres, mêmes sommes,
 * même préférence pour les statistiques du serveur. Ce qui change, c'est qu'un
 * compteur sait maintenant dire « je n'ai pas pu lire » au lieu d'écrire zéro.
 */
export function kpisTableauDeBord(l: LecturesTableauDeBord): KpisTableauDeBord {
  const acteursListe: SourceKpi<LectureActeurs> = {
    etat: l.acteurs,
    mesure: (a: LectureActeurs) => a.total,
  };

  return {
    totalActeurs: kpiParmi(champDesStats(l.stats, 'total_acteurs'), acteursListe),

    actifs: kpiParmi(
      champDesStats(l.stats, 'utilisateurs_actifs'),
      { etat: l.acteurs, mesure: (a: LectureActeurs) => a.liste.filter(x => x.statut === 'actif').length } as SourceKpi<LectureActeurs>,
    ),

    volumeTotal: kpiParmi(
      champDesStats(l.stats, 'montant_total'),
      {
        etat: l.transactions,
        // `|| 0` ICI EST LÉGITIME et il est le seul du module : une ligne de
        // transaction sans montant vaut zéro DANS UNE SOMME. Ce n'est pas une
        // lecture ratée transformée en zéro — la lecture a réussi, c'est cette
        // ligne-là qui ne porte pas de montant.
        mesure: (t: LectureTransactions) =>
          t.liste.reduce((somme: number, x: TransactionCompte) => somme + (Number(x.montant) || 0), 0),
      } as SourceKpi<LectureTransactions>,
    ),

    suspendus: kpiDepuis(l.acteurs, (a) => a.liste.filter(x => x.statut === 'suspendu').length),
    enAttente: kpiDepuis(l.dossiers, (d) => d.filter(x => x.statut === 'en_attente').length),
    transactions: kpiDepuis(l.transactions, (t) => t.total),
    zonesActives: kpiDepuis(l.zones, (z) => z.filter(x => x.actif === true).length),
    zonesTotal: kpiDepuis(l.zones, (z) => z.length),
  };
}

// ── 4. Mettre un compteur en mots ───────────────────────────────────────────

export const MOT_CHARGEMENT = 'Lecture…';
export const MOT_INDISPONIBLE = 'Indisponible';

/**
 * Ce que la tuile affiche à la place du nombre. `null` quand il y a un nombre :
 * l'appelant passe alors par le compteur animé, comme avant.
 */
export function motDuKpi(kpi: AffichageKpi): string | null {
  if (kpi.type === 'nombre') return null;
  return kpi.type === 'chargement' ? MOT_CHARGEMENT : MOT_INDISPONIBLE;
}

/** Le nombre à animer, ou `undefined` s'il n'y en a pas. JAMAIS un repli. */
export function nombreDuKpi(kpi: AffichageKpi): number | undefined {
  return kpi.type === 'nombre' ? kpi.valeur : undefined;
}

/** L'explication proposée à l'agent — c'est là que la RAISON devient utile. */
export function explicationDuKpi(kpi: AffichageKpi): string | undefined {
  if (kpi.type === 'indisponible') {
    return `Ce chiffre n'a pas pu être lu : ${kpi.raison}. Ce n'est pas un zéro — la donnée n'est pas arrivée. Réessaie, ou vérifie la liaison avec le serveur.`;
  }
  if (kpi.type === 'chargement') return 'Lecture en cours. Le chiffre s’affichera dès que le serveur aura répondu.';
  return undefined;
}

/** Le sous-titre « sur N zones » — qui ne doit pas non plus inventer un N. */
export function sousTitreZones(zonesTotal: AffichageKpi): string {
  return zonesTotal.type === 'nombre'
    ? `sur ${zonesTotal.valeur} zones`
    : 'nombre de zones inconnu';
}
