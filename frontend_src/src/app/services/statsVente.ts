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
  /** 'validee' | 'annulee' | … — une vente annulee ne compte nulle part. */
  statut?: string;
}

export interface TopProduit {
  productName: string;
  quantity: number;
  total: number;
}

/**
 * Une vente ANNULEE (statut 'annulee', annulation self-service #20 / R7) ne compte
 * dans AUCUN agregat financier : ni CA, ni marge, ni volume, ni top produits. Elle
 * reste visible dans l'historique (carte badgee « Annulee ») pour la tracabilite,
 * mais la verite financiere l'exclut. Regle unique, appliquee cote historique
 * (« Ventes passees ») comme cote resume d'accueil.
 */
export function venteComptee(t: { statut?: string }): boolean {
  return t.statut !== 'annulee';
}

/** Montant total d'une ligne : `montant` s'il existe, sinon `price` (jamais * quantity). */
export function montantLigne(t: LigneVente): number {
  const m = t.montant ?? t.price ?? 0;
  return Number(m) || 0;
}

export interface ResumeVentes {
  /** CA : somme des montants des ventes NON annulees. */
  totalVentes: number;
  /** Somme des benefices (fallback marge) des ventes non annulees. */
  totalBenefices: number;
  /** Somme des marges des ventes non annulees. */
  totalMarges: number;
  /** Nombre de ventes NON annulees. */
  totalCount: number;
  /** Panier moyen = totalVentes / totalCount (arrondi), 0 si aucune vente. */
  panierMoyen: number;
}

export interface VenteResumable {
  montant?: number;
  price?: number;
  totalMargin?: number;
  totalBenefice?: number;
  statut?: string;
}

/**
 * Agrege les KPIs d'un lot de ventes en EXCLUANT les ventes annulees (cf.
 * `venteComptee`). Calcul pur et testable, source unique des chiffres affiches
 * dans « Ventes passees » et du resume d'accueil.
 */
export function resumeVentes(sales: VenteResumable[]): ResumeVentes {
  const actives = sales.filter(venteComptee);
  const totalVentes = actives.reduce((s, t) => s + (Number(t.montant ?? t.price ?? 0) || 0), 0);
  const totalMarges = actives.reduce((s, t) => s + (Number(t.totalMargin ?? 0) || 0), 0);
  const totalBenefices = actives.reduce((s, t) => s + (Number(t.totalBenefice ?? t.totalMargin ?? 0) || 0), 0);
  const totalCount = actives.length;
  const panierMoyen = totalCount > 0 ? Math.round(totalVentes / totalCount) : 0;
  return { totalVentes, totalBenefices, totalMarges, totalCount, panierMoyen };
}

/**
 * Agrege les ventes par produit : total = somme des montants, quantite = somme
 * des vraies quantites. Trie par total decroissant, tronque a `limit`.
 */
export function topProduitsVentes(transactions: LigneVente[], limit = 5): TopProduit[] {
  return transactions
    .filter((t) => t.type === 'vente' && venteComptee(t))
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
