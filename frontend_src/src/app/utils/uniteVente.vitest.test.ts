/**
 * Vitest — L'UNITÉ APPARTIENT À LA VENTE, PAS AU CATALOGUE (arbitrage
 * 19/09/2026). Migration depuis `uniteVente.test.mts` (helpers ad-hoc `ok()` +
 * `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:unite-vente`) — cohabitation INIT-021.
 *
 * LE DÉFAUT QU'ON FERME (audit Odoo, constat 1) : un reçu disait « 3 × Tomate ».
 * Trois quoi ? L'unité ne vivait que dans `produits.unite`, que la marchande
 * peut changer : en passant la tomate du tas au kilo, TOUTES ses ventes
 * passées se relisaient au kilo — sans reconstitution possible.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import {
  quantiteAvecUnite,
  ligneLisible,
  accorderUnite,
  uniteSeule,
  uniteEntendue,
} from "./unite.utils.js";

describe("Une vente se lit avec son unité", () => {
  it("« 3 tas de Tomate »", () => {
    expect(ligneLisible(3, "Tomate", "tas")).toBe("3 tas de Tomate");
  });

  it("« 2 sacs de Riz »", () => {
    expect(ligneLisible(2, "Riz", "sac")).toBe("2 sacs de Riz");
  });

  it("au singulier, pas de « s » parasite", () => {
    expect(ligneLisible(1, "Riz", "sac")).toBe("1 sac de Riz");
  });
});

describe("Les accords, prudents par construction", () => {
  it("« tas » est invariable — on n’invente pas « tass »", () => {
    expect(accorderUnite("tas", 3)).toBe("tas");
  });

  it("« sac » prend son pluriel", () => {
    expect(accorderUnite("sac", 2)).toBe("sacs");
  });

  it("une abréviation ne se pluralise jamais : « 3 kg »", () => {
    expect(accorderUnite("kg", 3)).toBe("kg");
  });

  it("« litres »", () => {
    expect(accorderUnite("litre", 2)).toBe("litres");
  });

  it("quantité 1 : aucun pluriel", () => {
    expect(accorderUnite("portion", 1)).toBe("portion");
  });
});

describe("Ce qui n’apprend rien ne se dit pas", () => {
  it("« unité » est neutre : on retombe sur « 3 × Savon »", () => {
    expect(ligneLisible(3, "Savon", "unité")).toBe("3 × Savon");
  });

  it("même chose sans accent (article libre)", () => {
    expect(ligneLisible(3, "Savon", "unite")).toBe("3 × Savon");
  });

  it("vente d’AVANT ce correctif : forme historique conservée", () => {
    expect(ligneLisible(3, "Savon", undefined)).toBe("3 × Savon");
  });

  it("unité vide : idem", () => {
    expect(ligneLisible(3, "Savon", "")).toBe("3 × Savon");
  });

  it("« pièce » n’est PAS neutre — une marchande le dit", () => {
    expect(ligneLisible(3, "Banane", "pièce")).toBe("3 pièces de Banane");
  });
});

describe("La quantité seule, pour les endroits où le nom suit déjà", () => {
  it("« 3 tas »", () => {
    expect(quantiteAvecUnite(3, "tas")).toBe("3 tas");
  });

  it("les milliers restent lisibles (formatage fr-FR canonique)", () => {
    // On compare au formatage FRANÇAIS réel, pas à une chaîne écrite à la main :
    // `toLocaleString('fr-FR')` sépare les milliers par une espace insécable
    // ÉTROITE (U+202F), invisible à l'œil. Un attendu tapé au clavier échouerait.
    expect(quantiteAvecUnite(1500, "kg")).toBe(`${(1500).toLocaleString("fr-FR")} kg`);
  });

  it("sans unité : le nombre seul", () => {
    expect(quantiteAvecUnite(3, null)).toBe("3");
  });
});

describe("L'unité seule, pour la ligne de panier (la quantité est un champ à part)", () => {
  it("« tas » ne prend pas de s", () => {
    expect(uniteSeule(3, "tas")).toBe("tas");
  });

  it("« sacs » s’accorde", () => {
    expect(uniteSeule(2, "sac")).toBe("sacs");
  });

  it("au singulier, pas de s", () => {
    expect(uniteSeule(1, "sac")).toBe("sac");
  });

  it("une abréviation ne s’accorde jamais", () => {
    expect(uniteSeule(3, "kg")).toBe("kg");
  });

  it("« pièce » n’est pas neutre", () => {
    expect(uniteSeule(3, "pièce")).toBe("pièces");
  });

  it("« unité » n’apprend rien : rien à afficher", () => {
    expect(uniteSeule(3, "unité")).toBe("");
  });

  it("sans unité : rien à afficher", () => {
    expect(uniteSeule(3, null)).toBe("");
  });
});

describe("Ce qu’elle a dit, écrit comme la boutique l’écrit (lot E)", () => {
  it("« tas » reste « tas » — jamais « ta »", () => {
    expect(uniteEntendue("tas")).toBe("tas");
  });

  it("« kilos » s’écrit « kg », comme sur le bouton de la caisse", () => {
    expect(uniteEntendue("kilos")).toBe("kg");
  });

  it("la casse ne compte pas", () => {
    expect(uniteEntendue("Kilo")).toBe("kg");
  });

  it("« sacs » → « sac » : l’unité est figée au singulier, l’accord se fait à la lecture", () => {
    expect(uniteEntendue("sacs")).toBe("sac");
  });

  it("sans accent à l’oreille, avec accent à l’écrit : une seule graphie", () => {
    expect(uniteEntendue("regimes")).toBe("régime");
  });

  it("« unités » → « unité », la valeur par défaut d’un article libre", () => {
    expect(uniteEntendue("unités")).toBe("unité");
  });

  it("« pièce » n’est pas ramenée à « unité » — elle se dit, donc elle s’écrit", () => {
    expect(uniteEntendue("pièces")).toBe("pièce");
  });

  it("un pluriel en x connu de la table", () => {
    expect(uniteEntendue("morceaux")).toBe("morceau");
  });

  it("hors table : le singulier n’est pris que si accorderUnite le ré-accorde", () => {
    expect(uniteEntendue("bidons")).toBe("bidon");
  });

  it("la table protège les singuliers en s ; le reste suit le pluriel régulier", () => {
    // LIMITE ASSUMÉE : sans dictionnaire, un singulier en « s » hors table est
    // indistinguable d’un pluriel régulier. C’est pourquoi « tas » est DANS la
    // table — et pourquoi tout nouveau mot du même genre devra y entrer.
    expect(uniteEntendue("tas")).toBe("tas");
    expect(uniteEntendue("bassines")).toBe("bassine");
  });

  it("rien d’entendu → null : ce module n’invente pas d’unité", () => {
    expect(uniteEntendue(null)).toBe(null);
  });

  it("un blanc n’est pas une unité", () => {
    expect(uniteEntendue("   ")).toBe(null);
  });
});
