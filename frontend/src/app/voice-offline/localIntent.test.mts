// Tests d'intentLocal — confirmation de vente/dépense (accord du pluriel inclus).
// Lancer :  npx tsx src/app/voice-offline/localIntent.test.mts

import { intentLocal } from "./localIntent.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function main(): void {
  console.log("\n[1] Accord du pluriel dans la confirmation");
  const deux = intentLocal("vends 2 tomate à 500 francs");
  ok(!!deux && deux.response.includes("2 tomates"), `2 → « tomates » (obtenu : ${deux?.response})`);
  const une = intentLocal("vends 1 tomate à 500 francs");
  ok(!!une && une.response.includes("1 tomate") && !une.response.includes("tomates"), "1 → singulier conservé");
  const riz = intentLocal("vends 3 riz à 500 francs");
  ok(!!riz && riz.response.includes("3 riz"), "mot en s/x/z invariable (riz)");

  console.log("\n[2] Comportements inchangés");
  const dep = intentLocal("dépense de 1000 francs pour le taxi");
  ok(!!dep && dep.intent === "depense", "dépense toujours reconnue");
  ok(intentLocal("bonjour") === null, "phrase non financière → null");
  ok(deux!.needsConfirmation === true, "une vente demande toujours confirmation");

  console.log(failures === 0 ? "\nTous les tests localIntent passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

main();
