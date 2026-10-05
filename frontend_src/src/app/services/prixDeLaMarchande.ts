/**
 * LE PRIX APPARTIENT À LA MARCHANDE — STK-02.
 *
 * LE DÉFAUT, trouvé en préparant la fiche de terrain du 22/09. L'écran
 * « nouveau produit » pose un prix d'achat ET un prix de vente que la
 * marchande n'a jamais donnés. Ils viennent de `data/catalogue-produits.ts`,
 * écrits en dur : Tomate 300/400, Aubergine 700/800, Piment 100/150.
 *
 * TROIS CHEMINS, ET LE TROISIÈME EST LE PIRE.
 *
 *   1. LA TUILE-PHOTO. Elle touche la photo, tout se remplit — y compris les
 *      deux prix. Un agent qui valide sans regarder lui pose les prix de
 *      quelqu'un d'autre.
 *
 *   2. LA SUGGESTION DE NOM. Même chose au clic, et la liste AFFICHE en plus
 *      le prix comme s'il s'agissait d'une information sur le produit.
 *
 *   3. L'AJOUT À LA VOIX. Le code disait lui-même ce qu'il faisait :
 *      « Nouveau produit -> création (prix dit, SINON PRIX DU CATALOGUE) ».
 *      Elle dit « ajoute dix kilos de tomate » sans prix ; l'application
 *      écrit 400 F, puis le lui ANNONCE : « C'est fait ! 10 kg de Tomate à
 *      400 francs, ajoutés au stock. » Pour une marchande qui ne lit pas, la
 *      voix EST la confirmation. Elle entend un prix qu'elle n'a jamais dit,
 *      énoncé comme un fait accompli.
 *
 * POURQUOI C'EST PIRE QU'UN FAUX ZÉRO. Un zéro se remarque — « 0 F » saute
 * aux yeux et à l'oreille. 400 F ne se remarque pas : c'est un prix
 * plausible. Et une fois écrit, il devient la base de chaque vente, de chaque
 * marge, de chaque bilan. La caisse entière se calcule sur un chiffre que
 * personne n'a choisi.
 *
 * LA RÈGLE. Un catalogue sait ce qu'est un produit — son nom, sa photo, son
 * unité, sa famille. Il ne sait pas ce qu'ELLE le vend. Le prix ne se déduit
 * jamais d'un catalogue : il vient d'elle, ou il n'existe pas encore.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */

/** Ce qu'une entrée de catalogue porte. Les prix y sont déclarés — ce module
 *  existe précisément pour qu'on cesse de les lire. */
export interface EntreeCatalogue {
  readonly nom: string;
  readonly unite?: string;
  readonly categorie?: string;
  readonly image?: string;
  readonly prixAchat?: number;
  readonly prixVente?: number;
}

/**
 * Ce qu'une tuile de catalogue a le droit de poser dans le formulaire.
 *
 * LES PRIX SONT REMIS À VIDE, ET C'EST DÉLIBÉRÉ — pas simplement « non
 * remplis ». Sans cette remise à zéro, toucher « Tomate » puis « Piment »
 * laisserait le prix de la Tomate sur le Piment : le formulaire garde ses
 * champs entre deux tuiles. Le défaut deviendrait plus difficile à voir, pas
 * moins présent.
 *
 * `''` et non `0` : un champ vide se voit, un zéro s'entérine. Et le
 * formulaire refuse déjà un prix de vente nul — elle DOIT donc le saisir.
 */
export interface ChampsDeTuile {
  readonly name: string;
  readonly image: string;
  readonly unit: string;
  readonly category: string;
  readonly purchasePrice: '';
  readonly salePrice: '';
}

export function champsDepuisTuile(p: EntreeCatalogue): ChampsDeTuile {
  return {
    name: p.nom,
    image: p.image ?? '',
    unit: p.unite ?? 'kg',
    category: p.categorie ?? 'autre',
    purchasePrice: '',
    salePrice: '',
  };
}

/**
 * LE PRIX D'UN PRODUIT AJOUTÉ À LA VOIX.
 *
 * `0` quand elle n'a rien dit — et zéro, ici, veut dire « pas encore de
 * prix », un état que l'écran et la voix savent déjà nommer (« Dis-moi son
 * prix quand tu veux »). Ce n'est pas un montant affirmé : c'est l'absence de
 * montant, et elle est dite.
 *
 * Ce que cette fonction ne fait PAS, et c'est tout son objet : elle ne prend
 * aucun deuxième argument. Il n'existe aucun moyen de lui passer un prix de
 * catalogue en repli.
 */
export function prixDicte(valeurDite: unknown): number {
  const n = Number(valeurDite);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Vrai quand le prix vient d'elle. C'est la seule condition pour qu'une
 *  phrase de confirmation ait le droit de citer un montant. */
export function prixVientDelle(prix: number): boolean {
  return prix > 0;
}
