import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToUsers1746855605000 implements MigrationInterface {
  name = 'AddDeletedAtToUsers1746855605000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN deleted_at
    `);
  }
}
