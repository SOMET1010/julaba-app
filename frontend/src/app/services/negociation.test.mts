/**
 * Tests du module négociation (pur). Lancer : npm run test:negociation
 *
 * Couvre le bug « contre_propose » (alias front) → « contre_offre » (enum backend)
 * qui faisait échouer toute contre-offre en 400, + les règles miroir du backend.
 */
import {
  normaliserStatutNegociation, peutContreOffrir, MAX_CONTRE_OFFRES,
  estNegociationActive, prixFinalNegociation,
} from "./negociation.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

console.log("normaliserStatutNegociation — le cœur du fix");
eq(normaliserStatutNegociation('contre_propose'), 'contre_offre', "alias front « contre_propose » → enum backend « contre_offre »");
eq(normaliserStatutNegociation('contre_offre'), 'contre_offre', "« contre_offre » passe inchangé");
eq(normaliserStatutNegociation('accepte'), 'accepte', "« accepte » inchangé");
eq(normaliserStatutNegociation('refuse'), 'refuse', "« refuse » inchangé");
eq(normaliserStatutNegociation('nimporte'), 'nimporte', "statut inconnu NON masqué (le backend le refusera clairement)");

console.log("peutContreOffrir — limite backend (3)");
eq(MAX_CONTRE_OFFRES, 3, "limite = 3");
eq(peutContreOffrir(0), true, "0 → oui");
eq(peutContreOffrir(2), true, "2 → oui");
eq(peutContreOffrir(3), false, "3 → non (limite atteinte)");
eq(peutContreOffrir(NaN), false, "NaN → non");

console.log("estNegociationActive");
eq(estNegociationActive('en_attente'), true, "en_attente → active");
eq(estNegociationActive('contre_offre'), true, "contre_offre → active");
eq(estNegociationActive('accepte'), false, "accepte → inactive");
eq(estNegociationActive('refuse'), false, "refuse → inactive");

console.log("prixFinalNegociation — priorité contre-offre > proposé > original");
eq(prixFinalNegociation({ prixContreOffre: 900, prixPropose: 800, prixOriginal: 1000 }), 900, "contre-offre prime");
eq(prixFinalNegociation({ prixPropose: 800, prixOriginal: 1000 }), 800, "sinon prix proposé");
eq(prixFinalNegociation({ prixOriginal: 1000 }), 1000, "sinon prix original");
eq(prixFinalNegociation({ prix_contre_offre: 900, prix_original: 1000 }), 900, "snake_case toléré");
eq(prixFinalNegociation({}), 0, "rien → 0");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests negociation sont verts ✅");
