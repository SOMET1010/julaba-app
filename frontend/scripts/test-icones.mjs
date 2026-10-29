/**
 * Garde-fou du sous-ensemble d'icônes.
 *
 * Le danger d'une police découpée : quelqu'un écrit `ti ti-camera`, l'icône
 * n'est pas dans le sous-ensemble, et l'écran affiche un carré vide — sans
 * aucune erreur. Pour une marchande qui ne lit pas, une icône manquante n'est
 * pas un détail : c'est le sens qui disparaît.
 *
 * Ce test compare ce que le code UTILISE à ce que la feuille EMBARQUE, et
 * échoue sur la moindre différence. Il tourne dans `npm run verify`.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconesUtilisees } from './icones-tabler.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const CSS_EMBARQUE = join(ICI, '..', 'src', 'styles', 'icons-tabler.css');

const utilisees = iconesUtilisees();
const css = readFileSync(CSS_EMBARQUE, 'utf8');
const embarquees = new Set([...css.matchAll(/\.ti-([a-z0-9-]+):before/g)].map((m) => m[1]));

const manquantes = utilisees.filter((n) => !embarquees.has(n));
const inutiles = [...embarquees].filter((n) => !utilisees.includes(n)).sort();

console.log('Icônes Tabler embarquées');
console.log(`  utilisées par le code ... : ${utilisees.length}`);
console.log(`  présentes dans la police . : ${embarquees.size}`);

let echecs = 0;

if (manquantes.length === 0) {
  console.log('  ✓ aucune icône utilisée ne manque à l’appel');
} else {
  echecs++;
  console.log(`  ✗ ${manquantes.length} icône(s) utilisée(s) mais PAS embarquée(s) : ${manquantes.join(' ')}`);
  console.log('    → elles s’afficheraient en carré vide. Relance :');
  console.log('      node scripts/generer-icones.mjs   (puis commit la police et le CSS)');
}

if (inutiles.length === 0) {
  console.log('  ✓ aucune icône embarquée pour rien');
} else {
  echecs++;
  console.log(`  ✗ ${inutiles.length} icône(s) embarquée(s) mais plus utilisée(s) : ${inutiles.join(' ')}`);
  console.log('    → poids mort (Constitution, principe 5). Relance le générateur.');
}

// Le CDN ne doit jamais revenir : c'est tout l'objet du chantier.
const html = readFileSync(join(ICI, '..', 'index.html'), 'utf8');
const appelsDistants = [...html.matchAll(/https?:\/\/[^"'\s]+/g)]
  .map((m) => m[0])
  .filter((u) => !u.startsWith('http://www.w3.org/'));
if (appelsDistants.length === 0) {
  console.log('  ✓ index.html n’appelle aucune ressource distante');
} else {
  echecs++;
  console.log(`  ✗ index.html appelle encore : ${appelsDistants.join(' ')}`);
  console.log('    → au premier lancement sans réseau, cette ressource manque.');
}

if (echecs > 0) {
  console.log('\n✗ icônes — échec');
  process.exit(1);
}
console.log('\n✓ icônes — tous les cas passent');
