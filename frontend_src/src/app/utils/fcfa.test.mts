/**
 * Tests des billets/pièces FCFA (inclusion §2.2).
 * Lancer : npm run test:fcfa   (tsx, sans DOM ni navigateur)
 */
import { COUPURES, decomposerMonnaie, direCoupure } from "./fcfa.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function main() {
  console.log("\n[1] Coupures d'encaissement");
  {
    eq(COUPURES.map(c => c.valeur), [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25], "toutes les coupures, décroissantes");
    ok(COUPURES.every(c => c.forme === 'billet' ? c.valeur >= 500 : c.valeur <= 250), "billets ≥ 500, pièces ≤ 250");
    ok(COUPURES.every((c, i) => i === 0 || COUPURES[i - 1].valeur > c.valeur), "ordre strictement décroissant");
  }

  console.log("\n[2] Décomposition de la monnaie (glouton canonique)");
  {
    eq(decomposerMonnaie(2500), { lignes: [{ valeur: 2000, nb: 1 }, { valeur: 500, nb: 1 }], reste: 0 }, "2 500 = 2000 + 500");
    eq(decomposerMonnaie(400), { lignes: [{ valeur: 200, nb: 2 }], reste: 0 }, "400 = 200 × 2");
    eq(decomposerMonnaie(75), { lignes: [{ valeur: 50, nb: 1 }, { valeur: 25, nb: 1 }], reste: 0 }, "75 = 50 + 25");
    eq(decomposerMonnaie(17500), { lignes: [{ valeur: 10000, nb: 1 }, { valeur: 5000, nb: 1 }, { valeur: 2000, nb: 1 }, { valeur: 500, nb: 1 }], reste: 0 }, "17 500 en 4 coupures");
    eq(decomposerMonnaie(0), { lignes: [], reste: 0 }, "0 → rien à rendre");
    eq(decomposerMonnaie(12), { lignes: [{ valeur: 10, nb: 1 }], reste: 2 }, "montant non rond → reste explicite");
    eq(decomposerMonnaie(-100), { lignes: [], reste: 0 }, "négatif → rien (jamais de monnaie négative)");
  }

  console.log("\n[3] Coupures dites à voix haute");
  {
    eq(direCoupure(10000), "dix mille francs", "10 000 se dit");
    eq(direCoupure(500), "cinq cents francs", "500 se dit");
    eq(direCoupure(25), "vingt-cinq francs", "25 se dit");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
