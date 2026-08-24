/**
 * Vocabulaire d'unités CANONIQUE, partagé par tous les sélecteurs d'unité de l'app
 * (produit / stock marchand, coopérative, producteur).
 *
 * Avant, chaque écran redéfinissait sa propre liste : « régimes » vs « regimes »,
 * « L » vs « litre », pluriels « sacs » / « tonnes », « unité » vs « pièce »…
 * Résultat : une unité enregistrée sur un écran ne se re-sélectionnait pas sur un
 * autre et retombait en « Autre » (saisie libre). On unifie ici, une seule fois.
 *
 * NB : la saisie libre reste possible partout (SelectWithAutre / champ « Autre »),
 * donc cette liste ne restreint rien — aucune valeur existante n'est jamais perdue.
 *
 * ⚠️ Ne PAS confondre avec la table de conversion pondérale de RecolteForm
 * (kg/tonne/sac/tas… avec `facteur`), qui sert à normaliser une récolte en kg et
 * relève d'une logique métier distincte.
 */
export const UNITES_COURANTES: string[] = [
  'kg',
  'sac',
  'tonne',
  'tas',
  'régimes',
  'carton',
  'L',
  'pièce',
];
