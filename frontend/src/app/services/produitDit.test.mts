/**
 * ELLE DIT SON PRODUIT — STK-05.
 *
 * LE DÉFAUT, mesuré le 24/09. L'écran du stock imprimait sur son plus gros
 * bouton : « dis : "ajoute 10 piments à 500" ». Et `intentLocal` rendait
 * `null` sur cette phrase exacte. `ajouter_stock` n'avait AUCUN producteur
 * dans le dépôt — quatre occurrences, toutes consommatrices. Le bloc qui
 * l'attendait était inatteignable, et avec lui tout le correctif STK-02c.
 *
 * Elle disait ce que l'écran lui dictait et recevait « Je n'ai pas bien
 * compris ». Un bouton qui lui donne tort.
 *
 * LA CAUSE : `extraire()` comprenait déjà tout. Seul `intention` restait
 * vide, et `intentLocal` — qui ne fabrique que `vendre` et `depense` —
 * jetait le reste. L'information existait, l'aval la jetait.
 *
 * Lancer : npm run test:produit-dit
 */
import { readFileSync } from 'node:fs';
import { produitDit } from './produitDit.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

const ETAL = [{ nom: 'Piment' }, { nom: 'Tomate cerise' }, { nom: 'Tomate grappe' }];

console.log('\nElle dit son produit, et on ne devine rien à sa place\n');

console.log("[1] LA PHRASE QUE L'ÉCRAN LUI DICTAIT — celle qui ne marchait pas");
{
  const r = produitDit('ajoute 10 piments à 500', ETAL);
  ok(r !== null, 'elle est enfin comprise');
  ok(r?.brouillon.nom === 'Piment', 'le produit est reconnu SUR SON ÉTAL (« Piment », pas « piment »)');
  ok(r?.brouillon.prix === 500, 'le prix qu\'elle a dit est repris : 500');
  ok(r?.quantite === 10, 'et les dix sont gardés, pas jetés');
  // Elle n'a PAS dit d'unité : on ne l'invente pas, on la lui demande.
  ok(r?.brouillon.unite === '', "aucune unité inventée — elle n'en a pas dit");
  ok(r?.manque === 'unite', "la seule question qui reste est l'unité");
}

console.log("\n[2] ELLE DIT L'UNITÉ MAIS PAS LE PRIX");
{
  const r = produitDit('ajoute dix kilos de tomate', []);
  ok(r?.brouillon.nom === 'tomate', 'le produit : tomate');
  ok(r?.brouillon.unite === 'kilos', "l'unité qu'elle a prononcée est gardée telle quelle");
  ok(r?.quantite === 10, 'les dix aussi');
  ok(r?.brouillon.prix === null, "aucun prix inventé — c'est STK-02c");
  ok(r?.manque === 'prix', 'on ne lui demande que le prix');
}

console.log('\n[3] ELLE NOMME SON PRODUIT, ET RIEN DE PLUS');
{
  const r = produitDit('gombo', []);
  ok(r?.brouillon.nom === 'gombo', '« gombo » seul suffit à commencer');
  ok(r?.brouillon.unite === '' && r?.brouillon.prix === null, 'et rien du reste n\'est supposé');
  ok(r?.manque === 'unite', 'Tantie enchaîne sur la question suivante');
}

console.log("\n[4] L'AMBIGUÏTÉ N'EST JAMAIS TRANCHÉE À SA PLACE");
{
  // « tomate » peut désigner « Tomate cerise » OU « Tomate grappe ».
  const r = produitDit('ajoute 3 tomates à 800', ETAL);
  ok(r?.reconnu === null, "deux produits possibles : AUCUN appariement forcé");
  ok(r?.brouillon.nom === 'tomate', 'on garde son mot, on ne touche pas au mauvais produit');
  // Un seul candidat : là on reconnaît.
  ok(produitDit('piment', ETAL)?.reconnu === 'Piment', "un seul candidat : son nom d'étal est repris");
}

console.log("\n[5] CE QU'ON NE COMPREND PAS NE SE DEVINE PAS");
{
  for (const t of ['', '   ', 'euh', 'bonjour']) {
    ok(produitDit(t, ETAL) === null, `${JSON.stringify(t)} → null, on n'ouvre pas un formulaire vide`);
  }
  // Zéro n'est pas un prix : il partirait en caisse.
  ok(produitDit('ajoute du gombo à 0', [])?.brouillon.prix === null, '« à 0 » n\'est pas un prix');
}

