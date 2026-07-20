import { paginate } from '../common/paginate';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Mission } from './mission.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('missions')
export class MissionsController {
  constructor(@InjectRepository(Mission) private repo: Repository<Mission>) {}
  @Get()
  @Roles('super_admin', 'admin', 'institution')
  async findAll(@Query() query: any) {
    return paginate(this.repo, query, { order: { created_at: 'DESC' } as any });
  }
  @Get(':id')
  @Roles('super_admin', 'admin', 'institution')
  findOne(@Param('id') id: string) { return this.repo.findOne({ where: { id } }); }
  @Post()
  @Roles('super_admin')
  create(@Body() body: any) {
    const CHAMPS = ['titre', 'description', 'type', 'statut', 'zone_id', 'date_debut', 'date_fin', 'objectif', 'recompense'];
    const safe = Object.fromEntries(Object.entries(body).filter(([k]) => CHAMPS.includes(k)));
    return this.repo.save(this.repo.create(safe));
  }
  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: any) {
    const CHAMPS = ['titre', 'description', 'type', 'statut', 'zone_id', 'date_debut', 'date_fin', 'objectif', 'recompense'];
    const safe = Object.fromEntries(Object.entries(body).filter(([k]) => CHAMPS.includes(k)));
    const result = await this.repo.update(id, safe);
    if (result.affected === 0) throw new NotFoundException('Mission introuvable');
    return { success: true };
  }
  @Delete(':id')
  @Roles('super_admin')
  async remove(@Param('id') id: string) {
    const result = await this.repo.update(id, { statut: 'supprime' } as any);
    if (result.affected === 0) throw new NotFoundException('Mission introuvable');
    return { success: true };
  }
}
