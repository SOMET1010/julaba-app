import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DGE-04 — LES 4 LISTES JOINTES du docx officiel (« par coopérative / zone /
 * marché »), audit DGE 20/10 : aucune d'elles n'était requêtable — pas de clé
 * coopérative sur marches (voir migration 1782300000020), GET
 * /cooperatives/membres résolvent UNIQUEMENT la coop de l'appelant, et la
 * jointure producteur↔coopérative n'existait pas (addMembre réservé aux
 * marchands — ouvert aux producteurs dans le même lot).
 *
 * Quatre lectures groupées, rôles comptes BO (la DGE opère via les comptes
 * BO, arbitrage A-03) :
 *  - GET /admin/groupes/marches?cooperative_id=       → marchés d'une coopérative
 *  - GET /admin/groupes/membres?cooperative_id=[role] → adhérents d'une coopérative
 *  - GET /admin/groupes/identificateurs?zone_id&marche_id → identificateurs par zone puis marché
 *  - GET /admin/groupes/producteurs?cooperative_id=   → producteurs d'une coopérative
 *
 * Lecture seule, sanitisation des colonnes sensibles (jamais de
 * password_hash dans une liste).
 */
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/groupes')
export class AdminGroupesController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private exigerUuid(valeur: string | undefined, nom: string): string {
    if (!valeur || !UUID_RE.test(valeur)) {
      throw new BadRequestException(`${nom} est obligatoire et doit être un uuid`);
    }
    return valeur;
  }

  @Get('marches')
  async marchesParCooperative(@Query('cooperative_id') cooperativeId?: string) {
    const id = this.exigerUuid(cooperativeId, 'cooperative_id');
    const rows = await this.dataSource.query(
      `SELECT m.id::text, m.nom, m.type, m.commune, m.statut, m.actif,
              m.latitude, m.longitude, m.cooperative_id::text,
              c.nom AS cooperative_nom
         FROM marches m
         LEFT JOIN cooperatives c ON c.id::text = m.cooperative_id::text
        WHERE m.cooperative_id::text = $1
        ORDER BY m.nom ASC`,
      [id],
    );
    return { data: rows, total: rows.length };
  }

  @Get('membres')
  async membresParCooperative(@Query('cooperative_id') cooperativeId?: string, @Query('role') role?: string) {
    const id = this.exigerUuid(cooperativeId, 'cooperative_id');
    const rolesOk = ['marchand', 'producteur', 'cooperateur'];
    const conditions: string[] = ['cm.cooperative_id::text = $1', 'cm.actif = true'];
    const params: unknown[] = [id];
    if (role) {
      if (!rolesOk.includes(role)) throw new BadRequestException('role invalide');
      conditions.push('u.role = $2');
      params.push(role);
    }
    const rows = await this.dataSource.query(
      `SELECT cm.id::text AS adhesion_id, cm.statut AS statut_adhesion, cm.role AS role_membre,
              cm.date_adhesion, cm.cotisation_payee,
              u.id::text AS membre_id, u.first_name, u.last_name, u.phone, u.role, u.region
         FROM cooperative_membres cm
         JOIN users u ON u.id::text = cm.membre_id::text
        WHERE ${conditions.join(' AND ')}
        ORDER BY cm.date_adhesion ASC NULLS LAST, u.last_name ASC`,
      params,
    );
    return { data: rows, total: rows.length };
  }

  @Get('identificateurs')
  async identificateursParZoneMarche(@Query('zone_id') zoneId?: string, @Query('marche_id') marcheId?: string) {
    const conditions: string[] = ["u.role = 'identificateur'"];
    const params: unknown[] = [];
    let p = 1;
    if (zoneId) {
      if (!UUID_RE.test(zoneId)) throw new BadRequestException('zone_id doit être un uuid');
      conditions.push(`u.zone_id::text = $${p}`);
      params.push(zoneId);
      p += 1;
    }
    if (marcheId) {
      if (!UUID_RE.test(marcheId)) throw new BadRequestException('marche_id doit être un uuid');
      conditions.push(`u.marche_id::text = $${p}`);
      params.push(marcheId);
      p += 1;
    }
    const rows = await this.dataSource.query(
      `SELECT u.id::text, u.first_name, u.last_name, u.phone, u.status,
              u.zone_id::text, u.marche_id::text,
              z.nom AS zone_nom, m.nom AS marche_nom,
              (SELECT COUNT(*) FROM identifications i WHERE i.identificateur_id::text = u.id::text) AS dossiers_soumis
         FROM users u
         LEFT JOIN zones z ON z.id::text = u.zone_id::text
         LEFT JOIN marches m ON m.id::text = u.marche_id::text
        WHERE ${conditions.join(' AND ')}
        ORDER BY u.last_name ASC`,
      params,
    );
    return { data: rows, total: rows.length };
  }

  @Get('producteurs')
  async producteursParCooperative(@Query('cooperative_id') cooperativeId?: string) {
    const id = this.exigerUuid(cooperativeId, 'cooperative_id');
    const rows = await this.dataSource.query(
      `SELECT u.id::text AS membre_id, u.first_name, u.last_name, u.phone, u.region,
              cm.date_adhesion, cm.cotisation_payee,
              (SELECT COUNT(*) FROM recoltes r WHERE r.user_id::text = u.id::text) AS recoltes
         FROM cooperative_membres cm
         JOIN users u ON u.id::text = cm.membre_id::text
        WHERE cm.cooperative_id::text = $1 AND cm.actif = true AND u.role = 'producteur'
        ORDER BY u.last_name ASC`,
      [id],
    );
    return { data: rows, total: rows.length };
  }
}
