import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPinLockoutToUsers1779700000000
  implements MigrationInterface
{
  name = 'AddPinLockoutToUsers1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS locked_until
    `);
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS failed_pin_attempts
    `);
  }
}
