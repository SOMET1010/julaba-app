import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCooperativeAndTypeMarcheToPublications1779100000000
  implements MigrationInterface
{
  name = 'AddCooperativeAndTypeMarcheToPublications1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE marche_virtuel_type_enum AS ENUM ('producteur', 'cooperative');
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
          WHERE t.typname = 'marche_virtuel_type_enum'
            AND r.rolname <> 'julaba_user'
        ) THEN
          ALTER TYPE marche_virtuel_type_enum OWNER TO julaba_user;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `GRANT USAGE ON TYPE marche_virtuel_type_enum TO julaba_user`,
    );

    await queryRunner.query(
      `ALTER TABLE publications ADD COLUMN IF NOT EXISTS cooperative_id uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE publications ADD COLUMN IF NOT EXISTS type_marche marche_virtuel_type_enum NOT NULL DEFAULT 'producteur'`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_publications_cooperative'
        ) THEN
          ALTER TABLE publications ADD CONSTRAINT fk_publications_cooperative
            FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_publications_type_marche ON publications (type_marche)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_publications_cooperative_id ON publications (cooperative_id)`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uniq_coop_membre_actif ON cooperative_membres (membre_id) WHERE actif = true`,
    );

    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE publications TO julaba_user`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_coop_membre_actif`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_publications_cooperative_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_publications_type_marche`);
    await queryRunner.query(`ALTER TABLE publications DROP CONSTRAINT IF EXISTS fk_publications_cooperative`);
    await queryRunner.query(`ALTER TABLE publications DROP COLUMN IF EXISTS type_marche`);
    await queryRunner.query(`ALTER TABLE publications DROP COLUMN IF EXISTS cooperative_id`);
    await queryRunner.query(`DROP TYPE IF EXISTS marche_virtuel_type_enum`);
  }
}
