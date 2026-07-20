import { useApp } from './AppContext';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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


  const headers = () => ({ 'Content-Type': 'application/json' });

  const refresh = useCallback(async () => {
    if (!raccourcis?.length) setLoading(true);
    try {
      const res = await fetch('/api/v1/raccourcis', { credentials: 'include', headers: headers() });
      if (res.ok) setRaccourcis(await res.json());
    } catch (e) { void e; }
    setLoading(false);
  }, []);

  const { user: appUser } = useApp();
  useEffect(() => { if (appUser?.id) refresh(); }, [appUser?.id]);

  const creerRaccourci = useCallback(async (data: Omit<Raccourci, 'id' | 'actif'>) => {
    const res = await fetch('/api/v1/raccourcis', {
      method: 'POST', headers: headers(), body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.error) await refresh();
    return result;
  }, [refresh]);

  const supprimerRaccourci = useCallback(async (id: string) => {
    await fetch(`/api/v1/raccourcis/${id}`, { method: 'DELETE', credentials: 'include', headers: headers() });
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
