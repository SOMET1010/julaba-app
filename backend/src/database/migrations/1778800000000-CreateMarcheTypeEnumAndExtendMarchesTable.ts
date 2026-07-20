import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarcheTypeEnumAndExtendMarchesTable1778800000000
  implements MigrationInterface
{
  name = 'CreateMarcheTypeEnumAndExtendMarchesTable1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE marche_type_enum AS ENUM ('couvert', 'decouvert', 'mixte', 'autre');
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
          WHERE t.typname = 'marche_type_enum'
            AND r.rolname <> 'julaba_user'
        ) THEN
          ALTER TYPE marche_type_enum OWNER TO julaba_user;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `GRANT USAGE ON TYPE marche_type_enum TO julaba_user`,
    );

    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS adresse TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS description TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
    );

    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS "type" marche_type_enum DEFAULT 'autre'::marche_type_enum`,
    );

    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE marches TO julaba_user`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
