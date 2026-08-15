import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-0002 Étape 1 — BASELINE reproductible du schéma (#10).
 *
 * Capture le schéma RÉEL actuel (ce que `synchronize` + `DbInitService`
 * produisent sur une base vierge), dérivé d'un `pg_dump --schema-only`. Une base
 * NEUVE reconstruite depuis cette seule migration est structurellement IDENTIQUE
 * au schéma de référence (diff nul vérifié).
 *
 * Rôle : PLANCHER de la chaîne exécutable. Les 31 migrations antérieures sont
 * conservées en `migrations/_archive/` (historique documentaire, hors glob).
 *
 * Étape 1 : NON activée en prod (`migrationsRun` reste OFF). Sera marquée « déjà
 * appliquée » (`migration:run --fake`) sur la base existante à la bascule
 * (Étape 4). Tout est qualifié `public.` ; aucune directive de session (search_path).
 */
export class BaselineSchema1780200000000 implements MigrationInterface {
  name = 'BaselineSchema1780200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

CREATE TYPE public.caisse_transaction_status_enum AS ENUM (
    'validee',
    'en_cours',
    'gelee',
    'annulee',
    'litige'
);

CREATE TYPE public.commandes_statut_enum AS ENUM (
    'en_attente',
    'confirmee',
    'en_livraison',
    'livree',
    'annulee',
    'litige'
);

CREATE TYPE public.cycles_status_enum AS ENUM (
    'preparation',
    'active',
    'completed',
    'archived'
);

CREATE TYPE public.flag_type_enum AS ENUM (
    'doublon',
    'fraude',
    'abus',
    'spam',
    'usurpation',
    'autre'
);

CREATE TYPE public.identification_source_enum AS ENUM (
    'terrain',
    'admin_bo'
);

CREATE TYPE public.marchand_sous_profil_historique_ancien_sous_profil_enum AS ENUM (
    'grossiste',
    'demi_grossiste',
    'detaillant'
);

CREATE TYPE public.marchand_sous_profil_historique_nouveau_sous_profil_enum AS ENUM (
    'grossiste',
    'demi_grossiste',
    'detaillant'
);

CREATE TYPE public.marche_type_enum AS ENUM (
    'couvert',
    'decouvert',
    'mixte',
    'autre'
);

CREATE TYPE public.mutations_statut_enum AS ENUM (
    'en_attente',
    'approuvee',
    'rejetee'
);

CREATE TYPE public.negociations_statut_enum AS ENUM (
    'en_attente',
    'accepte',
    'refuse',
    'contre_offre'
);

CREATE TYPE public.publications_statut_enum AS ENUM (
    'disponible',
    'epuise',
    'suspendu',
    'archive'
);

CREATE TYPE public.publications_type_marche_enum AS ENUM (
    'producteur',
    'cooperative'
);

CREATE TYPE public.recoltes_qualite_enum AS ENUM (
    'standard',
    'premium',
    'bio'
);

CREATE TYPE public.recoltes_statut_enum AS ENUM (
    'declaree',
    'validee',
    'vendue'
);

CREATE TYPE public.users_role_enum AS ENUM (
    'producteur',
    'marchand',
    'identificateur',
    'cooperateur',
    'institution',
    'admin_general',
    'admin_national',
    'gestionnaire_zone',
    'operateur_terrain',
    'super_admin'
);

CREATE TYPE public.users_sous_profil_marchand_enum AS ENUM (
    'grossiste',
    'demi_grossiste',
    'detaillant'
);

CREATE TYPE public.users_status_enum AS ENUM (
    'pending',
    'actif',
    'suspendu',
    'rejete',
    'en_attente_validation',
    'supprime'
);

CREATE TYPE public.wallet_transactions_type_enum AS ENUM (
    'credit',
    'debit',
    'escrow_block',
    'escrow_release',
    'escrow_refund'
);

CREATE TABLE public.academy_modules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    titre character varying NOT NULL,
    description character varying,
    type character varying DEFAULT 'video'::character varying NOT NULL,
    niveau character varying DEFAULT 'debutant'::character varying NOT NULL,
    profil character varying DEFAULT 'tous'::character varying NOT NULL,
    duree integer DEFAULT 10 NOT NULL,
    points integer DEFAULT 50 NOT NULL,
    statut character varying DEFAULT 'brouillon'::character varying NOT NULL,
    nb_inscrits integer DEFAULT 0 NOT NULL,
    taux_completion integer DEFAULT 0 NOT NULL,
    image character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.academy_progress (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    module_id character varying NOT NULL,
    taux_completion integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    last_question_index integer DEFAULT 0 NOT NULL,
    enrolled_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.academy_questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role character varying NOT NULL,
    chapter integer NOT NULL,
    lesson integer DEFAULT 1 NOT NULL,
    question character varying NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    correct_index integer DEFAULT 0 NOT NULL,
    explication character varying,
    actif boolean DEFAULT true NOT NULL,
    module_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying,
    action character varying,
    entite character varying,
    entite_id character varying,
    details jsonb,
    ip character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.boutique_mouvements (
    id uuid NOT NULL,
    marchand_id uuid NOT NULL,
    device character varying NOT NULL,
    type character varying NOT NULL,
    produit character varying,
    quantite numeric,
    montant numeric,
    transcription text,
    ts bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.bpay_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    pay_token text,
    status text,
    bpay_status text,
    source text,
    montant numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.caisse_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marchand_id text NOT NULL,
    date date NOT NULL,
    fond_initial numeric DEFAULT 0,
    fond_final numeric DEFAULT 0,
    ouvert boolean DEFAULT true,
    heure_ouverture timestamp with time zone,
    heure_fermeture timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.caisse_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying,
    montant numeric,
    description character varying,
    user_id character varying,
    zone_id character varying,
    marchand_id character varying,
    session_id character varying,
    produit character varying,
    quantite numeric,
    mode_paiement character varying,
    source character varying DEFAULT 'kassa'::character varying,
    details jsonb,
    category character varying,
    prix_achat numeric DEFAULT '0'::numeric,
    prix_vente numeric DEFAULT '0'::numeric,
    marge numeric DEFAULT '0'::numeric,
    benefice numeric DEFAULT '0'::numeric,
    statut public.caisse_transaction_status_enum DEFAULT 'validee'::public.caisse_transaction_status_enum NOT NULL,
    motif text,
    idempotency_key text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marchand_id uuid NOT NULL,
    nom character varying(160) NOT NULL,
    phone character varying(40) DEFAULT ''::character varying,
    nb_credits integer DEFAULT 0,
    montant_du numeric DEFAULT 0,
    derniere_visite timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.commandes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    acheteur_id uuid,
    acheteur_nom character varying(255),
    image_url character varying(2048),
    acheteur_telephone character varying(50),
    localite character varying(255),
    vendeur_id uuid NOT NULL,
    publication_id uuid,
    recolte_id uuid,
    type character varying(100) NOT NULL,
    produit character varying(100) NOT NULL,
    quantite numeric(10,2) NOT NULL,
    prix_unitaire numeric(10,2) NOT NULL,
    total numeric(15,2) NOT NULL,
    statut public.commandes_statut_enum DEFAULT 'en_attente'::public.commandes_statut_enum NOT NULL,
    date_commande timestamp with time zone NOT NULL,
    date_livraison date,
    notes text,
    mode_paiement character varying(50),
    statut_paiement character varying(20) DEFAULT 'non_paye'::character varying NOT NULL,
    paye_at timestamp with time zone,
    livreur character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.communes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    departement_id uuid NOT NULL
);

CREATE TABLE public.cooperative_membres (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cooperative_id character varying NOT NULL,
    membre_id character varying NOT NULL,
    statut character varying,
    role character varying,
    date_adhesion character varying,
    cotisation_payee boolean,
    actif boolean
);

CREATE TABLE public.cooperatives (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying NOT NULL,
    zone_id character varying,
    responsable_id character varying,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marchand_id uuid NOT NULL,
    client_nom character varying(160) NOT NULL,
    client_phone character varying(40) DEFAULT ''::character varying,
    montant_total numeric NOT NULL,
    acompte numeric DEFAULT 0,
    echeance date NOT NULL,
    articles jsonb DEFAULT '[]'::jsonb,
    notes text DEFAULT ''::text,
    transaction_id uuid,
    statut character varying(20) DEFAULT 'en_cours'::character varying,
    paye_le timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE VIEW public.credits_avec_statut AS
 SELECT id,
    marchand_id,
    client_nom,
    client_phone,
    montant_total,
    acompte,
    echeance,
    articles,
    notes,
    transaction_id,
    paye_le,
    created_at,
    updated_at,
        CASE
            WHEN (((statut)::text = 'paye'::text) OR (COALESCE(acompte, (0)::numeric) >= montant_total)) THEN (0)::numeric
            ELSE GREATEST((montant_total - COALESCE(acompte, (0)::numeric)), (0)::numeric)
        END AS montant_restant,
        CASE
            WHEN (((statut)::text = 'paye'::text) OR (COALESCE(acompte, (0)::numeric) >= montant_total)) THEN 'paye'::text
            WHEN (echeance < CURRENT_DATE) THEN 'en_retard'::text
            ELSE 'en_cours'::text
        END AS statut
   FROM public.credits c;

CREATE TABLE public.cycles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    culture character varying(100) NOT NULL,
    surface numeric(10,2) NOT NULL,
    parcelle character varying(100),
    date_plantation date NOT NULL,
    date_recolte_estimee date NOT NULL,
    date_recolte_reelle date,
    quantite_estimee numeric(10,2) NOT NULL,
    quantite_reelle numeric(10,2),
    status public.cycles_status_enum DEFAULT 'active'::public.cycles_status_enum NOT NULL,
    notes text,
    photo_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    statut character varying
);

CREATE TABLE public.departements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    region_id uuid NOT NULL
);

CREATE TABLE public.districts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL
);

CREATE TABLE public.evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commande_id uuid NOT NULL,
    auteur_id uuid NOT NULL,
    cible_id uuid NOT NULL,
    note smallint NOT NULL,
    commentaire text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT evaluations_note_check CHECK (((note >= 1) AND (note <= 5)))
);

