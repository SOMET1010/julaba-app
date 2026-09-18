/**
 * LE PRIX PEUT VENIR DU CATALOGUE — les cinq cas exigés par Patrick.
 *
 * LE DÉFAUT QU'ON FERME. Sur appareil réel, il dit « un tas de piment ». Il ne
 * se passe RIEN : pas de ligne, pas un mot de Tata. L'analyse comprenait
 * pourtant tout — intention=vente, produit=piment, quantité=1 — seul le montant
 * manquait. Un montant que l'application connaît : le prix est au catalogue.
 *
 * Une marchande ne dit pas « un tas de piment à cent cinquante francs ». Elle
 * dit « un tas de piment » : le prix, elle et sa cliente le savent. Exiger
 * qu'elle le récite, c'est lui demander de parler comme une caisse.
 *
 * L'ORDRE DE PRIORITÉ TENU ICI, et il porte sur son argent :
 *   1. le montant DICTÉ gagne toujours — elle négocie, sa parole prime ;
 *   2. sinon, prix du catalogue × quantité ;
 *   3. sinon, AUCUNE ligne et Tata le dit. Inventer un prix fausserait sa
 *      caisse ; se taire lui ferait croire que la vente est passée.
 *
 * Lancer : npm run test:prix-catalogue
 */
import { vendreVocalUnifie, type DependancesVendreVocalUnifie, type ProduitPourPanier } from './vendreVocalUnifie.js';
import type { ProduitAppariable } from './venteVocale.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};

const PIMENT: ProduitAppariable = { id: 'p-piment', nom: 'Piment', prix: 150, prix_achat: 100, stock: 15, unite: 'tas' };
const BANANE: ProduitAppariable = { id: 'p-banane', nom: 'Banane', prix: 100, prix_achat: 60, stock: 40, unite: 'régime' };
/** Un produit au catalogue mais SANS prix — le cas qu'on refuse d'inventer. */
const SANS_PRIX: ProduitAppariable = { id: 'p-zero', nom: 'Gombo', prix: 0, stock: 5, unite: 'tas' };

type Ajout = [ProduitPourPanier, number, number | undefined, string | undefined];

function monter(products: ProduitAppariable[]) {
  const ajouts: Ajout[] = [];
  const dits: string[] = [];
  const deps: DependancesVendreVocalUnifie = {
    products,
    addToCart: (produit, quantite, totalExact, origine) => { ajouts.push([produit, quantite, totalExact, origine]); },
    speak: (t) => { dits.push(t); },
    vibrerSucces: () => {},
    notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: { getItem: () => null, setItem: () => {} },
    estEnLigne: () => false, // aucune proposition de création : hors sujet ici
    planifier: () => {},
    guidageVocalActif: () => true,
    creerIdLigne: () => 'ligne-test',
  };
  return { deps, ajouts, dits };
}

console.log('\nLe prix vient du catalogue quand il n’est pas dicté');

{
  // 1. « un tas de piment » — le cas exact relevé sur le terrain.
  const { deps, ajouts } = monter([PIMENT]);
  vendreVocalUnifie('piment', 1, 0, deps);
  ok(ajouts.length === 1, 'une ligne est ajoutée au panier');
  ok(ajouts[0]?.[2] === 150, `le total vaut le prix catalogue (150), obtenu ${ajouts[0]?.[2]}`);
  ok(ajouts[0]?.[0]?.id === 'p-piment', 'c’est bien le produit du catalogue, pas une ligne libre');
  ok(ajouts[0]?.[3] === 'vocal', 'la vente est marquée « vocal »');
}

{
  // 2. « j'ai vendu deux bananes » — la quantité multiplie le prix catalogue.
  const { deps, ajouts } = monter([BANANE]);
  vendreVocalUnifie('banane', 2, 0, deps);
  ok(ajouts.length === 1, 'deux bananes : une ligne');
  ok(ajouts[0]?.[1] === 2, 'la quantité est bien 2');
  ok(ajouts[0]?.[2] === 200, `2 × 100 = 200, obtenu ${ajouts[0]?.[2]}`);
}

{
  // 3. LE MONTANT DICTÉ PRIME. Une marchande négocie : « deux bananes pour
  //    trois cent cinquante francs » vaut 350, pas 200.
  const { deps, ajouts } = monter([BANANE]);
  vendreVocalUnifie('banane', 2, 350, deps);
  ok(ajouts[0]?.[2] === 350, `le montant dicté écrase le catalogue (350), obtenu ${ajouts[0]?.[2]}`);
}

