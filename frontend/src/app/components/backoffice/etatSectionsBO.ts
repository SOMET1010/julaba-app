/**
 * CE QUE LE TABLEAU DE BORD A LE DROIT DE DESSINER — BO-03.
 *
 * BO-01 a fermé les SEPT COMPTEURS : un zéro lu s'affiche, un zéro fabriqué
 * n'existe plus. Il a nommé, en se fermant, la dette voisine qu'il ne prenait
 * pas : sur le MÊME écran, les **alertes**, les **graphiques** et les **barres
 * de progression** lisaient encore les listes du contexte — celles qui valent
 * `[]` quand la lecture a échoué.
 *
 * CE QUE ÇA DONNAIT À L'ÉCRAN, mesuré le 24/09 sur `BODashboard.tsx` :
 *
 *   • acteurs / dossiers / missions injoignables → `enAttente`, `suspendus` et
 *     `missionsEnCours` valaient 0, la liste d'alertes restait vide, et l'écran
 *     affichait « **Aucune alerte activée — Tout est en ordre. Aucune action
 *     urgente requise.** » C'est le mensonge le plus cher de l'écran : une
 *     panne totale se présentait comme une bonne nouvelle.
 *   • objectifs nationaux → `totalActeurs` valait 0, donc « Taux validation
 *     0 % », « Digitalisation 0 % », « Inclusion sociale 0 % », barres à zéro,
 *     face à des cibles de 95 %, 90 % et 75 %. Une institution taille un
 *     programme sur ce genre de barre.
 *   • graphiques → « Aucune donnée disponible », « Aucun acteur enregistré »,
 *     « Aucune donnée régionale disponible ». Trois phrases qui AFFIRMENT le
 *     vide alors que personne n'a rien pu lire.
 *
 * LA RÈGLE, LA MÊME QU'EN BO-01, ET IL N'Y EN A PAS DE SECONDE : le calcul
 * n'est appelé QUE lorsque toutes les sources de la section sont `lue`. Il
 * n'existe, dans ce module, aucun chemin qui produise un graphique, une barre
 * ou une alerte rassurante depuis `attente` ou `indisponible`.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */
import type { EtatLecture } from '../../services/etatLectureBO';

// ── 1. Ce qu'une section affiche ────────────────────────────────────────────

/**
 * Un état de source, vu d'ici. `EtatLecture` (`attente` / `indisponible` /
 * `lue`) et `AffichageKpi` (`chargement` / `indisponible` / `nombre`) de BO-01
 * ont deux vocabulaires pour les mêmes trois cas — une section peut dépendre
 * des deux. On lit donc le discriminant, sans redéfinir les types.
 */
export interface EtatSource {
  readonly type: string;
  readonly raison?: string;
}

export type AffichageSection<T> =
  /** On attend. La section le dit ; elle ne dessine pas un vide en attendant. */
  | { readonly type: 'chargement' }
  /** On ne sait pas, et on le DIT — avec la raison, pour l'agent qui doit agir. */
  | { readonly type: 'indisponible'; readonly raison: string }
  /** On a tout lu. Le contenu, y compris un vrai vide, qui est une réponse. */
  | { readonly type: 'donnees'; readonly valeur: T };

const ATTENTES = new Set(['attente', 'chargement']);

/**
 * UNE SECTION, DEPUIS PLUSIEURS SOURCES QU'IL FAUT TOUTES.
 *
 * `kpiParmi` de BO-01 combine des sources ALTERNATIVES : la première lue
 * gagne, c'est une préférence avec un secours. Ici c'est l'inverse — un
 * graphique « acteurs et transactions par mois » a besoin des DEUX. Les règles
 * ne peuvent donc pas être les mêmes, et elles ne le sont pas.
 *
 *   1. une source en échec → la section est indisponible, avec SA raison.
 *      L'ÉCHEC PRIME SUR L'ATTENTE, volontairement : afficher « lecture en
 *      cours » alors qu'on sait déjà qu'une source est tombée ferait patienter
 *      l'agent devant une panne connue.
 *   2. sinon, une source qui attend encore → on attend.
 *   3. sinon, tout est lu → et seulement là, on calcule.
 *
 * `calcul` n'est appelé QUE dans le cas 3. C'est la garantie qui tient le
 * reste : une liste repliée sur `[]` n'atteint jamais le dessin.
 */
export function sectionDe<T>(
  sources: ReadonlyArray<EtatSource>,
  calcul: () => T,
): AffichageSection<T> {
  const echec = sources.find(s => s.type === 'indisponible');
  if (echec) return { type: 'indisponible', raison: echec.raison ?? RAISON_SECTION_PAR_DEFAUT };
  if (sources.some(s => ATTENTES.has(s.type))) return { type: 'chargement' };
  return { type: 'donnees', valeur: calcul() };
}

export const RAISON_SECTION_PAR_DEFAUT = 'Lecture impossible';
export const MOT_SECTION_CHARGEMENT = 'Lecture en cours…';
export const MOT_SECTION_INDISPONIBLE = 'Pas encore lisible';