CREATE TABLE public.fidelite_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marchand_id uuid NOT NULL,
    telephone character varying(40) NOT NULL,
    nom character varying(160),
    points numeric DEFAULT 0,
    total_achats numeric DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.fidelite_config (
    marchand_id uuid NOT NULL,
    actif boolean DEFAULT false,
    points_par_cent numeric DEFAULT 1,
    seuil_points numeric DEFAULT 100,
    recompense_fcfa numeric DEFAULT 1000,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.identifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    identificateur_id character varying,
    acteur_id character varying,
    type_acteur character varying,
    statut character varying DEFAULT 'en_attente'::character varying NOT NULL,
    documents jsonb,
    zone_id character varying,
    commission numeric,
    commission_payee boolean DEFAULT false NOT NULL,
    date_identification timestamp without time zone,
    acteur_nom character varying,
    region character varying,
    commune character varying,
    motif_rejet character varying,
    latitude double precision,
    longitude double precision,
    current_step integer DEFAULT 0,
    form_data jsonb,
    source public.identification_source_enum DEFAULT 'terrain'::public.identification_source_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.institutions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying NOT NULL,
    type character varying,
    zone_id character varying,
    responsable_id character varying,
    modules jsonb DEFAULT '{}'::jsonb NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marchand_sous_profil_historique (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    marchand_id uuid NOT NULL,
    ancien_sous_profil public.marchand_sous_profil_historique_ancien_sous_profil_enum,
    nouveau_sous_profil public.marchand_sous_profil_historique_nouveau_sous_profil_enum,
    modifie_par uuid,
    motif text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(255) NOT NULL,
    adresse text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    type public.marche_type_enum DEFAULT 'autre'::public.marche_type_enum NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    zone_id uuid
);

CREATE TABLE public.missions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    titre character varying NOT NULL,
    description character varying,
    assignee_id character varying,
    zone_id character varying,
    statut character varying DEFAULT 'en_attente'::character varying NOT NULL,
    priorite character varying DEFAULT 'normale'::character varying NOT NULL,
    date_echeance timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.mutations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    identificateur_id uuid NOT NULL,
    identificateur_nom character varying(255),
    zone_actuelle_id character varying(100),
    zone_actuelle_nom character varying(255),
    zone_demandee_id character varying(100) NOT NULL,
    zone_demandee_nom character varying(255) NOT NULL,
    raison text NOT NULL,
    statut public.mutations_statut_enum DEFAULT 'en_attente'::public.mutations_statut_enum NOT NULL,
    decideur_id uuid,
    motif_decision text,
    date_decision timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.negociations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    marchand_id character varying NOT NULL,
    vendeur_id character varying NOT NULL,
    produit character varying NOT NULL,
    quantite numeric(10,2) NOT NULL,
    prix_original numeric(10,2) NOT NULL,
    prix_propose numeric(10,2) NOT NULL,
    unite character varying NOT NULL,
    message text,
    statut public.negociations_statut_enum DEFAULT 'en_attente'::public.negociations_statut_enum NOT NULL,
    prix_contre_offre numeric,
    message_reponse text,
    nb_contre_offres integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    role character varying,
    type character varying NOT NULL,
    titre character varying NOT NULL,
    message character varying NOT NULL,
    priority character varying DEFAULT 'medium'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    category character varying,
    icon character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);

