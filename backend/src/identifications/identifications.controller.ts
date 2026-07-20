import { SkipThrottle } from '@nestjs/throttler';
import { buildMeta, parsePagination } from '../common/paginate';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Request, ForbiddenException, NotFoundException, BadRequestException, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Identification } from './identification.entity';
import { Repository } from 'typeorm';
import { FeedbakSmsService } from '../feedbak-sms/feedbak-sms.service';
import { AuthService } from '../auth/auth.service';
import { CreateActeurDto } from '../auth/dto/create-acteur.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('identifications')
export class IdentificationsController {
  constructor(
    @InjectRepository(Identification) private repo: Repository<Identification>,
    @InjectDataSource() private dataSource: DataSource,
    private readonly feedbakSmsService: FeedbakSmsService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}


  @Get('geo')
  async getGeoPoints(
    @Request() req: any,
    @Query('region') region?: string,
    @Query('role') role?: string,
    @Query('statut') statut?: string,
  ) {
    const rows = await this.queryIdentificationGeoRows(req, { region, role, statut });
    return { data: rows, total: rows.length };
  }

  private async queryIdentificationGeoRows(
    req: any,
    filters: { region?: string; role?: string; statut?: string },
  ): Promise<Record<string, unknown>[]> {
    const user = req.user;
    const isAdmin = ['admin_general', 'super_admin', 'operateur_terrain', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'].includes(user?.role);
    const conditions: string[] = ['i.latitude IS NOT NULL', 'i.longitude IS NOT NULL'];
    const params: unknown[] = [];
    let p = 1;
    if (!isAdmin) {
      conditions.push(`i.identificateur_id = $${p}`);
      params.push(String(user.id));
      p += 1;
    }
    if (filters.region) {
      conditions.push(`u.region = $${p}`);
      params.push(filters.region);
      p += 1;
    }
    if (filters.role) {
      conditions.push(`u.role = $${p}`);
      params.push(filters.role);
      p += 1;
    }
    if (filters.statut) {
      conditions.push(`i.statut = $${p}`);
      params.push(filters.statut);
      p += 1;
    }
    const whereSql = conditions.join(' AND ');
    const sql = `
      SELECT
        i.id, i.acteur_id, i.acteur_nom, i.type_acteur, i.statut,
        i.latitude, i.longitude, i.region, i.commune,
        i.created_at,
        TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS identificateur_nom
      FROM identifications i
      LEFT JOIN users u ON u.id::text = i.identificateur_id
      WHERE ${whereSql}
      ORDER BY i.created_at DESC
      LIMIT 5000
    `;
    return this.dataSource.query(sql, params);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    const { page, limit } = parsePagination(query);
    const skip = (page - 1) * limit;
    const user = req.user;
    const isAdmin = ['admin_general', 'super_admin', 'operateur_terrain', 'admin_national'].includes(user?.role);
    if (isAdmin) {
      const rows = await this.dataSource.query(`
        SELECT i.*,
          TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS identificateur_nom,
          COUNT(*) OVER() AS total_count
        FROM identifications i
        LEFT JOIN users u ON u.id::text = i.identificateur_id
        ORDER BY i.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, skip]);
      const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
      const data = rows.map(({ total_count, ...r }: any) => r);
      return { data, meta: buildMeta(page, limit, total) };
    }
    const rows = await this.dataSource.query(`
      SELECT i.*,
        TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS identificateur_nom,
        COUNT(*) OVER() AS total_count
      FROM identifications i
      LEFT JOIN users u ON u.id::text = i.identificateur_id
      WHERE i.identificateur_id = $1
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
    `, [user.id, limit, skip]);
    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const data = rows.map(({ total_count, ...r }: any) => r);
    return { data, meta: buildMeta(page, limit, total) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    const isAdmin = ['admin_general', 'super_admin', 'operateur_terrain', 'admin_national'].includes(user?.role);
    const identification = await this.repo.findOne({ where: { id } });
    if (!identification) throw new NotFoundException('Identification introuvable');
    if (!isAdmin && String(identification.identificateur_id) !== String(user.id)) {
      
      throw new ForbiddenException('Accès refusé');
    }
    return identification;
  }

  @Get('drafts/:identificateurId')
  async getDrafts(@Param('identificateurId') identificateurId: string, @Req() req: any) {
    if (!identificateurId) {
      return { drafts: [] };
    }
    const userRole = req.user?.role || '';
    const userId = req.user?.id;
    const isAdmin = ['super_admin', 'admin_general', 'admin_national', 'operateur_terrain'].includes(userRole);
    if (!isAdmin && String(userId) !== String(identificateurId)) {
      return { success: false, error: 'Accès refusé', drafts: [] };
    }
    try {
      const drafts = await this.dataSource.query(
        `SELECT id, acteur_nom, type_acteur, statut, current_step, form_data,
                latitude, longitude, region, commune,
                created_at, updated_at
         FROM identifications
         WHERE identificateur_id = $1
           AND statut = 'brouillon'
         ORDER BY updated_at DESC
         LIMIT 100`,
        [identificateurId]
      );
      return {
        success: true,
        count: drafts.length,
        drafts: drafts.map((d: any) => ({
          id: d.id,
          acteurNom: d.acteur_nom || '',
          typeActeur: d.type_acteur || '',
          currentStep: d.current_step || 0,
          formData: d.form_data || {},
          region: d.region || '',
          commune: d.commune || '',
          updatedAt: d.updated_at,
          createdAt: d.created_at,
        })),
      };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erreur recuperation brouillons', drafts: [] };
    }
  }

  @Post('draft')
  async saveDraft(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, error: 'Authentification requise' };
    }
    try {
      const isUpdate = Boolean(body.id);
      const payload = {
        identificateur_id: userId,
        statut: 'brouillon',
        type_acteur: body.typeActeur || body.type_acteur || null,
        acteur_nom: body.acteurNom || body.acteur_nom || null,
        current_step: body.currentStep ?? body.current_step ?? 0,
        form_data: body.formData || body.form_data || {},
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        region: body.region || null,
        commune: body.commune || null,
        documents: body.documents || null,
      };

      if (isUpdate) {
        const updated = await this.dataSource.query(
          `UPDATE identifications
           SET type_acteur = $1, acteur_nom = $2, current_step = $3, form_data = $4,
               latitude = $5, longitude = $6, region = $7, commune = $8, documents = $9,
               updated_at = NOW()
           WHERE id = $10 AND identificateur_id = $11 AND statut = 'brouillon'
           RETURNING id, current_step, updated_at`,
          [
            payload.type_acteur, payload.acteur_nom, payload.current_step,
            JSON.stringify(payload.form_data), payload.latitude, payload.longitude,
            payload.region, payload.commune, payload.documents, body.id, userId,
          ]
        );
        if (!updated || updated.length === 0) {
          return { success: false, error: 'Brouillon introuvable ou non autorise' };
        }
        return { success: true, draft: updated[0] };
      } else {
        const inserted = await this.dataSource.query(
          `INSERT INTO identifications (
             identificateur_id, statut, type_acteur, acteur_nom,
             current_step, form_data, latitude, longitude,
             region, commune, documents
           ) VALUES ($1, 'brouillon', $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, current_step, created_at, updated_at`,
          [
            userId, payload.type_acteur, payload.acteur_nom,
            payload.current_step, JSON.stringify(payload.form_data),
            payload.latitude, payload.longitude,
            payload.region, payload.commune, payload.documents,
          ]
        );
        return { success: true, draft: inserted[0] };
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erreur sauvegarde brouillon' };
    }
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const user = req.user;
    const isPrivileged = ['admin_general', 'super_admin', 'operateur_terrain', 'admin_national', 'identificateur'].includes(user?.role);
    if (!isPrivileged) {
      throw new ForbiddenException('Accès refusé');
    }
    const isAdmin = ['admin_general', 'super_admin', 'operateur_terrain', 'admin_national'].includes(user?.role);
    // Liste blanche explicite des seuls champs legitimes a la creation.
    // Aucun spread du body : statut, commission, commission_payee, motif_rejet
    // et dates ne sont jamais pris depuis le client. Le statut initial est
    // toujours fige a 'en_attente' cote serveur (transition via PATCH /:id).
    const payload = {
      type_acteur: body?.type_acteur ?? null,
      acteur_id: body?.acteur_id ?? null,
      acteur_nom: body?.acteur_nom ?? null,
      region: body?.region ?? null,
      commune: body?.commune ?? null,
      zone_id: body?.zone_id ?? null,
      latitude: body?.latitude ?? null,
      longitude: body?.longitude ?? null,
      documents: body?.documents ?? null,
      current_step: body?.current_step ?? body?.currentStep ?? 0,
      form_data: body?.form_data ?? body?.formData ?? null,
      statut: 'en_attente',
      identificateur_id: isAdmin ? (body?.identificateur_id ?? user?.id) : user?.id,
      date_identification: new Date(),
    };
    const created = await this.repo.save(this.repo.create(payload));

    const phone = body?.telephone ?? body?.phone ?? null;
    const prenom = body?.prenom ?? body?.firstName ?? body?.acteur_nom?.split?.(' ')?.[0] ?? 'Utilisateur';
    if (phone) {
      try {
        await this.feedbakSmsService.notifyDossierSoumis(String(phone), String(prenom));
      } catch {
        // Le flux principal ne doit jamais échouer sur un problème SMS.
      }
    }

    await this.notificationsService.sendToAdmins({
      type: 'identification_soumise',
      titre: 'Nouveau dossier à valider',
      message: `Un nouveau dossier d'identification a été soumis`,
      category: 'identification_soumise',
      priority: 'high',
    });

    return created;
  }

  @Post('create-with-acteur')
  async createWithActeur(@Body() body: any, @Request() req: any) {
    const ROLES_ACTEURS = ['marchand', 'producteur', 'cooperateur'];
    const isCreatedByIdentificateur = req.user?.role === 'identificateur';

    if (!body?.acteur || !body?.identification) {
      throw new BadRequestException('Body invalide: acteur et identification requis');
    }

    const acteurData: CreateActeurDto & Record<string, any> = { ...body.acteur };
    const identificationData = { ...body.identification };

    if ((acteurData.role as any) === 'cooperative') {
      (acteurData as any).role = 'cooperateur';
    }
    if (identificationData.type_acteur === 'cooperative') {
      identificationData.type_acteur = 'cooperateur';
    }

    if (!ROLES_ACTEURS.includes(identificationData.type_acteur)) {
      throw new BadRequestException(`type_acteur invalide: ${identificationData.type_acteur}`);
    }

    // Le role de l'acteur cree doit etre un role acteur autorise. On ne se repose
    // pas sur la seule whitelist du signup : on rejette explicitement avant toute
    // creation pour empecher l'injection d'un role privilegie via le body.
    if (!ROLES_ACTEURS.includes(acteurData.role as any)) {
      throw new ForbiddenException(`role acteur invalide: ${acteurData.role}`);
    }

    if (isCreatedByIdentificateur && req.user?.zoneId) {
      acteurData.zoneId = req.user.zoneId;
      acteurData.zone_id = req.user.zoneId;
      identificationData.zone_id = req.user.zoneId;
    }

    acteurData.password = '0000';
    delete acteurData.photoUrl;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let acteurId: string | undefined;

    try {
      const signupResult = await this.authService.signup(acteurData as any);
      acteurId = signupResult?.user?.id;

      if (!acteurId) {
        throw new BadRequestException('Creation acteur echouee: id manquant');
      }

      const identificationPayload = {
        acteur_id: acteurId,
        identificateur_id: req.user?.id || identificationData.identificateur_id,
        type_acteur: identificationData.type_acteur,
        statut: 'en_attente',
        current_step: identificationData.currentStep ?? identificationData.current_step ?? 0,
        form_data: identificationData.formData ?? identificationData.form_data ?? null,
        acteur_nom: identificationData.acteur_nom || `${acteurData.firstName} ${acteurData.lastName}`.trim(),
        region: identificationData.region || acteurData.region,
        commune: identificationData.commune || acteurData.commune,
        zone_id: identificationData.zone_id,
        latitude: identificationData.latitude || null,
        longitude: identificationData.longitude || null,
        documents: identificationData.documents || null,
        commission_payee: false,
        date_identification: new Date(),
      };

      const identification = await queryRunner.manager
        .getRepository(Identification)
        .save(identificationPayload);

      // Propager la photo du dossier d'identification vers le profil user.
      // La photo est stockee en data URL base64 dans documents.photoBase64.
      // Sans cette etape, users.photo_url reste vide et la photo n'apparait
      // jamais sur le profil de l'acteur (visible uniquement via le dossier BO).
      const photoBase64 = identificationData.documents?.photoBase64;
      if (photoBase64 && typeof photoBase64 === 'string') {
        await queryRunner.manager.query(
          'UPDATE users SET photo_url = $1 WHERE id = $2',
          [photoBase64, acteurId],
        );
      }

      // Creer le lien d'adhesion a la cooperative si le dossier l'indique.
      // Sans cela, cooperative_membres reste vide et un grossiste/demi-grossiste
      // ne peut jamais republier (409 'Aucune cooperative active').
      // Adhesion immediate : actif = true des l'enrolement.
      const fd = identificationData.formData ?? identificationData.form_data ?? {};
      const coopId = fd.cooperativeId;
      const estMembre = fd.estMembreCooperative === true || fd.estMembreCooperative === 'true';
      if (estMembre && coopId && typeof coopId === 'string') {
        // Verifier que la cooperative existe avant l'INSERT (evite d'aborter la transaction sur FK invalide).
        const coopExiste = await queryRunner.manager.query(
          'SELECT 1 FROM cooperatives WHERE id = $1 LIMIT 1',
          [coopId],
        );
        if (coopExiste.length > 0) {
          await queryRunner.manager.query(
            `INSERT INTO cooperative_membres (cooperative_id, membre_id, statut, role, actif)
             VALUES ($1, $2, 'actif', 'membre', true)
             ON CONFLICT (cooperative_id, membre_id) DO NOTHING`,
            [coopId, acteurId],
          );
        } else {
          console.warn(`[create-with-acteur] cooperativeId introuvable, adhesion ignoree: ${coopId}`);
        }
      }

      await queryRunner.commitTransaction();

      // Notification SMS au nouvel acteur enrole (ne doit jamais bloquer le flux)
      const phoneActeur = acteurData?.phone;
      const prenomActeur = acteurData?.firstName || 'Utilisateur';
      if (phoneActeur) {
        try {
          await this.feedbakSmsService.notifyDossierSoumis(String(phoneActeur), String(prenomActeur));
        } catch {
          // Le flux principal ne doit jamais échouer sur un problème SMS.
        }
      }

      await this.notificationsService.sendToAdmins({
        type: 'identification_soumise',
        titre: 'Nouveau dossier à valider',
        message: `Un nouveau dossier d'identification a été soumis`,
        category: 'identification_soumise',
        priority: 'high',
      });

      return {
        success: true,
        user: signupResult.user,
        identification,
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();

      // Cleanup: si l'acteur a ete cree mais l'identification a echoue,
      // supprimer l'acteur orphelin (signup utilise son propre repository,
      // donc le rollback de la transaction ne le couvre pas)
      if (acteurId) {
        try {
          await this.dataSource.query('DELETE FROM users WHERE id = $1', [acteurId]);
          console.log('[create-with-acteur] Cleanup acteur orphelin:', acteurId);
        } catch (cleanupError: any) {
          console.error('[create-with-acteur] Cleanup acteur echoue:', {
            acteurId,
            cleanupError: cleanupError?.message,
          });
        }
      }

      console.error('[create-with-acteur] Erreur transaction:', {
        message: error?.message,
        stack: error?.stack,
        acteurPhone: acteurData?.phone,
      });

      if (error?.status === 409 || error?.message?.includes('telephone')) {
        throw new BadRequestException('Ce numero de telephone est deja utilise');
      }

      throw new BadRequestException(
        `Echec creation acteur ou identification: ${error?.message || 'erreur inconnue'}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const user = req.user;
    const isAdmin = ['admin_general', 'super_admin', 'operateur_terrain', 'admin_national'].includes(user?.role);
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Identification introuvable');
    if (!isAdmin && String(existing.identificateur_id) !== String(user?.id)) {
      throw new ForbiddenException('Accès refusé');
    }
    const allowedFields = [
      'statut', 'acteur_nom', 'commune', 'notes',
      'etape_validation', 'motif_rejet', 'date_validation',
      'current_step', 'form_data',
      'latitude', 'longitude', 'region', 'documents',
    ];
    const normalized = {
      ...body,
      motif_rejet: body.motif_rejet ?? body.motifRejet ?? body.motif ?? null,
      current_step: body.current_step ?? body.currentStep,
      form_data: body.form_data ?? body.formData,
    };
    const safeBody = Object.fromEntries(
      Object.entries(normalized).filter(([k]) => allowedFields.includes(k))
    );
    if (safeBody.statut === 'rejete' && !safeBody.motif_rejet) {
      throw new BadRequestException('Le motif de rejet est obligatoire');
    }

    const acteurContact = existing?.acteur_id
      ? await this.dataSource.query(
          'SELECT phone, first_name, last_name FROM users WHERE id::text = $1 LIMIT 1',
          [String(existing.acteur_id)],
        )
      : [];
    const actor = acteurContact?.[0] || null;
    const phone = actor?.phone || body?.telephone || body?.phone || null;
    const prenom = actor?.first_name || existing?.acteur_nom?.split?.(' ')?.[0] || 'Utilisateur';
    const telephone = actor?.phone || body?.telephone || body?.phone || '';

    const result = await this.repo.update(id, safeBody);
    if (safeBody.statut === 'rejete') {
      if (phone) {
        try {
          await this.feedbakSmsService.notifyDossierRejete(String(phone), String(prenom), String(safeBody.motif_rejet || 'Non précisé'));
        } catch {
          // Le flux principal ne doit jamais échouer sur un problème SMS.
        }
      }
    }
    if (safeBody.statut === 'approuve' || safeBody.statut === 'valide') {
      if (phone) {
        try {
          await this.feedbakSmsService.notifyDossierValide(String(phone), String(prenom), String(telephone));
        } catch {
          // Le flux principal ne doit jamais échouer sur un problème SMS.
        }
      }
    }
    if (safeBody.statut === 'complement') {
      if (phone) {
        try {
          await this.feedbakSmsService.notifyComplementRequis(String(phone), String(prenom));
        } catch {
          // Le flux principal ne doit jamais échouer sur un problème SMS.
        }
      }
    }
    return result;
  }

  @Delete('draft/:id')
  async deleteDraft(@Param('id') id: string, @Req() req: any) {
    if (!id) {
      return { success: false, error: 'ID requis' };
    }
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = ['super_admin', 'admin_general', 'admin_national', 'operateur_terrain'].includes(userRole);
    if (!userId) {
      return { success: false, error: 'Authentification requise' };
    }
    try {
      const baseQuery = isAdmin
        ? `DELETE FROM identifications WHERE id = $1 AND statut = 'brouillon' RETURNING id`
        : `DELETE FROM identifications WHERE id = $1 AND statut = 'brouillon' AND identificateur_id = $2 RETURNING id`;
      const params = isAdmin ? [id] : [id, userId];
      const result = await this.dataSource.query(baseQuery, params);
      if (!result || result.length === 0) {
        return { success: false, error: 'Brouillon introuvable ou deja soumis' };
      }
      return { success: true, deletedId: id };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erreur suppression brouillon' };
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async deleteBrouillon(@Param('id') id: string, @Request() req: any) {
    const result = await this.dataSource.query(
      `DELETE FROM identifications WHERE id = $1 AND statut = 'brouillon' RETURNING id, acteur_nom, identificateur_id`,
      [id],
    );
    if (!result || result.length === 0) {
      return { success: false, error: 'Brouillon introuvable ou deja traite' };
    }
    try {
      await this.auditService.log({
        userId: req.user?.userId ?? req.user?.id,
        action: 'BROUILLON_DELETE',
        entite: 'identification',
        entiteId: id,
        details: { acteurNom: result[0].acteur_nom, identificateurId: result[0].identificateur_id },
      });
    } catch {
      // Audit non bloquant
    }
    return { success: true, id };
  }
}
