import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Sujet minimal requis pour calculer le score Jùlaba d'un utilisateur :
 * son id, son rôle (qui détermine la formule appliquée) et, pour les
 * identificateurs, leur objectif mensuel.
 */
export interface ScoreSubject {
  id: string;
  role: string;
  objectifMensuel?: number | null;
}

export interface ScoreResult {
  userId: string;
  role: string;
  niveau: number;
  progression: number;
  score_total: number;
  breakdown: Record<string, number>;
  academy: { total_score: number; nb_completed: number; nb_modules: number };
}

export const SUPERVISION_ROLES = ['admin', 'super_admin', 'institution'];

function toInt(v: unknown): number {
  return parseInt(String(v ?? '0'), 10) || 0;
}
function toFloat(v: unknown): number {
  return parseFloat(String(v ?? '0')) || 0;
}

/**
 * Calcul du score Jùlaba — SOURCE UNIQUE (Constitution §2 : un concept = une
 * seule source de vérité).
 *
 * Toute la logique de scoring (ventes, récoltes, académie, coopérative,
 * identifications) vit ICI, sous forme BATCHÉE : `getScoresForUsers` calcule
 * le score d'un nombre quelconque d'utilisateurs en un nombre CONSTANT de
 * requêtes SQL (regroupées par rôle, `GROUP BY user_id` / `= ANY($1)`),
 * jamais une requête par utilisateur. `GET /scores/me` et
 * `GET /cooperatives/membres` appellent tous les deux cette même méthode
 * (avec un lot d'1 ou de N utilisateurs) : aucun calcul dupliqué.
 */
