import {
  Controller, Get, Post, Put, Delete, Query, Param, Body,
  UseGuards, ParseIntPipe, DefaultValuePipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  constructor(private readonly adminWalletsService: AdminWalletsService) {}

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
    return this.adminWalletsService.bloquerWallet(userId, raison, admin.id);
  }

  @Post(':userId/debloquer')
  debloquerWallet(
    @Param('userId') userId: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminWalletsService.debloquerWallet(userId, admin.id);
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

  @Get('export/csv')
  async exportWallets() {
    const csv = await this.adminWalletsService.exportWalletsCSV();
    return { csv };
  }

  @Get('transactions/export/csv')
  async exportTransactions() {
    const csv = await this.adminWalletsService.exportTransactionsCSV();
    return { csv };
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
