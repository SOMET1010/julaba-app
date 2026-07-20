import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaiementToCommandes1779200000000
  implements MigrationInterface
{
  name = 'AddPaiementToCommandes1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE commandes ADD COLUMN IF NOT EXISTS statut_paiement varchar(20) NOT NULL DEFAULT 'non_paye'`,
    );
    await queryRunner.query(
      `ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paye_at timestamptz`,
    );
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE commandes TO julaba_user`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE commandes DROP COLUMN IF EXISTS paye_at`);
    await queryRunner.query(`ALTER TABLE commandes DROP COLUMN IF EXISTS statut_paiement`);
  }
}
