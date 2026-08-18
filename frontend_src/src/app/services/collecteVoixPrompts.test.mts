// Tests de la file de consignes de collecte (Studio v1) — module pur.
// Lancer :  npx tsx src/app/services/collecteVoixPrompts.test.mts

import { PROMPTS_PLACEHOLDER_FR, prochainPrompt, type PromptCollecte } from "./collecteVoixPrompts.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function main(): void {
  console.log("\n[1] Référentiel — cohérence");
  const ids = PROMPTS_PLACEHOLDER_FR.map((p) => p.prompt_id);
  ok(PROMPTS_PLACEHOLDER_FR.length >= 10, "au moins 10 consignes de départ");
  ok(new Set(ids).size === ids.length, "aucun prompt_id en double");
  ok(PROMPTS_PLACEHOLDER_FR.every((p) => p.consigne.length > 0 && p.image.length > 0), "chaque consigne a un texte et une image");

  console.log("\n[2] Progression — jamais deux fois la même avant d'avoir fait le tour");
  let faits: string[] = [];
  const vus: string[] = [];
  for (let i = 0; i < PROMPTS_PLACEHOLDER_FR.length; i++) {
    const p = prochainPrompt(faits);
    ok(p !== null, `tour ${i}: une consigne est proposée`);
    if (p) { faits = [...faits, p.prompt_id]; vus.push(p.prompt_id); }
  }
  ok(new Set(vus).size === PROMPTS_PLACEHOLDER_FR.length, "toutes les consignes ont été vues avant répétition");

  console.log("\n[3] Reboucle après avoir tout fait");
  const apresTout = prochainPrompt(PROMPTS_PLACEHOLDER_FR.map((p) => p.prompt_id));
  ok(apresTout?.prompt_id === PROMPTS_PLACEHOLDER_FR[0].prompt_id, "reboucle sur la première consigne");

  console.log("\n[4] Référentiel vide — pas de crash");
  ok(prochainPrompt([], []) === null, "référentiel vide → null, jamais d'exception");

  console.log("\n[5] Référentiel personnalisé accepté (préparation dioula/baoulé future)");
  const mini: PromptCollecte[] = [{ prompt_id: 'x', image: '🟠', consigne: 'test', categorie: 'chiffre' }];
  ok(prochainPrompt([], mini)?.prompt_id === 'x', "un référentiel fourni explicitement est bien utilisé");

  console.log(failures === 0 ? "\nTous les tests collecteVoixPrompts passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

main();
