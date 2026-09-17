// Vignettes locales — le repli qui permet de reconnaître un produit sans réseau.
// Lancer : npm run test:vignette
import { emojiTile, vignetteProduit } from './emojiTile.js';

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}
/** L'emoji réellement dessiné dans la vignette. */
const emojiDe = (uri: string) => decodeURIComponent(uri).match(/central'>(.+?)<\/text>/)?.[1] ?? '';

console.log('Une vignette ne dépend d’aucun réseau');
ok(emojiTile('🍅').startsWith('data:image/svg+xml'), 'image embarquée dans la page, pas une URL');
// `xmlns='http://www.w3.org/2000/svg'` est une déclaration de norme, pas une
// requête : on l'écarte avant de chercher une vraie adresse distante.
const sansNorme = decodeURIComponent(emojiTile('🍅')).replace(/xmlns='[^']*'/g, '');
ok(!/https?:\/\//.test(sansNorme), 'aucune adresse distante — rien à télécharger');

console.log('Chaque produit retombe sur SON image, pas sur un panier générique');
ok(emojiDe(vignetteProduit('Tomate')) === '🍅', 'tomate');
ok(emojiDe(vignetteProduit('Igname')) === '🍠', 'igname');
ok(emojiDe(vignetteProduit('Aubergine')) === '🍆', 'aubergine');
ok(emojiDe(vignetteProduit('Arachide')) === '🥜', 'arachide');

console.log('Le nom arrive tel que la marchande l’a saisi');
ok(emojiDe(vignetteProduit('tomates fraîches')) === '🍅', 'minuscules et pluriel');
ok(emojiDe(vignetteProduit('  PIMENT  ')) === '🌶️', 'majuscules et espaces');
ok(emojiDe(vignetteProduit('Banane plantain')) === '🍌', 'nom composé');

console.log('Jamais de case vide, quoi qu’il arrive');
const panier = emojiDe(vignetteProduit('Produit inconnu du catalogue'));
ok(panier === '🧺', 'produit inconnu : un panier, pas du vide');
ok(emojiDe(vignetteProduit('')) === '🧺', 'nom vide : un panier aussi');
ok(emojiDe(vignetteProduit(null)) === '🧺', 'nom absent : un panier aussi');

console.log('Un piège d’ordre : « plantain » ne doit pas être mangé par « banane »');
ok(emojiDe(vignetteProduit('Plantain')) === '🍌', 'plantain reconnu');

if (failures > 0) { console.error(`\n✗ ${failures} échec(s)`); process.exit(1); }
console.log('\n✓ vignettes — tous les cas passent');
