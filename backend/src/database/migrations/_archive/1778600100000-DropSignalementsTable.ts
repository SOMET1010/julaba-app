import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSignalementsTable1778600100000 implements MigrationInterface {
  name = 'DropSignalementsTable1778600100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS signalements CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Table supprimee volontairement, revert manuel si besoin.
  }
}
