/**
 * Vitest — Tests du CONFORT VISUEL (normal / soleil / sombre, inclusion §2.4).
 * Migration depuis `confortVisuel.test.mts` (helpers ad-hoc `ok()/eq()` +
 * `main()` + `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:confort`) — cohabitation INIT-021.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import {
  lireConfort,
  appliquerClasse,
  ecrireConfort,
  CLE_CONFORT,
  ANCIENNE_CLE_SOMBRE,
} from "./confortVisuel.js";

/** Fausse racine DOM : ne retient que les classes posées/retirées. */
function makeRacine(): {
  classes: Set<string>;
  classList: { add(c: string): void; remove(c: string): void };
} {
  const classes = new Set<string>();
  return {
    classes,
    classList: {
      add: (c: string) => { classes.add(c); },
      remove: (c: string) => { classes.delete(c); },
    },
  };
}

function makeStore(seed: Record<string, string> = {}): {
  data: Record<string, string>;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
} {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

describe("Lecture du mode mémorisé", () => {
  it("rien de mémorisé → normal", () => {
    expect(lireConfort(makeStore())).toBe("normal");
  });

  it("soleil mémorisé → soleil", () => {
    expect(lireConfort(makeStore({ [CLE_CONFORT]: "soleil" }))).toBe("soleil");
  });

  it("sombre mémorisé → sombre", () => {
    expect(lireConfort(makeStore({ [CLE_CONFORT]: "sombre" }))).toBe("sombre");
  });

  it("valeur inconnue → normal (jamais de casse)", () => {
    expect(lireConfort(makeStore({ [CLE_CONFORT]: "n'importe quoi" }))).toBe("normal");
  });

  it("pas de stockage → normal", () => {
    expect(lireConfort(null)).toBe("normal");
  });
});

describe("Migration depuis l'ancien mode sombre (ThemeContext historique)", () => {
  it("ancien sombre actif, rien dans le nouveau réglage → sombre (elle retrouve son écran)", () => {
    expect(lireConfort(makeStore({ [ANCIENNE_CLE_SOMBRE]: "true" }))).toBe("sombre");
  });

  it("ancien sombre éteint → normal", () => {
    expect(lireConfort(makeStore({ [ANCIENNE_CLE_SOMBRE]: "false" }))).toBe("normal");
  });

  it("le NOUVEAU réglage gagne toujours sur l'ancien", () => {
    expect(
      lireConfort(makeStore({ [CLE_CONFORT]: "soleil", [ANCIENNE_CLE_SOMBRE]: "true" })),
    ).toBe("soleil");
  });
});

describe("Application : une classe à la fois, JAMAIS deux", () => {
  it("soleil → classe soleil seule", () => {
    const r = makeRacine();
    appliquerClasse(r, "soleil");
    expect(r.classes.has("soleil")).toBe(true);
    expect(r.classes.has("dark")).toBe(false);
  });

  it("sombre → dark posée, soleil RETIRÉE", () => {
    const r = makeRacine();
    appliquerClasse(r, "soleil");
    appliquerClasse(r, "sombre");
    expect(r.classes.has("dark")).toBe(true);
    expect(r.classes.has("soleil")).toBe(false);
  });

  it("retour soleil → dark RETIRÉE", () => {
    const r = makeRacine();
    appliquerClasse(r, "sombre");
    appliquerClasse(r, "soleil");
    expect(r.classes.has("soleil")).toBe(true);
    expect(r.classes.has("dark")).toBe(false);
  });

  it("normal → aucune classe", () => {
    const r = makeRacine();
    appliquerClasse(r, "soleil");
    appliquerClasse(r, "normal");
    expect(r.classes.has("soleil")).toBe(false);
    expect(r.classes.has("dark")).toBe(false);
  });
});

describe("Écriture : mémorise ET applique", () => {
  it("écriture réussie", () => {
    const r = makeRacine();
    const s = makeStore();
    expect(ecrireConfort(s, r, "sombre")).toBe(true);
    expect(s.data[CLE_CONFORT]).toBe("sombre");
    expect(r.classes.has("dark")).toBe(true);
  });

  it("retour au normal : classes retirées", () => {
    const r = makeRacine();
    const s = makeStore();
    ecrireConfort(s, r, "sombre");
    expect(ecrireConfort(s, r, "normal")).toBe(true);
    expect(r.classes.has("dark")).toBe(false);
    expect(r.classes.has("soleil")).toBe(false);
  });
});

describe("Stockage en panne : l'écran change quand même", () => {
  it("écriture → false (pas d'exception) mais la classe est posée MALGRÉ le stockage en panne", () => {
    const r = makeRacine();
    const casse: { getItem(): null; setItem(): never } = {
      getItem: () => null,
      setItem: () => { throw new Error("quota"); },
    };
    expect(ecrireConfort(casse, r, "soleil")).toBe(false);
    expect(r.classes.has("soleil")).toBe(true);
  });
});
