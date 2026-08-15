import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B2 : table de reservation de stock. Une ligne par commande, contre une
 * publication. Reserve a la creation d'une commande en_attente, convertie a la
 * confirmation, liberee a l'annulation. Aucun argent implique.
 *
 * Colonnes uuid nues, sans FK (integrite geree par le service, transactionnel).
 * A executer manuellement en prod (regle JULABA_DECISIONS section 5).
 */
export class AddStockReservations1779200000000 implements MigrationInterface {
  name = 'AddStockReservations1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        commande_id uuid NOT NULL,
        publication_id uuid NOT NULL,
        quantite numeric(10,2) NOT NULL,
        statut varchar(20) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_reservations_commande ON stock_reservations (commande_id)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_stock_reservations_publication ON stock_reservations (publication_id)`,
    );

    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stock_reservations TO julaba_user`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_reservations_publication`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_stock_reservations_commande`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_reservations`);
  }
}
