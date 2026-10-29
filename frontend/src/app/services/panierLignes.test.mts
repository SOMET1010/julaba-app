/**
 * UNE LIGNE DE PANIER N'EST PAS UN PRODUIT — P0.1 / ARCH-02.
 * Lancer : npm run test:panier-lignes
 *
 * LE DÉFAUT QU'ON FERME. `CartItem.productId` portait DEUX sens :
 *
 *   · l'identifiant d'un produit du catalogue (un UUID) ;
 *   · l'identité d'une ligne de panier sans produit — article libre tapé au
 *     doigt, ou produit dicté que l'appariement n'a pas reconnu — fabriquée
 *     sous la forme `libre-1758712345678-42`.
 *
 * Mesuré : sur 27 usages, 21 s'en servent comme CLÉ DE LIGNE et 6 seulement
 * comme identifiant catalogue. Le nom était donc trompeur quatre fois sur
 * cinq. Le serveur s'en protégeait déjà (ARG-16, `identifiantProduit`), mais
 * au bord seulement : la confusion vivait toujours dans l'écran.
 *
 * LE PIÈGE QUE LA SÉPARATION OUVRE, ET QUE CETTE GARDE FERME. En donnant
 * `productId: null` aux articles libres, une fusion naïve par `productId` les
 * rendrait tous ÉGAUX — `null === null` — et les écraserait en une seule
 * ligne. « Autre article à 500 » puis « Autre article à 800 » deviendraient
 * une ligne, et elle perdrait de l'argent sur son propre panier. C'est la
 * faute du 18/09, réintroduite par la correction censée l'éviter.
 *
 * LA RÈGLE (arbitrage de Patrick, 27/09) :
 *   · fusion par `productId`, et SEULEMENT s'il existe ;
 *   · un article sans produit catalogue ne fusionne JAMAIS, même si un autre
 *     porte le même nom et le même prix ;
 *   · suppression, modification et ciblage passent TOUJOURS par `ligneId`.
 *
 * `null` veut dire « pas de produit catalogue ». Jamais « c'est le même ».
 */
import {
  ajouterAuPanier, retirerLigne, changerQuantite, changerPrix, nouvelleLigneId,
  type LignePanier,
} from './panierLignes.js';
import { parseCart } from './cartStorage.js';

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

const UUID_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const UUID_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const cat = (id: string, nom: string, prix: number) => ({ id, nom, prix, unite: 'kg' });
const libre = (nom: string, prix: number) => ({ id: null, nom, prix, unite: 'unité' });

console.log('\n[1] toute ligne a une identité, et elle est unique');
{
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, cat(UUID_A, 'Tomate', 500), 1);
  p = ajouterAuPanier(p, cat(UUID_B, 'Gombo', 300), 1);
  p = ajouterAuPanier(p, libre('Autre article', 800), 1);
  ok(p.every(l => typeof l.ligneId === 'string' && l.ligneId.length > 0),
     'chaque ligne porte un ligneId');
  ok(new Set(p.map(l => l.ligneId)).size === p.length, 'et ils sont tous distincts');
  ok(nouvelleLigneId() !== nouvelleLigneId(), 'deux identités demandées ne collident pas');
}

console.log('\n[2] productId est un identifiant CATALOGUE, ou rien');
{
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, cat(UUID_A, 'Tomate', 500), 1);
  p = ajouterAuPanier(p, libre('Autre article', 800), 1);
  ok(p[0].productId === UUID_A, 'un produit du catalogue garde son identifiant');
  ok(p[1].productId === null, 'un article libre n\'en a pas — `null`, pas un faux');
  ok(!p.some(l => String(l.productId ?? '').startsWith('libre-')),
     'plus AUCUN `libre-*` ne se fait passer pour un produit');
}

console.log('\n[3] LA FUSION — par productId, et seulement s\'il existe');
{
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, cat(UUID_A, 'Tomate', 500), 2);
  p = ajouterAuPanier(p, cat(UUID_A, 'Tomate', 500), 3);
  ok(p.length === 1, 'deux fois le même produit → UNE ligne');
  ok(p[0].quantite === 5, 'les quantités s\'additionnent', `obtenu : ${p[0].quantite}`);
}

console.log('\n[4] LE PIÈGE : deux articles libres ne fusionnent JAMAIS');
{
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, libre('Autre article', 500), 1);
  p = ajouterAuPanier(p, libre('Autre article', 800), 1);
  ok(p.length === 2, 'même nom, prix différents → DEUX lignes',
     `obtenu : ${p.length} — fusionnés, elle perdrait la différence`);
}

console.log('\n[4bis] MÊME NOM ET MÊME PRIX : toujours deux lignes');
{
  // Invariant demandé par Patrick : sans lui, une « optimisation » future
  // pourrait réintroduire une fusion heuristique par nom/prix.
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, libre('Autre article', 500), 1);
  p = ajouterAuPanier(p, libre('Autre article', 500), 1);
  ok(p.length === 2, 'deux ajouts distincts restent deux lignes',
     `obtenu : ${p.length} — le nom et le prix ne sont PAS une identité`);
  ok(p[0].ligneId !== p[1].ligneId, 'et elles ont des identités différentes');
}

