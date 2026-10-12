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

const moisDe = (v: unknown): number => new Date(String(v ?? '')).getMonth();
const enMillions = (v: number | null): number | null => (v === null ? null : Math.round(v / 1_000_000));

export function seriesMensuelles(
  acteurs: readonly ActeurDate[],
  transactions: readonly TransactionDatee[],
  complet: boolean,
): PointMensuel[] {
  const ventes = transactions.filter(estVenteRetenue);
  return MOIS_LABELS.map((mois, i) => {
    const duMois = ventes.filter(t => moisDe(t.date ?? t.created_at) === i);
    return {
      mois,
      acteurs: acteurs.filter(a => moisDe(a.dateInscription ?? a.createdAt) === i).length,
      transactions: complet ? duMois.length : null,
      volume: complet ? enMillions(volumeDesVentes(duMois)) : null,
    };
  }).filter(m => m.acteurs > 0 || (m.transactions ?? 0) > 0);
}

export interface PerformanceRegion {
  readonly region: string;
  readonly acteurs: number;
  /** En millions de FCFA ; `null` = non mesuré. */
  readonly volume: number | null;
}

export function performanceRegions(
  acteurs: readonly ActeurDate[],
  transactions: readonly TransactionDatee[],
  complet: boolean,
): PerformanceRegion[] {
  const nom = (r: unknown) => (typeof r === 'string' && r.trim() ? r : 'Autre');
  const parRegion = new Map<string, { acteurs: number; ventes: TransactionDatee[] }>();
  const de = (r: string) => {
    let entree = parRegion.get(r);
    if (!entree) { entree = { acteurs: 0, ventes: [] }; parRegion.set(r, entree); }
    return entree;
  };
  acteurs.forEach(a => { de(nom(a.region)).acteurs++; });
  transactions.filter(estVenteRetenue).forEach(t => { de(nom(t.region)).ventes.push(t); });
  return [...parRegion.entries()]
    .sort((a, b) => b[1].acteurs - a[1].acteurs)
    .slice(0, 6)
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
