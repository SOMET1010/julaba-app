import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lien Commande ↔ Négociation : colonne `negociation_id` sur `commandes`.
 *
 * Jusqu'ici, une commande née d'une négociation acceptée ne portait le lien que
 * dans `notes` (« Issu de negociation <id> » / « Contre-offre acceptee par
 * marchand <id> ») — informel, inexploitable par l'API. Le front cherchait
 * `negociation_id` sur la commande (CommandeContext) et, faute de le trouver,
 * `contreProposerPrix` échouait toujours (« Négociation introuvable pour cette
 * commande ») et l'UI ne pouvait pas relier une commande à son prix négocié.
 *
 * Colonne nullable sans contrainte FK, même pattern que `recolte_id` : le lien
 * est informatif (traçabilité), pas structurel — une négociation purgée ne doit
 * pas bloquer la commande.
 *
 * Backfill : l'historique est reclassé depuis `notes` (les deux libellés émis
 * par le contrôleur), en ne posant que des ids qui existent réellement dans
 * `negociations` — l'historique devient exact, pas seulement le futur (même
 * exigence que la migration du ledger typé).
 */
export class CommandeNegociationLink1780600000000 implements MigrationInterface {
  name = 'CommandeNegociationLink1780600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE commandes ADD COLUMN IF NOT EXISTS negociation_id uuid`,
    );
    // Backfill depuis les notes historiques — uniquement des ids réels.
    await queryRunner.query(
      `UPDATE commandes c
         SET negociation_id = n.id
        FROM negociations n
       WHERE c.negociation_id IS NULL
         AND c.notes IS NOT NULL
         AND n.id::text = substring(
               c.notes FROM '(?:Issu de negociation|Contre-offre acceptee par marchand) ([0-9a-fA-F-]{36})'
             )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE commandes DROP COLUMN IF EXISTS negociation_id`);
  }
}
