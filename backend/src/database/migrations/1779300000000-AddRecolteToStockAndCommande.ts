import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * #12 — Décrément de stock à la vente DIRECTE (hors marché/publication).
 *
 * La vente directe producteur n'a pas de publication : pour décrémenter la
 * récolte de façon tracée et idempotente, on étend le ledger `stock_reservations`
 * et on rattache la commande à une récolte explicite (cf. ADR-0001 D2).
 *
 *  - commandes.recolte_id : la récolte concernée par la vente.
 *  - stock_reservations.publication_id : devient nullable (mouvement direct sans
 *    publication).
 *  - stock_reservations.recolte_id : la récolte décrémentée par le mouvement.
 *
 * Colonnes uuid nues, sans FK (intégrité gérée par StockReservationService,
 * transactionnel et idempotent). Idempotent : IF EXISTS / IF NOT EXISTS.
 */
export class AddRecolteToStockAndCommande1779300000000 implements MigrationInterface {
  name = 'AddRecolteToStockAndCommande1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE commandes ADD COLUMN IF NOT EXISTS recolte_id uuid`);
    await queryRunner.query(`ALTER TABLE stock_reservations ALTER COLUMN publication_id DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE stock_reservations ADD COLUMN IF NOT EXISTS recolte_id uuid`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_stock_reservations_recolte ON stock_reservations (recolte_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_reservations_recolte`);
    await queryRunner.query(`ALTER TABLE stock_reservations DROP COLUMN IF EXISTS recolte_id`);
    // publication_id n'est PAS remis NOT NULL : des mouvements directs (sans
    // publication) peuvent déjà exister et casseraient la contrainte.
    await queryRunner.query(`ALTER TABLE commandes DROP COLUMN IF EXISTS recolte_id`);
  }
}
