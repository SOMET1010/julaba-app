/**
 * Vitest — ARGENT-1 : le second maillon de la preuve — ligne persistée -> écran
 * -> voix. Migration depuis `margePartielle.test.mts` (helpers ad-hoc `eq()` +
 * `process.exit(1)` + `node:fs`). Le test legacy continue via `tsx`
 * (`npm run test:marge-partielle`) — cohabitation INIT-021.
 *
 * Le premier maillon (entrée métier -> contrôleur -> ligne persistée) est tenu
 * par `backend/test/invariants/argent-marge-panier-mixte.spec.ts`. LES DEUX
 * LISENT LE MÊME FICHIER DE DONNÉES, `tests/fixtures/argent-panier-mixte.json`,
 * pour qu'aucun des deux côtés ne puisse rester vert en se trompant seul.
 *
 * LA RÈGLE (arbitrage de Patrick, 19/09/2026) : une ligne sans prix d'achat ne
 * vaut ni zéro coût ni zéro information. On dit le chiffre qu'on sait — 100 F —
 * ET sa limite. Jamais l'un sans l'autre.
 *
 * Environnement : `node` (lecture fs du fichier de fixture).
 *
 * Lancer : `npm run test:vitest`.
 */
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { etatMarge, libelleMarge, phraseMarge } from "./margeVente.js";
import { montantAffiche } from "../config/devise.js";

// LES MONTANTS SE COMPARENT AU FORMATEUR CANONIQUE, jamais à une recopie.
// `montantAffiche` place une espace INSÉCABLE (U+00A0) entre le nombre et le
// « F » : une chaîne tapée à la main dans un test ne porte pas ce caractère —
// et c'est le TEST qui a tort, pas le code. Cette erreur a déjà été commise
// deux fois sur ce dépôt ; on la rend impossible.
interface Fixture {
  vente: {
    montant: number;
    details: Array<{ nom: string; quantite: number; prix: number; total: number; prix_achat?: number; unite?: string }>;
  };
  attendu: {
    marge_persistee: number;
    etat: "connue" | "partielle" | "inconnue";
    libelle_ecran: string;
    phrase_tata: string;
  };
}

const FIXTURE: Fixture = JSON.parse(
  readFileSync(new URL("../../../../tests/fixtures/argent-panier-mixte.json", import.meta.url), "utf8"),
);

describe("Le panier mixte du fichier de données — le MÊME que côté serveur", () => {
  const mixte = etatMarge(FIXTURE.vente.details);

  it("l’état est « partielle » : on sait une partie, pas tout", () => {
    expect(mixte.type).toBe(FIXTURE.attendu.etat);
  });

  it("le montant est celui des seules lignes coûtées (100)", () => {
    expect(mixte.type === "partielle" ? mixte.montant : null).toBe(FIXTURE.attendu.marge_persistee);
  });

  it("l’écran dit « Marge connue », pas « marge »", () => {
    expect(libelleMarge(mixte)).toBe(`Marge connue : ${montantAffiche(100)}`);
  });

  it("…et c’est bien le libellé écrit dans le fichier de données", () => {
    expect(libelleMarge(mixte).replace(/\u00a0/g, " ")).toBe(FIXTURE.attendu.libelle_ecran);
  });

  it("Tata dit le chiffre ET sa limite", () => {
    expect(phraseMarge(mixte)).toBe(FIXTURE.attendu.phrase_tata);
  });
});

describe("Les trois autres états ne changent pas", () => {
  describe("État « connue » (toutes les lignes coûtées)", () => {
    const toutConnu = etatMarge([{ nom: "Riz", quantite: 1, total: 500, prix_achat: 400 }]);

    it("toutes les lignes coûtées → « connue »", () => {
      expect(toutConnu.type).toBe("connue");
    });

    it("…et la marge vaut 100", () => {
      expect(toutConnu.type === "connue" ? toutConnu.montant : null).toBe(100);
    });

    it("l’écran garde sa formulation actuelle", () => {
      expect(libelleMarge(toutConnu)).toBe(`+${montantAffiche(100)} marge`);
    });

    it("la voix garde sa formulation actuelle", () => {
      expect(phraseMarge(toutConnu)).toBe("marge 100 francs");
    });
  });

  describe("État « perte connue »", () => {
    const perte = etatMarge([{ nom: "Riz", quantite: 1, total: 800, prix_achat: 1000 }]);

    it("une perte reste un état CONNU", () => {
      expect(perte.type).toBe("connue");
    });

    it("une perte est une perte : −200", () => {
      expect(perte.type === "connue" ? perte.montant : null).toBe(-200);
    });

    it("l’écran nomme la perte", () => {
      expect(libelleMarge(perte)).toBe(`Perte : ${montantAffiche(200)}`);
    });

    it("la voix nomme la perte", () => {
      expect(phraseMarge(perte)).toBe("mais tu as perdu 200 francs dessus");
    });
  });

  describe("État « inconnue »", () => {
    const inconnue = etatMarge([{ nom: "Piment", quantite: 1, total: 300 }]);

    it("aucune ligne coûtée → « inconnue »", () => {
      expect(inconnue.type).toBe("inconnue");
    });

    it("l’écran ne fabrique aucun chiffre", () => {
      expect(libelleMarge(inconnue)).toBe("marge —");
    });

    it("Tata se tait plutôt que d’inventer", () => {
      expect(phraseMarge(inconnue)).toBe("");
    });
  });
});

describe("Un panier mixte qui perd de l’argent sur ce qu’on sait", () => {
  const mixtePerte = etatMarge([
    { nom: "Riz", quantite: 1, total: 800, prix_achat: 1000 },
    { nom: "Piment", quantite: 1, total: 300 },
  ]);

  it("partielle, même quand la partie connue est une perte", () => {
    expect(mixtePerte.type).toBe("partielle");
  });

  it("la perte connue n’est pas masquée par la ligne inconnue", () => {
    expect(mixtePerte.type === "partielle" ? mixtePerte.montant : null).toBe(-200);
  });

  it("l’écran dit la perte ET sa limite", () => {
    expect(libelleMarge(mixtePerte)).toBe(`Perte connue : ${montantAffiche(200)}`);
  });

  it("Tata dit la perte ET sa limite", () => {
    expect(phraseMarge(mixtePerte)).toBe(
      "Sur les articles dont tu connais le prix d’achat, tu as perdu 200 francs.",
    );
  });
});

describe("Le cas qui a tout déclenché : ne jamais rendre le chiffre partiel indiscernable d’un chiffre complet", () => {
  it("une marge partielle ne s’affiche JAMAIS comme une marge complète", () => {
    const mixte = etatMarge(FIXTURE.vente.details);
    const toutConnu = etatMarge([{ nom: "Riz", quantite: 1, total: 500, prix_achat: 400 }]);
    expect(libelleMarge(mixte)).not.toBe(libelleMarge(toutConnu));
  });
});
