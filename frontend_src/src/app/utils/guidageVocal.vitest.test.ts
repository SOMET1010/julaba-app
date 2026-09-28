/**
 * Vitest — Tests de la décision de guidage vocal (`guidageActif`, pur — sans
 * localStorage). Migration depuis `guidageVocal.test.mts` (helpers ad-hoc
 * `eq()` + `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:guidage`) — cohabitation INIT-021.
 *
 * Règle : le guidage n'est coupé QUE si l'utilisatrice a explicitement choisi
 * « lecture ». « Automatique » ne devient jamais muet.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { guidageActif } from "./accessMode.js";

describe("guidageActif — mode CHOISI seul", () => {
  it("auto → guide (fini le muet)", () => {
    expect(guidageActif("auto")).toBe(true);
  });

  it("lecture (choix explicite) → muet", () => {
    expect(guidageActif("lecture")).toBe(false);
  });

  it("mixte → guide", () => {
    expect(guidageActif("mixte")).toBe(true);
  });

  it("voix → guide", () => {
    expect(guidageActif("voix")).toBe(true);
  });
});

describe("guidageActif — mode EFFECTIF explicite respecté (rétro-compat auth)", () => {
  it("effectif lecture fourni → muet", () => {
    expect(guidageActif("auto", "lecture")).toBe(false);
  });

  it("effectif voix fourni → guide", () => {
    expect(guidageActif("auto", "voix")).toBe(true);
  });

  it("effectif mixte fourni prime → guide", () => {
    expect(guidageActif("lecture", "mixte")).toBe(true);
  });
});
