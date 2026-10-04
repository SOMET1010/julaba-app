/**
 * VOCABULAIRE D'UNITÉS — une seule orthographe, plusieurs sélections.
 *
 * CE QUI ÉTAIT MESURÉ AVANT CE LOT : 7 listes séparées, 12 libellés pour
 * 10 unités réelles — parce que deux unités existaient en DEUX orthographes
 * (« régimes »/« régime », « unité »/« unite »), plus un synonyme
 * (« pièce »/« unité »). Conséquence concrète : `SelectWithAutre` compare par
 * égalité STRICTE (`options.includes(value)`), donc une unité choisie en caisse
 * retombait en « Autre » dans Gestion du stock.
 *
 * CE QU'ON NE FUSIONNE PAS, ET C'EST VOLONTAIRE. La caisse et les formulaires
 * n'offrent pas la même chose, et ce n'est pas une duplication : la caisse est
 * une rangée de gros boutons pour une marchande qui ne lit pas (6 unités de
 * marché), les formulaires stock/coopérative/producteur couvrent un éventail
 * plus large (tonne, carton, litre). Aplatir les deux ferait apparaître
 * « tonne » en caisse — une régression terrain.
 *
 * Ce qui est unifié, c'est l'ORTHOGRAPHE. Un seul dictionnaire ci-dessous ;
 * chaque écran y puise.
 *
 * NB : la saisie libre reste possible partout (`SelectWithAutre`, `ChoixUnite`),
 * donc ce vocabulaire ne restreint rien — aucune valeur déjà enregistrée n'est
 * perdue. Il dit ce qu'on PROPOSE, pas ce qu'on accepte.
 *
 * ⚠️ Ne PAS confondre avec la table de conversion pondérale de `RecolteForm`
 * (kg/tonne/sac/tas… avec `facteur`), qui relève d'une logique métier distincte
 * et porte sa propre dette (facteur global au lieu d'être par produit).
 */

/** Dictionnaire — la SEULE orthographe autorisée de chaque unité. */
export const UNITES = {
  KG: 'kg',
  SAC: 'sac',
  TONNE: 'tonne',
  TAS: 'tas',
  // SINGULIER : `dialoguesTata.ts` met au pluriel pour la parole. Stocker le
  // pluriel donnait « 3 régimess ». Avant ce lot, la caisse disait « régime »
  // et les formulaires « régimes » — ils ne se rencontraient jamais.
  REGIME: 'régime',
  CARTON: 'carton',
  LITRE: 'L',
  // « unité » et non « pièce » : 3 des 4 endroits qui écrivaient ce concept
  // employaient déjà « unité » (caisse, défaut backend de la caisse, message
  // parlé « unités »). Seule `UNITES_COURANTES` disait « pièce ».
  UNITE: 'unité',
  BASSINE: 'bassine',
} as const;

export type UniteJulaba = (typeof UNITES)[keyof typeof UNITES];

/** Formulaires stock / coopérative / producteur — éventail large. */
export const UNITES_COURANTES: string[] = [
  UNITES.KG, UNITES.SAC, UNITES.TONNE, UNITES.TAS,
  UNITES.REGIME, UNITES.CARTON, UNITES.LITRE, UNITES.UNITE,
];

/** Caisse — ce par quoi une marchande vend, en gros boutons. */
export const UNITES_CAISSE: readonly string[] = [
  UNITES.UNITE, UNITES.TAS, UNITES.KG, UNITES.SAC, UNITES.BASSINE, UNITES.REGIME,
] as const;