console.log("\n[6] L'ÉCRAN DU STOCK EST VRAIMENT REBRANCHÉ");
{
  const lire = (f: string) => readFileSync(new URL(`../components/marchand/${f}`, import.meta.url), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  const stock = lire('GestionStock.tsx');

  // LE BOUTON EST MONTÉ PAR L'ÉCRAN, et c'est LUI qui passe par la règle.
  // Chercher `produitDit(` dans l'écran serait chercher au mauvais endroit :
  // on vérifie les deux maillons, séparément.
  ok(/<BoutonDireProduit[\s/>]/.test(stock), "l'écran du stock monte un vrai micro à produit");
  // LE BLOC MORT. `ajouter_stock` n'a aucun producteur : le garder, c'est
  // garder un chemin qui a l'air de marcher et ne marche pas.
  ok(!/['"]ajouter_stock['"]/.test(stock), "le bloc mort `ajouter_stock` a disparu de l'écran du stock");
  // UN SEUL CHEMIN DE CRÉATION.
  ok(/<AjoutProduitGuide[\s/>]/.test(stock), 'la création passe par le parcours guidé, et par lui seul');
  ok(!/addStockItem/.test(stock), "aucune seconde naissance n'est revenue");
  // L'EXEMPLE SYNTAXIQUE. « ajoute 10 piments à 500 » est une phrase de
  // développeur : une non-lectrice ne peut ni la lire ni la retenir.
  ok(!/ajoute 10 piments/.test(stock), "l'exemple syntaxique ne lui est plus dicté");
  const bouton = lire('BoutonDireProduit.tsx');
  ok(/produitDit\(/.test(bouton), "et ce micro lit par la règle, pas à sa façon");
  ok(/startLiveDictation\(/.test(bouton), 'il réutilise la dictée existante, sans en réécrire une');
  // POURQUOI PAS `useVoiceCore` : mesuré le 24/09, quand `intentLocal` rend
  // `null`, `handleResponse` n'est jamais appelé — donc `onAction` non plus.
  // Brancher la règle là n'aurait RIEN changé, tout en donnant un test vert.
  ok(!/onAction[\s\S]{0,400}produitDit/.test(stock),
     "et il ne passe PAS par `onAction`, qui n'est jamais appelé quand rien n'est compris");
  ok(/Ajouter en parlant/.test(bouton), 'le geste garde son nom : « Ajouter en parlant »');

  // ET LE PARCOURS ACCEPTE BIEN CE QU'ELLE A DÉJÀ DIT.
  const guide = lire('AjoutProduitGuide.tsx');
  // PAS SEULEMENT LA PROP : les trois états doivent VRAIMENT démarrer dessus.
  // `/depart/` seul restait vert alors que le parcours redemandait tout —
  // exactement le vert pour la mauvaise raison que ce dépôt traque.
  ok(/useState\(depart\?\.nom/.test(guide), "le nom qu'elle a dit n'est pas redemandé");
  ok(/useState\(depart\?\.unite/.test(guide), "ni l'unité, quand elle l'a donnée");
  ok(/depart\?\.prix/.test(guide), "ni le prix, quand elle l'a dit");
}

console.log("\n[7] STK-05b — « DEUX MANIOCS » : SON ÉTAL SERT AUSSI À ENTENDRE");
{
  // LE DÉFAUT, journal du 03/10, écran `/marchand/stock`. Elle dit « Deux
  // maniocs », trois fois, et reçoit « Je n'ai pas entendu de produit ». Le
  // manioc est sur son étal. Mesuré avant correction :
  //     extraire("Deux maniocs") → produit null → produitDit NULL
  //     extraire("Deux manioc")  → manioc       → OK
  // et la MÊME phrase passait déjà à la caisse (`lireVenteAuCatalogue`).
  const ETAL_M = [{ nom: 'Manioc' }, { nom: 'Piment' }];
  const r = produitDit('Deux maniocs', ETAL_M);
  ok(r !== null, "« Deux maniocs » n'est plus refusé");
  ok(r?.brouillon.nom === 'Manioc', "c'est le Manioc DE SON ÉTAL, avec son orthographe à elle");
  ok(r?.reconnu === 'Manioc', 'et il est reconnu, pas seulement recopié');
  ok(r?.quantite === 2, 'les deux sont gardés — le « deux » n\'est pas un prix de 2 F');
  ok(r?.brouillon.prix === null, "aucun prix inventé : elle n'en a pas dit");
  // Le pluriel seul suffit, comme « gombo » seul suffit en [3].
  ok(produitDit('maniocs', ETAL_M)?.reconnu === 'Manioc', '« maniocs » seul suffit à commencer');
  // Et le reste du journal du 03/10 n'a pas bougé.
  ok(produitDit('Deux manioc', ETAL_M)?.quantite === 2, '« Deux manioc » (singulier) marche toujours');
  ok(produitDit('Puis cinq piments', ETAL_M)?.reconnu === 'Piment', '« Puis cinq piments » aussi');
}

console.log("\n[8] LE REPLI LIT SON ÉTAL, PAS UNE LISTE ÉCRITE DANS LE CODE");
{
  // DEUX VERROUS, ET IL FAUT LES DEUX. La table `PRODUITS_FORMES` est écrite à
  // la main : 28 noms canoniques contre les 198 du catalogue du pilote. Ces
  // produits-ci n'y sont PAS, et ne doivent pas y être — c'est précisément le
  // trou que le repli rattrape, pour tous les noms que personne n'écrira.
  const ETAL_X = [{ nom: 'Kplala' }, { nom: 'Pois de terre' }];
  const r = produitDit('deux kplalas', ETAL_X);
  ok(r?.reconnu === 'Kplala', 'un produit de son étal inconnu du lexique est reconnu');
  ok(r?.quantite === 2, 'et son « deux » reste une quantité, pas deux francs');
  // Le nom doit être prononcé EN ENTIER : même règle que la caisse.
  ok(produitDit('trois pois de terre', ETAL_X)?.reconnu === 'Pois de terre',
     'un nom en trois mots est reconnu quand elle le dit en entier');

  // ON N'A PAS COMMENCÉ À TOUT ACCEPTER. Hors de son étal ET hors du lexique,
  // c'est toujours `null` : l'écran le dit, il n'ouvre pas un formulaire vide.
  ok(produitDit('deux mangues séchées', ETAL_X) === null,
     "un produit qu'elle ne vend pas et que le lexique ignore → null");
  // « Croisignam » : bruit réel du journal du 03/10.
  ok(produitDit('Croisignam', ETAL_X) === null, '« Croisignam » (bruit du journal) → null');
  ok(produitDit('deux kplalas', []) === null, 'étal vide : rien à quoi se raccrocher → null');

  // L'AMBIGUÏTÉ NE SE TRANCHE PAS DAVANTAGE QU'EN [4]. Deux produits de son
  // étal également présents et aussi précis l'un que l'autre : on refuse. Ici
  // le refus est total, car sans mot venu du lexique il ne resterait rien
  // d'elle à garder — mieux vaut redemander que toucher le mauvais produit.
  ok(produitDit('deux kplalas et du pois', [{ nom: 'Kplala' }, { nom: 'Pois' }]) === null,
     'deux produits de son étal possibles : AUCUN choisi à sa place');

  // RIEN N'EST INVENTÉ SUR SON ARGENT. « cinq mille » sans « francs » et sans
  // marqueur de prix peut être 5 000 tas comme 5 000 F : ni l'un ni l'autre
  // n'est retenu, le parcours en trois questions le lui demandera.
  const doute = produitDit('kplala cinq mille', ETAL_X);
  ok(doute?.reconnu === 'Kplala', 'le produit nommé reste reconnu');
  ok(doute?.brouillon.prix === null && doute?.quantite === null,
     "un nombre orphelin trop grand n'est ni un prix ni une quantité");
  // Mais ce qu'elle dit clairement est gardé, tel quel.
  ok(produitDit('kplala à 500', ETAL_X)?.brouillon.prix === 500, '« à 500 » reste un prix de 500');
  // CE QU'ON N'A PAS ÉLARGI, ET C'EST VOULU. `extraire` ne rattache une unité
  // qu'à un produit de SON lexique à lui : « trois tas de kplala » rend
  // `uniteParlee: null`. On ne lui en invente donc aucune, et on n'écrit pas
  // ici une seconde lecture d'unité — le parcours en trois questions la
  // demande, c'est sa raison d'être.
  const tas = produitDit('trois tas de kplala', ETAL_X);
  ok(tas?.quantite === 3, 'les trois sont gardés');
  ok(tas?.brouillon.unite === '', "aucune unité inventée quand le moteur n'en rattache pas");
  ok(tas?.manque === 'unite', "et c'est l'unité qu'on lui demande ensuite");
}

console.log("\n[9] UNE SEULE FAÇON DE RECONNAÎTRE UN PRODUIT, PARTAGÉE AVEC LA CAISSE");
{
  // LE DÉFAUT DE FOND était que la caisse comprenait « deux maniocs » et que
  // le stock le refusait. Écrire ici une SECONDE reconnaissance aurait refermé
  // le symptôme en rouvrant la cause : deux chemins qui divergent. Le repli
  // doit passer par la fonction de la caisse, et par elle seule.
  const src = readFileSync(new URL('./produitDit.ts', import.meta.url), 'utf-8');
  ok(/import \{[^}]*nomDeSonEtal[^}]*\} from '\.\/venteAuCatalogue'/.test(src),
     'le repli passe par `nomDeSonEtal` de la caisse, pas par une seconde écriture');
  ok(/relireNombres/.test(src), 'et les nombres sont relus par la même règle que la caisse');
  // La caisse, elle, doit vraiment avoir été rebranchée dessus — sinon les
  // deux chemins existent encore, l'un en bas de l'autre.
  const cat = readFileSync(new URL('./venteAuCatalogue.ts', import.meta.url), 'utf-8');
  ok(/export function nomDeSonEtal\(/.test(cat), 'la fonction partagée est bien exportée là-bas');
  ok((cat.match(/contientSuite\(phrase, nom\)/g) || []).length === 1,
     "la boucle de reconnaissance n'existe qu'à UN seul endroit");
}

console.log(echecs === 0
  ? '\n✅ Elle dit son produit ; on ne lui demande que ce qui manque.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