CREATE TABLE public.objectifs_journaliers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    objectif numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    date date NOT NULL,
    alerte50 boolean DEFAULT false NOT NULL,
    alerte80 boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.produits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marchand_id text NOT NULL,
    nom text NOT NULL,
    prix numeric DEFAULT 0,
    prix_achat numeric DEFAULT 0,
    categorie text,
    stock numeric DEFAULT 0,
    unite text,
    image text,
    actif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    seuil_alerte numeric,
    date_peremption date,
    prix_promo numeric,
    promo_fin date
);

CREATE TABLE public.publications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    cycle_id uuid,
    recolte_id uuid,
    produit character varying(100) NOT NULL,
    culture character varying(100) NOT NULL,
    quantite_disponible numeric(10,2) NOT NULL,
    quantite_initiale numeric(10,2) NOT NULL,
    unite character varying(50) NOT NULL,
    prix_unitaire numeric(10,2) NOT NULL,
    qualite character varying(50) NOT NULL,
    localisation character varying(200),
    active boolean DEFAULT true NOT NULL,
    statut public.publications_statut_enum DEFAULT 'disponible'::public.publications_statut_enum NOT NULL,
    cooperative_id uuid,
    type_marche public.publications_type_marche_enum DEFAULT 'producteur'::public.publications_type_marche_enum NOT NULL,
    date_publication timestamp with time zone NOT NULL,
    date_expiration date,
    date_recolte date,
    description text,
    photo_url text,
    conditions_vente text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.push_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.raccourcis (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    nom character varying NOT NULL,
    declencheur character varying NOT NULL,
    type character varying DEFAULT 'vente'::character varying NOT NULL,
    action jsonb DEFAULT '{}'::jsonb NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.raccourcis_vocaux (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    nom character varying NOT NULL,
    declencheur character varying NOT NULL,
    type character varying NOT NULL,
    action jsonb,
    actif boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.recoltes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quantite numeric(10,2) NOT NULL,
    prix_unitaire numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    producteur_id character varying,
    zone_id character varying,
    user_id uuid NOT NULL,
    cycle_id uuid,
    qualite public.recoltes_qualite_enum NOT NULL,
    parcelle character varying(100),
    notes text,
    photo_url text,
    stock_disponible numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    stock_vendu numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    produit character varying(100) NOT NULL,
    unite character varying(50) NOT NULL,
    date_recolte date NOT NULL,
    statut public.recoltes_statut_enum DEFAULT 'declaree'::public.recoltes_statut_enum NOT NULL
);

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    device_info character varying(500),
    ip_address character varying(45),
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.regions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    district_id uuid NOT NULL
);

