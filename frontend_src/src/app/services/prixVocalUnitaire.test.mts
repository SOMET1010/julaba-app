/**
 * UNE VENTE DICTÉE AU PRIX UNITAIRE VAUT SON PRIX — garde du 21/09/2026.
 * Lancer : npm run test:prix-unitaire
 *
 * LE DÉFAUT, ET CE QU'IL COÛTAIT. `prixVocal.ts` traitait TOUT montant dicté
 * comme le TOTAL de la vente. Or « trois tas de tomates à 500 », catalogue à
 * 500 le tas, est une vente de 1 500 F : elle annonce son prix À L'UNITÉ,
 * comme tout le monde au marché. La ligne entrait au panier pour 500 F — le
 * TIERS — avec un prix unitaire de 167 F que personne n'avait prononcé. Aucune
 * alerte, aucun écran : de l'argent perdu en silence, sur le geste le plus
 * banal du métier.
 *
 * CE QUE CE TEST PROUVE, ET COMMENT. Il ne lit pas le code : il JOUE le chemin
 * réel, `extraire` → `intentLocalCaisse` → `vendreVocalUnifie` → panier, et
 * n'observe que ce qui compte — CE QUI ENTRE AU PANIER. Un test qui appellerait
 * `resoudrePrixVocal` directement ne dirait rien du fil manquant, qui était
 * précisément le branchement.
 *
 * LA RÈGLE N'EST PAS ÉCRITE ICI. Elle vit dans `ligneProvisoire.resoudrePrix`
 * (SPEC_VENTE_VOCALE §5), pure et testée, et servait déjà la saisie guidée.
 * `prixVocal` ne fait que la relier au catalogue.
 */
import { extraire } from '../voice-offline/extraction.js';
import { intentLocalCaisse } from '../voice-offline/localIntent.js';
import { vendreVocalUnifie, type DependancesVendreVocalUnifie } from './vendreVocalUnifie.js';

const CATALOGUE = [
  { id: 'p-tomate', nom: 'Tomate', prix: 500, stock: 10, unite: 'tas', categorie: 'Légumes' },
];

let echecs = 0;
const ok = (cond: boolean, quoi: string, obtenu?: unknown) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi, obtenu === undefined ? '' : `— obtenu ${JSON.stringify(obtenu)}`); echecs++; }
};

interface Jouee {
  total: number;
  lignes: Array<{ nom: string; qte: number; prix: number; total: number }>;
  demandes: unknown[];
}

/** Dicte une phrase sur la caisse et rend ce que le PANIER en a retenu. */
function dicter(phrase: string, produits: typeof CATALOGUE = CATALOGUE): Jouee {
  const ex = extraire(phrase);
  const res = intentLocalCaisse(phrase);
  const lignes: Jouee['lignes'] = [];
  const demandes: unknown[] = [];
  const deps: DependancesVendreVocalUnifie = {
    products: produits,
    addToCart: (p, qte, totalExact) => { lignes.push({ nom: p.nom, qte, prix: p.prix, total: totalExact ?? p.prix * qte }); },
    speak: () => {},
    vibrerSucces: () => {},
    notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: { getItem: () => null, setItem: () => {} },
    estEnLigne: () => false,
    creerIdLigne: () => 'X',
    planifier: () => {},
    guidageVocalActif: () => false,
    demanderPrix: (d) => { demandes.push(d); },
  };
  if (res && res.intent === 'vendre') {
    vendreVocalUnifie(res.action.produit, res.action.quantite ?? 1, res.action.montant ?? 0, deps, ex.uniteParlee);
  }
  return { total: lignes.reduce((s, l) => s + l.total, 0), lignes, demandes };
}

console.log('\n[prix unitaire dicté] Le montant annoncé « à 500 » n\'est pas le total de la vente');

console.log('\n[1] « trois tas de tomates à 500 » — catalogue 500 le tas');
{
  const v = dicter('trois tas de tomates à 500');
  ok(v.lignes.length === 1, 'une ligne entre au panier', v.lignes);
  ok(v.lignes[0]?.qte === 3, 'avec les trois tas dictés', v.lignes[0]);
  ok(v.total === 1500, 'et la vente vaut 1 500 F — pas 500, son tiers', v.total);
  ok(v.lignes[0]?.prix === 500, 'le prix unitaire reste celui qu\'elle a dit : 500', v.lignes[0]);
}

console.log('\n[2] « trois tas de tomates à 1500 » — là, elle a annoncé le TOTAL');
{
  const v = dicter('trois tas de tomates à 1500');
  ok(v.total === 1500, 'la vente vaut 1 500 F — jamais 4 500', v.total);
  ok(v.lignes[0]?.prix === 500, 'et le prix unitaire s\'en déduit : 500', v.lignes[0]);
}

console.log('\n[3] NÉGOCIATION — « trois tas de tomates à 1300 » : le prix négocié gagne sur le catalogue');
{
  const v = dicter('trois tas de tomates à 1300');
  ok(v.total === 1300, 'la vente vaut ce qu\'elle a négocié : 1 300 F', v.total);
  ok(v.lignes[0]?.qte === 3, 'sur les trois tas', v.lignes[0]);
}

console.log('\n[4] QUANTITÉ 1 — « un tas de tomates à 500 » : unitaire et total se confondent');
{
  const v = dicter('un tas de tomates à 500');
  ok(v.total === 500, 'la vente vaut 500 F, sans ambiguïté', v.total);
  ok(v.lignes[0]?.prix === 500, 'et le prix unitaire aussi', v.lignes[0]);
}

console.log('\n[5] AMBIGUÏTÉ RÉSIDUELLE — produit inconnu, le catalogue ne départage pas');
{
  // Choix de produit assumé : on lit le montant comme UNITAIRE, la seule
  // lecture qui ne sous-compte JAMAIS sa vente. « Deux tas de gombo à 400 »,
  // au marché, veut dire 400 le tas.
  const v = dicter('deux tas de gombo à 400', []);
  ok(v.total === 800, 'la vente vaut 800 F : on ne sous-compte pas ce qu\'on ne sait pas trancher', v.total);
  ok(v.lignes[0]?.prix === 400, 'au prix qu\'elle a prononcé, 400 le tas', v.lignes[0]);
}

console.log('\n[6] SANS MONTANT DICTÉ, rien ne change : le catalogue reste le catalogue');
{
  const v = dicter('trois tas de tomates');
  ok(v.total === 1500, '« trois tas de tomates » vaut 3 × 500 = 1 500 F', v.total);
  const inconnu = dicter('deux tas de gombo', []);
  ok(inconnu.lignes.length === 0 && inconnu.demandes.length === 1,
    'et sans prix connu, aucune ligne n\'est inventée : le prix est DEMANDÉ', inconnu);
}

console.log('');
console.log(echecs === 0 ? 'Une vente dictée au prix unitaire vaut son prix.' : `${echecs} échec(s) — une vente dictée peut encore être sous-comptée.`);
process.exit(echecs === 0 ? 0 : 1);
