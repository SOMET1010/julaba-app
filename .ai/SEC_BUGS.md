# SEC_BUGS.md — Vulnérabilités JULABA

> Registre des vulnérabilités. Format : SEC-XXX.

## État au 2026-09-28

- **Total vulnérabilités** : 14 prod + 10 dev = 24
- **CRITIQUES (P0)** : 0
- **HAUTES (P1)** : 14 (prod) + 9 (dev)
- **MOYENNES (P2)** : 5 (prod) + 10 (dev)
- **BASSES (P3)** : 5 (prod)
- **Résolues** : 0

## Vulnérabilités PROD (npm audit --omit=dev)

| ID | Package | Sévérité | CVEs | Statut | Date détection |
|---|---|---|---|---|---|
| SEC-001 | `multer` ≤2.2.0 | HAUTE × 4 | DoS multipart field names, file descriptor leak, file size bypass, oversized array index | OUVERT | 2026-09-28 |
| SEC-002 | `js-yaml` 5.0.0-5.2.1 | HAUTE | DoS exponential parsing, maxTotalMergeKeys | OUVERT | 2026-09-28 |
| SEC-003 | `picomatch` 4.0.0-4.0.3 | HAUTE | ReDoS extglob quantifiers | OUVERT | 2026-09-28 |
| SEC-004 | `react-router` 6.0.0-7.18.1 | HAUTE | (via `@nestjs/swagger` indirect) | OUVERT | 2026-09-28 |
| SEC-005 | `tmp` ≤0.2.5 | HAUTE × 2 | Path traversal, symlink dir | OUVERT | 2026-09-28 |
| SEC-006 | `qs` 2.2.5-6.15.3 | MOYENNE × 2 | Array-limit bypass, DoS isBuffer | OUVERT | 2026-09-28 |
| SEC-007 | `uuid` <11.1.1 | MOYENNE | Buffer bounds check v3/v5/v6 | OUVERT | 2026-09-28 |
| SEC-008 | `@nestjs/platform-express` | HAUTE | via multer | OUVERT | 2026-09-28 |
| SEC-009 | `@nestjs/swagger` 11.4.6 | HAUTE | via js-yaml | OUVERT | 2026-09-28 |
| SEC-010 | `exceljs` 3.4.0 | BASSE | via fast-csv + tmp | OUVERT | 2026-09-28 |

## Vulnérabilités applicatives (hors CVE)

| ID | Risque | Sévérité | Localisation | Statut |
|---|---|---|---|---|
| SEC-011 | **API keys partenaires stockées EN CLAIR en DB** (table `api_keys`, colonne `key`) | HAUTE | `backend/src/partner/partner-api-keys.service.ts:55` + `api-key.guard.ts:25` | OUVERT |
| SEC-012 | **Mots de passe par défaut constants** `0000` (acteur) et `123456` (BO) en code | MOYENNE | `backend/src/auth/auth.service.ts:30-31` (`mustChangePassword=true` obligatoire mais 0000 reste trivial) | OUVERT |
| SEC-013 | **`SEED_DEMO=false` n'efface pas les comptes déjà créés** — comptes admin persistent indéfiniment si seedé une fois | MOYENNE | `backend/src/database/seed-demo.service.ts:130` | OUVERT |
| SEC-014 | **`trust proxy` désactivé par défaut** — `req.ip` = routeur Render partagé → rate-limiter collectif | MOYENNE | `backend/src/config/trust-proxy.config.ts` | OUVERT |
| SEC-015 | **`minifyEnabled false` sur APK release** — pas d'obfuscation R8 (reverse engineering facile) | BASSE | `android/app/build.gradle:23` | OUVERT |
| SEC-016 | **Body parser limit `10mb`** — potentiellement abusif pour DoS mémoire (vs nginx 10M cohérent) | BASSE | `backend/src/main.ts:173-174` | OUVERT |
| SEC-017 | **AAR sherpa-onnx non audité** (SCA) — vulnérabilités C/C++ potentielles dans la lib native hors git, pas de Trivy/SCA | MOYENNE | `android/scripts/installer-voix.sh` | OUVERT |
| SEC-018 | **Pas de CSRF protection** — acceptable (JWT + SameSite=None;Secure + Authorization header mobile) mais cookies cross-domain exposent au CSRF si Origin spoofé | BASSE | `backend/src/main.ts` | OUVERT |
| SEC-019 | **HSTS sans `preload`** | BASSE | `nginx/julaba.conf` | OUVERT |
| SEC-020 | **`X-XSS-Protection` déprécié** (1; mode=block obsolète) | BASSE | `nginx/julaba.conf` | OUVERT |
| SEC-021 | **`Content-Security-Policy` helmet avec `'unsafe-inline'` pour styles** — acceptable React mais à documenter | BASSE | `backend/src/main.ts` | OUVERT |
| SEC-022 | **Webhook BPay `/bpay/callback` PUBLIC** — protégé que par un `BPAY_WEBHOOK_SECRET` optionnel. Si absent, n'importe qui peut appeler le callback | MOYENNE | `backend/src/bpay/bpay.controller.ts` | OUVERT |
| SEC-023 | **WebSocket auth légère** : `EventsGateway` vérifie le JWT via `jwtService.verify` direct (pas via `JwtStrategy`), donc pas de contrôle `mustChangePassword` ni `status SUSPENDU` | MOYENNE | `backend/src/events/events.gateway.ts` | OUVERT |
| SEC-024 | **`SEC-04` (registre dette existant)** : `users.service.ts:334` journalise le terme de recherche saisi (donnée personnelle) | BASSE | `backend/src/users/users.service.ts:334` | OUVERT |

