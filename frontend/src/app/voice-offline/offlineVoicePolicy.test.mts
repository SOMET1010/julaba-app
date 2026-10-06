import { shouldQueueVoiceAction } from "./offlineVoicePolicy.js";

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

ok(shouldQueueVoiceAction(false, true), "hors ligne + action : commande mise en file locale");
ok(!shouldQueueVoiceAction(true, true), "en ligne + action : exécution immédiate autorisée");
ok(!shouldQueueVoiceAction(false, false), "hors ligne sans écriture : aucune synchronisation à prévoir");

// Lot 2 (convergence voix/tactile POS) : intentions locales (« vendre » →
// ajout panier, aucune écriture serveur) — exécution immédiate même hors
// ligne, jamais mises en file.
ok(!shouldQueueVoiceAction(false, true, "vendre", ["vendre"]), "hors ligne + « vendre » listée en local : jamais mise en file");
ok(shouldQueueVoiceAction(false, true, "depense", ["vendre"]), "hors ligne + « depense » (pas dans la liste locale) : toujours mise en file");
ok(shouldQueueVoiceAction(false, true, "vendre"), "hors ligne + « vendre » SANS liste fournie : comportement par défaut inchangé (mise en file)");
ok(shouldQueueVoiceAction(false, true, "vendre", []), "hors ligne + « vendre » avec liste vide : comportement par défaut inchangé (mise en file)");
ok(!shouldQueueVoiceAction(true, true, "vendre", ["vendre"]), "en ligne + « vendre » listée en local : toujours exécution immédiate (comme avant)");

console.log(failures === 0 ? "\nPolitique d’action vocale hors ligne validée." : `\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
