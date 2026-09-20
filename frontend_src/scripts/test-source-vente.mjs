/**
 * Garde-fou : une vente DICTÉE doit rester reconnaissable comme telle.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR, relevé par Patrick le 18/09 sur ses
 * ventes réelles : l'écran « Ventes passées » badgeait TOUT en « kassa », y
 * compris ce qu'il venait de dicter, et l'onglet « Par la voix » restait vide
 * quoi qu'il fasse.
 *
 * La cause n'était pas l'affichage. Une vente vocale et une vente à la caisse
 * empruntent le MÊME chemin : la voix ne fait que remplir le panier, c'est
 * toujours « Encaisser » qui enregistre. Le backend savait pourtant recevoir
 * l'information (`source: body.source || 'kassa'`) — c'est le front qui ne
 * l'envoyait jamais. La colonne prenait donc sa valeur par défaut pour toutes
 * les ventes.
 *
 * POURQUOI ÇA COMPTE POUR UNE MARCHANDE. Le jour où elle se demande si la voix
 * lui fait perdre de l'argent, « Par la voix » est le seul endroit où la
 * question se répond. Un onglet structurellement vide ne dit pas « aucune
 * vente » : il dit « la voix ne sert à rien », ce qui est faux.
 *
 * Ce test lit le CÂBLAGE, maillon par maillon : il suffit qu'un seul saute pour
 * que l'information se perde en route, sans aucune erreur visible.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const src = (...p) => readFileSync(join(ICI, '..', 'src', ...p), 'utf8');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

const api = src('app', 'services', 'api', 'caisse-api.ts');
const contexte = src('app', 'contexts', 'CaisseContext.tsx');
const caisse = src('app', 'components', 'marchand', 'POSCaisse.tsx');
// Le moteur vocal a convergé vers la caisse (VOIX-01, lot B) : VenteVocaleModal
// n'existe plus, c'est MicroVenteCaisse qui remplit le panier à la voix.
const micro = src('app', 'components', 'marchand', 'MicroVenteCaisse.tsx');

console.log('\nLe câblage qui distingue une vente dictée d’une vente tapée');

verifier(
  'le contrat d’API porte un champ `source`',
  /source\?:\s*'vocal'\s*\|\s*'kassa'/.test(api),
  'sans lui, rien ne peut partir au serveur — le défaut d’origine.',
);

verifier(
  'la voix marque ses lignes en `vocal`',
  (micro.match(/addToCart\([^;]*'vocal'\)/g) || []).length >= 2,
  'les DEUX appels comptent : produit du catalogue ET produit inconnu (vente libre).',
);

verifier(
  'le panier sait porter cette origine',
  /origine\?:\s*'vocal'/.test(contexte),
  'la ligne est la seule à savoir qui l’a créée ; la vente en hérite.',
);

verifier(
  'l’origine SURVIT à la fusion de deux lignes',
  /\.\.\.\(origine \? \{ origine \} : \{\}\)/.test(contexte),
  'un panier dicté puis complété au doigt reste un panier où la voix a servi.',
);

verifier(
  'l’encaissement déduit la source du panier',
  /cart\.some\(\(i\) => i\.origine === 'vocal'\)/.test(caisse),
  'c’est le seul endroit qui voit toutes les lignes au moment d’enregistrer.',
);

verifier(
  'la source part vraiment dans la vente envoyée',
  /\.\.\.\(source \? \{ source \} : \{\}\)/.test(contexte),
  'elle doit être dans le payload, donc aussi dans la file hors-ligne.',
);

if (echecs > 0) {
  console.log('\n✗ source des ventes — échec : une vente dictée redeviendrait invisible');
  process.exit(1);
}
console.log('\n✓ source des ventes — le câblage tient de bout en bout');
