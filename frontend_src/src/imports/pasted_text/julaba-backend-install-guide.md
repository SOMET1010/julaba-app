
🌿  JÙLABA
Guide d'Installation Backend
NestJS · PostgreSQL · Docker · Tests

Attribut
Valeur
Version document
1.0
Date
11/03/2026
Système cible
Ubuntu 22.04 LTS / macOS / Windows (WSL2)
Framework
NestJS 10.x
Base de données
PostgreSQL 16
Node.js requis
≥ 18.x LTS
Durée d'installation
~30–45 minutes


📋 TABLE DES MATIÈRES
1.  Prérequis système
2.  Installation des outils de base
    2.1  Node.js & npm
    2.2  PostgreSQL 16
    2.3  Docker & Docker Compose
    2.4  NestJS CLI
    2.5  Redis (optionnel)
3.  Création & configuration du projet NestJS
    3.1  Initialisation du projet
    3.2  Installation des dépendances
    3.3  Variables d'environnement
    3.4  Configuration TypeORM
    3.5  Bootstrap (main.ts)
4.  Base de données PostgreSQL
    4.1  Création de la base & de l'utilisateur
    4.2  Migrations TypeORM
    4.3  Schéma des tables principales
5.  Docker Compose — Environnement complet
6.  Lancement & vérification
7.  Exécution des tests
8.  Structure complète du projet
9.  Variables d'environnement — référence complète
10. Commandes utiles au quotidien
11. Dépannage (Troubleshooting)

1. PRÉREQUIS SYSTÈME


Logiciel
Version minimum
Rôle
Lien
Node.js
18.x LTS
Runtime JavaScript / NestJS
nodejs.org
npm
9.x
Gestionnaire de paquets
Inclus avec Node.js
PostgreSQL
16
Base de données principale
postgresql.org
Docker
24.x
Conteneurisation (optionnel)
docker.com
Docker Compose
2.x
Orchestration multi-services
Inclus avec Docker
Git
2.x
Gestion de version
git-scm.com
Redis
7.x
Cache & rate limiting (optionnel)
redis.io


✅  Systèmes d'exploitation supportés
• Ubuntu 22.04 LTS / Debian 12 (recommandé pour production)
• macOS 13+ (Ventura ou supérieur)
• Windows 11 avec WSL2 (Windows Subsystem for Linux)


⚠️  Important — WSL2 sur Windows
Si vous êtes sous Windows, installez WSL2 en premier :
  wsl --install   (dans PowerShell en mode Administrateur)
Puis installez Ubuntu depuis le Microsoft Store.
Toutes les commandes suivantes doivent être exécutées dans le terminal WSL2.


2. INSTALLATION DES OUTILS DE BASE


2.1  Node.js & npm
Utiliser NVM (Node Version Manager) — méthode recommandée :

🖥  Terminal — Installation Node.js via NVM
# Installer NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
 
# Recharger le shell
source ~/.bashrc
 
# Installer Node.js 20 LTS (version recommandée)
nvm install 20
nvm use 20
nvm alias default 20
 
# Vérifier l'installation
node --version    # → v20.x.x
npm --version     # → 10.x.x


2.2  PostgreSQL 16
Ubuntu / Debian
🖥  Ubuntu / Debian — PostgreSQL 16
# Ajouter le dépôt officiel PostgreSQL
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
     --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
 
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
> /etc/apt/sources.list.d/pgdg.list'
 
# Installer PostgreSQL 16
sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16
 
# Démarrer le service
sudo systemctl enable postgresql
sudo systemctl start postgresql
 
# Vérifier
sudo systemctl status postgresql
psql --version    # → psql (PostgreSQL) 16.x


macOS (avec Homebrew)
🖥  macOS — PostgreSQL 16 via Homebrew
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
 
# Installer PostgreSQL 16
brew install postgresql@16
 
# Démarrer automatiquement
brew services start postgresql@16
 
