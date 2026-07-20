import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../utils/api';

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
    fetch(`${API_URL}/cooperatives/liste`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : [])
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
