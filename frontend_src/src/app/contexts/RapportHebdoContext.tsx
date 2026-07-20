import React, { createContext, useContext, useState, useCallback } from 'react';
import { playBase64Audio, stopAllAudio } from '../services/elevenlabs';

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
      const res = await fetch('/api/v1/rapport/hebdo', {
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
    stopAllAudio();
    playBase64Audio(rapport.audioBase64).catch(() => {});
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
