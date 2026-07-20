import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CaisseTransaction, TransactionStatus } from '../caisse-rest/caisse-transaction.entity';
import { paginate } from '../common/paginate';
import { AuditService } from '../audit/audit.service';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { TransactionsExportService } from './transactions-export.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsRestController {
  constructor(
    @InjectRepository(CaisseTransaction)
    private readonly repo: Repository<CaisseTransaction>,
    private readonly auditService: AuditService,
    private readonly exportService: TransactionsExportService,
  ) {}

  @Get()
  async findAll(@Query() query: any, @CurrentUser() user: User) {
    return paginate(this.repo, query, {
      where: { user_id: user.id } as any,
      order: { created_at: 'DESC' } as any
    });
  }

  @Get('all')
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain')
  async findAllAdmin(@CurrentUser() user: User, @Query() query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const skip = (page - 1) * limit;

    const qb = this.createAdminTransactionsQuery(user, query);
    const total = await qb.getCount();
    const { entities, raw } = await qb.skip(skip).take(limit).getRawAndEntities();

    const data = this.mergeRawTransactionData(entities, raw);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Patch(':id')
  @Roles('super_admin', 'admin_general', 'admin_national')
  async updateStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionStatusDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const requiresMotif = [TransactionStatus.GELEE, TransactionStatus.ANNULEE, TransactionStatus.LITIGE];
    if (requiresMotif.includes(dto.statut) && (!dto.motif || dto.motif.trim().length < 5)) {
      throw new BadRequestException(`Le motif est obligatoire (min 5 caractères) pour l’action ${dto.statut}`);
    }

    this.assertAuditServiceAvailable();
    const ip = this.getRequestIp(req);
    const manager = this.repo.manager;

    return manager.transaction(async (transactionManager) => {
      const tx = await transactionManager.findOne(CaisseTransaction, { where: { id } });
      if (!tx) throw new NotFoundException('Transaction introuvable');

      const previousStatus = tx.statut;
      tx.statut = dto.statut;
      tx.motif = dto.motif?.trim() || null;
      await transactionManager.save(tx);

      await this.insertAuditLog(transactionManager, {
        userId: user.id,
        action: `TRANSACTION_STATUT_${dto.statut.toUpperCase()}`,
        entite: 'caisse_transaction',
        entiteId: id,
        details: {
          transactionId: id,
          previousStatus,
          newStatus: dto.statut,
          motif: tx.motif,
        },
        ip,
      });

      return { id, statut: dto.statut, motif: tx.motif };
    });
  }

  @Get('export')
  @Roles('super_admin', 'admin_general', 'admin_national')
  async exportTransactions(
    @Query('format') format: string,
    @Query() query: any,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const allowedFormats = ['csv', 'xlsx', 'pdf'];
    const normalizedFormat = String(format || '').toLowerCase();

    if (!allowedFormats.includes(normalizedFormat)) {
      throw new BadRequestException(`Format invalide. Valeurs autorisées : ${allowedFormats.join(', ')}`);
    }

    const data = await this.fetchExportData(query, user);
    const { buffer, mimeType, filename } = await this.exportService.generate(normalizedFormat, data);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('geo-aggregation')
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain')
  async getGeoAggregation(@Query() query: any, @CurrentUser() user: User) {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoin('users', 'u', 'u.id::text = t.user_id')
      .select('u.region', 'region')
      .addSelect('COUNT(t.id)', 'count')
      .addSelect('COALESCE(SUM(t.montant), 0)', 'volume')
      .addSelect("COUNT(CASE WHEN t.statut = 'litige' THEN 1 END)", 'litiges')
      .addSelect("COUNT(CASE WHEN t.statut = 'gelee' THEN 1 END)", 'gelees')
      .where('u.region IS NOT NULL')
      .groupBy('u.region')
      .orderBy('COALESCE(SUM(t.montant), 0)', 'DESC');

    this.applyDateFilters(qb, query);
    this.applyZoneRestriction(qb, user);

    const rows = await qb.getRawMany();
    return rows.map(row => ({
      region: row.region,
      count: parseInt(row.count, 10) || 0,
      volume: parseFloat(row.volume) || 0,
      litiges: parseInt(row.litiges, 10) || 0,
      gelees: parseInt(row.gelees, 10) || 0,
    }));
  }

  @Get('by-acteur-geo')
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain')
  async getByActeurGeo(@Query() query: any, @CurrentUser() user: User) {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoin('users', 'u', 'u.id::text = t.user_id')
      .select('u.id', 'userId')
      .addSelect("CONCAT(u.first_name, ' ', u.last_name)", 'fullName')
      .addSelect('u.role', 'role')
      .addSelect('u.region', 'region')
      .addSelect('u.commune', 'commune')
      .addSelect('COUNT(t.id)', 'count')
      .addSelect('COALESCE(SUM(t.montant), 0)', 'volume')
      .addSelect("COUNT(CASE WHEN t.statut = 'litige' THEN 1 END)", 'litiges')
      .addSelect("COUNT(CASE WHEN t.statut = 'gelee' THEN 1 END)", 'gelees')
      .where('u.region IS NOT NULL')
      .groupBy('u.id, u.first_name, u.last_name, u.role, u.region, u.commune')
      .orderBy('COALESCE(SUM(t.montant), 0)', 'DESC');

    this.applyDateFilters(qb, query);
    this.applyZoneRestriction(qb, user);

    const rows = await qb.getRawMany();
    return rows.map(row => ({
      userId: row.userId,
      fullName: row.fullName,
      role: row.role,
      region: row.region,
      commune: row.commune,
      count: parseInt(row.count, 10) || 0,
      volume: parseFloat(row.volume) || 0,
      litiges: parseInt(row.litiges, 10) || 0,
      gelees: parseInt(row.gelees, 10) || 0,
    }));
  }

  private async fetchExportData(query: any, user: User): Promise<any[]> {
    const qb = this.createAdminTransactionsQuery(user, query);
    const { entities, raw } = await qb.getRawAndEntities();
    return this.mergeRawTransactionData(entities, raw);
  }

  private createAdminTransactionsQuery(user: User, query: any): SelectQueryBuilder<CaisseTransaction> {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoin('users', 'u', 'u.id::text = t.user_id')
      .addSelect("CONCAT(u.first_name, ' ', u.last_name)", 'acteur_nom')
      .addSelect('u.region', 'acteur_region')
      .addSelect('u.commune', 'acteur_commune')
      .addSelect('u.role', 'acteur_role')
      .orderBy('t.created_at', 'DESC');

    this.applyDateFilters(qb, query);

    if (query.statut && Object.values(TransactionStatus).includes(query.statut)) {
      qb.andWhere('t.statut = :statut', { statut: query.statut });
    }

    if (query.region) {
      qb.andWhere('u.region = :region', { region: query.region });
    }

    this.applyZoneRestriction(qb, user);

    return qb;
  }

  private applyDateFilters(qb: SelectQueryBuilder<CaisseTransaction>, query: any): void {
    if (query.date_from) {
      qb.andWhere('t.created_at >= :dateFrom', { dateFrom: this.parseIsoDate(query.date_from, 'date_from', false) });
    }

    if (query.date_to) {
      qb.andWhere('t.created_at <= :dateTo', { dateTo: this.parseIsoDate(query.date_to, 'date_to', true) });
    }
  }

  private applyZoneRestriction(qb: SelectQueryBuilder<CaisseTransaction>, user: User): void {
    if (user.role === 'gestionnaire_zone' && (user as any).zoneId) {
      qb.andWhere('u.zone_id = :zoneId', { zoneId: (user as any).zoneId });
    }
  }

  private parseIsoDate(value: string, field: string, endOfDay: boolean): Date {
    const trimmed = String(value).trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const normalized = isDateOnly
      ? `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : trimmed;
    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} doit être une date ISO 8601 valide`);
    }

    return parsed;
  }

  private mergeRawTransactionData(entities: CaisseTransaction[], raw: any[]): any[] {
    return entities.map((entity, index) => ({
      ...entity,
      acteur_nom: raw[index]?.acteur_nom ?? null,
      acteur_region: raw[index]?.acteur_region ?? null,
      acteur_commune: raw[index]?.acteur_commune ?? null,
      acteur_role: raw[index]?.acteur_role ?? null,
      region: raw[index]?.acteur_region ?? null,
      commune: raw[index]?.acteur_commune ?? null,
      acteurType: raw[index]?.acteur_role ?? null,
    }));
  }

  private getRequestIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (Array.isArray(forwarded)) return forwarded[0]?.split(',')[0]?.trim() || null;
    if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || null;
    return req.ip || null;
  }

  private assertAuditServiceAvailable(): void {
    if (!this.auditService) {
      throw new InternalServerErrorException('AuditService introuvable');
    }
  }

  private async insertAuditLog(
    manager: EntityManager,
    input: {
      userId?: string | null;
      action: string;
      entite: string;
      entiteId?: string | null;
      details?: Record<string, any> | null;
      ip?: string | null;
    },
  ): Promise<void> {
    // AuditService.log capture ses erreurs, donc l'écriture atomique utilise le manager courant.
    await manager.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details, ip, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
      [
        input.userId ?? null,
        input.action,
        input.entite,
        input.entiteId ?? null,
        JSON.stringify(input.details ?? {}),
        input.ip ?? null,
      ],
    );
  }
}
