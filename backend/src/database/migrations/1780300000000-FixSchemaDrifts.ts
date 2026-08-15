import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-0002 Étape 3 — correction des drifts de schéma connus (#10).
 *
 * Aligne le schéma BASELINE sur les entités corrigées, pour que la chaîne
 * `baseline + ce lot` reste reproductible et conforme aux entités.
 *
 * Drift 1 — entité `recoltes` dupliquée (supprimée) :
 *   Une 2ᵉ entité morte mappait `@Entity('recoltes')` avec des colonnes
 *   `producteur_id`/`zone_id` (varchar). Elle faisait churner `synchronize`
 *   (DROP/ADD de toute la table à chaque passe) et polluait la baseline de ces
 *   deux colonnes fantômes. Aucun code ne les lit ; on les retire.
 *
 * Drift 2 — FK `cooperative_membres` :
 *   `cooperative_id`/`membre_id` étaient inférés `varchar` alors que
 *   `cooperatives.id`/`users.id` sont `uuid` → la FK « cannot be implemented ».
 *   Les entités sont désormais typées `uuid` ; on convertit les colonnes et on
 *   pose la FK.
 *
 * Non exécutée en prod tant que `migrationsRun` est OFF (bascule = Étape 4).
 * Idempotente (IF EXISTS, cast USING, DROP CONSTRAINT IF EXISTS avant ADD).
 */
export class FixSchemaDrifts1780300000000 implements MigrationInterface {
  name = 'FixSchemaDrifts1780300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drift 1 : colonnes fantômes laissées par l'entité recoltes dupliquée.
    await queryRunner.query(`ALTER TABLE recoltes DROP COLUMN IF EXISTS producteur_id`);
    await queryRunner.query(`ALTER TABLE recoltes DROP COLUMN IF EXISTS zone_id`);

    // Drift 2 : cooperative_membres → uuid + FK vers cooperatives.
    await queryRunner.query(
      `ALTER TABLE cooperative_membres ALTER COLUMN cooperative_id TYPE uuid USING cooperative_id::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE cooperative_membres ALTER COLUMN membre_id TYPE uuid USING membre_id::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE cooperative_membres DROP CONSTRAINT IF EXISTS cooperative_membres_cooperative_id_fkey`,
    );
    await queryRunner.query(
      `ALTER TABLE cooperative_membres
         ADD CONSTRAINT cooperative_membres_cooperative_id_fkey
         FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cooperative_membres DROP CONSTRAINT IF EXISTS cooperative_membres_cooperative_id_fkey`,
    );
    await queryRunner.query(
      `ALTER TABLE cooperative_membres ALTER COLUMN membre_id TYPE varchar USING membre_id::text`,
    );
    await queryRunner.query(
      `ALTER TABLE cooperative_membres ALTER COLUMN cooperative_id TYPE varchar USING cooperative_id::text`,
    );
    await queryRunner.query(`ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS zone_id character varying`);
    await queryRunner.query(`ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS producteur_id character varying`);
  }
}
