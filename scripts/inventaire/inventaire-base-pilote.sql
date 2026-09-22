-- INVENTAIRE DE LA BASE PILOTE — LECTURE SEULE, SANS AUCUNE PII.
--
-- Lancer :   psql "$DATABASE_URL" -f scripts/inventaire/inventaire-base-pilote.sql
-- ou par le script d'accompagnement, qui ajoute les garde-fous :
--            bash scripts/inventaire/inventaire-base-pilote.sh
--
-- ── CE QUE CE FICHIER NE FAIT PAS, ET COMMENT ON LE SAIT ──────────────────
--
-- Il ne contient AUCUN mot d'écriture. La transaction est ouverte en READ ONLY
-- dès la première ligne : PostgreSQL LUI-MÊME refuserait un INSERT, un UPDATE,
-- un DELETE, un CREATE ou un ALTER, avec l'erreur « cannot execute ... in a
-- read-only transaction ». Ce n'est pas une promesse de l'auteur, c'est une
-- garantie du moteur.
--
-- ── AUCUNE PII N'EST IMPRIMÉE ────────────────────────────────────────────
--
-- Aucune requête ne rend une valeur de colonne personnelle. Ce qui sort :
--   • des COMPTAGES (count, count distinct, count des nuls) ;
--   • des DATES extrêmes (min/max created_at) ;
--   • des noms de GÉOGRAPHIE (districts, régions) et de PRODUITS.
--
-- Un nom de commune ou de produit n'est pas une donnée personnelle. Un
-- téléphone, un nom de personne, un NIN, une photo, un hachage de mot de passe
-- ou une coordonnée GPS ne sortent JAMAIS d'ici — aucune des requêtes
-- ci-dessous ne nomme ces colonnes autrement que dans un `count(*)`.
--
-- ── ET SI LE SCHÉMA DIFFÈRE ──────────────────────────────────────────────
--
-- Les tables sont découvertes dans le catalogue, jamais écrites en dur. Les
-- contrôles de clés sont gardés par `to_regclass` : une table absente est
-- SIGNALÉE comme absente, elle ne fait pas échouer l'inventaire et elle ne
-- passe pas pour un zéro. C'est la même règle que partout dans ce dépôt :
-- « non lu » n'est pas « zéro ».

\set ON_ERROR_STOP on
\timing off
\pset border 2
\pset null '(null)'

BEGIN;
SET TRANSACTION READ ONLY;
-- Une requête d'inventaire ne doit jamais ralentir la caisse d'une marchande.
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '180s';

\echo ''
\echo '════════════════════════════════════════════════════════════════════'
\echo '  INVENTAIRE DE LA BASE PILOTE — lecture seule, sans PII'
\echo '════════════════════════════════════════════════════════════════════'

SELECT current_database()   AS base,
       current_user         AS utilisateur,
       version()            AS moteur,
       now()                AS horodatage,
       pg_size_pretty(pg_database_size(current_database())) AS taille;

-- ══════════════════════════════════════════════════════════════════════════
\echo ''
\echo '── 1. COUNT PAR TABLE ──────────────────────────────────────────────'
-- `query_to_xml` exécute un `count(*)` réel par table, sans que le nom de la
-- table soit écrit en dur nulle part. Un `reltuples` aurait été instantané
-- mais APPROXIMATIF : sur une question « combien de lignes avons-nous »,
-- une estimation n'est pas une réponse.

SELECT t.table_name AS "table",
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.table_name),
                           false, true, '')))[1]::text::bigint AS lignes,
       pg_size_pretty(pg_total_relation_size(format('public.%I', t.table_name)::regclass)) AS taille
  FROM information_schema.tables t
 WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
 ORDER BY 2 DESC, 1;

\echo ''
\echo '   total des lignes, toutes tables :'
SELECT sum((xpath('/row/c/text()',
             query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.table_name),
                          false, true, '')))[1]::text::bigint) AS lignes_totales,
       count(*) AS tables
  FROM information_schema.tables t
 WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE';