@Injectable()
export class ScoresService {
  private readonly logger = new Logger(ScoresService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getScoresForUsers(subjects: ScoreSubject[]): Promise<Map<string, ScoreResult>> {
    const results = new Map<string, ScoreResult>();
    if (!subjects.length) return results;

    const now = new Date().toISOString();

    // Rôles de supervision : score neutre, pas de requêtes.
    const scored = subjects.filter((s) => !SUPERVISION_ROLES.includes(s.role));
    for (const s of subjects) {
      if (SUPERVISION_ROLES.includes(s.role)) {
        results.set(s.id, {
          userId: s.id,
          role: s.role,
          niveau: 0,
          progression: 0,
          score_total: 0,
          breakdown: {},
          academy: { total_score: 0, nb_completed: 0, nb_modules: 0 },
        });
      }
    }
    if (!scored.length) return results;

    const allIds = scored.map((s) => s.id);

    const [academyByUser, modulesByProfil] = await Promise.all([
      this.batchAcademyProgress(allIds),
      this.academyModulesByProfil(),
    ]);

    const byRole = new Map<string, ScoreSubject[]>();
    for (const s of scored) {
      const arr = byRole.get(s.role) || [];
      arr.push(s);
      byRole.set(s.role, arr);
    }

    const [marchandData, producteurData, cooperateurData, identificateurData] = await Promise.all([
      this.batchMarchand((byRole.get('marchand') || []).map((s) => s.id)),
      this.batchProducteur((byRole.get('producteur') || []).map((s) => s.id)),
      this.batchCooperateur((byRole.get('cooperateur') || []).map((s) => s.id)),
      this.batchIdentificateur((byRole.get('identificateur') || []).map((s) => s.id)),
    ]);

    for (const s of scored) {
      const tousCount = toInt(modulesByProfil.get('tous'));
      const roleCount = toInt(modulesByProfil.get(s.role));
      const totalModules = tousCount + roleCount || 1;
      const academy = academyByUser.get(s.id) || { total_score: 0, nb_completed: 0 };
      const academyMaxScore = totalModules * 100;
      const score_academy =
        academyMaxScore > 0 ? Math.min(Math.round((academy.total_score / academyMaxScore) * 25), 25) : 0;

      let breakdown: Record<string, number> = {};
      let score_total = 0;

      if (s.role === 'marchand') {
        const d = marchandData.get(s.id) || { ventesCount: 0, volumeTotal: 0, joursActifs: 0 };
        const score_ventes = Math.min(Math.round((d.ventesCount / 30) * 30), 30);
        const score_regularite = Math.min(Math.round((d.joursActifs / 30) * 25), 25);
        const score_volume = Math.min(Math.round((d.volumeTotal / 1000000) * 20), 20);
        breakdown = { score_ventes, score_regularite, score_volume, score_academy };
        score_total = score_ventes + score_regularite + score_volume + score_academy;
      } else if (s.role === 'producteur') {
        const d = producteurData.get(s.id) || { recoltesCount: 0, volumeKg: 0, joursActifs: 0 };
        const score_recoltes = Math.min(Math.round((d.recoltesCount / 30) * 30), 30);
        const score_regularite = Math.min(Math.round((d.joursActifs / 30) * 25), 25);
        const score_volume = Math.min(Math.round((d.volumeKg / 5000) * 20), 20);
        breakdown = { score_recoltes, score_regularite, score_volume, score_academy };
        score_total = score_recoltes + score_regularite + score_volume + score_academy;
      } else if (s.role === 'cooperateur') {
        const d = cooperateurData.get(s.id) || { coopActivity: 0, joursActifs: 0 };
        const score_membres = Math.min(Math.round((d.coopActivity / 30) * 30), 30);
        const score_regularite = Math.min(Math.round((d.joursActifs / 30) * 25), 25);
        const score_volume = 0;
        breakdown = { score_membres, score_regularite, score_volume, score_academy };
        score_total = score_membres + score_regularite + score_volume + score_academy;
      } else if (s.role === 'identificateur') {
        const d = identificateurData.get(s.id) || {
          totalMois: 0,
          totalCumul: 0,
          validees: 0,
          zones: 0,
          joursActifs: 0,
        };
        const objectif = s.objectifMensuel ?? 0;
        const score_objectif = objectif > 0 ? Math.min(Math.round((d.totalMois / objectif) * 30), 30) : 0;
        const score_validation =
          d.totalCumul > 0 ? Math.min(Math.round((d.validees / d.totalCumul) * 20), 20) : 0;
        const score_zones = Math.min(d.zones, 15);
        const score_regularite = Math.min(Math.round((d.joursActifs / 22) * 10), 10);
        breakdown = { score_objectif, score_validation, score_zones, score_regularite, score_academy };
        score_total = score_objectif + score_validation + score_zones + score_regularite + score_academy;
      } else {
        breakdown = { score_academy };
        score_total = score_academy;
      }

      score_total = Math.min(score_total, 100);
      const niveau = score_total >= 90 ? 4 : score_total >= 70 ? 3 : score_total >= 40 ? 2 : 1;

      results.set(s.id, {
        userId: s.id,
        role: s.role,
        niveau,
        progression: score_total,
        score_total,
        breakdown,
        academy: {
          total_score: academy.total_score,
          nb_completed: academy.nb_completed,
          nb_modules: totalModules,
        },
      });
    }

    void now;
    return results;
  }

  // ── Académie (commun à tous les rôles) ──────────────────────────────────

  private async batchAcademyProgress(
    userIds: string[],
  ): Promise<Map<string, { total_score: number; nb_completed: number }>> {
    const out = new Map<string, { total_score: number; nb_completed: number }>();
    if (!userIds.length) return out;
    const rows = await this.dataSource.query(
      `SELECT user_id::text AS user_id, COALESCE(SUM(score), 0) as total_score, COUNT(*) as nb_completed
       FROM academy_progress
       WHERE user_id::text = ANY($1::text[]) AND completed = true
       GROUP BY user_id`,
      [userIds],
    );
    for (const r of rows) {
      out.set(String(r.user_id), { total_score: toInt(r.total_score), nb_completed: toInt(r.nb_completed) });
    }
    return out;
  }

  private async academyModulesByProfil(): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    const rows = await this.dataSource.query(
      `SELECT profil, COUNT(*)::int as count FROM academy_modules WHERE statut = 'publie' GROUP BY profil`,
    );
    for (const r of rows) {
      out.set(String(r.profil), toInt(r.count));
    }
    return out;
  }

