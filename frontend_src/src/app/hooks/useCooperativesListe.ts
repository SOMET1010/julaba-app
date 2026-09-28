import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../utils/api';
import { apiRequest } from '../services/api/api-client';

export interface CooperativeListeItem {
  id: string;
  nom: string;
  marche: string;
  commune: string;
  responsable_nom: string;
  fonction: string;
  contact: string;
}

export function useCooperativesListe() {
  const [cooperatives, setCooperatives] = useState<CooperativeListeItem[]>([]);
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
    apiRequest<CooperativeListeItem[]>(API_URL, '/cooperatives/liste', {
      signal: controller.signal,
    })
      .then(data => {
        if (!isMountedRef.current) return;
        if (Array.isArray(data)) setCooperatives(data);
      })
      .catch(e => {
        if (e?.name === 'AbortError') return;
        console.warn('[useCooperativesListe] failed:', e?.message);
      })
      .finally(() => { if (isMountedRef.current) setLoading(false); });
    return () => controller.abort();
  }, []);

  return { cooperatives, loading };
}
