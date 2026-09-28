/**
 * Vitest — Vignettes locales : le repli qui permet de reconnaître un produit
 * sans réseau. Migration depuis `emojiTile.test.mts` (helpers ad-hoc `ok()` +
 * `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:vignette`) — cohabitation INIT-021.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { emojiTile, vignetteProduit } from "./emojiTile.js";

/** L'emoji réellement dessiné dans la vignette. */
const emojiDe = (uri: string): string =>
  decodeURIComponent(uri).match(/central'>(.+?)<\/text>/)?.[1] ?? "";

describe("Une vignette ne dépend d’aucun réseau", () => {
  it("image embarquée dans la page, pas une URL", () => {
    expect(emojiTile("🍅").startsWith("data:image/svg+xml")).toBe(true);
  });

  it("aucune adresse distante — rien à télécharger", () => {
    // `xmlns='http://www.w3.org/2000/svg'` est une déclaration de norme, pas
    // une requête : on l'écarte avant de chercher une vraie adresse distante.
    const sansNorme = decodeURIComponent(emojiTile("🍅")).replace(/xmlns='[^']*'/g, "");
    expect(/https?:\/\//.test(sansNorme)).toBe(false);
  });
});

describe("Chaque produit retombe sur SON image, pas sur un panier générique", () => {
  it("tomate", () => {
    expect(emojiDe(vignetteProduit("Tomate"))).toBe("🍅");
  });

  it("igname", () => {
    expect(emojiDe(vignetteProduit("Igname"))).toBe("🍠");
  });

  it("aubergine", () => {
    expect(emojiDe(vignetteProduit("Aubergine"))).toBe("🍆");
  });

  it("arachide", () => {
    expect(emojiDe(vignetteProduit("Arachide"))).toBe("🥜");
  });
});

describe("Le nom arrive tel que la marchande l’a saisi", () => {
  it("minuscules et pluriel", () => {
    expect(emojiDe(vignetteProduit("tomates fraîches"))).toBe("🍅");
  });

  it("majuscules et espaces", () => {
    expect(emojiDe(vignetteProduit("  PIMENT  "))).toBe("🌶️");
  });

  it("nom composé", () => {
    expect(emojiDe(vignetteProduit("Banane plantain"))).toBe("🍌");
  });
});

describe("Jamais de case vide, quoi qu’il arrive", () => {
  it("produit inconnu : un panier, pas du vide", () => {
    expect(emojiDe(vignetteProduit("Produit inconnu du catalogue"))).toBe("🧺");
  });

  it("nom vide : un panier aussi", () => {
    expect(emojiDe(vignetteProduit(""))).toBe("🧺");
  });

  it("nom absent : un panier aussi", () => {
    expect(emojiDe(vignetteProduit(null))).toBe("🧺");
  });
});

describe("Un piège d’ordre : « plantain » ne doit pas être mangé par « banane »", () => {
  it("plantain reconnu", () => {
    expect(emojiDe(vignetteProduit("Plantain"))).toBe("🍌");
  });
});
