/**
 * LES SÉRIES DE L'ÉCRAN « RAPPORTS » DU BACK-OFFICE — démo 12/10/2026.
 *
 * Avant : `BORapports.tsx` recalculait mois par mois et région par région sur
 * la page de 50 transactions chargée, en additionnant ventes, dépenses et
 * ventes annulées (`t.montant || t.amount || 0`), et inventait des
 * « commissions » (× 3 %) et un « taux d'activité » (60 + rang × 39).
 *
 * Maintenant : seules les ventes retenues comptent (`ventesBO.ts`) ; un nombre
 * de transactions ou un volume n'est donné que si la page contient TOUTES les
 * lignes (`complet`) — sinon `null`, affiché « non mesuré ». Ni commission, ni
 * taux : aucune source ne les porte.
 *
 * MODULE PUR.
 */
import { MOT_NON_MESURE, estVenteRetenue, volumeDesVentes, type LigneVente } from './ventesBO';

export const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface ActeurDate { readonly dateInscription?: unknown; readonly createdAt?: unknown; readonly region?: unknown }
export interface TransactionDatee extends LigneVente {
  readonly date?: unknown;
  readonly created_at?: unknown;
  readonly region?: unknown;
}

export interface PointMensuel {
  readonly mois: string;
  readonly acteurs: number;
  /** `null` = non mesuré (page incomplète). */
  readonly transactions: number | null;
  /** En millions de FCFA ; `null` = non mesuré ou montant illisible. */
  readonly volume: number | null;
}

const enMillions = (v: number | null): number | null => (v === null ? null : Math.round(v / 1_000_000));
/** « 2026-03 » depuis une date lue, ou null si elle est illisible. */
function cleMois(v: unknown): string | null {
  const d = new Date(String(v ?? ''));
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth()}`;
}

/** Les `nbMois` derniers mois (année comprise : mars 2025 ≠ mars 2026). */
export function seriesMensuelles(
  acteurs: readonly ActeurDate[],
  transactions: readonly TransactionDatee[],
  complet: boolean,
  maintenant: Date,
  nbMois: number,
): PointMensuel[] {
  const ventes = transactions.filter(estVenteRetenue);
  const points: PointMensuel[] = [];
  for (let i = nbMois - 1; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const cle = `${d.getFullYear()}-${d.getMonth()}`;
    const duMois = ventes.filter(t => cleMois(t.date ?? t.created_at) === cle);
    points.push({
      mois: MOIS_LABELS[d.getMonth()],
      acteurs: acteurs.filter(a => cleMois(a.dateInscription ?? a.createdAt) === cle).length,
      transactions: complet ? duMois.length : null,
      volume: complet ? enMillions(volumeDesVentes(duMois)) : null,
    });
  }
  return points;
}

/** Somme d'une série ; `null` si un seul point n'est pas mesuré. */
export function totalSerie(valeurs: ReadonlyArray<number | null>): number | null {
  return valeurs.some(v => v === null) ? null : valeurs.reduce<number>((s, v) => s + (v ?? 0), 0);
}

export interface PerformanceRegion {
  readonly region: string;
  readonly acteurs: number;
  /** En millions de FCFA ; `null` = non mesuré. */
  readonly volume: number | null;
}

export interface OptionsRegions {
  /** Nom affiché d'une région brute (défaut : tel quel, « Autre » si vide). */
  readonly nomRegion?: (brut: unknown) => string;
  /** Région dont les ventes ne sont pas rattachées (ex. « Non défini »). */
  readonly regionSansVentes?: string;
  readonly limite?: number;
}

export function performanceRegions(
  acteurs: readonly ActeurDate[],
  transactions: readonly TransactionDatee[],
  complet: boolean,
  options: OptionsRegions = {},
): PerformanceRegion[] {
  const nom = options.nomRegion ?? ((r: unknown) => (typeof r === 'string' && r.trim() ? r : 'Autre'));
  const parRegion = new Map<string, { acteurs: number; ventes: TransactionDatee[] }>();
  const de = (r: string) => {
    let entree = parRegion.get(r);
    if (!entree) { entree = { acteurs: 0, ventes: [] }; parRegion.set(r, entree); }
    return entree;
  };
  acteurs.forEach(a => { de(nom(a.region)).acteurs++; });
  transactions.filter(estVenteRetenue).forEach(t => {
    const r = nom(t.region);
    if (r !== options.regionSansVentes) de(r).ventes.push(t);
  });
  return [...parRegion.entries()]
    .sort((a, b) => b[1].acteurs - a[1].acteurs)
    .slice(0, options.limite ?? 6)
    .map(([region, d]) => ({
      region,
      acteurs: d.acteurs,
      volume: complet ? enMillions(volumeDesVentes(d.ventes)) : null,
    }));
}

/** Un nombre de la série, ou « non mesuré ». */
export function texteMesure(v: number | null, unite = ''): string {
  return v === null ? MOT_NON_MESURE : `${v.toLocaleString('fr-FR')}${unite}`;
}
