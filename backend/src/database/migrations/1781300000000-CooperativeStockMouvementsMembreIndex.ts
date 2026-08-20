import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Index de support pour GET /cooperatives/mes-distributions (historique des
 * distributions REÇUES par un membre, cf. fix "distribution stock commun
 * invisible côté membre") : la table `cooperative_stock_mouvements` avait déjà
 * un index sur (cooperative_id, produit) mais aucun sur membre_id, alors que
 * la nouvelle vue "membre" filtre justement par membre_id + type. Idempotente,
 * comme le reste des migrations de ce module.
 */
export class CooperativeStockMouvementsMembreIndex1781300000000 implements MigrationInterface {
  name = 'CooperativeStockMouvementsMembreIndex1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_cooperative_stock_mouvements_membre
        ON public.cooperative_stock_mouvements (membre_id, type, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.ix_cooperative_stock_mouvements_membre`);
  }
}
