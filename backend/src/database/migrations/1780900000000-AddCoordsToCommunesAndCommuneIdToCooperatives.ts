import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit deploiement (19/08/2026) : re-cree, ACTIVE et post-baseline, le contenu
 * de l'ancienne migration `_archive/1779300000000-AddCoordsToCommunesAndCommuneIdToCooperatives`.
 *
 * Cause racine constatee : cette migration originale est dans `migrations/_archive/`,
 * un sous-dossier EXCLU du glob de migration actif (`data-source.ts` /
 * `database.module.ts` : `migrations/*.{ts,js}`, non recursif — ADR-0002 Etape 1).
 * Elle ne s'execute donc plus JAMAIS, ni sur base existante (migrationsRun=true)
 * ni sur base neuve. Or `producteurs-rest.controller.ts` (`recoltes-prevues`,
 * utilise par les grossistes) lit `communes.latitude`/`longitude` et
 * `cooperatives.commune_id` en SQL brut pour trier par distance (haversineKm) :
 * sur un environnement neuf construit depuis la baseline (ex. ANSUT), ces
 * colonnes n'existent pas -> erreur SQL "column does not exist".
 *
 * Perimetre volontairement DB-only (identique a l'original) : les entites
 * TypeORM Commune et Cooperative NE declarent PAS ces colonnes, pour eviter le
 * piege d'ordre de deploiement (entite qui reference une colonne avant que la
 * migration/le patch ne l'ait posee). Le controleur les lit en SQL brut.
 *
 * Le seed des coordonnees couvre les 41 communes presentes en base au moment de
 * l'audit, keye sur "code" (unique-par-convention, non-null, ASCII). Coordonnees
 * WGS84 (latitude N positive, longitude O negative) — recopiees a l'identique
 * depuis la migration archivee (aucune valeur inventee) ; c'est un UPDATE
 * cible par code, donc un no-op silencieux pour un code qui n'existe pas encore
 * (ex : une commune "chef-lieu" pas encore seedee sur un environnement tout
 * neuf qui n'a que les 13 communes d'Abidjan via AdminDivisionsSeedService).
 *
 * HORS PERIMETRE (identique a l'original) : le rattachement des cooperatives
 * existantes a leur commune (UPDATE cooperatives SET commune_id = ...). Donnee
 * de test/operationnelle, hors versionning.
 *
 * Idempotent (IF NOT EXISTS / garde pg_constraint) : rejouable sans effet sur
 * une base ou ces colonnes existent deja (ex. prod, patchee via DbInitService
 * avant que cette migration n'existe — cf. DbInitService.runInit(), miroir
 * exact de ce fichier, seul mecanisme qui s'execute inconditionnellement au
 * boot sur une base VIERGE tant que l'ADR-0002 Etape 4 (bascule migrations
 * pour base neuve) n'est pas actee).
 */
export class AddCoordsToCommunesAndCommuneIdToCooperatives1780900000000
  implements MigrationInterface
{
  name = 'AddCoordsToCommunesAndCommuneIdToCooperatives1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE communes ADD COLUMN IF NOT EXISTS latitude double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE communes ADD COLUMN IF NOT EXISTS longitude double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE cooperatives ADD COLUMN IF NOT EXISTS commune_id uuid`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_cooperatives_commune'
        ) THEN
          ALTER TABLE cooperatives
            ADD CONSTRAINT fk_cooperatives_commune
            FOREIGN KEY (commune_id) REFERENCES communes(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE communes AS c
      SET latitude = v.lat, longitude = v.lng
      FROM (VALUES
        ('ABJ-ABO', 5.4304, -4.0159),
        ('ABJ-ADJ', 5.3661, -4.0203),
        ('ABJ-ANY', 5.4948, -4.0518),
        ('ABJ-ATT', 5.3389, -4.0331),
        ('ABJ-BIN', 5.3556, -3.8853),
        ('ABJ-COC', 5.3500, -3.9833),
        ('ABJ-KOU', 5.2950, -3.9470),
        ('ABJ-MAR', 5.3008, -3.9869),
        ('ABJ-PLA', 5.3247, -4.0192),
        ('ABJ-PBT', 5.2550, -3.9270),
        ('ABJ-SON', 5.2986, -4.2522),
        ('ABJ-TRE', 5.2933, -4.0033),
        ('ABJ-YOP', 5.3372, -4.0758),
        ('CHL-ABENGOUROU', 6.7297, -3.4964),
        ('CHL-ABOISSO', 5.4667, -3.2069),
        ('CHL-AGBOVILLE', 5.9280, -4.2130),
        ('CHL-BONDOUKOU', 8.0402, -2.8000),
        ('CHL-BOUAFLE', 6.9905, -5.7449),
        ('CHL-BOUAKE', 7.6906, -5.0303),
        ('CHL-DABOU', 5.3256, -4.3772),
        ('CHL-DALOA', 6.8772, -6.4503),
        ('CHL-DIMBOKRO', 6.6500, -4.7000),
        ('CHL-DIVO', 5.8372, -5.3572),
        ('CHL-FERKE', 9.5928, -5.1944),
        ('CHL-GAGNOA', 6.1319, -5.9506),
        ('CHL-ISSIA', 6.4922, -6.5872),
        ('CHL-KATIOLA', 8.1333, -5.1000),
        ('CHL-KORHOGO', 9.4580, -5.6294),
        ('CHL-LAKOTA', 5.8456, -5.6781),
        ('CHL-MAN', 7.4125, -7.5536),
        ('CHL-ODIENNE', 9.5000, -7.5667),
        ('CHL-SANPEDRO', 4.7485, -6.6363),
        ('CHL-SASSANDRA', 4.9500, -6.0833),
        ('CHL-SEGUELA', 7.9614, -6.6731),
        ('CHL-SINFRA', 6.6206, -5.9181),
        ('CHL-SOUBRE', 5.7836, -6.5936),
        ('CHL-TABOU', 4.4230, -7.3528),
        ('CHL-TIASSALE', 5.8983, -4.8228),
        ('CHL-TOUBA', 8.2833, -7.6833),
        ('CHL-VAVOUA', 7.3833, -6.4778),
        ('CHL-YAKRO', 6.8276, -5.2893)
      ) AS v(code, lat, lng)
      WHERE c.code = v.code
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cooperatives DROP CONSTRAINT IF EXISTS fk_cooperatives_commune`,
    );
    await queryRunner.query(
      `ALTER TABLE cooperatives DROP COLUMN IF EXISTS commune_id`,
    );
    await queryRunner.query(
      `ALTER TABLE communes DROP COLUMN IF EXISTS longitude`,
    );
    await queryRunner.query(
      `ALTER TABLE communes DROP COLUMN IF EXISTS latitude`,
    );
  }
}
