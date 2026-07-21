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

    // ── Tables « caisse » accédées en SQL brut (sans entité TypeORM) ──────────
    // caisse_sessions (ouverture/fermeture de la journée) et produits (stock)
    // n'ont PAS d'entité : `synchronize` ne les crée donc jamais. Sur une base
    // NEUVE (nouveau serveur indépendant), la caisse renvoyait 500. On les crée
    // ici en IF NOT EXISTS : no-op sur la base V1 existante, auto-réparation sur
    // une base vierge. Le cœur « une vendeuse peut vendre » en dépend.
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS caisse_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          marchand_id text NOT NULL,
          date date NOT NULL,
          fond_initial numeric DEFAULT 0,
          fond_final numeric DEFAULT 0,
          ouvert boolean DEFAULT true,
          heure_ouverture timestamptz,
          heure_fermeture timestamptz,
          notes text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS ux_caisse_sessions_marchand_date
         ON caisse_sessions (marchand_id, date);`,
      );
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS produits (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          marchand_id text NOT NULL,
          nom text NOT NULL,
          prix numeric DEFAULT 0,
          prix_achat numeric DEFAULT 0,
          categorie text,
          stock numeric DEFAULT 0,
          unite text,
          image text,
          actif boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS idx_produits_marchand ON produits (marchand_id);`,
      );
      this.logger.log('Tables caisse_sessions et produits vérifiées');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur création tables caisse_sessions/produits: ' + message);
    }

    // ── Garde-fou anti double-comptage (idempotence) ─────────────────────────
    // Le contrôleur vérifie la clé avant d'insérer (SELECT puis INSERT), mais ce
    // motif est vulnérable à une course : deux requêtes concurrentes (double-tap,
    // rejeu offline) passent le SELECT avant que l'autre n'ait inséré, d'où des
    // DOUBLONS d'argent. Seul un index UNIQUE au niveau base élimine la course.
    // La migration le pose, mais elle ne tourne pas sur une base construite par
    // `synchronize` ; on le garantit donc ici aussi (IF NOT EXISTS, idempotent).
    try {
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_caisse_tx_idempotency_key
        ON caisse_transactions (idempotency_key)
        WHERE idempotency_key IS NOT NULL;
      `);
      this.logger.log('Index unique idempotency_key vérifié (anti double-comptage)');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur index idempotency_key: ' + message);
    }

    // ── Colonnes/tables secondaires manquantes sur base neuve ────────────────
    // Des tâches de fond (cron) attendent des colonnes/tables que `synchronize`
    // ne crée pas (entités incomplètes ou tables en SQL brut). Non bloquant, mais
    // ça polluait les logs (alertes stock, cycles récoltes, B-Pay). On complète.
    try {
      // stocks : l'entité ne déclare pas toutes les colonnes utilisées en SQL brut.
      await this.dataSource.query(`
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS seuil_alerte numeric;
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS prix_achat numeric;
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS prix_vente numeric;
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS categorie text;
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS image text;
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
      `);
      // cycles : colonne statut manquante (checkRecoltesProches).
      await this.dataSource.query(`ALTER TABLE cycles ADD COLUMN IF NOT EXISTS statut varchar;`);
      this.logger.log('Colonnes stocks (seuil_alerte…) et cycles.statut vérifiées');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur colonnes stocks/cycles: ' + message);
    }

    // bpay_transactions : table en SQL brut (paiement B-Pay), sans entité.
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS bpay_transactions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text,
          pay_token text,
          status text,
          bpay_status text,
          source text,
          montant numeric,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);
      this.logger.log('Table bpay_transactions vérifiée');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur table bpay_transactions: ' + message);
    }
  }
}
