import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * L'UNITÉ D'UN MOUVEMENT DE STOCK EST FIGÉE AU MOUVEMENT — 19/09/2026.
 *
 * Le ledger figeait `produit_nom` mais pas l'unité : celle-ci était relue dans
 * le catalogue d'aujourd'hui par une jointure (`LEFT JOIN produits … p.unite`).
 * Une marchande qui repassait son piment du tas au kilo voyait donc ses
 * mouvements passés — « −5 tas » — devenir « −5 kg ». Aucune vente n'avait
 * bougé ; c'est le sens de son historique qui changeait sous elle.
 *
 * C'est la règle 2 de la doctrine : ne jamais faire dépendre l'historique de
 * l'état actuel du catalogue. Elle était déjà tenue côté VENTE (l'unité est
 * figée dans `caisse_transactions.details`) et pas côté STOCK.
 *
 * Colonne NULLABLE à dessein : les mouvements écrits avant ce jour n'ont pas
 * d'unité figée, et on ne peut pas l'inventer rétroactivement — le catalogue
 * a pu changer entre-temps, c'est tout le problème. Pour ces lignes-là, la
 * lecture retombe sur la jointure, au mieux, et le code le dit.
 */
export class LedgerUniteFigee1780500000000 implements MigrationInterface {
  name = 'LedgerUniteFigee1780500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE stock_mouvements ADD COLUMN IF NOT EXISTS unite varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stock_mouvements DROP COLUMN IF EXISTS unite`);
  }
}
