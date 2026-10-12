/**
 * CE QUE L'ACCUEIL INSTITUTION A LE DROIT D'AFFIRMER — démo 12/10/2026.
 *
 * LES DÉFAUTS CONSTATÉS, sur une stack locale :
 *   · « undefined undefined » à la place du nom : le profil institution
 *     composait `${user.firstName} ${user.lastName}`, deux champs que
 *     `UserContext` ne remplit pas (il remplit `prenoms` / `nom`) ;
 *   · « 03 Mar 2026 » écrit en dur au-dessus du résumé du jour ;
 *   · une courbe d'évolution INVENTÉE (`DATA_EVOLUTION`, 5 200 → 9 287
 *     transactions, 2,1 → 4,86 « Mds » / « M » FCFA) affichée à côté de
 *     transactions réelles qui valaient 0 ;
 *   · des « détails » et des « +12,3 % vs mois dernier » écrits en dur dans
 *     chaque tuile ; et sur une lecture ratée, des zéros par défaut.
 *
 * LA RÈGLE. Nom réel ou rien. Date du jour. Un chiffre vient du serveur ou
 * il n'est pas écrit : sur une lecture absente ou ratée, l'écran dit
 * « Indisponible » (même état et mêmes mots que le back-office,
 * `etatLectureBO.ts`). L'historique mensuel n'existe pas côté API
 * (`GET /institution/dashboard` ne le renvoie pas) : la courbe est
 * indisponible, elle n'est pas dessinée.
 *
 * Le backend peut renvoyer `null` (montant ou taux non mesuré) : `kpiDepuis`
 * le rend « Indisponible », jamais 0.
 *
 * MODULE PUR : ni React, ni appel réseau.
 */
import { indisponible, lue, kpiDepuis, texteDuKpi, type EtatLecture } from './etatLectureBO';

/** Le nom d'une personne, fait de ce qui existe vraiment. `null` si rien. */
export function nomAffiche(...parties: ReadonlyArray<unknown>): string | null {
  const mots = parties
    .filter((p): p is string => typeof p === 'string')
    .map(p => p.trim())
    .filter(Boolean);
  return mots.length > 0 ? mots.join(' ') : null;
}

/** La date du jour telle que l'accueil l'écrit (« 12 oct. 2026 »). */
export function dateDuJour(maintenant: Date): string {
  return maintenant.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Ni l'API ni le front n'ont d'historique mensuel : on le dit. */
export const RAISON_HISTORIQUE_ABSENT = "le serveur ne fournit pas encore l'historique mensuel";
export const RAISON_REGIONS_ABSENTES = 'le serveur ne fournit pas encore la répartition par région';

export interface MacroKpisInstitution {
  readonly acteursActifs: number;
  readonly totalActeurs: number;
  readonly acteursSuspendus: number;
  readonly volumeTransactions: number | null;
  readonly valeurMonetaire: number | null;
  readonly pctDigitalisation: number | null;
  readonly pctInclusionCNPS: number | null;
  readonly pctInclusionCNAM: number | null;
  readonly croissanceMensuelle: number | null;
}

export interface ResumeJourInstitution {
  readonly nouveauxInscrits: number;
  readonly dossiersValides: number;
  readonly dossiersRejetes: number;
  readonly transactionsDuJour: number;
  readonly alertesCritiquesActives: number;
}

export interface PartRole { readonly name: string; readonly value: number; readonly color: string }

export interface DashboardInstitution {
  readonly macroKPIs: MacroKpisInstitution;
  readonly resumeJour: ResumeJourInstitution;
  readonly dataRepartition: readonly PartRole[];
}

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * La réponse de `GET /institution/dashboard`, ou ce qu'on en a le droit de
 * dire. Les champs ne sont PAS complétés par des zéros : une tuile dont le
 * champ manque deviendra « indisponible » par `kpiDepuis` (nombre non fini).
 */
export function lectureDashboardInstitution(reponse: unknown): EtatLecture<DashboardInstitution> {
  if (!estObjet(reponse) || !estObjet(reponse.macroKPIs) || !estObjet(reponse.resumeJour)) {
    return indisponible('réponse du serveur sans indicateurs');
  }
  const parts = Array.isArray(reponse.dataRepartition) ? reponse.dataRepartition : [];
  return lue({
    macroKPIs: reponse.macroKPIs as unknown as MacroKpisInstitution,
    resumeJour: reponse.resumeJour as unknown as ResumeJourInstitution,
    dataRepartition: parts.filter(
      (p): p is PartRole => estObjet(p) && typeof p.name === 'string' && Number.isFinite(p.value),
    ),
  });
}

/** La phrase de Tantie sur l'accueil : le nom s'il existe, les chiffres s'ils
 *  ont été lus — jamais « undefined », jamais un zéro par défaut. */
export function messageAccueil(nom: string | null, lecture: EtatLecture<DashboardInstitution>): string {
  const bonjour = nom ? `Bonjour ${nom} !` : 'Bonjour !';
  if (lecture.type === 'attente') return bonjour;
  const actifs = kpiDepuis(lecture, d => d.macroKPIs.acteursActifs);
  const total = kpiDepuis(lecture, d => d.macroKPIs.totalActeurs);
  if (actifs.type !== 'nombre' || total.type !== 'nombre') {
    return `${bonjour} Les chiffres sont indisponibles pour le moment.`;
  }
  return `${bonjour} ${texteDuKpi(actifs)} acteurs actifs sur ${texteDuKpi(total)} inscrits`;
}
