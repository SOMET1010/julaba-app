import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persistance backend réelle des cotisations sociales (CNPS/CNAM) —
 * `cotisations_sociales`, journal APPEND-ONLY (Constitution §5), même patron
 * que `fidelite_evenements` (cf. FideliteEvenements1780800000000).
 *
 * Contexte : jusqu'ici l'écran « Protection sociale » (CDC 8.1.2/9.1) vivait
 * intégralement dans `localStorage` côté front
 * (`protectionSociale.service.ts`, `SourceLocale`) — rien de consultable côté
 * serveur, et le mode de paiement « keiwa » n'était qu'une chaîne stockée,
 * sans aucun débit réel. Cette table remplace le stockage local par une
 * persistance réelle, et quand `mode = 'keiwa'`, rattache le versement à
 * l'écriture `wallet_transactions` qui a réellement débité le compte de la
 * commerçante (jamais celui d'un tiers).
 *
 * Portée assumée : suivi DÉCLARATIF, aucune connexion à la vraie API
 * CNPS/CNAM (hors périmètre, cf. docs/PARCOURS.md) — seul le lieu de
 * stockage et la réalité du débit Keiwa changent.
 *
 * Idempotence du débit Keiwa : index unique partiel sur wallet_transactions,
 * même mécanisme que ux_wallet_tx_commande_idempotence (cf.
 * WalletTransactionCommandeIdempotence1780700000000) — la base refuse un
 * second débit pour la MÊME cotisation, en plus du verrou applicatif posé
 * dans ProtectionSocialeController (transaction unique : création cotisation
 * + débit wallet, tout ou rien).
 */
export class CotisationsSociales1781100000000 implements MigrationInterface {
  name = 'CotisationsSociales1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.cotisations_sociales (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id),
        organisme varchar(10) NOT NULL CHECK (organisme IN ('CNPS', 'CNAM')),
        montant numeric(15,2) NOT NULL CHECK (montant > 0),
        periode varchar(7) NOT NULL,
        date_paiement timestamptz NOT NULL,
        mode varchar(20) NOT NULL CHECK (mode IN ('especes', 'keiwa', 'mobile_money')),
        wallet_transaction_id uuid REFERENCES public.wallet_transactions(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        -- Un mode 'keiwa' doit toujours être rattaché à un débit réel ; un
        -- mode espèces/mobile money ne doit jamais l'être (pas de mouvement
        -- wallet fantôme, pas de débit orphelin). Posée dans le CREATE TABLE
        -- (pas d'ALTER TABLE ADD CONSTRAINT séparé ensuite : Postgres ne
        -- supporte pas "ADD CONSTRAINT IF NOT EXISTS" — IF NOT EXISTS sur la
        -- table suffit à l'idempotence).
        CONSTRAINT ck_cotisations_sociales_keiwa_tx CHECK (
          (mode = 'keiwa' AND wallet_transaction_id IS NOT NULL)
          OR (mode <> 'keiwa' AND wallet_transaction_id IS NULL)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cotisations_sociales_user
        ON public.cotisations_sociales (user_id, created_at DESC)
    `);

    // Idempotence du débit Keiwa — seconde ligne de défense au niveau base,
    // indépendante du verrou applicatif. Cf. docstring ci-dessus.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_tx_cotisation_idempotence
      ON public.wallet_transactions (related_entity_id, user_id, type)
      WHERE related_entity_type = 'cotisation_sociale' AND type = 'debit'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_wallet_tx_cotisation_idempotence`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.cotisations_sociales`);
  }
}
