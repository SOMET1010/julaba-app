import React, { createContext, useContext, useState, useCallback } from 'react';
import * as audioManager from '../services/audioManager';
import { API_URL } from '../utils/api';

export interface RapportHebdo {
  semaine: { debut: string; fin: string };
  ventes: number;
  depenses: number;
  ventesSemainePrecedente: number;
  evolution: number;
  meilleurJour: { date: string; montant: number; nom: string } | null;
  ventesParJour: Record<string, number>;
  objectifsAtteints: number;
  totalObjectifs: number;
  rapportVocal: string;
  audioBase64: string;
}

interface RapportHebdoContextType {
  rapport: RapportHebdo | null;
  loading: boolean;
  fetchRapport: () => Promise<void>;
  playRapport: () => void;
}

const RapportHebdoContext = createContext<RapportHebdoContextType | null>(null);

export function RapportHebdoProvider({ children }: { children: React.ReactNode }) {
  const [rapport, setRapport] = useState<RapportHebdo | null>(null);
  const [loading, setLoading] = useState(false);



  const fetchRapport = useCallback(async () => {
    if (!rapport) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rapport/hebdo`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setRapport(data);
      }
    } catch (e) { void e; }
    setLoading(false);
  }, []);

  const playRapport = useCallback(() => {
    if (!rapport?.audioBase64) return;
    // Le chef d'orchestre coupe déjà tout (voix + clips) avant de jouer.
    audioManager.playClip({ base64: rapport.audioBase64 }, { priority: 'user' }).catch(() => {});
  }, [rapport]);

  return (
    <RapportHebdoContext.Provider value={{ rapport, loading, fetchRapport, playRapport }}>
      {children}
    </RapportHebdoContext.Provider>
  );
}

export function useRapportHebdo() {
  const ctx = useContext(RapportHebdoContext);
  if (!ctx) throw new Error('useRapportHebdo must be used within RapportHebdoProvider');
  return ctx;
}
