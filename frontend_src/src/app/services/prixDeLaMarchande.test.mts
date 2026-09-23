/**
 * AUCUN PRIX N'EST POSÉ À SA PLACE — STK-02.
 *
 * Le défaut : le catalogue en dur pose un prix d'achat et un prix de vente que
 * la marchande n'a jamais donnés, par trois chemins — la tuile-photo, la
 * suggestion de nom, et l'ajout à la voix (qui le lui ANNONCE en plus).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  champsDepuisTuile, prixDicte, prixVientDelle, type EntreeCatalogue,
} from './prixDeLaMarchande.js';

const ici = dirname(fileURLToPath(import.meta.url));
let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const source = (...p: string[]) => {
  const brut = readFileSync(resolve(ici, '..', ...p), 'utf-8');
  return brut.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
};

/** La Tomate du catalogue en dur, telle qu'elle y est écrite. */
const TOMATE: EntreeCatalogue = {
  nom: 'Tomate', categorie: 'legumes', unite: 'kg',
  prixAchat: 300, prixVente: 400, image: 'img-tomate',
};
const PIMENT: EntreeCatalogue = {
  nom: 'Piment', categorie: 'legumes', unite: 'tas',
  prixAchat: 100, prixVente: 150, image: 'img-piment',
};

console.log('\nAucun prix n\'est posé à sa place\n');

console.log('[1] UNE TUILE POSE UN PRODUIT, JAMAIS UN PRIX');
{
  const c = champsDepuisTuile(TOMATE);
  ok(c.name === 'Tomate', 'le nom vient du catalogue — c\'est ce qu\'un catalogue sait');
  ok(c.unit === 'kg' && c.category === 'legumes' && c.image === 'img-tomate',
     'l\'unité, la famille et la photo aussi');
  ok(c.salePrice === '', 'le prix de VENTE reste vide — c\'était 400 F');
  ok(c.purchasePrice === '', 'le prix d\'ACHAT reste vide — c\'était 300 F');
  const rendu = JSON.stringify(c);
  ok(!rendu.includes('400') && !rendu.includes('300'),
     'et aucun des deux montants du catalogue ne ressort, sous aucune forme');
}
{
  // LA PROPRIÉTÉ QUI TIENT LE MODULE : quel que soit le produit du catalogue,
  // aucun prix n'en sort.
  const fautifs = [TOMATE, PIMENT, { nom: 'X', prixVente: 99999, prixAchat: 1 }]
    .filter(p => {
      const c = champsDepuisTuile(p as EntreeCatalogue);
      return (c.salePrice as unknown) !== '' || (c.purchasePrice as unknown) !== '';
    });
  ok(fautifs.length === 0, 'AUCUNE entrée de catalogue ne produit un prix, quel qu\'il soit');
}
{
  // LE PIÈGE DE LA SECONDE TUILE. Le formulaire garde ses champs entre deux
  // tuiles : sans remise à vide, le prix de la Tomate resterait sur le Piment.
  const formulaire = { ...champsDepuisTuile(TOMATE), salePrice: 450 as any, purchasePrice: 320 as any };
  const apres = { ...formulaire, ...champsDepuisTuile(PIMENT) };
  ok(apres.name === 'Piment', 'elle touche une seconde tuile : le produit change');
  ok(apres.salePrice === '' && apres.purchasePrice === '',
     'et les prix qu\'elle avait saisis pour le PREMIER ne restent pas sur le second');
}

console.log('\n[2] À LA VOIX : LE PRIX EST CELUI QU\'ELLE A DIT, OU RIEN');
ok(prixDicte(500) === 500, 'elle dit « cinq cents » : c\'est cinq cents');
ok(prixDicte('500') === 500, 'une chaîne numérique reste une valeur');
ok(prixDicte(undefined) === 0, 'elle n\'a rien dit → 0, c\'est-à-dire « pas encore de prix »');
ok(prixDicte(null) === 0 && prixDicte('') === 0 && prixDicte('abc') === 0 && prixDicte(NaN) === 0,
   'rien, vide, illisible : 0 — et jamais un prix de catalogue');
ok(prixDicte(-200) === 0, 'un prix négatif n\'est pas un prix');
ok(prixDicte.length === 1,
   'LA GARANTIE STRUCTURELLE : la fonction n\'a qu\'UN argument — il n\'existe aucun moyen de lui passer un repli de catalogue');

console.log('\n[3] LA VOIX NE CITE UN MONTANT QUE S\'IL VIENT D\'ELLE');
ok(prixVientDelle(prixDicte(500)) === true, 'prix dit → la confirmation peut le citer');
ok(prixVientDelle(prixDicte(undefined)) === false,
   'rien dit → la confirmation NE cite aucun montant (« Dis-moi son prix quand tu veux »)');

console.log('\n[4] LES TROIS CHEMINS DE L\'ÉCRAN PASSENT PAR LA RÈGLE');
{
  const g = source('components', 'marchand', 'GestionStock.tsx');

  // STK-03c — CETTE ASSERTION A ÉTÉ REMPLACÉE PAR UNE PLUS FORTE, PAS RETIRÉE.
  // Elle vérifiait que l'écran importe `champsDepuisTuile`, la règle qui VIDE
  // les prix d'une tuile de catalogue avant de remplir le formulaire. Depuis
  // que la création est passée au parcours partagé, l'écran n'a plus de
  // formulaire à remplir : il n'y a plus rien à vider. Vérifier qu'il importe
  // une règle de nettoyage serait désormais plus faible que vérifier qu'il n'a
  // plus rien à nettoyer.
  ok(/<AjoutProduitGuide[\s/>]/.test(g),
     'l\'écran ne pose plus AUCUN prix : la création est passée au parcours partagé');

  // Les deux tuiles (photo et suggestion) ne posent plus de prix.
  const tuiles = g.match(/setNewStock\(\{[^}]*p\.nom[^}]*\}\)/g) || [];
  ok(tuiles.length === 0,
     `aucune tuile ne remplit le formulaire à la main (${tuiles.length} restante(s))`);
  ok(!/purchasePrice\s*:\s*p\.prixAchat|salePrice\s*:\s*p\.prixVente/.test(g),
     'plus aucun prix de catalogue ne part dans le formulaire');

  // L'ajout VOCAL.
  ok(!/cat\?\.prixVente|cat\?\.prixAchat/.test(g),
     'l\'ajout à la voix ne se replie plus sur le prix du catalogue');
  ok(/prixDicte\(/.test(g), 'il prend le prix qu\'elle a dit, par la règle');

  // L'AFFICHAGE de la suggestion : montrer un prix qui n'est pas le sien,
  // c'est déjà l'affirmer.
  ok(!/\{p\.prixVente\}/.test(g),
     'la liste de suggestions n\'affiche plus un prix comme si c\'était le sien');
}

console.log('\n[5] LE CATALOGUE GARDE SES PRIX — ON CESSE SEULEMENT DE LES LIRE');
{
  // On NE vide PAS `catalogue-produits.ts`. Ces chiffres sont un ordre de
  // grandeur utile ailleurs (suggestion d'achat, statistiques). Ce qui est
  // interdit, c'est de les poser comme étant les SIENS.
  const cat = source('data', 'catalogue-produits.ts');
  ok(/prixVente:\s*\d+/.test(cat),
     'le catalogue porte toujours ses ordres de grandeur — on n\'efface pas une donnée, on cesse de la prendre pour une autre');
}

console.log(echecs === 0
  ? '\n✅ Le prix vient d\'elle, ou il n\'existe pas encore.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
