#!/usr/bin/env node
/**
 * AUCUN BANC N'EST ÉCRIT POUR RIEN — VER-02, 03/10/2026.
 *
 * LE DÉFAUT. Le 03/10, le dépôt comptait 165 scripts `test:*`. Six n'étaient
 * dans AUCUNE chaîne — ni `verify`, ni `test:ci` : `test:argent-parle`,
 * `test:intentions`, `test:montants-prives`, `test:accueil-pilote`,
 * `test:entree-unique`, `test:nom-tantie`. Écrits, commités, relus… et jamais
 * exécutés. Deux d'entre eux étaient rouges.
 *
 * C'est le même défaut que VER-01 sous un autre angle : une garde qui ne
 * s'exécute pas est pire qu'absente, parce qu'elle rassure.
 *
 * LA RÈGLE QUE CE BANC FIGE. Tout script `test:*` doit se trouver à l'un de
 * ces trois endroits, et nulle part ailleurs :
 *   · dans `maillons` de scripts/maillons-verify.json  (il tourne à chaque verify) ;
 *   · dans `test:ci`                                   (figé à 44, hors de notre main) ;
 *   · dans `horsVerify`                                AVEC un motif écrit.
 *
 * LE MOTIF EST OBLIGATOIRE, ET C'EST LE CŒUR. « Hors verify » doit être une
 * DÉCISION qu'on peut relire, jamais un oubli. Une entrée sans explication est
 * refusée comme un orphelin.
 */
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const { maillons, horsVerify } = JSON.parse(
  readFileSync(new URL('./maillons-verify.json', import.meta.url), 'utf8'),
);

let echecs = 0;
const ok = (c, quoi) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };

console.log('\nAucun banc n\'est écrit pour rien\n');

const dansCi = (pkg.scripts['test:ci'] ?? '').split('&&').map(s => s.trim().replace(/^npm run /, ''));
const tous = Object.keys(pkg.scripts).filter(k => k.startsWith('test:') && k !== 'test:ci');

const orphelins = tous.filter(k => !maillons.includes(k) && !dansCi.includes(k) && !(k in horsVerify));
ok(orphelins.length === 0,
   orphelins.length === 0
     ? `les ${tous.length} scripts test:* sont tous rattachés (verify, test:ci, ou hors-verify motivé)`
     : `${orphelins.length} banc(s) ORPHELIN(S), dans aucune chaîne : ${orphelins.join(', ')}`);

const sansMotif = Object.entries(horsVerify).filter(([, motif]) => !motif || String(motif).trim().length < 20);
ok(sansMotif.length === 0,
   sansMotif.length === 0
     ? 'chaque script hors-verify porte un motif écrit — une décision, pas un oubli'
     : `hors-verify sans motif lisible : ${sansMotif.map(([k]) => k).join(', ')}`);

const fantomes = maillons.filter(m => !pkg.scripts[m]);
ok(fantomes.length === 0,
   fantomes.length === 0
     ? `les ${maillons.length} maillons de verify existent tous dans package.json`
     : `maillons sans script : ${fantomes.join(', ')}`);

const doublons = maillons.filter((m, i) => maillons.indexOf(m) !== i);
ok(doublons.length === 0,
   doublons.length === 0 ? 'aucun maillon n\'est listé deux fois' : `doublons : ${doublons.join(', ')}`);

// VER-01 — ET verify NE DOIT PLUS JAMAIS ÊTRE UNE CHAÎNE `&&`.
ok(/verify-tout\.mjs/.test(pkg.scripts.verify ?? ''),
   'verify appelle le runner exhaustif, et non une chaîne && qui s\'arrête au premier rouge');
ok(!/&&/.test(pkg.scripts.verify ?? ''),
   'verify ne contient aucun && : un rouge ne peut plus cacher les maillons suivants');

console.log(echecs === 0
  ? '\n✅ Tout banc écrit est rattaché, et tout écart est motivé.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
