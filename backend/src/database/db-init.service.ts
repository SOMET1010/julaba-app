import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class DbInitService {
  private readonly logger = new Logger(DbInitService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // Appelé APRÈS le bind du port (depuis main.ts), plus dans un hook de
  // démarrage : le port s'ouvre vite, le health-check passe, Render garde le
  // service en vie ; l'init tourne ensuite en arrière-plan.
  async runInit() {
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

    // ── Ledger de stock (append-only) ────────────────────────────────────────
    // Noyau minimal d'intégrité du stock : chaque effet d'inventaire d'une vente
    // est journalisé dans la MÊME transaction que la vente (atomicité, I1/I3).
    // Pour chaque mouvement on retrouve : la vente (transaction_id), le produit,
    // le stock avant, la quantité demandée, la quantité effectivement retranchée
    // du stock connu, le manquant éventuel et la date. Append-only : on n'y fait
    // que des INSERT (aucune modification/destruction de mouvement).
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS stock_mouvements (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          marchand_id text NOT NULL,
          transaction_id uuid,
          produit_id uuid,
          produit_nom text,
          stock_avant numeric NOT NULL,
          quantite_demandee numeric NOT NULL,
          quantite_retranchee numeric NOT NULL,
          manquant numeric NOT NULL DEFAULT 0,
          created_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS idx_stock_mouvements_tx ON stock_mouvements (transaction_id);`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS idx_stock_mouvements_marchand ON stock_mouvements (marchand_id, created_at);`,
      );
      this.logger.log('Ledger stock_mouvements (append-only) vérifié');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur ledger stock_mouvements: ' + message);
    }

    // ── B2 : réservation de stock sur commande (marché virtuel) ──────────────
    // Créée ici (idempotent) parce que sur une base Render déjà peuplée,
    // synchronize et migrationsRun sont OFF : ni les entités ni les migrations
    // ne créent cette table au démarrage. Miroir de la migration
    // 1779200000000-AddStockReservations.
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS stock_reservations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          commande_id uuid NOT NULL,
          publication_id uuid NOT NULL,
          quantite numeric(10,2) NOT NULL,
          statut varchar(20) NOT NULL DEFAULT 'active',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);
      await this.dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_reservations_commande ON stock_reservations (commande_id);`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS idx_stock_reservations_publication ON stock_reservations (publication_id);`,
      );
      // #12 / ADR-0001 D2 : vente directe (sans publication) → décrément d'une
      // récolte tracé dans le ledger. Miroir de la migration
      // 1779300000000-AddRecolteToStockAndCommande. Idempotent sur base existante.
      await this.dataSource.query(`ALTER TABLE commandes ADD COLUMN IF NOT EXISTS recolte_id uuid;`);
      await this.dataSource.query(`ALTER TABLE stock_reservations ALTER COLUMN publication_id DROP NOT NULL;`);
      await this.dataSource.query(`ALTER TABLE stock_reservations ADD COLUMN IF NOT EXISTS recolte_id uuid;`);
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS idx_stock_reservations_recolte ON stock_reservations (recolte_id);`,
      );
      this.logger.log('Table stock_reservations (B2) + colonnes recolte vérifiées');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur table stock_reservations: ' + message);
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
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS date_peremption date;
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS prix_promo numeric;
        ALTER TABLE stocks ADD COLUMN IF NOT EXISTS promo_fin date;
      `);
      // produits (table du MARCHAND) : seuil d'alerte + date de péremption.
      // Sans ça, les alertes de rupture marchand ne peuvent pas s'appuyer sur un
      // seuil configurable, et les dates de péremption ne sont pas stockées.
      await this.dataSource.query(`
        ALTER TABLE produits ADD COLUMN IF NOT EXISTS seuil_alerte numeric;
        ALTER TABLE produits ADD COLUMN IF NOT EXISTS date_peremption date;
        ALTER TABLE produits ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
        ALTER TABLE produits ADD COLUMN IF NOT EXISTS prix_promo numeric;
        ALTER TABLE produits ADD COLUMN IF NOT EXISTS promo_fin date;
      `);
      // cycles : colonne statut manquante (checkRecoltesProches).
      await this.dataSource.query(`ALTER TABLE cycles ADD COLUMN IF NOT EXISTS statut varchar;`);
      // evaluations : notation acheteur/vendeur après une commande livrée (CDC 8.1.5).
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS evaluations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          commande_id uuid NOT NULL,
          auteur_id uuid NOT NULL,
          cible_id uuid NOT NULL,
          note smallint NOT NULL CHECK (note BETWEEN 1 AND 5),
          commentaire text NULL,
          created_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_evaluations_cmd_auteur ON evaluations (commande_id, auteur_id);`);
      await this.dataSource.query(`CREATE INDEX IF NOT EXISTS idx_evaluations_cible ON evaluations (cible_id);`);
      // Fidélité : barème paramétrable + points par client (CDC 8.1.2).
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS fidelite_config (
          marchand_id uuid PRIMARY KEY,
          actif boolean DEFAULT false,
          points_par_cent numeric DEFAULT 1,
          seuil_points numeric DEFAULT 100,
          recompense_fcfa numeric DEFAULT 1000,
          updated_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS fidelite_clients (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          marchand_id uuid NOT NULL,
          telephone varchar(40) NOT NULL,
          nom varchar(160) NULL,
          points numeric DEFAULT 0,
          total_achats numeric DEFAULT 0,
          updated_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_fidelite_client ON fidelite_clients (marchand_id, telephone);`);
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

    // ── Carnet de CRÉDIT (vendre à crédit) ────────────────────────────────
    // Ces tables/vue étaient absentes du pipeline → tout /caisse/credits* plantait
    // en 500. On les crée ici, idempotent (IF NOT EXISTS / OR REPLACE).
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          marchand_id uuid NOT NULL,
          nom varchar(160) NOT NULL,
          phone varchar(40) DEFAULT '',
          nb_credits integer DEFAULT 0,
          montant_du numeric DEFAULT 0,
          derniere_visite timestamptz DEFAULT now(),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_marchand_nom ON clients (marchand_id, nom);`);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS credits (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          marchand_id uuid NOT NULL,
          client_nom varchar(160) NOT NULL,
          client_phone varchar(40) DEFAULT '',
          montant_total numeric NOT NULL,
          acompte numeric DEFAULT 0,
          echeance date NOT NULL,
          articles jsonb DEFAULT '[]'::jsonb,
          notes text DEFAULT '',
          transaction_id uuid NULL,
          statut varchar(20) DEFAULT 'en_cours',
          paye_le timestamptz NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);
      await this.dataSource.query(`CREATE INDEX IF NOT EXISTS idx_credits_marchand ON credits (marchand_id);`);
      // Vue : statut EFFECTIF (paye / en_retard / en_cours) + montant_restant.
      await this.dataSource.query(`
        CREATE OR REPLACE VIEW credits_avec_statut AS
        SELECT
          c.id, c.marchand_id, c.client_nom, c.client_phone, c.montant_total,
          c.acompte, c.echeance, c.articles, c.notes, c.transaction_id,
          c.paye_le, c.created_at, c.updated_at,
          CASE
            WHEN c.statut = 'paye' OR COALESCE(c.acompte, 0) >= c.montant_total THEN 0
            ELSE GREATEST(c.montant_total - COALESCE(c.acompte, 0), 0)
          END AS montant_restant,
          CASE
            WHEN c.statut = 'paye' OR COALESCE(c.acompte, 0) >= c.montant_total THEN 'paye'
            WHEN c.echeance < CURRENT_DATE THEN 'en_retard'
            ELSE 'en_cours'
          END AS statut
        FROM credits c;
      `);
      this.logger.log('Tables credits/clients + vue credits_avec_statut vérifiées');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur tables credits/clients: ' + message);
    }
    try {
      // ── MARCHÉ PRODUCTEUR : schéma requis par POST /publications ──────────
      // Cause racine du 500 systématique sur la publication d'offre en prod :
      // le handler create() fait un `INSERT ... ON CONFLICT (user_id,
      // LOWER(TRIM(produit)))`. Cette clause EXIGE un index unique d'expression
      // identique. Or `ux_publications_user_produit` n'était posé NI par une
      // migration (jamais exécutées en prod) NI ici — seul le test invariant le
      // créait. Sans lui, Postgres répond « no unique or exclusion constraint
      // matching the ON CONFLICT specification » → 500 à chaque publication.
      // DbInit étant le mécanisme réel du schéma de prod, l'index se pose ICI.

      // Colonne référencée par l'INSERT de création (défensif, no-op si présente).
      await this.dataSource.query(
        `ALTER TABLE publications ADD COLUMN IF NOT EXISTS quantite_initiale numeric(10,2);`,
      );
      // Dédoublonnage préalable : un CREATE UNIQUE INDEX échoue si la base
      // contient déjà deux offres de même (user_id, produit normalisé). On garde
      // une ligne par clé (sémantique de l'upsert : « même produit = même offre »).
      await this.dataSource.query(`
        DELETE FROM publications a
        USING publications b
        WHERE a.user_id = b.user_id
          AND LOWER(TRIM(a.produit)) = LOWER(TRIM(b.produit))
          AND a.ctid < b.ctid;
      `);
      // L'index unique d'expression, à l'identique du ON CONFLICT du controller
      // et du spec invariant publication-authorship.
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_publications_user_produit
          ON publications (user_id, LOWER(TRIM(produit)));
      `);
      this.logger.log(
        'Publications : colonne quantite_initiale + index unique ux_publications_user_produit vérifiés',
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn('Erreur convergence schéma publications: ' + message);
    }
  }
}
