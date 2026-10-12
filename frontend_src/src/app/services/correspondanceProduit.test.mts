/**
 * UNE SEULE CORRESPONDANCE NOM → IMAGE — démo 12/10/2026.
 *
 * LE DÉFAUT. Stock commun de la coopérative : « Banane plantain » affichée
 * avec un sac de riz (clé exacte « plantain » ratée, repli sur le riz) ;
 * l'attiéké avec la photo du manioc (mot-clé « attiéké » rangé sous Manioc).
 * Quatre écrans avaient chacun leur table, deux donnaient au plantain la
 * photo de la banane douce.
 *
 * Le catalogue testé est le VRAI : noms et mots-clés relus dans
 * `data/catalogue-produits.ts` (les images, elles, ne s'importent pas hors Vite).
 *
 * Lancer : npm run test:image-produit
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { produitCorrespondant, normaliserNomProduit } from './correspondanceProduit.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };
const APP = new URL('../', import.meta.url).pathname;
const lire = (rel: string) => readFileSync(APP + rel, 'utf8');

const source = lire('data/catalogue-produits.ts');
const catalogue = [...source.matchAll(/\{ nom: '([^']+)'[^}]*mots_cles: \[([^\]]*)\] \}/g)]
  .map(m => ({ nom: m[1], mots_cles: [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]) }));
const nomDe = (q: string) => produitCorrespondant(catalogue, q)?.nom;

console.log('\nUne seule correspondance nom → image\n');
ok(catalogue.length >= 30, `catalogue relu (${catalogue.length} produits)`);

console.log('\n— le plantain est le plantain');
ok(nomDe('Banane plantain') === 'Plantain', '« Banane plantain » → Plantain (pas Riz, pas Banane)');
ok(nomDe('  banane   PLANTAIN ') === 'Plantain', 'casse et espaces ignorés');
ok(nomDe('Banane plantain mûre') === 'Plantain', 'le mot-clé le plus long gagne (plantain avant banane)');
ok(nomDe('Banane') === 'Banane', '« Banane » reste la banane douce');

console.log('\n— l\'attiéké n\'est pas du manioc');
ok(nomDe('Attiéké') !== 'Manioc', '« Attiéké » ne prend plus la photo du manioc');
ok(nomDe('attieke') === undefined, 'sans photo d\'attiéké au catalogue → image générique');
ok(!/nom: 'Manioc'[^}]*attiéké/.test(source), 'le mot-clé « attiéké » n\'est plus rangé sous Manioc');

console.log('\n— un inconnu n\'emprunte pas l\'image d\'un autre');
ok(nomDe('Gingembre') === undefined, '« Gingembre » → aucun produit (image générique, pas le riz)');
ok(nomDe('Maison') === undefined, '« Maison » ne devient pas « maïs » (mot entier)');
ok(nomDe('Riz local') === 'Riz', '« Riz local » → Riz');
ok(nomDe('Maïs') === 'Maïs' && nomDe('mais') === 'Maïs', 'accents ignorés (Maïs / mais)');
ok(nomDe('') === undefined, 'nom vide → rien');
ok(normaliserNomProduit(' Attiéké ') === 'attieke', 'normalisation : minuscules, sans accents');

console.log('\n— une seule table : aucun écran n\'a la sienne');
ok(/produitCorrespondant\(CATALOGUE_PRODUITS, nom\)/.test(source), 'getImageByNom passe par produitCorrespondant');
for (const rel of [
  'components/cooperative/Stock.tsx',
  'components/cooperative/MarcheHub.tsx',
  'components/marchand/MarcheVirtuel.tsx',
  'components/producteur/CommandesProducteurPage.tsx',
]) {
  const code = lire(rel);
  ok(!/PRODUIT_IMAGES|PRODUITS_ICONS|function (imageForProduit|getProduitFallbackImage|findProduitIconImg)/.test(code)
    && code.includes('getImageByNom('), `${rel} : getImageByNom, pas de table locale`);
}
const fichiers = (d: string): string[] => readdirSync(d).flatMap(e => {
  const p = `${d}/${e}`;
  return statSync(p).isDirectory() ? fichiers(p) : /\.tsx?$/.test(p) ? [p] : [];
});
const plantainBanane = fichiers(APP + 'components').filter(f =>
  readFileSync(f, 'utf8').split('\n').some(l => /plantain/i.test(l) && /banane/i.test(l) && /img|IMG_/i.test(l) && /BANANE\b|imgBanane/.test(l)));
ok(plantainBanane.length === 0, `aucune tuile « Banane plantain » avec la photo de la banane douce${plantainBanane.length ? ` (${plantainBanane.join(', ')})` : ''}`);

console.log(echecs === 0 ? '\n✓ une seule correspondance, et elle est juste\n' : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
