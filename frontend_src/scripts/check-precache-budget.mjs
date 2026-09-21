/**
 * BUDGET DE PRÉ-CACHE — ce que coûte la PREMIÈRE INSTALLATION, en chiffres.
 * Lancer (après `npm run build`) : npm run check:precache-budget
 *
 * POURQUOI CE GATE EXISTE. Rendre l'application utilisable hors ligne est une
 * promesse faite au terrain, et elle se paie à l'installation, sur des données
 * mobiles, sur un téléphone d'entrée de gamme qui a parfois 300 Mo libres. Une
 * intention — « précachons les images et les polices » — ne dit rien de ce
 * qu'elle coûte : la reprise Manus (B6) visait juste et aurait fait passer le
 * pré-cache de 4,6 Mo à 13–18 Mo attendus. Une application qui ne s'installe
 * pas ne se voit pas depuis un poste de développement : elle se voit au marché,
 * trop tard.
 *
 * Ce script mesure ce qui ENTRE RÉELLEMENT au cache — la liste tamponnée dans
 * `sw.js` au build, pas une liste d'intentions — et refuse le dépassement.
 *
 * CE QU'IL NE MESURE PAS : le temps réel d'installation sur un réseau lent.
 * Le débit se mesure au terrain ; ici on borne ce qui le détermine, la taille.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve(process.cwd(), '../frontend/dist');

// ── Les plafonds, et la raison de chacun ────────────────────────────────────
//
// TOTAL : ce que la marchande télécharge la première fois. Mesuré à 10,45 Mo
// après l'entrée des polices (21/09/2026). Le plafond laisse de la marge pour
// quelques écrans de plus, et arrête net un « tout précacher » : les 4 gros
// chunks volontairement exclus pèsent à eux seuls 1,84 Mo.
const BUDGET_TOTAL_OCTETS = 12 * 1024 * 1024;
// BLOQUANT : ce qui doit être là avant que l'application s'ouvre hors ligne.
// Les clips de voix, eux, se remplissent en tâche de fond (voir sw.js).
const BUDGET_BLOQUANT_OCTETS = 6 * 1024 * 1024;
// La voix hors ligne est une PROMESSE TERRAIN : ces clips ne doivent jamais
// sortir du pré-cache par mégarde, à l'occasion d'une « optimisation ».
const MIN_CLIPS_VOIX = 100;

const mo = (n) => (n / 1024 / 1024).toFixed(2) + ' Mo';
const ko = (n) => Math.round(n / 1024) + ' Ko';

let sw;
try {
  sw = readFileSync(join(DIST, 'sw.js'), 'utf-8');
} catch {
  console.error('✗ ../frontend/dist/sw.js introuvable — lancez d’abord `npm run build`.');
  process.exit(2);
}

const liste = (nom) => {
  const m = sw.match(new RegExp(`const ${nom} = _safeParse\\('(.*?)'\\)`, 's'));
  if (!m) throw new Error(`liste ${nom} introuvable dans sw.js`);
  try { return JSON.parse(m[1]); } catch { return []; }
};

const poids = (urls) => urls.reduce((somme, u) => {
  try { return somme + statSync(join(DIST, u)).size; } catch { return somme; }
}, 0);

const bloquant = liste('PRECACHE');
const voix = liste('PRECACHE_VOICE');
const octetsBloquant = poids(bloquant);
const octetsVoix = poids(voix);
const total = octetsBloquant + octetsVoix;

// Ventilation, pour que le chiffre soit lisible et non un total opaque.
const parType = {};
for (const u of bloquant) {
  const ext = (u.match(/\.([a-z0-9]+)$/i) || [, 'autre'])[1].toLowerCase();
  let taille = 0;
  try { taille = statSync(join(DIST, u)).size; } catch { /* absent */ }
  parType[ext] = parType[ext] || { n: 0, octets: 0 };
  parType[ext].n++; parType[ext].octets += taille;
}

console.log('\nBUDGET DE PRÉ-CACHE — première installation');
console.log('──────────────────────────────────────────────');
for (const [ext, v] of Object.entries(parType).sort((a, b) => b[1].octets - a[1].octets)) {
  console.log(`  ${String(ext).padEnd(6)} ${String(v.n).padStart(4)} fichier(s)  ${ko(v.octets).padStart(9)}`);
}
console.log(`  ${'clips'.padEnd(6)} ${String(voix.length).padStart(4)} fichier(s)  ${ko(octetsVoix).padStart(9)}  (tâche de fond)`);
console.log('──────────────────────────────────────────────');
console.log(`  bloquant : ${mo(octetsBloquant)}  (plafond ${mo(BUDGET_BLOQUANT_OCTETS)})`);
console.log(`  voix     : ${mo(octetsVoix)}`);
console.log(`  TOTAL    : ${mo(total)}  (plafond ${mo(BUDGET_TOTAL_OCTETS)})`);

// Ce qui est VOLONTAIREMENT laissé dehors — le chiffre du « non ».
try {
  const dedans = new Set(bloquant.map((u) => u.replace('/assets/', '')));
  const dehors = readdirSync(join(DIST, 'assets'))
    .filter((f) => (f.endsWith('.js') || f.endsWith('.css')) && !dedans.has(f));
  const octetsDehors = dehors.reduce((s, f) => s + statSync(join(DIST, 'assets', f)).size, 0);
  console.log(`\n  laissés hors du pré-cache, volontairement : ${dehors.length} chunk(s), ${mo(octetsDehors)}`);
  console.log('  (ils se chargent à la première visite en ligne, puis sont mis en cache)');
} catch { /* pas bloquant */ }

const echecs = [];
if (total > BUDGET_TOTAL_OCTETS) echecs.push(`le pré-cache total dépasse le plafond : ${mo(total)} > ${mo(BUDGET_TOTAL_OCTETS)}`);
if (octetsBloquant > BUDGET_BLOQUANT_OCTETS) echecs.push(`le pré-cache bloquant dépasse le plafond : ${mo(octetsBloquant)} > ${mo(BUDGET_BLOQUANT_OCTETS)}`);
if (voix.length < MIN_CLIPS_VOIX) echecs.push(`la voix hors ligne a disparu du pré-cache : ${voix.length} clip(s) < ${MIN_CLIPS_VOIX} — c'est une promesse faite au terrain`);
if (!Object.keys(parType).some((e) => e === 'woff2' || e === 'woff')) echecs.push('aucune police au pré-cache : un premier lancement hors ligne s’afficherait dans une police de repli');

if (echecs.length) {
  console.error('\n' + echecs.map((e) => `✗ ${e}`).join('\n'));
  console.error('\n  Un dépassement n’est pas un détail de build : c’est une installation qui\n  échoue sur un téléphone plein, et une marchande qui n’a pas l’application.');
  process.exit(1);
}
console.log('\n✓ Budget de pré-cache respecté.');
