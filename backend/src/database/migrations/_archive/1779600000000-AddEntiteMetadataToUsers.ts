import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEntiteMetadataToUsers1779600000000
  implements MigrationInterface
{
  name = 'AddEntiteMetadataToUsers1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS entite_metadata JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS entite_metadata
    `);
  }
}
