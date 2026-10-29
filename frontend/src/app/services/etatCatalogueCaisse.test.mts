/**
 * CE QUE LA CAISSE A LE DROIT D'AFFIRMER SUR LE CATALOGUE — CAI-01.
 *
 * Banc terrain, écran 5 : « ZÉRO QUI MENT — l'écran a demandé au serveur
 * (6 lectures), n'a rien obtenu, et affirme quand même : "Aucun produit" ».
 * C'est l'écran de VENTE : une marchande qui lit « Aucun produit » range son
 * téléphone et vend sans lui.
 *
 * Règle de Patrick : inconnu / non chargé / erreur ≠ 0. Ici : ≠ « aucun ».
 */
import { etatCatalogueCaisse } from './etatCatalogueCaisse.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nLa caisse ne dit pas « aucun produit » quand elle n\'a pas pu demander\n');

{
  const e = etatCatalogueCaisse({ lecture: 'echec', nbProduits: 0, servisDepuisCache: false });
  ok(e.type === 'illisible', 'lecture échouée, rien en cache → « illisible », jamais « aucun produit »');
  ok(!('nbProduits' in e), 'aucun nombre ne sort de cette branche : rien à afficher par mégarde');
}
{
  const e = etatCatalogueCaisse({ lecture: 'echec', nbProduits: 8, servisDepuisCache: true });
  ok(e.type === 'memoire' && e.nbProduits === 8,
     'échec MAIS le cache du téléphone a servi → « memoire » : ces 8 produits existent, ils sont juste périmés');
}
{
  const e = etatCatalogueCaisse({ lecture: 'lu', nbProduits: 0, servisDepuisCache: false });
  ok(e.type === 'vide', 'le serveur a répondu et il n\'a rien : LÀ seulement « aucun produit » est vrai');
}
{
  const e = etatCatalogueCaisse({ lecture: 'lu', nbProduits: 12, servisDepuisCache: false });
  ok(e.type === 'liste' && e.nbProduits === 12, 'le serveur a répondu avec des produits');
}
{
  for (const lecture of ['jamais', 'chargement'] as const) {
    const e = etatCatalogueCaisse({ lecture, nbProduits: 0, servisDepuisCache: false });
    ok(e.type === 'attente', `« ${lecture} » → « attente » : on ne sait pas encore, on ne dit pas « aucun »`);
  }
}
{
  // Le cas tordu : la lecture a réussi, mais l'écran affiche quand même le
  // cache (course entre deux rendus). On ne peut pas affirmer « vide ».
  const e = etatCatalogueCaisse({ lecture: 'lu', nbProduits: 0, servisDepuisCache: true });
  ok(e.type === 'illisible',
     'cache annoncé mais zéro produit : incohérent, donc on n\'affirme rien — pas « aucun »');
}
{
  const jamaisAucunParDefaut = (['jamais', 'chargement', 'echec'] as const).every(lecture =>
    etatCatalogueCaisse({ lecture, nbProduits: 0, servisDepuisCache: false }).type !== 'vide');
  ok(jamaisAucunParDefaut,
     'AUCUN état issu d\'une lecture non aboutie ne devient « vide » — inconnu ≠ aucun');
}

console.log(echecs === 0
  ? '\n✅ « Aucun produit » n\'est dit que lorsque le serveur l\'a répondu.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
