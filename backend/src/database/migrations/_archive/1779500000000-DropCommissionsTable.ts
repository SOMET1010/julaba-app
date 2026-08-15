import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCommissionsTable1779500000000 implements MigrationInterface {
  name = 'DropCommissionsTable1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS commissions`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Table supprimee volontairement (module commissions retire), revert manuel si besoin.
  }
}
