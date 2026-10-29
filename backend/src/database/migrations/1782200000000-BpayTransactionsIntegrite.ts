import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C-07 — intégrité des webhooks B-Pay AU NIVEAU BASE (audit comptable
 * 12/10 §4 chaîne B et §6 C-07 ; résidu confirmé par AUDIT-ACTEUR-MARCHAND
 * 19/10 §4 : « bpay_transactions sans unicité pay_token/merchant_tx_id »).
 *
 * Un paiement B-Pay est identifié par `pay_token` (token opérateur) ou par
 * `merchant_tx_id` (notre référence marchande — pour un retrait, les deux
 * valent la même chose, cf. wallets.controller.ts retrait-mobile). Aucune
 * contrainte d'unicité ne les protégeait : le double-crédit n'était bloqué
 * que par le `UPDATE ... WHERE status='PENDING'` du code applicatif
 * (webhook + cron). La ligne de défense attendue d'une clé d'idempotence
 * financière, c'est la base elle-même.
 *
 * Index UNIQUE PARTIELS (`WHERE ... IS NOT NULL`) : même motif que
 * `ux_wallet_tx_idempotency_key` (1781000000001) — les colonnes restent
 * nullables et les lignes sans token ne participent pas.
 *
 * Doublons préexistants : on ne supprime JAMAIS une ligne d'argent. Si la
 * base en porte (double INSERT historique), les doublons sont DÉTACHÉS —
 * l'identifiant des lignes les plus récentes est mis à NULL — en gardant la
 * ligne la plus ancienne (première vue de l'opérateur). Le webhook et le cron
 * retrouvent la transaction par l'identifiant resté en place ; la trace
 * financière (montant, statut, dates, provider) des doublons détachés est
 * conservée intégralement. SANS ce dédoublonnage, la création de l'index
 * unique échouerait sur une base polluée et bloquerait la chaîne de
 * migrations. La garde au niveau colonne de SCHEMA-PILOTE n'est pas affectée :
 * une empreinte (tables/colonnes) ne voit pas les index.
 *
 * Miroir obligatoire : DbInitService pose les MÊMES index (CREATE UNIQUE
 * INDEX IF NOT EXISTS) — sur une base VIERGE la chaîne de migrations ne tourne
 * PAS et DbInit est le seul chemin garanti (schema-ledger-sans-migration.spec).
 */
export class BpayTransactionsIntegrite1782200000000 implements MigrationInterface {
  name = 'BpayTransactionsIntegrite1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Détacher (non destructif) les doublons préexistants, sinon l'index
    //    unique échouerait. Le plus ancien (created_at, puis id en cas d'égalité)
    //    reste porteur de l'identifiant.
    await queryRunner.query(`
      UPDATE bpay_transactions t SET merchant_tx_id = NULL
        FROM bpay_transactions d
       WHERE t.merchant_tx_id IS NOT NULL
         AND d.merchant_tx_id IS NOT NULL
         AND d.merchant_tx_id = t.merchant_tx_id
         AND (t.created_at, t.id) > (d.created_at, d.id)
    `);
    await queryRunner.query(`
      UPDATE bpay_transactions t SET pay_token = NULL
        FROM bpay_transactions d
       WHERE t.pay_token IS NOT NULL
         AND d.pay_token IS NOT NULL
         AND d.pay_token = t.pay_token
         AND (t.created_at, t.id) > (d.created_at, d.id)
    `);
    // 2) Les deux verrous d'unicité — la base refuse désormais le double
    //    crédit par construction, indépendamment du code applicatif.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_bpay_transactions_pay_token
      ON bpay_transactions (pay_token)
      WHERE pay_token IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_bpay_transactions_merchant_tx_id
      ON bpay_transactions (merchant_tx_id)
      WHERE merchant_tx_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Les doublons détachés ne sont pas restaurés : leur identifiant perdu
    // l'était AVANT cette migration (faute d'unicité, aucune requête ne
    // garantissait lequel des doublons le webhook traitait).
    await queryRunner.query(`DROP INDEX IF EXISTS ux_bpay_transactions_merchant_tx_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_bpay_transactions_pay_token`);
  }
}
