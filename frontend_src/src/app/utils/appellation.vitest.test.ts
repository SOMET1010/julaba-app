/**
 * Vitest — Appellation : on appelle la personne comme ELLE l'a demandé.
 * Migration depuis `appellation.test.mts` (helpers ad-hoc `ok()` +
 * `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:appellation`) — cohabitation INIT-021.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { appellation, salutation } from "./appellation.js";

describe("Elle a dit comment elle veut qu’on l’appelle", () => {
  it("son choix est employé tel quel", () => {
    expect(appellation("Maman Awa", "Awa")).toBe("Maman Awa");
  });

  it("un autre choix, tout aussi respecté", () => {
    expect(appellation("Tantie Awa", "Awa")).toBe("Tantie Awa");
  });

  it("un marchand choisit son titre", () => {
    expect(appellation("Papa Kouassi", "Kouassi")).toBe("Papa Kouassi");
  });

  it("espaces nettoyés", () => {
    expect(appellation("  Maman Awa  ", "Awa")).toBe("Maman Awa");
  });
});

describe("Elle n’a rien dit — le prénom seul, JAMAIS un titre deviné", () => {
  it("prénom seul", () => {
    expect(appellation(undefined, "Awa")).toBe("Awa");
  });

  it("choix vide : prénom seul", () => {
    expect(appellation("", "Kouassi")).toBe("Kouassi");
  });

  it("choix en blancs : prénom seul", () => {
    expect(appellation("   ", "Awa")).toBe("Awa");
  });

  it("rien de connu : rien à dire", () => {
    expect(appellation(null, null)).toBe("");
  });
});

describe("Le genre n’entre JAMAIS dans la décision", () => {
  // Garde de doctrine : la signature n'accepte pas de genre. Si quelqu'un
  // rebranche un titre sur `users.genre` (valeur par défaut 'femme'), il
  // inventera un titre pour tout le monde — c'est le défaut qu'on répare.
  it("la fonction ne prend que le choix et le prénom", () => {
    expect(appellation.length).toBe(2);
  });
});

describe("Salutation complète", () => {
  it("avec son choix", () => {
    expect(salutation("Maman Awa", "Awa")).toBe("Bonjour Maman Awa");
  });

  it("sans choix : prénom seul", () => {
    expect(salutation(undefined, "Kouassi")).toBe("Bonjour Kouassi");
  });

  it("rien de connu : « Bonjour », et rien de faux", () => {
    expect(salutation(undefined, undefined)).toBe("Bonjour");
  });
});
