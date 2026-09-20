/** STUB d'ObjectifContext pour l'APERÇU VISUEL de la caisse (lot F). */
import React, { type ReactNode } from 'react';

const valeur = { objectif: 20000, progression: 62, setObjectif: async () => {}, refresh: async () => {}, loading: false };

export function ObjectifProvider({ children }: { children: ReactNode; ventes: number }) { return <>{children}</>; }
export function useObjectif() { return valeur; }
