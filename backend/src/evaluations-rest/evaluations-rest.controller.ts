import { Controller, Get, Post, Body, Param, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

// ── Notation acheteur / vendeur (écart CDC 8.1.5) ────────────────────────────
// On ne peut noter QUE la contrepartie d'une commande LIVRÉE à laquelle on a
// participé (acheteur ou vendeur). Une seule note par commande et par auteur.
@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationsRestController {
  constructor(private dataSource: DataSource) {}

  /** Moyenne + total + dernières notes reçues par un utilisateur (fiche marché). */
  @Get('user/:id')
  async parUtilisateur(@Param('id') id: string) {
    const agg = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total, COALESCE(AVG(note), 0)::numeric(3,2) AS moyenne
       FROM evaluations WHERE cible_id = $1::uuid`,
      [id],
    );
    const rows = await this.dataSource.query(
      `SELECT id, note, commentaire, created_at FROM evaluations
       WHERE cible_id = $1::uuid ORDER BY created_at DESC LIMIT 20`,
      [id],
    );
    return {
      moyenne: Number(agg?.[0]?.moyenne) || 0,
      total: Number(agg?.[0]?.total) || 0,
      evaluations: rows,
    };
  }

  /** Est-ce que l'utilisateur courant a déjà noté cette commande ? */
  @Get('commande/:id/mine')
  async maNote(@Param('id') commandeId: string, @CurrentUser() user: User) {
    const rows = await this.dataSource.query(
      `SELECT id, note, commentaire FROM evaluations
       WHERE commande_id = $1::uuid AND auteur_id = $2::uuid LIMIT 1`,
      [commandeId, user.id],
    );
    return { evaluee: rows.length > 0, evaluation: rows[0] || null };
  }

  /** Crée une note pour la contrepartie d'une commande livrée. */
  @Post()
  async noter(
    @Body() body: { commande_id?: string; note?: number; commentaire?: string },
    @CurrentUser() user: User,
  ) {
    const commandeId = String(body?.commande_id || '').trim();
    const note = Number(body?.note);
    if (!commandeId) throw new BadRequestException('commande_id requis');
    if (!Number.isInteger(note) || note < 1 || note > 5) {
      throw new BadRequestException('Note invalide (1 à 5)');
    }

    const cmdRows = await this.dataSource.query(
      `SELECT id, acheteur_id, vendeur_id, statut FROM commandes WHERE id = $1::uuid LIMIT 1`,
      [commandeId],
    );
    const cmd = cmdRows?.[0];
    if (!cmd) throw new BadRequestException('Commande introuvable');

    // Seule une commande livrée peut être notée.
    if (String(cmd.statut).toLowerCase() !== 'livree') {
      throw new ForbiddenException('La commande doit être livrée pour être notée');
    }

    // L'auteur doit être partie prenante ; la cible est l'autre partie.
    let cibleId: string | null = null;
    if (cmd.acheteur_id === user.id) cibleId = cmd.vendeur_id;
    else if (cmd.vendeur_id === user.id) cibleId = cmd.acheteur_id;
    if (!cibleId) throw new ForbiddenException("Vous n'avez pas participé à cette commande");

    try {
      const inserted = await this.dataSource.query(
        `INSERT INTO evaluations (commande_id, auteur_id, cible_id, note, commentaire)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
         RETURNING id, note, commentaire, created_at`,
        [commandeId, user.id, cibleId, note, body?.commentaire?.slice(0, 500) || null],
      );
      return { success: true, evaluation: inserted[0] };
    } catch (e: any) {
      // Violation d'unicité → déjà noté
      if (String(e?.message || '').includes('ux_evaluations_cmd_auteur')) {
        throw new ForbiddenException('Vous avez déjà noté cette commande');
      }
      throw new BadRequestException(e?.message || 'Erreur lors de la notation');
    }
  }
}