  // ── Marchand : ventes / régularité / volume ──────────────────────────────

  private async batchMarchand(
    userIds: string[],
  ): Promise<Map<string, { ventesCount: number; volumeTotal: number; joursActifs: number }>> {
    const out = new Map<string, { ventesCount: number; volumeTotal: number; joursActifs: number }>();
    if (!userIds.length) return out;

    const [ventesRows, joursRows] = await Promise.all([
      this.dataSource.query(
        `SELECT user_id::text AS user_id, COUNT(*)::int as count, COALESCE(SUM(montant), 0) as volume
         FROM caisse_transactions
         WHERE user_id::text = ANY($1::text[]) AND type = 'vente'
         AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY user_id`,
        [userIds],
      ),
      this.dataSource.query(
        `SELECT user_id::text AS user_id, COUNT(DISTINCT DATE(created_at))::int as jours
         FROM caisse_transactions
         WHERE user_id::text = ANY($1::text[]) AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY user_id`,
        [userIds],
      ),
    ]);

    for (const id of userIds) out.set(id, { ventesCount: 0, volumeTotal: 0, joursActifs: 0 });
    for (const r of ventesRows) {
      const cur = out.get(String(r.user_id)) || { ventesCount: 0, volumeTotal: 0, joursActifs: 0 };
      cur.ventesCount = toInt(r.count);
      cur.volumeTotal = toFloat(r.volume);
      out.set(String(r.user_id), cur);
    }
    for (const r of joursRows) {
      const cur = out.get(String(r.user_id)) || { ventesCount: 0, volumeTotal: 0, joursActifs: 0 };
      cur.joursActifs = toInt(r.jours);
      out.set(String(r.user_id), cur);
    }
    return out;
  }

  // ── Producteur : récoltes / régularité / volume ──────────────────────────

  private async batchProducteur(
    userIds: string[],
  ): Promise<Map<string, { recoltesCount: number; volumeKg: number; joursActifs: number }>> {
    const out = new Map<string, { recoltesCount: number; volumeKg: number; joursActifs: number }>();
    if (!userIds.length) return out;
    for (const id of userIds) out.set(id, { recoltesCount: 0, volumeKg: 0, joursActifs: 0 });

    try {
      const rows = await this.dataSource.query(
        `SELECT user_id::text AS user_id,
                COUNT(*)::int as count,
                COALESCE(SUM(
                  CASE
                    WHEN LOWER(TRIM(COALESCE(unite::text, ''))) IN ('kg', 'kgs', 'kilogramme', 'kilogrammes', '')
                      OR unite IS NULL THEN quantite::numeric
                    ELSE 0
                  END
                ), 0) as volume_kg,
                COUNT(DISTINCT DATE(created_at))::int as jours
         FROM recoltes
         WHERE user_id::text = ANY($1::text[]) AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY user_id`,
        [userIds],
      );
      for (const r of rows) {
        out.set(String(r.user_id), {
          recoltesCount: toInt(r.count),
          volumeKg: toFloat(r.volume_kg),
          joursActifs: toInt(r.jours),
        });
      }
      return out;
    } catch (e: any) {
      this.logger.warn(`[SCORES batch] recoltes: ${e?.message}`);
    }

    try {
      const rows = await this.dataSource.query(
        `SELECT user_id::text AS user_id, COUNT(*)::int as count, COALESCE(SUM(quantite::numeric), 0) as volume_kg,
                COUNT(DISTINCT DATE(created_at))::int as jours
         FROM recoltes WHERE user_id::text = ANY($1::text[])
         GROUP BY user_id`,
        [userIds],
      );
      for (const r of rows) {
        out.set(String(r.user_id), {
          recoltesCount: toInt(r.count),
          volumeKg: toFloat(r.volume_kg),
          joursActifs: toInt(r.jours),
        });
      }
    } catch (e: any) {
      this.logger.warn(`[SCORES batch] recoltes_fallback: ${e?.message}`);
      // FALLBACK ultime : scores à 0 pour ce lot (déjà initialisés ci-dessus).
    }
    return out;
  }

