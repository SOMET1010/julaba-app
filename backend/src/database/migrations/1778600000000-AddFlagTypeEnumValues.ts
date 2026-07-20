import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlagTypeEnumValues1778600000000 implements MigrationInterface {
  name = 'AddFlagTypeEnumValues1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TYPE peut etre incompatible avec une transaction selon les setups PostgreSQL.
    await queryRunner.query(`ALTER TYPE flag_type_enum ADD VALUE IF NOT EXISTS 'spam'`);
    await queryRunner.query(`ALTER TYPE flag_type_enum ADD VALUE IF NOT EXISTS 'usurpation'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL ne supprime pas directement une valeur enum. Revert manuel si besoin.
  }
}