CREATE TABLE public.stock_mouvements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marchand_id text NOT NULL,
    transaction_id uuid,
    produit_id uuid,
    produit_nom text,
    stock_avant numeric NOT NULL,
    quantite_demandee numeric NOT NULL,
    quantite_retranchee numeric NOT NULL,
    manquant numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stock_reservations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    commande_id uuid NOT NULL,
    publication_id uuid,
    recolte_id uuid,
    quantite numeric(10,2) NOT NULL,
    statut character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.stocks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    produit character varying NOT NULL,
    quantite numeric,
    unite character varying,
    zone_id character varying,
    proprietaire_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    seuil_alerte numeric,
    prix_achat numeric,
    prix_vente numeric,
    categorie text,
    image text,
    date_peremption date,
    prix_promo numeric,
    promo_fin date
);

CREATE TABLE public.tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying,
    titre character varying,
    description character varying,
    categorie character varying,
    statut character varying DEFAULT 'ouvert'::character varying NOT NULL,
    priorite character varying DEFAULT 'normale'::character varying NOT NULL,
    reponses jsonb DEFAULT '[]'::jsonb NOT NULL,
    lu_par_bo boolean DEFAULT false NOT NULL,
    numero character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_flags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying NOT NULL,
    flag_type public.flag_type_enum NOT NULL,
    raison text NOT NULL,
    commentaire text,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by character varying,
    resolution_note text
);

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    genre character varying DEFAULT 'femme'::character varying,
    password_hash character varying,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role public.users_role_enum NOT NULL,
    sous_profil_marchand public.users_sous_profil_marchand_enum,
    region character varying(100),
    commune character varying(100),
    activity character varying(200),
    market character varying(200),
    cooperative_name character varying(200),
    institution_name character varying(200),
    photo_url text,
    nin character varying(100),
    nationalite character varying(100),
    situation_matrimoniale character varying(100),
    num_cnps character varying(100),
    num_cmu character varying(100),
    recepisse character varying(200),
    date_naissance date,
    lieu_naissance character varying(200),
    est_membre_cooperative boolean DEFAULT false,
    categorie character varying(200),
    boite_postale character varying(200),
    statut_entrepreneur character varying(200),
    type_point_vente character varying(50),
    type_point_vente_autre text,
    district_id character varying,
    district_autre text,
    region_id character varying,
    region_autre text,
    departement_id character varying,
    departement_autre text,
    commune_id character varying,
    commune_autre text,
    quartier_village text,
    zone_id character varying,
    status public.users_status_enum DEFAULT 'pending'::public.users_status_enum NOT NULL,
    pending_validation_data jsonb,
    validated boolean DEFAULT false NOT NULL,
    pin_security_enabled boolean DEFAULT false NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    bo_permissions jsonb,
    entite_metadata jsonb,
    objectif_mensuel integer,
    prime_objectif integer,
    pin_code_hash character varying,
    pin_code_encrypted_identificateur character varying,
    failed_pin_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    last_login_at timestamp with time zone,
    last_login_user_agent character varying(500),
    webauthn_credentials jsonb DEFAULT '[]'::jsonb,
    webauthn_challenge character varying
);

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type public.wallet_transactions_type_enum NOT NULL,
    montant numeric(15,2) NOT NULL,
    description text,
    statut character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    related_entity_type character varying(100),
    related_entity_id uuid,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    solde numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    solde_bloque numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(10) DEFAULT 'XOF'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.zones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nom character varying NOT NULL,
    ville character varying,
    region character varying,
    description character varying,
    gestionnaire_id character varying,
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.commandes
    ADD CONSTRAINT "PK_048c7aef9a99d4aed24c9054893" PRIMARY KEY (id);

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT "PK_0be7539dcdba335470dc05e9690" PRIMARY KEY (id);

