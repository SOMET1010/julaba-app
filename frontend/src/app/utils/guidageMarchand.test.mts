import { prochaineEtapeMarchand } from "./guidageMarchand.js";

let failures = 0;
function expectEqual(actual: string, expected: string, label: string) {
  if (actual === expected) console.log(`✅ ${label}`);
  else { console.error(`❌ ${label}: attendu ${expected}, obtenu ${actual}`); failures++; }
}

expectEqual(
  prochaineEtapeMarchand({ etat: "idle", estEnLigne: true, journeeOuverte: false, enAttente: 0 }).titre,
  "Commence par ouvrir ta journée",
  "Jour fermé : le guidage empêche une vente prématurée",
);
expectEqual(
  prochaineEtapeMarchand({ etat: "confirming", estEnLigne: true, journeeOuverte: true, enAttente: 0 }).titre,
  "Vérifie puis confirme",
  "Confirmation : une seule action claire",
);
expectEqual(
  prochaineEtapeMarchand({ etat: "idle", estEnLigne: false, journeeOuverte: true, enAttente: 2 }).titre,
  "Tu peux continuer sans réseau",
  "Hors ligne : la file locale est expliquée",
);
expectEqual(
  prochaineEtapeMarchand({ etat: "listening", estEnLigne: true, journeeOuverte: true, enAttente: 0 }).titre,
  "Dis le produit, la quantité et le prix",
  "Écoute : la phrase attendue est expliquée",
);

if (failures) process.exit(1);
console.log("Tous les tests de guidage marchand sont verts ✅");
