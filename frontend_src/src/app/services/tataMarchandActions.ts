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
  enregistrerVente: (
    montant: number,
    produits: Array<{
      productId?: string;
      nom: string;
      quantite: number;
      prix_unitaire: number;
      prix_achat: number;
    }>,
    modePaiement: string,
    notes: string,
  ) => Promise<void>;
  enregistrerDepense: (montant: number, notes: string) => Promise<void>;
  mettreAJourStock: (id: string, data: { quantite: number }) => Promise<void>;
};

export type TataMarchandOutcome =
  | { kind: 'vente' }
  | { kind: 'depense' }
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
 */
export async function executerActionTataMarchand(
  action: TataMarchandAction,
  deps: TataMarchandDependencies,
): Promise<TataMarchandOutcome> {
  if (action.type === 'vendre' && action.montant && action.montant > 0) {
    const quantite = Math.max(1, Number(action.quantite) || 1);
    const produit = trouverProduitTata(action.produit, deps.produits);
    const nom = produit?.nom || action.produit || 'Produit vocal';
    await deps.enregistrerVente(
      action.montant,
      [{
        productId: produit?.id,
        nom,
        quantite,
        prix_unitaire: Math.round(action.montant / quantite),
        prix_achat: Number(produit?.prix_achat) || 0,
      }],
      'cash',
      `Vente vocale Tata : ${nom}`,
    );
    return { kind: 'vente' };
  }

  if ((action.type === 'depense' || (action.montant && !action.type)) && action.montant && action.montant > 0) {
    await deps.enregistrerDepense(action.montant, action.description || 'Dépense vocale Tata');
    return { kind: 'depense' };
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
