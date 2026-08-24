-- ============================================================
-- JULABA — Utilisateurs test (déjà vérifiés / validés)
-- Usage : psql -h rec-julaba-db-02.privatelink.postgres.database.azure.com \
--          -p 5432 -U adm_dtdijulaba postgres -f seed-test-users.sql
-- ============================================================
-- Mots de passe :
--   Acteurs   : 0000
--   BO/Admin  : 123456
-- ============================================================

-- Hash bcrypt salt=10 pour '0000'
\set hash_0000 '$2b$10$Z8Gmnr/RlGPL8W02MPtYOu65EarXfQTD/MZspSx0WAOXByBQMHJ06'
-- Hash bcrypt salt=10 pour '123456'
\set hash_123456 '$2b$10$5cSUiUPPGEHbjqg7K4F0POlqWQZenCn..uZQPt.gjFUcQUDpV4kCC'

-- ── SUPER ADMIN ───────────────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre)
VALUES ('0501604040', 'Kouamé', 'Admin', 'super_admin', 'actif', true, :'hash_123456', false, 'homme')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

-- ── IDENTIFICATEUR ────────────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre, region, commune)
VALUES ('0709010203', 'Aya', 'Traoré', 'identificateur', 'actif', true, :'hash_123456', false, 'femme', 'Lagunes', 'Abidjan')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

-- ── PRODUCTEURS ───────────────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre, region, commune, activity)
VALUES
  ('0102030405', 'Koffi', 'Yao', 'producteur', 'actif', true, :'hash_0000', false, 'homme', 'Lagunes', 'Abobo', 'Cultivateur de manioc'),
  ('0103040506', 'Adjoua', 'Bamba', 'producteur', 'actif', true, :'hash_0000', false, 'femme', 'Bas-Sassandra', 'San-Pédro', 'Productrice de cacao')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

-- ── MARCHANDS ─────────────────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre, region, commune, market)
VALUES
  ('0506070809', 'Ibrahim', 'Koné', 'marchand', 'actif', true, :'hash_0000', false, 'homme', 'Lagunes', 'Yopougon', 'Marché Adjamé'),
  ('0607080910', 'Fatou', 'Diallo', 'marchand', 'actif', true, :'hash_0000', false, 'femme', 'Lagunes', 'Cocody', 'Marché Cocody')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

-- ── COOPÉRATIVE ───────────────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre, region, commune, cooperative_name)
VALUES ('0708091011', 'Mamadou', 'Soumahoro', 'cooperateur', 'actif', true, :'hash_0000', false, 'homme', 'Savanes', 'Korhogo', 'Coopérative du Nord')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

-- ── INSTITUTION ───────────────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre, institution_name)
VALUES ('0809101112', 'Dr. Marie', 'Coulibaly', 'institution', 'actif', true, :'hash_123456', false, 'femme', 'Ministère de l\'Agriculture')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

-- ── BACKOFFICE ────────────────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre)
VALUES ('0910111213', 'Jean', 'Brou', 'admin_general', 'actif', true, :'hash_123456', false, 'homme')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

-- ── GESTIONNAIRE DE ZONE ─────────────────────────────────────
INSERT INTO users (phone, first_name, last_name, role, status, validated, password_hash, must_change_password, genre, region, commune)
VALUES ('1011121314', 'Aissatou', 'Touré', 'gestionnaire_zone', 'actif', true, :'hash_123456', false, 'femme', 'Lagunes', 'Abidjan')
ON CONFLICT (phone) DO UPDATE SET
  status = 'actif', validated = true, password_hash = EXCLUDED.password_hash;

SELECT '✅ 9 utilisateurs test créés/vérifiés avec succès !' AS message;
SELECT phone, first_name, last_name, role, status, validated FROM users ORDER BY role, created_at;
