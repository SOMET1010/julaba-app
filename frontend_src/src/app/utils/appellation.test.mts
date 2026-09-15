// Appellation — Tata ne se trompe jamais de titre.
// Lancer : npm run test:appellation
import { appellation, salutation } from './appellation.js';

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

console.log('Une marchande');
ok(appellation('femme', 'Awa') === 'Maman Awa', 'Maman + prénom');
ok(appellation('femme', '') === 'ma sœur', 'sans prénom : ma sœur');

console.log('Un marchand — le défaut signalé : il était appelé « Maman »');
ok(appellation('homme', 'Kouassi') === 'Papa Kouassi', 'Papa + prénom');
ok(appellation('homme', '') === 'mon frère', 'sans prénom : mon frère');

console.log('Genre inconnu — on ne devine JAMAIS');
ok(appellation(undefined, 'Awa') === 'Awa', 'prénom seul, aucun titre');
ok(appellation('', 'Awa') === 'Awa', 'genre vide : prénom seul');
ok(appellation('autre', 'Awa') === 'Awa', 'valeur inattendue : prénom seul');
ok(appellation(null, null) === '', 'rien de connu : rien à dire');

console.log('Données réelles : la base n’impose ni casse ni espaces');
ok(appellation('Femme', 'Awa') === 'Maman Awa', 'majuscule acceptée');
ok(appellation('  HOMME  ', 'Kouassi') === 'Papa Kouassi', 'espaces et casse acceptés');
ok(appellation('femme', '  Awa  ') === 'Maman Awa', 'prénom nettoyé');

console.log('Salutation complète');
ok(salutation('femme', 'Awa') === 'Bonjour Maman Awa', 'femme');
ok(salutation('homme', 'Kouassi') === 'Bonjour Papa Kouassi', 'homme');
ok(salutation(undefined, undefined) === 'Bonjour', 'rien de connu : « Bonjour » et rien de faux');

if (failures > 0) { console.error(`\n✗ ${failures} échec(s)`); process.exit(1); }
console.log('\n✓ appellation — tous les cas passent');
