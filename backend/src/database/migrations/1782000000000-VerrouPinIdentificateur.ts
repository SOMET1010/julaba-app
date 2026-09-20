import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Le PIN identificateur avait un compteur d'échecs : aucun.
 * `identificateur/me/verify-pin` acceptait un nombre illimité d'essais sur
 * 4 096 combinaisons. Ces deux colonnes lui donnent le verrou de
 * `verrou-pin.ts`, séparé de celui du mot de passe pour qu'une reconnexion ne
 * le remette pas à zéro.
 */
export class VerrouPinIdentificateur1782000000000 implements MigrationInterface {
  name = 'VerrouPinIdentificateur1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_identificateur_pin_attempts int NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS identificateur_pin_locked_until timestamp NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users DROP COLUMN IF EXISTS identificateur_pin_locked_until');
    await queryRunner.query('ALTER TABLE users DROP COLUMN IF EXISTS failed_identificateur_pin_attempts');
  }
}
