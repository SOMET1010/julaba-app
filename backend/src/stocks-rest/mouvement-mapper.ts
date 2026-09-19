// Mapping PUR d'une ligne du ledger `stock_mouvements` vers un mouvement
// d'affichage. Isolé du contrôleur pour être testable sans base de données
// (jest `test:unit`). Lecture seule — n'écrit jamais dans le ledger.

export interface LedgerRow {
  id: string;
  produit_nom: string | null;
  quantite_demandee?: number | string | null;
  quantite_retranchee: number | string | null;
  manquant?: number | string | null;
  type: string | null;
  created_at: string | Date;
  unite?: string | null;
}

export interface MouvementStock {
  id: string;
  type: string;
  /** Delta de stock SIGNÉ : négatif = sorti (vente), positif = rentré (annulation). */
  quantite: number;
  /**
   * CE QU'IL FAUT MONTRER À LA MARCHANDE — 19/09/2026.
   *
   * Pour une vente, c'est la quantité DEMANDÉE : ce qui est sorti de la
   * boutique, que le stock enregistré l'ait couvert ou non. Une vente de 4 kg
   * sur un stock à zéro reste une vente de 4 kg — l'afficher « 0 » n'apprend
   * rien à quelqu'un qui vient de les remettre à sa cliente.
   * Pour une annulation, c'est ce qui est rentré.
   * Toujours positif : le SIGNE est porté par `quantite`, et par elle seule.
   */
  quantite_affichee: number;
  /** Ce que le stock enregistré ne couvrait pas. > 0 ⇒ vente hors stock. */
  manquant: number;
  /** Vrai quand le stock ne couvrait pas la sortie. L'écran doit le DIRE. */
  hors_stock: boolean;
  produit_nom: string | null;
  /** Unité FIGÉE au mouvement ; repli sur le catalogue pour les lignes anciennes. */
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
  const manquant = Number(row.manquant) || 0;
  // `quantite_demandee` est absente des lignes très anciennes : on retombe alors
  // sur ce qui a été retranché, qui était la seule information disponible.
  const demandee = row.quantite_demandee != null
    ? Number(row.quantite_demandee) || 0
    : Math.abs(retranchee);
  return {
    id: row.id,
    type: row.type || 'vente',
    // `delta === 0` couvre aussi -0 (0 === -0) → on renvoie un 0 positif propre.
    quantite: delta === 0 ? 0 : delta,
    quantite_affichee: Math.abs(demandee),
    manquant,
    hors_stock: manquant > 0,
    produit_nom: row.produit_nom ?? null,
    unite: row.unite ?? null,
    date: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export function mapLedgerRows(rows: LedgerRow[]): MouvementStock[] {
  return (rows || []).map(mapLedgerRow);
}
