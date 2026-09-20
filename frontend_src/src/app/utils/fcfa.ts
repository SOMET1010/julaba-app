import { lexique, t } from '../i18n/voice/runtime';
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

/**
 * Hauteur du billet dessiné, en pixels.
 *
 * Les vraies coupures XOF ne font pas toutes la même taille : plus la valeur
 * est forte, plus le billet est grand. Une marchande qui ne lit pas s'appuie
 * sur ce repère tous les jours, en même temps que la couleur. Un rectangle de
 * taille unique avec un nombre écrit dessus lui demande, elle, de LIRE.
 *
 * On reproduit donc l'échelle, pas le dessin. Plancher à 46 px : jamais en
 * dessous de la cible tactile de 44 px (règle du dépôt).
 */
export function hauteurBillet(valeur: number): number {
  switch (valeur) {
    case 10000: return 62;
    case 5000: return 58;
    case 2000: return 54;
    case 1000: return 50;
    default: return 46;
  }
}

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
  // Les noms des coupures sont du LEXIQUE de la langue (i18n/voice/locales/
  // fr-ci/lexicon.ts, monnaie.coupures) et « francs » reste celui de
  // config/devise.ts, lu par le gabarit TATA_MONTANT_DEVISE (« {montant} {devise} »).
  const nom = lexique().monnaie.coupures[valeur] ?? formatF(valeur);
  return t('TATA_MONTANT_DEVISE', { montant: nom });
}
