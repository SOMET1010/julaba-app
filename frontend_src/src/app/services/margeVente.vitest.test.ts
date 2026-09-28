/**
 * Vitest — Tests du calcul de marge/bénéfice d'une vente (écart recette
 * caisse : la marge ne doit JAMAIS valoir le prix de vente entier quand le
 * prix d'achat est inconnu). Migration depuis `margeVente.test.mts`
 * (helpers ad-hoc `eq()` + `process.exit(1)`). Le test legacy continue via
 * `tsx` (`npm run test:marge`) — cohabitation INIT-021.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { beneficeDepuisDetails } from "./margeVente.js";

describe("margeVente — beneficeDepuisDetails", () => {
  describe("Entrées non exploitables → 0", () => {
    it("null → 0", () => {
      expect(beneficeDepuisDetails(null)).toBe(0);
    });

    it("undefined → 0", () => {
      expect(beneficeDepuisDetails(undefined)).toBe(0);
    });

    it("non-tableau → 0", () => {
      expect(beneficeDepuisDetails("x")).toBe(0);
    });

    it("tableau vide → 0", () => {
      expect(beneficeDepuisDetails([])).toBe(0);
    });
  });

  describe("Coût INCONNU (prix_achat 0/absent) → 0, et surtout PAS le prix de vente entier", () => {
    it("coût 0 → 0 (pas 3000)", () => {
      expect(beneficeDepuisDetails([{ total: 3000, quantite: 30, prix_achat: 0 }])).toBe(0);
    });

    it("prix_achat absent → 0", () => {
      expect(beneficeDepuisDetails([{ total: 3000, quantite: 30 }])).toBe(0);
    });
  });

  describe("Coût CONNU → total − prix_achat × quantité", () => {
    it("Banane 30 : 3000 − 60×30 = 1200", () => {
      expect(beneficeDepuisDetails([{ total: 3000, quantite: 30, prix_achat: 60 }])).toBe(1200);
    });

    it("alias prixAchat + total dérivé = 80", () => {
      expect(beneficeDepuisDetails([{ prix: 100, quantite: 2, prixAchat: 60 }])).toBe(80);
    });
  });

  describe("Vente MIXTE : la ligne sans coût n'est pas comptée (jamais surévaluée)", () => {
    it("mixte : seule la ligne coûtée compte (1200)", () => {
      expect(
        beneficeDepuisDetails([
          { total: 3000, quantite: 30, prix_achat: 60 }, // 1200
          { total: 800, quantite: 20, prix_achat: 0 }, // ignorée
        ]),
      ).toBe(1200);
    });
  });

  // RÈGLE INVERSÉE LE 19/09/2026 — arbitrage de Patrick, et ce test est modifié
  // EN CONNAISSANCE DE CAUSE, malgré le gel de test:ci.
  //
  // Il affirmait « vente à perte → plancher 0 ». Cette règle est précisément
  // celle qui a été jugée fausse : elle rendait une vente à perte
  // indistinguable d'une vente au coût inconnu — deux situations opposées, un
  // seul affichage « marge — » — et surévaluait les bénéfices cumulés d'autant,
  // sans signal. Doctrine : « ne jamais masquer une réalité économique ».
  describe("Vente à perte : la perte est rendue (plus de plancher)", () => {
    it("vente à perte → −100 (plus de plancher)", () => {
      expect(beneficeDepuisDetails([{ total: 100, quantite: 1, prix_achat: 200 }])).toBe(-100);
    });
  });
});
