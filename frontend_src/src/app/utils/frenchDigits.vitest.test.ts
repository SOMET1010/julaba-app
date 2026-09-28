/**
 * Vitest — Tests de la transformation STT → chiffres de numéro de téléphone
 * (frenchWordsToDigits / extractPhoneDigits / fusionnerChiffresDictes).
 * Migration depuis `frenchDigits.test.mts` (helpers ad-hoc `eq()` +
 * `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:frenchdigits`) — cohabitation INIT-021.
 *
 * CORRECTIF ciblé : fusionnerChiffresDictes doit laisser une passe FINALE
 * (repasse complète de l'audio capté par le moteur, la plus fiable) faire
 * autorité sur le résultat retenu, MÊME si elle est plus courte qu'un partiel
 * précédent — sinon un partiel halluciné plus long (bruit de fond) n'est jamais
 * corrigé et on affiche un numéro erroné (bug constaté en recette).
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import {
  extractPhoneDigits,
  frenchWordsToDigits,
  fusionnerChiffresDictes,
} from "./frenchDigits.js";

describe("frenchWordsToDigits — mots → chiffres", () => {
  it("chiffres dictés un par un", () => {
    expect(frenchWordsToDigits("zéro sept un deux trois quatre cinq six sept huit")).toBe("0712345678");
  });

  it("paires composées (soixante-dix-sept, douze)", () => {
    expect(frenchWordsToDigits("zéro sept soixante-dix-sept douze")).toBe("07 77 12".replace(/ /g, ""));
  });

  it("déjà des chiffres bruts", () => {
    expect(frenchWordsToDigits("07 12 34 56 78")).toBe("0712345678");
  });
});

describe("extractPhoneDigits — priorité au résultat le plus complet", () => {
  it("mots → 10 chiffres", () => {
    expect(extractPhoneDigits("zéro sept zéro un zéro deux zéro trois zéro quatre")).toBe("0701020304");
  });

  it("chiffres bruts → inchangé", () => {
    expect(extractPhoneDigits("0701020304")).toBe("0701020304");
  });

  it("texte vide → vide", () => {
    expect(extractPhoneDigits("")).toBe("");
  });
});

describe("fusionnerChiffresDictes — la repasse FINALE fait toujours autorité", () => {
  // Cas du bug constaté en recette : un partiel halluciné (bruit de fond) donne
  // 10 chiffres invalides ; la repasse finale, plus fiable, revient à un résultat
  // PLUS COURT — elle doit quand même l'emporter, jamais être écrasée par
  // l'ancien partiel plus long.
  it("finale plus courte l'emporte sur un partiel halluciné plus long", () => {
    expect(fusionnerChiffresDictes(true, "07", "7000000000")).toBe("07");
  });

  it("finale plus longue l'emporte aussi (cas normal)", () => {
    expect(fusionnerChiffresDictes(true, "0701020304", "070102")).toBe("0701020304");
  });

  it("finale vide l'emporte même sur un partiel déjà complet (résultat définitif du moteur)", () => {
    expect(fusionnerChiffresDictes(true, "", "0701020304")).toBe("");
  });
});

describe("fusionnerChiffresDictes — un partiel ne fait QUE grandir (jamais raccourcir/corriger)", () => {
  it("partiel plus court ignoré, on garde le meilleur connu", () => {
    expect(fusionnerChiffresDictes(false, "0701", "070102")).toBe("070102");
  });

  it("partiel plus long accepté", () => {
    expect(fusionnerChiffresDictes(false, "07010203", "070102")).toBe("07010203");
  });

  it("partiel de MÊME longueur accepté (révision à contexte égal)", () => {
    expect(fusionnerChiffresDictes(false, "070999", "070102")).toBe("070999");
  });
});
