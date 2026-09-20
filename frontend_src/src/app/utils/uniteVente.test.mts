/**
 * L'UNITÉ APPARTIENT À LA VENTE, PAS AU CATALOGUE — arbitrage du 19/09/2026.
 *
 * LE DÉFAUT QU'ON FERME (audit Odoo, constat 1 — le seul qui détruisait de
 * l'information de façon irréversible). Un reçu disait « 3 × Tomate ». Trois
 * quoi ? L'unité ne vivait que dans `produits.unite`, que la marchande peut
 * changer à tout moment : le jour où elle passe la tomate du tas au kilo,
 * TOUTES ses ventes passées se relisaient au kilo. Aucun moyen de le savoir,
 * aucune reconstitution possible.
 *
 * Même règle que `prix_achat`, figé à la vente pour que la marge d'hier ne
 * bouge pas quand le fournisseur change de tarif.
 *
 * Lancer : npm run test:unite-vente
 */
import { quantiteAvecUnite, ligneLisible, accorderUnite, uniteSeule } from './unite.utils.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};

console.log('\nUne vente se lit avec son unité');

ok(ligneLisible(3, 'Tomate', 'tas') === '3 tas de Tomate', `« 3 tas de Tomate », obtenu « ${ligneLisible(3, 'Tomate', 'tas')} »`);
ok(ligneLisible(2, 'Riz', 'sac') === '2 sacs de Riz', `« 2 sacs de Riz », obtenu « ${ligneLisible(2, 'Riz', 'sac')} »`);
ok(ligneLisible(1, 'Riz', 'sac') === '1 sac de Riz', 'au singulier, pas de « s » parasite');

console.log('\nLes accords, prudents par construction');

ok(accorderUnite('tas', 3) === 'tas', '« tas » est invariable — on n’invente pas « tass »');
ok(accorderUnite('sac', 2) === 'sacs', '« sac » prend son pluriel');
ok(accorderUnite('kg', 3) === 'kg', 'une abréviation ne se pluralise jamais : « 3 kg »');
ok(accorderUnite('litre', 2) === 'litres', '« litres »');
ok(accorderUnite('portion', 1) === 'portion', 'quantité 1 : aucun pluriel');

console.log('\nCe qui n’apprend rien ne se dit pas');

ok(ligneLisible(3, 'Savon', 'unité') === '3 × Savon', '« unité » est neutre : on retombe sur « 3 × Savon »');
ok(ligneLisible(3, 'Savon', 'unite') === '3 × Savon', 'même chose sans accent (article libre)');
ok(ligneLisible(3, 'Savon', undefined) === '3 × Savon', 'vente d’AVANT ce correctif : forme historique conservée');
ok(ligneLisible(3, 'Savon', '') === '3 × Savon', 'unité vide : idem');
ok(ligneLisible(3, 'Banane', 'pièce') === '3 pièces de Banane', '« pièce » n’est PAS neutre — une marchande le dit');

console.log('\nLa quantité seule, pour les endroits où le nom suit déjà');

ok(quantiteAvecUnite(3, 'tas') === '3 tas', '« 3 tas »');
// On compare au formatage FRANÇAIS réel, pas à une chaîne écrite à la main :
// `toLocaleString('fr-FR')` sépare les milliers par une espace insécable
// ÉTROITE (U+202F), invisible à l'œil. Un attendu tapé au clavier échouerait
// pour une raison qu'on ne verrait pas — c'est ce qui vient d'arriver.
ok(
  quantiteAvecUnite(1500, 'kg') === `${(1500).toLocaleString('fr-FR')} kg`,
  `les milliers restent lisibles, obtenu « ${quantiteAvecUnite(1500, 'kg')} »`,
);
ok(quantiteAvecUnite(3, null) === '3', 'sans unité : le nombre seul');

console.log("\nL'unité seule, pour la ligne de panier (la quantité est un champ à part)");

ok(uniteSeule(3, 'tas') === 'tas', '« tas » ne prend pas de s');
ok(uniteSeule(2, 'sac') === 'sacs', '« sacs » s’accorde');
ok(uniteSeule(1, 'sac') === 'sac', 'au singulier, pas de s');
ok(uniteSeule(3, 'kg') === 'kg', 'une abréviation ne s’accorde jamais');
ok(uniteSeule(3, 'pièce') === 'pièces', '« pièce » n’est pas neutre');
ok(uniteSeule(3, 'unité') === '', '« unité » n’apprend rien : rien à afficher');
ok(uniteSeule(3, null) === '', 'sans unité : rien à afficher');

if (echecs > 0) {
  console.log(`\n✗ unité de la vente — ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✓ unité de la vente — une vente garde son contexte');
