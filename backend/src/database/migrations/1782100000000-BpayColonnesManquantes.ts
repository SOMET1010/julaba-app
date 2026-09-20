import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SCHEMA-07 — `bpay_transactions` n'a jamais eu les colonnes que le code écrit.
 *
 * `wallets.controller.ts` et `wallets-public.controller.ts` insèrent `amount`,
 * `merchant_tx_id`, `provider`, `type`, et mettent à jour `error_message`.
 * Aucune de ces colonnes n'existait — ni dans DbInit, ni dans la baseline.
 * Tout paiement B-Pay et toute recharge de portefeuille échouaient.
 *
 * Trouvé par le garde-fou au niveau COLONNE de SCHEMA-PILOTE, qui n'existait
 * pas quand B1 et STK-01 ont été corrigés : ceux-là ne vérifiaient que les
 * tables. `montant` est conservée — on ne supprime pas une colonne qui peut
 * porter des données.
 */
export class BpayColonnesManquantes1782100000000 implements MigrationInterface {
  name = 'BpayColonnesManquantes1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [col, type] of [
      ['amount', 'numeric'],
      ['merchant_tx_id', 'text'],
      ['provider', 'text'],
      ['type', 'text'],
      ['error_message', 'text'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE bpay_transactions ADD COLUMN IF NOT EXISTS ${col} ${type}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['error_message', 'type', 'provider', 'merchant_tx_id', 'amount']) {
      await queryRunner.query(`ALTER TABLE bpay_transactions DROP COLUMN IF EXISTS ${col}`);
    }
  }
}
