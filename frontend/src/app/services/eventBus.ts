/**
 * eventBus.ts V2 — Julaba
 * Idempotence + Priorites + Batching + Multi-onglets + WebSocket-ready
 */

import { eventLogger } from "./eventLogger";
import { replayBuffer } from "./eventReplayBuffer";

// ── Types ────────────────────────────────────────────────────────────
type EventCallback = (payload?: any) => void;
type Priority = "high" | "medium" | "low";

interface EmitOptions {
  idempotencyKey?: string;
  priority?: Priority;
  silent?: boolean;
  source?: "local" | "remote";
}

interface EventTransport {
  send(event: string, payload: any, key: string): void;
  onMessage(callback: (event: string, payload: any, key: string) => void): void;
  destroy(): void;
}

interface BusStats {
  emitted: number;
  deduplicated: number;
  batched: number;
  listeners: number;
}

// ── Constantes ───────────────────────────────────────────────────────
const IDEMPOTENCY_TTL = 10_000;
const BATCH_DELAY: Record<Priority, number> = { high: 0, medium: 150, low: 400 };
const CLEANUP_INTERVAL = 15_000;

// ── Transport BroadcastChannel ────────────────────────────────────────
class BroadcastTransport implements EventTransport {
  private channel: BroadcastChannel | null = null;
  private cb: ((e: string, p: any, k: string) => void) | null = null;

  constructor() {
    try {
      this.channel = new BroadcastChannel("julaba-events-v2");
      this.channel.onmessage = (msg) => {
        if (this.cb && msg.data?.event) {
          this.cb(msg.data.event, msg.data.payload, msg.data.key);
        }
      };
    } catch {
      this.channel = null;
    }
  }

  send(event: string, payload: any, key: string) {
    try { this.channel?.postMessage({ event, payload, key }); } catch (e) { console.error(e); }
  }

  onMessage(callback: (e: string, p: any, k: string) => void) {
    this.cb = callback;
  }

  // ── Replay API ──────────────────────────────────────────────────────
  replayEvents() { return replayBuffer.replayAll(); }
  replayLastN(n: number) { return replayBuffer.replayLastN(n); }
  replayFrom(ts: number) { return replayBuffer.replayFrom(ts); }
  replayByType(type: string) { return replayBuffer.replayByType(type); }
  getLogs(limit?: number, filters?: any) { return eventLogger.getLogs(limit, filters); }
  getLogStats() { return eventLogger.getStats(); }
  exportLogs() { return eventLogger.exportLogs(); }

  destroy() {
    try { this.channel?.close(); } catch (e) { console.error(e); }
  }
}

// Fallback localStorage si BroadcastChannel absent
class LocalStorageTransport implements EventTransport {
  private cb: ((e: string, p: any, k: string) => void) | null = null;
  private handler: ((e: StorageEvent) => void) | null = null;

  constructor() {
    this.handler = (e: StorageEvent) => {
      if (e.key === "julaba-bus-v2" && e.newValue && this.cb) {
        try {
          const { event, payload, key } = JSON.parse(e.newValue);
          this.cb(event, payload, key);
        } catch (e) { console.error(e); }
      }
    };
    window.addEventListener("storage", this.handler);
  }

  send(event: string, payload: any, key: string) {
    try {
      localStorage.setItem("julaba-bus-v2", JSON.stringify({ event, payload, key, t: Date.now() }));
    } catch (e) { console.error(e); }
  }

  onMessage(cb: (e: string, p: any, k: string) => void) { this.cb = cb; }

  // ── Replay API ──────────────────────────────────────────────────────
  replayEvents() { return replayBuffer.replayAll(); }
  replayLastN(n: number) { return replayBuffer.replayLastN(n); }
  replayFrom(ts: number) { return replayBuffer.replayFrom(ts); }
  replayByType(type: string) { return replayBuffer.replayByType(type); }
  getLogs(limit?: number, filters?: any) { return eventLogger.getLogs(limit, filters); }
  getLogStats() { return eventLogger.getStats(); }
  exportLogs() { return eventLogger.exportLogs(); }

