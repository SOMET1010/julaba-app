import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comment la personne veut qu'on l'appelle.
 *
 * Decision Patrick (15/09/2026) : par defaut on emploie le PRENOM SEUL, et
 * la fiche d'identification demande a la personne le nom par lequel elle
 * veut etre appelee. C'est celui-la qui est employe.
 *
 * Remplace la derivation par genre (« Maman » / « Papa ») : deduire un titre
 * d'une colonne dont la valeur par defaut est 'femme' revient a en inventer
 * un pour tout le monde. Ici personne ne devine : soit elle l'a dit, soit on
 * s'en tient a son prenom.
 *
 * Nullable, et le reste : une fiche deja remplie n'a rien a rattraper, la
 * personne sera appelee par son prenom jusqu'a ce qu'elle choisisse.
 */
export class AppellationChoisie1781800000000 implements MigrationInterface {
  name = 'AppellationChoisie1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS appellation character varying(60)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS appellation`);
  }
}
