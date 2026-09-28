# SECURITY_AUDIT.md — Synthèse audit sécurité JULABA

> Source de vérité sécurité. Lue par Agent Security et Agent Audit Global.
> Détails dans `SEC_BUGS.md`.

## Score sécurité : **72 / 100**

## État au {TODAY}

- **Total vulnérabilités** : 24 (14 prod + 10 dev)
- **CRITIQUES (P0)** : 0 ✅
- **HAUTES (P1)** : 23 (14 prod + 9 dev)
- **MOYENNES (P2)** : 15 (5 prod + 10 dev)
- **BASSES (P3)** : 5 (prod)
- **Résolues** : 0

## Forces sécurité (top 10)

1. **JWT + Refresh token rotation avec détection de réutilisation** — un refresh-token rejoué = compromission → révocation toutes les sessions
2. **Limite 5 sessions/user** (FIFO)
3. **Verrou PIN modernisé** : échelle d'attente (3→5min, 6→15min, 9+→1h, jamais définitif)
4. **`ClassSerializerInterceptor` + `stripSensitiveUserFields`** (défense en profondeur sur `passwordHash`, `pinCodeHash`, `pinCodeEncryptedIdentificateur`, `webauthnCredentials`, `webauthnChallenge`)
5. **`PinCryptoService` AES-256-GCM** (v2:iv:tag:ct, fallback legacy CBC pour migration)
6. **Allow-list rôles fail-closed** (`super_admin` jamais créable par signup générique)
7. **`ThrottlerGuard` global + `@Throttle` ciblé** (login 3/min, signup 3/min, recovery 5/min, voice 3/10min)
8. **WebAuthn / passkeys** (`@simplewebauthn/server` 13.3.0)
9. **Audit logs en DB** (`audit_logs` : userId, action, entite, entite_id, ip, details)
10. **Dumps DB chiffrés AES-256-CBC** (openssl pbkdf2) si `BACKUP_PASSPHRASE`

## Faiblesses sécurité (top 10)

