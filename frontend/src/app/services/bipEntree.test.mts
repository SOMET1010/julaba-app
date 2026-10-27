/**
 * LE BIP QUI PRÉCÈDE L'ÉCOUTE — le silence ne doit jamais planter.
 * Lancer : npx tsx src/app/services/bipEntree.test.mts
 *
 * Le bip est une frontière AUDIBLE entre la consigne de Tantie et le moment
 * de parler (« Dis ton numéro après le bip »). Il vit en WebAudio pur, sans
 * réseau, sans clip. CE QUE CES GARDES FIGENT :
 *   1. sans AudioContext (vieux navigateurs, environnements de test), le bip
 *      SE TAIT et ne lève RIEN — un bip qui casse ne bloque jamais l'écoute ;
 *   2. les constantes d'enveloppe sont déclarées (fréquence, durée) : le son
 *      reste un BIP court et doux, pas une sonnerie ;
 *   3. deux appels de suite ne lèvent rien (le contexte se réutilise).
 */
import { sonnerBipEntree, BIP_FREQUENCE_HZ, BIP_DUREE_S } from './bipEntree.js';

let failures = 0;
const ok = (cond: unknown, label: string, detail = '') => {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label, detail); failures++; }
};

console.log('\n[1] LES CONSTANTES D\'ENVELOPPE — un bip court, pas une sonnerie');
ok(BIP_FREQUENCE_HZ === 880, 'fréquence 880 Hz (aigu, identifiable, douce)', `obtenu: ${String(BIP_FREQUENCE_HZ)}`);
ok(BIP_DUREE_S > 0 && BIP_DUREE_S <= 0.5, 'durée ≤ 0,5 s', `obtenu: ${String(BIP_DUREE_S)}`);

console.log('\n[2] SANS AUDIOCONTEXT, ÇA SE TAIT — zéro exception (environnement sans WebAudio)');
let leve = false;
try { sonnerBipEntree(); } catch { leve = true; }
ok(!leve, 'sonnerBipEntree() sans AudioContext ne lève rien');

console.log('\n[3] DEUX APPELS DE SUITE — aucune accumulation d\'erreur');
try { sonnerBipEntree(); sonnerBipEntree(); ok(true, 'double bip sans exception'); }
catch (e) { ok(false, 'double bip sans exception', String(e)); }

if (failures) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log('\nBip d\'entrée : tous verts.');
