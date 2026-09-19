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
  /** Lignes réelles de la vente, telles que le panier les a envoyées.
   *  C'est la SEULE source qui sache ce qui a vraiment été vendu quand une
   *  transaction porte plusieurs produits. */
  details?: unknown;
}

/** Une ligne du panier, telle que POSCaisse la construit. */
interface LigneDetail {
  nom?: string;
  quantite?: number;
  prix?: number;
  total?: number;
}

/**
 * Éclate une vente en ses vrais produits — correctif du 18/09/2026.
 *
 * LE DÉFAUT : le backend construit `produit` en JOIGNANT les noms
 * (« Tomate, Banane »), et le top produits agrégeait tout le montant sous
 * cette chaîne comme s'il s'agissait d'un article. Une vente de 2 tomates à
 * 500 F et 1 banane à 300 F faisait apparaître un produit « Tomate, Banane »
 * à 800 F — un article qui n'existe pas, et ni la tomate ni la banane
 * n'apparaissaient à leur vraie valeur.
 *
 * Pour une marchande, « qu'est-ce qui se vend le mieux » est une décision
 * d'achat : un faux produit en tête de liste l'oriente vers un stock qu'elle
 * ne vendra jamais.
 *
 * Rendre `null` quand les détails sont inexploitables : l'appelant retombe
 * alors sur l'ancien comportement plutôt que de perdre la vente.
 */
function eclaterEnProduits(t: LigneVente): { nom: string; qte: number; total: number }[] | null {
  if (!Array.isArray(t.details) || t.details.length === 0) return null;
  const lignes = (t.details as LigneDetail[])
    .map((d) => {
      const nom = typeof d?.nom === 'string' ? d.nom.trim() : '';
      const qte = Number(d?.quantite) || 0;
      // `total` est le montant exact de la ligne (il porte le prix négocié) ;
      // prix × quantité n'est qu'un repli.
      const total = Number(d?.total) || (Number(d?.prix) || 0) * (qte || 1);
      return { nom, qte, total };
    })
    .filter((l) => l.nom !== '');
  if (lignes.length === 0) return null;
  // Si les lignes ne totalisent rien, elles n'apprennent rien : on préfère
  // l'ancien comportement à une statistique à zéro.
  if (lignes.reduce((s, l) => s + l.total, 0) <= 0) return null;
  return lignes;
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
  /** Somme des benefices des ventes non annulees.
   *
   *  IL N'Y A PLUS QU'UN SEUL CHIFFRE — HYGIÈNE-1 axe 3. Ce résumé en
   *  renvoyait deux, alimentés par deux champs distincts eux-mêmes lus dans
   *  deux colonnes distinctes (`benefice`, `marge`). Or le serveur écrit LA
   *  MÊME VALEUR dans les deux (`marge, benefice: marge`), et le second total
   *  n'était affiché nulle part. Deux noms pour un seul chiffre, c'est la
   *  promesse qu'ils diffèreront un jour — et personne ne saura alors lequel
   *  est juste. */
  totalBenefices: number;
  /** Nombre de ventes NON annulees. */
  totalCount: number;
  /** Panier moyen = totalVentes / totalCount (arrondi), 0 si aucune vente. */
  panierMoyen: number;
}

export interface VenteResumable {
  montant?: number;
  price?: number;
  /** Le bénéfice de la vente. Un seul champ, un seul sens. */
  benefice?: number;
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
  const totalBenefices = actives.reduce((s, t) => s + (Number(t.benefice ?? 0) || 0), 0);
  const totalCount = actives.length;
  const panierMoyen = totalCount > 0 ? Math.round(totalVentes / totalCount) : 0;
  return { totalVentes, totalBenefices, totalCount, panierMoyen };
}

/**
 * Agrege les ventes par produit : total = somme des montants, quantite = somme
 * des vraies quantites. Trie par total decroissant, tronque a `limit`.
 */
export function topProduitsVentes(transactions: LigneVente[], limit = 5): TopProduit[] {
  return transactions
    .filter((t) => t.type === 'vente' && venteComptee(t))
    .reduce((acc, t) => {
      // Une vente à plusieurs produits est éclatée en ses vraies lignes ;
      // sinon on garde la transaction entière, comme avant.
      const parts = eclaterEnProduits(t) ?? [
        { nom: t.productName, qte: Number(t.quantity) || 0, total: montantLigne(t) },
      ];
      for (const part of parts) {
        const found = acc.find((p) => p.productName === part.nom);
        if (found) {
          found.quantity += part.qte;
          found.total += part.total;
        } else {
          acc.push({ productName: part.nom, quantity: part.qte, total: part.total });
        }
      }
      return acc;
    }, [] as TopProduit[])
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
