import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeUserGenre1746855604000 implements MigrationInterface {
  name = 'NormalizeUserGenre1746855604000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users SET genre = LOWER(TRIM(genre)) WHERE genre IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
