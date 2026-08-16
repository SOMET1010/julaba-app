/**
 * Tests du calcul de marge/bénéfice d'une vente (écart recette caisse : la marge
 * ne doit JAMAIS valoir le prix de vente entier quand le prix d'achat est inconnu).
 * Lancer : npm run test:marge   (tsx, sans DOM ni navigateur)
 */
import { beneficeDepuisDetails } from "./margeVente.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

console.log("margeVente — beneficeDepuisDetails");

// Entrées non exploitables → 0
eq(beneficeDepuisDetails(null), 0, "null → 0");
eq(beneficeDepuisDetails(undefined), 0, "undefined → 0");
eq(beneficeDepuisDetails("x"), 0, "non-tableau → 0");
eq(beneficeDepuisDetails([]), 0, "tableau vide → 0");

// Coût INCONNU (prix_achat 0/absent) → 0, et surtout PAS le prix de vente entier
eq(beneficeDepuisDetails([{ total: 3000, quantite: 30, prix_achat: 0 }]), 0, "coût 0 → 0 (pas 3000)");
eq(beneficeDepuisDetails([{ total: 3000, quantite: 30 }]), 0, "prix_achat absent → 0");

// Coût CONNU → total − prix_achat × quantité (cas Banane 30×100, achat 60)
eq(beneficeDepuisDetails([{ total: 3000, quantite: 30, prix_achat: 60 }]), 1200, "Banane 30 : 3000 − 60×30 = 1200");

// Alias prixAchat + total dérivé de prix × quantité
eq(beneficeDepuisDetails([{ prix: 100, quantite: 2, prixAchat: 60 }]), 80, "alias prixAchat + total dérivé = 80");

// Vente MIXTE : la ligne sans coût n'est pas comptée (jamais surévaluée)
eq(beneficeDepuisDetails([
  { total: 3000, quantite: 30, prix_achat: 60 },   // 1200
  { total: 800, quantite: 20, prix_achat: 0 },      // ignorée
]), 1200, "mixte : seule la ligne coûtée compte (1200)");

// Plancher à 0 : vente à perte n'affiche pas un bénéfice négatif
eq(beneficeDepuisDetails([{ total: 100, quantite: 1, prix_achat: 200 }]), 0, "vente à perte → plancher 0");

if (failures > 0) { console.error(`\n${failures} test(s) en échec`); process.exit(1); }
console.log("\nTous les tests margeVente sont au vert.");