  destroy() {
    if (this.handler) window.removeEventListener("storage", this.handler);
  }
}

// WebSocket transport placeholder
class WebSocketTransport implements EventTransport {
  send(_e: string, _p: any, _k: string) {}
  onMessage(_cb: any) {}
  // ── Replay API ──────────────────────────────────────────────────────
  replayEvents() { return replayBuffer.replayAll(); }
  replayLastN(n: number) { return replayBuffer.replayLastN(n); }
  replayFrom(ts: number) { return replayBuffer.replayFrom(ts); }
  replayByType(type: string) { return replayBuffer.replayByType(type); }
  getLogs(limit?: number, filters?: any) { return eventLogger.getLogs(limit, filters); }
  getLogStats() { return eventLogger.getStats(); }
  exportLogs() { return eventLogger.exportLogs(); }

  destroy() {}
}

// ── Core EventBus V2 ─────────────────────────────────────────────────
class EventBusV2 {
  private listeners = new Map<string, Set<EventCallback>>();
  private processed = new Map<string, number>();
  private batchQueues = new Map<string, { payload: any; timer: ReturnType<typeof setTimeout> }>();
  private batchListeners = new Map<string, Set<EventCallback>>();
  private transport: EventTransport;
  private stats: BusStats = { emitted: 0, deduplicated: 0, batched: 0, listeners: 0 };
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    // Choisir le meilleur transport disponible
    const hasBroadcast = typeof BroadcastChannel !== "undefined";
    this.transport = hasBroadcast ? new BroadcastTransport() : new LocalStorageTransport();

    // Recevoir evenements des autres onglets
    this.transport.onMessage((event, payload, key) => {
      this._dispatch(event, payload, key, "remote");
    });

