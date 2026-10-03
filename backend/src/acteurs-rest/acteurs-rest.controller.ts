import { paginate, parsePagination, buildMeta } from '../common/paginate';
import { Controller, Get, Patch, Body, Param, UseGuards, Query, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { stripSensitiveUserFields } from '../users/sanitize-user.util';
import {
  CHAMPS_AUTHENTIFICATION, CHAMPS_RESERVES_SUPER_ADMIN, exigerAutoriteSur, exigerPermissionBO,
} from '../auth/bo-autorisation';

// Champs de profil modifiables par un admin via PATCH /acteurs/:id (même
// périmètre que PATCH /users/:id, hors champs réservés et téléphone).
const CHAMPS_PROFIL = [
  'firstName', 'lastName', 'email', 'region', 'commune', 'activity', 'market', 'photoUrl',
  'objectifMensuel', 'primeObjectif', 'zoneId', 'typePointVente', 'typePointVenteAutre',
  'districtId', 'districtAutre', 'regionId', 'regionAutre', 'departementId', 'departementAutre',
  'communeId', 'communeAutre', 'quartierVillage', 'nin', 'nationalite', 'situationMatrimoniale',
  'numCNPS', 'numCMU', 'recepisse', 'dateNaissance', 'lieuNaissance', 'estMembreCooperative',
  'boitePostale', 'statutEntrepreneur', 'categorie', 'genre', 'appellation', 'cooperativeName',
  'institutionName',
];

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin_general')
@Controller('acteurs')
export class ActeursRestController {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  @Get()
  async findAll(@Query() query: any) {
    const { page, limit, search, order } = parsePagination(query);
    const skip = (page - 1) * limit;
    const qb = this.repo.createQueryBuilder('a');
    if (search) {
      qb.where("CONCAT(a.firstName, ' ', a.lastName) ILIKE :s OR a.phone ILIKE :s", { s: `%${search}%` });
    }
    qb.orderBy('a.createdAt', order).skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();
    // Sécurité : ne jamais sérialiser l'entité User brute (passwordHash,
    // pinCodeHash, credentials WebAuthn...) — cf. sanitize-user.util.ts.
    return { data: data.map((u) => stripSensitiveUserFields(u as any)), meta: buildMeta(page, limit, total) };
  }

  @Get(':id')
  @Roles('super_admin', 'admin_general', 'identificateur')
  async findOne(@Param('id') id: string) {
    const user = await this.repo.findOne({ where: { id } });
    return user ? stripSensitiveUserFields(user as any) : null;
  }

  // BO-0 / S3 + J6 : liste BLANCHE (l'ancienne liste noire laissait écrire
  // boPermissions, phone ou webauthnCredentials sur n'importe quel compte,
  // super_admin compris). Seul le super_admin gère les comptes du back-office
  // et les champs réservés ; les champs d'authentification ne s'écrivent
  // jamais par cette route.
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: User) {
    const cible = await this.repo.findOne({ where: { id } });
    if (!cible) throw new NotFoundException('Acteur introuvable');
    const estSuper = currentUser.role === ('super_admin' as any);
    const estSoi = currentUser.id === id;
    if (!estSoi) exigerAutoriteSur(currentUser, cible);

    const present = (k: string) => body?.[k] !== undefined;
    if (CHAMPS_AUTHENTIFICATION.some(present)) {
      throw new ForbiddenException('Champs d\'authentification non modifiables par cette route');
    }
    if (!estSuper && [...CHAMPS_RESERVES_SUPER_ADMIN, 'phone'].some(present)) {
      throw new ForbiddenException('Modification réservée au super_admin');
    }
    if (!estSoi) exigerPermissionBO(currentUser, 'acteurs.write');

    const autorises = estSuper ? [...CHAMPS_PROFIL, ...CHAMPS_RESERVES_SUPER_ADMIN, 'phone'] : CHAMPS_PROFIL;
    const sanitized: any = {};
    for (const key of autorises) {
      if (present(key)) sanitized[key] = body[key];
    }
    if (Object.keys(sanitized).length === 0) return { success: true };
    return this.repo.update(id, sanitized);
  }
}
