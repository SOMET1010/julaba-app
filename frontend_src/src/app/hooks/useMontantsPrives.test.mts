import { readFileSync } from 'node:fs';
import { montantPrive } from './useMontantsPrives.js';

let failures = 0;
function ok(condition: boolean, label: string) {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label); failures += 1; }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, `${label} — attendu ${String(expected)}, obtenu ${String(actual)}`);
}

console.log('\n[1] Format privé central');
eq(montantPrive(12500, false), '12 500 F', 'le montant visible garde le format français');
eq(montantPrive(12500, true), '••••• F', 'le montant masqué ne laisse aucun chiffre');

console.log('\n[2] État partagé pendant toute la session');
const hook = readFileSync(new URL('./useMontantsPrives.ts', import.meta.url), 'utf8');
ok(/sessionStorage/.test(hook), 'le choix survit aux navigations sans devenir un réglage permanent du compte');
ok(/useSyncExternalStore/.test(hook) && /MONTANTS_PRIVES_EVENT/.test(hook), 'tous les écrans montés se synchronisent sur une seule source');

console.log('\n[3] Aucune fuite depuis les écrans financiers principaux');
const accueil = readFileSync(new URL('../components/marchand/MarchandAccueilVoice.tsx', import.meta.url), 'utf8');
const historique = readFileSync(new URL('../components/marchand/VentesPassees.tsx', import.meta.url), 'utf8');
const modales = readFileSync(new URL('../components/marchand/MarchandModals.tsx', import.meta.url), 'utf8');
ok(/useMontantsPrives/.test(accueil), 'l’accueil utilise la confidentialité partagée');
ok(/useMontantsPrives/.test(historique), 'l’historique utilise la confidentialité partagée');
ok(/useMontantsPrives/.test(modales), 'le résumé et la clôture utilisent la confidentialité partagée');
ok((historique.match(/if \(montantsMasques\)\s*\{/g) || []).length >= 2, 'la voix et l’export refusent de révéler un montant caché');

console.log('\n[4] Historique allégé au premier affichage');
ok(/showOutils/.test(historique), 'les indicateurs et filtres avancés sont repliables');
ok(/Mes chiffres et filtres/.test(historique), 'le panneau secondaire est nommé en langage simple');

console.log(failures === 0 ? '\nConfidentialité financière partagée : OK ✅\n' : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