{
  // 4. Produit INCONNU et sans montant : on ne devine pas, et on le DIT.
  const { deps, ajouts, dits } = monter([BANANE]);
  vendreVocalUnifie('mangue', 1, 0, deps);
  ok(ajouts.length === 0, 'aucune ligne ajoutée — aucune écriture financière');
  ok(dits.length === 1 && /prix/i.test(dits[0]), `Tata annonce qu’elle n’a pas le prix : « ${dits[0] ?? '(rien)'} »`);
}

{
  // 5. Produit AU CATALOGUE mais à prix zéro : même refus. Un prix nul n'est
  //    pas un prix — l'ajouter inscrirait une vente à 0 F dans sa caisse.
  const { deps, ajouts, dits } = monter([SANS_PRIX]);
  vendreVocalUnifie('gombo', 3, 0, deps);
  ok(ajouts.length === 0, 'prix catalogue à 0 : aucune ligne');
  ok(dits.length === 1 && /Gombo/.test(dits[0]), `Tata nomme le produit concerné : « ${dits[0] ?? '(rien)'} »`);
}

{
  // 6. Un produit à prix zéro reste vendable SI elle dicte le prix : c'est
  //    elle qui sait. Le refus ci-dessus ne doit pas devenir un blocage.
  const { deps, ajouts } = monter([SANS_PRIX]);
  vendreVocalUnifie('gombo', 2, 400, deps);
  ok(ajouts.length === 1 && ajouts[0]?.[2] === 400, 'prix dicté sur un produit sans prix : la vente passe');
}

console.log('\nLes deux cas relevés par Patrick sur l’architecture');

{
  // 7. L'UNITÉ PARLÉE DOIT CONCORDER. « un tas de piment » sur un catalogue qui
  //    dit « Piment, 500 F le KILO » : reprendre 500 F serait faux. Un tas
  //    n'est pas un kilo, et l'écart se paie sur l'argent de la marchande.
  const PIMENT_KG: ProduitAppariable = { id: 'p-kg', nom: 'Piment', prix: 500, stock: 9, unite: 'kg' };
  const { deps, ajouts, dits } = monter([PIMENT_KG]);
  vendreVocalUnifie('piment', 1, 0, deps, 'tas');
  ok(ajouts.length === 0, 'unité incompatible : aucune ligne, aucun prix inventé');
  ok(/tas/.test(dits[0] ?? '') && /kg/.test(dits[0] ?? ''),
     `Tata nomme les DEUX unités : « ${dits[0] ?? '(rien)'} »`);
}

{
  // 8. Unité compatible malgré l'orthographe : « kilos » = « kg ». Refuser ici
  //    serait aussi nuisible qu'accepter à tort.
  const TOMATE_KG: ProduitAppariable = { id: 'p-tkg', nom: 'Tomate', prix: 500, stock: 9, unite: 'kg' };
  const { deps, ajouts } = monter([TOMATE_KG]);
  vendreVocalUnifie('tomate', 3, 0, deps, 'kilos');
  ok(ajouts[0]?.[2] === 1500, `« trois kilos » sur un prix au kg : 3 × 500 = 1500, obtenu ${ajouts[0]?.[2]}`);
}

{
  // 9. LA PROMOTION DOIT S'APPLIQUER À LA VOIX COMME AU DOIGT. Le prix passe
  //    par prixEffectif, la même fonction que CaisseContext.addToCart — sans
  //    quoi l'application aurait deux caisses : une tactile, une vocale.
  const EN_PROMO = { id: 'p-promo', nom: 'Banane', prix: 100, prix_promo: 70, promo_fin: null, stock: 40, unite: 'régime' };
  const { deps, ajouts } = monter([EN_PROMO as unknown as ProduitAppariable]);
  vendreVocalUnifie('banane', 2, 0, deps);
  ok(ajouts[0]?.[2] === 140, `la promo s'applique : 2 × 70 = 140, obtenu ${ajouts[0]?.[2]}`);
}

{
  // 10. Mais un montant dicté NEUTRALISE la promo, comme sur le chemin tactile :
  //     ce qu'elle annonce à sa cliente fait foi.
  const EN_PROMO = { id: 'p-promo2', nom: 'Banane', prix: 100, prix_promo: 70, promo_fin: null, stock: 40, unite: 'régime' };
  const { deps, ajouts } = monter([EN_PROMO as unknown as ProduitAppariable]);
  vendreVocalUnifie('banane', 2, 250, deps);
  ok(ajouts[0]?.[2] === 250, `le montant dicté prime sur la promo, obtenu ${ajouts[0]?.[2]}`);
}

if (echecs > 0) {
  console.log(`\n✗ prix catalogue — ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✓ prix catalogue — les cinq cas exigés passent');
