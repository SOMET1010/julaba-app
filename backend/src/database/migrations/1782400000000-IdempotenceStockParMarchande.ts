import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IDEM-02 — sur le stock, une clé d'idempotence partagée ne renvoyait pas une
 * erreur : elle renvoyait un SUCCÈS.
 *
 * `stock_operation_idempotency.idempotency_key` était PRIMARY KEY à elle
 * seule, et `stocks-rest.controller.ts` insérait avec
 * `ON CONFLICT (idempotency_key) DO NOTHING RETURNING`. Quand la clé
 * appartenait à une AUTRE marchande : rien n'était inséré, la mise à jour de
 * stock n'était pas exécutée, et la route répondait
 * `{ success: true, replayed: true }`.
 *
 * C'est pire que le défaut jumeau de la caisse (IDEM-01) : là-bas une erreur
 * remonte et quelqu'un la voit. Ici la marchande est informée que son stock
 * est corrigé alors qu'il ne l'est pas, et l'écart ne se découvre qu'à
 * l'inventaire.
 *
 * L'index composite est créé AVANT que la clé primaire ne tombe : une table
 * n'a qu'une clé primaire, on ne peut donc pas les permuter d'un geste. En
 * créant d'abord l'index, les deux protections se recouvrent, et il n'existe
 * aucun instant où la table est sans garde.
 *
 * Sans risque sur l'existant : l'unicité de la clé seule est strictement plus
 * forte que celle du couple.
 *
 * Miroir du DDL de `DbInitService` (ADR-0002).
 */
export class IdempotenceStockParMarchande1782400000000 implements MigrationInterface {
  name = 'IdempotenceStockParMarchande1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_op_idem_marchand
      ON stock_operation_idempotency (marchand_id, idempotency_key);
    `);
    await queryRunner.query(`
      ALTER TABLE stock_operation_idempotency
      DROP CONSTRAINT IF EXISTS stock_operation_idempotency_pkey;
    `);
  }

  /**
   * Le retour en arrière PEUT ÉCHOUER, et c'est voulu : il rétablit une
   * contrainte plus forte. Si deux marchandes ont entre-temps utilisé la même
   * clé — ce que ce lot rend légitime — ces lignes existent, et l'ancienne
   * clé primaire les refuserait. On préfère un `down` qui s'arrête net à un
   * `down` qui supprimerait des opérations pour se rendre possible.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_operation_idempotency
      ADD CONSTRAINT stock_operation_idempotency_pkey PRIMARY KEY (idempotency_key);
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_stock_op_idem_marchand;`);
  }
}
