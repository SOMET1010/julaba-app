import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceToIdentifications1746855602000 implements MigrationInterface {
  name = 'AddSourceToIdentifications1746855602000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE identification_source_enum AS ENUM ('terrain', 'admin_bo')
    `);

    await queryRunner.query(`
      ALTER TABLE identifications
      ADD COLUMN source identification_source_enum NOT NULL DEFAULT 'terrain'
    `);

    await queryRunner.query(`
      CREATE INDEX idx_identifications_source ON identifications(source)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_identifications_source
    `);
    await queryRunner.query(`
      ALTER TABLE identifications DROP COLUMN IF EXISTS source
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS identification_source_enum
    `);
  }
}
