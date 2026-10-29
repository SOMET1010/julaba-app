/**
 * Tests du jour LOCAL (remplace le jour UTC pour le bucketing « aujourd'hui »).
 * Lancer : npm run test:jour   (tsx, sans DOM ni navigateur)
 *
 * Note déterminisme : on construit les dates via `new Date(an, mois, jour, …)`
 * (composantes LOCALES) → indépendant du fuseau de la machine de CI.
 */
import { jourLocal, estAujourdhui } from "./jourLocal.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

console.log("jourLocal — format & composantes locales");
eq(jourLocal(new Date(2026, 0, 5, 10, 0, 0)), "2026-01-05", "5 janv → 2026-01-05 (padding mois)");
eq(jourLocal(new Date(2026, 8, 3, 23, 59, 0)), "2026-09-03", "3 sept 23:59 → 2026-09-03 (padding jour+mois)");
eq(jourLocal(new Date(2026, 11, 31, 0, 0, 0)), "2026-12-31", "31 déc → 2026-12-31");

console.log("jourLocal — chaîne ISO locale (sans Z) prise en heure locale");
eq(jourLocal("2026-03-07T12:00:00"), "2026-03-07", "ISO locale midi → 2026-03-07");

console.log("jourLocal — entrées invalides");
eq(jourLocal(""), "", "vide → ''");
eq(jourLocal("pas-une-date"), "", "invalide → ''");

console.log("estAujourdhui");
const ref = new Date(2026, 7, 16, 12, 0, 0);
eq(estAujourdhui(new Date(2026, 7, 16, 9, 0, 0), ref), true, "même jour local → true");
eq(estAujourdhui(new Date(2026, 7, 15, 23, 0, 0), ref), false, "veille → false");
eq(estAujourdhui("", ref), false, "vide → false");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests jourLocal sont verts ✅");
