/**
 * Garde-fou : L'UNITÉ DOIT PARTIR AVEC LA VENTE, pas seulement s'afficher.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR (audit Odoo, constat 1 — le seul qui
 * détruisait de l'information de façon irréversible). L'unité ne vivait que
 * dans `produits.unite`, modifiable à tout moment par la marchande. Le jour où
 * elle passe la tomate du tas au kilo, TOUTES ses ventes passées se relisent au
 * kilo. Un reçu disant « 3 × Tomate » devient indéchiffrable, et aucune
 * reconstitution n'est possible : l'information est perdue pour de bon.
 *
 * Elle est désormais figée sur la LIGNE, au moment de la vente — même règle que
 * `prix_achat`, pour que la marge d'hier ne bouge pas quand le fournisseur
 * change de tarif.
 *
 * Ce test lit le CÂBLAGE : il suffit qu'un maillon saute pour que l'unité se
 * perde en route, sans aucune erreur visible. Un affichage correct au-dessus
 * d'une donnée non enregistrée serait le pire des deux mondes.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (...p) => readFileSync(join(ICI, '..', 'src', 'app', ...p), 'utf8');

const sansCommentaires = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '')
     .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const contexte = sansCommentaires(lire('contexts', 'CaisseContext.tsx'));
const caisse = sansCommentaires(lire('components', 'marchand', 'POSCaisse.tsx'));
const recu = sansCommentaires(lire('utils', 'recu.utils.ts'));
const dialogues = sansCommentaires(lire('services', 'dialoguesTata.ts'));
const vocal = sansCommentaires(lire('services', 'vendreVocalUnifie.ts'));

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

console.log('\nL’unité suit la vente de bout en bout');

verifier(
  'la ligne du panier porte une unité',
  /unite\?:\s*string/.test(contexte),
  'sans champ sur la ligne, l’unité n’existe qu’au catalogue — donc elle change avec lui.',
);

verifier(
  'elle est FIGÉE à la création de la ligne, depuis le produit',
  /\.\.\.\(product\.unite \? \{ unite: String\(product\.unite\) \} : \{\}\)/.test(contexte),
  'captée une fois pour toutes, comme prix_achat.',
);

verifier(
  'elle part dans la vente — les DEUX chemins, espèces et crédit',
  (caisse.match(/unite: i\.unite,/g) || []).length >= 2,
  'un seul chemin corrigé laisserait la moitié des ventes sans unité.',
);

verifier(
  'le reçu la lit depuis la LIGNE, jamais depuis le catalogue',
  /ligneLisible\(q, nom, p\.unite\)/.test(recu),
  'c’est une preuve remise à une cliente : elle doit dire ce qui a été vendu.',
);

verifier(
  'Tata la DIT au moment où la marchande peut encore corriger',
  /unite\?:\s*string \| null/.test(dialogues) && /quantiteAvecUnite/.test(dialogues),
  '« 3 tomates » et « 3 tas de tomate » ne décrivent pas la même vente.',
);

verifier(
  'la vente vocale fournit l’unité retenue',
  /const uniteLigne = produitCat\?\.unite \|\| uniteParlee \|\| null;/.test(vocal),
  'celle du catalogue si le produit est apparié, sinon celle qu’elle a prononcée.',
);

if (echecs > 0) {
  console.log('\n✗ unité persistée — échec : une vente perdrait son contexte');
  process.exit(1);
}
console.log('\n✓ unité persistée — la vente garde ce qu’elle était');