-- ══════════════════════════════════════════════════════════════════════════
\echo ''
\echo '── 2. MIN / MAX created_at (tables qui en ont un) ──────────────────'
-- Dit depuis QUAND la base vit, et jusqu''à quand. Une table dont le max est
-- vieux de trois mois est soit finie, soit oubliée — et c''est une question,
-- pas un constat.

SELECT c.table_name AS "table",
       (xpath('/row/a/text()',
              query_to_xml(format('SELECT min(created_at) AS a FROM public.%I', c.table_name),
                           false, true, '')))[1]::text AS plus_ancien,
       (xpath('/row/b/text()',
              query_to_xml(format('SELECT max(created_at) AS b FROM public.%I', c.table_name),
                           false, true, '')))[1]::text AS plus_recent
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
   AND t.table_type = 'BASE TABLE'
 WHERE c.table_schema = 'public' AND c.column_name = 'created_at'
 ORDER BY 3 DESC NULLS LAST, 1;

-- ══════════════════════════════════════════════════════════════════════════
\echo ''
\echo '── 3. CLÉS CRITIQUES : NULS ET DOUBLONS ────────────────────────────'
-- Chaque ligne est une question à laquelle la base répond par un nombre.
-- ATTENDU = 0 partout. Un nombre non nul n''est pas un détail : c''est une
-- clé qui ne tient pas, donc une donnée qui peut avoir deux sens.
--
-- Une table absente est dite ABSENTE, jamais comptée comme zéro.

