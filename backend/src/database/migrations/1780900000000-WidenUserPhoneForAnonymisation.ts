import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Suppression de compte avec anonymisation réelle (loi ivoirienne n°2013-450).
 *
 * `users.phone` était `varchar(20)`. Le placeholder d'anonymisation posé par
 * DELETE /auth/account est `deleted_` + l'UUID de l'utilisateur, soit 44
 * caractères — largement au-delà de 20. Sur une base EXISTANTE (peuplée), la
 * suppression de compte échouait donc en base avec une erreur Postgres
 * « value too long for type character varying(20) » : la fonctionnalité de
 * suppression était cassée en pratique, pas seulement incomplète sur les
 * autres champs. On élargit à 50 (36 UUID + 8 préfixe + marge), en ALTER
 * simple : élargir une colonne varchar est une opération sûre, sans perte de
 * données, compatible base neuve et base existante (CONSTITUTION §4).
 */
export class WidenUserPhoneForAnonymisation1780900000000 implements MigrationInterface {
  name = 'WidenUserPhoneForAnonymisation1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN phone TYPE character varying(50)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Pas de retour arrière automatique à 20 : rétrécir pourrait tronquer des
    // valeurs de comptes déjà anonymisés (`deleted_<uuid>`, 44 caractères).
    // Aucune action destructive dans down().
  }
}