  // ── Coopérateur : activité coopérative / régularité ──────────────────────

  private async batchCooperateur(
    userIds: string[],
  ): Promise<Map<string, { coopActivity: number; joursActifs: number }>> {
    const out = new Map<string, { coopActivity: number; joursActifs: number }>();
    if (!userIds.length) return out;
    for (const id of userIds) out.set(id, { coopActivity: 0, joursActifs: 0 });

    try {
      const rows = await this.dataSource.query(
        `WITH target_users AS (SELECT unnest($1::uuid[]) AS user_id),
         user_coops AS (
           SELECT tu.user_id, c.id::text AS cid FROM target_users tu
             JOIN cooperatives c ON c.responsable_id = tu.user_id::text
           UNION
           SELECT tu.user_id, cm.cooperative_id::text AS cid FROM target_users tu
             JOIN cooperative_membres cm ON cm.membre_id = tu.user_id::text
         ),
         membres_counts AS (
           SELECT uc.user_id, COUNT(m.*)::int AS membres_count
           FROM user_coops uc JOIN cooperative_membres m ON m.cooperative_id::text = uc.cid
           GROUP BY uc.user_id
         ),
         besoins_counts AS (
           SELECT uc.user_id, COUNT(b.*)::int AS besoins_traites
           FROM user_coops uc JOIN cooperative_besoins b ON b.cooperative_id::text = uc.cid
             AND b.statut IS NOT NULL AND LOWER(b.statut) NOT IN ('en_attente', 'annule', 'annulé')
           GROUP BY uc.user_id
         )
         SELECT tu.user_id::text AS user_id,
                COALESCE(mc.membres_count, 0) AS membres_count,
                COALESCE(bc.besoins_traites, 0) AS besoins_traites
         FROM target_users tu
         LEFT JOIN membres_counts mc ON mc.user_id = tu.user_id
         LEFT JOIN besoins_counts bc ON bc.user_id = tu.user_id`,
        [userIds],
      );
      for (const r of rows) {
        const cur = out.get(String(r.user_id)) || { coopActivity: 0, joursActifs: 0 };
        cur.coopActivity = toInt(r.membres_count) + toInt(r.besoins_traites);
        out.set(String(r.user_id), cur);
      }
    } catch (e: any) {
      this.logger.warn(`[SCORES batch] coop_activity: ${e?.message}`);
      try {
        const rows = await this.dataSource.query(
          `WITH target_users AS (SELECT unnest($1::uuid[]) AS user_id),
           user_coops AS (
             SELECT tu.user_id, c.id::text AS cid FROM target_users tu
               JOIN cooperatives c ON c.responsable_id = tu.user_id::text
             UNION
             SELECT tu.user_id, cm.cooperative_id::text AS cid FROM target_users tu
               JOIN cooperative_membres cm ON cm.membre_id = tu.user_id::text
           )
           SELECT uc.user_id::text AS user_id, COUNT(m.*)::int AS cnt
           FROM user_coops uc JOIN cooperative_membres m ON m.cooperative_id::text = uc.cid
           GROUP BY uc.user_id`,
          [userIds],
        );
        for (const r of rows) {
          const cur = out.get(String(r.user_id)) || { coopActivity: 0, joursActifs: 0 };
          cur.coopActivity = toInt(r.cnt);
          out.set(String(r.user_id), cur);
        }
      } catch (e2: any) {
        this.logger.warn(`[SCORES batch] coop_activity_fallback: ${e2?.message}`);
      }
    }

    try {
      const rows = await this.dataSource.query(
        `WITH target_users AS (SELECT unnest($1::uuid[]) AS user_id),
         user_coops AS (
           SELECT tu.user_id, c.id::text AS cid FROM target_users tu
             JOIN cooperatives c ON c.responsable_id = tu.user_id::text
           UNION
           SELECT tu.user_id, cm.cooperative_id::text AS cid FROM target_users tu
             JOIN cooperative_membres cm ON cm.membre_id = tu.user_id::text
         )
         SELECT uc.user_id::text AS user_id, COUNT(DISTINCT d)::int as jours FROM (
           SELECT uc.user_id, DATE(cm.created_at) AS d FROM user_coops uc
             JOIN cooperative_membres cm ON cm.cooperative_id::text = uc.cid
             WHERE cm.created_at >= NOW() - INTERVAL '30 days'
           UNION
           SELECT uc.user_id, DATE(cb.created_at) AS d FROM user_coops uc
             JOIN cooperative_besoins cb ON cb.cooperative_id::text = uc.cid
             WHERE cb.created_at >= NOW() - INTERVAL '30 days'
         ) t(user_id, d)
         GROUP BY uc.user_id`,
        [userIds],
      );
      for (const r of rows) {
        const cur = out.get(String(r.user_id)) || { coopActivity: 0, joursActifs: 0 };
        cur.joursActifs = toInt(r.jours);
        out.set(String(r.user_id), cur);
      }
    } catch (e: any) {
      this.logger.warn(`[SCORES batch] coop_jours: ${e?.message}`);
    }

    return out;
  }

