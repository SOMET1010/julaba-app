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
import { UserRole } from "../users/entities/user.entity";

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

      // Rejoindre rooms.
      // C-14 (audit comptable 12/10) : la room « all » est une room de SIGNAL
      // uniquement (ex. stock:updated du marché) — elle ne doit JAMAIS recevoir
      // de données d'argent. Les événements d'argent partent dans des rooms
      // ciblées : le propriétaire dans SA room `user:<id>` (montant visible de
      // lui seul), les rôles BO dans « admin » avec une version anonymisée
      // (voir emitTransactionCreated).
      client.join("all");
      client.join(`user:${userId}`);
      // Room « admin » = flux de supervision BO. Rôles réels de UserRole
      // (users/entities/user.entity.ts:18-29) — le littéral fantôme 'admin'
      // (aucun compte de ce rôle en base) est retiré, admin_general (oublié)
      // est ajouté et le doublon operateur_terrain est dédoublonné
      // (M-01 / ADMINGEN-03). Aligné sur BO_ROLES (auth.service.ts:40).
      const ROLES_ADMIN_WS: readonly string[] = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_GENERAL,
        UserRole.ADMIN_NATIONAL,
        UserRole.GESTIONNAIRE_ZONE,
        UserRole.OPERATEUR_TERRAIN,
      ];
      if (ROLES_ADMIN_WS.includes(role as UserRole)) {
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
  // C-14 : PLUS AUCUN broadcast de données d'argent vers la room globale « all ».
  // Décision de routage :
  //  1) Le propriétaire de la transaction (data.userId / data.user_id, tel que
  //     émis par caisse-rest.controller) reçoit l'événement COMPLET — montant
  //     visible de lui seul — dans SA room `user:<id>` (rejointe à la connexion,
  //     authentification JWT du handshake : auth.token, header Authorization ou
  //     cookie access_token).
  //  2) Les rôles BO (room « admin », liste réelle ci-dessus) qui ont besoin
  //     d'un flux global reçoivent une version ANONYMISÉE (whitelist, sans
  //     montant ni user_id ni détails) : un signal « une transaction a eu lieu »
  //     qui sert de déclencheur de re-synchronisation (le BO re-tire ses
  //     données via l'API, qui applique ses propres autorisations).
  emitTransactionCreated(data: any) {
    const ownerId = data?.userId ?? data?.user_id ?? data?.user?.id;
    if (ownerId) {
      this.broadcastToUser(String(ownerId), "transaction:created", data);
    }
    this.broadcastToAdmins("admin:transaction:created", this._anonymiserTransaction(data));
  }

  // Version BO du flux transaction — whitelist stricte : on ne diffuse que ce
  // qui est nécessaire au compteur/signal, jamais le montant ni l'identité.
  private _anonymiserTransaction(data: any): Record<string, unknown> {
    const d = (data ?? {}) as Record<string, unknown>;
    const anon: Record<string, unknown> = { type: d.type, _anonymise: true };
    if (d.id ?? d._id) anon.id = d.id ?? d._id;
    if (d.statut ?? d.status) anon.statut = d.statut ?? d.status;
    if (d.created_at ?? d.date) anon.date = d.created_at ?? d.date;
    return anon;
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
    // Statistiques d'infrastructure WS (nombre de connexions) : supervision
    // NATIONALE uniquement. Le fantôme 'admin' est remplacé par les vrais rôles
    // d'administration (UserRole) — les rôles territoriaux/terrain
    // (gestionnaire_zone, operateur_terrain) n'ont pas à voir la métrique
    // globale (M-01 / ADMINGEN-03).
    const ROLES_STATS_WS: readonly string[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN_GENERAL,
      UserRole.ADMIN_NATIONAL,
    ];
    if (info?.role && ROLES_STATS_WS.includes(info.role)) {
      client.emit("stats", { connections: this.connectedClients.size, timestamp: new Date().toISOString() });
    }
  }

  getConnectedCount() { return this.connectedClients.size; }

  private _extractCookieToken(cookieHeader: string): string | null {
    const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}
