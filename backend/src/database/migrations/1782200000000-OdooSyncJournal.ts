import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ODOO-L1 — le journal de synchronisation Odoo ne survivait pas à un
 * redémarrage.
 *
 * `backend/src/odoo-gateway/sync-journal.ts` portait depuis sa création
 * l'aveu de sa propre limite : le journal vivait dans une `Map`, et
 * « rejouer un `operationId` après un redémarrage recréerait un nouveau
 * mouvement, exactement le risque qu'un vrai Gateway doit éliminer ». Sur
 * Render, un redéploiement ou une mise en veille suffit à l'effacer.
 *
 * `operation_id` est PRIMARY KEY, et c'est elle qui tient l'idempotence :
 * deux rejeux simultanés peuvent lire « rien » au même instant, un seul peut
 * insérer. Même mécanisme que `ux_caisse_tx_idempotency_key`, qui protège
 * `POST /caisse/vente` en production depuis des mois.
 *
 * Miroir exact du DDL de `DbInitService` (ADR-0002, « DbInit ⊆ migrations »).
 * `migrationsRun` est OFF sur ce dépôt : c'est DbInit qui crée réellement la
 * table, cette migration existe pour que le schéma reste reproductible.
 */
export class OdooSyncJournal1782200000000 implements MigrationInterface {
  name = 'OdooSyncJournal1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS odoo_sync_journal (
        operation_id varchar(200) PRIMARY KEY,
        domaine varchar(64) NOT NULL,
        odoo_model varchar(128) NOT NULL,
        odoo_record_id bigint,
        etat varchar(16) NOT NULL,
        payload_snapshot text NOT NULL,
        tentatives integer NOT NULL DEFAULT 0,
        derniere_erreur text,
        cree_le bigint NOT NULL,
        confirme_le bigint,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_odoo_sync_journal_etat
       ON odoo_sync_journal (etat, cree_le DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_odoo_sync_journal_etat;`);
    await queryRunner.query(`DROP TABLE IF EXISTS odoo_sync_journal;`);
  }
}
