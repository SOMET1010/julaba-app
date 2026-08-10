/**
 * eventReplayBuffer.ts — Julaba Event Replay
 * Conserve 30s d events pour resync / debug
 */

import { eventBus } from "./eventBus";

interface BufferedEvent {
  event: string;
  payload: any;
  timestamp: number;
  priority: string;
}

const BUFFER_TTL = 30_000;
const BUFFER_MAX = 500;

class EventReplayBuffer {
  private buffer: BufferedEvent[] = [];

  add(entry: BufferedEvent) {
    this.buffer.push(entry);
    if (this.buffer.length > BUFFER_MAX) this.buffer.shift();
    // Purge TTL
    const cutoff = Date.now() - BUFFER_TTL;
    this.buffer = this.buffer.filter(e => e.timestamp >= cutoff);
  }

  getBuffer(): BufferedEvent[] {
    return [...this.buffer];
  }

  replayAll(silent = true) {
    this.buffer.forEach(e => {
      eventBus.emit(e.event, e.payload, { silent, priority: e.priority as any, source: "local" });
    });
    return this.buffer.length;
  }

  replayLastN(n: number, silent = true) {
    const slice = this.buffer.slice(-n);
    slice.forEach(e => {
      eventBus.emit(e.event, e.payload, { silent, priority: e.priority as any, source: "local" });
    });
    return slice.length;
  }

  replayFrom(timestamp: number, silent = true) {
    const slice = this.buffer.filter(e => e.timestamp >= timestamp);
    slice.forEach(e => {
      eventBus.emit(e.event, e.payload, { silent, priority: e.priority as any, source: "local" });
    });
    return slice.length;
  }

  replayByType(eventType: string, silent = true) {
    const slice = this.buffer.filter(e => e.event === eventType);
    slice.forEach(e => {
      eventBus.emit(e.event, e.payload, { silent, priority: e.priority as any, source: "local" });
    });
    return slice.length;
  }

  clear() { this.buffer = []; }

  size() { return this.buffer.length; }
}

export const replayBuffer = new EventReplayBuffer();
