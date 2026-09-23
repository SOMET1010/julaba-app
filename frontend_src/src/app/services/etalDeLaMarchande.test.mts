/**
 * STK-03 — LA SAISIE GUIDÉE MONTRE SON ÉTAL, PAS UN CATALOGUE.
 *
 * LE DÉFAUT. Le panneau « Toucher les produits » affichait les 37 tuiles
 * écrites en dur dans `data/catalogue-produits.ts`, et posait LEUR prix :
 *
 *   SaisieGuidee.tsx:201  onClick={() => choisirProduit(p.nom, p.prixVente)}
 *   SaisieGuidee.tsx:116  setPrix(String(prixVente));
 *   SaisieGuidee.tsx:117  setPrixModifiable(false);
 *
 * Elle touche « Tomate » → l'écran pose 400 F qui ne sont pas les siens, ET
 * verrouille le champ. C'est STK-02 — « le prix vient d'elle, ou il n'existe
 * pas » — encore vivant ici, sur le chemin de l'argent : ce prix part au
 * panier, puis dans la marge, puis dans le bilan du soir.
 *
 * ET LE NOM MENTAIT AUSSI. La mesure du 23/09 : 21 des 37 tuiles couvrent
 * plusieurs références maître. « Igname » en couvre NEUF — Kponan, Bêtê-Bêtê,
 * Florido, Krenglè, Lokpa, Assawa… quatre variétés, quatre prix.
 *
 * L'ARBITRAGE DE PATRICK, 23/09 : « La caisse montre l'étal personnel de la
 * marchande, pas un catalogue générique. » Elle vend huit, douze, quinze
 * produits — les SIENS, à SES prix, dans SES unités. Pas 37, pas 198.
 *
 * CE QU'ON NE FAIT PAS : aucune famille, aucune sous-famille, aucun domaine à
 * l'écran. La taxonomie est notre problème, pas le sien.
 *
 * Lancer : npm run test:etal-marchande
 */
import { readFileSync } from 'node:fs';
import {
  tuilesDeLEtal, prixDeLaTuile, type ProduitDeLEtal,
} from './etalDeLaMarchande.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const SOURCE = readFileSync(
  new URL('../components/marchand/SaisieGuidee.tsx', import.meta.url), 'utf-8');
/** Sans les commentaires : un mot dans une explication n'est pas du code. */
const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

console.log('\nSon étal, ses prix — la saisie guidée ne vend plus le catalogue\n');

console.log('[1] UN PRODUIT À ELLE À 700 SE CHOISIT À 700');
{
  const etal: ProduitDeLEtal[] = [
    { id: 'p1', nom: 'Kponan', prix: 1500, unite: 'tas' },
    { id: 'p2', nom: 'Gombo', prix: 700, unite: 'tas' },
  ];
  const tuiles = tuilesDeLEtal(etal);
  const gombo = tuiles.find(t => t.nom === 'Gombo');
  ok(!!gombo, 'son Gombo est bien une tuile');
  ok(gombo?.prix === 700, `le prix de la tuile est le SIEN — ${gombo?.prix}`);
  ok(prixDeLaTuile(gombo!) === 700, 'et c\'est ce prix-là qui part au formulaire');
  ok(gombo?.unite === 'tas', 'avec SON unité, pas « kg » par défaut');
  // Le catalogue en dur donne Gombo à 400 : la preuve que 700 ne vient pas de lui.
  ok(prixDeLaTuile(gombo!) !== 400, 'et surtout pas le 400 du catalogue générique');
}

console.log('\n[2] AUCUN PRODUIT À ELLE → AUCUNE TUILE GÉNÉRIQUE');
{
  ok(tuilesDeLEtal([]).length === 0,
     'étal vide → zéro tuile ; on ne comble jamais le vide avec le catalogue');
  // Un produit sans prix d'elle n'est pas vendable EN UN TOUCHER : il n'a pas
  // de prix à poser. Il n'a donc pas de tuile — mais il n'est pas effacé pour
  // autant, elle le retrouve par la saisie libre.
  const sansPrix: ProduitDeLEtal[] = [{ id: 'p3', nom: 'Piment', prix: 0, unite: 'tas' }];
  ok(tuilesDeLEtal(sansPrix).length === 0,
     'un produit sans prix d\'elle n\'a pas de tuile : il n\'y a rien à poser');
}

console.log('\n[3] PRODUIT ABSENT → LA SAISIE LIBRE RESTE OUVERTE');
ok(/Pas dans la liste/.test(code),
   '« Pas dans la liste ? » est toujours là — un produit neuf ne bloque personne');
ok(/setAutreOuvert\(true\)/.test(code),
   'et il ouvre bien la saisie du nom');

console.log('\n[4] AUCUN PRIX DU CATALOGUE GÉNÉRIQUE NE PEUT PARTIR AU PANIER');
{
  // LA PREUVE TRAVERSE : une règle pure verte pendant que l'écran lit encore
  // `catalogue-produits`, c'est une garde qui ne garde rien.
  ok(!/CATALOGUE_PRODUITS/.test(code),
     'SaisieGuidee ne lit plus la liste des 37 tuiles en dur');
  ok(!/\bprixVente\b/.test(code),
     'et ne lit plus AUCUN `prixVente` du catalogue générique');
  ok(!/rechercherProduitCatalogue\([^)]*\)\??\.\s*prixVente/.test(code),
     'ni par la recherche catalogue, qui rendait elle aussi un prix');
  ok(/products|etal/i.test(code),
     'elle lit l\'étal de la marchande');
}

console.log(echecs === 0
  ? '\n✅ Son étal, ses prix. Le catalogue ne vend plus à sa place.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
