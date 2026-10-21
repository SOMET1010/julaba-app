import { valeurApresToucheMontant } from './PaveMontant.js';

let failures = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const ok = actual === expected;
  console.log(ok ? '  ✅' : '  ❌', label, ok ? '' : `(attendu ${expected}, obtenu ${actual})`);
  if (!ok) failures += 1;
}

console.log('\n[1] Saisie simple');
eq(valeurApresToucheMontant('', '5'), '5', 'premier chiffre');
eq(valeurApresToucheMontant('5', '0'), '50', 'ajoute un chiffre');
eq(valeurApresToucheMontant('12', '000'), '12000', 'touche trois zéros');

console.log('\n[2] Correction');
eq(valeurApresToucheMontant('1250', '<'), '125', 'efface le dernier chiffre');
eq(valeurApresToucheMontant('1250', 'clear'), '', 'efface tout');

console.log('\n[3] Garde-fous');
eq(valeurApresToucheMontant('', '000'), '', 'interdit trois zéros comme premier geste');
eq(valeurApresToucheMontant('12345678', '9'), '12345678', 'respecte la longueur maximale');
eq(valeurApresToucheMontant('0', '7'), '7', 'remplace un zéro initial');
eq(valeurApresToucheMontant('12', 'x'), '12', 'ignore une touche inconnue');

console.log(failures === 0 ? '\nTous les tests du pavé montant sont verts ✅\n' : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
