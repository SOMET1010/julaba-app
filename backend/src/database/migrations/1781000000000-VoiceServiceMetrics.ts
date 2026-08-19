import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Journal append-only des appels reels aux moteurs voix — `voice_service_metrics`.
 *
 * Contexte (audit) : `GET /admin/monitoring` (admin-analytics.controller.ts),
 * consomme par l'ecran back-office BOMonitoringIA.tsx, renvoyait une liste
 * CODEE EN DUR de 4 services avec des latences/uptime fixes ("45ms", "99.9%",
 * "Groq Whisper" — qui n'existe meme pas dans le code), sans aucun lien avec
 * les vrais services voix (whisper.cpp local, OpenAI Whisper cloud, Piper
 * local, ElevenLabs cloud).
 *
 * Cette table journalise chaque appel REELLEMENT tente (config presente,
 * process/requete lance) : service concerne, succes/echec, latence mesuree,
 * message d'erreur le cas echeant. `admin-analytics.controller.ts` agrege
 * ensuite ces lignes pour un monitoring honnete — un service sans ligne
 * recente est explicitement signale comme "aucune donnee", jamais affiche
 * avec une fausse latence/uptime.
 *
 * Hors perimetre volontaire : pas de suivi de cout (aucun modele de prix par
 * requete n'existe dans le code actuel) — `cout30j`/`cout_cumule` restent a 0
 * cote API plutot que d'etre invente.
 */
export class VoiceServiceMetrics1781000000000 implements MigrationInterface {
  name = 'VoiceServiceMetrics1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.voice_service_metrics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service varchar(40) NOT NULL,
        success boolean NOT NULL,
        latency_ms integer NOT NULL,
        error_message varchar(500),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_service_metrics_service_created
        ON public.voice_service_metrics (service, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.voice_service_metrics`);
  }
}
