import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PROD-03 — DISTINGUER LIVRÉ DE VENDU, en quantités. (20/10/2026, plan
 * d'action audit workflow officiel §5 item 2.)
 *
 * Jusqu'ici `stock_vendu` était incrémenté à la CONFIRMATION de la commande
 * (stock-reservation.service.convertir) : la récolte affichait tout de suite
 * tout le volume commandé comme « vendu », alors que le docx officiel demande
 * quatre états distincts — produites / disponibles / commandées / EFFECTIVEMENT
 * LIVRÉES. La livraison n'était qu'un statut texte, sans effet quantité.
 *
 * `stock_livre` porte l'état « livré » en quantité :
 *  - incrémenté quand une commande CONFIRMÉE passe à `livree` (idempotent :
 *    le garde statut côté contrôleur ne le compte qu'une fois) ;
 *  - restitué si la commande livrée retombe en `annulee`/`litige`.
 *
 * `stock_vendu` garde sa sémique confirmée (la promesse ferme) : livré ⊆ vendu.
 * L'invariant I-C du spec stock-reservation (« livree ne modifie ni disponible
 * ni vendu ») reste vrai.
 */
export class RecolteStockLivre1782300000010 implements MigrationInterface {
  name = 'RecolteStockLivre1782300000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS stock_livre numeric(10,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE recoltes DROP COLUMN IF EXISTS stock_livre`);
  }
}
