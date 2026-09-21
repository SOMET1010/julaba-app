/**
 * COMPTE LES LIGNES DU REGISTRE MAÎTRE, par script et non à l'œil (lot A8).
 *
 * Pourquoi un script : à 100 lignes et plus, un recomptage manuel se trompe, et
 * une regex naïve sur `| **STATUT** |` en rate cinq — des lignes anciennes dont
 * le statut n'est pas en gras, ou porte une glose (« FERMÉ (…) »), ou dont la
 * colonne Gravité contient elle-même le mot. On reconnaît donc une ligne de
 * dette à sa FORME : une ligne de tableau dont la 1re cellule est un
 * identifiant (LETTRES-chiffres) et dont la 3e cellule contient l'un des trois
 * statuts. Les lignes mal formées sont listées à part, pour qu'on sache
 * lesquelles sont comptées par tolérance et non par conformité.
 *
 *   node docs/dette/compter-registre.mjs [chemin]
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const chemin = process.argv[2] ? resolve(process.argv[2]) : resolve(ici, 'REGISTRE-MAITRE.md');
const lignes = readFileSync(chemin, 'utf8').split('\n');

const STATUTS = ['HORS PÉRIMÈTRE JUSTIFIÉ', 'FERMÉ', 'OUVERT'];
const nu = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();
// Un identifiant de dette : ARG-11, UI-05, AUTH-RECOVERY-01, SCHEMA-08… et les
// trois identifiants COMPOSITES hérités des premiers audits (« ARG-01 / B3 »),
// que toute regex ancrée sur la fin de cellule laisse tomber en silence.
const ID = /^[A-ZÉÈÀÇ]{2,}(?:-[A-ZÉÈÀÇ]+)*-\d{2}[a-z]?(\s*\/\s*\S.*)?$/;
// Les tableaux de dette ont SIX colonnes. Les annexes (« Ce que le contre-audit
// a corrigé », listes de sujets) en ont deux ou trois et portent les mêmes
// identifiants : les compter doublerait des lignes déjà comptées.
const COLONNES_DETTE = 5;

const comptes = Object.fromEntries(STATUTS.map(s => [s, 0]));
const toutes = [];
const malFormees = [];

for (const [i, ligne] of lignes.entries()) {
  if (!ligne.startsWith('|')) continue;
  const cell = ligne.split('|').slice(1, -1);
  if (cell.length < COLONNES_DETTE) continue;
  const id = nu(cell[0]);
  if (!ID.test(id)) continue;
  const gravite = nu(cell[1]);
  const brut = nu(cell[2]);
  // Le statut : le premier des trois qui apparaît dans la 3e cellule.
  const statut = STATUTS.find(s => brut.includes(s)) || null;
  if (!statut) { malFormees.push({ n: i + 1, id, raison: `3e cellule sans statut reconnu : « ${brut.slice(0, 40)} »` }); continue; }
  // Conforme = statut SEUL et en gras, tel que le registre l'écrit depuis la révision 20.
  const idConforme = /^[A-ZÉÈÀÇ]{2,}(?:-[A-ZÉÈÀÇ]+)*-\d{2}[a-z]?$/.test(id);
  const statutConforme = /^\*\*[^*]+\*\*$/.test(cell[2].trim()) && nu(cell[2]) === statut;
  const conforme = idConforme && statutConforme;
  if (!conforme) malFormees.push({ n: i + 1, id, raison: !idConforme
    ? `identifiant composite « ${id} » (hérité des premiers audits)`
    : `statut « ${brut} » non conforme (attendu « **${statut}** » seul et en gras)` });
  comptes[statut] += 1;
  toutes.push({ n: i + 1, id, gravite, statut });
}

const total = toutes.length;
console.log(`Registre : ${chemin}`);
for (const s of STATUTS) console.log(`  ${String(comptes[s]).padStart(3)}  ${s}`);
console.log(`  ${String(total).padStart(3)}  LIGNES AU TOTAL`);
const dbl = toutes.map(l => l.id).filter((v, i, a) => a.indexOf(v) !== i);
if (dbl.length) console.log(`\n⚠ identifiants en double : ${[...new Set(dbl)].join(', ')}`);
if (malFormees.length) {
  console.log(`\n${malFormees.length} ligne(s) MAL FORMÉE(S) — comptées par tolérance, à normaliser :`);
  for (const m of malFormees) console.log(`  l. ${m.n}  ${m.id} — ${m.raison}`);
}
