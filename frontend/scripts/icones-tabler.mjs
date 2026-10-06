/**
 * Source de vérité unique des icônes Tabler utilisées par l'application.
 *
 * Sert à DEUX choses, et c'est volontaire (Constitution, principe 2) :
 *   1. générer le sous-ensemble de police embarqué (scripts/generer-icones.mjs) ;
 *   2. garder ce sous-ensemble honnête (scripts/test-icones.mjs, dans `verify`).
 *
 * Méthode : on ramasse ce qui ressemble à `ti-quelque-chose` dans le code
 * source. La frontière de mot (\b) écarte d'elle-même les faux positifs des
 * commentaires français — « anti-boucle », « multi-appareils » : entre le « n »
 * et le « ti » il n'y a pas de frontière. Vérifié : le relevé donne exactement
 * les mêmes 19 icônes qu'un filtrage contre le catalogue officiel complet.
 *
 * Volontairement SANS dépendance : ce fichier tourne dans `npm run verify`, et
 * @tabler/icons-webfont traîne 125 paquets d'outillage derrière lui. Ils ne
 * sont nécessaires QUE pour régénérer la police (voir generer-icones.mjs).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
export const RACINE_SRC = join(ICI, '..', 'src');
export const CSS_CATALOGUE = join(
  ICI, '..', '..', 'node_modules', '@tabler', 'icons-webfont', 'dist', 'tabler-icons.min.css',
);

/** Tous les fichiers de code source, récursivement. */
function fichiersSource(dossier, acc = []) {
  for (const entree of readdirSync(dossier)) {
    if (entree === 'node_modules') continue;
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) fichiersSource(chemin, acc);
    else if (/\.(tsx?|mts|css)$/.test(entree)) acc.push(chemin);
  }
  return acc;
}

/** Catalogue officiel : nom d'icône -> point de code, lu dans le CSS du paquet. */
export function catalogueTabler() {
  const css = readFileSync(CSS_CATALOGUE, 'utf8');
  const table = new Map();
  for (const m of css.matchAll(/\.ti-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-f]+)"/gi)) {
    table.set(m[1], parseInt(m[2], 16));
  }
  if (table.size === 0) throw new Error('Catalogue Tabler illisible : aucune icône trouvée.');
  return table;
}

/** Les icônes que l'application utilise réellement, triées. */
export function iconesUtilisees() {
  const trouvees = new Set();
  for (const fichier of fichiersSource(RACINE_SRC)) {
    const texte = readFileSync(fichier, 'utf8');
    // 1. les classes écrites en dur : className="ti ti-check"
    for (const m of texte.matchAll(/\bti-([a-z0-9-]+)/g)) {
      trouvees.add(m[1]);
    }
    // 2. le composant maison : <TablerIcon name="map-pin" />
    for (const m of texte.matchAll(/<TablerIcon[\s\S]{0,120}?name=["']([a-z0-9-]+)["']/g)) {
      trouvees.add(m[1]);
    }
  }
  return [...trouvees].sort();
}
