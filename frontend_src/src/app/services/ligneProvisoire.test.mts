/**
 * Tests de la LIGNE PROVISOIRE (Phase 1 vente vocale — SPEC_VENTE_VOCALE.md).
 * Lancer : npm run test:provisoire   (tsx, cœur pur, sans DOM)
 */
import {
  creerLigne, resoudrePrix, corrigerQuantite, corrigerPrix, confirmerLigne,
  phraseRepetition, phraseQuestionPrix, interpreterCorrection,
  sauvegarderLigne, chargerLigne, CLE_LIGNE_PROVISOIRE, type KVStore,
} from "./ligneProvisoire.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}
function makeStore(seed: Record<string, string> = {}): KVStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...seed };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
}
const TOMATE = { id: "p1", nom: "Tomate", prix: 500, unite: "tas" };

function main() {
  console.log("\n[1] Résolution du prix (spec §5) — formulation explicite d'abord");
  {
    const u = creerLigne({ nomParle: "tomates", quantite: 3, montantDit: 500, produit: TOMATE, formulation: "unitaire" });
    eq([u.interpretationPrix, u.prixUnitaire, u.total], ["unitaire", 500, 1500], "« à 500 chacun » → unitaire, total 1 500");
    const t = creerLigne({ nomParle: "tomates", quantite: 3, montantDit: 1500, produit: TOMATE, formulation: "total" });
    eq([t.interpretationPrix, t.prixUnitaire, t.total], ["total", 500, 1500], "« le tout à 1 500 » → total, unitaire 500");
  }

  console.log("\n[2] Sans formulation : ±20 % du catalogue, sinon QUESTION");
  {
    const u = creerLigne({ quantite: 3, montantDit: 520, produit: TOMATE });
    eq(u.interpretationPrix, "unitaire", "520 ≈ prix catalogue (500) → unitaire");
    const t = creerLigne({ quantite: 3, montantDit: 1450, produit: TOMATE });
    eq(t.interpretationPrix, "total", "1 450 ≈ 3 × 500 → total");
    const a = creerLigne({ quantite: 3, montantDit: 900, produit: TOMATE });
    eq(a.interpretationPrix, "a_confirmer", "900 n'est ni ±20 % de 500 ni de 1 500 → question");
    eq(a.total, null, "ambigu → AUCUN total calculé");
    const un = creerLigne({ quantite: 1, montantDit: 700, produit: TOMATE });
    eq(un.interpretationPrix, "unitaire", "quantité 1 → jamais ambigu");
    const libre = creerLigne({ nomParle: "beignets", quantite: 4, montantDit: 200 });
    eq(libre.interpretationPrix, "a_confirmer", "produit inconnu + plusieurs → question");
  }

  console.log("\n[3] La question et sa résolution");
  {
    const a = creerLigne({ quantite: 3, montantDit: 900, produit: TOMATE });
    eq(phraseQuestionPrix(a, 900), "900 francs, c'est le prix d'un seul, ou de tous les 3 ?", "question exacte de la spec");
    const rU = resoudrePrix(a, 900, "unitaire");
    eq([rU.prixUnitaire, rU.total], [900, 2700], "« d'un seul » → 900 × 3");
    const rT = resoudrePrix(a, 900, "total");
    eq([rT.prixUnitaire, rT.total], [300, 900], "« de tous » → 300 l'unité");
  }

  console.log("\n[4] Corrections : elles modifient la ligne PROVISOIRE seulement");
  {
    const l = creerLigne({ quantite: 3, montantDit: 500, produit: TOMATE, formulation: "unitaire" });
    const q2 = corrigerQuantite(l, 2);
    eq([q2.quantite, q2.total, q2.statut], [2, 1000, "a_confirmer"], "« non, deux » → 2 × 500, re-confirmation exigée");
    const p400 = corrigerPrix(l, 400);
    eq([p400.prixUnitaire, p400.total], [400, 1200], "« à 400 francs » → prix unitaire corrigé");
  }

  console.log("\n[5] Confirmation : IMPOSSIBLE tant que le prix n'est pas résolu");
  {
    const ambigu = creerLigne({ quantite: 3, montantDit: 900, produit: TOMATE });
    eq(confirmerLigne(ambigu).statut, "a_confirmer", "ligne ambiguë → confirmation refusée");
    const ok1 = confirmerLigne(creerLigne({ quantite: 3, montantDit: 500, produit: TOMATE, formulation: "unitaire" }));
    eq(ok1.statut, "confirmee", "prix résolu → confirmée");
  }

  console.log("\n[6] Grammaire : « non » n'est JAMAIS une vente ; « annule » = l'étape");
  {
    eq(interpreterCorrection("non"), { type: "refus" }, "« non » seul → refus (ouvre la correction)");
    eq(interpreterCorrection("non, deux"), { type: "quantite", quantite: 2 }, "« non, deux » → quantité 2");
    eq(interpreterCorrection("c'est deux tas"), { type: "quantite", quantite: 2 }, "« c'est deux tas » → quantité");
    eq(interpreterCorrection("le prix c'est 1000"), { type: "prix", prix: 1000 }, "« le prix c'est mille » → prix");
    eq(interpreterCorrection("a 400 francs"), { type: "prix", prix: 400 }, "« à 400 francs » → prix");
    eq(interpreterCorrection("enlève les tomates"), { type: "supprimer" }, "« enlève » → suppression de la ligne");
    eq(interpreterCorrection("annule"), { type: "annuler" }, "« annule » → étape courante seulement");
    eq(interpreterCorrection("oui c'est bon"), { type: "confirmer" }, "« oui » → confirmation");
    eq(interpreterCorrection("vends 3 ignames"), { type: "quantite", quantite: 3 }, "en correction, un nombre CORRIGE — jamais une nouvelle vente");
  }

  console.log("\n[7] Répétition parlée (dialogues exacts de la spec §6)");
  {
    const u = creerLigne({ quantite: 3, montantDit: 500, produit: TOMATE, formulation: "unitaire" });
    eq(phraseRepetition(u), `J'ai compris : 3 Tomate à 500 francs. Total : ${(1500).toLocaleString("fr-FR")} francs. C'est bon ?`, "répétition unitaire");
    const t = creerLigne({ quantite: 3, montantDit: 1500, produit: TOMATE, formulation: "total" });
    eq(phraseRepetition(t), `J'ai compris : 3 Tomate pour ${(1500).toLocaleString("fr-FR")} francs. C'est bon ?`, "répétition total");
  }

  console.log("\n[8] Persistance : SEULE une ligne confirmée survit");
  {
    const s = makeStore();
    const nonConfirmee = creerLigne({ quantite: 2, montantDit: 500, produit: TOMATE, formulation: "unitaire" });
    sauvegarderLigne(s, nonConfirmee);
    eq(chargerLigne(s), null, "non confirmée → jetée sans bruit");
    const confirmee = confirmerLigne(nonConfirmee);
    sauvegarderLigne(s, confirmee);
    eq(chargerLigne(s)?.total, 1000, "confirmée → reprise possible après interruption");
    sauvegarderLigne(s, null);
    eq(chargerLigne(s), null, "ajoutée au panier → mémoire nettoyée");
    const casse: KVStore = { getItem: () => "{pas du json", setItem: () => { throw new Error("quota"); } };
    eq(chargerLigne(casse), null, "mémoire illisible → null, jamais de casse");
    ok(!sauvegarderLigne(casse, confirmee), "stockage en panne → false, pas d'exception");
    void CLE_LIGNE_PROVISOIRE;
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
