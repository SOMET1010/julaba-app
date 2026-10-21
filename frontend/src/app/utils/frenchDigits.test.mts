/**
 * Tests de la transformation STT → chiffres de numéro de téléphone
 * (frenchWordsToDigits / extractPhoneDigits / fusionnerChiffresDictes).
 *
 * CORRECTIF ciblé : fusionnerChiffresDictes doit laisser une passe FINALE
 * (repasse complète de l'audio capté par le moteur, la plus fiable) faire
 * autorité sur le résultat retenu, MÊME si elle est plus courte qu'un
 * partiel précédent — sinon un partiel halluciné plus long (bruit de fond,
 * imprécision du moteur) n'est jamais corrigé par la repasse finale, et on
 * affiche un numéro erroné (bug constaté en recette : « 70 00 00 00 00 »
 * affiché au lieu du vrai numéro dicté).
 * Lancer : npm run test:frenchdigits
 */
import { extractPhoneDigits, frenchWordsToDigits, fusionnerChiffresDictes } from "./frenchDigits.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (a === b) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}

console.log("frenchWordsToDigits — mots → chiffres");
eq(frenchWordsToDigits("zéro sept un deux trois quatre cinq six sept huit"), "0712345678", "chiffres dictés un par un");
eq(frenchWordsToDigits("zéro sept soixante-dix-sept douze"), "07 77 12".replace(/ /g, ""), "paires composées (soixante-dix-sept, douze)");
eq(frenchWordsToDigits("07 12 34 56 78"), "0712345678", "déjà des chiffres bruts");

console.log("extractPhoneDigits — priorité au résultat le plus complet");
eq(extractPhoneDigits("zéro sept zéro un zéro deux zéro trois zéro quatre"), "0701020304", "mots → 10 chiffres");
eq(extractPhoneDigits("0701020304"), "0701020304", "chiffres bruts → inchangé");
eq(extractPhoneDigits(""), "", "texte vide → vide");

console.log("fusionnerChiffresDictes — la repasse FINALE fait toujours autorité");
// Cas du bug constaté en recette : un partiel halluciné (bruit de fond) donne
// 10 chiffres invalides ; la repasse finale, plus fiable, revient à un résultat
// PLUS COURT (elle n'a pas encore tout entendu, ou corrige le bruit) — elle doit
// quand même l'emporter, jamais être écrasée par l'ancien partiel plus long.
eq(fusionnerChiffresDictes(true, "07", "7000000000"), "07", "finale plus courte l'emporte sur un partiel halluciné plus long");
eq(fusionnerChiffresDictes(true, "0701020304", "070102"), "0701020304", "finale plus longue l'emporte aussi (cas normal)");
eq(fusionnerChiffresDictes(true, "", "0701020304"), "", "finale vide l'emporte même sur un partiel déjà complet (résultat définitif du moteur)");

console.log("fusionnerChiffresDictes — un partiel ne fait QUE grandir (jamais raccourcir/corriger)");
eq(fusionnerChiffresDictes(false, "0701", "070102"), "070102", "partiel plus court ignoré, on garde le meilleur connu");
eq(fusionnerChiffresDictes(false, "07010203", "070102"), "07010203", "partiel plus long accepté");
eq(fusionnerChiffresDictes(false, "070999", "070102"), "070999", "partiel de MÊME longueur accepté (révision à contexte égal)");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests frenchDigits sont verts ✅");
