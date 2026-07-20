import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMutationsTable1747000000000 implements MigrationInterface {
  name = 'CreateMutationsTable1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE mutations_statut_enum AS ENUM ('en_attente', 'approuvee', 'rejetee')
    `);

    await queryRunner.query(`
      CREATE TABLE mutations (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        identificateur_id uuid NOT NULL,
        identificateur_nom varchar(255) NULL,
        zone_actuelle_id varchar(100) NULL,
        zone_actuelle_nom varchar(255) NULL,
        zone_demandee_id varchar(100) NOT NULL,
        zone_demandee_nom varchar(255) NOT NULL,
        raison text NOT NULL,
        statut mutations_statut_enum NOT NULL DEFAULT 'en_attente',
        decideur_id uuid NULL,
        motif_decision text NULL,
        date_decision timestamptz NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_mutations_identificateur_id ON mutations(identificateur_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_mutations_statut ON mutations(statut)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_mutations_created_at ON mutations(created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_mutations_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_mutations_statut`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_mutations_identificateur_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS mutations`);
    await queryRunner.query(`DROP TYPE IF EXISTS mutations_statut_enum`);
  }
}
