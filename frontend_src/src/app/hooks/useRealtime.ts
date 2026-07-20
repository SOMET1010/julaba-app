/**
 * useRealtime.ts — Polling intelligent backoffice Julaba
 * Interval adaptatif : 5s actif / 30s idle
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { eventBus, EVENTS } from '../services/eventBus';

const API = '/api/v1';

export interface RealtimeStats {
  total_acteurs: number;
  total_transactions: number;
  transactions_heure: number;
  total_cooperatives: number;
  montant_total: number;
  nouveaux_acteurs_semaine: number;
  utilisateurs_actifs: number;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  label: string;
  detail: string;
  timestamp: string;
  color: string;
  acteurNom?: string;
  acteurRole?: string;
  userId?: string;
  zoneId?: string;
  zoneNom?: string;
  montant?: number;
  reference?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  db: { status: string; latency_ms: number };
  api: { status: string; transactions_last_hour: number; errors_last_hour: number };
  uptime_seconds: number;
}

export interface TimelinePoint {
  time: string;
  transactions: number;
  volume: number;
}

export interface RealtimeState {
  stats: RealtimeStats | null;
  activity: ActivityEvent[];
  health: SystemHealth | null;
  timeline: TimelinePoint[];
  loading: boolean;
  connected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

const ACTIVE_INTERVAL = 30000;
const IDLE_INTERVAL = 30000;
const ACTIVITY_MAX = 50;

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { credentials: 'include' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export function useRealtime(enabled = true) {
  const [state, setState] = useState<RealtimeState>({
    stats: null, activity: [], health: null,
    timeline: [], loading: true, connected: false, lastUpdate: null, error: null,
  });

  const isIdle = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [stats, activity, health, timeline] = await Promise.allSettled([
        apiFetch<RealtimeStats>('/admin/stats'),
        apiFetch<ActivityEvent[]>('/admin/activity?limit=50'),
        apiFetch<SystemHealth>('/admin/health'),
        apiFetch<TimelinePoint[]>('/admin/timeline'),
      ]);

      setState(prev => {
        const newEvents: ActivityEvent[] = activity.status === 'fulfilled' ? activity.value : [];
        const existingIds = new Set(prev.activity.map((e: ActivityEvent) => e.id));
        const merged = [
          ...newEvents.filter((e: ActivityEvent) => !existingIds.has(e.id)),
          ...prev.activity,
        ]
          .sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            const safeA = Number.isNaN(timeA) ? -Infinity : timeA;
            const safeB = Number.isNaN(timeB) ? -Infinity : timeB;
            return safeB - safeA;
          })
          .slice(0, ACTIVITY_MAX);

        return {
          stats: stats.status === 'fulfilled' ? stats.value : prev.stats,
          activity: merged,
          health: health.status === 'fulfilled' ? health.value : prev.health,
          timeline: timeline.status === 'fulfilled' ? timeline.value : prev.timeline,
          loading: false,
          connected: true,
          lastUpdate: new Date(),
          error: null,
        };
      });
    } catch (e) {
      setState(prev => ({
        ...prev,
        loading: false,
        connected: false,
        error: e instanceof Error ? e.message : 'Erreur réseau',
      }));
    }
  }, []);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const interval = isIdle.current ? IDLE_INTERVAL : ACTIVE_INTERVAL;
    timerRef.current = setTimeout(async () => {
      await fetchAll();
      schedule();
    }, interval);
  }, [fetchAll]);

  useEffect(() => {
    const onVisibility = () => {
      isIdle.current = document.hidden;
      if (!document.hidden) { fetchAll(); schedule(); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchAll, schedule]);

  useEffect(() => {
    if (!enabled) return;
    fetchAll();
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [enabled, fetchAll, schedule]);

  // Batch refresh sur evenements critiques (anti-spam)
  useEffect(() => {
    if (!enabled) return;
    const unsub = eventBus.subscribeBatch(
      [EVENTS.TRANSACTION_CREATED, EVENTS.CAISSE_VENTE, EVENTS.USER_CREATED, EVENTS.STOCK_CREATED],
      async () => {
        try {
          const stats = await apiFetch<RealtimeStats>('/admin/stats');
          setState(prev => ({ ...prev, stats, connected: true, lastUpdate: new Date(), error: null }));
        } catch { /* silencieux */ }
      },
      500
    );
    return unsub;
  }, [enabled, fetchAll]);

  return { ...state, refresh: fetchAll };
}
