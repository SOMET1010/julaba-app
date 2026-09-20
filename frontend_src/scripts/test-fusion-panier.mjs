/**
 * Garde-fou : FUSIONNER DEUX LIGNES NE DOIT JAMAIS PERDRE D'ARGENT.
 *
 * LE DÉFAUT QU'ON FERME, trouvé par un audit du 18/09/2026. Quand un produit
 * déjà au panier y était rajouté, `addToCart` additionnait les quantités,
 * jetait `totalExact`, et GARDAIT LE PRIX DE LA PREMIÈRE LIGNE :
 *
 *     { ...item, quantite: item.quantite + quantite, totalExact: undefined }
 *
 * « 1 tomate à 500 » puis « 1 tomate à 700 » — deux prix négociés, comme il
 * s'en pratique cent fois par jour sur un marché — donnait 2 × 500 = 1 000 F
 * au lieu de 1 200 F. La marchande perdait 200 F sur son propre panier, sans
 * rien voir : l'écran affichait un total cohérent avec lui-même, et faux.
 *
 * La règle tenue ici : le total fusionné est la SOMME des deux totaux réels,
 * chacun étant son `totalExact` s'il en a un, sinon prix × quantité. Sur le
 * chemin tactile elle ne change rien (prix × q1 + prix × q2 = prix × (q1+q2)) ;
 * sur le chemin vocal elle sauve l'écart négocié.
 *
 * Test TEXTUEL, et c'est assumé : la fusion vit dans un contexte React, donc
 * dans un fichier qu'on ne peut pas exécuter sans DOM. Ce qu'on peut faire,
 * c'est empêcher le retour de la forme exacte qui perdait l'argent.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(ICI, '..', 'src', 'app', 'contexts', 'CaisseContext.tsx'),
  'utf8',
);

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

// On raisonne sur le CODE, pas sur les commentaires qui racontent l'incident.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

console.log('\nLa fusion de deux lignes conserve l’argent');

verifier(
  'la fusion ne jette plus le total exact',
  !/quantite: item\.quantite \+ quantite,\s*totalExact: undefined/.test(code),
  'c’est la forme exacte qui faisait perdre 200 F sur deux prix négociés.',
);

verifier(
  'elle ADDITIONNE les deux totaux réels',
  /totalExact:\s*\(item\.totalExact \?\? item\.prix \* item\.quantite\)/.test(code),
  'le total de chaque côté est son totalExact, sinon prix × quantité.',
);

verifier(
  'le nouveau côté passe par prixEffectif, comme le reste de la caisse',
  /\(totalExact \?\? prixEffectif\(product\) \* quantite\)/.test(code),
  'sans quoi une promotion s’appliquerait à la création de ligne mais pas à la fusion.',
);

// RÉÉCRIT LE 19/09/2026 (HYGIÈNE-1 axe 2). Cette vérification lisait la FORME
// du code — `if (!res.ok) { … restaurerDepuisCache }` — et non la garantie.
// La convergence du catalogue sur le client API commun a supprimé ce `if` : le
// client LÈVE désormais sur une réponse en erreur, si bien que les deux échecs
// (serveur qui répond mal, réseau coupé) arrivent dans le MÊME `catch`. La
// garantie tient toujours, mieux qu'avant ; c'était l'assertion qui était
// attachée à une écriture particulière. On vérifie maintenant la garantie.
verifier(
  'un serveur qui répond MAL retombe sur le cache, comme une coupure',
  /catch \(err: unknown\) \{[\s\S]{0,300}restaurerDepuisCache\(cacheKey\)/.test(code)
    && /await caisseApi\.fetchProduitsCaisse\(\)/.test(code)
    && !/if \(!res\.ok\)[\s\S]{0,200}return;/.test(code),
  'un 503 laissait le catalogue vide alors que les prix étaient sur le téléphone.',
);

if (echecs > 0) {
  console.log('\n✗ fusion du panier — échec');
  process.exit(1);
}
console.log('\n✓ fusion du panier — l’argent est conservé');
