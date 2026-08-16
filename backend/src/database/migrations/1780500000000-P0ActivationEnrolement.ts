import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P0.0 (ADR-002) — fin du takeover via le secret global `0000`.
 *
 * - Ajoute le statut `en_attente_activation` (compte enrôlé, non-loginable).
 * - Crée `activation_codes` (code à usage unique : selector indexé + hash du verifier).
 * - NEUTRALISE les comptes ACTEUR encore au secret par défaut (must_change_password
 *   = true) : leur `0000`/`123456` ne doit plus jamais ouvrir de session. Ils devront
 *   être ré-activés (code réémis). Le seed démo (must_change_password = false) n'est
 *   pas touché.
 *
 * Note PG : `ADD VALUE` est exécuté ici mais la nouvelle valeur n'est PAS utilisée
 * dans la même transaction (on neutralise via password_hash, pas via status) — donc
 * pas de conflit « unsafe use of new value ».
 */
export class P0ActivationEnrolement1780500000000 implements MigrationInterface {
  name = 'P0ActivationEnrolement1780500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE public.users_status_enum ADD VALUE IF NOT EXISTS 'en_attente_activation'`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.activation_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        selector varchar NOT NULL,
        verifier_hash varchar NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_activation_codes_selector ON public.activation_codes (selector)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_activation_codes_user ON public.activation_codes (user_id)`,
    );

    await queryRunner.query(`
      UPDATE public.users SET password_hash = '!p0-inactif'
      WHERE must_change_password = true
        AND role IN ('marchand','producteur','cooperateur','identificateur')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.activation_codes`);
    // La valeur d'enum ajoutée et l'invalidation des mots de passe ne sont pas
    // réversibles proprement (PG ne sait pas retirer une valeur d'enum) — assumé.
  }
}
