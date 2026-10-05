/**
 * QUELLES VARIABLES SONT DE L'ARGENT — la déclaration, écrite une fois,
 * relue par un humain, jamais devinée à l'exécution.
 *
 * ── LE PROBLÈME QUE CE FICHIER RÉSOUT ─────────────────────────────────────
 *
 * Dans un gabarit, `{total}` est un NOMBRE NU. Le runtime ne peut pas savoir,
 * en le regardant, s'il compte des francs, des dɔrɔmɛ ou des tas de tomates.
 * Or « la synthèse doit partir d'une représentation structurée et non d'un
 * nombre nu » : il faut donc que quelqu'un l'ait DIT, et que ce soit écrit.
 *
 * C'est ici. Une entrée de cette table est une DÉCISION : « dans un message
 * critiqueArgent, la variable `total` compte des francs CFA. » Rien d'autre
 * ne confère cette unité, et surtout pas une heuristique sur le nom.
 *
 * ── CE QUI ARRIVE À UNE VARIABLE NON DÉCLARÉE ─────────────────────────────
 *
 * Elle est REFUSÉE pour la sortie vocale d'argent : `resoudreMontant` rend
 * une perte `UNIT_MISSING`, la forme parlée n'est pas produite, et le journal
 * d'argent l'écrit avec la clé, la variable et la valeur. Le message n'est
 * pas tu pour autant — la marchande entend encore sa phrase — mais le nombre
 * y garde sa forme écrite, et ce repli est NOMMÉ, jamais silencieux.
 *
 * Ajouter une variable d'argent, c'est donc ajouter une ligne ici. C'est le
 * point : on veut que ça se voie dans un diff.
 */
import type { UniteSemantique } from './enonceArgent';

/**
 * Les variables d'ARGENT des messages `critiqueArgent`, avec leur unité.
 * Toutes en francs CFA aujourd'hui : le pilote encaisse en espèces, et les
 * montants qui traversent le catalogue sont déjà convertis (`montantDorome`
 * est l'équivalent EN FRANCS d'un prix annoncé en dɔrɔmɛ — c'est ce que la
 * clé TATA_AMBIGUITE_DOROME dit à voix haute).
 */
export const UNITE_DES_VARIABLES: Readonly<Record<string, UniteSemantique>> = {
  total: 'franc_cfa',
  recu: 'franc_cfa',
  monnaie: 'franc_cfa',
  montant: 'franc_cfa',
  montantLigne: 'franc_cfa',
  totalPanier: 'franc_cfa',
  totalVentes: 'franc_cfa',
  prix: 'franc_cfa',
  prixUnitaire: 'franc_cfa',
  prixVente: 'franc_cfa',
  prixContreOffre: 'franc_cfa',
  nouveauPrix: 'franc_cfa',
  montantDorome: 'franc_cfa',
  ventes: 'franc_cfa',
  depenses: 'franc_cfa',
  caisse: 'franc_cfa',
  solde: 'franc_cfa',
  soldeActuel: 'franc_cfa',
  resultat: 'franc_cfa',
  reste: 'franc_cfa',
  remise: 'franc_cfa',
  revenuTotal: 'franc_cfa',
  totalValue: 'franc_cfa',
  selectedMontant: 'franc_cfa',
  fondRetenu: 'franc_cfa',
  price: 'franc_cfa',
};

/**
 * Les variables NUMÉRIQUES d'un message d'argent qui ne comptent PAS d'argent :
 * des choses, des fois, des points. Elles n'ont pas d'unité monétaire, mais
 * elles sont dites en toutes lettres comme le reste — « en sept ventes » —
 * pour qu'aucun groupe de chiffres ne parvienne au moteur de synthèse.
 */
export const VARIABLES_COMPTAGE: readonly string[] = [
  'quantite', 'qte', 'quantity', 'nombre', 'totalCount', 'points', 'pointsGagnes',
];

export type NatureVariable = 'argent' | 'comptage' | 'non_declaree';

/** Ce qu'on sait d'une variable — et `non_declaree` est une réponse, pas un trou. */
export function natureDeLaVariable(nom: string): NatureVariable {
  if (Object.prototype.hasOwnProperty.call(UNITE_DES_VARIABLES, nom)) return 'argent';
  return VARIABLES_COMPTAGE.includes(nom) ? 'comptage' : 'non_declaree';
}