WITH controles(cible, libelle, requete) AS (VALUES
  ('public.users',                'users — phone NUL (un compte sans identifiant de connexion)',
   'SELECT count(*) AS c FROM public.users WHERE phone IS NULL OR btrim(phone) = '''''),
  ('public.users',                'users — phone EN DOUBLE (deux comptes, un seul numéro)',
   'SELECT coalesce(sum(n-1),0) AS c FROM (SELECT count(*) n FROM public.users WHERE phone IS NOT NULL GROUP BY phone HAVING count(*) > 1) x'),
  ('public.users',                'users — role NUL',
   'SELECT count(*) AS c FROM public.users WHERE role IS NULL'),

  ('public.catalogue_maitre',     'catalogue_maitre — LIGNES (attendu 198 après synchro)',
   'SELECT count(*) AS c FROM public.catalogue_maitre'),
  ('public.catalogue_maitre',     'catalogue_maitre — default_code EN DOUBLE',
   'SELECT coalesce(sum(n-1),0) AS c FROM (SELECT count(*) n FROM public.catalogue_maitre GROUP BY default_code HAVING count(*) > 1) x'),
  ('public.catalogue_maitre',     'catalogue_maitre — default_code NUL',
   'SELECT count(*) AS c FROM public.catalogue_maitre WHERE default_code IS NULL OR btrim(default_code) = '''''),

  ('public.produits',             'produits — marchand_id NUL (produit sans propriétaire)',
   'SELECT count(*) AS c FROM public.produits WHERE marchand_id IS NULL'),
  ('public.produits',             'produits — prix NUL sur un produit ACTIF (STK-01)',
   'SELECT count(*) AS c FROM public.produits WHERE actif = true AND prix IS NULL'),
  ('public.produits',             'produits — SANS default_code (non rattachés au référentiel)',
   'SELECT count(*) AS c FROM public.produits WHERE default_code IS NULL OR btrim(default_code) = '''''),
  ('public.produits',             'produits — (marchand_id, default_code) EN DOUBLE',
   'SELECT coalesce(sum(n-1),0) AS c FROM (SELECT count(*) n FROM public.produits WHERE default_code IS NOT NULL GROUP BY marchand_id, default_code HAVING count(*) > 1) x'),

  ('public.caisse_transactions',  'caisse_transactions — marchand_id NUL (argent sans propriétaire)',
   'SELECT count(*) AS c FROM public.caisse_transactions WHERE marchand_id IS NULL'),
  ('public.caisse_transactions',  'caisse_transactions — montant NUL',
   'SELECT count(*) AS c FROM public.caisse_transactions WHERE montant IS NULL'),
  ('public.caisse_transactions',  'caisse_transactions — idempotency_key EN DOUBLE (double comptage)',
   'SELECT coalesce(sum(n-1),0) AS c FROM (SELECT count(*) n FROM public.caisse_transactions WHERE idempotency_key IS NOT NULL GROUP BY idempotency_key HAVING count(*) > 1) x'),
  ('public.caisse_transactions',  'caisse_transactions — DÉPENSES sans catégorie (DEP-02, attendu > 0 sur l''historique)',
   'SELECT count(*) AS c FROM public.caisse_transactions WHERE type = ''depense'' AND category IS NULL'),

  ('public.caisse_sessions',      'caisse_sessions — (marchand_id, date) EN DOUBLE (deux journées le même jour)',
   'SELECT coalesce(sum(n-1),0) AS c FROM (SELECT count(*) n FROM public.caisse_sessions GROUP BY marchand_id, date HAVING count(*) > 1) x'),
  ('public.caisse_sessions',      'caisse_sessions — FERMÉES avec un écart non renseigné',
   'SELECT count(*) AS c FROM public.caisse_sessions WHERE ouvert = false AND ecart IS NULL'),

  ('public.clients',              'clients — (marchand_id, nom) EN DOUBLE',
   'SELECT coalesce(sum(n-1),0) AS c FROM (SELECT count(*) n FROM public.clients GROUP BY marchand_id, nom HAVING count(*) > 1) x'),

  ('public.regions',              'regions — district_id orphelin (région sans district)',
   'SELECT count(*) AS c FROM public.regions r WHERE r.district_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.districts d WHERE d.id = r.district_id)'),
  ('public.regions',              'regions — district_id NUL',
   'SELECT count(*) AS c FROM public.regions WHERE district_id IS NULL'),
  ('public.departements',         'departements — region_id orphelin',
   'SELECT count(*) AS c FROM public.departements dp WHERE dp.region_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.id = dp.region_id)'),
  ('public.communes',             'communes — departement_id orphelin',
   'SELECT count(*) AS c FROM public.communes cm WHERE cm.departement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departements dp WHERE dp.id = cm.departement_id)')
)
-- LE GARDE-FOU DE CETTE SECTION. Chaque contrôle nomme les colonnes dont il a
-- besoin. Si l'une manque — schéma plus ancien, migration pas encore passée —
-- le contrôle est dit NON APPLICABLE et l'inventaire continue. Sans ce
-- garde-fou, une seule colonne absente fait tomber tout le rapport (constaté
-- en répétition à blanc : `communes.departement_code` n'existe pas, la clé est
-- `departement_id`). Et « non applicable » n'est jamais « zéro ».
, colonnes_requises(cible2, cols) AS (VALUES
  ('public.users',               ARRAY['phone','role']),
  ('public.catalogue_maitre',    ARRAY['default_code','actif','synced_at']),
  ('public.produits',            ARRAY['marchand_id','prix','actif','default_code']),
  ('public.caisse_transactions', ARRAY['marchand_id','montant','idempotency_key','type','category']),
  ('public.caisse_sessions',     ARRAY['marchand_id','date','ouvert','ecart']),
  ('public.clients',             ARRAY['marchand_id','nom']),
  ('public.regions',             ARRAY['district_id']),
  ('public.departements',        ARRAY['region_id']),
  ('public.communes',            ARRAY['departement_id'])
),
applicables AS (
  SELECT c.cible, c.libelle, c.requete,
         to_regclass(c.cible) IS NOT NULL AS table_presente,
         COALESCE((
           SELECT bool_and(EXISTS (
             SELECT 1 FROM information_schema.columns ic
              WHERE ic.table_schema = 'public'
                AND ic.table_name = split_part(cr.cible2, '.', 2)
                AND ic.column_name = col))
             FROM unnest(cr.cols) AS col
         ), true) AS colonnes_presentes
    FROM controles c
    LEFT JOIN colonnes_requises cr ON cr.cible2 = c.cible
)
SELECT libelle AS controle,
       CASE WHEN table_presente AND colonnes_presentes
            THEN (xpath('/row/c/text()', query_to_xml(requete, false, true, '')))[1]::text::bigint
       END AS valeur,
       CASE WHEN NOT table_presente THEN 'TABLE ABSENTE — pas zéro, absente'
            WHEN NOT colonnes_presentes THEN 'NON APPLICABLE — colonne absente de ce schéma'
            WHEN (xpath('/row/c/text()', query_to_xml(requete, false, true, '')))[1]::text::bigint = 0 THEN 'ok'
            ELSE 'À REGARDER'
       END AS verdict
  FROM applicables
 ORDER BY 1;

-- ══════════════════════════════════════════════════════════════════════════
\echo ''
\echo '── 4. catalogue_maitre RÉEL ────────────────────────────────────────'
-- La question du 22/09 : les 198 produits d''Odoo sont-ils arrivés ?

SELECT count(*)                                   AS lignes,
       count(*) FILTER (WHERE actif)              AS actives,
       count(DISTINCT default_code)               AS references_distinctes,
       count(*) FILTER (WHERE odoo_product_id IS NULL) AS sans_id_odoo,
       count(DISTINCT categorie)                  AS categories,
       min(synced_at)                             AS premiere_synchro,
       max(synced_at)                             AS derniere_synchro
  FROM public.catalogue_maitre;

\echo ''
\echo '   trois références, pour voir ce qui est réellement là :'
-- Des noms de PRODUITS. Aucune donnée personnelle.
SELECT default_code, nom, categorie, actif
  FROM public.catalogue_maitre
 ORDER BY default_code
 LIMIT 3;

\echo ''
\echo '   répartition par catégorie (10 premières) :'
SELECT coalesce(categorie, '(sans catégorie)') AS categorie, count(*) AS produits
  FROM public.catalogue_maitre
 GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10;

-- ══════════════════════════════════════════════════════════════════════════
\echo ''
\echo '── 5. DÉCOUPAGE ADMINISTRATIF RÉEL ─────────────────────────────────'
-- Le seed du code annonce 14 districts, 33 régions, 30 départements et 13
-- communes d''Abidjan. La Côte d''Ivoire en compte 14, 33, ~110 et ~200.
-- L''écart entre ce qui est en base et ce qui existe est la vraie mesure.

SELECT 'districts'    AS niveau, count(*) AS en_base, 14  AS attendu_seed, 14  AS reel_civ FROM public.districts
UNION ALL SELECT 'regions',      count(*),            33,                 33          FROM public.regions
UNION ALL SELECT 'departements', count(*),            30,                 111         FROM public.departements
UNION ALL SELECT 'communes',     count(*),            13,                 201         FROM public.communes
ORDER BY 1;

\echo ''
\echo '   districts en base (noms géographiques, aucune PII) :'
SELECT code, nom FROM public.districts ORDER BY code;

\echo ''
\echo '   régions par district :'
SELECT d.code AS district, count(r.*) AS regions
  FROM public.districts d
  LEFT JOIN public.regions r ON r.district_id = d.id
 GROUP BY 1 ORDER BY 2 DESC, 1;

-- ══════════════════════════════════════════════════════════════════════════
\echo ''
\echo '── 6. CE QUE CET INVENTAIRE N''A PAS REGARDÉ ────────────────────────'
\echo '   • aucune valeur personnelle (téléphone, nom, NIN, photo, GPS, secret)'
\echo '   • aucun contenu de identifications.form_data ni de .documents'
\echo '   • aucune écriture : la transaction est READ ONLY, le moteur l''impose'
\echo ''

COMMIT;
