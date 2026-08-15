import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaisseTransactionStatusAndMotif1778700000000 implements MigrationInterface {
  name = 'AddCaisseTransactionStatusAndMotif1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE caisse_transaction_status_enum AS ENUM ('validee', 'en_cours', 'gelee', 'annulee', 'litige');
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
          WHERE t.typname = 'caisse_transaction_status_enum'
            AND r.rolname <> 'julaba_user'
        ) THEN
          ALTER TYPE caisse_transaction_status_enum OWNER TO julaba_user;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE caisse_transactions
      ADD COLUMN IF NOT EXISTS statut caisse_transaction_status_enum DEFAULT 'validee',
      ADD COLUMN IF NOT EXISTS motif TEXT
    `);

    await queryRunner.query(`GRANT USAGE ON TYPE caisse_transaction_status_enum TO julaba_user`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE caisse_transactions DROP COLUMN IF EXISTS motif`);
    await queryRunner.query(`ALTER TABLE caisse_transactions DROP COLUMN IF EXISTS statut`);
    await queryRunner.query(`DROP TYPE IF EXISTS caisse_transaction_status_enum`);
  }
}
