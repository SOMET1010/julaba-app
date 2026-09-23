/**
 * L'ÉTAL DE LA MARCHANDE — STK-03.
 *
 * STK-02 avait posé la règle sur l'écran « nouveau produit » : le prix vient
 * d'elle, ou il n'existe pas encore. Le panneau « Toucher les produits », lui,
 * continuait d'afficher les 37 tuiles écrites en dur et de poser LEUR prix :
 * toucher « Tomate » écrivait 400 F et verrouillait le champ.
 *
 * ET LE NOM MENTAIT AUSSI. 21 de ces 37 tuiles couvrent plusieurs références
 * du référentiel maître. « Igname » en couvre neuf : Kponan, Bêtê-Bêtê,
 * Florido, Krenglè, Lokpa, Assawa… Quatre variétés, quatre prix, une seule
 * tuile. Le prix de la marchande se décidait sur un nom approximatif.
 *
 * LA RÈGLE, arbitrage de Patrick du 23/09 : « La caisse montre l'étal
 * personnel de la marchande, pas un catalogue générique. » Elle vend huit,
 * douze, quinze produits — les SIENS, à SES prix, dans SES unités.
 *
 * CE QUE CE MODULE NE FAIT PAS, ET NE FERA JAMAIS : aucune famille, aucune
 * sous-famille, aucun domaine. Une femme du marché ne navigue pas dans une
 * taxonomie ; elle connaît son étal. Le rattachement au référentiel est notre
 * travail, fait ailleurs, sans elle.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */

/** Un produit tel que SON étal le porte (`CaisseProduct`, réduit au nécessaire). */
export interface ProduitDeLEtal {
  readonly id: string;
  readonly nom: string;
  /** SON prix de vente. C'est elle qui l'a posé. */
  readonly prix: number;
  readonly unite?: string;
  readonly image?: string;
}

/** Ce qu'une tuile de SON étal porte — tout vient d'elle, rien d'un catalogue. */
export interface TuileDeLEtal {
  readonly id: string;
  readonly nom: string;
  readonly prix: number;
  readonly unite: string;
  readonly image: string;
}

/**
 * Les tuiles que la saisie guidée a le droit de montrer.
 *
 * UN PRODUIT SANS PRIX D'ELLE N'A PAS DE TUILE, et ce n'est pas un oubli :
 * une tuile sert à vendre EN UN TOUCHER, donc à poser un prix. Sans prix, il
 * n'y a rien à poser — et le combler avec un prix de catalogue est exactement
 * la faute qu'on ferme. Le produit n'est pas effacé pour autant : elle le
 * retrouve par la saisie libre, où elle donne son prix.
 *
 * L'ÉTAL VIDE REND UNE LISTE VIDE, et c'est la bonne réponse. On ne comble
 * jamais le vide avec les 37 tuiles : un écran qui montre des produits qu'elle
 * ne vend pas, à des prix qu'elle n'a pas choisis, ment deux fois.
 */
export function tuilesDeLEtal(etal: readonly ProduitDeLEtal[]): TuileDeLEtal[] {
  return etal
    .filter(p => p.nom.trim().length > 0 && Number.isFinite(p.prix) && p.prix > 0)
    .map(p => ({
      id: p.id,
      nom: p.nom,
      prix: p.prix,
      // Son unité, jamais un « kg » de repli : un tas n'est pas un kilo, et
      // l'écart se paie sur son argent.
      unite: p.unite?.trim() || 'unité',
      image: p.image ?? '',
    }));
}

/** Le prix que pose un toucher. Il sort de la tuile, donc d'elle. */
export function prixDeLaTuile(tuile: TuileDeLEtal): number {
  return tuile.prix;
}

/**
 * CE QUE LE PANNEAU MONTRE — son étal, ou la question du premier produit.
 *
 * LE TROU QUE CETTE RÈGLE FERME. Retirer les 37 tuiles était juste ; laisser à
 * leur place une grille vide et un lien souligné « Pas dans la liste ? » ne
 * l'est pas. Une marchande qui ne lit pas y trouvait une surface blanche et
 * aucun geste — un écran vide qui ne dit pas quoi faire est plus dur qu'un
 * écran faux : le faux, au moins, se corrige.
 *
 * UN ÉTAL VIDE N'EST PAS UNE PANNE, c'est un premier jour. L'écran le traite
 * comme tel : il pose la question et donne le geste.
 */
export type VueEtal =
  /** Elle a des produits : on montre les siens. */
  | { readonly type: 'etal'; readonly tuiles: TuileDeLEtal[] }
  /** Elle n'en a pas encore : on demande le premier, on ne montre pas du vide. */
  | { readonly type: 'premier-produit' };

export function vueDeLEtal(etal: readonly ProduitDeLEtal[]): VueEtal {
  const tuiles = tuilesDeLEtal(etal);
  return tuiles.length > 0 ? { type: 'etal', tuiles } : { type: 'premier-produit' };
}
