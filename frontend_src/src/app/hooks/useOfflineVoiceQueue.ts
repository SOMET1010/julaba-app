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
  /** Propriétaire de la commande (terminal partagé, logout/login). Absent sur
   * les commandes créées avant ce champ (héritées) : une commande sans
   * `userId` n'appartient à PERSONNE — elle n'est JAMAIS adoptée par
   * l'utilisateur courant (ce serait rejouer une action potentiellement
   * financière sous un compte qui ne l'a pas prononcée). Elle reste dans la
   * file, intacte, jamais rejouée automatiquement. */
  userId?: string;
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
  onReplay: (cmd: OfflineCommand) => Promise<boolean>,
  /** Utilisateur actuellement connecté. Sans lui, on ne rejoue jamais rien :
   * un terminal partagé ne doit pas exécuter la file d'une autre marchande
   * pendant qu'on ignore encore qui est réellement connecté (cf. offlineCaisse). */
  currentUserId?: string,
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
    // Tant qu'on ne sait pas QUI est connecté, on ne touche à rien : mieux
    // vaut attendre que rejouer la file d'une autre marchande par erreur.
    if (!currentUserId) return;
    if (isOnline && queue.length > 0 && !replayRef.current) {
      replayRef.current = true;
      setIsReplaying(true);
      (async () => {
        const remaining: OfflineCommand[] = [];
        for (const cmd of queue) {
          // Propriétaire inconnu (commande héritée d'avant ce champ) : jamais
          // rejouée, jamais attribuée à l'utilisateur courant — l'identité
          // actuellement connectée n'est pas une preuve de qui l'a prononcée.
          // Reste intacte dans la file, consultable, en attente d'un
          // traitement manuel.
          if (!cmd.userId) { remaining.push(cmd); continue; }
          // Cloisonnement par utilisateur (terminal partagé, logout/login) :
          // une commande d'un AUTRE compte n'est jamais rejouée ici — elle
          // reste intacte dans la file, jamais perdue, jamais réattribuée.
          if (cmd.userId !== currentUserId) {
            remaining.push(cmd);
            continue;
          }
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
  }, [isOnline, queue.length, currentUserId]);

  // Ajouter une commande à la file
  const enqueue = useCallback((text: string, context: Record<string, unknown>) => {
    const cmd: OfflineCommand = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text,
      timestamp: Date.now(),
      context,
      retries: 0,
      userId: currentUserId,
    };
    setQueue(prev => {
      const next = [cmd, ...prev].slice(0, MAX_QUEUE);
      saveQueue(next);
      return next;
    });
    return cmd.id;
  }, [currentUserId]);

  // Vider la file. #7 : cible réellement le support persisté (localStorage) —
  // avant ce correctif, seul sessionStorage était vidé, jamais la vraie file.
  const clearQueue = useCallback(() => {
    setQueue([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // Compte visible par la marchande courante uniquement — jamais la file
  // d'une autre marchande, et jamais une commande orpheline (propriétaire
  // inconnu) comptée comme sienne par défaut.
  const pendingCount = currentUserId
    ? queue.filter(c => c.userId === currentUserId).length
    : 0;

  return {
    queue,
    isOnline,
    isReplaying,
    pendingCount,
    enqueue,
    clearQueue,
  };
}
