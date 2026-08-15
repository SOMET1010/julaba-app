import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710172800000 implements MigrationInterface {
  name = 'InitialSchema1710172800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extension UUID
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // ENUM Types
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM (
        'producteur',
        'marchand',
        'identificateur',
        'cooperateur',
        'institution',
        'admin'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE user_status AS ENUM (
        'pending',
        'actif',
        'suspendu',
        'rejete'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE cycle_status AS ENUM (
        'preparation',
        'active',
        'completed',
        'archived'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE recolte_qualite AS ENUM (
        'standard',
        'premium',
        'bio'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE recolte_statut AS ENUM (
        'declaree',
        'validee',
        'vendue'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE publication_statut AS ENUM (
        'disponible',
        'epuise',
        'suspendu',
        'archive'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE commande_statut AS ENUM (
        'en_attente',
        'confirmee',
        'en_livraison',
        'livree',
        'annulee',
        'litige'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE transaction_type AS ENUM (
        'credit',
        'debit',
        'escrow_block',
        'escrow_release',
        'escrow_refund'
      )
    `);

    // TABLE: users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "phone" VARCHAR(20) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255),
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "role" user_role NOT NULL,
        "region" VARCHAR(100),
        "commune" VARCHAR(100),
        "activity" VARCHAR(200),
        "market" VARCHAR(200),
        "cooperative_name" VARCHAR(200),
        "institution_name" VARCHAR(200),
        "photo_url" TEXT,
        "status" user_status NOT NULL DEFAULT 'pending',
        "validated" BOOLEAN NOT NULL DEFAULT FALSE,
        "pin_security_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
        "pin_code_hash" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "last_login_at" TIMESTAMPTZ
      )
    `);

    // TABLE: wallets
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        "solde" DECIMAL(15,2) NOT NULL DEFAULT 0,
        "solde_bloque" DECIMAL(15,2) NOT NULL DEFAULT 0,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'XOF',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // TABLE: wallet_transactions
    await queryRunner.query(`
      CREATE TABLE "wallet_transactions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "type" transaction_type NOT NULL,
        "montant" DECIMAL(15,2) NOT NULL,
        "description" TEXT,
        "statut" VARCHAR(50) NOT NULL DEFAULT 'completed',
        "related_entity_type" VARCHAR(100),
        "related_entity_id" UUID,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // TABLE: cycles
    await queryRunner.query(`
      CREATE TABLE "cycles" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "culture" VARCHAR(100) NOT NULL,
        "surface" DECIMAL(10,2) NOT NULL,
        "parcelle" VARCHAR(100),
        "date_plantation" DATE NOT NULL,
        "date_recolte_estimee" DATE NOT NULL,
        "date_recolte_reelle" DATE,
        "quantite_estimee" DECIMAL(10,2) NOT NULL,
        "quantite_reelle" DECIMAL(10,2),
        "status" cycle_status NOT NULL DEFAULT 'active',
        "notes" TEXT,
        "photo_url" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // TABLE: recoltes
    await queryRunner.query(`
      CREATE TABLE "recoltes" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "cycle_id" UUID REFERENCES cycles(id) ON DELETE SET NULL,
        "produit" VARCHAR(100) NOT NULL,
        "quantite" DECIMAL(10,2) NOT NULL,
        "unite" VARCHAR(50) NOT NULL,
        "qualite" recolte_qualite NOT NULL,
        "date_recolte" DATE NOT NULL,
        "statut" recolte_statut NOT NULL DEFAULT 'declaree',
        "prix_unitaire" DECIMAL(10,2) NOT NULL,
        "parcelle" VARCHAR(100),
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // TABLE: publications
    await queryRunner.query(`
      CREATE TABLE "publications" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "cycle_id" UUID REFERENCES cycles(id) ON DELETE SET NULL,
        "recolte_id" UUID REFERENCES recoltes(id) ON DELETE SET NULL,
        "produit" VARCHAR(100) NOT NULL,
        "culture" VARCHAR(100) NOT NULL,
        "quantite_disponible" DECIMAL(10,2) NOT NULL,
        "quantite_initiale" DECIMAL(10,2) NOT NULL,
        "unite" VARCHAR(50) NOT NULL,
        "prix_unitaire" DECIMAL(10,2) NOT NULL,
        "qualite" VARCHAR(50) NOT NULL,
        "localisation" VARCHAR(200),
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "statut" publication_statut NOT NULL DEFAULT 'disponible',
        "date_publication" TIMESTAMPTZ NOT NULL,
        "date_expiration" DATE,
        "date_recolte" DATE,
        "description" TEXT,
        "photo_url" TEXT,
        "conditions_vente" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // TABLE: commandes
    await queryRunner.query(`
      CREATE TABLE "commandes" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "acheteur_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "vendeur_id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "publication_id" UUID REFERENCES publications(id) ON DELETE SET NULL,
        "type" VARCHAR(100) NOT NULL,
        "produit" VARCHAR(100) NOT NULL,
        "quantite" DECIMAL(10,2) NOT NULL,
        "prix_unitaire" DECIMAL(10,2) NOT NULL,
        "total" DECIMAL(15,2) NOT NULL,
        "statut" commande_statut NOT NULL DEFAULT 'en_attente',
        "date_commande" TIMESTAMPTZ NOT NULL,
        "date_livraison" DATE,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // INDEX pour performances
    await queryRunner.query(`CREATE INDEX idx_users_phone ON users(phone)`);
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role)`);
    await queryRunner.query(`CREATE INDEX idx_wallets_user_id ON wallets(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_wallet_tx_user_id ON wallet_transactions(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type)`);
    await queryRunner.query(`CREATE INDEX idx_cycles_user_id ON cycles(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_recoltes_user_id ON recoltes(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_publications_user_id ON publications(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_publications_statut ON publications(statut)`);
    await queryRunner.query(`CREATE INDEX idx_commandes_acheteur_id ON commandes(acheteur_id)`);
    await queryRunner.query(`CREATE INDEX idx_commandes_vendeur_id ON commandes(vendeur_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_commandes_vendeur_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_commandes_acheteur_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_publications_statut`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_publications_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recoltes_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cycles_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wallet_tx_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wallet_tx_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wallets_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_role`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_phone`);

    // Supprimer les tables
    await queryRunner.query(`DROP TABLE IF EXISTS "commandes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "publications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recoltes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cycles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // Supprimer les types ENUM
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS commande_statut`);
    await queryRunner.query(`DROP TYPE IF EXISTS publication_statut`);
    await queryRunner.query(`DROP TYPE IF EXISTS recolte_statut`);
    await queryRunner.query(`DROP TYPE IF EXISTS recolte_qualite`);
    await queryRunner.query(`DROP TYPE IF EXISTS cycle_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
  }
}
