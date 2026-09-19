/**
 * Calcul du bénéfice/marge d'une vente à partir de ses lignes (`details`).
 *
 * Règle de VÉRITÉ (écart recette caisse) : « coût inconnu » ≠ « coût nul ».
 * On ne compte QUE les lignes dont le prix d'achat est connu (> 0) ; une ligne
 * sans coût est ignorée (on n'invente pas de marge, surtout pas le prix de vente
 * entier — même faute que #134 côté stock, ici sur les ventes). Le bénéfice est
 * la somme des (total − prix_achat × quantité) des seules lignes coûtées, SANS
 * plancher : une ligne vendue à perte retranche ce qu'elle coûte (arbitrage du
 * 19/09/2026 — ne jamais masquer une réalité économique).
 * Conséquence : une vente sans aucun coût connu renvoie 0 (affiché « marge — »),
 * une vente mixte n'est jamais surévaluée par ses lignes sans coût, et une vente
 * à perte affiche sa perte.
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
    // PAS DE PLANCHER PAR LIGNE — arbitrage du 19/09/2026. Il produisait un
    // résultat DIFFÉRENT de celui du serveur : sur une vente à deux lignes dont
    // l'une part à perte, le serveur plafonnait sur le TOTAL (0) et ce calcul
    // plafonnait ligne par ligne (300). Deux vérités pour une même vente.
    // Une ligne vendue à perte retranche désormais ce qu'elle coûte, ici comme
    // là-bas. Seule une ligne au coût INCONNU reste ignorée (ci-dessus).
    return s + (total - coutUnitaire * q);
  }, 0);
}