# Ajouter au PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
 
# Vérifier
psql --version


2.3  Docker & Docker Compose
Ubuntu / Debian
🖥  Ubuntu — Docker & Docker Compose
# Désinstaller d'anciennes versions
sudo apt remove docker docker-engine docker.io containerd runc
 
# Installer les dépendances
sudo apt update
sudo apt install -y ca-certificates curl gnupg
 
# Ajouter la clé GPG Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
 
# Ajouter le dépôt Docker
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
 
# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
 
# Permettre à l'utilisateur courant d'utiliser Docker
sudo usermod -aG docker $USER
newgrp docker
 
# Vérifier
docker --version          # → Docker version 24.x.x
docker compose version    # → Docker Compose version v2.x.x


macOS
🖥  macOS — Docker Desktop
# Télécharger Docker Desktop depuis docker.com/products/docker-desktop
# Ou via Homebrew :
brew install --cask docker
 
# Démarrer Docker Desktop depuis les Applications
# Puis vérifier :
docker --version
docker compose version


2.4  NestJS CLI
🖥  Installation NestJS CLI
# Installer NestJS CLI globalement
npm install -g @nestjs/cli
 
# Vérifier
nest --version    # → 10.x.x


2.5  Redis (optionnel — pour cache & rate limiting avancé)
🖥  Redis
# Ubuntu
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping    # → PONG
 
# macOS
brew install redis
brew services start redis


3. CRÉATION & CONFIGURATION DU PROJET NESTJS


3.1  Initialisation du projet
🖥  Création du projet
# Créer le projet NestJS
nest new julaba-backend
 
# Choisir : npm  (appuyer sur Entrée)
 
# Entrer dans le répertoire
cd julaba-backend
 
# Ouvrir dans VS Code (optionnel)
code .


3.2  Installation des dépendances
🖥  npm install — Toutes les dépendances
# ── Base de données ──────────────────────────────────────
npm install @nestjs/typeorm typeorm pg
 
# ── Authentification ─────────────────────────────────────
npm install @nestjs/passport passport passport-jwt passport-local
npm install @nestjs/jwt
npm install @types/passport-jwt @types/passport-local
 
# ── Sécurité & Validation ────────────────────────────────
npm install class-validator class-transformer
npm install @nestjs/throttler
npm install bcryptjs
npm install @types/bcryptjs
 
# ── Configuration & Utilitaires ──────────────────────────
npm install @nestjs/config
npm install uuid
npm install @types/uuid
 
# ── Documentation API ────────────────────────────────────
npm install @nestjs/swagger swagger-ui-express
 
# ── Upload de fichiers ───────────────────────────────────
npm install multer @types/multer
 
# ── Tests ────────────────────────────────────────────────
npm install -D jest @types/jest ts-jest
npm install -D supertest @types/supertest
npm install -D @nestjs/testing


ℹ️  Vérification des dépendances installées
Après l'installation, vérifier que package.json contient bien toutes ces dépendances.
En cas d'erreur de version, ajouter --legacy-peer-deps à la commande npm install.


3.3  Variables d'environnement
Créer le fichier .env à la racine du projet :
📄  .env — Configuration complète
# ── Application ──────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
 
# ── PostgreSQL ───────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=julaba_user
DB_PASSWORD=JulabaSecure2024!
DB_NAME=julaba_db
DB_SYNCHRONIZE=false
DB_LOGGING=true
 
# ── JWT Access Token ─────────────────────────────────────
JWT_SECRET=julaba_jwt_secret_change_in_production_min_32_chars
JWT_EXPIRES_IN=15m
 
# ── JWT Refresh Token ────────────────────────────────────
JWT_REFRESH_SECRET=julaba_refresh_secret_change_in_production_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d
 
# ── OTP (SMS) ────────────────────────────────────────────
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6
SMS_PROVIDER=orange                # orange | wave | mtn
SMS_API_KEY=your_sms_provider_api_key
SMS_API_URL=https://api.smsprovider.com/send
 
