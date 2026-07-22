import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, ForbiddenException, BadRequestException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { AlertesService } from './alertes.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly svc: NotificationsService,
    private readonly alertesSvc: AlertesService,
    private readonly pushSvc: PushService,
  ) {}

  @Post('push-token')
  async savePushToken(@Body() body: { token: object }, @Request() req: any) {
    await this.pushSvc.saveToken(req.user.id, body.token);
    return { success: true };
  }

  @Get('bo/counts')
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getBoCounts(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) return { total: 0, par_category: {} };

    const rows = await this.svc.countUnreadByCategory(userId);
    const par_category: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      par_category[row.category] = Number(row.count);
      total += Number(row.count);
    }

    return { total, par_category };
  }

  @Get()
  async findAll(@Request() req: any) {
    return { notifications: await this.svc.findAll(req.user.id) };
  }

  @Get("trash")
  async findTrash(@Request() req: any) {
    return { notifications: await this.svc.findDeleted(req.user.id) };
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    return this.svc.create({
      userId: req.user.id,
      type: body.type,
      titre: body.titre,
      message: body.message,
      priority: body.priority || 'medium',
      category: body.category || null,
      icon: body.icon || null,
      metadata: body.metadata || null,
    });
  }

  @Patch("read-all")
  async markAllAsRead(@Request() req: any) {
    await this.svc.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @Request() req: any) {
    return { notification: await this.svc.markAsRead(id, req.user.id) };
  }

  @Patch(":id/restore")
  async restore(@Param("id") id: string, @Request() req: any) {
    await this.svc.restore(id, req.user.id);
    return { success: true };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req: any) {
    await this.svc.delete(id, req.user.id);
    return { success: true };
  }

  // ─── ENDPOINT BACKOFFICE ───────────────────────────────────────
  // Envoyer une notif à un userId spécifique (admin/BO seulement)
  @Post("send")
  @Roles('admin_general', 'institution', 'identificateur', 'super_admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async sendToUser(@Body() body: {
    userId: string;
    type: string;
    titre: string;
    message: string;
    priority?: string;
    category?: string;
    icon?: string;
    metadata?: any;
  }, @Request() req: any) {
    if (!req.user) throw new ForbiddenException('Non authentifié');
    const senderRole = req.user?.role || '';
    const notif = await this.svc.sendToUser(body.userId, {
      type: body.type,
      titre: body.titre,
      message: body.message,
      priority: body.priority || 'medium',
      category: body.category,
      icon: body.icon,
      metadata: { ...body.metadata, sentBy: req.user.id, sentByRole: senderRole },
    });
    return { success: true, notification: notif };
  }

  @Post("notify-member")
  @Roles('cooperateur', 'marchand', 'producteur')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async notifyMember(@Body() body: {
    memberId: string;
    titre?: string;
    message: string;
  }, @Request() req: any) {
    if (!req.user) throw new ForbiddenException('Non authentifié');
    const notif = await this.svc.sendToUser(body.memberId, {
      type: 'info',
      titre: body.titre || 'Message de votre coopérative',
      message: body.message,
      priority: 'medium',
      category: 'cooperative',
      icon: '📢',
      metadata: { sentBy: req.user.id, sentByRole: req.user.role },
    });
    return { success: true, notification: notif };
  }

  @Post("send-bulk")
  @Roles('admin_general', 'institution', 'super_admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async sendBulk(@Body() body: {
    userIds: string[];
    type: string;
    titre: string;
    message: string;
    priority?: string;
    category?: string;
    icon?: string;
    metadata?: any;
  }, @Request() req: any) {
    if (!req.user) throw new ForbiddenException('Non authentifié');
    const senderRole = req.user?.role || '';
    const userIds = Array.isArray(body.userIds) ? body.userIds : [];
    if (userIds.length > 500) throw new BadRequestException('Maximum 500 destinataires par envoi');
    const results = await Promise.allSettled(
      userIds.map((uid) => this.svc.sendToUser(uid, {
        type: body.type,
        titre: body.titre,
        message: body.message,
        priority: body.priority || 'medium',
        category: body.category,
        icon: body.icon,
        metadata: { ...body.metadata, sentBy: req.user.id, sentByRole: senderRole, bulk: true },
      })),
    );
    return {
      success: true,
      total: userIds.length,
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  }

  // Envoyer une notif de validation de dossier
  @Post("dossier-valide")
  @Roles('super_admin', 'admin_general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async notifyDossierValide(@Body() body: {
    identificateurId: string;
    acteurNom: string;
    dossierRef: string;
  }, @Request() req: any) {
    await this.svc.notifyDossierValide(body.identificateurId, body.acteurNom, body.dossierRef);
    return { success: true };
  }

  // Envoyer une notif de rejet de dossier
  @Post("dossier-rejete")
  @Roles('super_admin', 'admin_general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async notifyDossierRejete(@Body() body: {
    identificateurId: string;
    acteurNom: string;
    motif: string;
  }, @Request() req: any) {
    await this.svc.notifyDossierRejete(body.identificateurId, body.acteurNom, body.motif);
    return { success: true };
  }

  // Envoyer une notif de changement de statut
  @Post('alertes/run')
  @Roles('super_admin', 'admin_general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async runAlertes() {
    await this.alertesSvc.runCronAlertes();
    return { success: true, message: 'Alertes vérifiées' };
  }

  @Post('alertes/check-user')
  @UseGuards(JwtAuthGuard)
  async checkUserAlertes(@Request() req: any) {
    const userId = req.user.id;
    const role = req.user.role;
    if (role === 'marchand') {
      await this.alertesSvc.checkStocksFaibles(userId);
      await this.alertesSvc.checkJourneeNonOuverte(userId);
    } else if (role === 'producteur') {
      await this.alertesSvc.checkRecoltesProches(userId);
    }
    return { success: true };
  }

  @Post("statut-change")
  @Roles('super_admin', 'admin_general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async notifyStatutChange(@Body() body: {
    userId: string;
    nouveauStatut: string;
    motif?: string;
  }, @Request() req: any) {
    await this.svc.notifyStatutChange(body.userId, body.nouveauStatut, body.motif);
    return { success: true };
  }
}
