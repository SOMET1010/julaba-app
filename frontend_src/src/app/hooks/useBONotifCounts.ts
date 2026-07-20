import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../utils/api';

export interface BONotifCounts {
  total: number;
  par_category: Record<string, number>;
}

const POLL_INTERVAL = 30000;

export function useBONotifCounts(enabled: boolean) {
  const [counts, setCounts] = useState<BONotifCounts>({
    total: 0,
    par_category: {},
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchCounts = useCallback(async () => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`${API_URL}/notifications/bo/counts`, {
        credentials: 'include',
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (isMountedRef.current) {
        setCounts({
          total: data.total ?? 0,
          par_category: data.par_category ?? {},
        });
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.warn('[useBONotifCounts] failed:', e?.message);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void fetchCounts();
    intervalRef.current = setInterval(() => void fetchCounts(), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [enabled, fetchCounts]);

  const markCategoryRead = useCallback((category: string) => {
    setCounts(prev => {
      const next = { ...prev.par_category };
      const removed = next[category] ?? 0;
      delete next[category];
      return { total: Math.max(0, prev.total - removed), par_category: next };
    });
  }, []);

  return { counts, fetchCounts, markCategoryRead };
}
