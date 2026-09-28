/**
 * Vitest — Tests du jour LOCAL (remplace le jour UTC pour le bucketing
 * « aujourd'hui »). Migration depuis `jourLocal.test.mts` (helpers ad-hoc
 * `ok()/eq()` + `process.exit(1)`). Le test legacy continue de s'exécuter
 * via `tsx` (`npm run test:jour`) — cohabitation INIT-021.
 *
 * Note déterminisme : on construit les dates via `new Date(an, mois, jour, …)`
 * (composantes LOCALES) → indépendant du fuseau de la machine de CI.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { jourLocal, estAujourdhui } from "./jourLocal.js";

describe("jourLocal — format & composantes locales", () => {
  it("5 janv → 2026-01-05 (padding mois)", () => {
    expect(jourLocal(new Date(2026, 0, 5, 10, 0, 0))).toBe("2026-01-05");
  });

  it("3 sept 23:59 → 2026-09-03 (padding jour+mois)", () => {
    expect(jourLocal(new Date(2026, 8, 3, 23, 59, 0))).toBe("2026-09-03");
  });

  it("31 déc → 2026-12-31", () => {
    expect(jourLocal(new Date(2026, 11, 31, 0, 0, 0))).toBe("2026-12-31");
  });
});

describe("jourLocal — chaîne ISO locale (sans Z) prise en heure locale", () => {
  it("ISO locale midi → 2026-03-07", () => {
    expect(jourLocal("2026-03-07T12:00:00")).toBe("2026-03-07");
  });
});

describe("jourLocal — entrées invalides", () => {
  it("vide → ''", () => {
    expect(jourLocal("")).toBe("");
  });

  it("invalide → ''", () => {
    expect(jourLocal("pas-une-date")).toBe("");
  });
});

describe("estAujourdhui", () => {
  const ref = new Date(2026, 7, 16, 12, 0, 0);

  it("même jour local → true", () => {
    expect(estAujourdhui(new Date(2026, 7, 16, 9, 0, 0), ref)).toBe(true);
  });

  it("veille → false", () => {
    expect(estAujourdhui(new Date(2026, 7, 15, 23, 0, 0), ref)).toBe(false);
  });

  it("vide → false", () => {
    expect(estAujourdhui("", ref)).toBe(false);
  });
});