    // Nettoyage periodique idempotency cache
    this.cleanupTimer = setInterval(() => this._cleanup(), CLEANUP_INTERVAL);
  }

  // ── emit ─────────────────────────────────────────────────────────
  emit(event: string, payload?: any, options: EmitOptions = {}) {
    const { idempotencyKey, priority = "medium", silent = false, source = "local" } = options;
    const key = idempotencyKey || `${event}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Deduplication (seulement pour evenements locaux)
    if (source === "local" && idempotencyKey) {
      if (this._isDuplicate(key)) {
        this.stats.deduplicated++;
        return;
      }
      this._markProcessed(key);
    }

    this.stats.emitted++;

    // Logger + replay buffer
    const logEntry = { event, payload, priority, source, timestamp: Date.now() };
    eventLogger.add(logEntry);
    replayBuffer.add(logEntry);

    // Broadcast vers autres onglets
    if (!silent && source === "local") {
      this.transport.send(event, payload, key);
    }

    // Dispatch selon priorite
    if (priority === "high") {
      this._dispatch(event, payload, key, source);
    } else {
      const delay = BATCH_DELAY[priority];
      setTimeout(() => this._dispatch(event, payload, key, source), delay);
    }
  }

  // ── subscribe ────────────────────────────────────────────────────
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    this.stats.listeners++;

    // Wildcard "*"
    if (!this.listeners.has("*")) this.listeners.set("*", new Set());

    return () => this.unsubscribe(event, callback);
  }

  // ── subscribeBatch ───────────────────────────────────────────────
  // Un seul callback declenche apres debounce si un des events arrive
  subscribeBatch(events: string[], callback: EventCallback, debounceMs = 300): () => void {
    const batchKey = events.join("|");
    if (!this.batchListeners.has(batchKey)) this.batchListeners.set(batchKey, new Set());
    this.batchListeners.get(batchKey)!.add(callback);

    const unsubs = events.map(event =>
      this.subscribe(event, (payload) => {
        const existing = this.batchQueues.get(batchKey);
        if (existing) clearTimeout(existing.timer);
        const timer = setTimeout(() => {
          const cbs = this.batchListeners.get(batchKey);
          if (cbs) cbs.forEach(cb => { try { cb(payload); } catch (e) { console.error(e); } });
          this.batchQueues.delete(batchKey);
          this.stats.batched++;
        }, debounceMs);
        this.batchQueues.set(batchKey, { payload, timer });
      })
    );

    return () => {
      unsubs.forEach(fn => fn());
      this.batchListeners.get(batchKey)?.delete(callback);
      const q = this.batchQueues.get(batchKey);
      if (q) { clearTimeout(q.timer); this.batchQueues.delete(batchKey); }
    };
  }

  // ── once ─────────────────────────────────────────────────────────
  once(event: string, callback: EventCallback) {
    const unsub = this.subscribe(event, (payload) => { callback(payload); unsub(); });
  }

  // ── unsubscribe ──────────────────────────────────────────────────
  unsubscribe(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
    if (this.stats.listeners > 0) this.stats.listeners--;
  }

  // ── getStats (debug) ─────────────────────────────────────────────
  getStats(): BusStats & { processed: number; queued: number } {
    return { ...this.stats, processed: this.processed.size, queued: this.batchQueues.size };
  }

  // ── useTransport (WebSocket upgrade) ─────────────────────────────
  useTransport(transport: EventTransport) {
    this.transport.destroy();
    this.transport = transport;
    this.transport.onMessage((event, payload, key) => {
      this._dispatch(event, payload, key, "remote");
    });
  }

  // ── Prive ────────────────────────────────────────────────────────
  private _dispatch(event: string, payload: any, _key: string, source: string) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => { try { cb(payload); } catch (e) { console.error(e); } });
    const all = this.listeners.get("*");
    if (all) all.forEach(cb => { try { cb({ event, payload, source }); } catch (e) { console.error(e); } });
  }

  private _isDuplicate(key: string): boolean {
    const ts = this.processed.get(key);
    return ts !== undefined && Date.now() - ts < IDEMPOTENCY_TTL;
  }

  private _markProcessed(key: string) {
    this.processed.set(key, Date.now());
  }

  private _cleanup() {
    const now = Date.now();
    this.processed.forEach((ts, key) => {
      if (now - ts > IDEMPOTENCY_TTL) this.processed.delete(key);
    });
  }

  // ── Replay API ──────────────────────────────────────────────────────
  replayEvents() { return replayBuffer.replayAll(); }
  replayLastN(n: number) { return replayBuffer.replayLastN(n); }
  replayFrom(ts: number) { return replayBuffer.replayFrom(ts); }
  replayByType(type: string) { return replayBuffer.replayByType(type); }
  getLogs(limit?: number, filters?: any) { return eventLogger.getLogs(limit, filters); }
  getLogStats() { return eventLogger.getStats(); }
  exportLogs() { return eventLogger.exportLogs(); }

  destroy() {
    clearInterval(this.cleanupTimer);
    this.transport.destroy();
    this.listeners.clear();
    this.batchQueues.forEach(q => clearTimeout(q.timer));
    this.batchQueues.clear();
  }
}

// ── Singleton global ─────────────────────────────────────────────────
export const eventBus = new EventBusV2();

// ── Evenements standardises ──────────────────────────────────────────
export const EVENTS = {
  TRANSACTION_CREATED: "transaction:created",
  TRANSACTION_UPDATED: "transaction:updated",
  WALLET_UPDATED:      "wallet:updated",
  STOCK_UPDATED:       "stock:updated",
  STOCK_CREATED:       "stock:created",
  STOCK_DELETED:       "stock:deleted",
  ORDER_CREATED:       "order:created",
  ORDER_UPDATED:       "order:updated",
  USER_CREATED:        "user:created",
  USER_UPDATED:        "user:updated",
  PRODUCT_CREATED:     "product:created",
  PRODUCT_UPDATED:     "product:updated",
  PRODUCT_DELETED:     "product:deleted",
  CAISSE_VENTE:        "caisse:vente",
  NOTIF_NEW:           "notif:new",
  SYSTEM_UPDATED:      "system:updated",
} as const;

export type JulabaEvent = typeof EVENTS[keyof typeof EVENTS];
export type { EmitOptions, EventTransport, Priority };
export { WebSocketTransport };
