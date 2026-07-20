import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class DbInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DbInitService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS type_point_vente VARCHAR(50);
      `);
      await this.dataSource.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS type_point_vente_autre TEXT;
      `);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS district_id UUID;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS district_autre TEXT;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS region_id UUID;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS region_autre TEXT;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS departement_id UUID;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS departement_autre TEXT;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS commune_id UUID;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS commune_autre TEXT;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS quartier_village TEXT;`);
      await this.dataSource.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;`);
      await this.dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;`);
      await this.dataSource.query(`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email)) WHERE email IS NOT NULL;`);
      this.logger.log('Colonnes type_point_vente + 9 colonnes admin-divisions verifiees');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur ajout colonnes type_point_vente: ' + message);
    }
    try {
      await this.dataSource.query(`
        ALTER TABLE identifications
        ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0;
      `);
      await this.dataSource.query(`
        ALTER TABLE identifications
        ADD COLUMN IF NOT EXISTS form_data JSONB;
      `);
      this.logger.log('Colonnes current_step et form_data verifiees sur identifications');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur ajout colonnes brouillons identifications: ' + message);
    }
    try {
      await this.dataSource.query(`
        ALTER TABLE cooperative_membres 
        DROP CONSTRAINT IF EXISTS cooperative_membres_cooperative_id_fkey;
      `);
      await this.dataSource.query(`
        ALTER TABLE cooperative_membres 
        ADD CONSTRAINT cooperative_membres_cooperative_id_fkey 
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE CASCADE;
      `);
      this.logger.log('FK cooperative_membres corrigée');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('FK cooperative_membres déjà correcte ou erreur: ' + message);
    }
  }
}
