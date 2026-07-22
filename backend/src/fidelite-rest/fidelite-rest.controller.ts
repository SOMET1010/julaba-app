import { Controller, Get, Put, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

// ── Programme de fidélité paramétrable (écart CDC 8.1.2) ─────────────────────
// Chaque marchand définit son barème (points par 100 FCFA, seuil de récompense,
// valeur de la remise) et suit les points de ses clients par numéro de téléphone.
// Tout est scopé au marchand connecté.

const DEFAUT = { actif: false, points_par_cent: 1, seuil_points: 100, recompense_fcfa: 1000 };

function normaliserTel(tel: string): string {
  return String(tel || '').replace(/\s+/g, '').replace(/[^0-9+]/g, '');
}

@UseGuards(JwtAuthGuard)
@Controller('fidelite')
export class FideliteRestController {
  constructor(private dataSource: DataSource) {}

  private async lireConfig(marchandId: string) {
    const rows = await this.dataSource.query(
      `SELECT actif, points_par_cent, seuil_points, recompense_fcfa FROM fidelite_config WHERE marchand_id = $1::uuid LIMIT 1`,
      [marchandId],
    );
    const c = rows?.[0];
    return {
      actif: c ? !!c.actif : DEFAUT.actif,
      points_par_cent: Number(c?.points_par_cent ?? DEFAUT.points_par_cent),
      seuil_points: Number(c?.seuil_points ?? DEFAUT.seuil_points),
      recompense_fcfa: Number(c?.recompense_fcfa ?? DEFAUT.recompense_fcfa),
    };
  }

  @Get('config')
  async getConfig(@CurrentUser() user: User) {
    return { config: await this.lireConfig(user.id) };
  }

  @Put('config')
  async setConfig(@Body() body: any, @CurrentUser() user: User) {
    const actif = !!body?.actif;
    const ppc = Math.max(0, Number(body?.points_par_cent) || 0);
    const seuil = Math.max(1, Number(body?.seuil_points) || 1);
    const recompense = Math.max(0, Number(body?.recompense_fcfa) || 0);
    await this.dataSource.query(
      `INSERT INTO fidelite_config (marchand_id, actif, points_par_cent, seuil_points, recompense_fcfa, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, now())
       ON CONFLICT (marchand_id) DO UPDATE SET
         actif = EXCLUDED.actif, points_par_cent = EXCLUDED.points_par_cent,
         seuil_points = EXCLUDED.seuil_points, recompense_fcfa = EXCLUDED.recompense_fcfa, updated_at = now()`,
      [user.id, actif, ppc, seuil, recompense],
    );
    return { config: await this.lireConfig(user.id) };
  }

  /** Fiche fidélité d'un client (par téléphone) + barème courant. */
  @Get('client')
  async getClient(@Query('tel') tel: string, @CurrentUser() user: User) {
    const telephone = normaliserTel(tel);
    if (!telephone) throw new BadRequestException('Numéro requis');
    const rows = await this.dataSource.query(
      `SELECT id, telephone, nom, points, total_achats FROM fidelite_clients
       WHERE marchand_id = $1::uuid AND telephone = $2 LIMIT 1`,
      [user.id, telephone],
    );
    const config = await this.lireConfig(user.id);
    return { client: rows?.[0] || null, config };
  }

  /** Liste des clients fidélité (classés par points). */
  @Get('clients')
  async listClients(@CurrentUser() user: User) {
    const rows = await this.dataSource.query(
      `SELECT id, telephone, nom, points, total_achats FROM fidelite_clients
       WHERE marchand_id = $1::uuid ORDER BY points DESC, total_achats DESC LIMIT 100`,
      [user.id],
    );
    return { clients: rows, config: await this.lireConfig(user.id) };
  }

  /** Enregistre un achat → crédite les points selon le barème. */
  @Post('gagner')
  async gagner(@Body() body: any, @CurrentUser() user: User) {
    const telephone = normaliserTel(body?.telephone);
    const montant = Math.max(0, Number(body?.montant) || 0);
    if (!telephone) throw new BadRequestException('Numéro requis');
    if (!(montant > 0)) throw new BadRequestException('Montant invalide');
    const config = await this.lireConfig(user.id);
    const pointsGagnes = Math.floor((montant / 100) * config.points_par_cent);

    const rows = await this.dataSource.query(
      `INSERT INTO fidelite_clients (marchand_id, telephone, nom, points, total_achats, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, now())
       ON CONFLICT (marchand_id, telephone) DO UPDATE SET
         nom = COALESCE(NULLIF($3, ''), fidelite_clients.nom),
         points = fidelite_clients.points + $4,
         total_achats = fidelite_clients.total_achats + $5,
         updated_at = now()
       RETURNING id, telephone, nom, points, total_achats`,
      [user.id, telephone, String(body?.nom || '').slice(0, 160), pointsGagnes, montant],
    );
    const client = rows[0];
    return {
      success: true,
      pointsGagnes,
      client,
      recompenseDisponible: Number(client.points) >= config.seuil_points && config.recompense_fcfa > 0,
      config,
    };
  }

  /** Utilise la récompense : déduit le seuil de points, renvoie la remise à appliquer. */
  @Post('utiliser')
  async utiliser(@Body() body: any, @CurrentUser() user: User) {
    const telephone = normaliserTel(body?.telephone);
    if (!telephone) throw new BadRequestException('Numéro requis');
    const config = await this.lireConfig(user.id);
    const rows = await this.dataSource.query(
      `SELECT id, points FROM fidelite_clients WHERE marchand_id = $1::uuid AND telephone = $2 LIMIT 1`,
      [user.id, telephone],
    );
    const client = rows?.[0];
    if (!client) throw new BadRequestException('Client introuvable');
    if (Number(client.points) < config.seuil_points) {
      throw new BadRequestException('Points insuffisants pour la récompense');
    }
    const updated = await this.dataSource.query(
      `UPDATE fidelite_clients SET points = points - $1, updated_at = now()
       WHERE id = $2::uuid RETURNING id, telephone, nom, points, total_achats`,
      [config.seuil_points, client.id],
    );
    return { success: true, remise: config.recompense_fcfa, client: updated[0], config };
  }
}
