# Déploiement Jùlaba avec PM2 (variante hôte, sans Docker pour le backend)

> Infra cible réelle : VPS nginx — domaine **`julaba-dev.ansut.ci`** (443 ssl),
> backend PM2 joignable sur **`127.0.0.1:3004`**, frontend statique sur
> **`127.0.0.1:8080`**. Complément de `DEPLOIEMENT_RENDER.md` (variante Render)
> et du stack Docker (`docker-compose.yml`, `DEPLOIEMENT` prod OVH).

## 0. Architecture visée

```
Internet ──443 ssl── nginx hôte (julaba-dev.ansut.ci)
                        ├── /api/  + /socket.io/  → 127.0.0.1:3004 (PM2 julaba-backend)
                        └── / + assets statiques  → 127.0.0.1:8080 (PM2 julaba-frontend)
                                                      └── sert frontend/dist (SPA)
BD : PostgreSQL 16 — soit container docker compose (127.0.0.1:5433),
     soit service système (127.0.0.1:5432).
```

Pourquoi PM2 pour le backend : gestion du cycle de vie (reboot, crash, logs,
reload sans downtime) — le frontend reste un simple serveur de fichiers.

## 1. Prérequis

```bash
sudo apt update && sudo apt install -y nginx git
# Node 20+ (NestJS 11 l'exige) — nvm ou nodesource
node -v
sudo npm install -g pm2
```

## 2. Récupérer le code

```bash
sudo mkdir -p /var/www/julaba && sudo chown $USER /var/www/julaba
git clone -b dev https://github.com/SOMET1010/julaba-app.git /var/www/julaba
cd /var/www/julaba
```

## 3. Base de données (PostgreSQL 16)

**Option A (recommandée — réutilise la stack du repo) :** uniquement le service
postgres du compose, le backend tourne sur l'hôte avec PM2 :

```bash
docker compose up -d postgres
# → joignable depuis l'hôte sur 127.0.0.1:5433 (julaba / julaba / julaba_dev)
```

**Option B :** PostgreSQL 16 système sur 5432 — créer user/db
`julaba` / `julaba_dev` puis adapter `DB_PORT=5432` au §4.

## 4. Environnement backend — adaptations PM2

⚠️ **Piège** : dans la stack Docker, `DB_HOST=postgres` est le nom du service.
Hors Docker (PM2), c'est une adresse locale. Adapter le modèle :

```bash
cp backend/.env.production.example backend/.env.production
chmod 600 backend/.env.production
```

Lignes à ajuster dans `backend/.env.production` :

```ini
# SERVEUR — écoute directe sur l'hôte (le compose mappait 3001:3000)
PORT=3004                       # ← port attendu par nginx (julaba-dev.ansut.ci)
CORS_ORIGIN=https://julaba-dev.ansut.ci

# BASE DE DONNÉES — option A (postgres du compose exposé sur l'hôte)
DB_HOST=127.0.0.1               # PAS "postgres" hors réseau Docker
DB_PORT=5433

# AUTH — secrets obligatoires (fail-fast au boot, process.exit 1 sinon)
JWT_SECRET=<openssl rand -hex 32>
REFRESH_TOKEN_SALT=<openssl rand -hex 32>
PIN_ENCRYPTION_KEY=<openssl rand -hex 32>

# WEBAUTHN — le domaine réel
WEBAUTHN_RP_ID=julaba-dev.ansut.ci
WEBAUTHN_ORIGIN=https://julaba-dev.ansut.ci

# DEMO — jamais en prod
SEED_DEMO=false
```

`TRUST_PROXY=true` et `COOKIE_SAMESITE=none` du modèle restent tels quels
(nginx hôte en face, cookies cross-site derrière 443).

## 5. Build

```bash
cd /var/www/julaba
npm install                              # workspaces root (frontend + backend)
npm run build --workspace backend        # → backend/dist/main.js
npm run build --workspace frontend       # → frontend/dist/
```

## 6. Démarrer les deux process PM2

**Backend** (config commitée `ecosystem.config.cjs` — charge
`backend/.env.production` via dotenv, fork obligatoire) :

```bash
pm2 start ecosystem.config.cjs
curl http://127.0.0.1:3004/api/v1/health   # → 200 (même check que le compose)
```

**Frontend statique** (sert `frontend/dist`, fallback SPA vers index.html) :

```bash
pm2 serve frontend/dist 8080 --spa --name julaba-frontend
curl -I http://127.0.0.1:8080              # → 200 + index.html
```

**Persistance au reboot :**

```bash
pm2 save
pm2 startup          # copier-coller la commande sudo affichée
```

## 7. Nginx hôte (état attendu — sites-available/julaba-dev.ansut.ci)

La conf existante du serveur correspond déjà à cette architecture :

```nginx
server {
    listen 80;
    server_name julaba-dev.ansut.ci;
    root /var/www/html;                 # ACME / certbot
    # ... redirection vers https
}

server {
    listen 443 ssl;
    server_name julaba-dev.ansut.ci;
    # certificats ...

    location /api/ {
        proxy_pass http://127.0.0.1:3004;          # PM2 julaba-backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3004/socket.io/;   # WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    location / {                 # + assets : statique PM2 (SPA)
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
}
```

Vérifier puis recharger :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 8. Migrations

`prepareDatabase` (au boot du backend) construit le schéma tout seul sur base
vierge ; sur base existante il respecte `DB_MIGRATIONS_RUN`. Pour les
appliquer explicitement (même geste que `deploy.yml`) :

```bash
cd /var/www/julaba/backend
set -a; source .env.production; set +a
node ../node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
node ../node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js
```

## 9. Mise à jour (redéploiement)

```bash
cd /var/www/julaba
git pull origin dev
npm install
npm run build --workspace backend && npm run build --workspace frontend
pm2 reload julaba-backend --update-env   # reload = zéro downtime (fork)
pm2 save
```

Après modification de `backend/.env.production` :
`pm2 restart julaba-backend --update-env`.

## 10. Exploitation

```bash
pm2 status
pm2 logs julaba-backend --lines 100
pm2 logs julaba-frontend
pm2 monit
```

## 11. Pièges spécifiques à ce repo

1. **Fork, jamais cluster** : le cron B-PAY de réconciliation des retraits
   (`bpay.cron.ts`, audit C-01), les webhooks et socket.io supposent un
   process unique — `instances: 1` / `exec_mode: 'fork'` est dans
   `ecosystem.config.cjs`, ne pas l'assouplir.
2. **Précédence des variables** : `ecosystem.config.cjs` charge
   `backend/.env.production` via dotenv ; les vraies variables d'env priment
   sur le `.env` lu par `ConfigModule`. C'est le même comportement que
   `env_file` du compose — un seul endroit de vérité : `.env.production`.
3. **Secrets fail-fast** : `JWT_SECRET`, `REFRESH_TOKEN_SALT`,
   `PIN_ENCRYPTION_KEY` — le backend refuse de booter sans eux (voir
   `verifierSecretsProduction` dans `backend/src/main.ts`). Le message
   apparaît dans `pm2 logs julaba-backend`.
4. **`.env.production` jamais commité** (gitignore). Le modèle tracké est
   `backend/.env.production.example`.
5. **Ne pas cumuler les modes** : backend Docker (compose, port 3001) **ou**
   backend PM2 (port 3004) — jamais les deux en même temps sur le même VPS,
   la BD partagée si le compose postgres reste monté.
6. **SEED_DEMO=false** en prod — les comptes de démonstration et leurs
   dotations n'existent qu'en dev.
