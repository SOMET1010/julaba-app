/**
 * LA FICHE MEMBRE N'AFFICHE NI « 00 » NI UN BADGE VIDE — démo 12/10/2026.
 *
 * LE DÉFAUT. Coopérative > Membres : « 00 commandes » (`padStart(2, '0')`) et
 * un badge « Spécialité » affiché quand l'activité est vide — le MOT de
 * l'intitulé posé comme s'il était une valeur.
 *
 * Lancer : npm run test:fiche-membre
 */
import { readFileSync } from 'node:fs';
import { compteAccorde } from './accordFrancais.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };
const eq = (a: unknown, b: unknown, quoi: string) => ok(a === b, `${quoi} (obtenu ${JSON.stringify(a)})`);

console.log('\nFiche membre : nombres et badges honnêtes\n');
eq(compteAccorde(0, 'commande'), '0 commande', '0 → « 0 commande » (singulier, sans zéro de remplissage)');
eq(compteAccorde(1, 'commande'), '1 commande', '1 → singulier');
eq(compteAccorde(2, 'commande'), '2 commandes', '2 → pluriel');
eq(compteAccorde(12, 'commande'), '12 commandes', '12 → pluriel');

const code = readFileSync(new URL('../components/cooperative/Membres.tsx', import.meta.url), 'utf8');
ok(!/padStart\(2, '0'\)\} commandes/.test(code), 'plus de « 00 commandes »');
ok(code.includes("compteAccorde(commandesMois, 'commande')"), 'la carte compte par compteAccorde');
ok(!/m\.activite \|\| 'Spécialité'/.test(code), 'plus de badge « Spécialité » sans valeur');
ok(/\{m\.activite\?\.trim\(\) && \(/.test(code), 'le badge d\'activité n\'existe que si l\'activité existe');
ok(!/\{m\.activite\} - \{m\.commune\}/.test(code), 'en-tête du tiroir : pas de « - commune » orphelin');

console.log(echecs === 0 ? '\n✓ fiche membre honnête\n' : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
