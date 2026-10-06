/**
 * UNE VENTE À PERTE DOIT SE VOIR — arbitrage de Patrick, 19/09/2026.
 *
 * LE DÉFAUT QU'ON FERME. `Math.max(0, …)` rendait une perte impossible à
 * afficher : produit acheté 1 000 F, vendu 800 F, résultat stocké 0 au lieu de
 * −200. « marge — » s'affichait alors, exactement comme pour une vente dont on
 * ignore le coût. Deux situations opposées, un seul écran. Ses bénéfices
 * cumulés étaient surévalués d'autant, sans aucun signal.
 *
 * ET LE PIRE : le serveur plafonnait sur le TOTAL de la vente, le client
 * plafonnait LIGNE PAR LIGNE. Deux méthodes différentes, donc deux vérités pour
 * une même vente — c'est ce qui faisait afficher 300 F de bénéfice là où le
 * serveur avait justement calculé 0.
 *
 * LA RÈGLE QUI SUBSISTE, et elle est essentielle : « coût inconnu » n'est pas
 * « coût nul ». Une ligne sans prix d'achat reste IGNORÉE. Inventer une perte
 * serait aussi faux qu'inventer un gain.
 *
 * Lancer : npm run test:marge-perte
 */
import { beneficeDepuisDetails } from './margeVente.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};

console.log('\nLe bénéfice dit la vérité, gain comme perte');

ok(
  beneficeDepuisDetails([{ nom: 'Tomate', quantite: 1, total: 800, prix_achat: 1000 }]) === -200,
  'vendu 800 ce qui a coûté 1 000 → −200 (et non 0)',
);

ok(
  beneficeDepuisDetails([{ nom: 'Oignon', quantite: 3, total: 600, prix_achat: 100 }]) === 300,
  'un vrai bénéfice reste un bénéfice : 600 − 3×100 = 300',
);

{
  // LE CAS QUI RÉVÉLAIT LES DEUX MÉTHODES. Tomate vendue à perte, oignon en
  // marge : le total de la vente est déficitaire. L'ancien calcul client
  // annonçait +300 en ignorant la perte de la première ligne.
  const venteMixte = [
    { nom: 'Tomate', quantite: 2, total: 200, prix_achat: 300 },  // −400
    { nom: 'Oignon', quantite: 3, total: 600, prix_achat: 100 },  // +300
  ];
  ok(
    beneficeDepuisDetails(venteMixte) === -100,
    `vente mixte : −400 + 300 = −100 (l'ancien calcul disait +300), obtenu ${beneficeDepuisDetails(venteMixte)}`,
  );
}

console.log('\nCe qui ne change PAS : un coût inconnu n’est pas un coût nul');

ok(
  beneficeDepuisDetails([{ nom: 'Piment', quantite: 1, total: 500 }]) === 0,
  'aucun prix d’achat → 0, jamais « 500 de marge »',
);

ok(
  beneficeDepuisDetails([{ nom: 'Piment', quantite: 1, total: 500, prix_achat: 0 }]) === 0,
  'prix d’achat à zéro → ligne ignorée, pas un bénéfice de 500',
);

{
  // Une ligne sans coût ne doit ni gonfler ni masquer la perte de l'autre.
  const mixte = [
    { nom: 'Tomate', quantite: 1, total: 800, prix_achat: 1000 }, // −200
    { nom: 'Piment', quantite: 1, total: 500 },                   // ignorée
  ];
  ok(beneficeDepuisDetails(mixte) === -200, `ligne sans coût ignorée, la perte subsiste : ${beneficeDepuisDetails(mixte)}`);
}

ok(beneficeDepuisDetails(null) === 0, 'détails absents → 0');
ok(beneficeDepuisDetails('pas un tableau') === 0, 'détails illisibles → 0');

if (echecs > 0) {
  console.log(`\n✗ marge et perte — ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✓ marge et perte — une perte est une perte');
