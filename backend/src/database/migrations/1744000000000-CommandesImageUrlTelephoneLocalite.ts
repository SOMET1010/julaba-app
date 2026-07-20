import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommandesImageUrlTelephoneLocalite1744000000000 implements MigrationInterface {
  name = 'CommandesImageUrlTelephoneLocalite1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "acheteur_telephone" VARCHAR(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD COLUMN IF NOT EXISTS "localite" VARCHAR(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "commandes" DROP COLUMN IF EXISTS "localite"`);
    await queryRunner.query(`ALTER TABLE "commandes" DROP COLUMN IF EXISTS "acheteur_telephone"`);
    await queryRunner.query(`ALTER TABLE "commandes" DROP COLUMN IF EXISTS "image_url"`);
  }
}
