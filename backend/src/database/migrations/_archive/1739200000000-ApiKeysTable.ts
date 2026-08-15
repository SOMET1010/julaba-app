import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApiKeysTable1739200000000 implements MigrationInterface {
  name = 'ApiKeysTable1739200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        partner_type VARCHAR(32) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        rate_limit INTEGER NOT NULL DEFAULT 1000,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys`);
  }
}
