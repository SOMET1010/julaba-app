import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, IsNull } from "typeorm";
import { Notification } from "./notifications.entity";
import { User } from "../users/entities/user.entity";
import { PushService } from './push.service';
import { EventsGateway } from "../events/events.gateway";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly pushService: PushService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private async isNotifAllowed(userId: string, prefKey: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return false;
    const prefs = (user as any).preferences || {};
    if (typeof prefs[prefKey] === 'boolean') return prefs[prefKey];
    return true;
  }

  async findAll(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId, deletedAt: null as any },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async countUnreadByCategory(userId: string): Promise<{ category: string; count: string }[]> {
    return this.repo.query(
      `SELECT category, COUNT(*) as count
       FROM notifications
       WHERE user_id = $1
         AND is_read = false
         AND deleted_at IS NULL
         AND category IS NOT NULL
       GROUP BY category`,
      [userId],
    );
  }

  async sendToAdmins(data: {
    type: string;
    titre: string;
    message: string;
    category: string;
    priority?: string;
    metadata?: any;
  }): Promise<void> {
    const admins = await this.userRepo.find({
      where: [
        { role: 'super_admin' as any },
        { role: 'admin_general' as any },
        { role: 'admin_national' as any },
      ],
    });
    await Promise.allSettled(
      admins.map(admin =>
        this.create({
          userId: admin.id,
          type: data.type,
          titre: data.titre,
          message: data.message,
          priority: data.priority || 'medium',
          category: data.category,
          metadata: data.metadata,
        }),
      ),
    );
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const notif = this.repo.create(data);
    const saved = await this.repo.save(notif);
    if (saved.userId) {
      this.pushService.sendToUser(saved.userId, {
        title: saved.titre,
        body: saved.message,
        tag: saved.type,
        notifId: saved.id,
      }).catch((e: any) => this.logger.warn(`[PUSH] Échec envoi push userId=${saved.userId}: ${e?.message}`));
    }
    if (saved.userId) {
      try {
        this.eventsGateway.server?.to(`user:${saved.userId}`).emit("notification.new", saved);
      } catch (error) {
        this.logger.error('socket notification emit failed', error instanceof Error ? error.stack : String(error));
      }
    }
    return saved;
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    await this.repo.update({ id, userId }, { isRead: true });
    return this.repo.findOne({ where: { id, userId } });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ deletedAt: () => 'NOW()' } as any)
      .where('id = :id AND user_id = :userId', { id, userId })
      .execute();
  }

  async findDeleted(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId, deletedAt: Not(IsNull()) as any },
      order: { createdAt: "DESC" },
      take: 50,
      withDeleted: true,
    });
  }

  async restore(id: string, userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ deletedAt: null } as any)
      .where('id = :id AND user_id = :userId', { id, userId })
      .execute();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }

  // Notification automatique stock faible
  async notifyLowStock(userId: string, produit: string, quantite: number): Promise<void> {
    if (!await this.isNotifAllowed(userId, 'notif_stock_faible')) return;
    await this.create({
      userId,
      type: "stock_faible",
      titre: "Stock faible",
      message: `Ton stock de ${produit} est bas (${quantite} restants). Pense à réapprovisionner !`,
      priority: "high",
      category: "stock",
      icon: "📦",
    });
  }

  // Notification vente réussie
  async notifyVente(userId: string, montant: number, produit: string): Promise<void> {
    if (!await this.isNotifAllowed(userId, 'notif_paiements')) return;
    await this.create({
      userId,
      type: "vente",
      titre: "Vente enregistrée",
      message: `Vente de ${produit} pour ${montant.toLocaleString("fr-FR")} FCFA enregistrée avec succès !`,
      priority: "low",
      category: "caisse",
      icon: "✅",
    });
  }

  // ─── ENVOI UNIVERSEL depuis BackOffice ───────────────────────

  // Envoyer à un utilisateur spécifique (par userId)
  async sendToUser(userId: string, data: {
    type: string; titre: string; message: string;
    priority?: string; category?: string; icon?: string; metadata?: any;
  }): Promise<Notification> {
    return this.create({ ...data, userId, priority: data.priority || 'medium' });
  }

  // Envoyer à tous les utilisateurs d'un rôle
  async sendToRole(role: string, data: {
    type: string; titre: string; message: string;
    priority?: string; category?: string; icon?: string; metadata?: any;
  }, userRepo: any): Promise<void> {
    const users = await userRepo.find({ where: { role } });
    for (const user of users) {
      await this.create({ ...data, userId: user.id, priority: data.priority || 'medium', role });
    }
    this.logger.log(`[NOTIF] Envoyé à ${users.length} utilisateurs (role: ${role})`);
  }

  // Envoyer à une liste explicite d'utilisateurs (cibles résolues par l'appelant)
  async sendToUserIds(userIds: string[], data: {
    type: string; titre: string; message: string;
    priority?: string; category?: string; icon?: string; metadata?: any;
  }): Promise<void> {
    const uniques = Array.from(new Set((userIds || []).filter(Boolean)));
    await Promise.allSettled(
      uniques.map(userId =>
        this.create({ ...data, userId, priority: data.priority || 'medium' }),
      ),
    );
    this.logger.log(`[NOTIF] Envoyé à ${uniques.length} utilisateur(s) ciblé(s)`);
  }

  // Notif validation dossier identification
  async notifyDossierValide(identificateurId: string, acteurNom: string, dossierRef: string): Promise<void> {
    await this.create({
      userId: identificateurId,
      type: 'dossier_valide',
      titre: '✅ Dossier validé',
      message: `Le dossier de ${acteurNom} (${dossierRef}) a été validé par le BackOffice.`,
      priority: 'high',
      category: 'identification',
      icon: '✅',
      metadata: { dossierRef, acteurNom },
    });
  }

  // Notif acteur verrouillé (échecs PIN) — destinée aux identificateurs de sa zone
  async notifyActeurVerrouille(identificateurId: string, acteurNom: string): Promise<void> {
    await this.create({
      userId: identificateurId,
      type: 'acteur_verrouille',
      titre: 'Compte acteur verrouillé',
      message: `Le compte de ${acteurNom} est verrouillé après plusieurs échecs de connexion. Vous pouvez le débloquer depuis sa fiche.`,
      priority: 'high',
      category: 'securite',
      icon: 'lock',
      metadata: { acteurNom },
    });
  }

  // Notif rejet dossier
  async notifyDossierRejete(identificateurId: string, acteurNom: string, motif: string): Promise<void> {
    await this.create({
      userId: identificateurId,
      type: 'dossier_rejete',
      titre: '❌ Dossier rejeté',
      message: `Le dossier de ${acteurNom} a été rejeté. Motif : ${motif}`,
      priority: 'high',
      category: 'identification',
      icon: '❌',
      metadata: { acteurNom, motif },
    });
  }

  // Notif suspension acteur
  async notifyStatutChange(userId: string, nouveauStatut: string, motif?: string): Promise<void> {
    const messages: Record<string, { titre: string; message: string; icon: string }> = {
      actif:     { titre: 'Compte réactivé',  message: "Votre compte a été réactivé par l'administration.",         icon: '✅' },
      suspendu:  { titre: 'Compte suspendu',  message: `Votre compte a été suspendu. ${motif ? 'Motif : ' + motif : ''}`, icon: '⚠️' },
      en_attente:{ titre: 'En attente',        message: "Votre dossier est en cours d'examen par l'administration.", icon: '⏳' },
    };
    const cfg = messages[nouveauStatut] || { titre: 'Changement de statut', message: `Votre statut a changé : ${nouveauStatut}`, icon: 'ℹ️' };
    await this.create({ userId, type: 'statut_change', ...cfg, priority: 'high', category: 'compte' });
  }

  // ─── FIN ENVOI UNIVERSEL ──────────────────────────────────────

  // Notification nouvelle commande
  async notifyCommande(userId: string, commandeId: string, montant: number): Promise<void> {
    if (!await this.isNotifAllowed(userId, 'notif_commandes')) return;
    await this.create({
      userId,
      type: "commande",
      titre: "Nouvelle commande",
      message: `Tu as reçu une nouvelle commande de ${montant.toLocaleString("fr-FR")} FCFA !`,
      priority: "high",
      category: "commandes",
      icon: "🛒",
      metadata: { commandeId },
    });
  }
}
