import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MarchesService } from './marches.service';
import { CreateMarcheDto } from './dto/create-marche.dto';
import { UpdateMarcheDto } from './dto/update-marche.dto';
import { Marche } from './marche.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('marches')
export class MarchesController {
  constructor(
    private readonly marchesService: MarchesService,
    @InjectRepository(Marche) private readonly repo: Repository<Marche>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async findAll(
    @Query('commune') commune?: string,
    @Query('statut') statut?: string,
    @Query('zoneId') zoneId?: string,
    @Query('region') region?: string,
    @Query('actif') actif?: string,
    @Query('exclude_statut') excludeStatut?: string,
  ) {
    const excludeEnAttente = excludeStatut === 'en_attente';
    const excludeSql = excludeEnAttente
      ? ` AND COALESCE(statut, '') <> 'en_attente'`
      : '';

    if (statut) {
      return this.repo.query(
        `SELECT id, nom, commune, statut, latitude, longitude, responsable_nom, responsable_contact, actif
         FROM marches
         WHERE statut = $1${excludeSql}
         ORDER BY nom ASC`,
        [statut],
      );
    }
    if (zoneId || region || actif !== undefined) {
      const actifParsed =
        actif === undefined ? undefined : actif === 'true' || actif === '1';
      return this.marchesService.findAll({
        zoneId,
        region,
        actif: actifParsed,
      });
    }
    if (commune) {
      return this.repo.query(
        `SELECT id, nom, commune, statut, latitude, longitude, responsable_nom, responsable_contact, actif
         FROM marches
         WHERE commune = $1 AND actif = true${excludeSql}
         ORDER BY nom ASC`,
        [commune],
      );
    }
    const whereClause = excludeEnAttente
      ? ` WHERE COALESCE(statut, '') <> 'en_attente'`
      : '';
    return this.repo.query(
      `SELECT id, nom, commune, statut, latitude, longitude, responsable_nom, responsable_contact, actif
       FROM marches${whereClause}
       ORDER BY commune ASC, nom ASC`,
    );
  }

  @Post('suggestion')
  @UseGuards(JwtAuthGuard)
  async suggest(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id;
    const [inserted] = await this.repo.query(
      `INSERT INTO marches (nom, commune, statut, soumis_par, actif)
       VALUES ($1, $2, 'en_attente', $3, true)
       RETURNING id, nom, commune, statut`,
      [body.nom, body.commune, userId ?? null],
    );

    await this.notificationsService.sendToAdmins({
      type: 'marche_suggestion',
      titre: 'Nouveau marché à valider',
      message: `Un identificateur a proposé un nouveau marché`,
      category: 'marche_suggestion',
      priority: 'medium',
    });

    return { success: true, marche: inserted };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'super_admin')
  findOne(@Param('id') id: string) {
    return this.marchesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'super_admin')
  create(@Body() dto: CreateMarcheDto) {
    return this.marchesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone')
  async update(@Param('id') id: string, @Body() body: UpdateMarcheDto & { statut?: string }) {
    if (body?.statut !== undefined) {
      const actif = body.actif !== undefined ? body.actif : body.statut === 'actif';
      await this.repo.query(
        `UPDATE marches
         SET statut = $1, actif = $2, updated_at = NOW()
         WHERE id = $3`,
        [body.statut, actif, id],
      );
      const [row] = await this.repo.query(
        `SELECT id, nom, commune, statut, responsable_nom, responsable_contact, actif
         FROM marches WHERE id = $1`,
        [id],
      );
      return row ?? { success: true };
    }
    return this.marchesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'super_admin')
  remove(@Param('id') id: string) {
    return this.marchesService.remove(id);
  }
}
