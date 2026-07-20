export type SousProfilMarchand = 'grossiste' | 'demi_grossiste' | 'detaillant';

export const SOUS_PROFILS_MARCHAND: { value: SousProfilMarchand; label: string }[] = [
  { value: 'grossiste', label: 'Grossiste' },
  { value: 'demi_grossiste', label: 'Demi-grossiste' },
  { value: 'detaillant', label: 'Détaillant' },
];
