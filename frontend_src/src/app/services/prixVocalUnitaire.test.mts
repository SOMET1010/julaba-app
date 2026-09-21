/**
 * CE QUE LE MONTANT DICTÉ VEUT DIRE — garde du 21/09/2026.
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
 * LA RÈGLE, TRANCHÉE PAR PATRICK. C'est la GRAMMAIRE qui décide, tant qu'elle
 * le peut, et personne ne devine ensuite :
 *   « N … à X »            → X est unitaire        → total N × X
 *   « N … pour X »         → X est le prix du lot  → total X
 *   négociation explicite  → total négocié
 *   sinon, le catalogue ; sinon, la quantité 1 ;
 *   et si rien ne tranche  → AUCUNE écriture, on demande.
 *
 * Aucune heuristique de repli n'existe plus. Une version intermédiaire de ce
 * module choisissait « la lecture qui ne sous-compte jamais » : c'était encore
 * une devinette sur son argent. Elle a été retirée, pas déplacée.
 *
 * CE QUE CE TEST PROUVE, ET COMMENT. Il ne lit pas le code : il JOUE le chemin
 * réel, `extraire` → `intentLocalCaisse` → `vendreVocalUnifie` → panier, et
 * n'observe que ce qui compte — CE QUI ENTRE AU PANIER. Un test qui appellerait
 * `resoudrePrixVocal` directement ne dirait rien du fil manquant, qui était
 * précisément le branchement.
 *
 * LA RÈGLE D'ARBITRAGE N'EST PAS ÉCRITE ICI NI DANS `prixVocal`. Elle vit dans
 * `ligneProvisoire.resoudrePrix` (SPEC_VENTE_VOCALE §5), pure et testée, et
 * servait déjà la saisie guidée.
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
  demandes: Array<{ raison: string; montant?: number; quantite: number }>;
}

/** Dicte une phrase sur la caisse et rend ce que le PANIER en a retenu. */
function dicter(phrase: string, produits: typeof CATALOGUE = CATALOGUE): Jouee {
  const lu = extraire(phrase);
  const res = intentLocalCaisse(phrase);
  const lignes: Jouee['lignes'] = [];
  const demandes: Jouee['demandes'] = [];
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
    demanderPrix: (d) => { demandes.push({ raison: d.raison, montant: d.montant, quantite: d.quantite }); },
  };
  if (res && res.intent === 'vendre') {
    vendreVocalUnifie(res.action.produit, res.action.quantite ?? 1, res.action.montant ?? 0, deps, lu.uniteParlee, lu.lecturePrix);
  }
  return { total: lignes.reduce((s, l) => s + l.total, 0), lignes, demandes };
}

console.log('\n[le montant dicté] « à » n\'est pas « pour », et la différence vaut le triple');

console.log('\n[1] « trois tas de tomates À 500 » → 500 LE TAS → 1 500');
{
  const v = dicter('trois tas de tomates à 500');
  ok(v.lignes.length === 1, 'une ligne entre au panier', v.lignes);
  ok(v.lignes[0]?.qte === 3, 'avec les trois tas dictés', v.lignes[0]);
  ok(v.total === 1500, 'et la vente vaut 1 500 F — pas 500, son tiers', v.total);
  ok(v.lignes[0]?.prix === 500, 'le prix unitaire reste celui qu\'elle a dit : 500', v.lignes[0]);
}

console.log('\n[2] « trois tas de tomates POUR 500 » → 500 LE LOT → 500');
{
  const v = dicter('trois tas de tomates pour 500');
  ok(v.total === 500, 'la vente vaut 500 F — « pour » désigne le lot entier', v.total);
  ok(v.lignes[0]?.qte === 3, 'sur les trois tas', v.lignes[0]);
  ok(v.lignes[0]?.prix === 167, 'et le prix du tas s\'en déduit, arrondi : 167', v.lignes[0]);
}

console.log('\n[3] « deux tas de tomates À 400 » → 800');
{
  const v = dicter('deux tas de tomates à 400');
  ok(v.total === 800, 'la vente vaut 800 F', v.total);
  ok(v.lignes[0]?.prix === 400, 'au prix qu\'elle a annoncé : 400 le tas', v.lignes[0]);
}

console.log('\n[4] NÉGOCIATION — « trois tas de tomates, je te fais 1300 » → 1 300');
{
  // La négociation porte sur le LOT, toujours : personne ne négocie à la
  // hausse. La tournure prime donc sur « à ».
  const v = dicter('trois tas de tomates je te fais 1300');
  ok(v.total === 1300, 'la vente vaut ce qu\'elle a négocié : 1 300 F', v.total);
  ok(v.lignes[0]?.qte === 3, 'sur les trois tas', v.lignes[0]);
  const b = dicter('trois tas de tomates le tout à 1300');
  ok(b.total === 1300, 'et « le tout à 1300 » aussi : la tournure prime sur le « à »', b.total);
}

console.log('\n[5] CAS RÉELLEMENT AMBIGU — ni la phrase, ni le catalogue, ni la quantité 1');
{
  // « deux tas de gombo 500 », catalogue vide : aucune préposition, aucun
  // prix de référence, quantité > 1. 500 peut valoir 500 ou 1 000. On ne
  // tranche pas — c'est le cœur de la décision de Patrick.
  const v = dicter('deux tas de gombo 500', []);
  ok(v.lignes.length === 0, 'AUCUNE ligne n\'entre au panier', v.lignes);
  ok(v.total === 0, 'AUCUN franc n\'est écrit avant la clarification', v.total);
  ok(v.demandes.length === 1, 'la clarification est demandée', v.demandes);
  ok(v.demandes[0]?.raison === 'ambiguite_prix', 'et elle est nommée comme telle, pas confondue avec un prix manquant', v.demandes[0]);
  ok(v.demandes[0]?.montant === 500, 'on lui relit SON chiffre — jamais redemander ce qu\'elle vient de dire', v.demandes[0]);
  ok(v.demandes[0]?.quantite === 2, 'et SA quantité, pour qu\'elle n\'ait pas à la redire', v.demandes[0]);
}

console.log('\n[6] Ce que la grammaire ou le catalogue tranchent encore, sans rien demander');
{
  const cat = dicter('trois tas de tomates 1500');
  ok(cat.total === 1500 && cat.demandes.length === 0,
    'sans préposition, le CATALOGUE tranche : 1500 ≈ 3 × 500 → le lot', cat);
  const un = dicter('un tas de tomates à 500');
  ok(un.total === 500 && un.demandes.length === 0,
    'quantité 1 : unitaire et total se confondent, aucune ambiguïté', un);
  const sans = dicter('trois tas de tomates');
  ok(sans.total === 1500 && sans.demandes.length === 0,
    'sans montant dicté, le prix du catalogue s\'applique : 3 × 500 = 1 500', sans);
  const inconnu = dicter('deux tas de gombo', []);
  ok(inconnu.lignes.length === 0 && inconnu.demandes[0]?.raison === 'prix_manquant',
    'et sans prix connu du tout, c\'est le PRIX qui est demandé, pas une lecture', inconnu);
}

console.log('');
console.log(echecs === 0 ? 'Le montant dicté vaut ce qu\'elle a dit — et ce qu\'on ignore, on le demande.' : `${echecs} échec(s) — une vente dictée peut encore être mal comptée.`);
process.exit(echecs === 0 ? 0 : 1);
