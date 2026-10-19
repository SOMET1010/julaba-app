import {
  Controller, Get, Post, Put, Delete, Query, Param, Body, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AdminWalletsService } from './admin-wallets.service';

@ApiTags('Admin Wallets')
@ApiBearerAuth()
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/wallets')
export class AdminWalletsController {
  constructor(
    private readonly adminWalletsService: AdminWalletsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminWalletsService.getStats();
  }

  @Get('stats/chart')
  getChartData() {
    return this.adminWalletsService.getChartData();
  }

  @Get()
  getAllWallets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search', new DefaultValuePipe('')) search: string,
    @Query('role', new DefaultValuePipe('')) role: string,
    @Query('statut', new DefaultValuePipe('')) statut: string,
    @Query('solde_min', new DefaultValuePipe('')) solde_min: string,
  ) {
    return this.adminWalletsService.getAllWallets({ page, limit, search, role, statut, solde_min });
  }

  @Get('transactions')
  getAllTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('type', new DefaultValuePipe('')) type: string,
    @Query('search', new DefaultValuePipe('')) search: string,
    @Query('date_debut', new DefaultValuePipe('')) date_debut: string,
    @Query('date_fin', new DefaultValuePipe('')) date_fin: string,
    @Query('montant_min', new DefaultValuePipe('')) montant_min: string,
    @Query('montant_max', new DefaultValuePipe('')) montant_max: string,
  ) {
    return this.adminWalletsService.getAllTransactions({
      page, limit, type, search, date_debut, date_fin, montant_min, montant_max,
    });
  }

  @Post(':userId/bloquer')
  bloquerWallet(
    @Param('userId') userId: string,
    @Body('raison', new DefaultValuePipe('Blocage administratif')) raison: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminWalletsService.bloquerWallet(userId, raison, admin);
  }

  @Post(':userId/debloquer')
  debloquerWallet(
    @Param('userId') userId: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminWalletsService.debloquerWallet(userId, admin);
  }

  // ── J5 (décision Patrick, 03/10/2026) ───────────────────────────────────
  // Créditer, débiter ou remettre à zéro un wallet depuis le back-office est
  // réservé au super_admin, avec un motif obligatoire. Le service écrit le
  // journal (auteur, cible, montant, motif, horodatage) dans la MÊME
  // transaction que le mouvement : si le journal échoue, rien ne bouge.
  @Post(':userId/reinitialiser')
  @Roles('super_admin')
  reinitialiserWallet(
    @Param('userId') userId: string,
    @Body('confirmation') confirmation: string,
    @Body('motif') motif: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminWalletsService.reinitialiserWallet(userId, confirmation, motif, admin.id);
  }

  @Post(':userId/credit')
  @Roles('super_admin')
  creditWallet(
    @Param('userId') userId: string,
    @Body('montant') montant: number,
    @Body('motif') motif: string,
    @Body('description') description: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminWalletsService.creditWallet(userId, montant, motif ?? description, admin.id);
  }

  @Post(':userId/debit')
  @Roles('super_admin')
  debitWallet(
    @Param('userId') userId: string,
    @Body('montant') montant: number,
    @Body('motif') motif: string,
    @Body('description') description: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminWalletsService.debitWallet(userId, montant, motif ?? description, admin.id);
  }

  // ── C-13 (audit comptable 12/10 §6 + ADMINGEN-11 + ADMINNAT-06) ─────────
  // Les exports CSV contiennent des soldes + PII (téléphones) en masse. Avant :
  // servis au seul jeton 'ADMIN' générique (tous les rôles BO, dont
  // gestionnaire_zone et operateur_terrain), sans permission dédiée ni trace.
  // Décision de scoping : rôles EXPLICITES super_admin + admin_general — les
  // deux rôles nationaux les plus élevés du registre bo-autorisation (les
  // rôles territoriaux en sortent ; retirer admin_general au profit
  // d'admin_national aurait inversé la hiérarchie du registre). Chaque export
  // écrit une entrée d'audit (acteur, type d'export, nombre de lignes — jamais
  // les données elles-mêmes) AVANT la réponse : un export non tracé ne part
  // pas (même esprit que J5 : si le journal échoue, rien ne sort).
  @Get('export/csv')
  @Roles('super_admin', 'admin_general')
  async exportWallets(@CurrentUser() admin: User, @Req() req: Request) {
    const csv = await this.adminWalletsService.exportWalletsCSV();
    await this.tracerExport(req, admin, 'EXPORT_WALLETS_CSV', 'soldes_wallets', this.compterLignes(csv));
    return { csv };
  }

  @Get('transactions/export/csv')
  @Roles('super_admin', 'admin_general')
  async exportTransactions(@CurrentUser() admin: User, @Req() req: Request) {
    const csv = await this.adminWalletsService.exportTransactionsCSV();
    await this.tracerExport(req, admin, 'EXPORT_TRANSACTIONS_CSV', 'transactions_wallets', this.compterLignes(csv));
    return { csv };
  }

  private compterLignes(csv: string): number {
    const lignesNonVides = String(csv ?? '').split('\n').filter((l) => l.trim().length > 0).length;
    return Math.max(0, lignesNonVides - 1); // moins la ligne d'en-tête
  }

  private async tracerExport(
    req: Request,
    admin: User,
    action: string,
    type: string,
    lignes: number,
  ): Promise<void> {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0]
        : req.ip;
    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details, ip, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
      [
        admin?.id ?? null,
        action,
        'admin_wallets',
        null,
        JSON.stringify({ type, format: 'csv', lignes }),
        ip ?? null,
      ],
    );
  }

  @Get('audit/logs')
  getAuditLogs(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminWalletsService.getAuditLogs(limit);
  }

  // ── Config (stub — retourne les defaults jusqu'à migration DB) ────────────
  @Get('config/items')
  getConfigItems(@Query('type', new DefaultValuePipe('')) type: string) {
    return this.adminWalletsService.getConfigItems(type);
  }

  @Get('config/parametres')
  getConfigParametres() {
    return this.adminWalletsService.getConfigParametres();
  }

  @Get('config/banques/attente')
  getBanquesAttente() {
    return this.adminWalletsService.getBanquesAttente();
  }

  @Post('config/items/upload-logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    return this.adminWalletsService.uploadLogo(file);
  }

  @Post('config/items')
  createConfigItem(@Body() body: {
    type: string; item_id: string; name: string; logo_text?: string;
    logo_url?: string; color?: string; description?: string;
    categorie?: string; actif?: boolean; est_favori?: boolean;
    ordre?: number; frais_transaction?: number;
  }) {
    return this.adminWalletsService.createConfigItem(body);
  }

  @Post('config/banques/notifier/:banqueId')
  notifierBanque(@Param('banqueId') _banqueId: string) {
    return { success: true };
  }

  @Put('config/items/:id')
  updateConfigItem(@Param('id') id: string, @Body() body: {
    name?: string; logo_text?: string; logo_url?: string; color?: string;
    description?: string; categorie?: string; actif?: boolean;
    est_favori?: boolean; ordre?: number; frais_transaction?: number;
  }) {
    return this.adminWalletsService.updateConfigItem(id, body);
  }

  @Delete('config/items/:id')
  deleteConfigItem(@Param('id') id: string) {
    return this.adminWalletsService.deleteConfigItem(id);
  }
}
