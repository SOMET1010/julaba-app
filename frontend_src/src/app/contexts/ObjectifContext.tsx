import { useApp } from './AppContext';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { speakChunked } from '../services/elevenlabs';

interface ObjectifState {
  objectif: number;
  alerte50: boolean;
  alerte80: boolean;
  date: string;
}

interface ObjectifContextType {
  objectif: number;
  progression: number; // 0-100
  setObjectif: (montant: number) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const ObjectifContext = createContext<ObjectifContextType | null>(null);

export function ObjectifProvider({ children, ventes }: { children: React.ReactNode; ventes: number }) {
  const [state, setState] = useState<ObjectifState>({ objectif: 0, alerte50: false, alerte80: false, date: '' });
  const [loading, setLoading] = useState(false);
  const ventesRef = useRef(ventes);
  ventesRef.current = ventes;


  const headers = () => ({ 'Content-Type': 'application/json' });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/objectifs/today', { credentials: 'include', headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (e) { void e; }
  }, []);

  const { user: appUser } = useApp();
  useEffect(() => { if (appUser?.id) refresh(); }, [appUser?.id]);

  // Vérifier alertes à chaque changement de ventes
  useEffect(() => {
    if (!state.objectif || state.objectif === 0) return;
    const pct = (ventes / state.objectif) * 100;

    if (pct >= 50 && pct < 80 && !state.alerte50) {
      speakChunked(`Félicitations ! Tu as atteint 50% de ton objectif. Continue ma chère, tu es sur la bonne voie !`);
      setState(s => ({ ...s, alerte50: true }));
      fetch('/api/v1/objectifs/alerte', { method: 'PATCH', credentials: 'include', headers: headers(), body: JSON.stringify({ alerte50: true }) });
    }

    if (pct >= 80 && !state.alerte80) {
      speakChunked(`Bravo ! Tu es à 80% de ton objectif. Plus que ${Math.round(state.objectif - ventes).toLocaleString('fr-FR')} FCFA, allez courage !`);
      setState(s => ({ ...s, alerte80: true }));
      fetch('/api/v1/objectifs/alerte', { method: 'PATCH', credentials: 'include', headers: headers(), body: JSON.stringify({ alerte80: true }) });
    }

    if (pct >= 100 && state.alerte80) {
      speakChunked(`Incroyable ! Tu as atteint ton objectif du jour ! Tu es trop forte ma chère !`);
    }
  }, [ventes, state.objectif]);

  const setObjectif = useCallback(async (montant: number) => {
    if (!state.objectif) setLoading(true);
    try {
      const res = await fetch('/api/v1/objectifs/today', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ objectif: montant }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        speakChunked(`Super ! Ton objectif du jour est fixé à ${montant.toLocaleString('fr-FR')} FCFA. Bonne chance ma chère !`);
      }
    } catch (e) { void e; }
    setLoading(false);
  }, []);

  const progression = state.objectif > 0 ? Math.min((ventes / state.objectif) * 100, 100) : 0;

  return (
    <ObjectifContext.Provider value={{ objectif: state.objectif, progression, setObjectif, refresh, loading }}>
      {children}
    </ObjectifContext.Provider>
  );
}

export function useObjectif() {
  const ctx = useContext(ObjectifContext);
  if (!ctx) return { objectif: 0, progression: 0, setObjectif: async () => {}, refresh: async () => {}, loading: false };
  return ctx;
}
