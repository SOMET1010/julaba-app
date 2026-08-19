import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Journal append-only de la fidélité — `fidelite_evenements` (Constitution §5).
 *
 * `fidelite_config` et `fidelite_clients` existent déjà (baseline) : le
 * barème se paramètre et se persiste, et le solde de points par client aussi.
 * Ce qui manquait : une TRACE immuable de chaque gain de points et de chaque
 * récompense accordée — jusqu'ici `POST /fidelite/gagner` et
 * `POST /fidelite/utiliser` ne faisaient que MUTER `fidelite_clients.points`
 * en place, sans laisser de preuve consultable ni de protection contre un
 * double crédit/débit en cas de rejeu réseau.
 *
 * `idempotency_key` (nullable, unique PARTIEL par marchand) — même mécanisme
 * que `caisse_transactions.idempotency_key` (cf. AddCaisseTransactionIdempotencyKey,
 * archivée dans la baseline) : une clé déjà vue ne recrédite/redébite jamais.
 */
export class FideliteEvenements1780800000000 implements MigrationInterface {
  name = 'FideliteEvenements1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.fidelite_evenements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        marchand_id uuid NOT NULL,
        client_id uuid NOT NULL,
        telephone varchar(40) NOT NULL,
        type varchar(20) NOT NULL,
        points_delta numeric NOT NULL,
        points_apres numeric NOT NULL,
        montant_achat numeric,
        remise_fcfa numeric,
        idempotency_key varchar(120),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fidelite_evenements_marchand_tel
        ON public.fidelite_evenements (marchand_id, telephone, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_fidelite_evenements_idem
        ON public.fidelite_evenements (marchand_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.fidelite_evenements`);
  }
}
