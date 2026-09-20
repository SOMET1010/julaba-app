import assert from 'node:assert/strict';
import {
  executerActionTataMarchand,
  trouverProduitTata,
  type TataMarchandDependencies,
} from './tataMarchandActions';

const produits = [
  { id: 'tomates-1', nom: 'Tomates fraîches', prix_achat: 300 },
  { id: 'riz-1', nom: 'Riz local', prix_achat: 450 },
];

assert.equal(trouverProduitTata('tomates', produits)?.id, 'tomates-1');

let depense: unknown = null;
let stock: unknown = null;
const deps: TataMarchandDependencies = {
  produits,
  enregistrerDepense: async (...args: unknown[]) => { depense = args; return { statut: 'confirmee' }; },
  mettreAJourStock: async (...args: unknown[]) => { stock = args; },
};

// Convergence voix/tactile POS (Lot 2 + fermeture du dernier chemin
// parallèle) : « vendre » n'est PLUS une écriture backend de ce module —
// TantieSagesseModal.tsx le route directement vers vendreVocalUnifie
// (panier partagé), avant même d'appeler executerActionTataMarchand. Preuve
// structurelle : TataMarchandDependencies n'expose plus enregistrerVente, et
// « vendre » retombe donc forcément sur 'not_handled' ici.
const venteOutcome = await executerActionTataMarchand(
  { type: 'vendre', montant: 1000, produit: 'tomates', quantite: 2 },
  deps,
);
assert.deepEqual(venteOutcome, { kind: 'not_handled' });
assert.equal('enregistrerVente' in deps, false);

const depenseOutcome = await executerActionTataMarchand(
  { type: 'depense', montant: 500, description: 'Transport' },
  deps,
);
assert.deepEqual(depenseOutcome, { kind: 'depense', resultat: { statut: 'confirmee' }, montant: 500 });
assert.deepEqual(depense, [500, 'Transport']);

const stockOutcome = await executerActionTataMarchand(
  { type: 'ajouter_stock', produit: 'riz', quantite: 5 },
  deps,
);
assert.deepEqual(stockOutcome, { kind: 'stock' });
assert.deepEqual(stock, ['riz-1', { quantite: 5 }]);

console.log('tataMarchandActions: OK');
