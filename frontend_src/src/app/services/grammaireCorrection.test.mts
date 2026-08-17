/**
 * Tests de la GRAMMAIRE DE RÉPONSE (vente guidée — pur, sans micro).
 * Lancer : npm run test:correction
 *
 * Couvre SPEC_VENTE_VOCALE.md §4 : « non » n'est jamais une vente, la correction
 * prime, « annule » = étape (pas le panier), confirmations/encaissement.
 */
import { interpreterReponse } from "./grammaireCorrection.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

console.log("Confirmation");
eq(interpreterReponse('oui'), { type: 'confirmation' }, "« oui »");
eq(interpreterReponse("c'est bon"), { type: 'confirmation' }, "« c'est bon »");
eq(interpreterReponse("c'est ça"), { type: 'confirmation' }, "« c'est ça »");
eq(interpreterReponse("d'accord"), { type: 'confirmation' }, "« d'accord »");

console.log("Refus — JAMAIS une vente");
eq(interpreterReponse('non'), { type: 'refus' }, "« non » seul → refus (ouvre la correction)");
eq(interpreterReponse("c'est pas ça"), { type: 'refus' }, "« c'est pas ça » → refus");
eq(interpreterReponse('faux'), { type: 'refus' }, "« faux » → refus");

console.log("Correction quantité");
eq(interpreterReponse('non, deux'), { type: 'correction-quantite', quantite: 2 }, "« non, deux » → corrige quantité 2 (pas un refus, pas une vente)");
eq(interpreterReponse("c'est deux tas"), { type: 'correction-quantite', quantite: 2 }, "« c'est deux tas » → quantité 2");
eq(interpreterReponse('plutôt trois'), { type: 'correction-quantite', quantite: 3 }, "« plutôt trois » → quantité 3");

console.log("Correction prix");
eq(interpreterReponse('à 400 francs'), { type: 'correction-prix', montant: 400, mode: 'unitaire' }, "« à 400 francs » → prix unitaire 400");
eq(interpreterReponse("le prix c'est mille"), { type: 'correction-prix', montant: 1000, mode: 'unitaire' }, "« le prix c'est mille » → prix unitaire 1000");
eq(interpreterReponse('le tout à 1000'), { type: 'correction-prix', montant: 1000, mode: 'total' }, "« le tout à 1000 » → prix total 1000");

console.log("Annulation = étape, pas le panier");
eq(interpreterReponse('annule'), { type: 'annulation' }, "« annule » → annulation");
eq(interpreterReponse('recommence'), { type: 'annulation' }, "« recommence » → annulation");
eq(interpreterReponse('laisse tomber'), { type: 'annulation' }, "« laisse tomber » → annulation");

console.log("Suppression / suivant / encaisser");
eq(interpreterReponse('enlève les tomates'), { type: 'suppression' }, "« enlève les tomates » → suppression");
eq(interpreterReponse("j'ajoute"), { type: 'article-suivant' }, "« j'ajoute » → article suivant");
eq(interpreterReponse('autre chose'), { type: 'article-suivant' }, "« autre chose » → article suivant");
eq(interpreterReponse('encaisse'), { type: 'encaisser' }, "« encaisse » → encaisser");
eq(interpreterReponse("c'est tout"), { type: 'encaisser' }, "« c'est tout » → encaisser");

console.log("Priorité §4 — intention explicite prime sur un « non » de tête");
eq(interpreterReponse('non enlève ça'), { type: 'suppression' }, "« non enlève ça » → suppression (pas refus)");
eq(interpreterReponse('non annule'), { type: 'annulation' }, "« non annule » → annulation");

console.log("Hors grammaire / vide");
eq(interpreterReponse('euh bon ben'), { type: 'confirmation' }, "« bon » reconnu comme confirmation faible");
eq(interpreterReponse('la lune est bleue'), { type: 'ambigu' }, "phrase hors sujet → ambigu");
eq(interpreterReponse(''), { type: 'ambigu' }, "vide → ambigu");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests grammaireCorrection sont verts ✅");
