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
    // `commune` n'est pas toujours une colonne litterale : pour un marche cree
    // via le chemin officiel (BackOffice > Zones, `zoneId` obligatoire), elle
    // est derivee du nom de la zone (COALESCE(m.commune, z.nom)) plutot que
    // dupliquee. Seul un marche "suggere librement" par un identificateur
    // (POST /marches/suggestion, sans zone) porte une valeur litterale.
    // `responsable_nom`/`responsable_contact` ne sont alimentes par AUCUN
    // chemin de creation existant : ils ne sont donc plus selectionnes (le
    // frontend les traite deja comme optionnels, cf. `marche.responsable_nom &&`
    // dans BOModeration.tsx).
    const baseSelect = `
      SELECT m.id, m.nom, m.zone_id, m.adresse, m.latitude, m.longitude,
             m.type, m.actif, m.description, m.created_at, m.updated_at,
             COALESCE(m.commune, z.nom) AS commune, m.statut,
             CASE WHEN z.id IS NULL THEN NULL ELSE json_build_object(
               'id', z.id, 'nom', z.nom, 'ville', z.ville, 'region', z.region
             ) END AS zone
      FROM marches m
      LEFT JOIN zones z ON z.id = m.zone_id`;

    const excludeEnAttente = excludeStatut === 'en_attente';
    const excludeSql = excludeEnAttente
      ? ` AND COALESCE(m.statut, '') <> 'en_attente'`
      : '';

    if (statut) {
      return this.repo.query(
        `${baseSelect}
         WHERE m.statut = $1${excludeSql}
         ORDER BY m.nom ASC`,
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
        `${baseSelect}
         WHERE COALESCE(m.commune, z.nom) = $1 AND m.actif = true${excludeSql}
         ORDER BY m.nom ASC`,
        [commune],
      );
    }
    const whereClause = excludeEnAttente
      ? ` WHERE COALESCE(m.statut, '') <> 'en_attente'`
      : '';
    return this.repo.query(
      `${baseSelect}${whereClause}
       ORDER BY COALESCE(m.commune, z.nom) ASC, m.nom ASC`,
    );
  }

  @Post('suggestion')
  @UseGuards(JwtAuthGuard)
  async suggest(@Body() body: any, @Req() _req: any) {
    // Suggestion "libre" : pas de zone associee (l'identificateur ne connait
    // que le nom de sa commune). `soumis_par` (auteur) n'existe pas en base et
    // n'est lu nulle part cote frontend : non persiste (evite une colonne
    // fantome de plus plutot que d'ajouter une colonne jamais affichee).
    const [inserted] = await this.repo.query(
      `INSERT INTO marches (nom, commune, statut, actif)
       VALUES ($1, $2, 'en_attente', true)
       RETURNING id, nom, commune, statut`,
      [body.nom, body.commune],
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
        `SELECT m.id, m.nom, COALESCE(m.commune, z.nom) AS commune, m.statut, m.actif
         FROM marches m
         LEFT JOIN zones z ON z.id = m.zone_id
         WHERE m.id = $1`,
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
