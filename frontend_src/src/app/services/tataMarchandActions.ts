import type { ResultatOperationCaisse } from './statutOperationCaisse';

export type TataMarchandAction = {
  type?: string;
  montant?: number;
  produit?: string;
  quantite?: number;
  description?: string;
};

export type ProduitCaisseTata = {
  id: string;
  nom: string;
  prix_achat?: number;
  quantite?: number;
};

export type TataMarchandDependencies = {
  produits: ProduitCaisseTata[];
  enregistrerDepense: (montant: number, notes: string) => Promise<ResultatOperationCaisse>;
  mettreAJourStock: (id: string, data: { quantite: number }) => Promise<void>;
};

export type TataMarchandOutcome =
  | { kind: 'depense'; resultat: ResultatOperationCaisse; montant: number }
  | { kind: 'stock' }
  | { kind: 'stock_unknown' }
  | { kind: 'not_handled' };

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('fr-FR');
}

export function trouverProduitTata(produit: string | undefined, produits: ProduitCaisseTata[]) {
  if (!produit) return undefined;
  const needle = normalize(produit);
  return produits.find((item) => {
    const candidate = normalize(item.nom);
    return candidate === needle || candidate.includes(needle) || needle.includes(candidate);
  });
}

/**
 * Exécute uniquement les actions dont le chemin caisse est idempotent et
 * durable hors ligne. Le stock reste volontairement hors de ce helper tant
 * que son endpoint ne porte pas de clé d'idempotence serveur.
 *
 * « vendre » n'est PAS géré ici : ce n'est plus une écriture backend (voir
 * convergence voix/tactile POS, Lot 2) mais un ajout au panier partagé —
 * `TantieSagesseModal.tsx` le route directement vers `vendreVocalUnifie`
 * (même fonction que `VenteVocaleModal`), avant même d'appeler ce helper.
 * Aucun chemin vocal ne doit plus appeler `enregistrerVente` en dehors du
 * bouton tactile « Payer en espèces » de `POSCaisse`.
 */
export async function executerActionTataMarchand(
  action: TataMarchandAction,
  deps: TataMarchandDependencies,
): Promise<TataMarchandOutcome> {
  if ((action.type === 'depense' || (action.montant && !action.type)) && action.montant && action.montant > 0) {
    const resultat = await deps.enregistrerDepense(action.montant, action.description || 'Dépense vocale Tata');
    return { kind: 'depense', resultat, montant: action.montant };
  }

  if (action.type === 'ajouter_stock') {
    const produit = trouverProduitTata(action.produit, deps.produits);
    if (!produit) return { kind: 'stock_unknown' };
    const quantiteAjoutee = Math.max(1, Number(action.quantite) || 1);
    await deps.mettreAJourStock(produit.id, { quantite: (Number(produit.quantite) || 0) + quantiteAjoutee });
    return { kind: 'stock' };
  }

  return { kind: 'not_handled' };
}
