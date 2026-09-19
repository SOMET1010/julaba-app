/**
 * ARGENT-1 — le second maillon de la preuve : ligne persistée -> écran -> voix.
 *
 * Le premier maillon (entrée métier -> contrôleur -> ligne persistée) est tenu
 * par `backend/test/invariants/argent-marge-panier-mixte.spec.ts`. LES DEUX
 * LISENT LE MÊME FICHIER DE DONNÉES, `tests/fixtures/argent-panier-mixte.json`,
 * pour qu'aucun des deux côtés ne puisse rester vert en se trompant seul.
 *
 * LA RÈGLE (arbitrage de Patrick, 19/09/2026) : une ligne sans prix d'achat ne
 * vaut ni zéro coût ni zéro information. On dit le chiffre qu'on sait — 100 F —
 * ET sa limite. Jamais l'un sans l'autre.
 *
 * Lancer : npm run test:marge-partielle
 */
import { readFileSync } from 'node:fs';
import { etatMarge, libelleMarge, phraseMarge } from './margeVente.js';

const FIXTURE = JSON.parse(
  readFileSync(new URL('../../../../tests/fixtures/argent-panier-mixte.json', import.meta.url), 'utf8'),
);

let echecs = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log('  ✅', label);
  else { console.log('  ❌', label, `\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`); echecs++; }
}

console.log('\nLe panier mixte du fichier de données — le MÊME que côté serveur');

const mixte = etatMarge(FIXTURE.vente.details);
eq(mixte.type, FIXTURE.attendu.etat, 'l’état est « partielle » : on sait une partie, pas tout');
eq((mixte as { montant: number }).montant, FIXTURE.attendu.marge_persistee, 'le montant est celui des seules lignes coûtées (100)');
eq(libelleMarge(mixte), FIXTURE.attendu.libelle_ecran, 'l’écran dit « Marge connue », pas « marge »');
eq(phraseMarge(mixte), FIXTURE.attendu.phrase_tata, 'Tata dit le chiffre ET sa limite');

console.log('\nLes trois autres états ne changent pas');

const toutConnu = etatMarge([{ nom: 'Riz', quantite: 1, total: 500, prix_achat: 400 }]);
eq(toutConnu.type, 'connue', 'toutes les lignes coûtées → « connue »');
eq((toutConnu as { montant: number }).montant, 100, '…et la marge vaut 100');
eq(libelleMarge(toutConnu), '+100 F marge', 'l’écran garde sa formulation actuelle');
eq(phraseMarge(toutConnu), 'marge 100 francs', 'la voix garde sa formulation actuelle');

const perte = etatMarge([{ nom: 'Riz', quantite: 1, total: 800, prix_achat: 1000 }]);
eq(perte.type, 'connue', 'une perte reste un état CONNU');
eq((perte as { montant: number }).montant, -200, 'une perte est une perte : −200');
eq(libelleMarge(perte), 'Perte : 200 F', 'l’écran nomme la perte');
eq(phraseMarge(perte), 'mais tu as perdu 200 francs dessus', 'la voix nomme la perte');

const inconnue = etatMarge([{ nom: 'Piment', quantite: 1, total: 300 }]);
eq(inconnue.type, 'inconnue', 'aucune ligne coûtée → « inconnue »');
eq(libelleMarge(inconnue), 'marge —', 'l’écran ne fabrique aucun chiffre');
eq(phraseMarge(inconnue), '', 'Tata se tait plutôt que d’inventer');

console.log('\nUn panier mixte qui perd de l’argent sur ce qu’on sait');

const mixtePerte = etatMarge([
  { nom: 'Riz', quantite: 1, total: 800, prix_achat: 1000 },
  { nom: 'Piment', quantite: 1, total: 300 },
]);
eq(mixtePerte.type, 'partielle', 'partielle, même quand la partie connue est une perte');
eq((mixtePerte as { montant: number }).montant, -200, 'la perte connue n’est pas masquée par la ligne inconnue');
eq(libelleMarge(mixtePerte), 'Perte connue : 200 F', 'l’écran dit la perte ET sa limite');
eq(phraseMarge(mixtePerte), 'Sur les articles dont tu connais le prix d’achat, tu as perdu 200 francs.', 'Tata dit la perte ET sa limite');

console.log('\nLe cas qui a tout déclenché : ne jamais rendre le chiffre partiel indiscernable d’un chiffre complet');
eq(libelleMarge(mixte) !== libelleMarge(toutConnu), true, 'une marge partielle ne s’affiche JAMAIS comme une marge complète');

console.log(echecs === 0 ? '\n✓ marge partielle — tous les cas passent' : `\n✗ ${echecs} échec(s)`);
process.exit(echecs === 0 ? 0 : 1);
