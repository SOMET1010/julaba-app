import { paginate } from '../common/paginate';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Request, BadRequestException } from '@nestjs/common';
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
  @Get()
  @Roles('super_admin', 'admin', 'institution')
  async findAll(@Query() query: any) {
    return paginate(this.repo, query, { order: { created_at: 'DESC' } as any });
  }
  @Get(':id')
  @Roles('super_admin', 'admin', 'institution')
  findOne(@Param('id') id: string) { return this.repo.findOne({ where: { id } }); }
  @Post()
  @Roles('super_admin', 'admin')
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
  @Roles('super_admin', 'admin')
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