# ── Upload de fichiers ───────────────────────────────────
UPLOAD_PROVIDER=local              # local | s3 | minio
UPLOAD_LOCAL_PATH=./uploads
UPLOAD_MAX_SIZE_MB=10
 
# ── S3 / MinIO (si UPLOAD_PROVIDER=s3 ou minio) ─────────
STORAGE_BUCKET=julaba-assets
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=your_access_key
STORAGE_SECRET_KEY=your_secret_key
STORAGE_ENDPOINT=https://s3.amazonaws.com
 
# ── Redis (optionnel) ────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
 
# ── Throttling ───────────────────────────────────────────
THROTTLE_TTL=60000
THROTTLE_LIMIT=100


📄  .env.test — Environnement de test
# Créer également .env.test pour les tests E2E
cp .env .env.test
 
# Modifier .env.test :
DB_NAME=julaba_test_db
NODE_ENV=test
DB_LOGGING=false


⚠️  Ne jamais committer le fichier .env
Ajouter impérativement .env à .gitignore :
  echo ".env" >> .gitignore
  echo ".env.test" >> .gitignore
Utiliser .env.example (sans les vraies valeurs) pour documenter les variables.


3.4  Configuration TypeORM (src/database/database.module.ts)
Créer le module de base de données :
📄  src/database/database.module.ts
// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
 
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get<string>('DB_HOST',     'localhost'),
        port:     config.get<number>('DB_PORT',     5432),
        username: config.get<string>('DB_USERNAME', 'julaba_user'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME',     'julaba_db'),
        entities:   [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        synchronize: config.get<string>('NODE_ENV') === 'test', // true uniquement en test
        logging:    config.get<boolean>('DB_LOGGING', false),
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
  ],
})
export class DatabaseModule {}


3.5  Bootstrap (src/main.ts)
📄  src/main.ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
 
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
 
  // Préfixe global
  const prefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(prefix);
 
  // Validation globale des DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,   // Supprime les champs non déclarés
    forbidNonWhitelisted: true,   // Erreur si champ inattendu
    transform:            true,   // Conversion automatique des types
    transformOptions: { enableImplicitConversion: true },
  }));
 
  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  });
 
  // Swagger (désactivé en production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('🌿 JÙLABA API')
      .setDescription('API Backend de la plateforme JÙLABA')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, config)
    );
    logger.log(`Swagger disponible sur : http://localhost:${port}/api/docs`);
  }
 
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Application démarrée sur : http://localhost:${port}/${prefix}`);
}
 
bootstrap();


4. BASE DE DONNÉES POSTGRESQL


4.1  Création de la base et de l'utilisateur
🖥  Connexion PostgreSQL
# Se connecter en tant que superutilisateur PostgreSQL
sudo -u postgres psql


🖥  psql — Création base de données
-- Créer l'utilisateur applicatif
CREATE USER julaba_user WITH PASSWORD 'JulabaSecure2024!';
 
-- Créer la base de données principale
CREATE DATABASE julaba_db
  OWNER julaba_user
  ENCODING 'UTF8'
  LC_COLLATE 'fr_FR.UTF-8'
  LC_CTYPE 'fr_FR.UTF-8'
  TEMPLATE template0;
 
-- Créer la base de données de test
CREATE DATABASE julaba_test_db
  OWNER julaba_user
  ENCODING 'UTF8'
  TEMPLATE template0;
 
-- Accorder les droits
GRANT ALL PRIVILEGES ON DATABASE julaba_db TO julaba_user;
GRANT ALL PRIVILEGES ON DATABASE julaba_test_db TO julaba_user;
 
-- Vérifier
\l
 
-- Quitter
\q


🖥  Test de connexion
# Tester la connexion avec l'utilisateur applicatif
psql -h localhost -U julaba_user -d julaba_db
 
