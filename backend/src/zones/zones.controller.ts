import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  @Roles('ADMIN', 'super_admin', 'identificateur')
  async getAll(@CurrentUser() user: User) {
    // C-11 / GESTZONE-04 : le CA caisse (volumeTotal) ne quitte pas le
    // territoire du gestionnaire_zone — liste restreinte à SA zone
    // (users.zone_id, lien posé à la création des comptes BO). Fail-closed :
    // sans zone attribuée, refus (jamais de vue nationale silencieuse).
    if (user?.role === 'gestionnaire_zone') {
      if (!user.zoneId) {
        throw new ForbiddenException("Votre compte n'est associé à aucune zone : accès refusé");
      }
      return this.zonesService.getZonesWithStats(user.zoneId);
    }
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
