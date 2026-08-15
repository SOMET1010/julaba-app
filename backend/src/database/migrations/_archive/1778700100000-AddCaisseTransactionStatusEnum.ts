import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaisseTransactionStatusEnum1778700100000 implements MigrationInterface {
  name = 'AddCaisseTransactionStatusEnum1778700100000';

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

    await queryRunner.query(`GRANT USAGE ON TYPE caisse_transaction_status_enum TO julaba_user`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    return Promise.resolve();
  }
}