ALTER TABLE ONLY public.cooperative_membres
    ADD CONSTRAINT "PK_0d27db950c50899676bce8e69dd" PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT "PK_2c4850823d8f6ec267b042368da" PRIMARY KEY (id);

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT "PK_2c4e732b044e09139d2f1065fae" PRIMARY KEY (id);

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT "PK_32734e87f299c29ca3878861f4f" PRIMARY KEY (id);

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY (id);

ALTER TABLE ONLY public.raccourcis
    ADD CONSTRAINT "PK_3a74f2e283338659fef10802360" PRIMARY KEY (id);

ALTER TABLE ONLY public.academy_questions
    ADD CONSTRAINT "PK_432acea399a929f312e6613d973" PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT "PK_46ec0f5605d70f64654ad4e7bd9" PRIMARY KEY (id);

ALTER TABLE ONLY public.identifications
    ADD CONSTRAINT "PK_4c4f716e96651b63e7369a42aeb" PRIMARY KEY (id);

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT "PK_4fcd12ed6a046276e2deb08801c" PRIMARY KEY (id);

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY (id);

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT "PK_529c862266138c6e9cf315b53c0" PRIMARY KEY (id);

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT "PK_52e5eeb9c7c6e4ad1aed657967a" PRIMARY KEY (id);