/** Ce que la section affiche à la place du contenu. `null` quand elle a tout
 *  lu : l'appelant dessine alors normalement. */
export function motDeSection(s: AffichageSection<unknown>): string | null {
  if (s.type === 'donnees') return null;
  return s.type === 'chargement' ? MOT_SECTION_CHARGEMENT : MOT_SECTION_INDISPONIBLE;
}

/** L'explication proposée à l'agent — c'est là que la RAISON devient utile. */
export function explicationDeSection(s: AffichageSection<unknown>): string | undefined {
  if (s.type === 'indisponible') {
    return `Cette partie n'a pas pu être lue : ${s.raison}. Ce n'est pas « rien à afficher » — la donnée n'est pas arrivée. Réessaie, ou vérifie la liaison avec le serveur.`;
  }
  if (s.type === 'chargement') return 'Lecture en cours. Le contenu s’affichera dès que le serveur aura répondu.';
  return undefined;
}

// ── 2. Les alertes ──────────────────────────────────────────────────────────

export type TonAlerte = 'critical' | 'warning' | 'info' | 'inconnu';

export interface AlerteBO {
  readonly id: number;
  readonly ton: TonAlerte;
  readonly titre: string;
  readonly desc: string;
  readonly temps: string;
  readonly region: string;
}

export interface LigneStatut { readonly statut?: string }
export interface LectureActeursAlertes { readonly liste: readonly LigneStatut[] }

export interface LecturesAlertes {
  readonly dossiers: EtatLecture<readonly LigneStatut[]>;
  readonly acteurs: EtatLecture<LectureActeursAlertes>;
  readonly missions: EtatLecture<readonly LigneStatut[]>;
}

/** La phrase rassurante, isolée pour que la garde puisse l'exiger absente. */
export const TITRE_RIEN_A_SIGNALER = 'Aucune alerte activée';
export const DESC_RIEN_A_SIGNALER = 'Tout est en ordre. Aucune action urgente requise.';

const s_ = (n: number) => (n > 1 ? 's' : '');

/**
 * LES ALERTES — LA SEULE SECTION QUI TOLÈRE UNE LECTURE PARTIELLE.
 *
 * Un graphique incomplet ne se dessine pas. Une alerte, si : si les dossiers
 * sont lus et les missions non, les dossiers en attente restent une alerte
 * vraie, et il serait absurde de la cacher. La règle est donc plus fine, et
 * c'est la seule de ce module à l'être :
 *
 *   • une source `lue` produit ses alertes, comme avant ;
 *   • une source NON lue produit UNE alerte qui dit qu'on ne l'a pas lue, avec
 *     sa raison — le silence devient visible au lieu de disparaître ;
 *   • LA PHRASE RASSURANTE n'est produite QUE si les TROIS ont été lues et
 *     qu'aucune n'a rien à signaler. C'est le cœur de BO-03 : « Tout est en
 *     ordre » est une AFFIRMATION, et on ne l'affirme que si on l'a vérifiée.
 */
export function alertesBO(l: LecturesAlertes): readonly AlerteBO[] {
  const liste: AlerteBO[] = [];

  if (l.dossiers.type === 'lue') {
    const n = l.dossiers.valeur.filter(d => d.statut === 'en_attente').length;
    if (n > 0) liste.push({
      id: 1, ton: 'warning',
      titre: `${n} dossier${s_(n)} en attente`,
      desc: `${n} dossier${s_(n)} sans traitement`,
      temps: 'maintenant', region: 'National',
    });
  }

  if (l.acteurs.type === 'lue') {
    const n = l.acteurs.valeur.liste.filter(a => a.statut === 'suspendu').length;
    if (n > 0) liste.push({
      id: 2, ton: 'critical',
      titre: `${n} acteur${s_(n)} suspendu${s_(n)}`,
      desc: `${n} compte${s_(n)} actuellement suspendu${s_(n)}`,
      temps: 'maintenant', region: 'National',
    });
  }

  if (l.missions.type === 'lue') {
    const n = l.missions.valeur.filter(m => m.statut === 'en_cours').length;
    if (n > 0) liste.push({
      id: 4, ton: 'info',
      titre: `${n} mission${s_(n)} active${s_(n)}`,
      desc: `${n} mission${s_(n)} en cours sur le terrain`,
      temps: 'maintenant', region: 'National',
    });
  }

  // CE QU'ON N'A PAS PU LIRE SE DIT. Avant, ces trois cas ne produisaient
  // simplement rien — et « rien » se lisait « rien à signaler ».
  const aSurveiller: ReadonlyArray<readonly [number, string, EtatLecture<unknown>]> = [
    [101, 'Dossiers', l.dossiers],
    [102, 'Acteurs', l.acteurs],
    [104, 'Missions', l.missions],
  ];
  for (const [id, nom, etat] of aSurveiller) {
    if (etat.type === 'indisponible') {
      liste.push({
        id, ton: 'inconnu',
        titre: `${nom} : lecture impossible`,
        desc: `${etat.raison}. Ce n'est pas « rien à signaler » : on n'a pas pu regarder.`,
        temps: 'maintenant', region: 'National',
      });
    } else if (etat.type === 'attente') {
      liste.push({
        id, ton: 'inconnu',
        titre: `${nom} : lecture en cours`,
        desc: 'On n’a pas encore la réponse du serveur pour cette source.',
        temps: 'maintenant', region: 'National',
      });
    }
  }

  const toutLu = l.dossiers.type === 'lue' && l.acteurs.type === 'lue' && l.missions.type === 'lue';
  if (toutLu && liste.length === 0) {
    liste.push({
      id: 0, ton: 'info',
      titre: TITRE_RIEN_A_SIGNALER,
      desc: DESC_RIEN_A_SIGNALER,
      temps: 'maintenant', region: 'National',
    });
  }
  return liste;
}

