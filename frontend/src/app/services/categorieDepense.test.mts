/**
 * LA CATÉGORIE QU'ELLE A TOUCHÉE EST CELLE QU'ELLE REVOIT — DEP-02.
 *
 * Recette terrain, MAR-DEP-001 : « la catégorie de dépense n'est pas
 * enregistrée ». Ce fichier prouve les deux moitiés de la règle :
 * l'information est CONSERVÉE de bout en bout, et quand elle manque elle est
 * NOMMÉE — jamais reconstruite à partir des mots du libellé.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES_DEPENSE, categorieDeLaDepense, estIdCategorie, libelleParId,
  LIBELLE_SANS_CATEGORIE, type IdCategorieDepense,
} from './categorieDepense.js';

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

console.log('\nLa catégorie qu\'elle a touchée est celle qu\'elle revoit\n');

console.log('[1] Une seule liste, et elle est complète');
ok(CATEGORIES_DEPENSE.length === 11, `les onze catégories que l'écran propose (${CATEGORIES_DEPENSE.length})`);
{
  const ids = CATEGORIES_DEPENSE.map(c => c.id);
  ok(new Set(ids).size === ids.length, 'aucun identifiant en double');
  const libelles = CATEGORIES_DEPENSE.map(c => c.libelle);
  ok(new Set(libelles).size === libelles.length, 'aucun libellé en double — deux cases identiques à l\'écran ne se distinguent pas au doigt');
  // LES DEUX QUE L'ANCIEN CODE NE SAVAIT PAS RENDRE.
  ok(ids.includes('taxe_mairie'), '« Taxe mairie » est une catégorie à part entière (l\'affichage la rendait « Autre »)');
  ok(ids.includes('ecole'), '« École » est une catégorie à part entière (l\'affichage la rendait « Famille »)');
}
ok(libelleParId('taxe_mairie') === 'Taxe mairie' && libelleParId('ecole') === 'École',
   'chaque identifiant a son libellé, dans les mots de l\'écran');

console.log('\n[2] CONSERVÉE : ce qui a été touché revient tel quel');
for (const c of CATEGORIES_DEPENSE) {
  const lue = categorieDeLaDepense({ category: c.id });
  ok(lue.connue === true && lue.id === c.id && lue.libelle === c.libelle,
     `« ${c.libelle} » touchée → « ${lue.connue ? lue.libelle : '?'} » relue`);
}

console.log('\n[3] PERDUE : on le DIT, et « Autre » ne prend pas ce sens');
{
  const sans = categorieDeLaDepense({});
  ok(sans.connue === false && sans.libelle === LIBELLE_SANS_CATEGORIE,
     'une dépense d\'avant DEP-02 n\'a pas de catégorie — et la réponse le nomme');
  ok(sans.connue === false && (sans as any).id === undefined,
     'aucun identifiant n\'est inventé : le type lui-même n\'en porte pas');
  ok(LIBELLE_SANS_CATEGORIE !== libelleParId('autre'),
     '« Catégorie pas notée » ≠ « Autre » : « Autre » est un CHOIX, pas une ignorance');
}
ok(categorieDeLaDepense(null).connue === false && categorieDeLaDepense(undefined).connue === false,
   'ni `null` ni `undefined` ne produisent une catégorie');
ok(categorieDeLaDepense({ category: 'legumes' }).connue === false,
   'une valeur venue du serveur qui n\'est pas des onze est REFUSÉE, pas affichée telle quelle');
ok(categorieDeLaDepense({ category: '' }).connue === false && categorieDeLaDepense({ category: 42 }).connue === false,
   'ni le vide ni un nombre ne passent');
ok(!estIdCategorie('Taxe mairie'),
   'le LIBELLÉ n\'est pas un identifiant — c\'est toute la confusion qu\'on ferme');

console.log('\n[4] JAMAIS DEVINÉE : le libellé n\'entre plus dans la décision');
{
  // LA PROPRIÉTÉ QUI TIENT LE MODULE. Quel que soit le texte écrit à côté, la
  // catégorie rendue ne dépend QUE de ce qui a été enregistré.
  const textes = ['École de Fatou', 'transport yango', 'riz pour manger', 'taxe mairie', '', 'n\'importe quoi'];
  let influence = '';
  for (const id of CATEGORIES_DEPENSE.map(c => c.id)) {
    const rendus = new Set(textes.map(txt =>
      JSON.stringify(categorieDeLaDepense({ category: id, description: txt } as any))));
    if (rendus.size !== 1) influence = id;
  }
  ok(!influence, `aucun libellé ne change la catégorie rendue${influence ? ' — influencé sur : ' + influence : ''}`);
  const sansCategorie = new Set(textes.map(txt =>
    JSON.stringify(categorieDeLaDepense({ description: txt } as any))));
  ok(sansCategorie.size === 1,
     'et sans catégorie enregistrée, AUCUN texte n\'en fabrique une — même « transport yango »');
}

console.log('\n[5] LES DEUX ÉCRANS PASSENT PAR LA LISTE, ET LE CHOIX EST ENVOYÉ');
{
  const form = source('components', 'marchand', 'DepenseForm.tsx');
  const liste = source('components', 'marchand', 'MarchandDepenses.tsx');
  const contexte = source('contexts', 'CaisseContext.tsx');
  const api = source('services', 'api', 'caisse-api.ts');

  ok(/CATEGORIES_DEPENSE/.test(form), 'le formulaire lit la liste partagée au lieu de la réécrire');
  ok(!/const OTHER_CATS/.test(form), 'la seconde liste du formulaire (OTHER_CATS) a disparu');
  ok(/categorieDeLaDepense/.test(liste), 'la liste des dépenses LIT la catégorie');
  ok(!/function detectCat/.test(liste), 'et ne la devine plus par mots-clés (detectCat supprimée)');
  ok(!/keywords/.test(liste), 'plus aucune table de mots-clés dans l\'écran des dépenses');

  // LA CHAÎNE COMPLÈTE : elle ne vaut que si elle traverse.
  // ATTENTION : chercher « categorie » tout court dans CaisseContext ne prouve
  // RIEN — le contexte manipule déjà la catégorie des PRODUITS (`p.categorie`).
  // Cette assertion-là passait au vert sur le code fautif. On exige la signature
  // de la dépense, seule chose qui distingue les deux.
  ok(/EnregistrerDepenseData[\s\S]{0,900}?categorie\?:/.test(api),
     'le contrat d\'API de la DÉPENSE porte la catégorie');
  ok(/enregistrerDepense\s*=\s*async\s*\([^)]*categorie/.test(contexte.replace(/\s+/g, ' ')),
     'le contexte reçoit la catégorie de la dépense…');
  ok(/EnregistrerDepenseData\s*=\s*\{[^}]*categorie/.test(contexte.replace(/\s+/g, ' ')),
     '…et la met dans le payload — donc aussi dans la file hors ligne, qui rejoue CE payload');
  ok(/enregistrerDepense\([^)]*categorie/.test(form.replace(/\s+/g, ' ')),
     'le formulaire la passe à l\'enregistrement');
}

console.log('\n[6] LES MOTS DES BOUTONS — MAR-DEP-001');
{
  const form = source('components', 'marchand', 'DepenseForm.tsx');
  const liste = source('components', 'marchand', 'MarchandDepenses.tsx');
  ok(!/Noter une dépense/.test(form) && !/Noter une dépense/.test(liste),
     '« Noter une dépense » ne figure plus nulle part — « noter » veut dire écrire, et elle n\'écrit pas');
  ok(/Faire une dépense/.test(form) && /Faire une dépense/.test(liste),
     '« Faire une dépense » aux deux endroits');
  ok(/Changer la catégorie/.test(form),
     '« Changer » seul ne disait pas quoi — le bouton nomme ce qu\'il change');
}

console.log(echecs === 0
  ? '\n✅ La catégorie touchée est conservée, relue, et son absence est nommée.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
