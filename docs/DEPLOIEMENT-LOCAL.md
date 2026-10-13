# Déploiement local — BD Docker + backend hôte + frontend Vite

> But : faire tourner Jùlaba **en local** sur une base PostgreSQL neuve dans
> Docker, avec les comptes de démo, sans jamais toucher à la base Azure.
> Variante « tout sur l'hôte » du stack `docker-compose.yml`. Complément de
> `DEPLOIEMENT-PM2.md` (serveur) et `DEPLOIEMENT_RENDER.md` (prod).

## 0. Architecture visée

```
Navigateur ──:3000── Vite (frontend, proxy /api)
                          └── /api/*  →  http://localhost:3001
                                              │
                                    backend NestJS (hôte, :3001)
                                              │
                                    127.0.0.1:5433
                                              │
                          container julaba_postgres (postgres:16-alpine)
```

- Le frontend n'appelle que `/api/v1` (relatif) ; c'est **Vite qui proxifie**
  vers `localhost:3001` (`frontend/vite.config.ts`).
- Le backend hôte lit les variables d'environnement passées en ligne de
  commande : **elles priment** sur `backend/.env` (dotenv ne remplace pas une
  variable déjà définie). C'est ce qui évite de pointer sur Azure.

## 1. Prérequis

```bash
docker --version          # Docker + compose plugin
node -v                   # Node 20+ (NestJS 11)
npm -v
```

## 2. Base Docker (`julaba_postgres`)

Le service `postgres` de `docker-compose.yml` expose l'hôte sur **5433**
(pour ne pas heurter un PostgreSQL local sur 5432) :

```bash
docker compose up -d postgres
docker compose ps postgres        # → healthy
```

Vérifier à la main (optionnel) :

```bash
docker exec julaba_postgres pg_isready -U julaba -d julaba_dev
```

> **Piège port 5433 déjà pris.** Si un autre projet occupe 5433, l'arrêter
> (`docker stop <conteneur>`) plutôt que de bricoler un override — l'hôte et
> le `.env.production` sont alignés sur 5433.

## 3. Environnement backend

Le compose exige `backend/.env.production` (via `env_file`), même si le
backend tourne hors Docker. On part du modèle tracké :

```bash
cp backend/.env.production.example backend/.env.production
chmod 600 backend/.env.production
```

Ne pas modifier `backend/.env` (il pointe volontairement sur la base **Azure**
de dev). Pour le local, on **écrase à la volée** (voir §4).

## 4. Lancer le backend sur l'hôte — port 3001

Port **3001** = cible du proxy Vite. Rappel des valeurs locales : base
`127.0.0.1:5433`, `julaba / julaba / julaba_dev`, pas de TLS.

```bash
cd backend
DB_HOST=127.0.0.1 \
DB_PORT=5433 \
DB_USERNAME=julaba \
DB_PASSWORD=julaba \
DB_NAME=julaba_dev \
DB_SSL=false \
NODE_ENV=development \
PORT=3001 \
SEED_DEMO=true \
SEED_DEMO_PASSWORD=<mot de passe des comptes acteurs> \
SEED_DEMO_BO_PASSWORD=<mot de passe des comptes back-office> \
THROTTLE_DISABLED=true \
npm run start:dev
```

Au premier boot sur base vierge, `prepareDatabase` (`backend/src/main.ts`)
**construit tout le schéma**, puis les seeds s'appliquent :

```
[DB] Base vierge -> construction automatique du schéma.
```

> `backend/scripts/run-seeds.ts` seul **ne crée pas le schéma** : c'est le boot
> du backend qui fait les deux (schéma + seeds). Toujours passer par le boot.

## 5. Lancer le frontend (Vite, port 3000)

```bash
cd frontend
npm run dev        # → http://localhost:3000
```

Le proxy `/api` → `localhost:3001` est déjà configuré. Aucun réglage à faire.

## 6. Comptes de démo

Les comptes sont créés par `SeedDemoService`
(`backend/src/database/seed-demo.service.ts`, constante `COMPTES`) :

| Rôle | Téléphones | Mot de passe |
|---|---|---|
| Marchand | `+2250700000009` (**avec données**), `+2250700000010`, `+2250700000011` | `SEED_DEMO_PASSWORD` |
| Marchand sous-profils | `+2250726262626` (grossiste), `+2250725252525` (demi-grossiste), `+2250790909090` (détaillant) | `SEED_DEMO_PASSWORD` |
| Producteur | `+2250700000012`, `+2250960606060` | `SEED_DEMO_PASSWORD` |
| Coopérateur | `+2250700000013`, `+2250970707070` | `SEED_DEMO_PASSWORD` |
| Identificateur | `+2250700000014`, `+2250710101010` | `SEED_DEMO_PASSWORD` |
| Institution | `+2250700000015` | `SEED_DEMO_PASSWORD` |
| Back-office (`ADMIN_GENERAL`) | `+2250700000016`, `+2250700000017` (`dge-test@julaba.ci`) | `SEED_DEMO_BO_PASSWORD` |

- Sans `SEED_DEMO_BO_PASSWORD`, les comptes **back-office ne sont pas créés**.
- En `NODE_ENV=production`, les seeds sont **HARD-OFF** sauf `SEED_DEMO=true`.
- Un compte peut être **en attente de validation** : la connexion répond alors
  `401` « Compte en attente de validation par un super administrateur ».

## 7. Vérifications (par le proxy, donc l'URL réelle du front)

```bash
curl -s http://localhost:3000/api/v1/health                     # 200
curl -s -X POST http://localhost:3000/api/v1/auth/check-phone \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2250700000009"}'                               # {"exists":true}
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2250700000009","password":"<SEED_DEMO_PASSWORD>"}'
```

> **Limite de connexion = 5/min** (throttle statique sur `POST /auth/login`,
> `backend/src/auth/auth.controller.ts`). `THROTTLE_DISABLED=true` ne lève
> **pas** cette route — compter les essais.

## 8. Arrêter / réinitialiser

```bash
docker compose stop postgres                 # garde les données (volume)
docker compose down                          # supprime le conteneur, garde le volume
docker compose down -v                       # SUPPRIME aussi le volume → base neuve
```

Couper le backend (Ctrl-C) et Vite avant de relancer une base neuve.

## 9. Pièges

1. **Un seul port pour le front.** Le proxy Vite vise `3001` : un backend
   lancé sur `3100` renvoie des réponses vides → erreurs `Unexpected end of
   JSON` côté écran de connexion. Vérifier le port du backend.
2. **Ne pas cumuler** backend hôte (`:3001`) et backend Docker (`:3001`) :
   même port, un seul à la fois.
3. **Ne pas laisser la variable `DB_HOST` retomber sur Azure** : toujours
   passer les `DB_*` locales (elles priment sur `backend/.env`).
4. **Aucun identifiant dans le dépôt** (ALERTE-SEC-01) : les mots de passe
   passent par `SEED_DEMO_PASSWORD` / `SEED_DEMO_BO_PASSWORD`, jamais écrits.
5. Les erreurs `ws://localhost:3000` (HMR) au démarrage sont **sans rapport**
   avec l'API.

## Références

- `docker-compose.yml` — service `postgres` (5433) + healthcheck.
- `backend/src/main.ts` — `prepareDatabase`, ordre de boot, secrets fail-fast.
- `backend/src/database/seed-demo.service.ts` — comptes et gardes `SEED_DEMO`.
- `frontend/vite.config.ts` — port 3000, proxy `/api` → `3001`.
- `docs/DEPLOIEMENT-PM2.md` — même BD Docker, backend PM2 sur un serveur.
