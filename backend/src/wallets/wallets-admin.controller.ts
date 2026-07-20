import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FeedbakSmsService } from '../feedbak-sms/feedbak-sms.service';
import { AdminMontantOperationDto, BloquerWalletDto, ReinitialiserSoldeDto } from './dto/admin-wallet-operations.dto';

@ApiTags('Admin - Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/wallets')
export class WalletsAdminController {
  constructor(
    private readonly walletsService: WalletsService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly feedbakSmsService: FeedbakSmsService,
  ) {}

  @Get('stats')
  async getStats() {
    const [main] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS total_wallets,
        COALESCE(SUM(solde),0)::numeric AS volume_total,
        COALESCE(SUM(solde_bloque),0)::numeric AS volume_bloque,
        COUNT(CASE WHEN solde > 0 THEN 1 END)::int AS wallets_actifs,
        COUNT(CASE WHEN solde = 0 THEN 1 END)::int AS wallets_zero
      FROM wallets
    `);
    const [tx] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS total_transactions,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)::int AS transactions_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS transactions_7j,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::int AS transactions_30j,
        COUNT(CASE WHEN type = 'credit' THEN 1 END)::int AS total_credits,
        COUNT(CASE WHEN type = 'debit' THEN 1 END)::int AS total_debits,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN montant ELSE 0 END),0)::numeric AS volume_credits,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN montant ELSE 0 END),0)::numeric AS volume_debits,
        COALESCE(AVG(CASE WHEN type = 'credit' THEN montant END),0)::numeric AS taux_recharge_moyen
      FROM wallet_transactions
    `);
    return { ...main, ...tx };
  }

  @Get('stats/chart')
  async getChartData() {
    const volume30j = await this.dataSource.query(`
      SELECT DATE(created_at) as jour,
        COUNT(*)::int as nb_transactions,
        COALESCE(SUM(CASE WHEN type='credit' THEN montant ELSE 0 END),0)::numeric as credits,
        COALESCE(SUM(CASE WHEN type='debit' THEN montant ELSE 0 END),0)::numeric as debits
      FROM wallet_transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY jour ASC
    `);
    const top10 = await this.dataSource.query(`
      SELECT u.first_name, u.last_name, u.phone,
        COALESCE(SUM(wt.montant),0)::numeric as volume_total,
        COUNT(wt.id)::int as nb_transactions
      FROM wallet_transactions wt
      LEFT JOIN users u ON u.id = wt.user_id
      GROUP BY u.id, u.first_name, u.last_name, u.phone
      ORDER BY volume_total DESC LIMIT 10
    `);
    return { volume30j, top10 };
  }

  @Get()
  async getAllWallets(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search = '',
    @Query('role') role = '',
    @Query('statut') statut = '',
    @Query('solde_min') soldeMin = '',
  ) {
    const pageNum = Number.isFinite(parseInt(page, 10)) ? Math.max(parseInt(page, 10), 1) : 1;
    const limitNum = Number.isFinite(parseInt(limit, 10)) ? Math.max(parseInt(limit, 10), 1) : 50;
    const offset = (pageNum - 1) * limitNum;
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.phone ILIKE $${idx})`);
    }
    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (soldeMin) {
      const min = parseFloat(soldeMin);
      if (!Number.isNaN(min)) {
        params.push(min);
        conditions.push(`w.solde >= $${params.length}`);
      }
    }
    if (statut === 'actif') conditions.push(`w.solde > 0`);
    if (statut === 'zero') conditions.push(`w.solde = 0`);
    const where = conditions.join(' AND ');
    const rowsParams = [...params, limitNum, offset];
    const rows = await this.dataSource.query(`
      SELECT w.id, w.user_id, w.solde, w.solde_bloque, w.currency, w.created_at, w.updated_at,
        u.first_name, u.last_name, u.phone, u.role, u.status
      FROM wallets w LEFT JOIN users u ON u.id = w.user_id
      WHERE ${where} ORDER BY w.updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, rowsParams);
    const [{ total }] = await this.dataSource.query(`
      SELECT COUNT(*)::int AS total FROM wallets w LEFT JOIN users u ON u.id = w.user_id WHERE ${where}
    `, params);
    return { wallets: rows, total, page: pageNum, limit: limitNum };
  }

  @Get('export/csv')
  async exportCSV() {
    const rows = await this.dataSource.query(`
      SELECT u.first_name, u.last_name, u.phone, u.role, w.solde, w.solde_bloque, w.currency, w.created_at
      FROM wallets w LEFT JOIN users u ON u.id = w.user_id ORDER BY w.solde DESC
    `);
    const header = 'Prénom,Nom,Téléphone,Rôle,Solde,Solde Bloqué,Devise,Créé le';
    const lines = rows.map((r: any) =>
      `${r.first_name},${r.last_name},${r.phone},${r.role},${r.solde},${r.solde_bloque},${r.currency},${r.created_at}`
    );
    return { csv: [header, ...lines].join('\n') };
  }

  @Get('transactions')
  async getAllTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('type') type = '',
    @Query('statut') statut = '',
    @Query('search') search = '',
    @Query('date_debut') dateDebut = '',
    @Query('date_fin') dateFin = '',
    @Query('montant_min') montantMin = '',
    @Query('montant_max') montantMax = '',
  ) {
    const pageNum = Number.isFinite(parseInt(page, 10)) ? Math.max(parseInt(page, 10), 1) : 1;
    const limitNum = Number.isFinite(parseInt(limit, 10)) ? Math.max(parseInt(limit, 10), 1) : 50;
    const offset = (pageNum - 1) * limitNum;
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    if (type) {
      params.push(type);
      conditions.push(`wt.type = $${params.length}`);
    }
    if (statut) {
      params.push(statut);
      conditions.push(`wt.statut = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.phone ILIKE $${idx} OR wt.description ILIKE $${idx})`);
    }
    if (dateDebut) {
      params.push(dateDebut);
      conditions.push(`wt.created_at >= $${params.length}`);
    }
    if (dateFin) {
      params.push(dateFin);
      conditions.push(`wt.created_at <= $${params.length}`);
    }
    if (montantMin) {
      const min = parseFloat(montantMin);
      if (!Number.isNaN(min)) {
        params.push(min);
        conditions.push(`wt.montant >= $${params.length}`);
      }
    }
    if (montantMax) {
      const max = parseFloat(montantMax);
      if (!Number.isNaN(max)) {
        params.push(max);
        conditions.push(`wt.montant <= $${params.length}`);
      }
    }
    const where = conditions.join(' AND ');
    const rowsParams = [...params, limitNum, offset];
    const rows = await this.dataSource.query(`
      SELECT wt.id, wt.user_id, wt.type, wt.montant, wt.description, wt.statut, wt.created_at, wt.metadata,
        u.first_name, u.last_name, u.phone
      FROM wallet_transactions wt LEFT JOIN users u ON u.id = wt.user_id
      WHERE ${where} ORDER BY wt.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, rowsParams);
    const [{ total }] = await this.dataSource.query(`
      SELECT COUNT(*)::int AS total
      FROM wallet_transactions wt LEFT JOIN users u ON u.id = wt.user_id WHERE ${where}
    `, params);
    return { transactions: rows, total };
  }

  @Get('transactions/export/csv')
  async exportTransactionsCSV() {
    const rows = await this.dataSource.query(`
      SELECT wt.id, u.first_name, u.last_name, u.phone, wt.type, wt.montant, wt.description, wt.statut, wt.created_at
      FROM wallet_transactions wt LEFT JOIN users u ON u.id = wt.user_id ORDER BY wt.created_at DESC
    `);
    const header = 'ID,Prénom,Nom,Téléphone,Type,Montant,Description,Statut,Date';
    const lines = rows.map((r: any) =>
      `${r.id},${r.first_name},${r.last_name},${r.phone},${r.type},${r.montant},${r.description || ''},${r.statut},${r.created_at}`
    );
    return { csv: [header, ...lines].join('\n') };
  }

  @Get(':userId')
  async getUserWallet(@Param('userId') userId: string) {
    const wallet = await this.walletsService.getByUserId(userId);
    const transactions = await this.walletsService.getTransactions(userId, 50);
    return { wallet, transactions };
  }

  @Post(':userId/credit')
  async creditWallet(
    @Param('userId') userId: string,
    @CurrentUser() admin: User,
    @Body() body: AdminMontantOperationDto,
  ) {
    const result = await this.walletsService.creditWallet(
      userId, body.montant, body.description || 'Crédit manuel admin',
      { adminId: admin.id, source: 'admin_manual' },
    );
    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details) VALUES ($1,$2,$3,$4,$5)`,
      [admin.id, 'CREDIT_MANUEL', 'wallet', userId, JSON.stringify({ montant: body.montant, description: body.description })],
    );
    return result;
  }

  @Post(':userId/debit')
  async debitWallet(
    @Param('userId') userId: string,
    @CurrentUser() admin: User,
    @Body() body: AdminMontantOperationDto,
  ) {
    const result = await this.walletsService.debitWallet(
      userId, body.montant, body.description || 'Débit manuel admin',
      { adminId: admin.id, source: 'admin_manual' },
    );
    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details) VALUES ($1,$2,$3,$4,$5)`,
      [admin.id, 'DEBIT_MANUEL', 'wallet', userId, JSON.stringify({ montant: body.montant, description: body.description })],
    );
    return result;
  }

  @Post(':userId/bloquer')
  async bloquerWallet(
    @Param('userId') userId: string,
    @CurrentUser() admin: User,
    @Body() body: BloquerWalletDto,
  ) {
    await this.dataSource.query(`UPDATE users SET status = 'suspendu' WHERE id = $1`, [userId]);
    const [user] = await this.dataSource.query(
      `SELECT phone, first_name AS "firstName", COALESCE(first_name, '') AS "prenoms" FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (user?.phone) {
      try {
        await this.feedbakSmsService.notifyCompteSuspendu(user.phone, user.firstName || user.prenoms);
      } catch {
        // Notification SMS non bloquante.
      }
    }
    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details) VALUES ($1,$2,$3,$4,$5)`,
      [admin.id, 'BLOQUER_WALLET', 'wallet', userId, JSON.stringify({ raison: body.raison })],
    );
    return { success: true };
  }

  @Post(':userId/debloquer')
  async debloquerWallet(@Param('userId') userId: string, @CurrentUser() admin: User) {
    await this.dataSource.query(`UPDATE users SET status = 'actif' WHERE id = $1`, [userId]);
    const [user] = await this.dataSource.query(
      `SELECT phone, first_name AS "firstName", COALESCE(first_name, '') AS "prenoms" FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (user?.phone) {
      try {
        await this.feedbakSmsService.notifyCompteReactive(user.phone, user.firstName || user.prenoms);
      } catch {
        // Notification SMS non bloquante.
      }
    }
    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details) VALUES ($1,$2,$3,$4,$5)`,
      [admin.id, 'DEBLOQUER_WALLET', 'wallet', userId, JSON.stringify({})],
    );
    return { success: true };
  }

  @Post(':userId/reinitialiser')
  async reinitialiserSolde(
    @Param('userId') userId: string,
    @CurrentUser() admin: User,
    @Body() body: ReinitialiserSoldeDto,
  ) {
    const wallet = await this.walletsService.getByUserId(userId);
    const soldeActuel = Number(wallet.solde);
    if (soldeActuel > 0) {
      await this.walletsService.debitWallet(userId, soldeActuel, 'Réinitialisation solde admin', { adminId: admin.id });
    }
    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details) VALUES ($1,$2,$3,$4,$5)`,
      [admin.id, 'REINIT_SOLDE', 'wallet', userId, JSON.stringify({ soldeAnnule: soldeActuel })],
    );
    return { success: true };
  }

  @Get('audit/logs')
  async getAuditLogs(@Query('limit') limit = '50') {
    const limitNum = Number.isFinite(parseInt(limit, 10)) ? Math.max(parseInt(limit, 10), 1) : 50;
    return this.dataSource.query(`
      SELECT al.*, u.first_name, u.last_name, u.phone
      FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
      WHERE al.entite = 'wallet'
      ORDER BY al.created_at DESC LIMIT $1
    `, [limitNum]);
  }

  @Get('config/items')
  async getConfigItems(@Query('type') type = '') {
    if (type) {
      return this.dataSource.query(
        `SELECT * FROM keiwa_config_items WHERE type = $1 ORDER BY ordre ASC, name ASC`,
        [type],
      );
    }
    return this.dataSource.query(`SELECT * FROM keiwa_config_items ORDER BY ordre ASC, name ASC`);
  }

  @Post('config/items')
  async createConfigItem(@CurrentUser() admin: User, @Body() body: any) {
    const itemId = body.item_id || body.name.toLowerCase().replace(/\s+/g, '_');
    const [item] = await this.dataSource.query(
      `INSERT INTO keiwa_config_items (type,item_id,name,logo_text,color,description,categorie,actif,est_favori,ordre,frais_transaction)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [body.type, itemId, body.name, body.logo_text, body.color || '#C66A2C', body.description, body.categorie, body.actif !== false, body.est_favori || false, body.ordre || 0, body.frais_transaction || 0],
    );
    return item;
  }

  @Put('config/items/:id')
  async updateConfigItem(@Param('id') id: string, @Body() body: any) {
    const [item] = await this.dataSource.query(
      `UPDATE keiwa_config_items SET name=$1,logo_text=$2,logo_url=$3,color=$4,description=$5,categorie=$6,actif=$7,est_favori=$8,ordre=$9,frais_transaction=$10,updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [body.name, body.logo_text, body.logo_url, body.color, body.description, body.categorie, body.actif, body.est_favori, body.ordre, body.frais_transaction || 0, id],
    );
    return item;
  }

  @Delete('config/items/:id')
  async deleteConfigItem(@Param('id') id: string) {
    await this.dataSource.query(`DELETE FROM keiwa_config_items WHERE id = $1`, [id]);
    return { success: true };
  }

  @Post('config/items/upload-logo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/var/www/julaba/frontend/dist/uploads/keiwa',
      filename: (_req, file, cb) => cb(null, `keiwa-${Date.now()}${extname(file.originalname)}`),
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|svg\+xml|webp)$/)) cb(null, true);
      else cb(new Error('Format non supporté: JPG, PNG, SVG, WEBP uniquement'), false);
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Aucun fichier');
    return { url: `/uploads/keiwa/${file.filename}`, filename: file.filename };
  }

  @Get('config/parametres')
  async getParametres() {
    const rows = await this.dataSource.query(`SELECT cle, valeur, description FROM keiwa_parametres ORDER BY cle`);
    const result: Record<string, string> = {};
    rows.forEach((r: any) => { result[r.cle] = r.valeur; });
    return result;
  }

  @Put('config/parametres')
  async updateParametres(@CurrentUser() admin: User, @Body() body: Record<string, string>) {
    await this.dataSource.transaction(async (entityManager) => {
      for (const [cle, valeur] of Object.entries(body)) {
        await entityManager.query(
          `INSERT INTO keiwa_parametres (cle, valeur, updated_by) VALUES ($1,$2,$3)
         ON CONFLICT (cle) DO UPDATE SET valeur=$2, updated_at=NOW(), updated_by=$3`,
          [cle, valeur, admin.id],
        );
      }
    });
    return { success: true };
  }

  @Get('config/banques/attente')
  async getBanquesAttente() {
    return this.dataSource.query(`
      SELECT banque_id, COUNT(*)::int as nb_attente
      FROM keiwa_banque_attente WHERE notifie = false
      GROUP BY banque_id ORDER BY nb_attente DESC
    `);
  }

  @Post('config/banques/notifier/:banqueId')
  async notifierBanque(@Param('banqueId') banqueId: string) {
    await this.dataSource.query(`UPDATE keiwa_banque_attente SET notifie = true WHERE banque_id = $1`, [banqueId]);
    return { success: true };
  }
}