## Vulnérabilités DEV (npm audit avec devDependencies)

| Package | Sévérité | Via |
|---|---|---|
| `@nestjs/cli` | HAUTE | webpack SSRF, glob cmd injection, inquirer/tmp |
| `@capacitor/cli` | HAUTE | via xcode/uuid |
| `express` 4.22.2 | MOYENNE | via qs |
| `ajv` | MOYENNE | ReDoS `$data` |
| `webpack` 5.49-5.104 | HAUTE | buildHttp SSRF |

## Plan de correction

### P0 (immédiat)
- Aucune vulnérabilité CRITIQUE — pas de blocage production.

### P1 (avant ouverture à un second pilote)
1. **SEC-001 à SEC-010** : `npm audit fix` pour patcher les 14 CVEs prod. Si breaking, overrides dans `package.json` (déjà partiellement fait pour multer/tmp/picomatch — lockfile à régénérer).
2. **SEC-011** : Hasher les API keys partenaires (comme les refresh tokens HMAC-SHA256 salé).
3. **SEC-022** : Rendre `BPAY_WEBHOOK_SECRET` obligatoire en prod (fail-fast au boot).
4. **SEC-023** : Brancher `EventsGateway` sur `JwtStrategy` (au lieu de `jwtService.verify` direct).
5. **SEC-024** : Cesser de journaliser le terme de recherche dans `users.service.ts:334`.

### P2 (fiabilisation)
6. **SEC-014** : Activer `TRUST_PROXY` en prod après calibration via `/health/net`.
7. **SEC-017** : Mettre en place Trivy/SCA sur AAR sherpa-onnx.
8. **SEC-015** : Activer `minifyEnabled true` + signature release avant Play Store.

### P3 (hygiène)
9. **SEC-019** : Ajouter `preload` à HSTS (après validation que tous les sous-domaines sont en HTTPS).
10. **SEC-020** : Retirer `X-XSS-Protection` (déprécié).
11. **SEC-016** : Réduire body parser limit à 1MB (sauf endpoints spécifiques upload).
12. **SEC-013** : Supprimer les comptes démo si `SEED_DEMO=false` au boot.

## Trivy

- ⚠️ `.trivyignore` existe (1 CVE OpenSSL CVE-2026-45447) mais **n'est pas branché en CI** — fichier orphelin.
- À mettre en place : workflow Trivy sur image Docker backend + AAR sherpa-onnx.

## Dépendances overrides existants (partiels)

`backend/package.json` overrides :
- `multer ^2.2.0` (toujours vulnérable selon npm audit)
- `lodash ^4.18.0`
- `tmp ^0.2.6` (toujours vulnérable selon npm audit)
- `ws ^8.21.0`
- `glob ^10.5.0`
- `minimatch ^9.0.6`
- `picomatch ^4.0.4` (toujours vulnérable selon npm audit)

→ **Lockfile à régénérer** : `rm package-lock.json && npm install` pour appliquer les overrides.
