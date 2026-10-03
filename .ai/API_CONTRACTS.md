# API_CONTRACTS.md — Synthèse des endpoints JULABA

> Miroir du code backend. Toute modification d'endpoint DOIT être répercutée ici par l'agent Backend puis validée par l'agent Frontend.

## Vue d'ensemble

- **Préfixe global** : `/api/v1`
- **Total endpoints** : **361** (toutes méthodes confondues)
- **Auth-required** : 339 (JWT classe, API-KEY, ODOO_POC, INSTITUTION_SCOPE ou rôle)
- **Public** : 22
- **WebSocket** : `/ws` (Gateway `EventsGateway`, auth JWT via cookie ou `auth.token`)

## Authentification — 5 voies parallèles

| Voie | Mécanisme | Bibliothèque | Routes |
|---|---|---|---|
| JWT | Cookie `bo_access_token`/`access_token` OU header `Authorization: Bearer` | `passport-jwt` + `@nestjs/jwt` | 339 routes |
| Refresh token rotatif | `crypto.randomBytes(64)` brut, HMAC-SHA256 salé stocké, détection réutilisation -> revokeAll | `auth.service` | `/auth/refresh`, `/auth/logout`, `/auth/logout-all` |
| PIN acteur (AES-256-GCM) | `PinCryptoService` (v2:iv:tag:ct, fallback legacy CBC), verrouillage progressif | `verrou-pin.ts` | `/auth/activer`, `/auth/identificateur/:id/renvoyer-pin` |
| WebAuthn | `@simplewebauthn/server` (passkeys) | — | `/auth/webauthn/{register,authenticate}/{options,verify}` |
| API Key partenaires | Header `x-api-key`, table `api_keys` (ATTENTION : **en clair** — dette) | `ApiKeyGuard` | `/partner/*` |

## Routes publiques (22)

```
GET  /health                              # Render healthcheck (@SkipThrottle)
GET  /health/net                          # Calibration TRUST_PROXY
POST /auth/login                          # Throttle 5/min
POST /auth/signup                         # Throttle 3/min, SELF_SIGNUP_ROLES only
POST /auth/activer                        # Throttle 20/min, activation P0.0 (ADR-002)
POST /auth/refresh                        # Rotation refresh token
POST /auth/logout
POST /auth/logout-all
POST /auth/check-phone                    # Throttle 10/min
POST /auth/contacts-recovery-bo           # Throttle 5/min
POST /auth/webauthn/authenticate/options
POST /auth/webauthn/authenticate/verify
GET  /admin-divisions/districts
GET  /admin-divisions/regions
GET  /admin-divisions/departements
GET  /admin-divisions/communes
GET  /admin-divisions/reverse-geocode
GET  /marches                             # Liste publique marchés
GET  /marches/suggestion
POST /bpay/callback                       # Webhook BPay (secret optionnel ATTENTION)
GET  /wallets/public/qr/:identifier
POST /wallets/public/transfert            # Callback QR paiement
GET  /wallets/public/solde/:identifier
```

## Routes par module (top 30)

