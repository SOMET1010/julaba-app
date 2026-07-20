-- ============================================================
-- JULABA — Initialisation PostgreSQL (OVH VPS)
-- Adapté depuis les migrations Supabase
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABLE PRINCIPALE : UTILISATEURS ──────────────────────────
CREATE TABLE IF NOT EXISTS users_julaba (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('marchand', 'producteur', 'cooperative', 'institution', 'identificateur', 'backoffice', 'super_admin')) NOT NULL,
  status TEXT CHECK (status IN ('actif', 'inactif', 'suspendu', 'en_attente')) DEFAULT 'actif',
  validated BOOLEAN DEFAULT FALSE,
  region TEXT,
  commune TEXT,
  activity TEXT,
  market TEXT,
  cooperative_name TEXT,
  institution_name TEXT,
  avatar_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users_julaba(phone);
CREATE INDEX idx_users_role ON users_julaba(role);
CREATE INDEX idx_users_status ON users_julaba(status);

-- ── TABLE OTP ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- ── TABLE REFRESH TOKENS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ── COMMANDES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  acheteur_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  vendeur_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('achat', 'vente')),
  statut TEXT CHECK (statut IN ('en_attente', 'confirmee', 'en_route', 'livree', 'annulee')) DEFAULT 'en_attente',
  produit TEXT NOT NULL,
  quantite TEXT NOT NULL,
  prix DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  mode_paiement TEXT,
  date_livraison TIMESTAMPTZ,
  adresse_livraison TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commandes_user ON commandes(user_id);
CREATE INDEX idx_commandes_acheteur ON commandes(acheteur_id);
CREATE INDEX idx_commandes_vendeur ON commandes(vendeur_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);

-- ── RÉCOLTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recoltes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producteur_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  produit TEXT NOT NULL,
  quantite DECIMAL NOT NULL,
  unite TEXT NOT NULL,
  qualite TEXT CHECK (qualite IN ('standard', 'premium', 'bio')) DEFAULT 'standard',
  prix_unitaire DECIMAL NOT NULL,
  statut TEXT CHECK (statut IN ('declaree', 'validee', 'vendue')) DEFAULT 'declaree',
  date_recolte DATE NOT NULL,
  parcelle TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recoltes_producteur ON recoltes(producteur_id);
CREATE INDEX idx_recoltes_statut ON recoltes(statut);

-- ── STOCKS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  produit TEXT NOT NULL,
  quantite DECIMAL NOT NULL,
  unite TEXT NOT NULL,
  prix_achat DECIMAL,
  derniere_modification TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, produit)
);

CREATE INDEX idx_stocks_user ON stocks(user_id);

-- ── WALLETS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE UNIQUE,
  solde DECIMAL DEFAULT 0,
  solde_bloque DECIMAL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

-- ── WALLET TRANSACTIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('credit', 'debit', 'blocage', 'deblocage', 'remboursement')) NOT NULL,
  montant DECIMAL NOT NULL,
  description TEXT,
  reference TEXT,
  statut TEXT CHECK (statut IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id);

-- ── ESCROW ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID REFERENCES commandes(id) ON DELETE CASCADE,
  acheteur_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  vendeur_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  montant DECIMAL NOT NULL,
  statut TEXT CHECK (statut IN ('bloque', 'libere', 'rembourse', 'annule')) DEFAULT 'bloque',
  date_liberation TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ZONES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type TEXT CHECK (type IN ('region', 'departement', 'commune', 'village')) NOT NULL,
  parent_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  gestionnaire_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  actif BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── IDENTIFICATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificateur_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  acteur_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  type_acteur TEXT CHECK (type_acteur IN ('marchand', 'producteur', 'cooperative', 'institution')),
  statut TEXT CHECK (statut IN ('en_attente', 'validee', 'rejetee')) DEFAULT 'en_attente',
  documents JSONB,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  commission DECIMAL,
  commission_payee BOOLEAN DEFAULT FALSE,
  date_identification DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COOPERATIVES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cooperatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE UNIQUE,
  nom TEXT NOT NULL,
  president_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  tresorier_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  secretaire_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  solde_tresorerie DECIMAL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COOPERATIVE MEMBRES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cooperative_membres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id UUID REFERENCES cooperatives(id) ON DELETE CASCADE,
  membre_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('president', 'tresorier', 'secretaire', 'membre')) DEFAULT 'membre',
  date_adhesion DATE NOT NULL,
  cotisation_payee BOOLEAN DEFAULT FALSE,
  actif BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cooperative_id, membre_id)
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ── AUDIT LOGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  role TEXT,
  action TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- ── SCORES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE UNIQUE,
  score_total INTEGER DEFAULT 0,
  score_fiabilite INTEGER DEFAULT 0,
  score_qualite INTEGER DEFAULT 0,
  score_ponctualite INTEGER DEFAULT 0,
  nb_transactions INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ACADEMY PROGRESS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  progres INTEGER DEFAULT 0,
  complete BOOLEAN DEFAULT FALSE,
  score INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- ── MISSIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificateur_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  objectif INTEGER,
  progres INTEGER DEFAULT 0,
  statut TEXT CHECK (statut IN ('en_cours', 'terminee', 'annulee')) DEFAULT 'en_cours',
  date_debut DATE,
  date_fin DATE,
  recompense DECIMAL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TICKETS SUPPORT ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('technique', 'paiement', 'livraison', 'compte', 'autre')) DEFAULT 'autre',
  priorite TEXT CHECK (priorite IN ('basse', 'moyenne', 'haute', 'critique')) DEFAULT 'moyenne',
  statut TEXT CHECK (statut IN ('ouvert', 'en_cours', 'resolu', 'ferme')) DEFAULT 'ouvert',
  assigne_a UUID REFERENCES users_julaba(id) ON DELETE SET NULL,
  reponses JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CAISSE TRANSACTIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS caisse_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marchand_id UUID REFERENCES users_julaba(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('vente', 'depense', 'approvisionnement')) NOT NULL,
  montant DECIMAL NOT NULL,
  produits JSONB,
  mode_paiement TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIGGER updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables avec updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users_julaba', 'commandes', 'recoltes', 'stocks', 'wallets',
    'escrow_payments', 'zones', 'identifications', 'cooperatives',
    'cooperative_membres', 'scores', 'academy_progress', 'missions', 'tickets_support'
  ]
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END;
$$;

SELECT 'Base de données JULABA initialisée avec succès !' AS message;