  // ── Identificateur : objectif mensuel / validation / zones / régularité ──

  private async batchIdentificateur(userIds: string[]): Promise<
    Map<string, { totalMois: number; totalCumul: number; validees: number; zones: number; joursActifs: number }>
  > {
    const out = new Map<
      string,
      { totalMois: number; totalCumul: number; validees: number; zones: number; joursActifs: number }
    >();
    if (!userIds.length) return out;
    for (const id of userIds) out.set(id, { totalMois: 0, totalCumul: 0, validees: 0, zones: 0, joursActifs: 0 });

    try {
      const moisRows = await this.dataSource.query(
        `SELECT identificateur_id::text AS identificateur_id, COUNT(*)::int as total
         FROM identifications
         WHERE identificateur_id::text = ANY($1::text[])
         AND created_at >= DATE_TRUNC('month', NOW())
         GROUP BY identificateur_id`,
        [userIds],
      );
      for (const r of moisRows) {
        const cur = out.get(String(r.identificateur_id));
        if (cur) cur.totalMois = toInt(r.total);
      }
    } catch (e: any) {
      this.logger.warn(`[SCORES batch] identificateur_mois: ${e?.message}`);
    }

    try {
      const cumulRows = await this.dataSource.query(
        `SELECT identificateur_id::text AS identificateur_id,
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE LOWER(statut) IN ('valide', 'validee', 'approuve', 'approuvée', 'approuvee'))::int as validees
         FROM identifications
         WHERE identificateur_id::text = ANY($1::text[])
         GROUP BY identificateur_id`,
        [userIds],
      );
      for (const r of cumulRows) {
        const cur = out.get(String(r.identificateur_id));
        if (cur) {
          cur.totalCumul = toInt(r.total);
          cur.validees = toInt(r.validees);
        }
      }
    } catch (e: any) {
      this.logger.warn(`[SCORES batch] identificateur_cumul: ${e?.message}`);
    }

    try {
      const recentRows = await this.dataSource.query(
        `SELECT identificateur_id::text AS identificateur_id,
                COUNT(DISTINCT commune) FILTER (WHERE commune IS NOT NULL AND TRIM(commune) != '')::int as zones,
                COUNT(DISTINCT DATE(created_at))::int as jours
         FROM identifications
         WHERE identificateur_id::text = ANY($1::text[])
         AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY identificateur_id`,
        [userIds],
      );
      for (const r of recentRows) {
        const cur = out.get(String(r.identificateur_id));
        if (cur) {
          cur.zones = toInt(r.zones);
          cur.joursActifs = toInt(r.jours);
        }
      }
    } catch (e: any) {
      this.logger.warn(`[SCORES batch] identificateur_recent: ${e?.message}`);
    }

    return out;
  }
}
