// Tests du routeur d'intentions « questions caisse » (V4).
// Lancer :  npx tsx src/app/services/intentionsCaisse.test.mts
// (chaîne CI : npm run test:intentions / inclus dans test:ci)

import { detecterQuestion, phraseReponse, type ChiffresJour } from "./intentionsCaisse.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}
// fr-FR insère une espace fine insécable (U+202F) dans les milliers : on
// normalise pour comparer à l'œil nu.
function norm(s: string): string {
  return s.replace(/[  ]/g, " ");
}
function eq(actual: string, expected: string, label: string): void {
  const a = norm(actual), e = norm(expected);
  if (a === e) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}\n      attendu: ${e}\n      obtenu : ${a}`); }
}

function main(): void {
  console.log("\n[1] Détection — questions reconnues");
  ok(detecterQuestion("Combien j'ai vendu aujourd'hui ?") === "ventes_jour", "« combien j'ai vendu » → ventes_jour");
  ok(detecterQuestion("j'ai fait combien") === "ventes_jour", "« j'ai fait combien » → ventes_jour");
  ok(detecterQuestion("c'est quoi ma recette") === "ventes_jour", "« ma recette » → ventes_jour");
  ok(detecterQuestion("combien j'ai dépensé") === "depenses_jour", "« combien j'ai dépensé » → depenses_jour");
  ok(detecterQuestion("montre-moi mon cahier") === "depenses_jour", "« mon cahier » → depenses_jour");
  ok(detecterQuestion("quel est mon solde") === "solde_caisse", "« mon solde » → solde_caisse");
  ok(detecterQuestion("combien il reste dans ma caisse") === "solde_caisse", "« reste dans ma caisse » → solde_caisse");
  ok(detecterQuestion("c'est quoi mon bénéfice") === "benefice_jour", "« mon bénéfice » → benefice_jour");
  ok(detecterQuestion("quelle est ma meilleure vente") === "meilleure_vente", "« meilleure vente » → meilleure_vente");
  ok(detecterQuestion("qu'est-ce qui se vend le mieux") === "meilleure_vente", "« se vend le mieux » → meilleure_vente");

  console.log("\n[2] Détection — sans accents ni majuscules (sortie STT réelle)");
  ok(detecterQuestion("COMBIEN J AI DEPENSE") === "depenses_jour", "majuscules sans accents → depenses_jour");
  ok(detecterQuestion("cest quoi mon benefice") === "benefice_jour", "« benefice » sans accent → benefice_jour");

  console.log("\n[3] Garde-fous — jamais de statistique en réponse à une vente");
  ok(detecterQuestion("j'ai vendu trois tomates") === null, "vente incomplète (sans montant) → null");
  ok(detecterQuestion("vends 2 kilos de riz") === null, "impératif de vente → null");
  ok(detecterQuestion("tomate 500 francs") === null, "phrase de vente → null");
  ok(detecterQuestion("") === null, "chaîne vide → null");
  ok(detecterQuestion("bonjour Tata") === null, "salutation → null");

  const c: ChiffresJour = { ventes: 12500, depenses: 3000, caisse: 15000, nombreVentes: 7 };

  console.log("\n[4] Réponses — gabarits parlés");
  eq(phraseReponse("ventes_jour", c), "Aujourd'hui, tu as vendu pour 12 500 francs, en 7 ventes.", "ventes du jour (pluriel)");
  eq(phraseReponse("ventes_jour", { ventes: 500, depenses: 0, nombreVentes: 1 }), "Aujourd'hui, tu as vendu pour 500 francs.", "une seule vente → pas de « en 1 ventes »");
  eq(phraseReponse("ventes_jour", { ventes: 0, depenses: 0 }), "Tu n'as pas encore de vente aujourd'hui. Ça va venir !", "zéro vente → encouragement");
  eq(phraseReponse("depenses_jour", c), "Aujourd'hui, tu as dépensé 3 000 francs.", "dépenses du jour");
  eq(phraseReponse("depenses_jour", { ventes: 0, depenses: 0 }), "Aucune dépense notée aujourd'hui.", "zéro dépense");
  eq(phraseReponse("solde_caisse", c), "Dans ta caisse, il y a 15 000 francs.", "solde : la caisse connue prime");
  eq(phraseReponse("solde_caisse", { ventes: 2000, depenses: 500 }), "Ventes moins dépenses, il te reste 1 500 francs aujourd'hui.", "solde calculé sans caisse");
  eq(phraseReponse("benefice_jour", c), "Aujourd'hui : 12 500 francs de ventes, 3 000 de dépenses. Il te reste 9 500 francs.", "bénéfice positif");
  eq(phraseReponse("benefice_jour", { ventes: 1000, depenses: 4000 }), "Aujourd'hui : 1 000 francs de ventes, 4 000 de dépenses. Tu as dépensé 3 000 francs de plus que tes ventes.", "résultat négatif dit honnêtement");
  eq(phraseReponse("meilleure_vente", { ...c, topProduit: { nom: "Tomate", quantite: 12 } }), "Ce qui marche le mieux aujourd'hui : Tomate, 12 vendus.", "meilleure vente avec quantité");
  eq(phraseReponse("meilleure_vente", c), "Je n'ai pas encore assez de ventes pour te dire ça aujourd'hui.", "meilleure vente inconnue → réponse honnête");

  console.log(failures === 0 ? "\nTous les tests intentionsCaisse passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

main();
