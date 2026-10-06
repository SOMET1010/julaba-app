/**
 * Tests de l'avertissement de rupture à la vente (décision métier n°6).
 * Lancer : npm run test:rupture   (tsx, sans DOM)
 *
 * Garantit : le manquant est correct, jamais de stock négatif, la vente n'est
 * jamais bloquée, et la phrase parlée reste compréhensible pour une non-lectrice.
 */
import { manquantLigne, collecterRuptures, messageRupture, avertissementRupture } from "./ruptureStock.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function main() {
  console.log("\n[1] manquantLigne — plancher à 0, jamais négatif");
  {
    eq(manquantLigne(5, 3), 2, "5 demandés, 3 en stock → 2 manquants");
    eq(manquantLigne(2, 5), 0, "assez de stock → 0");
    eq(manquantLigne(3, 0), 3, "stock vide → tout manque");
    eq(manquantLigne(4, -7), 4, "stock négatif traité comme 0");
  }

  console.log("\n[2] collecterRuptures — ne garde que les vraies ruptures");
  {
    const r = collecterRuptures([
      { nom: "tomate", quantite: 5, stockAvant: 3 },
      { nom: "oignon", quantite: 1, stockAvant: 10 },
      { nom: "piment", quantite: 4, stockAvant: 0 },
    ]);
    eq(r, [{ nom: "tomate", manquant: 2 }, { nom: "piment", manquant: 4 }], "oignon (assez) exclu");
  }

  console.log("\n[3] messageRupture — phrase parlée claire, ou null");
  {
    eq(messageRupture([]), null, "aucune rupture → rien à dire");
    eq(messageRupture([{ nom: "tomate", manquant: 2 }]), "Attention, il manquait 2 tomate. Pense à réapprovisionner.", "une rupture");
    eq(
      messageRupture([{ nom: "tomate", manquant: 2 }, { nom: "piment", manquant: 4 }]),
      "Attention, il manquait 2 tomate et 4 piment. Pense à réapprovisionner.",
      "deux ruptures jointes par « et »",
    );
  }

  console.log("\n[4] avertissementRupture — de bout en bout");
  {
    eq(avertissementRupture([{ nom: "riz", quantite: 3, stockAvant: 3 }]), null, "vente pile au stock → aucun avertissement");
    ok(
      avertissementRupture([{ nom: "riz", quantite: 10, stockAvant: 2 }])?.includes("8 riz") === true,
      "10 vendus sur 2 en stock → « 8 riz » annoncés",
    );
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
