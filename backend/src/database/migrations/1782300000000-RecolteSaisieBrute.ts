import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La SAISIE BRUTE d'une récolte est enregistrée à côté du poids dérivé.
 *
 * Avant : un producteur déclare « 3 paniers », l'écran applique un facteur
 * GLOBAL (panier = 10 kg, quel que soit le produit) et envoie
 * `quantite = 30, unite = 'kg'`. La saisie réelle n'existait NULLE PART : le
 * poids était inventé, et rien ne permettait de retrouver ce qui avait été dit.
 *
 * ADDITIF ET NON DESTRUCTIF. `quantite` reste en kilos — réinterpréter une
 * colonne déjà peuplée serait pire que le défaut. Les trois colonnes sont
 * NULLABLES : les lignes historiques restent valides, et leur absence de
 * saisie brute est une information juste (on ne sait pas ce qui a été tapé).
 *
 * Ce que cela rend possible, et qui était impossible : le jour où le facteur
 * devient propre au produit, les lignes portant leur saisie brute sont
 * RECALCULABLES. Sans ces colonnes, aucune correction n'aurait jamais pu
 * retrouver la vérité.
 */
export class RecolteSaisieBrute1782300000000 implements MigrationInterface {
  name = 'RecolteSaisieBrute1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS quantite_saisie numeric');
    await queryRunner.query('ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS unite_saisie character varying(50)');
    await queryRunner.query('ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS facteur_saisie numeric');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE recoltes DROP COLUMN IF EXISTS quantite_saisie');
    await queryRunner.query('ALTER TABLE recoltes DROP COLUMN IF EXISTS unite_saisie');
    await queryRunner.query('ALTER TABLE recoltes DROP COLUMN IF EXISTS facteur_saisie');
  }
}
