/**
 * Billets et pièces FCFA (inclusion — docs/INCLUSION.md §2.2). Module PUR.
 *
 * « Le montant reçu en billets, pas en chiffres » : à l'encaissement, la
 * marchande touche les coupures qu'elle vient de recevoir — le geste réel du
 * marché — au lieu de déchiffrer et taper « 12 500 ». Ce module décrit les
 * coupures (valeur, forme, couleur approchée du vrai billet) et décompose une
 * somme (la monnaie à rendre) en coupures concrètes.
 */

export interface Coupure {
  valeur: number;
  forme: 'billet' | 'piece';
  /** Couleur dominante approchée de la vraie coupure (repère visuel, pas une reproduction). */
  couleur: string;
  /** Couleur du texte lisible sur ce fond. */
  encre: string;
}

/** Coupures proposées à l'encaissement (billets puis pièces, décroissant). */
export const COUPURES: Coupure[] = [
  { valeur: 10000, forme: 'billet', couleur: '#7B5AA6', encre: '#FFFFFF' }, // violet
  { valeur: 5000,  forme: 'billet', couleur: '#3E7CB1', encre: '#FFFFFF' }, // bleu-vert
  { valeur: 2000,  forme: 'billet', couleur: '#2E8B6F', encre: '#FFFFFF' }, // vert
  { valeur: 1000,  forme: 'billet', couleur: '#B0503C', encre: '#FFFFFF' }, // rouge-brun
  { valeur: 500,   forme: 'billet', couleur: '#C98A2D', encre: '#FFFFFF' }, // ocre
  { valeur: 250,   forme: 'piece',  couleur: '#C9B037', encre: '#4A3A10' }, // dorée
  { valeur: 200,   forme: 'piece',  couleur: '#BFC5CC', encre: '#3A4148' }, // argentée
  { valeur: 100,   forme: 'piece',  couleur: '#BFC5CC', encre: '#3A4148' },
  { valeur: 50,    forme: 'piece',  couleur: '#BFC5CC', encre: '#3A4148' },
  { valeur: 25,    forme: 'piece',  couleur: '#C9B037', encre: '#4A3A10' },
];

/** Valeurs utilisées pour DÉCOMPOSER la monnaie à rendre (système canonique : le
 *  glouton est correct ; le 250, non canonique avec 200+50, en est exclu). */
const VALEURS_MONNAIE = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5];

export interface LigneMonnaie { valeur: number; nb: number; }

/**
 * Décompose un montant en coupures concrètes à rendre (glouton, du plus grand
 * au plus petit). `reste` > 0 si le montant ne tombe pas sur les coupures
 * (en pratique les prix Julaba sont ronds ; le reste est affiché tel quel).
 */
export function decomposerMonnaie(montant: number): { lignes: LigneMonnaie[]; reste: number } {
  const lignes: LigneMonnaie[] = [];
  let reste = Math.max(0, Math.floor(montant));
  for (const v of VALEURS_MONNAIE) {
    if (reste < v) continue;
    const nb = Math.floor(reste / v);
    lignes.push({ valeur: v, nb });
    reste -= nb * v;
  }
  return { lignes, reste };
}

/** « 10 000 » — format d'affichage des coupures et montants. */
export function formatF(montant: number): string {
  return montant.toLocaleString('fr-FR');
}

/** « dix mille francs » à dire à voix haute pour une coupure touchée. */
export function direCoupure(valeur: number): string {
  const noms: Record<number, string> = {
    10000: 'dix mille', 5000: 'cinq mille', 2000: 'deux mille', 1000: 'mille',
    500: 'cinq cents', 250: 'deux cent cinquante', 200: 'deux cents',
    100: 'cent', 50: 'cinquante', 25: 'vingt-cinq',
  };
  return `${noms[valeur] ?? formatF(valeur)} francs`;
}
