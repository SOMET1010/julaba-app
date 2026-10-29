/**
 * A11Y-006 — la dette de couleurs hard-codées est FIGÉE, elle ne peut que
 * descendre.
 * Lancer : npm run test:charte-globale   (node, lecture du source)
 *
 * LE DÉFAUT QU'ON FERME. La règle de la maison dit : les couleurs vivent
 * dans les tokens (commerce.css --caisse-*, --commerce-*), pas dans les
 * composants — la caisse l'applique (caisseCharte.test.mts, zéro hex dans
 * POSCaisse/MicroVenteCaisse/ChoixUnite). Le RESTE du frontend ne suit pas :
 * le 29/10, la mesure donne 4240 hexadécimaux dans 542 fichiers (hors
 * commentaires, hors bancs). Chaque hex en dur est un contraste que les
 * trois confits (normal/soleil/sombre) ne peuvent pas vérifier, et un
 * changement de planche qui ne se propage pas.
 *
 * POURQUOI « PAS D'AGGRAVATION » ET PAS « ZÉRO HEX MAINTENANT ». Remettre
 * 4240 couleurs au token est un chantier de mois, et CHAQUE remise est un
 * changement visuel qu'il faut prouver sur l'écran (capture, terrain) —
 * les faire en bloc est un risque de régression non prouvée. La garde
 * honnête : figer la base à la mesure du 29/10, refuser TOUTE hausse, et
 * saluer chaque baisse. Les rangs suivants descendent le chiffre rang par
 * rang, périmètre par périmètre, avec preuve visuelle par périmètre.
 *
 * CE QUE COMPTE LE COMPTEUR. `#rgb` à `#rrggbbaa` dans le SOURCE (tsx/mts),
 * commentaires strippés (une phrase qui RAconte une couleur n'est pas une
 * couleur), bancs exclus (un test qui affirme « ce hex est interdit » a
 * besoin d'écrire le hex). Les faux positifs possibles (`#cafe` dans un
 * href d'ancre) sont constants d'un run à l'autre : ils ne peuvent pas
 * masquer une vraie hausse, et la base est là pour ça.
 *
 * QUAND TU BAISSES LA DETTE. Répare le périmètre, relance ce banc, et
 * DÉSCENDS `BASE` dans ce fichier avec la référence du commit qui prouve
 * le périmètre réparé. Une base qu'on ne descend pas est une dette qu'on
 * assume sans le dire.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', 'src');

/** La dette mesurée au 29/10/2026, arbre `594e2df0` : 4240 hexadécimaux
 *  (hors commentaires, hors bancs). Elle ne peut que DESCENDRE. */
const BASE = 4240;

const sansCommentaires = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let total = 0;
let fichiers = 0;
const pires = [];

const marcher = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { marcher(p); continue; }
    if (!/\.(ts|tsx|mts)$/.test(e.name)) continue;
    if (/\.test\./.test(e.name)) continue;
    const hex = sansCommentaires(readFileSync(p, 'utf8')).match(/#[0-9a-f]{3,8}\b/gi) || [];
    if (hex.length > 0) pires.push([p, hex.length]);
    total += hex.length;
    fichiers++;
  }
};
marcher(RACINE);
pires.sort((a, b) => b[1] - a[1]);

let echecs = 0;
const ok = (c, quoi) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };

console.log('\nA11Y-006 — la dette hexadécimale ne monte plus\n');

ok(total <= BASE,
   total === BASE
     ? `la dette est exactement à sa base (${total} hex dans ${fichiers} fichiers) — rien n'a empiré`
     : total < BASE
       ? `la dette a BAISSÉ : ${total} hex contre ${BASE} en base (${BASE - total} réparés) — DÉSCENDS la constante BASE dans ce banc, avec la référence du commit qui prouve le périmètre réparé`
       : `la dette a GRIMPÉ : ${total} hex contre ${BASE} en base (+${total - BASE}) — aucune nouvelle couleur en dur n'entre dans le code, mets-la en token`);

if (total > BASE) {
  console.log('  principaux détenteurs :');
  for (const [p, n] of pires.slice(0, 5)) console.log(`    ${n} × ${p}`);
}

console.log(echecs === 0
  ? '\n✅ la base est tenue — la prochaine étape est de la descendre, pas de la monter\n'
  : '\n❌ la dette a grossi — token obligatoire pour toute nouvelle couleur\n');
process.exit(echecs === 0 ? 0 : 1);
