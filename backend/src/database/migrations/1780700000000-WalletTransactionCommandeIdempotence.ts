import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotence du paiement Keiwa d'une commande — garde-fou au niveau BASE.
 *
 * Contexte : POST /commandes/:id/paiement (branche Keiwa) déplace de l'argent
 * réel entre deux wallets (débit acheteur, crédit vendeur). Le contrôleur verrouille
 * désormais la commande (pessimistic_write) et relit `statut_paiement` sous ce
 * verrou avant tout mouvement — ce qui rend l'opération atomique et idempotente
 * au niveau applicatif. Cette migration ajoute une SECONDE ligne de défense,
 * indépendante du code applicatif : un index UNIQUE partiel qui interdit à la
 * base elle-même d'accepter deux transactions wallet (un débit, un crédit) pour
 * la MÊME commande. Si un bug futur contournait le verrou applicatif, l'écriture
 * en double échouerait à l'INSERT plutôt que de dédoubler l'argent en silence.
 *
 * Portée : uniquement les lignes rattachées à une commande
 * (related_entity_type = 'commande'), et seulement les mouvements réels
 * (type IN ('debit','credit')) — n'affecte ni les recharges/retraits mobile
 * money (bpay, hors périmètre), ni les mouvements escrow.
 */
export class WalletTransactionCommandeIdempotence1780700000000 implements MigrationInterface {
  name = 'WalletTransactionCommandeIdempotence1780700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_tx_commande_idempotence
      ON wallet_transactions (related_entity_id, user_id, type)
      WHERE related_entity_type = 'commande' AND type IN ('debit', 'credit')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_wallet_tx_commande_idempotence`);
  }
}
