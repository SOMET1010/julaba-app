import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingValidationDataToUsers1746855603000 implements MigrationInterface {
  name = 'AddPendingValidationDataToUsers1746855603000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN pending_validation_data JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS pending_validation_data
    `);
  }
}
