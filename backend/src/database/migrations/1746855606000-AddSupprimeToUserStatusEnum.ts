import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupprimeToUserStatusEnum1746855606000 implements MigrationInterface {
  name = 'AddSupprimeToUserStatusEnum1746855606000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'supprime'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL ne supporte pas DROP VALUE sur enum nativement
    // Rollback manuel requis si necessaire
  }
}
