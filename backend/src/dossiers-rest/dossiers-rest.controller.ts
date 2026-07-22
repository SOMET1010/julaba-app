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
    const dossier = this.repo.create({
      acteur_id: body.acteur_id,
      identificateur_id: user.id,
      zone_id: body.zone_id || null,
      statut: 'en_cours',
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
    const CHAMPS_AUTORISES = ['statut', 'notes', 'commentaire', 'date_validation'];
    const safeBody = Object.fromEntries(
      Object.entries(body).filter(([k]) => CHAMPS_AUTORISES.includes(k))
    );
    const result = await this.repo.update(id, safeBody);
    if (result.affected === 0) throw new NotFoundException('Dossier introuvable');
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
