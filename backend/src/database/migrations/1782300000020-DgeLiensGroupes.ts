import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DGE-04 / DGE-05 — LES 4 LISTES JOINTES DE LA DGE demandent des LIENS que la
 * base n'a pas (plan d'action audit workflow officiel §5 item 5, 20/10/2026) :
 *
 *  a) « marchés d'une coopérative »  → marches.cooperative_id (inexistant)
 *  b) « identificateurs par marché » → users.marche_id (users.market était un
 *     TEXTE LIBRE de fiche, pas une clé — aucune agrégation possible)
 *  c) producteurs d'une coopérative  → l'adhésion cooperative_membres est
 *     ouverte aux PRODUCTEURS côté contrôleur (addMembre, commit suivant) ;
 *     la colonne existe déjà.
 *
 * Colonnes NULLABLE uuid nues, SANS contrainte FK — même convention que
 * users.zone_id (l'index porte la requête groupée ; la contrainte forte
 * viendrait grever les imports existants). Idempotent.
 */
export class DgeLiensGroupes1782300000020 implements MigrationInterface {
  name = 'DgeLiensGroupes1782300000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE marches ADD COLUMN IF NOT EXISTS cooperative_id uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_marches_cooperative ON marches (cooperative_id)`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS marche_id uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_marche ON users (marche_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_marche`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS marche_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_marches_cooperative`);
    await queryRunner.query(`ALTER TABLE marches DROP COLUMN IF EXISTS cooperative_id`);
  }
}
