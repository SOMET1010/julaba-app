import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnAttenteValidationStatus1746855600000 implements MigrationInterface {
  name = 'AddEnAttenteValidationStatus1746855600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'en_attente_validation'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users SET status = 'pending' WHERE status = 'en_attente_validation'
    `);
    await queryRunner.query(`
      ALTER TYPE user_status RENAME TO user_status_old
    `);
    await queryRunner.query(`
      CREATE TYPE user_status AS ENUM ('pending', 'actif', 'suspendu', 'rejete')
    `);
    await queryRunner.query(`
      ALTER TABLE users
        ALTER COLUMN status DROP DEFAULT,
        ALTER COLUMN status TYPE user_status USING status::text::user_status,
        ALTER COLUMN status SET DEFAULT 'pending'
    `);
    await queryRunner.query(`
      DROP TYPE user_status_old
    `);
  }
}
