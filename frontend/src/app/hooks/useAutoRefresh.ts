import { useEffect, useRef, useCallback } from "react";

interface AutoRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
  onRefresh: () => Promise<void>;
  debugLabel?: string;
  visibilityAware?: boolean;
}

export function useAutoRefresh({
  intervalMs = 4000,
  enabled = true,
  onRefresh,
  debugLabel = "unknown",
  visibilityAware = true,
}: AutoRefreshOptions): { forceRefresh: () => Promise<void> } {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);

  const doRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    if (!enabled) return;
    if (visibilityAware && document.hidden) return;
    if (!navigator.onLine) return;
    isRefreshingRef.current = true;
    const t0 = performance.now();
    try {
      await onRefresh();
      const ms = Math.round(performance.now() - t0);
      if (ms > 2000) void ms;
    } catch (e) {
      void e;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefresh, enabled, debugLabel, visibilityAware]);

  useEffect(() => {
    if (!enabled) return;
    intervalRef.current = setInterval(doRefresh, intervalMs);
    const handleViz = () => { if (!document.hidden && visibilityAware) doRefresh(); };
    if (visibilityAware) document.addEventListener("visibilitychange", handleViz);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (visibilityAware) document.removeEventListener("visibilitychange", handleViz);
    };
  }, [enabled, intervalMs, doRefresh, visibilityAware, debugLabel]);

  return { forceRefresh: doRefresh };
}
