import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Statistiques producteur AUTORITATIVES (calculées en base), pour le tableau de
 * bord. Remplace le calcul client de ProducteurContext.getStats() qui était
 * faux : « Récoltes du jour » affichait `recoltes.length` (un COMPTE) en kg, et
 * `revenusTotal` ne sommait que les récoltes 'vendue' (jamais atteint) → 0,
 * alors que la page Commandes affichait le vrai chiffre.
 *
 * Sources de vérité :
 *  • Production (kg)  → table `recoltes`, SUM(quantite).
 *  • Revenus (FCFA)   → table `commandes` du vendeur, SUM(total) hors
 *    annulée/litige — identique au filtrage de la page Commandes producteur.
 *
 * Lecture seule, aucun contact portefeuille (règle « argent gelé »).
 */
@UseGuards(JwtAuthGuard)
@Controller('producteur')
export class ProducteurStatsController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get('stats')
  async stats(@CurrentUser() user: User) {
    // Production (kg) — récoltes de ce producteur (total + du jour).
    const [rec] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(quantite), 0)                                                   AS kg_total,
         COALESCE(SUM(CASE WHEN date_recolte = CURRENT_DATE THEN quantite ELSE 0 END), 0) AS kg_jour,
         COUNT(*)                                                                     AS recoltes_count,
         COALESCE(SUM(stock_disponible), 0)                                           AS stock_disponible,
         COALESCE(SUM(stock_vendu), 0)                                                AS stock_vendu
       FROM recoltes
       WHERE user_id = $1`,
      [user.id],
    );

    // Revenus (FCFA) — commandes où ce producteur est vendeur, hors annulée/litige.
    const [rev] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(total), 0)                                                      AS revenus_total,
         COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN total ELSE 0 END), 0) AS revenus_jour,
         COUNT(*) FILTER (WHERE statut IN ('en_attente', 'confirmee', 'en_livraison')) AS commandes_en_cours
       FROM commandes
       WHERE vendeur_id = $1
         AND statut NOT IN ('annulee', 'litige')`,
      [user.id],
    );

    // Publications actives sur le marché.
    const [pub] = await this.dataSource.query(
      `SELECT COUNT(*) AS n
       FROM publications
       WHERE user_id = $1 AND active = true AND statut = 'disponible'`,
      [user.id],
    );

    const n = (v: unknown) => Number(v) || 0;
    return {
      // Production (kg) — jamais un compte.
      recoltesKgTotal: n(rec?.kg_total),
      recoltesKgJour: n(rec?.kg_jour),
      recoltesCount: n(rec?.recoltes_count),
      stockDisponibleKg: n(rec?.stock_disponible),
      stockVenduKg: n(rec?.stock_vendu),
      // Revenus (FCFA) — source de vérité = commandes du vendeur.
      revenusTotal: n(rev?.revenus_total),
      revenusJour: n(rev?.revenus_jour),
      commandesEnCours: n(rev?.commandes_en_cours),
      // Marché.
      publicationsActives: n(pub?.n),
    };
  }
}
