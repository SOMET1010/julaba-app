import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Trésorerie de coopérative — `cooperative_transactions`, la table que
 * `GET/POST/PATCH /cooperatives/tresorerie` et `POST /cooperatives/cotisation`
 * lisent et écrivent depuis leur introduction (cooperatives-rest.controller.ts)
 * SANS qu'aucune migration ni entité TypeORM ne l'ait jamais créée.
 *
 * Conséquence en recette (nuit du 2026-08-20) : la table n'existe ni sur une
 * base neuve (`synchronize` ne construit que depuis les *entités* — il n'y en
 * a pas pour cette table, elle n'est touchée qu'en SQL brut) ni sur une base
 * existante (aucune migration ne la crée) → `GET /cooperatives/tresorerie`
 * plante systématiquement en 500 dès qu'un utilisateur résout une coopérative
 * (QueryFailedError: relation "cooperative_transactions" does not exist).
 * POST/PATCH tresorerie et POST cotisation ont le même trou ; ce dernier est
 * juste masqué en surface par son `catch` (retourne success:false au lieu de
 * planter), mais aucune cotisation n'était réellement persistée non plus.
 *
 * Même patron que `cooperative_stock` (migration 1781100000000) : table
 * réelle avec FK vers `cooperatives(id)` (PK garantie, cf. commentaire de
 * cette migration), pas de table ad hoc créée à la volée comme
 * `cooperative_besoins` — la trésorerie est une fonctionnalité assumée avec
 * lecture ET écriture actives, pas un stub.
 *
 * Idempotente (CREATE ... IF NOT EXISTS) : sûre sur base neuve (où
 * `synchronize` a déjà construit le reste du schéma depuis les entités) ET
 * sur base existante (où c'est cette migration qui construit le schéma en
 * prod).
 */
export class CooperativeTransactions1781300000000 implements MigrationInterface {
  name = 'CooperativeTransactions1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.cooperative_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cooperative_id uuid NOT NULL,
        user_id uuid NOT NULL,
        type varchar(20) NOT NULL CHECK (type IN ('entree', 'sortie')),
        categorie varchar(50) NOT NULL DEFAULT 'autre',
        montant numeric(15,2) NOT NULL CHECK (montant > 0),
        membre_id uuid,
        description text,
        statut varchar(20) NOT NULL DEFAULT 'en_attente'
          CHECK (statut IN ('en_attente', 'validee', 'annulee')),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE public.cooperative_transactions
        DROP CONSTRAINT IF EXISTS fk_cooperative_transactions_cooperative
    `);
    await queryRunner.query(`
      ALTER TABLE public.cooperative_transactions
        ADD CONSTRAINT fk_cooperative_transactions_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES public.cooperatives(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_cooperative_transactions_coop_created
        ON public.cooperative_transactions (cooperative_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.cooperative_transactions`);
  }
}