1. **14 vulnérabilités npm prod non patchées** (multer DoS × 4, js-yaml, picomatch, qs, tmp, react-router)
2. **API keys partenaires stockées EN CLAIR en DB** (table `api_keys`, colonne `key`)
3. **Mots de passe par défaut constants** `0000` (acteur) et `123456` (BO) en code
4. **`SEED_DEMO=false` n'efface pas les comptes déjà créés** (comptes admin persistent)
5. **`trust proxy` désactivé par défaut** (rate-limiter partagé Render)
6. **`minifyEnabled false` sur APK release** (pas d'obfuscation R8)
7. **Body parser limit `10mb`** (potentiel DoS mémoire)
8. **AAR sherpa-onnx non audité** (pas de Trivy/SCA)
9. **Pas de CSRF protection** (acceptable JWT + SameSite=None;Secure mais à documenter)
10. **Webhook BPay `/bpay/callback` PUBLIC** sans secret obligatoire

## Authentification — 5 voies parallèles

### JWT (principal)
- Bibliothèque : `passport-jwt` + `@nestjs/jwt` 11.0.0
- Extraction : cookie `bo_access_token`/`access_token` OU header `Authorization: Bearer`
- Validation : user existe + non suspendu + non en attente activation
- `mustChangePassword=true` : seules routes `auth/change-password|logout|logout-all|me` et `users/me` autorisées
- Appliqué à 47/54 contrôleurs

### Refresh token rotatif
- `crypto.randomBytes(64)` brut retourné au client
- Stocké HMAC-SHA256 salé (`REFRESH_TOKEN_SALT`)
- Détection de réutilisation → `revokeAllUserTokens`
- Limite 5 sessions/user (FIFO)
- TTL 7 jours configurable (`JWT_REFRESH_DAYS`)
- Mutex de refresh unique côté frontend (prévient révocation serveur)

### PIN acteur (AES-256-GCM)
- `PinCryptoService` (v2:iv:tag:ct, fallback legacy AES-256-CBC v1 pour migration)
- Clé `PIN_ENCRYPTION_KEY` (32 octets hex recommandés, sinon dérivée SHA-256)
- IV 12 octets aléatoires, tag d'authentification
- Verrouillage progressif (`verrou-pin.ts`) : 3/6/9 échecs → 5min/15min/1h, jamais définitif
- Compteurs séparés `failedPinAttempts`/`failedIdentificateurPinAttempts` (empêche contournement par re-login)
- PIN jamais lisible (SEC-05 fermé), jamais choisi par un admin (SEC-08 fermé), jamais journalisé (SEC-05 fermé)

### WebAuthn
- Bibliothèque : `@simplewebauthn/server` 13.3.0
- Routes : `/auth/webauthn/register/{options,verify}` + `/auth/webauthn/authenticate/{options,verify}`
- Stocké en `jsonb` sur `users.webauthnCredentials` (décoré `@Exclude`)
- `rpID`/`expectedOrigin` via env (`WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`)
- `loginById` (login sans mot de passe après WebAuthn)

### API Key partenaires
- Bibliothèque : `ApiKeyGuard` (header `x-api-key`)
- Table `api_keys` SQL brute (pas d'entité TypeORM)
- ⚠️ **Stockée en clair** (SEC-011 OUVERT) — à hasher comme refresh tokens
- `usage_count` et `last_used_at` mis à jour à chaque appel
- Utilisé sur `/partner/financial-score/:userId` uniquement

## Activation P0.0 (ADR-002)

À l'enrôlement, l'identificateur n'émet **aucun secret** :
- Code à usage unique selector.verifier (TTL 30 min, `bcrypt` hashé)
- Consommé atomiquement par la marchande sur **son** téléphone via `POST /auth/activer`
- La marchande pose son secret choisi
- Codes interdits : `0000`, `1234`

## Stratégie de création de rôles (M6+M8)

- `SELF_SIGNUP_ROLES = ['marchand', 'producteur', 'cooperateur']` (voie publique)
- `TERRAIN_CREATABLE_ROLES = ['marchand', 'producteur', 'cooperateur']` (identificateur/operateur_terrain)
- `ROLES_JAMAIS_GENERIQUES = ['super_admin']` (endpoint dédié `/auth/create-super-admin` requis)
- `BO_ROLES = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain']`
- `ACTEUR_ROLES = ['marchand', 'producteur', 'cooperateur', 'institution', 'identificateur']`
- Mots de passe par défaut : `123456` (BO) / `0000` (acteur), `mustChangePassword=true`
- `RolesGuard` : `role === 'ADMIN'` → équivalent aux 5 `BO_ROLES`

## Hardening HTTP

- `helmet` 7.0.0 avec CSP restrictive (`scriptSrc 'self'` only, `styleSrc 'unsafe-inline'` acceptable React)
- CORS manuel (origines : `CORS_ORIGIN`, `julaba-web.onrender.com`, `julaba.online`, `https://localhost`, `capacitor://localhost`)
- `cookie-parser` + cookies `httpOnly` + `Secure` + `SameSite` (prod: `None`+`Secure` cross-domain)
- ValidationPipe global `whitelist: true`
- `ClassSerializerInterceptor` global (active `@Exclude`)
- `@nestjs/throttler` 6.5.0 (1 throttler `default` 300/min/IP/endpoint)
- `@Throttle` ciblés serrés (auth login 5/min, signup 3/min, etc.)

## Secrets

- **`.gitignore`** : `.env`, `.env.production`, `*.env.*`, `*.bak`, `backup_*.sql`, `julaba_db_*.sql`, `.claude/*` (mais `!.claude/skills/`)
- **`.dockerignore`** racine : exclut `.git`, `.github`, `node_modules`, `frontend/`, `backend/`, `docs/`, `scripts/`, `tests/`, `database/`, `nginx/*.conf` sauf `frontend.conf`
- **Render `generateValue: true`** : `JWT_SECRET`, `PIN_ENCRYPTION_KEY`, `REFRESH_TOKEN_SALT` auto-générés
- **`sync: false`** (Render) : `SEED_DEMO_BO_PASSWORD`, `TRUST_PROXY`, `SENTRY_DSN`, `OPENAI_API_KEY`, `ELEVENLABS_*`
- **Fail-fast prod** : `verifierSecretsProduction()` au boot → `process.exit(1)` si `JWT_SECRET`/`REFRESH_TOKEN_SALT`/`PIN_ENCRYPTION_KEY` manquants
- ⚠️ **Anciens secrets** (`Julaba2026`) dans l'historique GitHub + Azure (inactifs mais présents)

## Backup / Recovery

- `sauvegarde-db.yml` cron quotidien 01:30 Abidjan : `pg_dump -Fc --no-owner` → chiffrage AES-256-CBC si `BACKUP_PASSPHRASE`
- Rétention : 7 jrs (quotidien) / 35 jrs (dimanche)
- `reinitialiser-db.yml` : **PAS DE DUMP = PAS D'EFFACEMENT** (taille ≥ 10 000 octets requise)
- Dump pré-effacement conservé 90 jours

## Audit logs

- Table `audit_logs` : userId, action, entite, entite_id, ip, details
- Captures : login, mutations sensibles, etc.
- ⚠️ SEC-04 : `users.service.ts:334` journalise le terme de recherche saisi (donnée personnelle) — à corriger

## Plan de correction (P1 prioritaire)

1. `npm audit fix` pour 14 CVEs prod
2. Hasher API keys partenaires
3. Rendre `BPAY_WEBHOOK_SECRET` obligatoire en prod
4. Brancher `EventsGateway` sur `JwtStrategy` (au lieu de `jwtService.verify` direct)
5. Corriger `SEC-04` (journalisation terme de recherche)
6. Activer `TRUST_PROXY` en prod
7. Mettre en place Trivy/SCA sur AAR sherpa-onnx
8. Activer `minifyEnabled true` + signature release avant Play Store
9. Réduire body parser limit à 1MB
10. Supprimer comptes démo si `SEED_DEMO=false` au boot
