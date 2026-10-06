import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const racines = ['src', 'public'];
const extensions = new Set(['.ts', '.tsx', '.mts', '.js', '.mjs']);
const ancienNom = 'Tata Nanti Lou';
const nomOfficiel = 'Tantie Nanti Lou';
const anciens = [];
let occurrencesOfficielles = 0;

function parcourir(chemin) {
  for (const nom of readdirSync(chemin)) {
    const cible = join(chemin, nom);
    const info = statSync(cible);
    if (info.isDirectory()) {
      parcourir(cible);
      continue;
    }
    if (!extensions.has(extname(cible))) continue;
    const contenu = readFileSync(cible, 'utf8');
    if (contenu.includes(ancienNom)) anciens.push(cible);
    occurrencesOfficielles += contenu.split(nomOfficiel).length - 1;
  }
}

for (const racine of racines) parcourir(racine);

if (anciens.length > 0) {
  console.error(`Ancien nom encore présent dans ${anciens.length} fichier(s) :`);
  for (const fichier of anciens) console.error(`- ${fichier}`);
  process.exit(1);
}
if (occurrencesOfficielles < 20) {
  console.error(`Le nom officiel semble incomplet : ${occurrencesOfficielles} occurrence(s) seulement.`);
  process.exit(1);
}

console.log(`✓ nom officiel Tantie Nanti Lou : ${occurrencesOfficielles} occurrences, aucun ancien libellé`);
