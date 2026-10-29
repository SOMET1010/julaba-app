import { playTataChoice, resolveLocalVoiceChoice } from "./localVoiceChoice.js";

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

const withClip = resolveLocalVoiceChoice("/voix/tata/ui-128.mp3");
ok(withClip.mode === "clip" && withClip.clipUrl === "/voix/tata/ui-128.mp3", "un clip Tata embarqué est lu");
ok(resolveLocalVoiceChoice(null).mode === "text_only", "une réponse dynamique ne déclenche aucune voix de secours");
ok(resolveLocalVoiceChoice(undefined).mode === "text_only", "l’absence de clip reste visible sans appel réseau");

let reads = 0;
await playTataChoice(withClip, async () => { reads++; });
ok(reads === 1, "un clip Tata produit une seule lecture");
await playTataChoice(resolveLocalVoiceChoice(null), async () => { reads++; });
ok(reads === 1, "sans clip Tata, aucune voix navigateur ou lecture secondaire ne démarre");

console.log(failures === 0 ? "\nChoix B de voix locale validé." : `\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