# Si connexion OK, vous verrez : julaba_db=>
# Taper \q pour quitter


4.2  Migrations TypeORM
📄  package.json — Scripts de migration
# Configurer typeorm-cli dans package.json
# Ajouter dans la section "scripts" :
"migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts",
"migration:run":      "typeorm-ts-node-commonjs migration:run      -d src/database/data-source.ts",
"migration:revert":   "typeorm-ts-node-commonjs migration:revert   -d src/database/data-source.ts",
"migration:show":     "typeorm-ts-node-commonjs migration:show     -d src/database/data-source.ts",


📄  src/database/data-source.ts
// src/database/data-source.ts
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
 
dotenv.config();
 
export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'julaba_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'julaba_db',
  entities:   ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});


🖥  Commandes de migration
# Générer une migration à partir des entités
npm run migration:generate -- src/database/migrations/InitialSchema
 
# Appliquer les migrations
npm run migration:run
 
# Vérifier les migrations appliquées
npm run migration:show
 
# Annuler la dernière migration (si erreur)
npm run migration:revert


4.3  Schéma SQL — Tables principales (optionnel : création manuelle)
Si vous préférez créer les tables manuellement avant les migrations :
🖥  psql — Schéma SQL minimal
-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
 
-- ENUM Types
CREATE TYPE user_role AS ENUM
  ('producteur','marchand','identificateur','cooperateur','institution','admin');
CREATE TYPE user_status AS ENUM ('pending','actif','suspendu','rejete');
CREATE TYPE commande_status AS ENUM
  ('en_attente','confirmee','en_livraison','livree','annulee','litige');
CREATE TYPE escrow_status AS ENUM ('bloque','libere','rembourse','expire');
CREATE TYPE tx_type AS ENUM ('credit','debit','escrow_block','escrow_release','escrow_refund');
 
-- TABLE: users
CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone                VARCHAR(20) UNIQUE NOT NULL,
  password_hash        VARCHAR(255),
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  role                 user_role NOT NULL,
  region               VARCHAR(100),
  commune              VARCHAR(100),
  activity             VARCHAR(200),
  market               VARCHAR(200),
  cooperative_name     VARCHAR(200),
  institution_name     VARCHAR(200),
  photo_url            TEXT,
  status               user_status NOT NULL DEFAULT 'pending',
  validated            BOOLEAN NOT NULL DEFAULT FALSE,
  pin_security_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pin_code_hash        VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at        TIMESTAMPTZ
);
 
-- TABLE: wallets
CREATE TABLE wallets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  solde        DECIMAL(15,2) NOT NULL DEFAULT 0,
  solde_bloque DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency     VARCHAR(10) NOT NULL DEFAULT 'XOF',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- TABLE: wallet_transactions
CREATE TABLE wallet_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id),
  type                tx_type NOT NULL,
  montant             DECIMAL(15,2) NOT NULL,
  description         TEXT,
  statut              VARCHAR(50) NOT NULL DEFAULT 'completed',
  related_entity_type VARCHAR(100),
  related_entity_id   UUID,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- TABLE: otp_codes
CREATE TABLE otp_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      VARCHAR(20) NOT NULL,
  code       VARCHAR(10) NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- INDEX pour performances
CREATE INDEX idx_users_phone        ON users(phone);
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_wallets_user_id    ON wallets(user_id);
CREATE INDEX idx_wallet_tx_user_id  ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_type     ON wallet_transactions(type);
CREATE INDEX idx_otp_phone_code     ON otp_codes(phone, code, used);


5. DOCKER COMPOSE — ENVIRONNEMENT COMPLET


Docker Compose permet de lancer tous les services (NestJS + PostgreSQL + Redis) en une seule commande.

5.1  docker-compose.yml
📄  docker-compose.yml
# docker-compose.yml (à la racine du projet)
version: '3.9'
 
