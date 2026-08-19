import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stock commun de coopérative — corrige le stub documenté (docs/RESIDUS.md
 * §"Distribution stock coopérative") : `POST /cooperatives/distribution`
 * résolvait déjà la coopérative de l'appelant mais n'écrivait RIEN en base
 * (persisted: false). Il n'existait aucune table de stock PARTAGÉ entre
 * membres d'une coopérative — l'écran "Stock commun" du rôle coopérateur
 * affichait en réalité le stock PERSONNEL de l'utilisateur (table `stocks`,
 * scopée par proprietaire_id), pas un pot commun.
 *
 * Deux tables :
 *  - cooperative_stock            : le stock COURANT (une ligne = le total
 *    présent d'un produit pour une coopérative). Alimenté par les apports,
 *    décrémenté par les distributions.
 *  - cooperative_stock_mouvements : le journal APPEND-ONLY de chaque apport
 *    et chaque distribution (qui, quoi, combien, quand) — même philosophie
 *    que le journal de fidélité (fidelite_evenements, PR #190) et le journal
 *    argent (ADR-001) : les vues sont dérivées, jamais stockées en parallèle.
 *
 * Idempotente (CREATE ... IF NOT EXISTS partout) : sûre sur base neuve (où
 * `synchronize` a déjà construit le schéma depuis les entités) ET sur base
 * existante (où c'est cette migration qui construit le schéma en prod).
 */
export class CooperativeStockCommun1781100000000 implements MigrationInterface {
  name = 'CooperativeStockCommun1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.cooperative_stock (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cooperative_id uuid NOT NULL,
        produit varchar(255) NOT NULL,
        categorie varchar(120),
        quantite numeric(15,2) NOT NULL DEFAULT 0,
        unite varchar(50) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_cooperative_stock_produit
        ON public.cooperative_stock (cooperative_id, produit)
    `);
    // cooperatives.id a une vraie PK (baseline "PK_52fc93ab8869e3f71c46601fe9b") :
    // FK sûre, contrairement à cooperative_besoins qui n'en porte pas dans ce dépôt.
    await queryRunner.query(`
      ALTER TABLE public.cooperative_stock
        DROP CONSTRAINT IF EXISTS fk_cooperative_stock_cooperative
    `);
    await queryRunner.query(`
      ALTER TABLE public.cooperative_stock
        ADD CONSTRAINT fk_cooperative_stock_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES public.cooperatives(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.cooperative_stock_mouvements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cooperative_id uuid NOT NULL,
        produit varchar(255) NOT NULL,
        type varchar(20) NOT NULL CHECK (type IN ('apport', 'distribution')),
        quantite numeric(15,2) NOT NULL CHECK (quantite > 0),
        membre_id uuid NOT NULL,
        besoin_id uuid,
        note text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE public.cooperative_stock_mouvements
        DROP CONSTRAINT IF EXISTS fk_cooperative_stock_mouvements_cooperative
    `);
    await queryRunner.query(`
      ALTER TABLE public.cooperative_stock_mouvements
        ADD CONSTRAINT fk_cooperative_stock_mouvements_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES public.cooperatives(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_cooperative_stock_mouvements_coop_produit
        ON public.cooperative_stock_mouvements (cooperative_id, produit)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.cooperative_stock_mouvements`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.cooperative_stock`);
  }
}
