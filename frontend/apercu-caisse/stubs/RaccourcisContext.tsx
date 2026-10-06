/** STUB de RaccourcisContext pour l'APERÇU VISUEL de la caisse (lot F). */
import React, { type ReactNode } from 'react';

export type RaccourciActionType = 'vendre' | 'depense' | 'stock' | 'autre';
export interface RaccourciAction { type: RaccourciActionType; produit?: string; montant?: number; quantite?: number; description?: string; }
export interface Raccourci { id: string; nom: string; declencheur: string; type: string; action: RaccourciAction | null; actif: boolean; }

const valeur = {
  raccourcis: [] as Raccourci[], loading: false, refresh: async () => {},
  creerRaccourci: async () => ({ id: '', nom: '', declencheur: '', type: '', action: null, actif: false }),
  supprimerRaccourci: async () => {}, matchRaccourci: () => null,
};

export function RaccourcisProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
export function useRaccourcis() { return valeur; }
