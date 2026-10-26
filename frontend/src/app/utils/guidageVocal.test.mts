/**
 * Tests de la décision de guidage vocal (guidageActif, pur — sans localStorage).
 * Règle : le guidage n'est coupé QUE si l'utilisatrice a explicitement choisi
 * « lecture ». « Automatique » ne devient jamais muet.
 * Lancer : npm run test:guidage
 */
import { guidageActif } from "./accessMode.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (a === b) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

console.log("guidageActif — mode CHOISI seul");
eq(guidageActif('auto'), true, "auto → guide (fini le muet)");
eq(guidageActif('lecture'), false, "lecture (choix explicite) → muet");
eq(guidageActif('mixte'), true, "mixte → guide");
eq(guidageActif('voix'), true, "voix → guide");

console.log("guidageActif — mode EFFECTIF explicite (rétro-compat auth)");
// Patrick, 26/10 : « J'entends rien quand le code n'est pas bon. »
// Reproduction navigateur : stats clavier-franches → l'auth passait son mode
// résolu 'lecture' à guidageVocal() → l'effet `error → parle(error)` ne partait
// plus. « Automatique » ne se tait JAMAIS, quel que soit le mode résolu.
eq(guidageActif('auto', 'lecture'), true, "auto résolu 'lecture' → guide (le défaut de Patrick, 26/10)");
eq(guidageActif('auto', 'voix'), true, "effectif voix fourni → guide");
eq(guidageActif('lecture', 'mixte'), true, "effectif mixte fourni prime → guide");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests guidageActif sont verts ✅");
