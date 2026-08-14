// ──────────────────────────────────────────────────────────────────────────
// Statistiques de vente — calcul PUR et testable du top produits.
//
// Corrige les bugs #10 / #11 de l'audit voix/caisse :
//   #10 la quantite etait codee a 1 -> quantites vendues fausses.
//   #11 total = price * quantity gonflait le CA, car `price` porte deja le
//       MONTANT TOTAL de la transaction (pas un prix unitaire). En FCFA, repartir
//       un total indivisible par la quantite (500/3) ne resomme jamais au total.
//
// Regle : le total par produit est la SOMME DES MONTANTS de transaction. La
// quantite affichee est la vraie quantite vendue. Aucun produit croise price*qty.
// ──────────────────────────────────────────────────────────────────────────

export interface LigneVente {
  productName: string;
  type: string;
  /** Vraie quantite vendue (peut etre fractionnaire selon l'unite). */
  quantity: number;
  /** Montant TOTAL de la transaction. `price` en est un alias historique. */
  montant?: number;
  price?: number;
}

export interface TopProduit {
  productName: string;
  quantity: number;
  total: number;
}

/** Montant total d'une ligne : `montant` s'il existe, sinon `price` (jamais * quantity). */
export function montantLigne(t: LigneVente): number {
  const m = t.montant ?? t.price ?? 0;
  return Number(m) || 0;
}

/**
 * Agrege les ventes par produit : total = somme des montants, quantite = somme
 * des vraies quantites. Trie par total decroissant, tronque a `limit`.
 */
export function topProduitsVentes(transactions: LigneVente[], limit = 5): TopProduit[] {
  return transactions
    .filter((t) => t.type === 'vente')
    .reduce((acc, t) => {
      const total = montantLigne(t);
      const qte = Number(t.quantity) || 0;
      const found = acc.find((p) => p.productName === t.productName);
      if (found) {
        found.quantity += qte;
        found.total += total;
      } else {
        acc.push({ productName: t.productName, quantity: qte, total });
      }
      return acc;
    }, [] as TopProduit[])
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