services:
 
  # ── PostgreSQL ─────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: julaba_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER:     julaba_user
      POSTGRES_PASSWORD: JulabaSecure2024!
      POSTGRES_DB:       julaba_db
      PGDATA:            /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U julaba_user -d julaba_db"]
      interval: 10s
      timeout: 5s
      retries: 5
 
  # ── Redis ──────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: julaba_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
 
  # ── NestJS API ─────────────────────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: julaba_api
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run start:dev
 
volumes:
  postgres_data:
  redis_data:


5.2  Dockerfile
📄  Dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
 
# ── Développement ──
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
 
# ── Build ──
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build
 
# ── Production ──
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]


5.3  Script d'initialisation PostgreSQL
📄  docker/postgres/init.sql
-- docker/postgres/init.sql
-- Créer la base de test automatiquement
CREATE DATABASE julaba_test_db
  OWNER julaba_user
  ENCODING 'UTF8'
  TEMPLATE template0;
 
GRANT ALL PRIVILEGES ON DATABASE julaba_test_db TO julaba_user;
 
-- Extension UUID
\c julaba_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
 
\c julaba_test_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


6. LANCEMENT & VÉRIFICATION


6.1  Démarrer avec Docker Compose (recommandé)
🖥  Docker Compose — Commandes de base
# Construire les images et démarrer tous les services
docker compose up --build
 
# En arrière-plan (detached mode)
docker compose up --build -d
 
# Voir les logs en temps réel
docker compose logs -f api
 
# Arrêter tous les services
docker compose down
 
# Arrêter et supprimer les volumes (reset complet)
docker compose down -v


6.2  Démarrer sans Docker (développement local)
🖥  Démarrage local
# 1. S'assurer que PostgreSQL est démarré
sudo systemctl start postgresql   # Ubuntu
brew services start postgresql@16  # macOS
 
# 2. Appliquer les migrations
npm run migration:run
 
# 3. Démarrer en mode développement (hot reload)
npm run start:dev
 
# Ou en mode production
npm run build
npm run start:prod


6.3  Points de vérification

1
API opérationnelle
Ouvrir dans un navigateur : http://localhost:3000/api/v1
Réponse attendue : {"statusCode":404,"message":"Cannot GET /api/v1"}
→ Normal ! L'API tourne, il n'y a pas de route racine.


2
Documentation Swagger
Ouvrir : http://localhost:3000/api/docs
Vous devez voir l'interface Swagger avec tous les endpoints documentés.
→ Vérifier que chaque module (Auth, Users, Wallets...) apparaît.


3
Test inscription (premier appel API)
Dans Swagger ou Postman, tester : POST /api/v1/auth/signup
Body : { "phone": "0700000001", "password": "Test1234!", "firstName": "Test",
         "lastName": "Julaba", "role": "producteur", "region": "Abidjan" }
→ Réponse attendue : 201 avec accessToken, refreshToken et user.


4
Vérifier la base de données
psql -h localhost -U julaba_user -d julaba_db
SELECT id, phone, role, status FROM users;
→ Vous devez voir l'utilisateur créé à l'étape 3.


7. EXÉCUTION DES TESTS


7.1  Configuration des tests
📄  jest.config.js
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 }
  },
};


📄  jest-e2e.config.js
// jest-e2e.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  globalSetup: './test/setup.ts',
  globalTeardown: './test/teardown.ts',
};


7.2  Commandes de test
🖥  Commandes npm — Tests
# Tous les tests unitaires
npm test
 
# Tests unitaires en mode watch (pendant le développement)
npm run test:watch
 
# Tests unitaires avec rapport de couverture
npm run test:cov
 
# Un seul fichier de test
npm test -- auth.service.spec.ts
 
# Tests E2E (nécessite la base de test)
npm run test:e2e
 
# Tests E2E d'un module spécifique
npm run test:e2e -- --testPathPattern=auth


