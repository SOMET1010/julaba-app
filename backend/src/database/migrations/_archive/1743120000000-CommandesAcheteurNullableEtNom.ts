import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommandesAcheteurNullableEtNom1743120000000 implements MigrationInterface {
  name = 'CommandesAcheteurNullableEtNom1743120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "acheteur_nom" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "commandes" ALTER COLUMN "acheteur_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "commandes" DROP COLUMN IF EXISTS "acheteur_nom"`);
    await queryRunner.query(`
      UPDATE "commandes" SET "acheteur_id" = "vendeur_id" WHERE "acheteur_id" IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "commandes" ALTER COLUMN "acheteur_id" SET NOT NULL`);
  }
}
