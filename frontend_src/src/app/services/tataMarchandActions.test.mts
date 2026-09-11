import assert from 'node:assert/strict';
import {
  executerActionTataMarchand,
  trouverProduitTata,
} from './tataMarchandActions';

const produits = [
  { id: 'tomates-1', nom: 'Tomates fraîches', prix_achat: 300 },
  { id: 'riz-1', nom: 'Riz local', prix_achat: 450 },
];

assert.equal(trouverProduitTata('tomates', produits)?.id, 'tomates-1');

let vente: unknown = null;
let depense: unknown = null;
let stock: unknown = null;
const deps = {
  produits,
  enregistrerVente: async (...args: unknown[]) => { vente = args; },
  enregistrerDepense: async (...args: unknown[]) => { depense = args; },
  mettreAJourStock: async (...args: unknown[]) => { stock = args; },
};

const venteOutcome = await executerActionTataMarchand(
  { type: 'vendre', montant: 1000, produit: 'tomates', quantite: 2 },
  deps,
);
assert.deepEqual(venteOutcome, { kind: 'vente' });
assert.deepEqual(vente, [
  1000,
  [{ productId: 'tomates-1', nom: 'Tomates fraîches', quantite: 2, prix_unitaire: 500, prix_achat: 300 }],
  'cash',
  'Vente vocale Tata : Tomates fraîches',
]);

const depenseOutcome = await executerActionTataMarchand(
  { type: 'depense', montant: 500, description: 'Transport' },
  deps,
);
assert.deepEqual(depenseOutcome, { kind: 'depense' });
assert.deepEqual(depense, [500, 'Transport']);

const stockOutcome = await executerActionTataMarchand(
  { type: 'ajouter_stock', produit: 'riz', quantite: 5 },
  deps,
);
assert.deepEqual(stockOutcome, { kind: 'stock' });
assert.deepEqual(stock, ['riz-1', { quantite: 5 }]);
assert.equal(vente !== null, true);

console.log('tataMarchandActions: OK');
