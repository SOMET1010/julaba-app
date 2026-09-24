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

console.log(echecs === 0
  ? '\n✅ Elle dit son produit ; on ne lui demande que ce qui manque.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
