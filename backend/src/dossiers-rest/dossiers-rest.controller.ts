import { paginate } from '../common/paginate';
import { Controller, Get, Patch, Body, Param, UseGuards, Query, Post, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Identification } from '../identifications/identification.entity';
import { User } from '../users/entities/user.entity';
import { aPermissionBO } from '../auth/bo-autorisation';
import { exigerTransitionStatut } from '../identifications/statuts-identification';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('identificateur', 'admin_general', 'super_admin')
@Controller('dossiers')
export class DossiersRestController {
  constructor(
    @InjectRepository(Identification) private repo: Repository<Identification>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}
  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    if (!body.acteur_id || typeof body.acteur_id !== 'string' || !body.acteur_id.trim()) {
      throw new BadRequestException('acteur_id requis');
    }
    // DGE-09 / IDENT-07 (20/10/2026) : le dossier naît dans le SEUL état
    // d'entrée que connaît la machine à états C-12 (statuts-identification.ts) :
    // `en_attente`. L'ancien `en_cours` est un statut LEGACY hors mappe — un
    // dossier ainsi créé était immuable côté statut (409 à la première
    // transition) et illisible pour l'écran Suivi. Comme partout ailleurs
    // (POST /identifications, create-with-acteur), le client ne choisit jamais
    // le statut : `body.statut` est ignoré.
    const dossier = this.repo.create({
      acteur_id: body.acteur_id,
      identificateur_id: user.id,
      zone_id: body.zone_id || null,
      statut: 'en_attente',
      notes: body.notes || null,
    } as any);
    return this.repo.save(dossier);
  }

  @Get()
  async findAll(@Query() query: any, @CurrentUser() user: User) {
    const where =
      user.role === 'identificateur'
        ? ({ identificateur_id: user.id } as any)
        : undefined;
    return paginate(this.repo, query, { where, order: { created_at: 'DESC' } as any });
  }
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const identification = await this.repo.findOne({ where: { id } });
    if (!identification) throw new NotFoundException('Dossier introuvable');
    if (user.role === 'identificateur' && identification.identificateur_id !== user.id) {
      throw new ForbiddenException('Accès refusé');
    }
    return identification;
  }
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const identification = await this.repo.findOne({ where: { id } });
    if (!identification) throw new NotFoundException('Dossier introuvable');
    if (user.role === 'identificateur' && identification.identificateur_id !== user.id) {
      throw new ForbiddenException('Accès refusé');
    }
    // C-12 (19/10/2026) : même verrou que PATCH /identifications/:id — sans
    // quoi cette route (non appelée par le front) resterait un contournement
    // complet de la machine à états : le propriétaire du dossier pourrait
    // s'auto-approuver ET basculer users.validated par appel API direct.
    const peutValider = aPermissionBO(user, 'enrolement.validate');
    if (body?.statut !== undefined && body?.statut !== null && !peutValider) {
      throw new ForbiddenException(
        "Le statut d'un dossier d'identification ne peut être modifié que par un agent habilité (permission enrolement.validate). Le propriétaire du dossier ne peut pas s'auto-approuver (C-12).",
      );
    }
    const CHAMPS_AUTORISES = ['statut', 'notes', 'commentaire', 'date_validation'];
    const safeBody = Object.fromEntries(
      Object.entries(body).filter(([k]) => CHAMPS_AUTORISES.includes(k))
    );
    // Machine à états serveur (C-12) : transition hors mappe ou statut actuel
    // inconnu → 409. Réécrire la même valeur est un no-op autorisé.
    const ancienStatut = String(identification.statut ?? '');
    const statutDemandeDossier: string | undefined =
      typeof body?.statut === 'string' && body.statut.trim() !== '' ? body.statut.trim() : undefined;
    if (statutDemandeDossier) {
      exigerTransitionStatut(ancienStatut, statutDemandeDossier);
      safeBody.statut = statutDemandeDossier;
    } else {
      delete safeBody.statut;
    }
    const statutEffectif: string | null = statutDemandeDossier ?? null;
    // Mise à jour + entrée d'audit DANS la même transaction (motif
    // admin-wallets.service) — l'ancien PATCH n'écrivait AUCUN audit.
    const result = await this.repo.manager.transaction(async (em) => {
      let res: any = { affected: 0 };
      if (Object.keys(safeBody).length > 0) {
        res = await em.update(Identification, id, safeBody);
      }
      if (statutEffectif && statutEffectif !== ancienStatut) {
        await em.query(
          `INSERT INTO audit_logs (user_id, action, entite, entite_id, details) VALUES ($1,$2,'identification',$3,$4)`,
          [
            user?.id ?? null,
            'IDENTIFICATION_STATUT_MODIFIE',
            id,
            JSON.stringify({
              ancien_statut: ancienStatut,
              nouveau_statut: statutEffectif,
              motif: safeBody.commentaire ?? safeBody.notes ?? null,
              source: 'agent_habilite',
              route: 'PATCH /dossiers/:id',
            }),
          ],
        );
      }
      return res;
    });
    if (Object.keys(safeBody).length > 0 && result.affected === 0) throw new NotFoundException('Dossier introuvable');
    // Si validation → activer le compte acteur
    if (safeBody.statut && ['validee', 'valide', 'approuve', 'rejetee', 'rejete'].includes(String(safeBody.statut))) {
      if (identification.acteur_id) {
        const isValid = ['validee', 'valide', 'approuve'].includes(String(safeBody.statut));
        await this.userRepo.query(
          `UPDATE users SET validated = $1 WHERE id::text = $2`,
          [isValid, identification.acteur_id],
        );
      }
    }
    return { success: true };
  }
}
