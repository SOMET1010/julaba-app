/**
 * LE PRODUIT DÉJÀ CHOISI NE DOIT PAS ÊTRE REDIT — VOIX-01, lot B2.
 * Lancer : npm run test:preselection-vente
 *
 * LE DÉFAUT, REPRODUIT AVANT D'ÊTRE CORRIGÉ (20/09/2026). Sur `9cb89a5`, le
 * produit présélectionné arrivait bien dans l'écran — il servait à la question
 * d'ouverture et au repli tactile — mais PAS au moteur vocal. La marchande
 * touchait « Tomate » dans Mon stock, arrivait en caisse, disait « trois
 * tas », et le moteur recevait `action.produit = undefined`.
 *
 * Mesuré, pas supposé, en appelant `vendreVocalUnifie(undefined, 3, 0, …)`
 * avec un catalogue contenant Tomate à 500 F le tas :
 *
 *     panier   : []
 *     Tata dit : « Je n'ai pas compris le prix. Redis-moi combien tu as vendu. »
 *
 * L'application redemandait donc un prix qu'elle connaissait déjà, et la vente
 * n'existait pas.
 *
 * CE QUE CE TEST TIENT. Les trois cas exigés au contre-audit, joués à travers
 * la VRAIE chaîne (`produitPourVente` puis `vendreVocalUnifie`), pas seulement
 * sur la fonction de décision : c'est le chaînage qui était cassé, pas la
 * règle.
 */
import { produitPourVente } from './preselectionVente.js';
import { vendreVocalUnifie } from './vendreVocalUnifie.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};

const CATALOGUE = [
  { id: 'p1', nom: 'Tomate', prix: 500, stock: 20, unite: 'tas' },
  { id: 'p2', nom: 'Oignon', prix: 800, stock: 15, unite: 'kg' },
];

/** Rejoue une vente dictée exactement comme l'écran la joue. */
function vendre(opts: {
  nomParle?: string;
  preselection?: { nom: string } | null;
  quantite: number;
  montant?: number;
  uniteParlee?: string | null;
}) {
  const panier: { nom: string; quantite: number }[] = [];
  const dit: string[] = [];
  const deps = {
    products: CATALOGUE,
    addToCart: (p: { nom: string }, q: number) => { panier.push({ nom: p.nom, quantite: q }); },
    speak: (t: string) => { dit.push(t); },
    vibrerSucces: () => {},
    notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: { getItem: () => null, setItem: () => {} },
    estEnLigne: () => true,
    planifier: () => {},
    guidageVocalActif: () => true,
    creerIdLigne: () => 'ligne-test',
  } as never;

  vendreVocalUnifie(
    produitPourVente(opts.nomParle, opts.preselection ?? null),
    opts.quantite,
    opts.montant ?? 0,
    deps,
    opts.uniteParlee ?? null,
  );
  return { panier, dit };
}

console.log('\n[1] Elle a touché Tomate, elle dit « trois tas » — sans nommer le produit');
{
  const { panier, dit } = vendre({ preselection: { nom: 'Tomate' }, quantite: 3, uniteParlee: 'tas' });
  ok(panier.length === 1, `une ligne entre au panier (obtenu ${panier.length})`);
  ok(panier[0]?.nom === 'Tomate', `et c'est bien de la Tomate (obtenu « ${panier[0]?.nom} »)`);
  ok(panier[0]?.quantite === 3, `3 tas (obtenu ${panier[0]?.quantite})`);
  ok(!dit.some(t => /pas compris le prix/i.test(t)),
    'Tata ne redemande plus un prix que l’application connaît');
}

console.log('\n[2] Elle a touché Tomate mais dit « deux kilos d’oignons » — la parole prime');
{
  const { panier } = vendre({ nomParle: 'oignons', preselection: { nom: 'Tomate' }, quantite: 2, montant: 1600 });
  ok(panier.length === 1, `une ligne entre au panier (obtenu ${panier.length})`);
  ok(panier[0]?.nom === 'Oignon', `et c'est de l'Oignon, PAS de la Tomate (obtenu « ${panier[0]?.nom} »)`);
}

console.log('\n[3] Arrivée normale en caisse, sans présélection — comportement inchangé');
{
  const { panier } = vendre({ nomParle: 'tomate', quantite: 1, uniteParlee: 'tas' });
  ok(panier[0]?.nom === 'Tomate', `la vente dictée marche comme avant (obtenu « ${panier[0]?.nom} »)`);
}
{
  // Sans parole ET sans présélection, Tata REDEMANDE. C'est volontaire : on
  // n'invente jamais un produit. Ce cas garantit que le repli n'a pas été
  // transformé en devinette.
  const { panier, dit } = vendre({ quantite: 3 });
  ok(panier.length === 0, 'rien n’entre au panier quand on ne sait pas quoi vendre');
  ok(dit.some(t => /pas compris/i.test(t)), 'et Tata le dit, au lieu de se taire');
}

console.log('\n[4] La règle elle-même');
ok(produitPourVente('oignons', { nom: 'Tomate' }) === 'oignons', 'la parole prime sur la présélection');
ok(produitPourVente(undefined, { nom: 'Tomate' }) === 'Tomate', 'sans parole, la présélection prend le relais');
ok(produitPourVente('   ', { nom: 'Tomate' }) === 'Tomate', 'une parole vide n’est pas une parole');
ok(produitPourVente('  tomate  ', null) === 'tomate', 'le nom dicté est nettoyé de ses espaces');
ok(produitPourVente(undefined, { nom: '  ' }) === undefined, 'une présélection vide ne vaut pas présélection');
ok(produitPourVente(undefined, null) === undefined, 'sans rien : rien — on n’invente pas de produit');

if (echecs > 0) {
  console.log(`\n✗ présélection de vente — ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✓ présélection de vente — l’écran et la voix parlent du même produit');