ℹ️  Base de données de test
Les tests E2E utilisent la base julaba_test_db.
Chaque suite de tests doit nettoyer les données avec TRUNCATE TABLE ... CASCADE
dans afterAll() pour éviter les collisions entre tests.

Utiliser NODE_ENV=test pour pointer vers julaba_test_db automatiquement.


7.3  Exemple de test unitaire — auth.service.spec.ts
📄  src/auth/auth.service.spec.ts
// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import { User } from '../users/user.entity';
import { OtpCode } from './otp-code.entity';
 
describe('AuthService', () => {
  let service: AuthService;
 
  const mockUserRepo = {
    findOne: jest.fn(),
    create:  jest.fn(),
    save:    jest.fn(),
  };
  const mockOtpRepo = {
    findOne: jest.fn(),
    save:    jest.fn(),
    update:  jest.fn(),
  };
 
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User),    useValue: mockUserRepo },
        { provide: getRepositoryToken(OtpCode), useValue: mockOtpRepo },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: 'WalletService', useValue: { createForUser: jest.fn() } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });
 
  it('signup → 201 si numéro nouveau', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);
    mockUserRepo.create.mockReturnValue({ id: 'u1', phone: '0700' });
    mockUserRepo.save.mockResolvedValue({ id: 'u1', phone: '0700' });
    const r = await service.signup({ phone: '0700', password: 'Abc123!', ... });
    expect(r.accessToken).toBeDefined();
  });
 
  it('signup → 409 si numéro existant', async () => {
    mockUserRepo.findOne.mockResolvedValue({ id: 'exist' });
    await expect(service.signup({ phone: '0700', ... }))
      .rejects.toThrow(ConflictException);
  });
});


7.4  Exemple de test E2E — auth.e2e-spec.ts
📄  test/auth.e2e-spec.ts
// test/auth.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
 
describe('Auth (E2E)', () => {
  let app: INestApplication;
 
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });
 
  afterAll(async () => { await app.close(); });
 
  it('POST /api/v1/auth/signup → 201', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone:'0700000001', password:'Test1234!',
              firstName:'Test', lastName:'User', role:'producteur', region:'Abidjan' })
      .expect(201)
      .expect(res => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.user.passwordHash).toBeUndefined();
      })
  );
 
  it('POST /api/v1/auth/login → 200', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ phone:'0700000001', password:'Test1234!' })
      .expect(200)
      .expect(res => { expect(res.body.refreshToken).toBeDefined(); })
  );
});


8. STRUCTURE COMPLÈTE DU PROJET


