import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige un bug de colonnes fantomes sur `marches` (recette recette back-office
 * "identifier/creer un marchand" bloquee : impossible de creer/lister un marche).
 *
 * Cause racine constatee : `marches.controller.ts` (`findAll` par defaut,
 * `POST /marches/suggestion`, `PATCH /marches/:id` avec `statut`) execute du SQL
 * BRUT selectionnant/inserant les colonnes `commune`, `statut`,
 * `responsable_nom`, `responsable_contact` — colonnes qui n'ont JAMAIS existe
 * dans la table `marches` (cf. baseline `1780200000000-BaselineSchema.ts` :
 * seulement id, nom, adresse, latitude, longitude, type, actif, description,
 * created_at, updated_at, zone_id). Resultat : `GET /marches` (utilise par
 * `useMarchesByCommune`, cote identificateur, ET par `boGetMarches()` cote
 * back-office) plantait systematiquement en 500 "column ... does not exist" —
 * meme une fois une zone et un marche crees via le chemin TypeORM propre
 * (`marches.service.ts`), le selecteur "Marche" de la fiche d'identification
 * marchand ne pouvait jamais se peupler.
 *
 * Perimetre : seules `commune` et `statut` sont reellement lues/ecrites par une
 * fonctionnalite active (filtrage/affichage cote identificateur, workflow de
 * moderation "marche suggere par un identificateur" cote back-office —
 * `BOModeration.tsx`, `BOZones.tsx` onglet GPS). `responsable_nom` et
 * `responsable_contact` sont un affichage optionnel jamais alimente par aucun
 * chemin de creation existant (`marche.responsable_nom &&` en JSX) : on les
 * retire simplement du SQL brut plutot que d'ajouter deux colonnes mortes.
 *
 * `commune` reste nullable : pour un marche cree via le chemin officiel
 * (BackOffice > Zones > "Creer un marche", `zoneId` obligatoire), le controleur
 * derive la commune par jointure sur `zones.nom` (COALESCE(m.commune, z.nom))
 * plutot que de dupliquer la donnee. Seul le chemin "suggestion libre"
 * (identificateur, sans zone) ecrit une valeur litterale dans `marches.commune`.
 *
 * Volontairement PAS ajoute a l'entite TypeORM `Marche` : meme raisonnement que
 * `1780900000000-AddCoordsToCommunesAndCommuneIdToCooperatives` (cf. son
 * commentaire) — eviter le piege d'ordre de deploiement ou l'entite reference
 * une colonne avant que la migration/le patch ne l'ait posee. Le controleur lit
 * ces colonnes en SQL brut uniquement.
 *
 * Idempotent (ADD COLUMN IF NOT EXISTS). Sur une base VIERGE (`synchronize`),
 * cette migration ne tourne pas — miroir applique par
 * `DbInitService.runInit()` (auto-reparation, cf. commentaire associe).
 */
export class MarchesCommuneStatut1781400000000 implements MigrationInterface {
  name = 'MarchesCommuneStatut1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS commune VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE marches ADD COLUMN IF NOT EXISTS statut VARCHAR(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE marches DROP COLUMN IF EXISTS statut`,
    );
    await queryRunner.query(
      `ALTER TABLE marches DROP COLUMN IF EXISTS commune`,
    );
  }
}
