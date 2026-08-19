import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tontine réelle entre plusieurs utilisateurs Jùlaba — module SACRÉ (déplace
 * de l'argent réel entre wallets, cf. CONSTITUTION.md §7). Avant cette
 * migration, "tontine" n'existait dans aucune table, entité ou endpoint : le
 * seul mot était un libellé de catégorie de dépense / un mot-clé vocal, sans
 * lien avec un vrai groupe d'épargne tournant.
 *
 * Modèle produit tranché pour ce premier lot (voir Tontine.entity.ts) :
 *  - ordre de réception fixé à la création, jamais recalculé ;
 *  - montant et cadence fixes pour tout le cycle ;
 *  - un cycle complet = chaque membre reçoit une fois, dans l'ordre fixé ;
 *    renouvellement de cycle HORS PÉRIMÈTRE (extension future).
 *
 * Trois tables :
 *  - tontines         : une ligne = un groupe (montant, cadence, statut,
 *    cycle courant).
 *  - tontine_membres  : l'ordre FIXE de chaque membre dans le tour
 *    (unique par tontine+ordre, unique par tontine+utilisateur).
 *  - tontine_mouvements : journal APPEND-ONLY de chaque cotisation et chaque
 *    distribution (même philosophie que fidelite_evenements, PR #190, et
 *    cooperative_stock_mouvements, migration 1781100000000) — unique par
 *    (tontine, membre, cycle, type) : empêche structurellement une double
 *    cotisation ou une double distribution sur le même cycle.
 *
 * Idempotente (CREATE ... IF NOT EXISTS partout) : sûre sur base neuve (où
 * `synchronize` a déjà construit le schéma depuis les entités) ET sur base
 * existante (où c'est cette migration qui construit le schéma en prod).
 */
export class Tontines1781200000000 implements MigrationInterface {
  name = 'Tontines1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE tontines_statut_enum AS ENUM ('active', 'terminee', 'annulee');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.tontines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nom varchar(255) NOT NULL,
        responsable_id uuid NOT NULL,
        montant_cotisation numeric(15,2) NOT NULL,
        cadence_jours int NOT NULL,
        date_debut date NOT NULL,
        statut tontines_statut_enum NOT NULL DEFAULT 'active',
        cycle_courant int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontines
        DROP CONSTRAINT IF EXISTS fk_tontines_responsable
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontines
        ADD CONSTRAINT fk_tontines_responsable
        FOREIGN KEY (responsable_id) REFERENCES public.users(id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.tontine_membres (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tontine_id uuid NOT NULL,
        user_id uuid NOT NULL,
        ordre int NOT NULL,
        a_recu boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_membres
        DROP CONSTRAINT IF EXISTS fk_tontine_membres_tontine
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_membres
        ADD CONSTRAINT fk_tontine_membres_tontine
        FOREIGN KEY (tontine_id) REFERENCES public.tontines(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_membres
        DROP CONSTRAINT IF EXISTS fk_tontine_membres_user
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_membres
        ADD CONSTRAINT fk_tontine_membres_user
        FOREIGN KEY (user_id) REFERENCES public.users(id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tontine_membres_ordre
        ON public.tontine_membres (tontine_id, ordre)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tontine_membres_user
        ON public.tontine_membres (tontine_id, user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.tontine_mouvements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tontine_id uuid NOT NULL,
        type varchar(20) NOT NULL CHECK (type IN ('cotisation', 'distribution')),
        membre_id uuid NOT NULL,
        cycle_numero int NOT NULL,
        montant numeric(15,2) NOT NULL CHECK (montant > 0),
        wallet_transaction_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_mouvements
        DROP CONSTRAINT IF EXISTS fk_tontine_mouvements_tontine
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_mouvements
        ADD CONSTRAINT fk_tontine_mouvements_tontine
        FOREIGN KEY (tontine_id) REFERENCES public.tontines(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_mouvements
        DROP CONSTRAINT IF EXISTS fk_tontine_mouvements_wallet_tx
    `);
    await queryRunner.query(`
      ALTER TABLE public.tontine_mouvements
        ADD CONSTRAINT fk_tontine_mouvements_wallet_tx
        FOREIGN KEY (wallet_transaction_id) REFERENCES public.wallet_transactions(id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tontine_mouvements_cycle
        ON public.tontine_mouvements (tontine_id, membre_id, cycle_numero, type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_tontine_mouvements_tontine
        ON public.tontine_mouvements (tontine_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.tontine_mouvements`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.tontine_membres`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.tontines`);
    await queryRunner.query(`DROP TYPE IF EXISTS tontines_statut_enum`);
  }
}
