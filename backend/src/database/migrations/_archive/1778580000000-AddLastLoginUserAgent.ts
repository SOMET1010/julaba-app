import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastLoginUserAgent1778580000000 implements MigrationInterface {
  name = 'AddLastLoginUserAgent1778580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_login_user_agent VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS last_login_user_agent
    `);
  }
}
