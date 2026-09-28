/**
 * Vitest — UNE VENTE À PERTE DOIT SE VOIR — arbitrage de Patrick, 19/09/2026.
 * Migration depuis `margePerte.test.mts` (helpers ad-hoc `ok()` +
 * `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:marge-perte`) — cohabitation INIT-021.
 *
 * LE DÉFAUT QU'ON FERME. `Math.max(0, …)` rendait une perte impossible à
 * afficher : produit acheté 1 000 F, vendu 800 F, résultat stocké 0 au lieu de
 * −200. « marge — » s'affichait alors, exactement comme pour une vente dont on
 * ignore le coût. Deux situations opposées, un seul écran.
 *
 * LA RÈGLE QUI SUBSISTE : « coût inconnu » n'est pas « coût nul ». Une ligne
 * sans prix d'achat reste IGNORÉE. Inventer une perte serait aussi faux
 * qu'inventer un gain.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { beneficeDepuisDetails } from "./margeVente.js";

describe("Le bénéfice dit la vérité, gain comme perte", () => {
  it("vendu 800 ce qui a coûté 1 000 → −200 (et non 0)", () => {
    expect(
      beneficeDepuisDetails([{ nom: "Tomate", quantite: 1, total: 800, prix_achat: 1000 }]),
    ).toBe(-200);
  });

  it("un vrai bénéfice reste un bénéfice : 600 − 3×100 = 300", () => {
    expect(
      beneficeDepuisDetails([{ nom: "Oignon", quantite: 3, total: 600, prix_achat: 100 }]),
    ).toBe(300);
  });

  it("vente mixte : −400 + 300 = −100 (l'ancien calcul disait +300)", () => {
    // LE CAS QUI RÉVÉLAIT LES DEUX MÉTHODES. Tomate vendue à perte, oignon en
    // marge : le total de la vente est déficitaire. L'ancien calcul client
    // annonçait +300 en ignorant la perte de la première ligne.
    const venteMixte = [
      { nom: "Tomate", quantite: 2, total: 200, prix_achat: 300 }, // −400
      { nom: "Oignon", quantite: 3, total: 600, prix_achat: 100 }, // +300
    ];
    expect(beneficeDepuisDetails(venteMixte)).toBe(-100);
  });
});

describe("Ce qui ne change PAS : un coût inconnu n’est pas un coût nul", () => {
  it("aucun prix d’achat → 0, jamais « 500 de marge »", () => {
    expect(beneficeDepuisDetails([{ nom: "Piment", quantite: 1, total: 500 }])).toBe(0);
  });

  it("prix d’achat à zéro → ligne ignorée, pas un bénéfice de 500", () => {
    expect(
      beneficeDepuisDetails([{ nom: "Piment", quantite: 1, total: 500, prix_achat: 0 }]),
    ).toBe(0);
  });

  it("ligne sans coût ignorée, la perte subsiste", () => {
    // Une ligne sans coût ne doit ni gonfler ni masquer la perte de l'autre.
    const mixte = [
      { nom: "Tomate", quantite: 1, total: 800, prix_achat: 1000 }, // −200
      { nom: "Piment", quantite: 1, total: 500 }, // ignorée
    ];
    expect(beneficeDepuisDetails(mixte)).toBe(-200);
  });

  it("détails absents → 0", () => {
    expect(beneficeDepuisDetails(null)).toBe(0);
  });

  it("détails illisibles → 0", () => {
    expect(beneficeDepuisDetails("pas un tableau")).toBe(0);
  });
});
