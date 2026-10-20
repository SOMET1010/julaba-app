import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IDENT-09 — L'IDEMPOTENCE DE LA SOUMISSION : une clé, un dossier. (20/10/2026)
 *
 * POST /identifications/create-with-acteur créait acteur + user + dossier
 * sans aucune clé d'idempotence. En terrain, le réseau coupe au pire moment :
 * le client rejoue, et l'identificateur essuie soit un faux « Ce numero de
 * telephone est deja utilise » (la première soumission avait RÉUSSI), soit
 * un doublon complet. Le brouillon protège la saisie, pas la soumission.
 *
 * `idempotency_key` : générée par le client avant le POST, persistée avec le
 * brouillon, rejouée à l'identique. UNIQUE — les NULL multiples restent
 * licites (dossiers back-office, anciens clients). Le rejeu d'une clé déjà
 * posée renvoie le dossier EXISTANT : même id, zéro acteur supplémentaire.
 */
export class IdentificationIdempotence1782300000030 implements MigrationInterface {
  name = 'IdentificationIdempotence1782300000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE identifications ADD COLUMN IF NOT EXISTS idempotency_key text`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_identifications_idempotency_key ON identifications (idempotency_key) WHERE idempotency_key IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_identifications_idempotency_key`);
    await queryRunner.query(`ALTER TABLE identifications DROP COLUMN IF EXISTS idempotency_key`);
  }
}
