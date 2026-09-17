// Appellation — on appelle la personne comme ELLE l'a demandé.
// Lancer : npm run test:appellation
import { appellation, salutation } from './appellation.js';

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

console.log('Elle a dit comment elle veut qu’on l’appelle');
ok(appellation('Maman Awa', 'Awa') === 'Maman Awa', 'son choix est employé tel quel');
ok(appellation('Tantie Awa', 'Awa') === 'Tantie Awa', 'un autre choix, tout aussi respecté');
ok(appellation('Papa Kouassi', 'Kouassi') === 'Papa Kouassi', 'un marchand choisit son titre');
ok(appellation('  Maman Awa  ', 'Awa') === 'Maman Awa', 'espaces nettoyés');

console.log('Elle n’a rien dit — le prénom seul, JAMAIS un titre deviné');
ok(appellation(undefined, 'Awa') === 'Awa', 'prénom seul');
ok(appellation('', 'Kouassi') === 'Kouassi', 'choix vide : prénom seul');
ok(appellation('   ', 'Awa') === 'Awa', 'choix en blancs : prénom seul');
ok(appellation(null, null) === '', 'rien de connu : rien à dire');

console.log('Le genre n’entre JAMAIS dans la décision');
// Garde de doctrine : la signature n'accepte pas de genre. Si quelqu'un
// rebranche un titre sur `users.genre` (valeur par défaut 'femme'), il
// inventera un titre pour tout le monde — c'est le défaut qu'on répare.
ok(appellation.length === 2, 'la fonction ne prend que le choix et le prénom');

console.log('Salutation complète');
ok(salutation('Maman Awa', 'Awa') === 'Bonjour Maman Awa', 'avec son choix');
ok(salutation(undefined, 'Kouassi') === 'Bonjour Kouassi', 'sans choix : prénom seul');
ok(salutation(undefined, undefined) === 'Bonjour', 'rien de connu : « Bonjour », et rien de faux');

if (failures > 0) { console.error(`\n✗ ${failures} échec(s)`); process.exit(1); }
console.log('\n✓ appellation — tous les cas passent');