📁  Arborescence complète du projet
julaba-backend/
├── src/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts          ← Tests unitaires
│   │   ├── entities/
│   │   │   └── otp-code.entity.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── dto/
│   │       ├── signup.dto.ts
│   │       ├── login.dto.ts
│   │       ├── send-otp.dto.ts
│   │       └── verify-otp.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.service.spec.ts
│   │   ├── entities/user.entity.ts
│   │   └── dto/
│   │
│   ├── wallets/
│   │   ├── wallets.module.ts
│   │   ├── wallets.controller.ts
│   │   ├── wallets.service.ts
│   │   ├── wallets.service.spec.ts
│   │   └── entities/
│   │       ├── wallet.entity.ts
│   │       └── wallet-transaction.entity.ts
│   │
│   ├── escrow/
│   │   ├── escrow.module.ts
│   │   ├── escrow.controller.ts
│   │   ├── escrow.service.ts
│   │   ├── escrow.service.spec.ts
│   │   └── entities/wallet-escrow.entity.ts
│   │
│   ├── producteur/
│   │   ├── cycles/
│   │   │   ├── cycles.module.ts
│   │   │   ├── cycles.controller.ts
│   │   │   ├── cycles.service.ts
│   │   │   ├── cycles.service.spec.ts
│   │   │   └── entities/cycle.entity.ts
│   │   ├── recoltes/
│   │   │   └── ... (même structure)
│   │   └── publications/
│   │       └── ... (même structure)
│   │
│   ├── marchand/
│   │   ├── caisse/  ── stocks/  ── commandes/
│   │
│   ├── identificateur/
│   │   ├── identifications/  ── commissions/  ── missions/
│   │
│   ├── cooperative/
│   ├── notifications/
│   ├── tickets/
│   ├── scoring/
│   ├── academy/
│   ├── audit/
│   ├── zones/
│   ├── backoffice/
│   ├── analytics/
│   ├── institutions/
│   ├── documents/
│   │
│   ├── common/
│   │   ├── filters/http-exception.filter.ts
│   │   ├── interceptors/audit-log.interceptor.ts
│   │   ├── interceptors/transform.interceptor.ts
│   │   └── pipes/parse-uuid.pipe.ts
│   │
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── data-source.ts
│   │   └── migrations/
│   │       ├── 001-InitialSchema.ts
│   │       ├── 002-AddWallets.ts
│   │       └── ...
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── auth.e2e-spec.ts
│   ├── wallets.e2e-spec.ts
│   ├── commandes.e2e-spec.ts
│   ├── setup.ts
│   └── teardown.ts
│
├── docker/
│   └── postgres/
│       └── init.sql
├── uploads/                          ← Fichiers uploadés en local
├── .env
├── .env.example
├── .env.test
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── jest.config.js
├── jest-e2e.config.js
├── package.json
├── tsconfig.json
└── README.md


9. VARIABLES D'ENVIRONNEMENT — RÉFÉRENCE COMPLÈTE


Variable
Type
Défaut
Description
NODE_ENV
string
development
Environnement : development | production | test
PORT
number
3000
Port d'écoute de l'API
API_PREFIX
string
api/v1
Préfixe de toutes les routes
CORS_ORIGIN
string
*
Origines autorisées pour CORS
DB_HOST
string
localhost
Hôte PostgreSQL
DB_PORT
number
5432
Port PostgreSQL
DB_USERNAME
string
julaba_user
Utilisateur PostgreSQL
DB_PASSWORD
string
—
Mot de passe PostgreSQL
DB_NAME
string
julaba_db
Nom de la base de données
DB_LOGGING
boolean
false
Activer les logs SQL TypeORM
JWT_SECRET
string
—
Secret du token d'accès (min 32 chars)
JWT_EXPIRES_IN
string
15m
Durée de vie du token d'accès
JWT_REFRESH_SECRET
string
—
Secret du refresh token (min 32 chars)
JWT_REFRESH_EXPIRES_IN
string
7d
Durée de vie du refresh token
OTP_EXPIRY_MINUTES
number
5
Durée de validité d'un OTP en minutes
OTP_LENGTH
number
6
Nombre de chiffres du code OTP
SMS_PROVIDER
string
orange
Fournisseur SMS : orange | wave | mtn
SMS_API_KEY
string
—
Clé API du fournisseur SMS
UPLOAD_PROVIDER
string
local
Stockage : local | s3 | minio
UPLOAD_MAX_SIZE_MB
number
10
Taille max des fichiers uploadés
STORAGE_BUCKET
string
—
Nom du bucket S3/MinIO
STORAGE_ACCESS_KEY
string
—
Clé d'accès S3/MinIO
STORAGE_SECRET_KEY
string
—
Clé secrète S3/MinIO
REDIS_HOST
string
localhost
Hôte Redis (optionnel)
REDIS_PORT
number
6379
Port Redis (optionnel)
THROTTLE_TTL
number
60000
Fenêtre de rate limiting (ms)
THROTTLE_LIMIT
number
100
Max requêtes par fenêtre


10. COMMANDES UTILES AU QUOTIDIEN