/** Le compte « N urgentes » du bandeau — il ne compte que ce qui a été LU.
 *  Une source illisible n'est pas une urgence, et n'est pas une accalmie. */
export function urgentes(alertes: readonly AlerteBO[]): number {
  return alertes.filter(a => a.ton === 'critical' || a.ton === 'warning').length;
}

// ── 3. Les barres de progression : les objectifs nationaux ──────────────────

export interface ObjectifBO {
  readonly label: string;
  readonly current: number;
  readonly target: number;
  readonly suffix?: string;
  readonly estimation: boolean;
}

export interface ActeurObjectif {
  readonly statut?: string;
  readonly genre?: string;
  readonly photoUrl?: unknown;
}

/**
 * LES QUATRE BARRES. Trois des quatre sont des POURCENTAGES d'un total : sans
 * le total, elles n'existent pas. L'écran écrivait `totalActeurs > 0 ? … : 0`
 * — une lecture ratée donnait 0, et 0 % se dessine comme un échec de terrain,
 * pas comme une absence de mesure.
 *
 * `totalActeurs` et `actifs` arrivent ici sous leur forme BO-01
 * (`AffichageKpi`) : s'ils ne sont pas des NOMBRES, il n'y a pas de barres.
 */
export function objectifsBO(
  kpiTotalActeurs: EtatSource & { readonly valeur?: number },
  kpiActifs: EtatSource & { readonly valeur?: number },
  lectureActeurs: EtatLecture<{ readonly liste: readonly ActeurObjectif[] }>,
): AffichageSection<readonly ObjectifBO[]> {
  const garde = sectionDe([kpiTotalActeurs, kpiActifs, lectureActeurs], () => null);
  if (garde.type !== 'donnees') return garde;

  // AUCUN TRANSTYPAGE ICI, ET C'EST VOLONTAIRE. Une première version écrivait
  // `kpiTotalActeurs.valeur as number` en s'appuyant sur `sectionDe` — « les
  // trois sont lues, donc les valeurs sont là ». Un contre-essai l'a démentie :
  // retirer une source de la liste ci-dessus ne rendait pas la garde rouge, il
  // faisait PLANTER le calcul sur un `.valeur` absent. Un écran qui plante est
  // un écran qui ne dit rien. On revérifie donc, et s'il manque quoi que ce
  // soit on le DIT au lieu de fabriquer — ou de tomber.
  const total = kpiTotalActeurs.valeur;
  const actifs = kpiActifs.valeur;
  if (lectureActeurs.type !== 'lue' || typeof total !== 'number' || typeof actifs !== 'number') {
    return { type: 'indisponible', raison: RAISON_SECTION_PAR_DEFAUT };
  }
  const liste = lectureActeurs.valeur.liste;

  // `total === 0` est un VRAI zéro, lu : un pourcentage n'a alors pas de sens,
  // et 0 % est la façon honnête de le dire — on l'a compté.
  const pourcent = (part: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
  const avecPhoto = liste.filter(a => a.photoUrl && String(a.photoUrl).trim() !== '').length;
  const femmesActives = liste.filter(a => a.genre === 'femme' && a.statut === 'actif').length;

  return {
    type: 'donnees',
    valeur: [
      { label: 'Acteurs enrôlés', current: total, target: 15000, estimation: false },
      { label: 'Digitalisation', current: pourcent(avecPhoto), target: 90, suffix: '%', estimation: true },
      { label: 'Taux validation', current: pourcent(actifs), target: 95, suffix: '%', estimation: false },
      { label: 'Inclusion sociale', current: pourcent(femmesActives), target: 75, suffix: '%', estimation: true },
    ],
  };
}

/** Le pourcentage dessiné par la barre. Séparé pour être lisible seul : il
 *  borne à 100 comme avant, et ne reçoit jamais qu'un objectif CALCULÉ. */
export function pourcentageBarre(obj: ObjectifBO): number {
  const brut = obj.suffix ? obj.current : (obj.current / obj.target) * 100;
  return Math.min(Math.round(brut), 100);
}
