import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  CHECK_SAISIE_BRUTE,
  NOM_CONTRAINTE_SAISIE_BRUTE,
} from '../contrainte-saisie-recolte';

/**
 * La SAISIE BRUTE d'une récolte est enregistrée à côté du poids dérivé.
 *
 * Avant : un producteur déclare « 3 paniers », l'écran applique un facteur
 * GLOBAL (panier = 10 kg, quel que soit le produit) et envoie
 * `quantite = 30, unite = 'kg'`. La saisie réelle n'existait NULLE PART : le
 * poids était inventé, et rien ne permettait de retrouver ce qui avait été dit.
 *
 * CE QU'ON AFFIRME : les composantes metier de la saisie d'origine sont
 * conservees SEPAREMENT de la quantite canonique, avec une precision bornee
 * par le schema (numeric(12,3) et numeric(12,4)). Et, grace a la contrainte
 * posee plus bas : toute NOUVELLE saisie structuree est atomique, positive et
 * coherente avec cette quantite.
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
    await queryRunner.query('ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS quantite_saisie numeric(12,3)');
    await queryRunner.query('ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS unite_saisie character varying(50)');
    await queryRunner.query('ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS facteur_saisie numeric(12,4)');

    // OUVRIR TROIS COLONNES SANS GARDE, C'EST LES REMPLIR DE BRUIT DES LE
    // PREMIER JOUR. `NOT VALID` protege les ecritures sans scanner ni rejeter
    // l'historique — toutes les lignes anterieures portent trois NULL, que la
    // regle admet explicitement.
    await queryRunner.query(
      `ALTER TABLE recoltes DROP CONSTRAINT IF EXISTS ${NOM_CONTRAINTE_SAISIE_BRUTE}`,
    );
    await queryRunner.query(
      `ALTER TABLE recoltes
         ADD CONSTRAINT ${NOM_CONTRAINTE_SAISIE_BRUTE} CHECK (${CHECK_SAISIE_BRUTE}) NOT VALID`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE recoltes DROP CONSTRAINT IF EXISTS ${NOM_CONTRAINTE_SAISIE_BRUTE}`,
    );
    await queryRunner.query('ALTER TABLE recoltes DROP COLUMN IF EXISTS quantite_saisie');
    await queryRunner.query('ALTER TABLE recoltes DROP COLUMN IF EXISTS unite_saisie');
    await queryRunner.query('ALTER TABLE recoltes DROP COLUMN IF EXISTS facteur_saisie');
  }
}
