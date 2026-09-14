import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CatalogueMaitreService } from './catalogue-maitre.service';

/**
 * Référentiel maître, côté JULABA.
 *
 * DEUX PORTES, DEUX PUBLICS, DEUX DROITS :
 *
 * - la LECTURE est ouverte à toute marchande connectée. C'est elle qui
 *   cherche « tomate » avant d'adopter une référence. Elle ne lit que le
 *   miroir Postgres : Odoo peut être éteint, la recherche fonctionne ;
 * - la SYNCHRONISATION est réservée aux administrateurs. C'est une opération
 *   d'administration de l'instance, pas un geste de marchande : elle parle à
 *   Odoo et réécrit le référentiel commun à tout le monde.
 *
 * Volontairement HORS du namespace `odoo-poc` et de son `OdooPocEnabledGuard`
 * (qui répond 404 par défaut) : ce n'est plus un POC, c'est le chemin par
 * lequel JULABA connaît les produits. Le namespace `odoo-poc` reste ce qu'il
 * est — un banc d'essai désactivé par défaut.
 */
@Controller('catalogue-maitre')
export class CatalogueMaitreController {
  constructor(private readonly service: CatalogueMaitreService) {}

  /** Recherche par nom ou par référence. Miroir local uniquement. */
  @UseGuards(JwtAuthGuard)
  @Get()
  async rechercher(@Query('q') q?: string, @Query('limit') limit?: string) {
    const references = await this.service.rechercher(q, Number(limit) || 50);
    return { references };
  }

  /** Fraîcheur du miroir, sans interroger Odoo. */
  @UseGuards(JwtAuthGuard)
  @Get('etat')
  async etat() {
    return this.service.etat();
  }

  /**
   * Rafraîchit le miroir depuis Odoo. Administration uniquement.
   *
   * 200 et non 201 : cette route ne crée pas une ressource nouvelle, elle
   * remet le miroir en phase avec sa source.
   */
  @Roles('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('synchroniser')
  @HttpCode(HttpStatus.OK)
  async synchroniser() {
    return this.service.synchroniser();
  }
}