| Préfixe | # | Auth typique | Notes |
|---|---|---|---|
| `/auth/*` | 30 | mixte | 30 routes, 5 voies auth |
| `/users/*` + `/users/flags/*` | 26 | JWT + `@Roles` | Sanitization `stripSensitiveUserFields` |
| `/wallets/*` | 12 | JWT (sauf 4 publiques) | Verrous pessimistes, plafond 10M XOF |
| `/caisse/*` | 14 | JWT | Vente, dépense, session, crédits, raccourcis, objectifs |
| `/catalogue/*` | 2 | JWT | ATTENTION 2e classe dans `caisse-rest.controller.ts` |
| `/stocks/*` | 6 | JWT | Décrément atomique (ADR-0001) |
| `/commandes/*` | 9 | JWT | Négociation, paiement, livraison |
| `/publications/*` | 8 | JWT | |
| `/recoltes/*` | 9 | JWT | ATTENTION **2 contrôleurs dupliqués** |
| `/cycles/*` | 11 | JWT | ATTENTION **2 contrôleurs dupliqués** |
| `/cooperatives/*` | 28 | JWT + RolesGuard | 953 LOC controller |
| `/tontines/*` | 4 | JWT | |
| `/fidelite/*` | 7 | JWT | Idempotence `fidelite_evenements` |
| `/transactions/*` | 6 | JWT + RolesGuard | Admin geo/export |
| `/marches/*` | 6 | mixte | 2 publiques + 4 JWT |
| `/zones/*` | 7 | JWT + RolesGuard | |
| `/admin/*` | 28 | JWT + `@Roles('ADMIN')` | 5 rôles `admin_*` |
| `/admin/wallets/*` | 17 | JWT | Bloquer/débloquer/crédit/débit |
| `/admin/voice-config/*` | 3 | JWT + `@Roles('ADMIN')` | |
| `/institution/*` | 3 | JWT + **InstitutionScopeGuard** (fail-closed) | |
| `/institutions/*` | 5 | JWT + `@Roles('institution','ADMIN')` | |
| `/identifications/*` | 10 | JWT | Draft + create-with-acteur |
| `/dossiers/*` | 4 | JWT + `@Roles` | identificateur/admin_general/super_admin |
| `/mutations/*` | 3 | JWT | |
| `/missions/*` | 5 | JWT + `@Roles` | |
| `/notifications/*` | 14 | JWT + rôles variables | |
| `/tickets/*` | 8 | JWT + `ROLES_BO` | Staff support |
| `/audit/*` | 3 | JWT + `@Roles('ADMIN')` | |
| `/academy/*` | 12 | JWT | Admin `ROLES_ACADEMY_ADMIN` |
| `/scores/*` + `/financial-score/:userId` | 3 | JWT | Self-access vérifié |
| `/evaluations/*` | 3 | JWT | |
| `/protection-sociale/*` | 2 | JWT | |
| `/producteur/stats` + `/producteurs/recoltes-prevues` | 2 | JWT | |
| `/acteurs/*` | 3 | JWT + `@Roles('super_admin','admin_general')` | |
| `/oneci/*` | 2 | JWT | Vérif NNI |
| `/bpay/callback` + `/bpay/pending/:userId` | 2 | PUBLIC webhook + JWT | |
| `/boutique/*` | 2 | JWT | Sync offline |
| `/revenus/*` | 1 | JWT | |
| `/odoo-poc/*` | 5 | JWT + **OdooPocEnabledGuard** | Désactivé par défaut |
| `/catalogue-maitre/*` | 5 | JWT (synchro `ADMIN`) | Miroir Postgres Odoo |
| `/partner/*` | 4 | `ApiKeyGuard` ou JWT+admin | `api_keys` en clair ATTENTION |
| `/health` + `/health/net` | 2 | PUBLIC + `@SkipThrottle` | |
| `/` (misc) | 14 | JWT classe | Supervision, cron, communication, support, dashboard |

## Rate limiting

- **Global** : `@nestjs/throttler` 1 throttler `default` **300 req/min/IP/endpoint**
- **Ciblé serré** :
  - `auth/login` : 5/min
  - `auth/signup` : 3/min
  - `auth/check-phone` : 10/min
  - `auth/contacts-recovery-bo` : 5/min
  - `auth/activer` : 20/min
  - `auth/identificateur/:id/renvoyer-pin` : 3/10min

ATTENTION : Sans `TRUST_PROXY` activé en prod, le throttling se fait par IP du pair TCP (routeur Render partagé).

## CORS

Origines autorisées dans `main.ts` : `CORS_ORIGIN`, `julaba-web.onrender.com`, `julaba.online`, `https://localhost`, `capacitor://localhost`.

## Hardening HTTP

- `helmet` avec CSP restrictive (`scriptSrc 'self'` only)
- `cookie-parser` + cookies `httpOnly` + `Secure` + `SameSite` (prod: `None`+`Secure` cross-domain)
- ValidationPipe global `whitelist: true`
- `ClassSerializerInterceptor` global (active `@Exclude`)

## WebSocket `/ws`

- `EventsGateway` sur `/ws`
- Auth à la connexion : cookie OU `auth.token` OU `Authorization` header — **via `jwtService.verify` direct** (ATTENTION pas via `JwtStrategy`, donc pas de contrôle `mustChangePassword` ni `status SUSPENDU`)
- Push notifications temps réel (notifications, alertes, events)

## Contrats à valider (PROCHAINES FEATURES)

Toute nouvelle feature doit :
1. Définir ses endpoints ici avant implémentation
2. Spécifier DTO request/response (TypeScript + Swagger)
3. Définir codes d'erreur attendus (400, 401, 403, 404, 409, 422, 429, 500)
4. Définir throttling spécifique si sensible
5. Définir idempotence si mutation financière (`Idempotency-Key` header)
6. Valider par Security avant branchement Frontend

## Référence rapide — OpenAPI

- Swagger UI : `/api` (désactivé en prod via `NODE_ENV !== 'production'`)
- Spec OpenAPI : générée par `@nestjs/swagger` 11.4.6
- ATTENTION : js-yaml 5.0.0-5.2.1 vulnérable DoS (CVE) — à patcher
