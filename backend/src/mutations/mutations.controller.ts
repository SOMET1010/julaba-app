import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Mutation, MutationStatus } from './mutation.entity';
import { CreateMutationDto } from './dto/create-mutation.dto';
import { NotificationsService } from '../notifications/notifications.service';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('mutations')
export class MutationsController {
  constructor(
    @InjectRepository(Mutation)
    private readonly mutationRepository: Repository<Mutation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async findMine(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifie');
    }

    const isAdmin = [
      'admin_general',
      'super_admin',
      'operateur_terrain',
      'admin_national',
      'gestionnaire_zone',
    ].includes(req.user?.role);

    if (isAdmin) {
      const rows = await this.dataSource.query(`
        SELECT m.*,
          TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS identificateur_nom_calc
        FROM mutations m
        LEFT JOIN users u ON u.id = m.identificateur_id
        ORDER BY m.created_at DESC
      `);
      return { data: rows };
    }

    const rows = await this.dataSource.query(
      `SELECT * FROM mutations WHERE identificateur_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return { data: rows };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() body: CreateMutationDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifie');
    }

    const existing = await this.mutationRepository.findOne({
      where: {
        identificateurId: userId,
        statut: MutationStatus.EN_ATTENTE,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Tu as deja une demande de mutation en attente. Attends la decision avant d\u2019en faire une nouvelle.',
      );
    }

    const userInfo = await this.dataSource.query(
      `SELECT TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS nom FROM users WHERE id = $1`,
      [userId],
    );
    const identificateurNom = userInfo?.[0]?.nom?.trim() || null;

    const created = this.mutationRepository.create({
      identificateurId: userId,
      identificateurNom,
      zoneActuelleId: body.zoneActuelleId || null,
      zoneActuelleNom: body.zoneActuelle || null,
      zoneDemandeeId: body.zoneDemandeeId,
      zoneDemandeeNom: body.zoneDemandee,
      raison: body.raison.trim(),
      statut: MutationStatus.EN_ATTENTE,
    });

    const saved = await this.mutationRepository.save(created);
    return { data: saved };
  }

  @Patch(':id/decision')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone')
  async decision(
    @Param('id') id: string,
    @Body() body: { decision: 'approuvee' | 'rejetee'; motif?: string },
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) throw new ForbiddenException('Non authentifié');

    if (!body.decision || !['approuvee', 'rejetee'].includes(body.decision)) {
      throw new BadRequestException('Decision invalide');
    }

    if (body.decision === 'rejetee' && (!body.motif || body.motif.trim().length < 10)) {
      throw new BadRequestException('Motif obligatoire (10 caractères minimum) pour un rejet');
    }

    const mutation = await this.mutationRepository.findOne({ where: { id } });
    if (!mutation) throw new NotFoundException('Demande introuvable');
    if (mutation.statut !== MutationStatus.EN_ATTENTE) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    await this.dataSource.query(
      `UPDATE mutations SET
        statut = $1,
        decideur_id = $2,
        motif_decision = $3,
        date_decision = NOW(),
        updated_at = NOW()
       WHERE id = $4`,
      [body.decision, userId, body.motif?.trim() || null, id],
    );

    if (body.decision === 'approuvee' && userRole === 'super_admin') {
      try {
        await this.dataSource.query(
          `INSERT INTO missions (
            id, titre, description, assignee_id, zone_id, statut, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            $1, $2, $3, $4, 'active', NOW(), NOW()
          )`,
          [
            `Mutation approuvée — ${mutation.identificateurNom || 'Identificateur'}`,
            `Transfert de ${mutation.zoneActuelleNom || 'zone actuelle'} vers ${mutation.zoneDemandeeNom}. Motif\u00a0: ${mutation.raison}`,
            mutation.identificateurId,
            mutation.zoneDemandeeId,
          ],
        );
      } catch (e: any) {
        console.warn('[MutationsController] mission creation failed:', e?.message);
      }
    }

    try {
      const titre =
        body.decision === 'approuvee'
          ? 'Demande de mutation approuvée\u00a0!'
          : 'Demande de mutation rejetée';
      const message =
        body.decision === 'approuvee'
          ? `Votre demande de mutation vers ${mutation.zoneDemandeeNom} a été approuvée.`
          : `Votre demande de mutation vers ${mutation.zoneDemandeeNom} a été rejetée.${body.motif ? ' Motif\u00a0: ' + body.motif.trim() : ''}`;
      await this.notificationsService.create({
        userId: mutation.identificateurId,
        type: 'mutation_decision',
        titre,
        message,
        priority: 'high',
        category: 'mutation',
        icon: body.decision === 'approuvee' ? 'check' : 'x',
      });
    } catch (e: any) {
      console.warn('[MutationsController] notification failed:', e?.message);
    }

    const updated = await this.mutationRepository.findOne({ where: { id } });
    return { data: updated };
  }
}
