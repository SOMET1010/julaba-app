// Tests du clavier imagé (module pur) — Variante A.
// Lancer :  npx tsx src/app/services/clavierImage.test.mts

import { IMAGE_PAR_CHIFFRE, glyphePourChiffre } from "./clavierImage.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function main(): void {
  console.log("\n[1] Table complète et sans doublon");
  const chiffres = Object.keys(IMAGE_PAR_CHIFFRE).sort();
  ok(chiffres.length === 10, "10 entrées (0 à 9)");
  ok(JSON.stringify(chiffres) === JSON.stringify(['0','1','2','3','4','5','6','7','8','9']), "exactement les chiffres 0-9");
  const images = Object.values(IMAGE_PAR_CHIFFRE);
  ok(new Set(images).size === images.length, "aucune image utilisée deux fois (pas d'ambiguïté)");
  ok(images.every((v) => v.length > 0), "aucune image vide");

  console.log("\n[2] Mode chiffres : identité — le PIN affiché est le PIN réel");
  for (const c of chiffres) ok(glyphePourChiffre(c, false) === c, `mode chiffres, « ${c} » → « ${c} »`);

  console.log("\n[3] Mode images : chaque chiffre a bien SON image de la table");
  for (const c of chiffres) ok(glyphePourChiffre(c, true) === IMAGE_PAR_CHIFFRE[c], `mode images, « ${c} » → ${IMAGE_PAR_CHIFFRE[c]}`);

  console.log("\n[4] Entrée hors table (garde-fou) : jamais de trou visuel");
  ok(glyphePourChiffre('x', true) === 'x', "chiffre inconnu → retombe sur la valeur telle quelle");

  console.log(failures === 0 ? "\nTous les tests clavierImage passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

main();
