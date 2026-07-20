import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { JwtService } from "@nestjs/jwt";

@Injectable()
@WebSocketGateway({
  pingInterval: 25000,
  pingTimeout: 10000,
  cors: {
    origin: ["https://julaba.online", "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  },
  namespace: "/ws",
  transports: ["websocket", "polling"],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger("EventsGateway");
  private connectedClients = new Map<string, { userId: string; role: string; socketId: string }>();

  constructor(private jwtService: JwtService) {}

  afterInit() {
    this.logger.log("WebSocket Gateway initialise sur /ws");
  }

  async handleConnection(client: Socket) {
    try {
      // Auth via cookie ou handshake token
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "") ||
        this._extractCookieToken(client.handshake.headers?.cookie || "");

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      const role = payload.role || "user";

      this.connectedClients.set(client.id, { userId, role, socketId: client.id });
      client.data.userId = userId;
      client.data.role = role;

      // Rejoindre rooms
      client.join("all");
      client.join(`user:${userId}`);
      if (["admin", "super_admin", "admin_national", "operateur_terrain", "gestionnaire_zone", "operateur_terrain"].includes(role)) {
        client.join("admin");
      }

      client.emit("connected", { userId, role, timestamp: new Date().toISOString() });
      this.logger.log(`Client connecte: ${userId} (${role}) — ${this.connectedClients.size} total`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client deconnecte — ${this.connectedClients.size} restants`);
  }

  // ── Broadcast public ────────────────────────────────────────────
  broadcast(event: string, payload: any, room = "all") {
    const _key = payload?.id || payload?._id || randomUUID();
    this.server.to(room).emit(event, { ...payload, _ts: Date.now(), _key });
  }

  broadcastToUser(userId: string, event: string, payload: any) {
    const _key = payload?.id || payload?._id || randomUUID();
    this.server.to(`user:${userId}`).emit(event, { ...payload, _ts: Date.now(), _key });
  }

  broadcastToAdmins(event: string, payload: any) {
    const _key = payload?.id || payload?._id || randomUUID();
    this.server.to("admin").emit(event, { ...payload, _ts: Date.now(), _key });
  }

  // ── Events metier ───────────────────────────────────────────────
  emitTransactionCreated(data: any) {
    this.broadcast("transaction:created", data);
    this.broadcastToAdmins("admin:transaction:created", data);
  }

  emitWalletUpdated(userId: string, data: any) {
    this.broadcastToUser(userId, "wallet:updated", data);
    this.broadcastToAdmins("admin:wallet:updated", { userId, ...data });
  }

  emitStockUpdated(data: any) {
    this.broadcast("stock:updated", data);
  }

  emitUserCreated(data: any) {
    this.broadcastToAdmins("user:created", data);
  }

  emitSystemEvent(event: string, data: any) {
    this.broadcastToAdmins(event, data);
  }

  // ── Stats ───────────────────────────────────────────────────────
  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { ts: Date.now() });
  }

  @SubscribeMessage("getStats")
  handleGetStats(@ConnectedSocket() client: Socket) {
    const info = this.connectedClients.get(client.id) || client.data;
    if (info?.role && ["admin", "super_admin"].includes(info.role)) {
      client.emit("stats", { connections: this.connectedClients.size, timestamp: new Date().toISOString() });
    }
  }

  getConnectedCount() { return this.connectedClients.size; }

  private _extractCookieToken(cookieHeader: string): string | null {
    const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}