console.log('\n[5] on ne fusionne pas un libre avec un produit du catalogue');
{
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, cat(UUID_A, 'Tomate', 500), 1);
  p = ajouterAuPanier(p, libre('Tomate', 500), 1);
  ok(p.length === 2, 'même nom, l\'un catalogué l\'autre non → deux lignes');
}

console.log('\n[6] SUPPRESSION ET MODIFICATION passent par ligneId');
{
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, libre('Autre article', 500), 1);
  p = ajouterAuPanier(p, libre('Autre article', 500), 1);
  const cible = p[1].ligneId;
  const apres = retirerLigne(p, cible);
  ok(apres.length === 1, 'retirer une ligne n\'en retire qu\'UNE',
     'par nom ou par prix, les deux partaient ensemble');
  ok(apres[0].ligneId === p[0].ligneId, 'et c\'est la BONNE qui reste');

  const q = changerQuantite(p, cible, 4);
  ok(q.find(l => l.ligneId === cible)?.quantite === 4, 'la quantité change sur la bonne ligne');
  ok(q.find(l => l.ligneId === p[0].ligneId)?.quantite === 1, 'l\'autre ne bouge pas');

  const pr = changerPrix(p, cible, 900);
  ok(pr.find(l => l.ligneId === cible)?.prix === 900, 'le prix change sur la bonne ligne');
  ok(pr.find(l => l.ligneId === p[0].ligneId)?.prix === 500, 'l\'autre ne bouge pas');
}

console.log('\n[7] une modification manuelle invalide le total dicté');
{
  // Règle existante : `totalExact` ne vaut que pour la ligne TELLE QUE CRÉÉE.
  let p: LignePanier[] = [];
  p = ajouterAuPanier(p, cat(UUID_A, 'Tomate', 333), 3, 1000);
  ok(p[0].totalExact === 1000, 'le total négocié est porté');
  ok(changerQuantite(p, p[0].ligneId, 5)[0].totalExact === undefined,
     'changer la quantité l\'invalide');
  ok(changerPrix(p, p[0].ligneId, 400)[0].totalExact === undefined,
     'changer le prix aussi');
}

console.log('\n[8] retirer une ligne inconnue ne casse rien');
{
  const p = ajouterAuPanier([], cat(UUID_A, 'Tomate', 500), 1);
  ok(retirerLigne(p, 'inexistant').length === 1, 'le panier est rendu intact');
  ok(changerQuantite(p, 'inexistant', 9)[0].quantite === 1, 'rien n\'est modifié');
}

console.log('\n[9] une quantité nulle ou négative retire la ligne');
{
  const p = ajouterAuPanier([], cat(UUID_A, 'Tomate', 500), 2);
  ok(changerQuantite(p, p[0].ligneId, 0).length === 0, 'quantité 0 → ligne retirée');
  ok(changerQuantite(p, p[0].ligneId, -1).length === 0, 'quantité négative aussi');
}

console.log('\n[10] LA MIGRATION PERSISTÉE — un ancien panier change d\'identité sans rien perdre');
// P0.1 côté stockage : l'ancien `productId` devient `ligneId` dans TOUS les
// cas, et ne reste `productIdCatalogue` que si c'est un vrai UUID. Un
// `libre-*` n'en devient JAMAIS un — ce serait recréer la confusion.
{
  const brut = JSON.stringify({
    v: 2, updatedAt: '2026-09-27T10:00:00.000Z',
    items: [
      { productId: UUID_A, nom: 'Tomate', prix: 500, quantite: 2, unite: 'tas', totalExact: 1000, prix_achat: 300, origine: 'vocal' },
      { productId: 'libre-1758712345678-42', nom: 'Autre article', prix: 800, quantite: 1 },
    ],
  });
  const env = parseCart(brut);
  const [cataloguee, librePersiste] = (env?.items ?? []) as unknown as Record<string, unknown>[];

  ok(cataloguee?.ligneId === UUID_A, 'produit catalogue : l\'ancien id devient l\'identité de ligne');
  ok(cataloguee?.productIdCatalogue === UUID_A, '… et reste l\'identifiant catalogue (c\'est un UUID)');
  ok(librePersiste?.ligneId === 'libre-1758712345678-42',
     'article libre : son `libre-*` devient une identité de LIGNE');
  ok(librePersiste?.productIdCatalogue === null,
     '… et JAMAIS un identifiant produit', 'le transformer serait recréer la confusion');

  // La fidélité de PAN-01 n'a pas bougé : c'est son lot, pas celui-ci.
  ok(cataloguee?.unite === 'tas' && cataloguee?.totalExact === 1000
     && cataloguee?.prix_achat === 300 && cataloguee?.origine === 'vocal',
     'et les quatre champs de PAN-01 traversent la migration v3 intacts',
     JSON.stringify(cataloguee));
}

console.log(failures === 0
  ? '\nUne ligne de panier n\'est plus un produit ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
