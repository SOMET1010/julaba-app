/**
 * WebSocketTransport.ts — Julaba
 * Transport Socket.IO compatible EventBus V2
 * Remplace BroadcastTransport quand WS disponible
 */
import { io, Socket } from "socket.io-client";
import { eventBus, EVENTS } from "./eventBus";

// Mapping events backend → EventBus frontend
const EVENT_MAP: Record<string, string> = {
  "transaction:created":       EVENTS.TRANSACTION_CREATED,
  "admin:transaction:created": EVENTS.TRANSACTION_CREATED,
  "wallet:updated":            EVENTS.WALLET_UPDATED,
  "admin:wallet:updated":      EVENTS.WALLET_UPDATED,
  "stock:updated":             EVENTS.STOCK_UPDATED,
  "user:created":              EVENTS.USER_CREATED,
  "admin:user:created":        EVENTS.USER_CREATED,
  "system:updated":            EVENTS.SYSTEM_UPDATED,
  "notification.new":          EVENTS.NOTIF_NEW,
};

export type WSStatus = "connecting" | "connected" | "disconnected" | "error";

type StatusCallback = (status: WSStatus) => void;
type MessageCallback = (event: string, payload: any, key: string) => void;

export class WebSocketTransport {
  private socket: Socket | null = null;
  private url: string;
  private token: string | null = null;
  private _onMessage: MessageCallback | null = null;
  private _onStatus: StatusCallback | null = null;
  private _connected = false;
  private _pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(url = (import.meta.env.VITE_WS_URL || ""), token?: string) {
    this.url = url;
    this.token = token || null;
  }

  connect() {
    if (this.socket?.connected) return;

    this._onStatus?.("connecting");

    this.socket = io(this.url + "/ws", {
      transports: ["websocket", "polling"],
      auth: this.token ? { token: this.token } : {},
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      this._connected = true;
      this._onStatus?.("connected");
      this._startPing();
    });

    this.socket.on("disconnect", (reason: string) => {
      this._connected = false;
      this._onStatus?.("disconnected");
      this._stopPing();
    });

    this.socket.on("connect_error", (err: Error) => {
      this._onStatus?.("error");
      console.warn("[WS] Erreur connexion:", err.message);
    });

    // Ecouter tous les events metier
    Object.keys(EVENT_MAP).forEach(wsEvent => {
      this.socket!.on(wsEvent, (payload: any) => {
        const busEvent = EVENT_MAP[wsEvent];
        const key = payload?._key || payload?.id || payload?._id || `${wsEvent}-${Date.now()}`;
        this._onMessage?.(busEvent, payload, key);
      });
    });

    // Pong
    this.socket.on("pong", () => {});
  }

  disconnect() {
    this._stopPing();
    this.socket?.disconnect();
    this.socket = null;
    this._connected = false;
  }

  send(event: string, payload: any, _key: string) {
    if (this.socket?.connected) {
      this.socket.emit(event, payload);
    }
  }

  onMessage(callback: MessageCallback) {
    this._onMessage = callback;
  }

  onStatus(callback: StatusCallback) {
    this._onStatus = callback;
  }

  isConnected() { return this._connected; }

  destroy() { this.disconnect(); }

  private _startPing() {
    this._pingInterval = setInterval(() => {
      this.socket?.emit("ping");
    }, 25000);
  }

  private _stopPing() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }
}

// ── Hook React d integration ──────────────────────────────────────────
import { useEffect, useRef, useState } from "react";

export type { StatusCallback };

export function useWebSocket(enabled = true) {
  const transportRef = useRef<WebSocketTransport | null>(null);
  const [status, setStatus] = useState<WSStatus>("disconnected");

  useEffect(() => {
    if (!enabled) return;

    const transport = new WebSocketTransport();

    transport.onStatus(setStatus);

    // Brancher sur eventBus — une seule ligne
    eventBus.useTransport(transport);

    transport.connect();
    transportRef.current = transport;

    return () => {
      transport.disconnect();
      transportRef.current = null;
    };
  }, [enabled]);

  return { status, isConnected: status === "connected" };
}
