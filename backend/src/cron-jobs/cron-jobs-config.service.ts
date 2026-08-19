import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface CronJobStatus {
  id: string;
  actif: boolean;
  lastRunAt: Date | string | null;
  lastStatus: 'success' | 'error' | null;
  lastDurationMs: number | null;
  lastError: string | null;
  runCount: number;
}

/**
 * Source de vérité unique pour l'état des jobs `@Cron()` réels :
 *  - `actif` : lu par CHAQUE job réel avant de s'exécuter (isEnabled). Un job
 *    sans ligne en base est considéré actif — comportement historique
 *    préservé : tant que personne n'a togglé, rien n'est désactivé.
 *  - dernière exécution (statut/durée/erreur/compteur) : écrite par chaque
 *    job réel à CHAQUE exécution (recordExecution), lue par GET /cron.
 *
 * Remplace la table `cron_jobs_config` "écrite mais jamais lue" de l'audit :
 * désormais lue par les jobs eux-mêmes ET par le endpoint de lecture.
 */
@Injectable()
export class CronJobsConfigService {
  private readonly logger = new Logger(CronJobsConfigService.name);
  private tableEnsured = false;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS cron_jobs_config (
        id VARCHAR(255) PRIMARY KEY,
        actif BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Colonnes de suivi d'exécution — ajoutées séparément (ADD COLUMN IF NOT
    // EXISTS) car la table existait déjà en prod avec seulement id/actif/updated_at.
    await this.dataSource.query(`ALTER TABLE cron_jobs_config ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ`);
    await this.dataSource.query(`ALTER TABLE cron_jobs_config ADD COLUMN IF NOT EXISTS last_status VARCHAR(20)`);
    await this.dataSource.query(`ALTER TABLE cron_jobs_config ADD COLUMN IF NOT EXISTS last_duration_ms INTEGER`);
    await this.dataSource.query(`ALTER TABLE cron_jobs_config ADD COLUMN IF NOT EXISTS last_error TEXT`);
    await this.dataSource.query(`ALTER TABLE cron_jobs_config ADD COLUMN IF NOT EXISTS run_count INTEGER NOT NULL DEFAULT 0`);
    this.tableEnsured = true;
  }

  /**
   * `dataSource.query()` (pilote pg) renvoie, pour un UPDATE/INSERT/DELETE
   * Postgres avec `RETURNING`, un TUPLE `[lignes, nombreDeLignesAffectées]`
   * — PAS les lignes seules comme pour un SELECT direct. Bug pré-existant
   * trouvé pendant ce correctif : l'ancien code du controller lisait
   * `rows.length` sur ce tuple (toujours 2, donc "truthy"), ratait
   * systématiquement la branche d'INSERT de repli, et ne persistait donc
   * JAMAIS aucune ligne dans `cron_jobs_config` — le toggle répondait
   * `200 { success: true }` sans jamais rien écrire en base. D'où
   * `isEnabled()` qui renvoyait toujours `true`, quoi qu'on togglait.
   */
  private static extraireLignesRetournees(result: any): any[] {
    if (
      Array.isArray(result) &&
      result.length === 2 &&
      Array.isArray(result[0]) &&
      typeof result[1] === 'number'
    ) {
      return result[0];
    }
    return Array.isArray(result) ? result : [];
  }

  /** Un job sans ligne en base est actif par défaut (comportement historique inchangé). */
  async isEnabled(id: string): Promise<boolean> {
    await this.ensureTable();
    const rows = await this.dataSource.query(`SELECT actif FROM cron_jobs_config WHERE id = $1`, [id]);
    if (!rows?.length) return true;
    return Boolean(rows[0].actif);
  }

  async toggle(id: string): Promise<{ id: string; actif: boolean }> {
    await this.ensureTable();
    let rows = CronJobsConfigService.extraireLignesRetournees(
      await this.dataSource.query(
        `UPDATE cron_jobs_config SET actif = NOT COALESCE(actif, true), updated_at = NOW() WHERE id = $1 RETURNING id, actif`,
        [id],
      ),
    );
    if (!rows.length) {
      // Pas de ligne : l'état implicite était "actif" → premier toggle = désactivation.
      await this.dataSource.query(`INSERT INTO cron_jobs_config (id, actif) VALUES ($1, false)`, [id]);
      rows = await this.dataSource.query(`SELECT id, actif FROM cron_jobs_config WHERE id = $1`, [id]);
    }
    const row = rows[0];
    return { id: String(row.id), actif: Boolean(row.actif) };
  }

  /** Appelé par chaque job réel à CHAQUE exécution effective (pas quand il est skip car désactivé). */
  async recordExecution(
    id: string,
    result: { status: 'success' | 'error'; durationMs: number; error?: string | null },
  ): Promise<void> {
    await this.ensureTable();
    try {
      await this.dataSource.query(
        `INSERT INTO cron_jobs_config (id, actif, last_run_at, last_status, last_duration_ms, last_error, run_count, updated_at)
         VALUES ($1, true, NOW(), $2, $3, $4, 1, NOW())
         ON CONFLICT (id) DO UPDATE SET
           last_run_at = NOW(),
           last_status = EXCLUDED.last_status,
           last_duration_ms = EXCLUDED.last_duration_ms,
           last_error = EXCLUDED.last_error,
           run_count = cron_jobs_config.run_count + 1,
           updated_at = NOW()`,
        [id, result.status, result.durationMs, result.error ?? null],
      );
    } catch (e: any) {
      // Le suivi d'exécution ne doit jamais faire échouer le job métier lui-même.
      this.logger.error(`recordExecution(${id}) a échoué: ${e?.message}`);
    }
  }

  async getAllStatuses(): Promise<Record<string, CronJobStatus>> {
    await this.ensureTable();
    const rows = await this.dataSource.query(`SELECT * FROM cron_jobs_config`);
    const byId: Record<string, CronJobStatus> = {};
    for (const r of rows) {
      byId[r.id] = {
        id: r.id,
        actif: Boolean(r.actif),
        lastRunAt: r.last_run_at,
        lastStatus: r.last_status,
        lastDurationMs: r.last_duration_ms,
        lastError: r.last_error,
        runCount: Number(r.run_count ?? 0),
      };
    }
    return byId;
  }
}
