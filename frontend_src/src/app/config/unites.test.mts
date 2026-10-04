/**
 * Garde-fou du VOCABULAIRE D'UNITÉS. Lancer : npm run test:unites
 *
 * Ce que ce fichier interdit, et c'est tout l'enjeu : qu'une même unité
 * réapparaisse un jour sous deux orthographes. Avant ce lot, 7 listes
 * coexistaient avec 12 libellés pour 10 unités réelles — « régimes » vs
 * « régime », « unité » vs « unite ». `SelectWithAutre` comparant par égalité
 * STRICTE, une unité choisie en caisse retombait en « Autre » ailleurs.
 */
import { UNITES, UNITES_CAISSE, UNITES_COURANTES } from './unites.js';

let failures = 0;
function ok(c: boolean, label: string) {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log('  ✅', label);
  else { console.log('  ❌', label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

/** Même clé = même unité, aux accents et au pluriel près. */
const cle = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/s$/, '');

const dictionnaire = Object.values(UNITES);

console.log('le dictionnaire ne contient AUCUNE unité en double');
const parCle = new Map<string, string[]>();
for (const u of dictionnaire) parCle.set(cle(u), [...(parCle.get(cle(u)) ?? []), u]);
const doublons = [...parCle].filter(([, v]) => v.length > 1);
eq(doublons, [], 'aucune orthographe concurrente dans UNITES');
eq(dictionnaire.length, new Set(dictionnaire).size, 'aucun libellé répété');

console.log('\nchaque sélection puise UNIQUEMENT dans le dictionnaire');
for (const [nom, liste] of [['UNITES_CAISSE', UNITES_CAISSE], ['UNITES_COURANTES', UNITES_COURANTES]] as const) {
  const hors = liste.filter((u) => !dictionnaire.includes(u as never));
  eq(hors, [], `${nom} : aucun libellé hors dictionnaire`);
  eq(liste.length, new Set(liste).size, `${nom} : aucun doublon interne`);
}

console.log('\nles deux sélections ne se contredisent pas');
// Une unite presente dans les DEUX doit y porter le MEME libelle. C'est
// exactement ce qui etait casse : regime/regimes, unite/unité.
const communes = UNITES_CAISSE.filter((u) => UNITES_COURANTES.includes(u));
ok(communes.length >= 4, `${communes.length} unités communes aux deux écrans`);
const clesCaisse = new Set(UNITES_CAISSE.map(cle));
const conflits = UNITES_COURANTES.filter((u) => clesCaisse.has(cle(u)) && !UNITES_CAISSE.includes(u));
eq(conflits, [], 'aucune unité commune écrite différemment selon l’écran');

console.log('\nles décisions d’orthographe, verrouillées');
eq(UNITES.REGIME, 'régime', 'REGIME au singulier (dialoguesTata met au pluriel pour la parole)');
eq(UNITES.UNITE, 'unité', 'UNITE avec accent, jamais « unite » ni « pièce »');
ok(!dictionnaire.includes('pièce' as never), '« pièce » n’est plus un libellé');
ok(!dictionnaire.includes('régimes' as never), '« régimes » n’est plus un libellé');

console.log('\nla caisse reste une rangée de gros boutons');
// Garde-fou TERRAIN : si quelqu'un fusionnait les deux listes, la caisse
// afficherait 'tonne' et 'L' — regression pour une marchande qui ne lit pas.
eq(UNITES_CAISSE.length, 6, 'exactement 6 unités en caisse');
ok(!UNITES_CAISSE.includes('tonne'), 'pas de « tonne » en caisse');
ok(!UNITES_CAISSE.includes('L'), 'pas de « L » en caisse');
ok(UNITES_CAISSE.includes('bassine'), '« bassine » reste proposée en caisse');

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log('\nTous les tests unites sont verts ✅');
