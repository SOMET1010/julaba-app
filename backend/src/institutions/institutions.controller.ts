import { paginate } from '../common/paginate';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Request, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Institution } from './institution.entity';
import { AuditService } from '../audit/audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('institutions')
export class InstitutionsController {
  constructor(
    @InjectRepository(Institution) private repo: Repository<Institution>,
    private readonly auditService: AuditService,
  ) {}

  // Isolement inter-institutions (correctif audit securite/vie privee) : un
  // compte institution ne doit voir QUE sa propre fiche institution (celle
  // dont il est `responsable_id`), jamais la liste complete. Avant ce
  // correctif, `@Roles('institution')` laissait passer un GET non filtre sur
  // TOUTES les institutions. super_admin/admin_general gardent la vue
  // complete inchangee.
  @Get()
  @Roles('super_admin', 'admin_general', 'institution')
  async findAll(@Query() query: any, @Request() req: any) {
    if (req?.user?.role === 'institution') {
      return paginate(this.repo, query, {
        where: { responsable_id: req.user.id } as any,
        order: { created_at: 'DESC' } as any,
      });
    }
    return paginate(this.repo, query, { order: { created_at: 'DESC' } as any });
  }

  @Get(':id')
  @Roles('super_admin', 'admin_general', 'institution')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const institution = await this.repo.findOne({ where: { id } });
    if (req?.user?.role === 'institution') {
      if (!institution || institution.responsable_id !== req.user.id) {
        // 404 plutot que 403 : ne pas confirmer l'existence d'une institution
        // tierce a un compte qui n'en a pas la responsabilite.
        throw new NotFoundException('Institution introuvable');
      }
    }
    return institution;
  }
  @Post()
  @Roles('super_admin', 'admin_general')
  async create(@Body() body: any, @Request() req: any) {
    const allowed = ['nom', 'type', 'description', 'adresse', 'telephone', 'email', 'logo', 'statut', 'zone_id', 'modules'];
    const safeBody = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (safeBody.modules !== undefined) {
      if (typeof safeBody.modules !== 'object' || safeBody.modules === null || Array.isArray(safeBody.modules)) {
        throw new BadRequestException('modules doit être un objet JSON');
      }
    }
    const entity = this.repo.create(safeBody as any);
    const saved = await this.repo.save(entity) as unknown as Institution;
    if (safeBody.modules !== undefined) {
      await this.auditService.log({
        userId: req?.user?.id ?? null,
        action: 'UPDATE_INSTITUTION_MODULES',
        entite: 'institution',
        entiteId: saved.id,
        details: { modules: safeBody.modules },
      });
    }
    return saved;
  }
  @Patch(':id')
  @Roles('super_admin', 'admin_general')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const allowed = ['nom', 'type', 'description', 'adresse', 'telephone', 'email', 'logo', 'statut', 'zone_id', 'modules'];
    const safeBody = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (safeBody.modules !== undefined) {
      if (typeof safeBody.modules !== 'object' || safeBody.modules === null || Array.isArray(safeBody.modules)) {
        throw new BadRequestException('modules doit être un objet JSON');
      }
    }
    await this.repo.update(id, safeBody);
    if (safeBody.modules !== undefined) {
      await this.auditService.log({
        userId: req?.user?.id ?? null,
        action: 'UPDATE_INSTITUTION_MODULES',
        entite: 'institution',
        entiteId: id,
        details: { modules: safeBody.modules },
      });
    }
    return this.repo.findOne({ where: { id } });
  }
  @Delete(':id')
  @Roles('super_admin')
  remove(@Param('id') id: string) { return this.repo.update(id, { statut: 'supprime' } as any); }
}
