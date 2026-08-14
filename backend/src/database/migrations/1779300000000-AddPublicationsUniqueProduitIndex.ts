import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marché producteur : index unique d'expression `ux_publications_user_produit`
 * EXIGÉ par le `INSERT ... ON CONFLICT (user_id, LOWER(TRIM(produit)))` du
 * handler POST /publications. Cet index n'était posé par aucune migration ni par
 * DbInit — seul le test invariant le créait — donc absent en prod : toute
 * publication échouait en 500 (« no unique or exclusion constraint matching the
 * ON CONFLICT specification »).
 *
 * Miroir du bloc idempotent de DbInitService.runInit() (mécanisme réel du schéma
 * de prod) : ajout colonne défensif, dédoublonnage, puis index unique.
 */
export class AddPublicationsUniqueProduitIndex1779300000000
  implements MigrationInterface
{
  name = 'AddPublicationsUniqueProduitIndex1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE publications ADD COLUMN IF NOT EXISTS quantite_initiale numeric(10,2)`,
    );
    // Dédoublonnage préalable (garde une ligne par clé normalisée) pour que le
    // CREATE UNIQUE INDEX réussisse sur une base déjà peuplée.
    await queryRunner.query(`
      DELETE FROM publications a
      USING publications b
      WHERE a.user_id = b.user_id
        AND LOWER(TRIM(a.produit)) = LOWER(TRIM(b.produit))
        AND a.ctid < b.ctid
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_publications_user_produit
        ON publications (user_id, LOWER(TRIM(produit)))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_publications_user_produit`);
    // quantite_initiale et le dédoublonnage ne sont pas réversibles sans perte —
    // volontairement non défaits (colonne inoffensive, données déjà fusionnées).
  }
}
