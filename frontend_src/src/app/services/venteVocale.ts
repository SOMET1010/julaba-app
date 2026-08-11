/**
 * Unification voix↔panier (Phase 5, lot 1) — module PUR, sans React ni DOM.
 *
 * La vente vocale enregistrait des lignes « orphelines » ({ nom, quantite,
 * prix_unitaire }) : sans productId, sans prix d'achat, sans total. Résultat :
 * bénéfice compté à 100 % du montant, stock jamais décrémenté, reçus incomplets.
 *
 * Ce module fait converger la vente vocale vers le MÊME format de ligne que le
 * panier (POSCaisse) :
 * - appariement du produit dicté au catalogue (accents/majuscules/pluriels tolérés) ;
 * - ligne portant total (source de vérité), prix d'achat unitaire et productId.
 *
 * Le montant DICTÉ reste prioritaire sur le prix catalogue : au marché, le prix
 * se négocie ; la marchande dit ce qu'elle a réellement encaissé.
 */

export interface ProduitAppariable {
  id: string;
  nom: string;
  prix: number;
  prix_achat?: number;
  stock: number;
  unite: string;
}

export interface LigneVenteVocale {
  /** Présent seulement si le produit dicté correspond à un produit du catalogue. */
  productId?: string;
  nom: string;
  quantite: number;
  /** Prix unitaire arrondi — affichage/reçu. En FCFA, 500/3 ne retombe pas juste : */
  /** c'est `total` qui fait foi pour la compta (bug #11 de l'audit). */
  prix: number;
  /** Alias historique de `prix`, lu par les reçus et anciens écrans. */
  prix_unitaire: number;
  /** Montant TOTAL réellement encaissé pour la ligne — source de vérité. */
  total: number;
  /** Prix d'achat UNITAIRE (marge/bénéfice) — présent si produit du catalogue. */
  prix_achat?: number;
}

/** « Tomates Séchées » → « tomate sechee » : minuscules, sans accents, sans pluriel. */
export function normaliserNom(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map(mot => (mot.length > 2 && mot.endsWith('s') ? mot.slice(0, -1) : mot))
    .join(' ');
}

/**
 * Retrouve le produit du catalogue correspondant au nom dicté.
 * Égalité stricte (normalisée) d'abord ; sinon inclusion (« tomate » ↔ « tomate
 * cerise ») acceptée SEULEMENT si un unique candidat correspond — en cas
 * d'ambiguïté on préfère ne pas apparier plutôt que de toucher le mauvais stock.
 */
export function apparierProduit<T extends { nom: string }>(nomParle: string, produits: T[]): T | null {
  const cible = normaliserNom(nomParle || '');
  if (!cible) return null;
  const exacts = produits.filter(p => normaliserNom(p.nom) === cible);
  if (exacts.length === 1) return exacts[0];
  if (exacts.length > 1) return null;
  const inclus = produits.filter(p => {
    const n = normaliserNom(p.nom);
    return n.includes(cible) || cible.includes(n);
  });
  return inclus.length === 1 ? inclus[0] : null;
}

/**
 * Construit la ligne de vente au format unifié du panier.
 * `montant` est le TOTAL dicté ; `produit` est le résultat de l'appariement (ou null).
 */
export function construireLigneVocale(args: {
  nomParle?: string;
  quantite?: number;
  montant: number;
  produit?: ProduitAppariable | null;
}): LigneVenteVocale {
  const quantite = args.quantite && args.quantite > 0 ? args.quantite : 1;
  const prixUnitaire = Math.round(args.montant / quantite);
  const ligne: LigneVenteVocale = {
    nom: args.produit?.nom || args.nomParle?.trim() || 'Produit vocal',
    quantite,
    prix: prixUnitaire,
    prix_unitaire: prixUnitaire,
    total: args.montant,
  };
  if (args.produit) {
    ligne.productId = args.produit.id;
    const pa = Number(args.produit.prix_achat) || 0;
    if (pa > 0) ligne.prix_achat = pa;
  }
  return ligne;
}