Commande
Description
npm run start:dev
Démarrer en mode développement (hot reload)
npm run start:debug
Démarrer en mode debug (port 9229)
npm run build
Compiler TypeScript vers JavaScript
npm run start:prod
Démarrer le build de production
npm test
Lancer les tests unitaires
npm run test:watch
Tests unitaires en mode watch
npm run test:cov
Tests unitaires + rapport de couverture
npm run test:e2e
Lancer les tests E2E
npm run lint
Analyser le code avec ESLint
npm run format
Formater le code avec Prettier
npm run migration:generate -- src/database/migrations/NomMigration
Générer une migration
npm run migration:run
Appliquer toutes les migrations en attente
npm run migration:revert
Annuler la dernière migration
npm run migration:show
Lister l'état de toutes les migrations
docker compose up -d
Démarrer tous les services en arrière-plan
docker compose down
Arrêter tous les services
docker compose logs -f api
Voir les logs de l'API en temps réel
docker compose exec api sh
Ouvrir un shell dans le conteneur API
docker compose exec postgres psql -U julaba_user julaba_db
Connexion directe à PostgreSQL


11. DÉPANNAGE (TROUBLESHOOTING)


Problèmes courants et solutions

❌ Erreur : ECONNREFUSED 127.0.0.1:5432  PostgreSQL n'est pas démarré ou n'accepte pas les connexions.
→ Ubuntu  : sudo systemctl start postgresql
→ macOS   : brew services start postgresql@16
→ Docker  : docker compose up postgres
→ Vérifier : sudo systemctl status postgresql


❌ Erreur : password authentication failed for user "julaba_user"  Le mot de passe dans .env ne correspond pas à celui de PostgreSQL.
→ Se connecter en superutilisateur : sudo -u postgres psql
→ Changer le mot de passe : ALTER USER julaba_user WITH PASSWORD 'nouveau_mdp';
→ Mettre à jour DB_PASSWORD dans .env


❌ Erreur : Cannot find module '@nestjs/...'  Les dépendances ne sont pas installées ou node_modules est corrompu.
→ Supprimer node_modules et package-lock.json
→ rm -rf node_modules package-lock.json
→ Réinstaller : npm install


❌ Erreur : QueryFailedError: relation "..." does not exist  Les migrations n'ont pas été appliquées.
→ npm run migration:run
→ Si la migration échoue, vérifier la connexion DB et les variables .env
→ npm run migration:show  (pour voir l'état des migrations)


❌ Erreur : Port 3000 already in use  Un autre processus utilise déjà le port 3000.
→ Trouver le processus : lsof -i :3000  (macOS/Linux)
→ Terminer le processus : kill -9 <PID>
→ Ou changer le port dans .env : PORT=3001


❌ Tests E2E échouent avec "database does not exist"  La base julaba_test_db n'existe pas.
→ sudo -u postgres psql
→ CREATE DATABASE julaba_test_db OWNER julaba_user;
→ GRANT ALL PRIVILEGES ON DATABASE julaba_test_db TO julaba_user;
→ Vérifier que .env.test pointe vers DB_NAME=julaba_test_db


❌ Docker : permission denied while trying to connect to the Docker daemon  L'utilisateur courant n'est pas dans le groupe docker.
→ sudo usermod -aG docker $USER
→ Fermer et rouvrir le terminal (ou : newgrp docker)
→ Vérifier : docker ps


Vérifications rapides
🖥  Checklist de vérification
# Vérifier que tout est opérationnel
node --version          # ≥ 18.x
npm --version           # ≥ 9.x
psql --version          # ≥ 16.x
docker --version        # ≥ 24.x
docker compose version  # ≥ 2.x
nest --version          # ≥ 10.x
 
# Vérifier la connexion PostgreSQL
psql -h localhost -U julaba_user -d julaba_db -c "SELECT version();"
 
# Vérifier que l'API répond
curl http://localhost:3000/api/v1/health
 
# Vérifier les logs Docker
docker compose logs --tail=50 api


Guide d'installation Jùlaba Backend · Version 1.0 · 11/03/2026
