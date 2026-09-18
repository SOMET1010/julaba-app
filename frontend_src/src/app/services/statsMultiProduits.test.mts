/**
 * UNE VENTE À PLUSIEURS PRODUITS NE DOIT PAS EN INVENTER UN TROISIÈME.
 *
 * LE DÉFAUT QU'ON FERME, audit du 18/09/2026. Le backend construit le nom du
 * produit en JOIGNANT ceux du panier (« Tomate, Banane »), et le top produits
 * agrégeait tout le montant sous cette chaîne comme s'il s'agissait d'un
 * article. Une vente de 2 tomates à 500 F et 1 banane à 300 F faisait
 * apparaître un produit « Tomate, Banane » à 800 F — un article qui n'existe
 * pas — pendant que ni la tomate ni la banane n'apparaissaient à leur valeur.
 *
 * POURQUOI ÇA COMPTE POUR UNE MARCHANDE. « Qu'est-ce qui se vend le mieux »
 * n'est pas une curiosité : c'est ce sur quoi elle décide son prochain achat
 * au grossiste. Un faux produit en tête de liste l'oriente vers un stock
 * qu'elle ne vendra jamais.
 *
 * Lancer : npm run test:stats-multi
 */
import { topProduitsVentes, type LigneVente } from './statsVente.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};
const trouver = (liste: { productName: string; quantity: number; total: number }[], nom: string) =>
  liste.find((p) => p.productName === nom);

console.log('\nLe top produits décrit ce qui a vraiment été vendu');

{
  // Le cas exact de l'audit.
  const vente: LigneVente = {
    productName: 'Tomate, Banane', type: 'vente', quantity: 3, montant: 800,
    details: [
      { nom: 'Tomate', quantite: 2, prix: 250, total: 500 },
      { nom: 'Banane', quantite: 1, prix: 300, total: 300 },
    ],
  };
  const top = topProduitsVentes([vente]);
  ok(!trouver(top, 'Tomate, Banane'), 'aucun produit « Tomate, Banane » inventé');
  ok(trouver(top, 'Tomate')?.total === 500, `Tomate à 500 F, obtenu ${trouver(top, 'Tomate')?.total}`);
  ok(trouver(top, 'Banane')?.total === 300, `Banane à 300 F, obtenu ${trouver(top, 'Banane')?.total}`);
  ok(trouver(top, 'Tomate')?.quantity === 2, 'la quantité suit le bon produit');
  const somme = top.reduce((s, p) => s + p.total, 0);
  ok(somme === 800, `l'argent est conservé : ${somme} = 800`);
}

{
  // Les lignes d'une même vente s'additionnent avec celles des autres ventes.
  const ventes: LigneVente[] = [
    { productName: 'Tomate, Banane', type: 'vente', quantity: 3, montant: 800,
      details: [{ nom: 'Tomate', quantite: 2, total: 500 }, { nom: 'Banane', quantite: 1, total: 300 }] },
    { productName: 'Tomate', type: 'vente', quantity: 1, montant: 250 },
  ];
  const top = topProduitsVentes(ventes);
  ok(trouver(top, 'Tomate')?.total === 750, `Tomate cumulée : 500 + 250 = 750, obtenu ${trouver(top, 'Tomate')?.total}`);
  ok(top[0].productName === 'Tomate', 'le classement met la Tomate en tête');
}

{
  // Une vente ANNULÉE reste exclue, détails ou pas : la règle ne change pas.
  const ventes: LigneVente[] = [
    { productName: 'Tomate, Banane', type: 'vente', quantity: 3, montant: 800, statut: 'annulee',
      details: [{ nom: 'Tomate', quantite: 2, total: 500 }, { nom: 'Banane', quantite: 1, total: 300 }] },
  ];
  ok(topProduitsVentes(ventes).length === 0, 'une vente annulée n’apparaît dans aucun produit');
}

{
  // Sans détails exploitables, on garde l'ancien comportement plutôt que de
  // perdre la vente : une statistique incomplète vaut mieux qu'une statistique
  // amputée.
  const sansDetails: LigneVente = { productName: 'Riz', type: 'vente', quantity: 2, montant: 1200 };
  ok(trouver(topProduitsVentes([sansDetails]), 'Riz')?.total === 1200, 'sans détails : repli sur la transaction entière');

  const detailsVides: LigneVente = { productName: 'Riz', type: 'vente', quantity: 2, montant: 1200, details: [] };
  ok(trouver(topProduitsVentes([detailsVides]), 'Riz')?.total === 1200, 'détails vides : même repli');

  const detailsSansNom: LigneVente = { productName: 'Riz', type: 'vente', quantity: 2, montant: 1200,
    details: [{ quantite: 2, total: 1200 }] };
  ok(trouver(topProduitsVentes(detailsSansNom ? [detailsSansNom] : []), 'Riz')?.total === 1200,
     'détails sans nom : on ne crée pas un produit anonyme');

  const detailsAZero: LigneVente = { productName: 'Riz', type: 'vente', quantity: 2, montant: 1200,
    details: [{ nom: 'Riz', quantite: 2, total: 0 }] };
  ok(trouver(topProduitsVentes([detailsAZero]), 'Riz')?.total === 1200,
     'détails qui ne totalisent rien : on préfère le montant réel de la vente');
}

if (echecs > 0) {
  console.log(`\n✗ top produits — ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✓ top produits — chaque produit reçoit ce qu’il a vraiment rapporté');
