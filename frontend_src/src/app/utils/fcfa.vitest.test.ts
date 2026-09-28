/**
 * PILOTE Vitest — Tests des billets/pièces FCFA (inclusion §2.2).
 *
 * Migration du test legacy `fcfa.test.mts` (helpers ad-hoc `ok()/eq()` +
 * `main()` + `process.exit(1)`) vers la syntaxe native Vitest
 * `describe/it/expect`. C'est l'un des 3 pilotes INIT-021 qui démontrent le
 * pattern de migration ; le test legacy continue de s'exécuter via `tsx`
 * (`npm run test:fcfa`) — il ne faut pas le supprimer tant que tous les
 * appels ne sont pas basculés.
 *
 * Lancer : `npm run test:vitest` (sélectionne `*.vitest.test.*`).
 */
import { describe, it, expect } from "vitest";
import { COUPURES, decomposerMonnaie, direCoupure, hauteurBillet } from "./fcfa.js";

describe("Coupures d'encaissement FCFA", () => {
  describe("Catalogue des coupures", () => {
    it("propose toutes les coupures, en ordre décroissant", () => {
      expect(COUPURES.map((c) => c.valeur)).toEqual([
        10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25,
      ]);
    });

    it("sépare billets (≥ 500) et pièces (≤ 250)", () => {
      expect(COUPURES.every((c) => (c.forme === "billet" ? c.valeur >= 500 : c.valeur <= 250))).toBe(true);
    });

    it("préserve un ordre strictement décroissant", () => {
      expect(COUPURES.every((c, i) => i === 0 || COUPURES[i - 1].valeur > c.valeur)).toBe(true);
    });
  });

  describe("Décomposition de la monnaie (glouton canonique)", () => {
    it("2 500 = 2000 + 500", () => {
      expect(decomposerMonnaie(2500)).toEqual({
        lignes: [{ valeur: 2000, nb: 1 }, { valeur: 500, nb: 1 }],
        reste: 0,
      });
    });

    it("400 = 200 × 2", () => {
      expect(decomposerMonnaie(400)).toEqual({
        lignes: [{ valeur: 200, nb: 2 }],
        reste: 0,
      });
    });

    it("75 = 50 + 25", () => {
      expect(decomposerMonnaie(75)).toEqual({
        lignes: [{ valeur: 50, nb: 1 }, { valeur: 25, nb: 1 }],
        reste: 0,
      });
    });

    it("17 500 en 4 coupures", () => {
      expect(decomposerMonnaie(17500)).toEqual({
        lignes: [
          { valeur: 10000, nb: 1 },
          { valeur: 5000, nb: 1 },
          { valeur: 2000, nb: 1 },
          { valeur: 500, nb: 1 },
        ],
        reste: 0,
      });
    });

    it("0 → rien à rendre", () => {
      expect(decomposerMonnaie(0)).toEqual({ lignes: [], reste: 0 });
    });

    it("montant non rond → reste explicite", () => {
      expect(decomposerMonnaie(12)).toEqual({
        lignes: [{ valeur: 10, nb: 1 }],
        reste: 2,
      });
    });

    it("négatif → rien (jamais de monnaie négative)", () => {
      expect(decomposerMonnaie(-100)).toEqual({ lignes: [], reste: 0 });
    });
  });

  describe("Coupures dites à voix haute", () => {
    it("10 000 se dit « dix mille francs »", () => {
      expect(direCoupure(10000)).toBe("dix mille francs");
    });

    it("500 se dit « cinq cents francs »", () => {
      expect(direCoupure(500)).toBe("cinq cents francs");
    });

    it("25 se dit « vingt-cinq francs »", () => {
      expect(direCoupure(25)).toBe("vingt-cinq francs");
    });
  });

  describe("Billets dessinés — échelle réelle et cible tactile", () => {
    // Les vraies coupures XOF grandissent avec la valeur : une marchande qui
    // ne lit pas s'appuie sur ce repère autant que sur la couleur. On
    // reproduit l'ÉCHELLE, jamais le dessin (la BCEAO encadre la reproduction
    // des billets). Et aucune taille ne doit passer sous la cible tactile de
    // 44 px : un billet qu'on rate au doigt annule le bénéfice de l'avoir
    // dessiné.
    const billets = COUPURES.filter((c) => c.forme === "billet").map((c) => c.valeur);
    const hauteurs = billets.map(hauteurBillet);

    it("propose cinq billets à l'encaissement", () => {
      expect(hauteurs.length).toBe(5);
    });

    it("ne passe aucun billet sous la cible tactile de 44 px", () => {
      expect(hauteurs.every((h) => h >= 44)).toBe(true);
    });

    it("fait grandir le billet avec la valeur, comme les vraies coupures", () => {
      // COUPURES est trié décroissant (10 000 → 500) : les hauteurs aussi.
      let croissanteAvecLaValeur = true;
      for (let i = 1; i < hauteurs.length; i++) {
        if (hauteurs[i] >= hauteurs[i - 1]) croissanteAvecLaValeur = false;
      }
      expect(croissanteAvecLaValeur).toBe(true);
    });

    it("garantit un écart visible à l'œil nu entre le plus gros et le plus petit", () => {
      expect(hauteurBillet(10000) - hauteurBillet(500)).toBeGreaterThanOrEqual(12);
    });

    it("applique une taille plancher aux valeurs inattendues (jamais 0)", () => {
      expect(hauteurBillet(123456)).toBeGreaterThanOrEqual(44);
    });
  });
});
