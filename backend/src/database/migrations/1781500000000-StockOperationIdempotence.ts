import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Les ajustements de stock peuvent être rejoués après une vente hors connexion.
 * La clé unique garantit qu’un même patch ne modifie le stock qu’une seule fois.
 */
export class StockOperationIdempotence1781500000000 implements MigrationInterface {
  name = 'StockOperationIdempotence1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_operation_idempotency (
        idempotency_key varchar(128) PRIMARY KEY,
        stock_id varchar(128) NOT NULL,
        marchand_id varchar(128) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_stock_operation_idempotency_marchand
      ON stock_operation_idempotency (marchand_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS stock_operation_idempotency');
  }
}
