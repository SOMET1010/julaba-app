import { MigrationInterface, QueryRunner } from "typeorm";

// Journal append-only de la boutique vocale (remontee offline-first).
export class CreateBoutiqueMouvements1780000000000 implements MigrationInterface {
  name = "CreateBoutiqueMouvements1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS boutique_mouvements (
        id uuid PRIMARY KEY,
        marchand_id uuid NOT NULL,
        device varchar NOT NULL,
        type varchar NOT NULL,
        produit varchar,
        quantite numeric,
        montant numeric,
        transcription text,
        ts bigint NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_boutique_mvt_marchand ON boutique_mouvements(marchand_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_boutique_mvt_ts ON boutique_mouvements(ts)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_boutique_mvt_ts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_boutique_mvt_marchand`);
    await queryRunner.query(`DROP TABLE IF EXISTS boutique_mouvements`);
  }
}
