import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PILOTE-3 : miroir local du référentiel maître Odoo + trace d'adoption.
 *
 * Mirroir EXACT du DDL idempotent déjà exécuté par `DbInitService.runInit()`
 * (ADR-0002 : DbInit doit toujours être subsumé par les migrations — voir
 * `scripts/verify-dbinit-subsumed.cjs`). Cette table et cette colonne
 * existaient déjà en production via DbInit ; cette migration formalise le
 * même schéma sans rien changer côté runtime.
 *
 * NI PRIX NI STOCK dans `catalogue_maitre`, volontairement : une ligne de
 * cette table n'est donc jamais vendable. Seule une ligne ADOPTÉE dans
 * `produits` l'est, avec le prix de la marchande.
 */
export class CatalogueMaitreEtAdoption1781600000000 implements MigrationInterface {
  name = 'CatalogueMaitreEtAdoption1781600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS catalogue_maitre (
        default_code text PRIMARY KEY,
        nom text NOT NULL,
        categorie text,
        odoo_product_id integer,
        actif boolean NOT NULL DEFAULT true,
        synced_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_catalogue_maitre_nom ON catalogue_maitre (lower(nom))`,
    );

    // Trace du lien entre le produit d'UNE marchande et la référence maître
    // dont il provient. Nullable : un produit peut naître hors référentiel
    // (vente libre, article local non catalogué) — l'adoption est une
    // facilité, pas un passage obligé.
    await queryRunner.query(
      `ALTER TABLE produits ADD COLUMN IF NOT EXISTS default_code text`,
    );
    // Index unique PARTIEL : une même marchande n'adopte pas deux fois la
    // même référence, sans que deux produits libres (tous deux NULL) entrent
    // en conflit.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_produits_marchand_default_code
        ON produits (marchand_id, default_code) WHERE default_code IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS ux_produits_marchand_default_code');
    await queryRunner.query('ALTER TABLE produits DROP COLUMN IF EXISTS default_code');
    await queryRunner.query('DROP INDEX IF EXISTS idx_catalogue_maitre_nom');
    await queryRunner.query('DROP TABLE IF EXISTS catalogue_maitre');
  }
}
