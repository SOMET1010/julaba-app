// Mapping PUR d'une ligne du ledger `stock_mouvements` vers un mouvement
// d'affichage. Isolé du contrôleur pour être testable sans base de données
// (jest `test:unit`). Lecture seule — n'écrit jamais dans le ledger.

export interface LedgerRow {
  id: string;
  produit_nom: string | null;
  quantite_retranchee: number | string | null;
  type: string | null;
  created_at: string | Date;
  unite?: string | null;
}

export interface MouvementStock {
  id: string;
  type: string;
  /** Delta de stock SIGNÉ : négatif = sorti (vente), positif = rentré (annulation). */
  quantite: number;
  produit_nom: string | null;
  unite: string | null;
  date: string;
}

/**
 * Le ledger stocke `quantite_retranchee` = quantité RETIRÉE du stock :
 *   • vente       → retranchee > 0  (le stock baisse)
 *   • annulation  → retranchee < 0  (le stock remonte ; ligne inverse append-only)
 * Le delta de stock à afficher est donc l'opposé, de façon UNIFORME : `-retranchee`.
 * Un seul point de vérité pour le signe → testé, jamais réinventé côté SQL/front.
 */
export function mapLedgerRow(row: LedgerRow): MouvementStock {
  const retranchee = Number(row.quantite_retranchee) || 0;
  const delta = -retranchee;
  return {
    id: row.id,
    type: row.type || 'vente',
    // `delta === 0` couvre aussi -0 (0 === -0) → on renvoie un 0 positif propre.
    quantite: delta === 0 ? 0 : delta,
    produit_nom: row.produit_nom ?? null,
    unite: row.unite ?? null,
    date: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export function mapLedgerRows(rows: LedgerRow[]): MouvementStock[] {
  return (rows || []).map(mapLedgerRow);
}
