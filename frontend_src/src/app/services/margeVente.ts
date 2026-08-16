/**
 * Calcul du bénéfice/marge d'une vente à partir de ses lignes (`details`).
 *
 * Règle de VÉRITÉ (écart recette caisse) : « coût inconnu » ≠ « coût nul ».
 * On ne compte QUE les lignes dont le prix d'achat est connu (> 0) ; une ligne
 * sans coût est ignorée (on n'invente pas de marge, surtout pas le prix de vente
 * entier — même faute que #134 côté stock, ici sur les ventes). Le bénéfice est
 * la somme des (total − prix_achat × quantité) des seules lignes coûtées, plancher 0.
 * Conséquence : une vente sans aucun coût connu renvoie 0 (affiché « marge — »),
 * et une vente mixte n'est jamais surévaluée par ses lignes sans coût.
 */
export function beneficeDepuisDetails(details: unknown): number {
  if (!Array.isArray(details)) return 0;
  return details.reduce((s: number, it: any) => {
    const coutUnitaire = Number(it?.prix_achat ?? it?.prixAchat) || 0;
    // Coût inconnu (≤ 0) → ligne NON comptée : on n'invente pas de marge (on ne
    // renvoie surtout pas le prix de vente entier). Ne surévalue jamais, même sur
    // une vente mixte (une ligne coûtée + une ligne sans coût).
    if (coutUnitaire <= 0) return s;
    const q = Number(it?.quantite) || 1;
    const total = Number(it?.total) || (Number(it?.prix) || 0) * q;
    return s + Math.max(0, total - coutUnitaire * q);
  }, 0);
}
