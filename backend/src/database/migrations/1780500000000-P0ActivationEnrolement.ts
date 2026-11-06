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
    // `en_attente_activation` doit naître À LA POSITION du code TypeScript
    // (UserStatus, user.entity.ts : … en_attente_validation, en_attente_activation,
    // supprime). Un simple `ADD VALUE` la mettrait EN FIN de liste — divergeant du
    // code ET de la base Azure alignée le 06/11/2026 (type recréé à la main à cette
    // même position, cf. rapport d'alignement). PostgreSQL ne sait pas insérer une
    // valeur d'enum : on recrée le type. `users.status` est la SEULE colonne du
    // type (vérifié sur la baseline et toute la chaîne de migrations), ni vue ni
    // index ne la référencent ; le cast convertit les lignes existantes. Contrairement
    // à `ADD VALUE`, recréer le type n'a pas de restriction « unsafe use of new
    // value » : le type naît complet dans la transaction.
    await queryRunner.query(
      `ALTER TYPE public.users_status_enum RENAME TO users_status_enum_pre_p0`,
    );
    await queryRunner.query(`
      CREATE TYPE public.users_status_enum AS ENUM (
        'pending',
        'actif',
        'suspendu',
        'rejete',
        'en_attente_validation',
        'en_attente_activation',
        'supprime'
      )
    `);
    await queryRunner.query(
      `ALTER TABLE public.users ALTER COLUMN status TYPE public.users_status_enum
       USING status::text::public.users_status_enum`,
    );
    await queryRunner.query(
      `ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'pending'::public.users_status_enum`,
    );
    await queryRunner.query(`DROP TYPE public.users_status_enum_pre_p0`);

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
    // Le statut `en_attente_activation` et l'invalidation des mots de passe ne sont
    // pas réversibles proprement : PostgreSQL ne sait pas retirer une valeur d'enum
    // (et des comptes peuvent la porter) — assumé.
  }
}
