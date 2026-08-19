import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotence du transfert compte-à-compte (POST /wallets/me/transfert).
 *
 * Contexte : contrairement au paiement Keiwa d'une commande (idempotence
 * ancrée sur l'id de commande, cf. WalletTransactionCommandeIdempotence), un
 * transfert compte-à-compte n'a pas d'entité métier préexistante à qui
 * rattacher la clé — c'est le CLIENT qui fournit une clé d'idempotence par
 * tentative d'envoi (même mécanisme que caisse_transactions.idempotency_key,
 * cf. AddCaisseTransactionIdempotencyKey) : rejouer la même clé (retry
 * réseau, double-clic sur "Envoyer") ne doit jamais créer un second
 * mouvement.
 *
 * Colonne nullable + index UNIQUE PARTIEL (WHERE idempotency_key IS NOT NULL) :
 * n'affecte aucun mouvement existant (crédit/débit admin, paiement commande,
 * escrow) qui n'en fournit pas — seuls les transferts en fournissent une.
 * Le verrou applicatif (WalletsService.transfererVersUtilisateur, verrous
 * pessimistes sur les deux wallets + relecture de la clé dans la même
 * transaction) rend déjà l'opération idempotente ; cet index est la SECONDE
 * ligne de défense, indépendante du code applicatif, au niveau base.
 */
export class WalletTransactionTransfertIdempotence1781000000000 implements MigrationInterface {
  name = 'WalletTransactionTransfertIdempotence1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS idempotency_key varchar(120)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_tx_idempotency_key
      ON wallet_transactions (idempotency_key, user_id, type)
      WHERE idempotency_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_wallet_tx_idempotency_key`);
    await queryRunner.query(`ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS idempotency_key`);
  }
}
