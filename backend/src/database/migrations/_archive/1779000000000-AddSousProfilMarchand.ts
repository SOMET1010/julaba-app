import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSousProfilMarchand1779000000000 implements MigrationInterface {
  name = 'AddSousProfilMarchand1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sous_profil_marchand_enum AS ENUM ('grossiste', 'demi_grossiste', 'detaillant');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_roles r ON r.oid = t.typowner
          WHERE t.typname = 'sous_profil_marchand_enum'
            AND r.rolname <> 'julaba_user'
        ) THEN
          ALTER TYPE sous_profil_marchand_enum OWNER TO julaba_user;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `GRANT USAGE ON TYPE sous_profil_marchand_enum TO julaba_user`,
    );

    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS sous_profil_marchand sous_profil_marchand_enum`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS marchand_sous_profil_historique (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        marchand_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ancien_sous_profil sous_profil_marchand_enum,
        nouveau_sous_profil sous_profil_marchand_enum,
        modifie_par uuid REFERENCES users(id) ON DELETE SET NULL,
        motif text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_msph_marchand_id ON marchand_sous_profil_historique (marchand_id)`,
    );

    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE marchand_sous_profil_historique TO julaba_user`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS marchand_sous_profil_historique`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS sous_profil_marchand`);
    await queryRunner.query(`DROP TYPE IF EXISTS sous_profil_marchand_enum`);
  }
}
