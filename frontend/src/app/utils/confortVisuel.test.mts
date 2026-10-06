/**
 * Tests du CONFORT VISUEL (normal / soleil / sombre, inclusion §2.4).
 * Lancer : npm run test:confort   (tsx, cœur pur, sans DOM)
 */
import { lireConfort, appliquerClasse, ecrireConfort, CLE_CONFORT, ANCIENNE_CLE_SOMBRE } from "./confortVisuel.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function makeRacine() {
  const classes = new Set<string>();
  return {
    classes,
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
  };
}
function makeStore(seed: Record<string, string> = {}) {
  const data: Record<string, string> = { ...seed };
  return { data, getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => { data[k] = v; } };
}

function main() {
  console.log("\n[1] Lecture du mode mémorisé");
  {
    eq(lireConfort(makeStore()), "normal", "rien de mémorisé → normal");
    eq(lireConfort(makeStore({ [CLE_CONFORT]: "soleil" })), "soleil", "soleil mémorisé → soleil");
    eq(lireConfort(makeStore({ [CLE_CONFORT]: "sombre" })), "sombre", "sombre mémorisé → sombre");
    eq(lireConfort(makeStore({ [CLE_CONFORT]: "n'importe quoi" })), "normal", "valeur inconnue → normal (jamais de casse)");
    eq(lireConfort(null), "normal", "pas de stockage → normal");
  }

  console.log("\n[2] Migration depuis l'ancien mode sombre (ThemeContext historique)");
  {
    eq(lireConfort(makeStore({ [ANCIENNE_CLE_SOMBRE]: "true" })), "sombre",
      "ancien sombre actif, rien dans le nouveau réglage → sombre (elle retrouve son écran)");
    eq(lireConfort(makeStore({ [ANCIENNE_CLE_SOMBRE]: "false" })), "normal", "ancien sombre éteint → normal");
    eq(lireConfort(makeStore({ [CLE_CONFORT]: "soleil", [ANCIENNE_CLE_SOMBRE]: "true" })), "soleil",
      "le NOUVEAU réglage gagne toujours sur l'ancien");
  }

  console.log("\n[3] Application : une classe à la fois, JAMAIS deux");
  {
    const r = makeRacine();
    appliquerClasse(r, "soleil");
    ok(r.classes.has("soleil") && !r.classes.has("dark"), "soleil → classe soleil seule");
    appliquerClasse(r, "sombre");
    ok(r.classes.has("dark") && !r.classes.has("soleil"), "sombre → dark posée, soleil RETIRÉE");
    appliquerClasse(r, "soleil");
    ok(r.classes.has("soleil") && !r.classes.has("dark"), "retour soleil → dark RETIRÉE");
    appliquerClasse(r, "normal");
    ok(!r.classes.has("soleil") && !r.classes.has("dark"), "normal → aucune classe");
  }

  console.log("\n[4] Écriture : mémorise ET applique");
  {
    const r = makeRacine();
    const s = makeStore();
    ok(ecrireConfort(s, r, "sombre"), "écriture réussie");
    eq(s.data[CLE_CONFORT], "sombre", "mode mémorisé");
    ok(r.classes.has("dark"), "classe posée");
    ok(ecrireConfort(s, r, "normal"), "retour au normal");
    ok(!r.classes.has("dark") && !r.classes.has("soleil"), "classes retirées");
  }

  console.log("\n[5] Stockage en panne : l'écran change quand même");
  {
    const r = makeRacine();
    const casse = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    ok(!ecrireConfort(casse, r, "soleil"), "écriture → false (pas d'exception)");
    ok(r.classes.has("soleil"), "la classe est posée MALGRÉ le stockage en panne");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
