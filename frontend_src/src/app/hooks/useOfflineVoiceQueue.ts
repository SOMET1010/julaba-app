/**
 * useOfflineVoiceQueue — File d'attente des commandes vocales hors-ligne
 * Stocke les commandes quand le réseau est absent
 * Les rejoue automatiquement à la reconnexion
 */
import { useState, useEffect, useRef, useCallback } from "react";

export interface OfflineCommand {
  id: string;
  text: string;
  timestamp: number;
  context: Record<string, unknown>;
  retries: number;
}

const STORAGE_KEY = "julaba_offline_voice_queue";
const MAX_QUEUE = 20;
const MAX_RETRIES = 3;

// #7 : localStorage (durable) au lieu de sessionStorage (perdu à la fermeture de
// l'onglet — exactement quand la vendeuse perd le réseau et ferme l'appli).
function loadQueue(): OfflineCommand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQueue(queue: OfflineCommand[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUE))); } catch (e) { void e; }
}

export function useOfflineVoiceQueue(
  onReplay: (cmd: OfflineCommand) => Promise<boolean>
) {
  const [queue, setQueue] = useState<OfflineCommand[]>(loadQueue);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayRef = useRef(false);

  // Surveillance réseau
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Rejouer la file à la reconnexion
  useEffect(() => {
    if (isOnline && queue.length > 0 && !replayRef.current) {
      replayRef.current = true;
      setIsReplaying(true);
      (async () => {
        const remaining: OfflineCommand[] = [];
        for (const cmd of queue) {
          // #9 : après 3 échecs, on ne RETENTE plus, mais on ne JETTE plus en
          // silence : la commande reste dans la file (visible en "en attente")
          // au lieu de disparaître sans que la vendeuse le sache.
          if (cmd.retries >= MAX_RETRIES) { remaining.push(cmd); continue; }
          try {
            const success = await onReplay(cmd);
            if (!success) {
              remaining.push({ ...cmd, retries: cmd.retries + 1 });
            }
            // Délai entre commandes pour ne pas spammer
            await new Promise(r => setTimeout(r, 800));
          } catch {
            remaining.push({ ...cmd, retries: cmd.retries + 1 });
          }
        }
        setQueue(remaining);
        saveQueue(remaining);
        setIsReplaying(false);
        replayRef.current = false;
      })();
    }
  }, [isOnline, queue.length]);

  // Ajouter une commande à la file
  const enqueue = useCallback((text: string, context: Record<string, unknown>) => {
    const cmd: OfflineCommand = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text,
      timestamp: Date.now(),
      context,
      retries: 0,
    };
    setQueue(prev => {
      const next = [cmd, ...prev].slice(0, MAX_QUEUE);
      saveQueue(next);
      return next;
    });
    return cmd.id;
  }, []);

  // Vider la file
  const clearQueue = useCallback(() => {
    setQueue([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    queue,
    isOnline,
    isReplaying,
    pendingCount: queue.length,
    enqueue,
    clearQueue,
  };
}
