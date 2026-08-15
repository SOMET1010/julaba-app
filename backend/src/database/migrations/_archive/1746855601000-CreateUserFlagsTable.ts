import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserFlagsTable1746855601000 implements MigrationInterface {
  name = 'CreateUserFlagsTable1746855601000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE flag_type_enum AS ENUM ('doublon', 'fraude', 'abus', 'autre')
    `);

    await queryRunner.query(`
      CREATE TABLE user_flags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flag_type flag_type_enum NOT NULL,
        raison TEXT NOT NULL,
        commentaire TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by UUID REFERENCES users(id),
        resolution_note TEXT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_flags_user_id ON user_flags(user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_user_flags_unresolved ON user_flags(user_id) WHERE resolved_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_user_flags_flag_type ON user_flags(flag_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_flags`);
    await queryRunner.query(`DROP TYPE IF EXISTS flag_type_enum`);
  }
}
