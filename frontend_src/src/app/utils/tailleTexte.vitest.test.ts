/**
 * Vitest — Tests de la TAILLE DU TEXTE (zoom réel, Paramètres).
 * Migration depuis `tailleTexte.test.mts` (helpers ad-hoc `ok()/eq()` +
 * `main()` + `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:taille`) — cohabitation INIT-021.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import {
  zoomPourTaille,
  appliquerTailleTexte,
  ZOOMS_TEXTE,
  TAILLE_TEXTE_DEFAUT,
  VAR_ZOOM_TEXTE,
} from "./tailleTexte.js";

/** Mini-faux CSSStyleDeclaration : ne retient que les propriétés posées. */
interface FauxStyle {
  setProperty(nom: string, valeur: string): void;
}

function makeStyle(): FauxStyle & { posees: Record<string, string> } {
  const posees: Record<string, string> = {};
  return {
    posees,
    setProperty(nom: string, valeur: string) {
      posees[nom] = valeur;
    },
  };
}

describe("Zoom par cran du curseur", () => {
  it("cran normal (3) → 100 %", () => {
    expect(zoomPourTaille(TAILLE_TEXTE_DEFAUT)).toBe(1);
  });

  it("cran minimum → 85 %", () => {
    expect(zoomPourTaille(0)).toBe(0.85);
  });

  it("cran maximum → 130 %", () => {
    expect(zoomPourTaille(6)).toBe(1.3);
  });

  it("chaque cran est strictement plus grand que le précédent", () => {
    for (let i = 1; i < ZOOMS_TEXTE.length; i++) {
      expect(ZOOMS_TEXTE[i]).toBeGreaterThan(ZOOMS_TEXTE[i - 1]);
    }
  });
});

describe("Valeurs hors bornes ou invalides → jamais de casse (100 %)", () => {
  it("cran négatif → 100 %", () => {
    expect(zoomPourTaille(-1)).toBe(1);
  });

  it("cran trop grand → 100 %", () => {
    expect(zoomPourTaille(99)).toBe(1);
  });

  it("NaN → 100 %", () => {
    expect(zoomPourTaille(Number.NaN)).toBe(1);
  });

  it("valeur décimale 2.6 → arrondie au cran 3 (100 %)", () => {
    expect(zoomPourTaille(2.6)).toBe(1);
  });

  it("valeur décimale 1.4 → arrondie au cran 1 (90 %)", () => {
    expect(zoomPourTaille(1.4)).toBe(0.9);
  });
});

describe("Application : la variable CSS est posée", () => {
  it("cran 5 → zoom 120 % renvoyé et variable posée", () => {
    const style = makeStyle();
    expect(appliquerTailleTexte(style, 5)).toBe(1.2);
    expect(style.posees[VAR_ZOOM_TEXTE]).toBe("1.2");
  });

  it("retour au cran normal → variable remise à 1", () => {
    const style = makeStyle();
    appliquerTailleTexte(style, TAILLE_TEXTE_DEFAUT);
    expect(style.posees[VAR_ZOOM_TEXTE]).toBe("1");
  });
});
