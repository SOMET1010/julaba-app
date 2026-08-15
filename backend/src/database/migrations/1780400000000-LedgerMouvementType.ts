import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * #19 — Ledger typé : colonne `type` sur `stock_mouvements`.
 *
 * PREMIÈRE migration réelle depuis la bascule #10 (chaîne de migrations rendue
 * autoritaire en prod, `DB_MIGRATIONS_RUN=true`). Elle valide en conditions
 * réelles le nouveau mécanisme d'évolution du schéma. Règle actée : plus aucune
 * évolution de schéma via DbInit — tout passe désormais par une migration.
 *
 * Jusqu'ici, vente et restitution (annulation, R7) ne se distinguaient dans le
 * ledger que par le SIGNE de `quantite_retranchee` (négatif = restitution). On
 * rend l'intention EXPLICITE via `type` ('vente' | 'annulation'), pour un ledger
 * lisible sans ruse de lecture (valeur recette).
 *
 * Historique : DEFAULT 'vente' qualifie proprement toutes les lignes existantes,
 * puis on RECLASSE rétroactivement les restitutions passées (quantité retranchée
 * négative) en 'annulation' — l'historique devient exact, pas seulement le futur.
 */
export class LedgerMouvementType1780400000000 implements MigrationInterface {
  name = 'LedgerMouvementType1780400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE stock_mouvements ADD COLUMN IF NOT EXISTS type varchar NOT NULL DEFAULT 'vente'`,
    );
    // Reclassement de l'historique : les mouvements inverses (restitutions R7)
    // portent une quantité retranchée négative → 'annulation'.
    await queryRunner.query(
      `UPDATE stock_mouvements SET type = 'annulation' WHERE quantite_retranchee < 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stock_mouvements DROP COLUMN IF EXISTS type`);
  }
}
