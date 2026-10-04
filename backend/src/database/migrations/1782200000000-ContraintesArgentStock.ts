import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Les invariants d'argent et de stock deviennent des contraintes de BASE.
 *
 * SQL volontairement INLINE, pas importé de `contraintes-argent-stock.ts` :
 * une migration est un instantané figé, elle ne doit pas changer de sens si une
 * constante partagée évolue plus tard. La cohérence entre les deux est garantie
 * par `test/unit/contraintes-argent-stock.spec.ts`, qui compare ce fichier à la
 * liste — une dérive fait échouer la suite, elle ne se découvre pas en prod.
 *
 * `NOT VALID` : s'applique aux écritures nouvelles, n'inspecte pas l'historique.
 * Voir `SQL_LIGNES_NON_CONFORMES` pour mesurer l'ancien avant de le valider.
 */
export class ContraintesArgentStock1782200000000 implements MigrationInterface {
  name = 'ContraintesArgentStock1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_stock_mouvements_demandee_non_negative') THEN
          ALTER TABLE stock_mouvements
            ADD CONSTRAINT ck_stock_mouvements_demandee_non_negative CHECK (quantite_demandee >= 0) NOT VALID;
        END IF;
      END $$;`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_stock_mouvements_manquant_non_negatif') THEN
          ALTER TABLE stock_mouvements
            ADD CONSTRAINT ck_stock_mouvements_manquant_non_negatif CHECK (manquant >= 0) NOT VALID;
        END IF;
      END $$;`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_stock_mouvements_retranchee_bornee') THEN
          ALTER TABLE stock_mouvements
            ADD CONSTRAINT ck_stock_mouvements_retranchee_bornee CHECK (quantite_retranchee <= quantite_demandee) NOT VALID;
        END IF;
      END $$;`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_caisse_transactions_montant_non_negatif') THEN
          ALTER TABLE caisse_transactions
            ADD CONSTRAINT ck_caisse_transactions_montant_non_negatif CHECK (montant IS NULL OR montant >= 0) NOT VALID;
        END IF;
      END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE stock_mouvements DROP CONSTRAINT IF EXISTS ck_stock_mouvements_demandee_non_negative');
    await queryRunner.query('ALTER TABLE stock_mouvements DROP CONSTRAINT IF EXISTS ck_stock_mouvements_manquant_non_negatif');
    await queryRunner.query('ALTER TABLE stock_mouvements DROP CONSTRAINT IF EXISTS ck_stock_mouvements_retranchee_bornee');
    await queryRunner.query('ALTER TABLE caisse_transactions DROP CONSTRAINT IF EXISTS ck_caisse_transactions_montant_non_negatif');
  }
}
