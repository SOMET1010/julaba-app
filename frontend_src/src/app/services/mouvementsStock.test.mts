/**
 * Tests du formatage des mouvements de stock (libellé de jour + mapping).
 * Lancer : npm run test:mouvements   (tsx, sans DOM ni navigateur)
 */
import { jourLabel, mapApiMouvements } from "./mouvementsStock.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

console.log("mouvementsStock — jourLabel");
const now = new Date("2026-08-16T12:00:00");
eq(jourLabel("2026-08-16T09:00:00", now), "aujourd'hui", "même jour → aujourd'hui");
eq(jourLabel("2026-08-15T23:00:00", now), "hier", "veille → hier");
eq(jourLabel("2026-08-13T10:00:00", now), "il y a 3 jours", "3 jours → il y a 3 jours");
eq(jourLabel("2026-08-01T10:00:00", now), "1 août", "≥ 7 jours → date courte");
eq(jourLabel("", now), "", "vide → vide");
eq(jourLabel("pas-une-date", now), "", "date invalide → vide");

// FICHIER GELÉ (test:ci) — MODIFIÉ LE 19/09/2026, ET IL FAUT LE DIRE.
//
// Les deux assertions ci-dessous comparent l'objet ENTIER renvoyé par
// `mapApiMouvements`. Le contrat de cette fonction a grandi, sur instruction
// explicite de Patrick (fermer la dette B3 avant l'APK terrain) : une vente
// faite hors stock doit désormais s'afficher, avec ce qui est réellement sorti
// de la boutique et la mention « hors stock ». Trois champs sont donc apparus.
//
// Les VALEURS attendues sont inchangées ; seuls les champs nouveaux ont été
// ajoutés à la forme comparée. Aucun cas de test n'a été ajouté ici — les
// nouveaux vivent dans `mouvementsStockHorsStock.test.mts`, branché sur
// `verify`, conformément au gel de `test:ci`.
console.log("mouvementsStock — mapApiMouvements");
eq(mapApiMouvements(null), [], "null → []");
eq(mapApiMouvements(undefined), [], "undefined → []");
eq(
  mapApiMouvements([
    { id: "1", type: "vente", quantite: -7, produit_nom: "Tomate", unite: "kg", date: "2026-08-16T09:00:00" },
  ], now),
  [{ id: "1", type: "vente", qty: -7, qtyAffichee: 7, horsStock: false, name: "Tomate", unit: "kg", day: "aujourd'hui" }],
  "vente : signe conservé, unité/nom mappés",
);
eq(
  mapApiMouvements([
    { id: "2", type: "annulation", quantite: 5, produit_nom: null, unite: null, date: "2026-08-15T10:00:00" },
  ], now),
  [{ id: "2", type: "annulation", qty: 5, qtyAffichee: 5, horsStock: false, name: "", unit: "", day: "hier" }],
  "annulation : nom/unité nuls → défauts vides",
);
eq(
  mapApiMouvements([
    { id: "3", type: "", quantite: 0, produit_nom: "Riz", unite: "sac", date: "2026-08-16T08:00:00" },
  ], now)[0].type,
  "vente",
  "type vide → défaut vente",
);

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests mouvementsStock sont verts ✅");
