import { shouldQueueVoiceAction } from "./offlineVoicePolicy.js";

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

ok(shouldQueueVoiceAction(false, true), "hors ligne + action : commande mise en file locale");
ok(!shouldQueueVoiceAction(true, true), "en ligne + action : exécution immédiate autorisée");
ok(!shouldQueueVoiceAction(false, false), "hors ligne sans écriture : aucune synchronisation à prévoir");

console.log(failures === 0 ? "\nPolitique d’action vocale hors ligne validée." : `\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
