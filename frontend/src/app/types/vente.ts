/**
 * LES DONNÉES DE LA VENTE, ÉCRITES UNE FOIS — HYGIÈNE-1 axe 4.
 *
 * Ce qui motive ce fichier n'est pas un principe de typage. C'est un incident
 * de l'axe 3 : renommer un champ du bénéfice aurait dû faire échouer la
 * compilation de l'écran « Mes ventes », qui le lisait. Elle n'a rien vu — la
 * vente y était typée `any`. La marge affichée serait tombée à zéro sur toutes
 * les ventes, en silence, jusqu'à ce qu'une marchande le remarque.
 *
 * `any` sur l'argent, ce n'est pas une facilité d'écriture : c'est la garantie
 * qu'une erreur d'argent passera la compilation.
 *
 * LES ALIAS SONT DÉLIBÉRÉMENT DÉCLARÉS. Le serveur et les différents écrans
 * n'ont jamais choisi entre `prix_achat` et `prixAchat`, entre `quantite` et
 * `quantity`, entre `montant` et `price`. Les taire ne les ferait pas
 * disparaître ; les déclarer les rend visibles et comptables. C'est une dette
 * nommée, pas un modèle approuvé — sa résorption demande un changement de
 * contrat, hors du mandat HYGIÈNE-1.
 */

/**
 * UNE LIGNE de vente : un produit, sa quantité, ce qu'elle a rapporté.
 * C'est ce que porte `details` (et son alias `produits`) d'une transaction.
 *
 * `total` fait foi quand il est présent : il porte le montant réellement
 * convenu, qui ne retombe pas toujours sur `prix × quantite` (en FCFA, 500 F
 * pour 3 tas ne se divise pas juste).
 */
export interface LigneDeVente {
  nom?: string;
  /** Alias historique de `nom`, encore émis par certains chemins. */
  produit?: string;
  quantite?: number;
  /** Alias anglais, émis par d'anciens écrans. */
  quantity?: number;
  /** Prix unitaire de vente. */
  prix?: number;
  /** Alias : la voix écrit `prix_unitaire`. */
  prix_unitaire?: number;
  /** Montant EXACT de la ligne. Prioritaire sur `prix × quantite`. */
  total?: number;
  /** L'unité FIGÉE au moment de la vente (« tas », « kg »). Jamais relue du
   *  catalogue : le catalogue d'aujourd'hui ne dit pas ce qui a été vendu hier. */
  unite?: string;
  /** Coût unitaire. Absent ou 0 = coût INCONNU, ce qui n'est pas coût nul. */
  prix_achat?: number;
  prixAchat?: number;
  purchasePrice?: number;
  productId?: string;
  id?: string;
}

/**
 * UNE VENTE telle que le serveur la renvoie. Les champs sont optionnels parce
 * que le serveur en omet selon l'ancienneté de la ligne — les rendre
 * obligatoires mentirait sur ce qui arrive vraiment.
 */
export interface VenteServeur {
  id?: string;
  marchand_id?: string;
  user_id?: string;
  type?: string;
  montant?: number | string;
  /** Nom joint par le serveur quand la vente porte plusieurs produits
   *  (« Tomate, Banane ») — ce n'est PAS un article. */
  produit?: string;
  description?: string;
  /** LA CATÉGORIE DE DÉPENSE TOUCHÉE — DEP-02. Nom de la COLONNE (`category`,
   *  héritage du schéma) ; l'identifiant qu'elle porte est l'un des onze de
   *  `services/categorieDepense.ts`. Absente sur toutes les dépenses écrites
   *  avant le 22/09/2026, et sur les ventes — qui n'en ont pas. */
  category?: string;
  quantite?: number | string;
  mode_paiement?: string;
  notes?: string;
  /** D'où vient la vente : 'vocal' si la marchande l'a dictée, 'kassa' sinon. */
  source?: string;
  /** 'validee' | 'annulee' — une vente annulée ne compte dans aucun agrégat. */
  statut?: string;
  created_at?: string;
  date?: string;
  /** Les deux colonnes portent la MÊME valeur (cf. axe 3). */
  marge?: number | string | null;
  benefice?: number | string | null;
  prix_achat?: number | string | null;
  prix_vente?: number | string | null;
  details?: LigneDeVente[] | unknown;
  produits?: LigneDeVente[] | unknown;
}

/**
 * UN PRODUIT tel que le serveur le renvoie pour la caisse. Les nombres
 * arrivent parfois en chaîne (colonnes `decimal` de Postgres via TypeORM) :
 * le déclarer évite de croire qu'un `Number()` de plus est superflu.
 */
export interface ProduitServeur {
  id?: string;
  nom?: string;
  prix?: number | string;
  prix_achat?: number | string | null;
  prixAchat?: number | string | null;
  categorie?: string;
  stock?: number | string;
  unite?: string;
  image?: string | null;
  seuil_alerte?: number | string | null;
  date_peremption?: string | null;
  prix_promo?: number | string | null;
  promo_fin?: string | null;
}

/**
 * LA JOURNÉE DE CAISSE telle que le serveur la renvoie : ce qu'il y avait dans
 * la caisse le matin, ce qu'on y a compté le soir.
 */
export interface SessionCaisseServeur {
  id?: string;
  marchand_id?: string;
  date?: string;
  fond_initial?: number | string;
  ouvert?: boolean;
  heure_ouverture?: string;
  heure_fermeture?: string;
  notes?: string;
}

/** UN CRÉDIT tel que le serveur le renvoie (la vente à payer plus tard). */
export interface CreditServeur {
  id?: string;
  marchand_id?: string;
  client_nom?: string;
  client_phone?: string;
  montant_total?: number | string;
  acompte?: number | string;
  montant_restant?: number | string;
  echeance?: string;
  statut?: string;
  articles?: LigneDeVente[];
  notes?: string;
  paye_le?: string | null;
  transaction_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** LE STOCK tel que le serveur le renvoie : les décimales arrivent en chaîne. */
export interface StockServeur {
  id?: string;
  proprietaire_id?: string;
  produit?: string;
  quantite?: number | string;
  unite?: string;
  prix_unitaire?: number | string;
  prix?: number | string;
  seuil_alerte?: number | string | null;
  categorie?: string;
  image?: string | null;
  date_peremption?: string | null;
  updated_at?: string;
  created_at?: string;
}

/**
 * LES ALIAS QU'UN FORMULAIRE ENVOIE ENCORE.
 *
 * Les écrans de saisie n'ont jamais convergé sur une seule orthographe : le
 * même prix d'achat s'appelle `prix_achat`, `prixAchat` ou `purchasePrice`
 * selon l'écran. Le code les lisait via `(x as any).prixAchat` — un cast par
 * alias, une vingtaine en tout, TOUS sur des champs d'argent.
 *
 * Les déclarer ne les approuve pas : ça les rend visibles au compilateur, et
 * comptables. Les réduire à une seule orthographe demande de toucher aux
 * formulaires, ce que HYGIÈNE-1 s'interdit. C'est une dette nommée.
 */
export interface AliasSaisieProduit {
  nom?: string;
  categorie?: string;
  image?: string | null;
  prixVente?: number | string;
  prixAchat?: number | string;
  purchasePrice?: number | string;
  seuilAlerte?: number | string | null;
  threshold?: number | string | null;
  datePeremption?: string | null;
  prixPromo?: number | string | null;
  promoFin?: string | null;
  prix_achat?: number | string;
  seuil_alerte?: number | string | null;
  date_peremption?: string | null;
  prix_promo?: number | string | null;
  promo_fin?: string | null;
}
