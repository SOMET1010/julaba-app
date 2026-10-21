/**
 * Tests de la LIGNE PROVISOIRE (vente guidée — socle vocal, module PUR).
 * Lancer : npm run test:provisoire   (tsx, sans DOM ni micro)
 *
 * Couvre SPEC_VENTE_VOCALE.md §3 (modèle/persistance) et §5 (ambiguïté prix),
 * + les gardes : « aucun ajout tant que non résolu », correction = re-confirmation.
 */
import {
  resoudrePrix, creerLigneProvisoire, estResolue,
  corrigerQuantite, corrigerPrix, resoudreAmbiguite, confirmer,
  serialiser, deserialiser, ligneAReproposer,
  type LigneProvisoire,
} from "./ligneProvisoire.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}
function ok(cond: boolean, label: string) { eq(!!cond, true, label); }

// ── §5 — résolution prix ─────────────────────────────────────────
console.log("resoudrePrix — formulation explicite");
eq(resoudrePrix(3, 500, 'unitaire', null), { interpretationPrix: 'unitaire', prixUnitaire: 500, total: 1500 }, "« à 500 chacun » → unitaire, total 1500");
eq(resoudrePrix(3, 1500, 'total', null), { interpretationPrix: 'total', prixUnitaire: 500, total: 1500 }, "« le tout à 1500 » → total, unitaire 500");

console.log("resoudrePrix — heuristique catalogue ±20 %");
eq(resoudrePrix(3, 520, null, 500), { interpretationPrix: 'unitaire', prixUnitaire: 520, total: 1560 }, "520 ≈ prix cat 500 → unitaire");
eq(resoudrePrix(3, 1500, null, 500), { interpretationPrix: 'total', prixUnitaire: 500, total: 1500 }, "1500 ≈ 3×500 → total");
eq(resoudrePrix(3, 800, null, 500).interpretationPrix, 'a_confirmer', "800 ni ≈500 ni ≈1500 → a_confirmer");
eq(resoudrePrix(3, 800, null, 500), { interpretationPrix: 'a_confirmer', prixUnitaire: null, total: null }, "a_confirmer ne pose AUCUN prix");

console.log("resoudrePrix — cas limites");
eq(resoudrePrix(1, 500, null, 500), { interpretationPrix: 'unitaire', prixUnitaire: 500, total: 500 }, "quantité 1 → unitaire (pas d'ambiguïté)");
eq(resoudrePrix(3, null, null, 500).interpretationPrix, 'a_confirmer', "prix manquant → a_confirmer");
eq(resoudrePrix(3, 0, null, 500).interpretationPrix, 'a_confirmer', "prix 0 → a_confirmer");
eq(resoudrePrix(3, 1500, null, null).interpretationPrix, 'a_confirmer', "sans prix catalogue → a_confirmer");

// ── §3 — création ────────────────────────────────────────────────
console.log("creerLigneProvisoire");
const opts = { id: 'L1', creeLe: '2026-08-17T10:00:00.000Z' };
const l1 = creerLigneProvisoire({ nomParle: 'tomates', quantite: 3, montant: 1500, prixExplicite: 'total' }, { produitId: 'p1', nomCatalogue: 'Tomate fraîche', prixCatalogue: 500, unite: 'tas' }, opts);
eq(l1.statut, 'a_confirmer', "création → statut toujours a_confirmer");
eq(l1.nomAffiche, 'Tomate fraîche', "nomAffiche = nom catalogue si apparié");
eq([l1.quantite, l1.total, l1.prixUnitaire, l1.unite], [3, 1500, 500, 'tas'], "champs résolus (total dit)");
eq(l1.produitId, 'p1', "produitId conservé");

const libre = creerLigneProvisoire({ nomParle: '  attiéké  ', montant: 200, prixExplicite: 'unitaire' }, { produitId: null }, opts);
eq([libre.produitId, libre.nomAffiche, libre.quantite, libre.unite], [null, 'attiéké', 1, 'unité'], "ligne libre : produitId null, quantité défaut 1, unité défaut");
eq(quantiteFloor(), 2, "quantité 2.9 → plancher entier 2");
function quantiteFloor() { return creerLigneProvisoire({ nomParle: 'x', quantite: 2.9, montant: 100, prixExplicite: 'unitaire' }, { produitId: null }, opts).quantite; }

// ── estResolue ───────────────────────────────────────────────────
console.log("estResolue");
ok(estResolue(l1), "ligne total résolue → true");
ok(!estResolue(creerLigneProvisoire({ nomParle: 'x', quantite: 3, montant: 800 }, { produitId: null, prixCatalogue: 500 }, opts)), "ligne a_confirmer → false");

// ── corrections = re-confirmation ────────────────────────────────
console.log("corrigerQuantite");
const confirmee = confirmer(l1)!;
const cq = corrigerQuantite(confirmee, 2);
eq([cq.quantite, cq.total, cq.prixUnitaire, cq.statut], [2, 1000, 500, 'a_confirmer'], "total→ corrige quantité : unitaire gardé (500), total recalculé, repasse a_confirmer");
const uni = creerLigneProvisoire({ nomParle: 'x', quantite: 3, montant: 500, prixExplicite: 'unitaire' }, { produitId: null }, opts);
const cqu = corrigerQuantite(uni, 4);
eq([cqu.quantite, cqu.prixUnitaire, cqu.total], [4, 500, 2000], "unitaire→ corrige quantité : prix unitaire gardé, total recalculé");

console.log("corrigerPrix / resoudreAmbiguite");
const cp = corrigerPrix(l1, 400, 'unitaire');
eq([cp.interpretationPrix, cp.prixUnitaire, cp.total, cp.statut], ['unitaire', 400, 1200, 'a_confirmer'], "« à 400 » → unitaire 400, total 1200, a_confirmer");
const amb = creerLigneProvisoire({ nomParle: 'tomate', quantite: 3, montant: 1500 }, { produitId: 'p1', prixCatalogue: 800 }, opts);
eq(amb.interpretationPrix, 'a_confirmer', "1500 vs cat 800 (±20 % de 800=[640,960], de 2400=[1920,2880]) → ambigu");
const leve = resoudreAmbiguite(amb, 1500, 'total');
eq([leve.interpretationPrix, leve.total, leve.prixUnitaire], ['total', 1500, 500], "« des trois » → total 1500, unitaire 500");

// ── garde de confirmation (§5) ───────────────────────────────────
console.log("confirmer — garde « aucun ajout tant que non résolu »");
eq(confirmer(amb), null, "confirmer une ligne a_confirmer → null (refusé)");
ok(confirmer(l1)!.statut === 'confirmee', "confirmer une ligne résolue → confirmee");

// ── persistance / reprise (§3) ───────────────────────────────────
console.log("serialiser / deserialiser / ligneAReproposer");
const round = deserialiser(serialiser(confirmee));
eq(round, confirmee, "round-trip sérialisation identique");
eq(deserialiser('{pas du json'), null, "JSON corrompu → null");
eq(deserialiser('{"quoi":1}'), null, "objet non conforme → null");
ok(ligneAReproposer(serialiser(confirmee)) !== null, "ligne confirmée+résolue → reproposée");
eq(ligneAReproposer(serialiser(l1)), null, "ligne a_confirmer (non confirmée) → jetée (null)");
const confirmeeMaisCassee: LigneProvisoire = { ...confirmee, total: null, prixUnitaire: null, interpretationPrix: 'a_confirmer' };
eq(ligneAReproposer(serialiser(confirmeeMaisCassee)), null, "confirmée mais prix perdu → non reproposée");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests ligneProvisoire sont verts ✅");
