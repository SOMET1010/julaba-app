/**
 * Fabrique le sous-ensemble d'icônes Tabler embarqué dans l'application.
 *
 * Pourquoi : le paquet complet, c'est 462 Ko de police + 211 Ko de CSS pour
 * 5 193 icônes. L'application en utilise 19. On embarquait tout cela depuis un
 * CDN distant : sans réseau, aucune icône ; et en `@latest`, la version pouvait
 * changer sous nos pieds entre deux lancements.
 *
 * Ce script produit deux fichiers COMMITÉS — le build normal n'a donc besoin ni
 * de Python ni de ce script :
 *   src/assets/fonts/tabler-subset.woff2
 *   src/styles/icons-tabler.css
 *
 * À relancer UNIQUEMENT si on ajoute une icône. Si on oublie, `npm run verify`
 * échoue — scripts/test-icones.mjs monte la garde.
 *
 *   npm i -D --no-save @tabler/icons-webfont   # 125 paquets, NON déclarés
 *   pip install fonttools brotli
 *   node frontend_src/scripts/generer-icones.mjs
 *
 * Le paquet n'est volontairement PAS une devDependency : il tire 125 paquets
 * d'outillage (svgtofont, svgo, ttf2woff2…) que ni le build, ni les tests, ni
 * la CI, ni la construction de l'APK n'ont besoin de télécharger.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogueTabler, iconesUtilisees } from './icones-tabler.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const POLICE_COMPLETE = join(ICI, '..', '..', 'node_modules', '@tabler', 'icons-webfont', 'dist', 'fonts', 'tabler-icons.woff2');
const DOSSIER_POLICE = join(ICI, '..', 'src', 'assets', 'fonts');
const SORTIE_POLICE = join(DOSSIER_POLICE, 'tabler-subset.woff2');
const SORTIE_CSS = join(ICI, '..', 'src', 'styles', 'icons-tabler.css');

let catalogue;
try {
  catalogue = catalogueTabler();
} catch {
  console.error('@tabler/icons-webfont est absent — il n\'est pas déclaré, c\'est voulu.');
  console.error('Installe-le le temps de la génération :');
  console.error('  npm i -D --no-save @tabler/icons-webfont');
  process.exit(1);
}
const icones = iconesUtilisees();
const points = icones.map((nom) => catalogue.get(nom));

mkdirSync(DOSSIER_POLICE, { recursive: true });
execFileSync('python3', [
  '-m', 'fontTools.subset', POLICE_COMPLETE,
  `--unicodes=${points.map((p) => 'U+' + p.toString(16)).join(',')}`,
  '--flavor=woff2',
  '--output-file=' + SORTIE_POLICE,
], { stdio: 'inherit' });

const regles = icones
  .map((nom) => `.ti-${nom}:before { content: "\\${catalogue.get(nom).toString(16)}"; }`)
  .join('\n');

writeFileSync(SORTIE_CSS, `/* FICHIER GÉNÉRÉ — ne pas modifier à la main.
   Produit par scripts/generer-icones.mjs à partir de @tabler/icons-webfont.
   Contient EXACTEMENT les ${icones.length} icônes que l'application utilise, et rien
   d'autre : la police complète pèse 462 Ko pour 5 193 icônes dont on n'en
   affiche que ${icones.length}. Plus aucun appel réseau : la police est embarquée.
   Pour ajouter une icône : l'utiliser dans le code, puis relancer le script.
   Si on oublie, npm run verify échoue (scripts/test-icones.mjs). */

@font-face {
  font-family: "tabler-icons";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url("../assets/fonts/tabler-subset.woff2") format("woff2");
}

.ti {
  font-family: "tabler-icons" !important;
  font-style: normal;
  font-weight: 400 !important;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  speak: never;
  display: inline-block;
}

${regles}
`);

console.log(`${icones.length} icônes embarquées : ${icones.join(' ')}`);
console.log(`police : ${(statSync(SORTIE_POLICE).size / 1024).toFixed(1)} Ko (contre 462 Ko pour la complète)`);
console.log(`css    : ${(statSync(SORTIE_CSS).size / 1024).toFixed(1)} Ko (contre 211 Ko pour le complet)`);
