/**
 * Tests des DIALOGUES de Tata (vente guidée — pur). Lancer : npm run test:dialogues
 * Vérifie que les phrases §6 collent EXACTEMENT à la spec, selon l'état de la ligne.
 */
import {
  confirmationDeuxFormes, ambiguiteDeuxFormes,
  resumeQuantite, resumeLigne, phraseConfirmation, phraseCorrectionRecue,
  phraseAmbiguite, phrasePrixManquant, phraseQuantiteManquante, phraseCompris,
} from "./dialoguesTata.js";
import { creerLigneProvisoire } from "./ligneProvisoire.js";

let failures = 0;
// fr-FR sépare les milliers par une espace insécable fine (U+202F) ou insécable
// (U+00A0) : typographie correcte. On la normalise pour comparer au texte du test.
const norm = (s: unknown) => typeof s === 'string' ? s.replace(/[  ]/g, ' ') : s;
function eq(a: unknown, b: unknown, label: string) {
  if (norm(a) === norm(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `\n     attendu: ${JSON.stringify(b)}\n     obtenu : ${JSON.stringify(a)}`); failures++; }
}

const O = { id: 'L', creeLe: '2026-01-01T00:00:00.000Z' };
const uni = creerLigneProvisoire({ nomParle: 'tomate', quantite: 3, montant: 500, prixExplicite: 'unitaire', unite: 'tas' }, { produitId: 'p', nomCatalogue: 'tomate' }, O);
const tot = creerLigneProvisoire({ nomParle: 'riz', quantite: 1, montant: 14000, prixExplicite: 'total', unite: 'cuvette' }, { produitId: 'p', nomCatalogue: 'riz' }, O);
const flou = creerLigneProvisoire({ nomParle: 'tomate', quantite: 3, montant: 1500 }, { produitId: 'p', nomCatalogue: 'tomate', prixCatalogue: 800 }, O);

console.log("resumeQuantite / resumeLigne");
eq(resumeQuantite(uni), "3 tas de tomate", "« 3 tas de tomate »");
eq(resumeLigne(uni), "3 tas de tomate à 500 F", "unitaire → « … à 500 F »");
eq(resumeLigne(tot), "1 cuvette de riz pour 14 000 F", "total → « … pour 14 000 F » (espace milliers)");

console.log("phraseConfirmation (§6)");
eq(phraseConfirmation(uni), "J'ai compris : 3 tas de tomate à 500 francs. Total : 1 500 francs. C'est bon ?", "répétition unitaire exacte");
eq(phraseConfirmation(tot), "J'ai compris : 1 cuvette de riz pour 14 000 francs. C'est bon ?", "répétition total exacte");
eq(phraseConfirmation(flou), "Et c'est à combien ?", "prix non résolu → demande le prix");

console.log("phraseCorrectionRecue / questions");
eq(phraseCorrectionRecue(uni), "D'accord : 3 tas de tomate à 500 F. C'est bon ?", "correction reçue");
eq(phraseAmbiguite(3, 1500), "1 500 francs, c'est le prix d'un seul, ou de tous les 3 ?", "question ambiguïté");
eq(phrasePrixManquant(), "Et c'est à combien ?", "prix manquant");
eq(phraseQuantiteManquante('tomate'), "Combien de tomate ?", "quantité manquante");

console.log("accord pluriel");
const sansUnite = creerLigneProvisoire({ nomParle: 'attiéké', quantite: 2, montant: 200, prixExplicite: 'unitaire' }, { produitId: null }, O);
eq(resumeQuantite(sansUnite), "2 attiékés", "sans unité + pluriel → « 2 attiékés »");
const unSeul = creerLigneProvisoire({ nomParle: 'attiéké', quantite: 1, montant: 200, prixExplicite: 'unitaire' }, { produitId: null }, O);
eq(resumeQuantite(unSeul), "1 attiéké", "quantité 1 → singulier « 1 attiéké »");
const sacs = creerLigneProvisoire({ nomParle: 'riz', quantite: 3, montant: 500, prixExplicite: 'unitaire', unite: 'sac' }, { produitId: null }, O);
eq(resumeQuantite(sacs), "3 sacs de riz", "avec unité + pluriel → unité au pluriel, produit singulier");
eq(resumeQuantite(uni), "3 tas de tomate", "« tas » invariable (finit par s) → « 3 tas de tomate »");
const kg = creerLigneProvisoire({ nomParle: 'riz', quantite: 2, montant: 500, prixExplicite: 'unitaire', unite: 'kg' }, { produitId: 'p', nomCatalogue: 'Riz local' }, O);
eq(resumeQuantite(kg), "2 kg de Riz local", "abréviation « kg » invariable → « 2 kg », pas « kgs »");


// ── CE QU'ELLE ENTEND N'EST PAS CE QU'ON AFFICHE ──────────────────────────
//
// Terrain du 24/09, Patrick : « dans la vente aussi il dit 2 zéro zéro francs ».
//
// MESURÉ. `t(...)` rend la forme ÉCRAN (`resoudreMessage(...).texte`) — avec
// son espace fine insécable, que la synthèse épelle. `tParle(...)` rend la
// forme DITE. Le module des phrases de Tantie comptait 19 appels à `t` et
// ZÉRO à `tParle`, dont six portant un montant.
//
// MAIS ON NE BASCULE PAS TOUT : `ConfirmationLigne` AFFICHE la phrase autant
// qu'il la dit, et revendique « impossible de diverger ». Mettre « deux mille
// francs » à l'écran remplacerait un défaut par un autre. La réponse du dépôt
// existe déjà — `relectureDeuxFormes` : DEUX formes issues du MÊME appel.
console.log("\n[argent] la phrase dite porte le montant en toutes lettres");
{
  const ok = (c: boolean, label: string) => {
    if (c) console.log("  ✅", label);
    else { console.log("  ❌", label); failures++; }
  };
  // Ce qui n'est QUE dit : la forme parlée, directement.
  const dit = phraseCompris({ nom: 'piment', quantite: 2, total: 2000, unite: 'tas' });
  ok(/deux mille/.test(dit), "« j'ai compris » dit « deux mille », pas « 2 000 »");
  ok(!/2\u202f000|2\u00a0000/.test(dit), 'et plus aucune espace fine ne part au moteur');

  // Ce qui est AFFICHÉ et dit : les deux formes, du même appel.
  const l = creerLigneProvisoire(
    { nomParle: 'piment', quantite: 2, montant: 2000, prixExplicite: 'total', unite: 'tas' },
    { produitId: 'p', nomCatalogue: 'Piment' }, O);
  const c = confirmationDeuxFormes(l);
  ok(/2\u202f000|2\u00a0000|2 000/.test(c.texte), "à l'ŒIL : « 2 000 » reste lisible");
  ok(/deux mille/.test(c.texteParle), "à l'OREILLE : « deux mille »");
  ok(c.texte !== c.texteParle, 'les deux formes sont bien distinctes');

  const a = ambiguiteDeuxFormes(2, 1000);
  ok(/mille/.test(a.texteParle), "l'ambiguïté se dit aussi en toutes lettres");
}

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests dialoguesTata sont verts ✅");
