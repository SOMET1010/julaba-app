/**
 * DOCTRINE DU PRÉ-CACHE — ce qu'on refuse d'emporter, et ce qu'on refuse de perdre.
 * Lancer : npm run test:precache-doctrine   (aucun build requis)
 *
 * DEUX GARDES, DEUX DANGERS OPPOSÉS.
 *
 *  A. LE « TOUT PRÉCACHER ». C'est l'écueil de la reprise B6 : l'intention est
 *     juste (être utilisable hors ligne), le coût ne l'est pas — 4,6 Mo qui
 *     passent à 13–18 Mo à la première installation, sur des données mobiles,
 *     sur un téléphone qui a parfois 300 Mo libres. Le plafond en octets est
 *     tenu par `check:precache-budget`, qui a besoin d'un build ; ici on garde
 *     la RÈGLE, qui se lit dans le source : les gros chunks restent dehors.
 *
 *  B. LA PERTE SILENCIEUSE DE LA VOIX. Les clips de Tantie sont pré-cachés
 *     pour qu'une marchande hors ligne l'entende dès le premier jour. C'est une
 *     promesse faite au terrain : elle ne doit pas disparaître à l'occasion
 *     d'une optimisation de taille, qui est exactement le genre de changement
 *     qu'on fait en croyant bien faire.
 *
 * Ce gate lit le SOURCE (`vite.config.ts`, `public/sw.js`) : il tient donc dans
 * `verify`, sans build.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const vite = readFileSync(join(ICI, '..', 'vite.config.ts'), 'utf-8');
const sw = readFileSync(join(ICI, '..', 'public', 'sw.js'), 'utf-8');

let echecs = 0;
const ok = (cond, quoi) => {
  if (cond) console.log('  ✅', quoi);
  else { console.log('  ❌', quoi); echecs++; }
};

console.log('\n[A] Le « tout précacher » reste refusé');
ok(/PRECACHE_MAX_BYTES\s*=\s*\d+\s*\*\s*1024/.test(vite),
  'un plafond par fichier existe pour les chunks pré-cachés');
ok(/size <= PRECACHE_MAX_BYTES/.test(vite),
  'et il est réellement appliqué au filtrage (les gros chunks restent dehors)');
{
  const m = vite.match(/PRECACHE_MAX_BYTES\s*=\s*(\d+)\s*\*\s*1024/);
  const ko = m ? Number(m[1]) : Infinity;
  ok(ko <= 250, `le plafond par fichier reste serré : ${ko} Ko (≤ 250)`);
}

console.log('\n[B] Les polices entrent, et seulement elles en plus');
ok(/\\?\.\(woff2\?\|ttf\|otf\)/.test(vite) || /woff2\?\|ttf\|otf/.test(vite),
  'les polices (woff/woff2/ttf/otf) sont ajoutées au pré-cache');
ok(!/readdirSync\(assetsDir\)\s*\.map\(/.test(vite),
  'aucun ajout non filtré du dossier assets (ce serait le « tout précacher »)');
ok(!/precache\s*=\s*precache\.concat\(\s*readdirSync\(join\(outDir, "images"\)/.test(vite),
  'les images publiques ne sont PAS pré-cachées : elles ne coûtent rien à l’installation');

console.log('\n[C] La voix hors ligne ne se perd pas');
ok(/voicePrecache/.test(vite) && /\.mp3/.test(vite),
  'la liste des clips de voix est toujours construite au build');
ok(/__PRECACHE_VOICE_JSON__/.test(vite) && /__PRECACHE_VOICE_JSON__/.test(sw),
  'elle est toujours injectée dans le service worker');
ok(/PRECACHE_VOICE\.map\(\(u\) => cache\.add\(u\)\)/.test(sw),
  'et le service worker la met toujours au cache à l’installation');
ok(!/await\s+Promise\.allSettled\(PRECACHE_VOICE/.test(sw),
  'sans bloquer la première ouverture : les clips se remplissent en tâche de fond');

console.log('\n[D] Ce qui est immuable est servi CACHE D’ABORD');
for (const chemin of ['/assets/', '/voix/', '/images/']) {
  ok(sw.includes(`url.pathname.startsWith('${chemin}')`), `${chemin} est servi cache d’abord (pas d’attente sur un réseau mort)`);
}
ok(/url\.pathname\.startsWith\('\/api'\)\) return/.test(sw), '/api n’est jamais mis en cache');
ok(/url\.pathname\.startsWith\('\/backoffice'\)\) return/.test(sw), '/backoffice non plus');

console.log(echecs === 0
  ? '\nDoctrine du pré-cache tenue : on n’emporte pas tout, et on ne perd pas la voix ✅'
  : `\n${echecs} échec(s) ❌`);
process.exit(echecs ? 1 : 0);
