/**
 * eventLogger.ts — Julaba Event Audit Logger
 * Ring buffer in-memory (1000 events) + persist localStorage
 */

export interface EventLog {
  id: string;
  event: string;
  payload: any;
  priority: string;
  source: string;
  timestamp: number;
  isoTime: string;
}

const RING_SIZE = 1000;
const PERSIST_KEY = "julaba-event-logs";
const PERSIST_MAX = 200;

class EventLogger {
  private buffer: EventLog[] = [];
  private cursor = 0;
  private total = 0;
  private persist = false;

  constructor() {
    try {
      const saved = localStorage.getItem(PERSIST_KEY);
      if (saved) this.buffer = JSON.parse(saved).slice(-RING_SIZE);
    } catch (e) { console.error(e); }
  }

  enablePersist(on = true) { this.persist = on; }

  add(entry: Omit<EventLog, "id" | "isoTime">) {
    const log: EventLog = {
      ...entry,
      id: `${entry.timestamp}-${Math.random().toString(36).slice(2, 7)}`,
      isoTime: new Date(entry.timestamp).toISOString(),
    };

    if (this.buffer.length < RING_SIZE) {
      this.buffer.push(log);
    } else {
      this.buffer[this.cursor] = log;
      this.cursor = (this.cursor + 1) % RING_SIZE;
    }
    this.total++;

    if (this.persist && this.total % 10 === 0) {
      try {
        const recent = this.getLogs(PERSIST_MAX);
        localStorage.setItem(PERSIST_KEY, JSON.stringify(recent));
      } catch (e) { console.error(e); }
    }
  }

  getLogs(limit = 100, filters?: { event?: string; priority?: string; source?: string; search?: string }): EventLog[] {
    const sorted = [...this.buffer].sort((a, b) => b.timestamp - a.timestamp);
    const filtered = filters ? sorted.filter(l => {
      if (filters.event && !l.event.includes(filters.event)) return false;
      if (filters.priority && l.priority !== filters.priority) return false;
      if (filters.source && l.source !== filters.source) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const inEvent = l.event.toLowerCase().includes(s);
        const inPayload = JSON.stringify(l.payload || {}).toLowerCase().includes(s);
        if (!inEvent && !inPayload) return false;
      }
      return true;
    }) : sorted;
    return filtered.slice(0, limit);
  }

  clearLogs() {
    this.buffer = [];
    this.cursor = 0;
    this.total = 0;
    try { localStorage.removeItem(PERSIST_KEY); } catch (e) { console.error(e); }
  }

  exportLogs(): string {
    return JSON.stringify(this.getLogs(RING_SIZE), null, 2);
  }

  getStats() {
    const byEvent: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    this.buffer.forEach(l => {
      byEvent[l.event] = (byEvent[l.event] || 0) + 1;
      byPriority[l.priority] = (byPriority[l.priority] || 0) + 1;
    });
    return { total: this.total, buffered: this.buffer.length, byEvent, byPriority };
  }
}

export const eventLogger = new EventLogger();
