/**
 * VOX-05a (lot séparation voix/affichage, 10/11) — verrou de non-régression
 * du contrat de `speak` :
 *
 *   1. l'INTERFACE AppContext déclare la promesse de fin réelle de parole
 *      (`Promise<void>`), pas `void` — le `void` déclaré rendait impossible
 *      aux appelants de dépendre sereinement de la fin RÉELLE de parole ;
 *   2. `POSCaisse.dire` RETOURNE la promesse `speak(t)` SANS cast — un cast
 *      qui remasque la promesse (pattern « as unknown as void ») re-créé le
 *      risque de chevauchement, surtout sur TTS natif sherpa où la fin de
 *      parole est lente (observé sur APK : voix superposée à l'avance de
 *      l'écran) ;
 *   3. `AppContext.speak` attend `audioManager.speak` jusqu'à la fin réelle
 *      (fin du dernier morceau, natif ou navigateur), jamais une durée devinée.
 *
 * Avant/après mesurables : le diff résout les deux sites ; la suite passe la
 * chaîne complète de contrôles (typecheck, tests).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..', '..', '..');

const sourceAppContext = readFileSync(join(racine, 'app/contexts/AppContext.tsx'), 'utf8');
const sourcePOSCaisse = readFileSync(join(racine, 'app/components/marchand/POSCaisse.tsx'), 'utf8');

let echecs = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { echecs++; console.error(`  ✗ ${label}`); }
}

console.log('VOX-05a — contrat de speak, fin réelle de parole (POS Caisse)');

ok(
  /speak:\s*\(text: string\) => Promise<void>/.test(sourceAppContext),
  "interface AppContext déclare une promesse (Promise<void>)",
);
ok(
  !/speak:\s*\(text: string\) => void;/.test(sourceAppContext),
  "interface ne déclare plus void (contrat perdu)",
);
ok(
  /await\s+audioManager\.speak\(safeText/.test(sourceAppContext),
  "AppContext.speak attend audioManager.speak (fin réelle)",
);
ok(
  !/as unknown as void \| Promise<void>/.test(sourcePOSCaisse),
  "POSCaisse.dire : plus de cast masquant la promesse",
);
ok(
  /const dire = \(t: string\) => \{ if \(guidageVocal\(\)\) return speak\(t\); \};/.test(sourcePOSCaisse),
  "POSCaisse.dire retourne speak(t) directement",
);
const autres = [
  'app/components/marchand/BoutonDirePrix.tsx',
  'app/components/marchand/BoutonDireQuantite.tsx',
  'app/components/marchand/BoutonDireNom.tsx',
  'app/components/marchand/BoutonDireUnite.tsx',
  'app/components/marchand/SaisieGuidee.tsx',
  'app/components/marchand/AjoutProduitGuide.tsx',
];
for (const chemin of autres) {
  const src = readFileSync(join(racine, chemin), 'utf8');
  ok(!/speak\([^)]*\)\s+as\s+unknown/.test(src), `pas de masquage de la promesse dans ${chemin}`);
}

if (echecs > 0) {
  console.error(`✗ ${echecs} contrôle(s) en échec`);
  process.exit(1);
}
console.log('  ✓ VOX-05a verrouillée');
