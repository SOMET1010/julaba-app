import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../utils/api';
import { apiRequest } from '../services/api/api-client';

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
    // INIT-019 — passe par le client centralisé.
    apiRequest<MarcheItem[]>(API_URL, '/marches?exclude_statut=en_attente', {
      signal: controller.signal,
    })
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
      const data = await apiRequest<{ marche?: MarcheItem } | null>(API_URL, '/marches/suggestion', {
        method: 'POST',
        body: JSON.stringify({ nom, commune: communeValue }),
      });
      return data?.marche ?? null;
    } catch (e: any) {
      console.warn('[useMarchesByCommune] suggest failed:', e?.message);
      return null;
    }
  };

  return { marches, allMarches, loading, suggestMarche };
}