ALTER TABLE ONLY public.cooperatives
    ADD CONSTRAINT "PK_52fc93ab8869e3f71c46601fe9b" PRIMARY KEY (id);

ALTER TABLE ONLY public.communes
    ADD CONSTRAINT "PK_53a9285bb669dd2298c4de525bb" PRIMARY KEY (id);

ALTER TABLE ONLY public.recoltes
    ADD CONSTRAINT "PK_6343e1b79d617a65d8496492743" PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);

ALTER TABLE ONLY public.user_flags
    ADD CONSTRAINT "PK_6de618449277fb758cd2f13c1e3" PRIMARY KEY (id);

ALTER TABLE ONLY public.marchand_sous_profil_historique
    ADD CONSTRAINT "PK_71d69ef1c2c7f6eceea500700f9" PRIMARY KEY (id);

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT "PK_787aebb1ac5923c9904043c6309" PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY (id);

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT "PK_880484a43ca311707b05895bd4a" PRIMARY KEY (id);

ALTER TABLE ONLY public.academy_modules
    ADD CONSTRAINT "PK_8ec08f442448e2c7a1ea56bac73" PRIMARY KEY (id);

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT "PK_972a72ff4e3bea5c7f43a2b98af" PRIMARY KEY (id);

ALTER TABLE ONLY public.caisse_transactions
    ADD CONSTRAINT "PK_9f7c5c349b66557717dd96b1d71" PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);

ALTER TABLE ONLY public.boutique_mouvements
    ADD CONSTRAINT "PK_a7a4ca36a3fea7db0066f750162" PRIMARY KEY (id);

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT "PK_b5b1ee4ac914767229337974575" PRIMARY KEY (id);

ALTER TABLE ONLY public.objectifs_journaliers
    ADD CONSTRAINT "PK_c82f0002854f4702a34d1feae08" PRIMARY KEY (id);

ALTER TABLE ONLY public.marches
    ADD CONSTRAINT "PK_d1ffb1f02f29e4f405d1d728243" PRIMARY KEY (id);

ALTER TABLE ONLY public.negociations
    ADD CONSTRAINT "PK_dd51990e9d8e65699a336104c6b" PRIMARY KEY (id);

ALTER TABLE ONLY public.raccourcis_vocaux
    ADD CONSTRAINT "PK_f8e7aa8dddec42142557cd01aa1" PRIMARY KEY (id);

ALTER TABLE ONLY public.academy_progress
    ADD CONSTRAINT "PK_fa54eb53cdaa4a07c2efac20d4e" PRIMARY KEY (id);

