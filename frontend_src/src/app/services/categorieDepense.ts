/**
 * LA CATÉGORIE D'UNE DÉPENSE — DEP-02.
 *
 * LE DÉFAUT, relevé par la recette terrain (matrice v1.0, MAR-DEP-001) :
 * « la catégorie de dépense n'est pas enregistrée ». Vérifié dans le code, et
 * c'est pire que ça.
 *
 * CE QUI SE PASSAIT. À l'écran 1 de la dépense, la marchande TOUCHE une
 * catégorie : « Taxe mairie », « Transports », « École »… Ce geste est le seul
 * qu'elle puisse faire sans lire. Son choix était aussitôt aplati dans le champ
 * `description` — le libellé français, rien d'autre — et l'identifiant partait
 * à la poubelle. Personne ne l'envoyait au serveur ; la colonne `category` de
 * `caisse_transactions` existait et restait vide.
 *
 * Puis, à l'écran des dépenses, `detectCat(description)` RECONSTRUISAIT la
 * catégorie en cherchant des mots-clés français dans le libellé. C'est
 * exactement ce que l'architecture de ce dépôt interdit : « toute information
 * qui a une incidence sur l'argent doit être soit conservée, soit explicitement
 * marquée comme perdue ; jamais reconstruite implicitement en aval. »
 *
 * ET LA RECONSTRUCTION SE TROMPAIT, sur les choix que l'écran propose lui-même :
 *
 *   elle touche « Taxe mairie »  → aucune règle ne connaît « taxe » → « Autre »
 *   elle touche « École »        → le mot « école » est un mot-clé de FAMILLE
 *                                  → sa dépense d'école devient « Famille »
 *
 * Deux des onze catégories offertes ne pouvaient donc PAS revenir telles
 * qu'elle les avait touchées. Une marchande qui note ses taxes pour savoir ce
 * que la mairie lui prend voit « Autre ».
 *
 * CE MODULE EST PUR. Il ne fait aucun appel, ne formate aucun montant : il
 * tient la LISTE (une seule, partagée par l'écran qui choisit et l'écran qui
 * affiche) et il répond à une question — quelle catégorie porte cette dépense.
 */

export type IdCategorieDepense =
  | 'transport' | 'repas' | 'taxe_mairie' | 'loyer' | 'famille' | 'tontine'
  | 'sante' | 'telephone' | 'marchandise' | 'ecole' | 'autre';

export interface CategorieDepense {
  readonly id: IdCategorieDepense;
  /** Ce qui s'affiche, et ce qui s'écrit dans `description` par défaut. */
  readonly libelle: string;
}

/**
 * LES ONZE CATÉGORIES, ET IL N'Y EN A PLUS QU'UNE LISTE.
 *
 * Elle était écrite DEUX FOIS : `QUICK_ACTIONS` + `OTHER_CATS` du formulaire
 * (onze entrées) et `CAT_RULES` + `CAT_AUTRE` de la liste (neuf). Deux listes
 * qui énumèrent la même chose finissent par diverger — ici, il manquait
 * « Taxe mairie » et « École » du côté qui affiche.
 */
export const CATEGORIES_DEPENSE: readonly CategorieDepense[] = [
  { id: 'transport',   libelle: 'Transports' },
  { id: 'repas',       libelle: 'Nourritures' },
  { id: 'taxe_mairie', libelle: 'Taxe mairie' },
  { id: 'loyer',       libelle: 'Loyer' },
  { id: 'famille',     libelle: 'Famille' },
  { id: 'tontine',     libelle: 'Tontine' },
  { id: 'sante',       libelle: 'Santé' },
  { id: 'telephone',   libelle: 'Téléphone' },
  { id: 'marchandise', libelle: 'Marchandise' },
  { id: 'ecole',       libelle: 'École' },
  { id: 'autre',       libelle: 'Autre' },
];

const PAR_ID = new Map(CATEGORIES_DEPENSE.map(c => [c.id, c]));

/** L'identifiant est-il l'un des onze ? Une chaîne venue du serveur n'est pas
 *  crue sur parole : elle est VÉRIFIÉE contre la liste. */
export function estIdCategorie(valeur: unknown): valeur is IdCategorieDepense {
  return typeof valeur === 'string' && PAR_ID.has(valeur as IdCategorieDepense);
}

export function categorieParId(id: IdCategorieDepense): CategorieDepense {
  return PAR_ID.get(id)!;
}

/** Le libellé par défaut d'une catégorie touchée — ce qui part dans `description`
 *  quand la marchande n'a rien dicté d'autre. */
export function libelleParId(id: IdCategorieDepense): string {
  return categorieParId(id).libelle;
}

/** La forme minimale d'une dépense telle que l'API la rend. */
export interface DepenseLue {
  /** La colonne `category` de `caisse_transactions`. Vide sur toutes les
   *  dépenses enregistrées AVANT DEP-02 : elles n'ont jamais eu de catégorie. */
  readonly category?: unknown;
  readonly categorie?: unknown;
}

export type CategorieLue =
  /** Elle l'a touchée, on l'a gardée, on la rend. */
  | { readonly connue: true; readonly id: IdCategorieDepense; readonly libelle: string }
  /**
   * PERSONNE NE L'A NOTÉE, ET ON LE DIT.
   *
   * C'est la moitié de la règle qu'on applique ici : « soit conservée, soit
   * explicitement marquée comme perdue ». Les dépenses écrites avant ce
   * correctif n'ont pas de catégorie, et rien ne permet de la retrouver : le
   * libellé français n'est pas une catégorie, c'est du texte.
   *
   * ET SURTOUT PAS « Autre ». « Autre » est un CHOIX que la marchande peut
   * faire — lui donner aussi le sens de « on ne sait pas » serait donner deux
   * sens à la même donnée, ce que ce dépôt refuse partout ailleurs.
   */
  | { readonly connue: false; readonly libelle: 'Catégorie pas notée' };

export const LIBELLE_SANS_CATEGORIE = 'Catégorie pas notée';

/**
 * LA CATÉGORIE D'UNE DÉPENSE — LUE, JAMAIS DEVINÉE.
 *
 * On ne regarde QUE ce qui a été enregistré. Pas le libellé, pas les mots
 * qu'il contient, pas l'heure, pas le montant : la catégorie est une décision
 * de la marchande, et une décision ne se déduit pas.
 */
export function categorieDeLaDepense(depense: DepenseLue | null | undefined): CategorieLue {
  const brut = depense?.category ?? depense?.categorie;
  if (!estIdCategorie(brut)) return { connue: false, libelle: LIBELLE_SANS_CATEGORIE };
  return { connue: true, id: brut, libelle: libelleParId(brut) };
}
