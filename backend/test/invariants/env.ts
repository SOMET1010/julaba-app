// setupFiles — exécuté AVANT le chargement du module de test (donc avant l'import
// d'AppModule), afin que la config TypeORM lise ces variables. Force un
// environnement de test isolé et déterministe.

import { TEST_DB, assertBaseDeTest } from './test-db';

// Sécurité de test — forcés (jamais dev/prod).
process.env.NODE_ENV = 'test';
process.env.DB_HOST = TEST_DB.host;
process.env.DB_PORT = String(TEST_DB.port);
process.env.DB_USERNAME = TEST_DB.user;
process.env.DB_PASSWORD = TEST_DB.password;
process.env.DB_NAME = TEST_DB.name;
process.env.DB_SSL = 'false';
process.env.DB_SYNCHRONIZE = 'true'; // schéma depuis les entités (base vierge)
delete process.env.DB_MIGRATIONS_RUN; // jamais en même temps que synchronize
process.env.SEED_DEMO = 'false'; // seed minimal via API uniquement, pas le jeu démo

// Secrets de TEST déterministes (non-prod).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-invariants-000000';
process.env.PIN_ENCRYPTION_KEY =
  process.env.PIN_ENCRYPTION_KEY || 'test-pin-encryption-key-32-bytes!';
process.env.REFRESH_TOKEN_SALT = process.env.REFRESH_TOKEN_SALT || 'test-refresh-salt';

assertBaseDeTest();
