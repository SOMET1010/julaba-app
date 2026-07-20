import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  @Roles('ADMIN', 'super_admin', 'identificateur')
  getAll() {
    return this.zonesService.getZonesWithStats();
  }

  @Get('territoires')
  @Roles('ADMIN', 'super_admin')
  getTerritoires() {
    return this.zonesService.getTerritoires();
  }

  @Get('villes')
  @Roles('ADMIN', 'super_admin')
  getVilles() {
    return this.zonesService.getVilles();
  }

  @Get('public/:id')
  getPublicZone(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'super_admin')
  create(@Body() body: {
    nom: string;
    ville: string;
    region: string;
    gestionnaire?: string;
    marches?: string[];
  }) {
    return this.zonesService.createZoneAvecMarches(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'super_admin')
  async update(@Param('id') id: string, @Body() body: {
    nom?: string;
    ville?: string;
    region?: string;
    actif?: boolean;
    gestionnaire?: string;
  }) {
    return this.zonesService.updateZone(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'super_admin')
  async remove(@Param('id') id: string) {
    return this.zonesService.deleteZone(id);
  }
}
