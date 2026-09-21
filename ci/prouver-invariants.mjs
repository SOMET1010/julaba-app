#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROUVER LES INVARIANTS — la preuve se PRODUIT, elle ne se rédige pas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POURQUOI CE FICHIER EXISTE (GARDE-03, constat du contre-audit du lot B2).
 * `ci/garde-argent.mjs` lisait le fichier `--preuve` et vérifiait SEULEMENT
 * qu'il contenait les chaînes de commande exigées. Il ne vérifiait jamais que
 * ces commandes avaient tourné, ni qu'elles étaient vertes, ni sur quel état du
 * dépôt. Le fichier n'était même pas commité : il n'en restait aucune trace.
 * Un `printf` de vingt-sept lignes suffisait donc à faire dire au gate « les 27
 * invariants exigés ont tourné ». Sur un projet dont la doctrine est « sur
 * l'argent, la preuve doit TRAVERSER », le gate qui l'impose aux autres
 * reposait, lui, sur la bonne foi de qui l'exécutait.
 *
 *   node ci/prouver-invariants.mjs --base <ref> [--sortie <fichier>]
 *
 * CE QU'IL FAIT. Il demande au garde la liste des invariants EXIGÉS par le
 * diff, les lance UN PAR UN, relève le code de sortie de chacun immédiatement,
 * et écrit un journal JSON qui porte :
 *   • `arbre`   — `git rev-parse HEAD` au moment de l'exécution. Sans lui, on
 *                 prouverait un autre arbre que celui qu'on pousse ;
 *   • `propre`  — l'arbre était-il sans modification non commitée ? Une preuve
 *                 produite sur un arbre sale ne désigne rien de nommable ;
 *   • pour chaque commande : son code de sortie, son début, sa fin.
 *
 * CE QU'IL NE FAIT PAS, ET C'EST VOULU : il n'écarte rien. Un invariant qui
 * échoue ENTRE dans le journal, avec son code. C'est le garde qui refusera —
 * une preuve d'où l'on peut retirer les échecs n'est pas une preuve.
 *
 * CE QU'IL NE PEUT PAS EMPÊCHER. Un journal reste un fichier : quelqu'un de
 * déterminé peut en fabriquer un. Il ne peut plus le faire *sans le savoir*,
 * ni par commodité, et l'arbre prouvé est nommé — c'est ce qui change.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (nom) => { const i = argv.indexOf(nom); return i === -1 ? null : argv[i + 1] ?? null; };

const BASE = opt('--base');
const SORTIE = resolve(opt('--sortie') ?? join(RACINE, 'ci', 'preuve-invariants.json'));

if (!BASE) {
  console.error('Usage : node ci/prouver-invariants.mjs --base <ref> [--sortie <fichier>]');
  process.exit(2);
}

const git = (...a) => execFileSync('git', ['-C', RACINE, ...a], { encoding: 'utf8' }).trim();

// ── L'arbre prouvé, nommé ───────────────────────────────────────────────────
const arbre = git('rev-parse', 'HEAD');
const propre = git('status', '--porcelain') === '';
if (!propre) {
  console.error(
    '\u001b[33m⚠ L’arbre porte des modifications non commitées.\u001b[0m\n' +
    '  La preuve sera produite quand même, mais elle sera REFUSÉE par le garde :\n' +
    '  un arbre sale ne désigne aucun état nommable, et l’on prouverait autre\n' +
    '  chose que ce qui sera poussé. Committe, puis relance.',
  );
}

// ── Les invariants exigés, demandés au garde lui-même ───────────────────────
const liste = spawnSync('node', [join(RACINE, 'ci', 'garde-argent.mjs'), '--base', BASE, '--liste-invariants'],
  { cwd: RACINE, encoding: 'utf8' });
const commandes = (liste.stdout || '')
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('npm run '));

if (!commandes.length) {
  console.log('Aucun invariant exigé par ce diff : le chemin d’argent n’est pas touché.');
  writeFileSync(SORTIE, JSON.stringify({ version: 1, arbre, propre, base: BASE, genereLe: new Date().toISOString(), commandes: [] }, null, 2) + '\n');
  console.log(`Journal écrit : ${SORTIE}`);
  process.exit(0);
}

console.log(`\nPREUVE DES INVARIANTS — ${commandes.length} commande(s), arbre ${arbre.slice(0, 7)}${propre ? '' : ' (SALE)'}\n`);

const journal = [];
let echecs = 0;
for (const commande of commandes) {
  const debut = new Date().toISOString();
  const t0 = Date.now();
  // `shell: true` parce qu'une commande d'invariant est une ligne npm, pas un
  // exécutable : c'est la MÊME chaîne que le garde exige, jouée telle quelle.
  const r = spawnSync(commande, { cwd: RACINE, shell: true, stdio: 'inherit' });
  const code = r.status === null ? 1 : r.status;
  journal.push({ commande, code, debut, fin: new Date().toISOString(), dureeMs: Date.now() - t0 });
  if (code !== 0) echecs++;
  console.log(`  ${code === 0 ? '✓' : '✗'} (${code}) ${commande}`);
}

writeFileSync(SORTIE, JSON.stringify({
  version: 1, arbre, propre, base: BASE, genereLe: new Date().toISOString(), commandes: journal,
}, null, 2) + '\n');

console.log(`\nJournal écrit : ${SORTIE}`);
if (echecs) {
  console.error(`\u001b[31m✗ ${echecs} invariant(s) en échec — le journal les porte, le garde les refusera.\u001b[0m`);
  process.exit(1);
}
console.log('\u001b[32m✓ Tous les invariants exigés ont tourné et sont verts.\u001b[0m');
