import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../utils/api';
import { fetchMarchesPublics } from '../services/api/marches-api';

export interface MarcheItem {
  id: string;
  nom: string;
  commune: string;
  statut: string;
  responsable_nom?: string;
  responsable_contact?: string;
}

export function useMarchesByCommune(commune?: string) {
  const [marches, setMarches] = useState<MarcheItem[]>([]);
  const [allMarches, setAllMarches] = useState<MarcheItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchMarchesPublics(controller.signal)
      .then(liste => {
        if (!isMountedRef.current) return;
        const data = liste as MarcheItem[];
        setAllMarches(data);
        setMarches(commune ? data.filter(m => m.commune === commune) : data);
      })
      .catch(e => {
        if (e?.name === 'AbortError') return;
        console.warn('[useMarchesByCommune] failed:', e?.message);
      })
      .finally(() => { if (isMountedRef.current) setLoading(false); });
    return () => controller.abort();
  }, [commune]);

  const suggestMarche = async (nom: string, communeValue: string): Promise<MarcheItem | null> => {
    try {
      const res = await fetch(`${API_URL}/marches/suggestion`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, commune: communeValue }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.marche ?? null;
    } catch (e: any) {
      console.warn('[useMarchesByCommune] suggest failed:', e?.message);
      return null;
    }
  };

  return { marches, allMarches, loading, suggestMarche };
}
