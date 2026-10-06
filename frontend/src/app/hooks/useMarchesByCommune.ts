import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../utils/api';

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
    fetch(`${API_URL}/marches?exclude_statut=en_attente`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!isMountedRef.current) return;
        if (Array.isArray(data)) {
          setAllMarches(data);
          if (commune) {
            setMarches(data.filter((m: MarcheItem) => m.commune === commune));
          } else {
            setMarches(data);
          }
        }
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
