import { MigrationInterface, QueryRunner } from 'typeorm';

// Garde-fou anti double-comptage (rejeu offline) : colonne idempotency_key +
// index UNIQUE PARTIEL. Partiel (WHERE ... IS NOT NULL) pour autoriser les lignes
// existantes sans clé (plusieurs NULL) tout en interdisant deux fois la même clé.
export class AddCaisseTransactionIdempotencyKey1778700200000 implements MigrationInterface {
  name = 'AddCaisseTransactionIdempotencyKey1778700200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE caisse_transactions ADD COLUMN IF NOT EXISTS idempotency_key text`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_caisse_tx_idempotency_key
       ON caisse_transactions (idempotency_key)
       WHERE idempotency_key IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_caisse_tx_idempotency_key`);
    await queryRunner.query(`ALTER TABLE caisse_transactions DROP COLUMN IF EXISTS idempotency_key`);
  }
}
