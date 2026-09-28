import { useApp } from './AppContext';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/api';
import { apiRequest, HttpError } from '../services/api/api-client';

// Types d'actions vocales supportées
export type RaccourciActionType = 'vendre' | 'depense' | 'stock' | 'autre';

export interface RaccourciAction {
  type: RaccourciActionType;
  produit?: string;
  montant?: number;
  quantite?: number;
  description?: string;
}

export interface Raccourci {
  id: string;
  nom: string;
  declencheur: string;
  type: string;
  action: RaccourciAction | null;
  actif: boolean;
}

interface RaccourcisContextType {
  raccourcis: Raccourci[];
  loading: boolean;
  refresh: () => Promise<void>;
  creerRaccourci: (data: Omit<Raccourci, 'id' | 'actif'>) => Promise<Raccourci & { error?: string }>;
  supprimerRaccourci: (id: string) => Promise<void>;
  matchRaccourci: (texte: string) => Raccourci | null;
}

const RaccourcisContext = createContext<RaccourcisContextType | null>(null);

export function RaccourcisProvider({ children }: { children: React.ReactNode }) {
  const [raccourcis, setRaccourcis] = useState<Raccourci[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!raccourcis?.length) setLoading(true);
    try {
      // INIT-019 — passe par le client centralisé.
      const data = await apiRequest<Raccourci[]>(API_URL, '/raccourcis');
      setRaccourcis(data);
    } catch (e) { void e; }
    setLoading(false);
  }, []);

  const { user: appUser } = useApp();
  useEffect(() => { if (appUser?.id) refresh(); }, [appUser?.id]);

  const creerRaccourci = useCallback(async (data: Omit<Raccourci, 'id' | 'actif'>) => {
    try {
      const result = await apiRequest<Raccourci & { error?: string }>(API_URL, '/raccourcis', {
        method: 'POST', body: JSON.stringify(data),
      });
      if (!result.error) await refresh();
      return result;
    } catch (err) {
      // INIT-019 — on préserve la signature d'origine (renvoi un objet).
      if (err instanceof HttpError) return { error: err.message } as Raccourci & { error?: string };
      throw err;
    }
  }, [refresh]);

  const supprimerRaccourci = useCallback(async (id: string) => {
    await apiRequest<unknown>(API_URL, `/raccourcis/${id}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  const matchRaccourci = useCallback((texte: string): Raccourci | null => {
    const lower = texte.toLowerCase();
    return raccourcis.find(r => lower.includes(r.declencheur.toLowerCase())) || null;
  }, [raccourcis]);

  return (
    <RaccourcisContext.Provider value={{ raccourcis, loading, refresh, creerRaccourci, supprimerRaccourci, matchRaccourci }}>
      {children}
    </RaccourcisContext.Provider>
  );
}

export function useRaccourcis() {
  const ctx = useContext(RaccourcisContext);
  if (!ctx) throw new Error('useRaccourcis must be used within RaccourcisProvider');
  return ctx;
}