ALTER TABLE ONLY public.cooperatives
    ADD CONSTRAINT "UQ_0d2cc92e9eea45587a60b18c3ff" UNIQUE (responsable_id);

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT "UQ_8e9d73424149b43b38244f75528" UNIQUE (code);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "UQ_92558c08091598f7a4439586cda" UNIQUE (user_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE (phone);

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT "UQ_c177b96380c25d2a0364124c7a9" UNIQUE (nom);

ALTER TABLE ONLY public.academy_progress
    ADD CONSTRAINT "UQ_e55a5ee0373d2132b9315184d96" UNIQUE (user_id, module_id);

ALTER TABLE ONLY public.bpay_transactions
    ADD CONSTRAINT bpay_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.caisse_sessions
    ADD CONSTRAINT caisse_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.fidelite_clients
    ADD CONSTRAINT fidelite_clients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.fidelite_config
    ADD CONSTRAINT fidelite_config_pkey PRIMARY KEY (marchand_id);

ALTER TABLE ONLY public.produits
    ADD CONSTRAINT produits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_mouvements
    ADD CONSTRAINT stock_mouvements_pkey PRIMARY KEY (id);

CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON public.refresh_tokens USING btree (user_id);

CREATE INDEX "IDX_760ed385479f5bd683018f1379" ON public.boutique_mouvements USING btree (marchand_id);

CREATE UNIQUE INDEX "IDX_ad3e46cb78aedbf7882e547a53" ON public.cooperative_membres USING btree (cooperative_id, membre_id);

CREATE INDEX idx_credits_marchand ON public.credits USING btree (marchand_id);

CREATE INDEX idx_evaluations_cible ON public.evaluations USING btree (cible_id);

CREATE INDEX idx_produits_marchand ON public.produits USING btree (marchand_id);

CREATE INDEX idx_stock_mouvements_marchand ON public.stock_mouvements USING btree (marchand_id, created_at);

CREATE INDEX idx_stock_mouvements_tx ON public.stock_mouvements USING btree (transaction_id);

CREATE INDEX idx_stock_reservations_publication ON public.stock_reservations USING btree (publication_id);

CREATE INDEX idx_stock_reservations_recolte ON public.stock_reservations USING btree (recolte_id);

CREATE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text)) WHERE (email IS NOT NULL);

CREATE UNIQUE INDEX idx_users_email_unique ON public.users USING btree (email) WHERE (email IS NOT NULL);

CREATE UNIQUE INDEX ux_caisse_sessions_marchand_date ON public.caisse_sessions USING btree (marchand_id, date);

CREATE UNIQUE INDEX ux_caisse_tx_idempotency_key ON public.caisse_transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE UNIQUE INDEX ux_clients_marchand_nom ON public.clients USING btree (marchand_id, nom);

CREATE UNIQUE INDEX ux_evaluations_cmd_auteur ON public.evaluations USING btree (commande_id, auteur_id);

CREATE UNIQUE INDEX ux_fidelite_client ON public.fidelite_clients USING btree (marchand_id, telephone);

CREATE UNIQUE INDEX ux_publications_user_produit ON public.publications USING btree (user_id, lower(TRIM(BOTH FROM produit)));

CREATE UNIQUE INDEX ux_stock_reservations_commande ON public.stock_reservations USING btree (commande_id);

ALTER TABLE ONLY public.marches
    ADD CONSTRAINT "FK_05500efd05f72c9141ec296304e" FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT "FK_215c6b9274f41665a154db4dfc4" FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT "FK_4796762c619893704abbc3dce65" FOREIGN KEY (user_id) REFERENCES public.wallets(user_id);

ALTER TABLE ONLY public.commandes
    ADD CONSTRAINT "FK_79d45115b7e411b4eba9179f493" FOREIGN KEY (acheteur_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.commandes
    ADD CONSTRAINT "FK_89b340df4ab6331d651865df3a4" FOREIGN KEY (publication_id) REFERENCES public.publications(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_92558c08091598f7a4439586cda" FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT "FK_9ee3bc3631b2e8919c05d9a1a81" FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.departements
    ADD CONSTRAINT "FK_a11a5f46c36bc38067965c877bf" FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.recoltes
    ADD CONSTRAINT "FK_c921bd98c371f2053c1991f5f25" FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.commandes
    ADD CONSTRAINT "FK_cafe31c486af3e5eec0a273ebee" FOREIGN KEY (vendeur_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT "FK_d0c72ad2c80cc78a99ddfe1f1e8" FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.communes
    ADD CONSTRAINT "FK_dc2adca1292f393cb5f35dd87d9" FOREIGN KEY (departement_id) REFERENCES public.departements(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT "FK_e3681a80d74f8e3fbd3f4c94ba8" FOREIGN KEY (recolte_id) REFERENCES public.recoltes(id);

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT "FK_ec50069e0910bfc638ac8fc49ef" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE ONLY public.recoltes
    ADD CONSTRAINT "FK_f901ffbf66a4d0537ea235c0a97" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

`);
  }

  public async down(): Promise<void> {
    throw new Error(
      "BaselineSchema (ADR-0002) n'est pas réversible : elle représente le plancher du schéma.",
    );
  }
}
