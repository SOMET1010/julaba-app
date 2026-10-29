import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * LOT-RECOVERY — LA TABLE DES CODES DE RÉCUPÉRATION (SPEC-AUTH-CIBLE §3). (29/10/2026)
 *
 * Le scénario le plus dur de la spec : téléphone perdu/neuf/réinstallé —
 * l'identifiant WebAuthn disparaît avec l'appareil. AUTH-RECOVERY-01
 * (arbitrage Patrick 19/09/2026) consignait le vide : « ne pas improviser une
 * récupération dans les routes existantes (rouvrirait SEC-05) ». Ce lot donne
 * au chantier dédié sa fondation : une table par code, un code par incident.
 *
 * Ce que porte chaque ligne : le compte à ré-enrôler (jamais le détenteur),
 * le hash bcrypt du code (le clair n'existe nulle part après création),
 * l'état (actif → consommé / révoqué), qui l'a généré, qui l'a révoqué, et
 * l'échelle d'attente serveur (echecs + verrou_le, même politique que
 * verrou-pin.ts — SPEC-AUTH-CIBLE §4.4 : toute limitation côté serveur).
 *
 * Rien ici ne touche aux routes existantes : le contrôleur de récupération est
 * un fichier séparé, câblé à côté — jamais à l'intérieur — de /login et de
 * /webauthn/*.
 */
export class CodesRecuperation1782400000000 implements MigrationInterface {
  name = 'CodesRecuperation1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS codes_recuperation (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        code_hash varchar(255) NOT NULL,
        statut varchar(20) NOT NULL DEFAULT 'actif',
        genere_par uuid,
        expire_le timestamptz,
        consomme_le timestamptz,
        revoque_le timestamptz,
        revoque_par uuid,
        echecs integer NOT NULL DEFAULT 0,
        verrou_le timestamptz,
        genere_le timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_codes_recuperation_user_statut
        ON codes_recuperation (user_id, statut);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_codes_recuperation_user_id
        ON codes_recuperation (user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_codes_recuperation_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_codes_recuperation_user_statut`);
    await queryRunner.query(`DROP TABLE IF EXISTS codes_recuperation`);
  }
}
