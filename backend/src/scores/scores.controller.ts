import { parsePagination, buildMeta } from '../common/paginate';
import { Controller, Get, Logger, Query, UseGuards, Request } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scores')
export class ScoresController {
  private readonly logger = new Logger(ScoresController.name);
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  @Roles('super_admin', 'admin', 'institution')
  async findAll(@Query() query: any) {
    const { page, limit } = parsePagination(query);
    const skip = (page - 1) * limit;
    const [users, total] = await this.userRepo.findAndCount({ select: ['id', 'firstName', 'lastName', 'role', 'phone'], skip, take: limit });
    const data = users.map(u => ({ userId: u.id, nom: `${u.firstName} ${u.lastName}`, role: u.role, score: 0, niveau: 1 }));
    return { data, meta: buildMeta(page, limit, total) };
  }

  @Get('me')
  async myScore(@Request() req: any) {
    const userId = req.user.id;
    let user: User | null;
    try {
      user = await this.userRepo.findOne({ where: { id: userId } });
    } catch (e: any) {
      this.logger.error(`[SCORES] findOne user failed: ${e?.message}`);
      return { userId, score: { score_total: 0 } };
    }
    if (!user) {
      return { userId, score: { score_total: 0 } };
    }

    const role = user.role as string;
    const supervisionRoles = ['admin', 'super_admin', 'institution'];
    if (supervisionRoles.includes(role)) {
      return {
        userId,
        role,
        roleSupervision: true,
        niveau: 0,
        progression: 0,
        score: { score_total: 0, breakdown: {} },
      };
    }

    const academyRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(score), 0) as total_score, COUNT(*) as nb_completed
       FROM academy_progress
       WHERE user_id = $1 AND completed = true`,
      [userId],
    );
    const academyTotal = parseInt(String(academyRows[0]?.total_score || '0'), 10);
    const academyCount = parseInt(String(academyRows[0]?.nb_completed || '0'), 10);

    const totalModulesRow = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM academy_modules WHERE statut = 'publie' AND (profil = 'tous' OR profil = $1)`,
      [role],
    );
    const totalModules = parseInt(String(totalModulesRow[0]?.count || '0'), 10) || 1;
    const academyMaxScore = totalModules * 100;
    const score_academy =
      academyMaxScore > 0 ? Math.min(Math.round((academyTotal / academyMaxScore) * 25), 25) : 0;

    let breakdown: Record<string, number> = {};
    let score_total = 0;

    if (role === 'marchand') {
      const [ventesRow] = await this.dataSource.query(
        `SELECT COUNT(*)::int as count, COALESCE(SUM(montant), 0) as volume
         FROM caisse_transactions
         WHERE user_id = $1 AND type = 'vente'
         AND created_at >= NOW() - INTERVAL '30 days'`,
        [userId],
      );
      const [joursRow] = await this.dataSource.query(
        `SELECT COUNT(DISTINCT DATE(created_at))::int as jours
         FROM caisse_transactions
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [userId],
      );
      const ventesCount = parseInt(String(ventesRow?.count ?? '0'), 10);
      const volumeTotal = parseFloat(String(ventesRow?.volume ?? '0'));
      const joursActifs = parseInt(String(joursRow?.jours ?? '0'), 10);

      const score_ventes = Math.min(Math.round((ventesCount / 30) * 30), 30);
      const score_regularite = Math.min(Math.round((joursActifs / 30) * 25), 25);
      const score_volume = Math.min(Math.round((volumeTotal / 1000000) * 20), 20);
      breakdown = { score_ventes, score_regularite, score_volume, score_academy };
      score_total = score_ventes + score_regularite + score_volume + score_academy;
    } else if (role === 'producteur') {
      // recoltes: quantite (pas quantite_kg), unite, user_id, created_at
      let recoltesCount = 0;
      let volumeKg = 0;
      let joursActifs = 0;
      try {
        const [recoltesRow] = await this.dataSource.query(
          `SELECT COUNT(*)::int as count,
                  COALESCE(SUM(
                    CASE
                      WHEN LOWER(TRIM(COALESCE(unite::text, ''))) IN ('kg', 'kgs', 'kilogramme', 'kilogrammes', '')
                        OR unite IS NULL THEN quantite::numeric
                      ELSE 0
                    END
                  ), 0) as volume_kg,
                  COUNT(DISTINCT DATE(created_at))::int as jours
           FROM recoltes
           WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
          [userId],
        );
        recoltesCount = parseInt(String(recoltesRow?.count ?? '0'), 10);
        volumeKg = parseFloat(String(recoltesRow?.volume_kg ?? '0'));
        joursActifs = parseInt(String(recoltesRow?.jours ?? '0'), 10);
      } catch (e: any) {
        this.logger.warn(`[SCORES] recoltes: ${e?.message}`);
        // FALLBACK: colonne absente (quantite/unite/created_at) ou table recoltes
        try {
          const [fallbackRow] = await this.dataSource.query(
            `SELECT COUNT(*)::int as count, COALESCE(SUM(quantite::numeric), 0) as volume_kg,
                    COUNT(DISTINCT DATE(created_at))::int as jours
             FROM recoltes WHERE user_id = $1`,
            [userId],
          );
          recoltesCount = parseInt(String(fallbackRow?.count ?? '0'), 10);
          volumeKg = parseFloat(String(fallbackRow?.volume_kg ?? '0'));
          joursActifs = parseInt(String(fallbackRow?.jours ?? '0'), 10);
        } catch (e: any) {
          this.logger.warn(`[SCORES] recoltes_fallback: ${e?.message}`);
          // FALLBACK: SUM/created_at impossible — score_volume = 0
          recoltesCount = 0;
          volumeKg = 0;
          joursActifs = 0;
        }
      }

      const score_recoltes = Math.min(Math.round((recoltesCount / 30) * 30), 30);
      const score_regularite = Math.min(Math.round((joursActifs / 30) * 25), 25);
      const score_volume = Math.min(Math.round((volumeKg / 5000) * 20), 20);
      breakdown = { score_recoltes, score_regularite, score_volume, score_academy };
      score_total = score_recoltes + score_regularite + score_volume + score_academy;
    } else if (role === 'cooperateur') {
      let coopActivity = 0;
      let joursActifs = 0;
      try {
        const [coopRow] = await this.dataSource.query(
          `WITH user_coops AS (
             SELECT id AS cid FROM cooperatives WHERE responsable_id = $1
             UNION
             SELECT cooperative_id AS cid FROM cooperative_membres WHERE membre_id = $1
           )
           SELECT
             (SELECT COUNT(*)::int FROM cooperative_membres WHERE cooperative_id IN (SELECT cid FROM user_coops)) as membres_count,
             (SELECT COUNT(*)::int FROM cooperative_besoins
              WHERE cooperative_id IN (SELECT cid FROM user_coops)
              AND statut IS NOT NULL
              AND LOWER(statut) NOT IN ('en_attente', 'annule', 'annulé')) as besoins_traites`,
          [userId],
        );
        coopActivity =
          parseInt(String(coopRow?.membres_count ?? '0'), 10) +
          parseInt(String(coopRow?.besoins_traites ?? '0'), 10);
      } catch (e: any) {
        this.logger.warn(`[SCORES] coop_activity: ${e?.message}`);
        // FALLBACK: table cooperative_besoins absente ou colonnes
        try {
          const [coopRow] = await this.dataSource.query(
            `WITH user_coops AS (
               SELECT id AS cid FROM cooperatives WHERE responsable_id = $1
               UNION
               SELECT cooperative_id AS cid FROM cooperative_membres WHERE membre_id = $1
             )
             SELECT COUNT(*)::int as cnt FROM cooperative_membres WHERE cooperative_id IN (SELECT cid FROM user_coops)`,
            [userId],
          );
          coopActivity = parseInt(String(coopRow?.cnt ?? '0'), 10);
        } catch (e: any) {
          this.logger.warn(`[SCORES] coop_activity_fallback: ${e?.message}`);
          coopActivity = 0;
        }
      }
      try {
        const [joursRow] = await this.dataSource.query(
          `WITH user_coops AS (
             SELECT id AS cid FROM cooperatives WHERE responsable_id = $1
             UNION
             SELECT cooperative_id AS cid FROM cooperative_membres WHERE membre_id = $1
           )
           SELECT COUNT(DISTINCT d)::int as jours FROM (
             SELECT DATE(created_at) AS d FROM cooperative_membres
             WHERE cooperative_id IN (SELECT cid FROM user_coops) AND created_at >= NOW() - INTERVAL '30 days'
             UNION
             SELECT DATE(created_at) AS d FROM cooperative_besoins
             WHERE cooperative_id IN (SELECT cid FROM user_coops) AND created_at >= NOW() - INTERVAL '30 days'
           ) t`,
          [userId],
        );
        joursActifs = parseInt(String(joursRow?.jours ?? '0'), 10);
      } catch (e: any) {
        this.logger.warn(`[SCORES] coop_jours: ${e?.message}`);
        // FALLBACK: created_at manquant sur cooperative_besoins ou autre
        try {
          const [joursRow] = await this.dataSource.query(
            `WITH user_coops AS (
               SELECT id AS cid FROM cooperatives WHERE responsable_id = $1
               UNION
               SELECT cooperative_id AS cid FROM cooperative_membres WHERE membre_id = $1
             )
             SELECT COUNT(DISTINCT DATE(created_at))::int as jours
             FROM cooperative_membres
             WHERE cooperative_id IN (SELECT cid FROM user_coops) AND created_at >= NOW() - INTERVAL '30 days'`,
            [userId],
          );
          joursActifs = parseInt(String(joursRow?.jours ?? '0'), 10);
        } catch (e: any) {
          this.logger.warn(`[SCORES] coop_jours_fallback: ${e?.message}`);
          joursActifs = 0;
        }
      }

      const score_membres = Math.min(Math.round((coopActivity / 30) * 30), 30);
      const score_regularite = Math.min(Math.round((joursActifs / 30) * 25), 25);
      const score_volume = 0;
      breakdown = { score_membres, score_regularite, score_volume, score_academy };
      score_total = score_membres + score_regularite + score_volume + score_academy;
    } else if (role === 'identificateur') {
      // Mois courant : pour score_objectif uniquement
      let totalMois = 0;
      try {
        const [moisRow] = await this.dataSource.query(
          `SELECT COUNT(*)::int as total
           FROM identifications
           WHERE (identificateur_id::text = $1::text OR identificateur_id = $1)
           AND created_at >= DATE_TRUNC('month', NOW())`,
          [userId],
        );
        totalMois = parseInt(String(moisRow?.total ?? '0'), 10);
      } catch (e: any) {
        this.logger.warn(`[SCORES] identificateur_mois: ${e?.message}`);
        /* FALLBACK: 0 */
      }

      // Cumulative : pour score_validation (qualité globale)
      let totalCumul = 0;
      let validees = 0;
      try {
        const [cumulRow] = await this.dataSource.query(
          `SELECT COUNT(*)::int as total,
                  COUNT(*) FILTER (WHERE LOWER(statut) IN ('valide', 'validee', 'approuve', 'approuvée', 'approuvee'))::int as validees
           FROM identifications
           WHERE (identificateur_id::text = $1::text OR identificateur_id = $1)`,
          [userId],
        );
        totalCumul = parseInt(String(cumulRow?.total ?? '0'), 10);
        validees = parseInt(String(cumulRow?.validees ?? '0'), 10);
      } catch (e: any) {
        this.logger.warn(`[SCORES] identificateur_cumul: ${e?.message}`);
        /* FALLBACK: 0 */
      }

      // 30 derniers jours glissants : pour zones et régularité
      let zones = 0;
      let joursActifs = 0;
      try {
        const [recentRow] = await this.dataSource.query(
          `SELECT COUNT(DISTINCT commune) FILTER (WHERE commune IS NOT NULL AND TRIM(commune) != '')::int as zones,
                  COUNT(DISTINCT DATE(created_at))::int as jours
           FROM identifications
           WHERE (identificateur_id::text = $1::text OR identificateur_id = $1)
           AND created_at >= NOW() - INTERVAL '30 days'`,
          [userId],
        );
        zones = parseInt(String(recentRow?.zones ?? '0'), 10);
        joursActifs = parseInt(String(recentRow?.jours ?? '0'), 10);
      } catch (e: any) {
        this.logger.warn(`[SCORES] identificateur_recent: ${e?.message}`);
        /* FALLBACK: 0 */
      }

      const objectif = user.objectifMensuel ?? 0;

      const score_objectif = objectif > 0 ? Math.min(Math.round((totalMois / objectif) * 30), 30) : 0;
      const score_validation =
        totalCumul > 0 ? Math.min(Math.round((validees / totalCumul) * 20), 20) : 0;
      const score_zones = Math.min(zones, 15);
      const score_regularite = Math.min(Math.round((joursActifs / 22) * 10), 10);
      breakdown = {
        score_objectif,
        score_validation,
        score_zones,
        score_regularite,
        score_academy,
      };
      score_total =
        score_objectif + score_validation + score_zones + score_regularite + score_academy;
    } else {
      breakdown = { score_academy };
      score_total = score_academy;
    }

    score_total = Math.min(score_total, 100);
    const niveau = score_total >= 90 ? 4 : score_total >= 70 ? 3 : score_total >= 40 ? 2 : 1;
    const progression = score_total;

    const now = new Date().toISOString();

    return {
      userId: user.id,
      role,
      niveau,
      progression,
      score: {
        id: userId,
        user_id: userId,
        score_total,
        breakdown,
        academy: {
          total_score: academyTotal,
          nb_completed: academyCount,
          nb_modules: totalModules,
        },
        created_at: now,
        updated_at: now,
      },
    };
  }
}
