/**
 * Conversion d'une récolte — test PUR. Lancer : npm run test:recolte-conversion
 *
 * Deux propriétés, et la seconde est la raison d'être du lot :
 *   1. l'ARGENT ne bouge pas (identité quantité × prix) — il n'a jamais été faux ;
 *   2. la SAISIE BRUTE ressort, donc la conversion devient réversible — c'est
 *      elle qui était détruite.
 */
import { convertirRecolte, conversionReversible } from './conversionRecolte.js';
import { readFileSync } from 'node:fs';

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log('  ✅', label);
  else { console.log('  ❌', label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}
function ok(c: boolean, label: string) { eq(c, true, label); }

console.log('la saisie brute ressort INTACTE — c’est ce qui était perdu');
const paniers = convertirRecolte({ quantiteSaisie: 3, uniteSaisie: 'panier', facteur: 10, prixSaisi: 2000 });
eq(paniers.quantiteSaisie, 3, '3 reste 3');
eq(paniers.uniteSaisie, 'panier', '« panier » reste « panier »');
eq(paniers.facteur, 10, 'le facteur appliqué est rendu');
eq(paniers.quantiteEnKg, 30, 'le poids dérivé reste 30 kg (colonne inchangée)');

console.log('\nl’ARGENT est préservé : quantité × prix est une identité');
for (const [q, f, p] of [[3, 10, 2000], [5, 100, 45000], [1.5, 1000, 300000], [20, 0.5, 150]] as const) {
  const r = convertirRecolte({ quantiteSaisie: q, uniteSaisie: 'x', facteur: f, prixSaisi: p });
  const valeurSaisie = q * p;
  const valeurStockee = r.quantiteEnKg * r.prixParKg;
  ok(Math.abs(valeurStockee - valeurSaisie) / valeurSaisie < 0.001,
     `${q} × ${p} = ${valeurSaisie} F → ${r.quantiteEnKg} kg × ${r.prixParKg} F/kg = ${Math.round(valeurStockee)} F`);
}

console.log('\nentrées dégradées : aucune invention');
eq(convertirRecolte({ quantiteSaisie: 0, uniteSaisie: 'kg', facteur: 1, prixSaisi: '' }).prixParKg, 0, 'prix vide → 0, pas NaN');
eq(convertirRecolte({ quantiteSaisie: NaN, uniteSaisie: 'kg', facteur: 1, prixSaisi: 5 }).quantiteSaisie, 0, 'quantité illisible → 0');
eq(convertirRecolte({ quantiteSaisie: 2, uniteSaisie: 'kg', facteur: 0, prixSaisi: 10 }).facteur, 1, 'facteur 0 → 1, jamais de division par zéro');

console.log('\nréversibilité — l’invariant du lot');
ok(conversionReversible({ quantite: 30, quantite_saisie: 3, facteur_saisie: 10 }), '3 × 10 = 30 → réversible');
ok(conversionReversible({ quantite: 1500, quantite_saisie: 1.5, facteur_saisie: 1000 }), '1,5 t → réversible');
ok(!conversionReversible({ quantite: 30, quantite_saisie: 3, facteur_saisie: 50 }), 'facteur incohérent → NON réversible');
ok(!conversionReversible({ quantite: 30, quantite_saisie: null, facteur_saisie: null }), 'ligne historique sans saisie → NON réversible (et c’est honnête)');

console.log('\nl’écran ENVOIE bien la saisie brute — sinon rien de ce qui précède ne sert');
// Garde-fou sur la SOURCE, meme convention que caissePiloteEspeces.test.mts :
// la fonction pure peut etre parfaite et le formulaire ne pas l'utiliser.
const src = readFileSync(
  new URL('../components/producteur/RecolteForm.tsx', import.meta.url), 'utf8');
ok(/quantite_saisie:\s*converti\.quantiteSaisie/.test(src), 'quantite_saisie est transmise');
ok(/unite_saisie:\s*converti\.uniteSaisie/.test(src), 'unite_saisie est transmise');
ok(/facteur_saisie:\s*converti\.facteur/.test(src), 'facteur_saisie est transmis');
ok(/convertirRecolte\(/.test(src), 'la conversion passe par la fonction pure');
// Et la conversion n'est PLUS recalculee a la main dans l'ecran : deux
// formules pour un meme chiffre, c'est ainsi que l'une devient fausse.
ok(!/Number\(prixUnitaire\)\s*\/\s*uniteObj\.facteur/.test(src),
   'le prix/kg n’est plus recalculé en dur dans l’écran');
ok(!/Number\(quantite\)\s*\*\s*uniteObj\.facteur/.test(src),
   'le poids n’est plus recalculé en dur dans l’écran');

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log('\nTous les tests conversionRecolte sont verts ✅');
