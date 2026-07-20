import { SkipThrottle } from '@nestjs/throttler';
import { RolesGuard } from '../auth/guards/roles.guard';
import { buildMeta } from '../common/paginate';
import { Roles } from '../auth/decorators/roles.decorator';
import { Controller, Get, Patch, Delete, UseGuards, Param, Body, Query, Request, ForbiddenException, NotFoundException, BadRequestException, Post, UploadedFile, UseInterceptors, HttpCode, HttpStatus, Logger, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { DuplicatesService } from './duplicates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { FeedbakSmsService } from '../feedbak-sms/feedbak-sms.service';
import { UsersBoListQueryDto } from './dto/users-bo-list-query.dto';
import { AdminUsersService } from './admin-users.service';
import { BackofficeUsersService } from './backoffice-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateBackofficeUserDto } from './dto/create-backoffice-user.dto';
import { CreateBackofficeAccountDto, CREATABLE_BO_ACCOUNT_ROLES } from './dto/create-backoffice-account.dto';
import { UpdateSousProfilMarchandDto } from './dto/update-sous-profil-marchand.dto';
import { RejectAdminUserDto } from './dto/reject-admin-user.dto';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly duplicatesService: DuplicatesService,
    private readonly adminUsersService: AdminUsersService,
    private readonly backofficeUsersService: BackofficeUsersService,
    private readonly feedbakSmsService: FeedbakSmsService,
  ) {}

  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Get()
  async findAll(@Query() query: UsersBoListQueryDto, @Request() req: any) {
    const result = await this.usersService.findAll(query, req.user?.role);
    return {
      data: result.users,
      meta: buildMeta(result.page, query.limit ?? 50, result.total),
    };
  }

  @Get('by-phone/:phone')
  async findByPhone(@Param('phone') phone: string, @Request() req: any) {
    const isAdmin = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain', 'identificateur'].includes(req.user?.role);
    if (!req.user || !isAdmin) {
      throw new ForbiddenException('Accès refusé');
    }
    const user = await this.usersService.findByPhone(phone);
    if (req.user.role === 'identificateur') {
      const memeZone = user.zoneId && req.user.zoneId && user.zoneId === req.user.zoneId;
      return {
        ...user,
        horsZone: !memeZone,
        messageZone: !memeZone
          ? 'Cet utilisateur n\'est pas dans votre zone. Vous êtes en consultation uniquement.'
          : null,
      };
    }
    return user;
  }

  @Get('search-identificateur')
  async searchForIdentificateur(
    @Query('q') q: string,
    @Query('limit') limit: string = '10',
    @Request() req: any
  ) {
    try {
      const allowedRoles = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain', 'identificateur', 'institution'];
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        throw new ForbiddenException('Accès refusé');
      }

      const results = await this.usersService.searchActorsForIdentificateur(q, Number(limit) || 10);
      return { results };
    } catch (error: any) {
      if (error?.status === 403) throw error;

      console.error('[searchForIdentificateur] Erreur :', error?.message || error);
      return { results: [] };
    }
  }

  @Get('duplicates')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone')
  async getDuplicates(@Request() req: any) {
    const filters: { zoneId?: string } = {};

    if (req.user.role === 'gestionnaire_zone' && req.user.zoneId) {
      filters.zoneId = req.user.zoneId;
    }

    return this.duplicatesService.findDuplicates(filters);
  }

  @Get('counts-by-role')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain')
  async getCountsByRole(@Request() req: any) {
    const permissions = req.user?.boPermissions ?? req.user?.bo_permissions;
    if (req.user?.role !== 'super_admin' && permissions && permissions['acteurs.read'] !== true) {
      throw new ForbiddenException('Permission acteurs.read requise');
    }

    return this.usersService.countByRole(req.user?.role);
  }

  @Get('admin/pending')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async getAdminsPending(@Request() req: any) {
    void req;
    return this.adminUsersService.getAdminsPending();
  }

  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin_general')
  async createAdmin(@Body() dto: CreateAdminUserDto, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.adminUsersService.createAdmin(
      dto,
      { id: req.user.id, role: req.user.role },
      typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined,
    );
  }

  @Post('admin/:id/validate')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async validateAdmin(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.adminUsersService.validateAdmin(
      id,
      { id: req.user.id },
      typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined,
    );
  }

  @Post('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async rejectAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectAdminUserDto,
    @Request() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.adminUsersService.rejectAdmin(
      id,
      dto,
      { id: req.user.id },
      typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined,
    );
  }

  @Post('backoffice/create')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone')
  async createBackofficeUser(
    @Body() dto: CreateBackofficeUserDto,
    @Request() req: any,
  ) {
    const ip = Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for'] || req.ip;
    return this.backofficeUsersService.createUser(
      dto,
      { id: req.user.id, role: req.user.role, zoneId: req.user.zoneId },
      typeof ip === 'string' ? ip : undefined,
    );
  }

  // Creation d'un compte administrateur back-office (remplace l'ancien passage
  // par l'inscription publique /auth/signup). Authentifie, reserve au super_admin.
  // Le role demande est tranche cote serveur via CREATABLE_BO_ACCOUNT_ROLES.
  @Post('backoffice-account')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async createBackofficeAccount(
    @Body() dto: CreateBackofficeAccountDto,
    @Request() req: any,
  ) {
    if (!CREATABLE_BO_ACCOUNT_ROLES.includes(dto.role)) {
      throw new ForbiddenException(
        'Ce role n\'est pas autorise a la creation depuis le back-office',
      );
    }
    const ip = Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for'] || req.ip;
    const payload: CreateBackofficeUserDto = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
    };
    return this.backofficeUsersService.createUser(
      payload,
      { id: req.user.id, role: req.user.role, zoneId: req.user.zoneId },
      typeof ip === 'string' ? ip : undefined,
    );
  }

  @Get(':id/historique')
  async getHistorique(@Param('id') id: string, @Request() req: any) {
    const isAdmin = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain', 'identificateur'].includes(req.user?.role);
    if (!req.user || (!isAdmin && req.user.id !== id)) {
      throw new ForbiddenException('Accès refusé');
    }
    if (req.user.role === 'identificateur') {
      const targetUser = await this.usersService.findOne(id);
      const memeZone = targetUser.zoneId && req.user.zoneId && targetUser.zoneId === req.user.zoneId;
      if (!memeZone) {
        return {
          historique: [],
          total: 0,
          horsZone: true,
          messageZone: 'Cet utilisateur n\'est pas dans votre zone. Vous êtes en consultation uniquement.',
        };
      }
    }
    const historique = await this.usersService.getHistorique(id);
    return { historique, total: historique.length };
  }

  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'identificateur', 'institution')
  @UseGuards(RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const isAdmin = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'].includes(req.user?.role);
    const isIdentificateur = req.user?.role === 'identificateur';
    if (!req.user || (!isAdmin && !isIdentificateur && req.user.id !== id)) {
      throw new ForbiddenException('Accès refusé');
    }
    const target = await this.usersService.findOne(id);
    if (isIdentificateur) {
      const memeZone = target.zoneId && req.user.zoneId && target.zoneId === req.user.zoneId;
      return {
        ...target,
        horsZone: !memeZone,
        messageZone: !memeZone
          ? 'Cet utilisateur n\'est pas dans votre zone. Vous êtes en consultation uniquement.'
          : null,
      };
    }
    return target;
  }

  @Roles('super_admin', 'admin_general', 'admin_national', 'identificateur')
  @UseGuards(RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const isAdmin = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'].includes(req.user?.role);
    const isOwner = req.user?.id === id;
    const isIdentificateur = req.user?.role === 'identificateur';

    if (!req.user || (!isAdmin && !isOwner && !isIdentificateur)) {
      throw new ForbiddenException('Accès refusé');
    }

    const existingUser = await this.usersService.findOne(id);
    const ancienZoneId = existingUser?.zoneId;

    if (isIdentificateur && !isOwner) {
      const memeZone = existingUser.zoneId && req.user.zoneId && existingUser.zoneId === req.user.zoneId;
      if (!memeZone) {
        throw new ForbiddenException('Cet acteur n\'est pas dans votre zone');
      }
    }

    const actorId = req.user?.id;
    const ip = req.ip || req.headers['x-forwarded-for'];
    if (body.is_active !== undefined) {
      this.logger.warn(
        'PATCH /users/:id : champ obsolete is_active ignore. Utiliser status (actif, suspendu, pending, rejete).',
      );
    }
    let ALLOWED_FIELDS: string[];
    if (isAdmin) {
      ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'region', 'commune', 'activity', 'market', 'photoUrl', 'status', 'boPermissions', 'role', 'objectifMensuel', 'primeObjectif', 'zoneId', 'typePointVente', 'typePointVenteAutre', 'districtId', 'districtAutre', 'regionId', 'regionAutre', 'departementId', 'departementAutre', 'communeId', 'communeAutre', 'quartierVillage', 'nin', 'nationalite', 'situationMatrimoniale', 'numCNPS', 'numCMU', 'recepisse', 'dateNaissance', 'lieuNaissance', 'estMembreCooperative', 'boitePostale', 'statutEntrepreneur', 'categorie', 'genre', 'cooperativeName', 'institutionName'];
    } else if (isIdentificateur && !isOwner) {
      ALLOWED_FIELDS = ['email', 'activity', 'market', 'photoUrl', 'commune', 'typePointVente', 'typePointVenteAutre', 'districtId', 'districtAutre', 'regionId', 'regionAutre', 'departementId', 'departementAutre', 'communeId', 'communeAutre', 'quartierVillage', 'nationalite', 'situationMatrimoniale', 'numCNPS', 'numCMU', 'dateNaissance', 'lieuNaissance', 'estMembreCooperative', 'boitePostale', 'statutEntrepreneur', 'categorie', 'genre'];
    } else {
      ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'region', 'commune', 'activity', 'market', 'photoUrl', 'objectifMensuel', 'typePointVente', 'typePointVenteAutre', 'districtId', 'districtAutre', 'regionId', 'regionAutre', 'departementId', 'departementAutre', 'communeId', 'communeAutre', 'quartierVillage', 'nationalite', 'situationMatrimoniale', 'numCNPS', 'numCMU', 'dateNaissance', 'lieuNaissance', 'estMembreCooperative', 'boitePostale', 'statutEntrepreneur', 'categorie', 'genre', 'cooperativeName'];
    }

    const safeBody: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) safeBody[key] = body[key];
    }
    // Blocage modification de rôle sauf super_admin
    if (body.role && req.user.role !== 'super_admin') {
      throw new ForbiddenException('Modification de rôle réservée au super_admin');
    }
    const updated = await this.usersService.update(id, safeBody, actorId, ip);
    if (body.zoneId && body.zoneId !== ancienZoneId) {
      const zoneNom = body.zoneNom || body.zoneId;
      try {
        await this.feedbakSmsService.notifyMutationZone(
          existingUser.phone,
          existingUser.firstName || existingUser.lastName || 'Utilisateur',
          zoneNom,
        );
      } catch {
        // Le flux principal ne doit jamais échouer sur un problème SMS.
      }
    }
    return updated;
  }

  @Roles('super_admin', 'admin_general', 'admin_national')
  @UseGuards(RolesGuard)
  @Patch(':id/sous-profil')
  async changeSousProfil(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSousProfilMarchandDto,
    @Request() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.backofficeUsersService.changeSousProfil(
      id,
      dto,
      { id: req.user.id, role: req.user.role },
      typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined,
    );
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const isAdmin = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'].includes(req.user?.role);
    const isOwner = req.user?.id === id;
    const isIdentificateur = req.user?.role === 'identificateur';

    if (!isAdmin && !isOwner && !isIdentificateur) {
      throw new ForbiddenException('Accès refusé');
    }

    if (isIdentificateur && !isOwner) {
      const target = await this.usersService.findOne(id);
      const memeZone = target.zoneId && req.user.zoneId && target.zoneId === req.user.zoneId;
      if (!memeZone) {
        throw new ForbiddenException('Cet acteur n\'est pas dans votre zone');
      }
    }

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Format de fichier non supporté (jpeg, png, webp, gif uniquement)');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `acteur_${id}_${Date.now()}.${ext}`;
    const fs = await import('fs/promises');
    const path = await import('path');
    const dest = path.join('/var/www/julaba/uploads/acteurs', filename);

    try {
      await fs.writeFile(dest, file.buffer);
    } catch (e: any) {
      throw new BadRequestException('Erreur lors de la sauvegarde du fichier');
    }

    const photoUrl = `https://julaba.online/uploads/acteurs/${filename}`;
    await this.usersService.update(id, { photoUrl } as any, req.user.id, req.ip);

    return { success: true, photoUrl, filename };
  }

  @Patch(':id/bo-permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async updateBoPermissions(
    @Param('id') id: string,
    @Body() body: { bo_permissions: Record<string, boolean> },
    @Request() req: any,
  ) {
    if (!body.bo_permissions || typeof body.bo_permissions !== 'object') {
      throw new BadRequestException('bo_permissions doit être un objet');
    }

    const ALLOWED_PERMISSIONS = [
      'acteurs.read', 'acteurs.write', 'acteurs.delete', 'acteurs.suspend',
      'enrolement.read', 'enrolement.write', 'enrolement.validate',
      'supervision.read', 'supervision.write', 'supervision.freeze',
      'zones.read', 'zones.write',
      'missions.read', 'missions.write',
      'audit.read',
      'utilisateurs.read', 'utilisateurs.write', 'utilisateurs.delete',
      'parametres.read', 'parametres.write',
      'academy.read', 'academy.write',
      'marketplace.read', 'marketplace.write',
      'livraison.read', 'livraison.write',
      'communication.read', 'communication.write',
      'contenus.read', 'contenus.write',
      'moderation.read', 'moderation.write',
      'monitoring_ia.read',
      'analytics_produit.read',
      'cron.read',
      // Cles ajoutees pour couvrir l'integralite du registre frontend
      // (config/bo-permissions.ts, allPermissionKeys()). A garder synchronise
      // avec ce registre, source unique de verite des permissions BO.
      'mutations.read', 'mutations.write',
      'commissions.read', 'commissions.write', 'commissions.pay',
      'dashboard.read',
      'dashboard.kpi.total_acteurs', 'dashboard.kpi.actifs', 'dashboard.kpi.volume',
      'dashboard.kpi.suspendus', 'dashboard.kpi.attente', 'dashboard.kpi.transactions',
      'dashboard.kpi.zones',
      'dashboard.live', 'dashboard.inscriptions', 'dashboard.repartition',
      'dashboard.acces_rapide', 'dashboard.objectifs',
      // Panneaux dashboard additionnels (cf. config/bo-permissions.ts).
      'dashboard.activite_region', 'dashboard.alertes', 'dashboard.perf_identificateurs',
      'dashboard.qualite_donnees', 'dashboard.activite_directe', 'dashboard.sante_systeme',
    ];

    const invalid = Object.keys(body.bo_permissions).filter(
      k => !ALLOWED_PERMISSIONS.includes(k)
    );
    if (invalid.length > 0) {
      throw new BadRequestException(`Permissions invalides : ${invalid.join(', ')}`);
    }

    const targetUser = await this.usersService.findOne(id);
    if (!targetUser) throw new NotFoundException('Utilisateur introuvable');

    await this.usersService.update(id, { boPermissions: body.bo_permissions } as any, req.user.id, req.ip);

    return { success: true, message: 'Permissions mises à jour', bo_permissions: body.bo_permissions };
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { success: true, message: 'Utilisateur archivé' };
  }

  @Post(':id/admin-reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async adminResetPassword(@Param('id') id: string, @Request() req: any) {
    return this.usersService.adminResetPassword(id, req.user?.userId ?? req.user?.id);
  }
}