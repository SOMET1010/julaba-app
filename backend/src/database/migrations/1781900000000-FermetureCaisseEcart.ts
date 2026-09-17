import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fermeture de caisse : garder ce qu'elle a compté, et l'écart.
 *
 * Défaut réparé : à la fermeture, l'application envoyait `comptage_reel` et le
 * serveur lisait `body.fond_final`. Les deux noms ne correspondaient pas, donc
 * `fond_final || 0` écrivait **0 à chaque fermeture**, quel que soit le montant
 * compté par la marchande. Ses notes de clôture étaient perdues de même.
 *
 * Et l'écart — la différence entre ce que l'application attend et ce qu'elle a
 * réellement en main — n'était stocké NULLE PART : aucune colonne. Or c'est la
 * mesure même du pilote. La Constitution en fait un incident (« écart de
 * caisse = incident détecté par invariante ») : un incident qu'on ne conserve
 * pas ne se détecte jamais.
 *
 * `fond_final` porte désormais ce qu'elle a compté. `caisse_theorique` et
 * `ecart` sont calculés PAR LE SERVEUR à partir de ses propres transactions,
 * jamais repris d'un chiffre envoyé par le téléphone : un écart n'a de valeur
 * que s'il est établi par celui qui n'a pas intérêt à le lisser.
 */
export class FermetureCaisseEcart1781900000000 implements MigrationInterface {
  name = 'FermetureCaisseEcart1781900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE caisse_sessions ADD COLUMN IF NOT EXISTS caisse_theorique numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE caisse_sessions ADD COLUMN IF NOT EXISTS ecart numeric`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE caisse_sessions DROP COLUMN IF EXISTS ecart`);
    await queryRunner.query(`ALTER TABLE caisse_sessions DROP COLUMN IF EXISTS caisse_theorique`);
  }
}
