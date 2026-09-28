# ARCHITECTURE.md — JULABA

> Source de vérité architecturale. Lue par Tech Lead, Backend, Frontend, DevOps avant toute modification.

## 1. Vue d'ensemble

```
+---------------------------------------------------------------------+
|                         TELEPHONE MARCHANDE                          |
|  APK Android (Capacitor 8, compileSdk 36)                            |
|  +- React 18 + Vite 6 + Tailwind 4 + shadcn/Radix                    |
|  +- Service Worker (cache-first assets, network-first nav)           |
|  +- IndexedDB "julaba_offline" (caisse_outbox + caisse_dead)         |
|  +- sherpa-onnx natif (STT zipformer2 FR, ~71 Mo embarque)           |
|  +- VITS-Piper TTS hors-ligne (~79 Mo, CC-BY 4.0)                    |
|  +- ElevenLabs cloud (TTS Tata Nanti Lou, fallback)                  |
+----------------------+----------------------------------------------+
                       | HTTPS /api/v1 (cookie JWT ou Bearer header)
                       | WebSocket /ws (notifications temps reel)
+----------------------v----------------------------------------------+
|                      BACKEND NestJS 11 (Render)                      |
|  +- 54 controllers / 42 services / 60 modules / 47 entites TypeORM   |
|  +- 361 endpoints (339 auth-required, 22 public)                     |
|  +- Auth : JWT + Refresh rotation + WebAuthn + PIN AES-256-GCM       |
|  +- Helmet + CORS manuel + Throttler (300/min global, serre auth)    |
|  +- Socket.io /ws (notifications push)                               |
|  +- Cron jobs pilotables depuis BO (table cron_jobs_config)          |
|  +- Sentry optionnel (erreurs only, tracesSampleRate=0)              |
+----------------------v----------------------------------------------+
                       | TypeORM 0.3 / pg 8.11
+----------------------v----------------------------------------------+
|                PostgreSQL 16 (Render, plan payant)                   |
|  +- 47 entites + 5 tables SQL brutes                                 |
|  +- 27 migrations actives + 31 archivees (baseline 1780200000000)    |
|  +- DbInitService idempotent (filet redondant -- ADR-0002)            |
|  +- synchronize active sur base vierge seulement                     |
+---------------------------------------------------------------------+
                       |
                       +---> Odoo 19 Gateway (POC, desactive par defaut)
                       |     +- Allow-list lecture seule (product.product)
                       |     +- Catalogue-maitre miroir Postgres
                       |     +- Bascule mock/real via ODOO_CLIENT_MODE
                       |
                       +---> B-Pay (webhook callback PUBLIC + secret opt.)
                       +---> ANSUT / SMS (envoi OTP, notifications)
                       +---> ONECI (verification NNI)
                       +---> OpenAI / ElevenLabs (LLM + TTS cloud)
                       +---> Web Push VAPID (notifications navigateur)
```

## 2. Modules backend (top 30 par criticite)

### Modules sacres (CONSTITUTION -- toute modif exige ADR + tests + invariants verts)
- **`auth/`** -- 1031 LOC controller, 30 routes, 5 voies (JWT, refresh, PIN GCM, WebAuthn, API key)
- **`caisse-rest/`** -- 721 LOC, 14 routes, **2e classe `CatalogueController`** dans le meme fichier (dette)
- **`wallets/`** + `wallet_transactions` -- verrous pessimistes, idempotence, plafond 10M XOF
- **`stocks-rest/`** -- decrement atomique (ADR-0001)
- **`commandes/`** + `commandes-rest/` -- paiement, negotiation, livraison
- **`cooperatives-rest/`** -- 953 LOC, 28 routes
- **`cycles-rest/`** + `producteur/cycles/` -- ATTENTION : **2 controleurs dupliques** (dette)
- **`recoltes-rest/`** + `producteur/recoltes/` -- ATTENTION : **2 controleurs dupliques** (dette)
- **`publications/`** + `publications-rest/`
- **`notifications/`** + `events/` (WebSocket Gateway)
- **`database/`** -- TypeORM config, 27 migrations, DbInit idempotent, seed-demo

### Modules evolutifs
- **`academy/`** -- modules + questions + progress
- **`boutique/`** -- sync mouvements boutique offline
- **`revenus/`**, **`scores/`**, **`financial-score/`**
- **`fidelite-rest/`** -- fidelite clients
- **`protection-sociale/`** -- cotisations sociales
- **`tontines/`** -- tontines + membres + mouvements

### Modules backoffice
- **`admin/`** -- `admin.controller` (28 routes) + `admin-analytics` + `admin-wallets` (17 routes) + `admin.service` (765 LOC)
- **`audit-rest/`** -- 3 routes `@Roles('ADMIN')`
- **`tickets-rest/`** -- 8 routes staff
- **`institutions/`** -- `InstitutionScopeGuard` fail-closed
- **`identifications/`** -- workflow draft + create-with-acteur
- **`mutations/`**, **`missions/`**, **`zones/`**, **`marches/`**, **`admin-divisions/`**

### Modules integrations
- **`odoo-gateway/`** -- POC Odoo 19 (mock + real client, allow-list lecture)
- **`catalogue-maitre/`** -- miroir Postgres du referentiel Odoo
- **`bpay/`** -- webhook + cron pending
- **`ansut/`**, **`feedbak-sms/`**, **`sms/`**, **`oneci/`**
- **`voice/`** -- voice-config + tts-providers + openai + piper + metrics
- **`partner/`** -- `ApiKeyGuard` (table `api_keys` SQL brute)

### Modules infrastructure
- **`config/`** -- throttler.config + trust-proxy.config
- **`cron-jobs/`** -- registry + config service (ATTENTION : **non branche dans AppModule**)
- **`user-flags/`** -- signalements comptes
- **`health.controller`** -- `/health` + `/health/net`

## 3. Frontend -- structure

```
frontend_src/
+- src/
|  +- app/
|  |  +- routes.tsx               # 95 routes, lazy-loadees via L()
|  |  +- App.tsx                  # 16 providers imbriques (dette)
|  |  +- contexts/                # 24 contexts (7591 LOC)
|  |  |  +- AppContext.tsx        # ATTENTION : God context 1351 LOC (dette)
|  |  +- hooks/                   # 24 hooks
|  |  +- components/
|  |  |  +- ui/                   # shadcn local (16 composants)
|  |  |  +- backoffice/universal/ # 2e DS parallele (22 Universal*BO)
|  |  |  +- ...
|  |  +- services/api/            # 26 services API types
|  |  +- types/                   # julaba.types.ts (879 LOC)
|  |  +- utils/
|  |  +- ...
|  +- services/                   # offline, voice, eventBus
+- public/
|  +- sw.js                        # SW custom (pas Workbox)
|  +- manifest.json
|  +- voix/                        # 137 clips mp3 Tata (~7 Mo pre-caches)
+- e2e/                             # 7 scripts Playwright .mjs
+- scripts/                         # 8 garde-fous .mjs
+- tests/                           # 74 tests .test.mts (sans framework)
```

### Arbre de 16 providers (dette perf + DX)
```
ThemeProvider
+- ShortcutsProvider
   +- ModalProvider
      +- AppProvider            <-- god context 1351 LOC
         +- UserProvider
            +- NotificationsProvider
               +- AuditProvider
                  +- WalletProvider
                     +- CommandeProvider
                        +- CaisseProvider
                           +- StockProviderInner
                              +- CooperativeProvider
                                 +- InstitutionProvider
                                    +- BackOfficeProvider
                                       +- SupportConfigProvider
                                          +- TicketsProvider
                                             +- InstitutionAccessProvider
                                                +- ProducteurProvider
```

## 4. Mobile -- Capacitor 8

- **`applicationId`** : `com.julaba.app`
- **`compileSdk`** : 36 (Android 16)
- **`minSdk`** : 24 (Android 7.0+)
- **Plugins natifs custom** : `SherpaSttPlugin.kt` + `SherpaTtsPlugin.kt` (enregistres AVANT `super.onCreate()`)
- **AAR sherpa-onnx** hors git (`.gitignore *.aar`), pose par `android/scripts/installer-voix.sh`
- **Permissions Android** : `INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` (minimalisme)
- **Build release** : ATTENTION `minifyEnabled false` (pas d'obfuscation R8), pas de signature release (APK debug only)

## 5. Donnees -- schema (synthese)

### Entites principales (47 au total)

| Domaine | Tables |
|---|---|
| Auth & users | `users` (~60 colonnes), `refresh_tokens`, `activation_codes`, `user_flags`, `marchand_sous_profil_historique` |
| Wallet & transactions | `wallets`, `wallet_transactions` (idempotencyKey, plafond 10M XOF) |
| Caisse & vente | `caisse_transactions`, `caisse_sessions`, `objectifs_journaliers`, `raccourcis_vocaux` |
| Producteur | `cycles`, `recoltes`, `publications`, `commandes`, `negociations`, `stock_reservations` |
| Cooperatives & tontines | `cooperatives`, `cooperative_membres`, `cooperative_stock*`, `tontines`, `tontine_membres`, `tontine_mouvements` |
| Fidelite & social | `fidelite_evenements`, `cotisations_sociales` |
| Notifications & support | `notifications`, `push_tokens`, `tickets` |
| Referentiel & geo | `marches`, `zones`, `districts`, `regions`, `departements`, `communes`, `mutations`, `missions`, `identifications` |
| Institutions | `institutions` |
| Voice & partenaires | `voice_provider_config`, `voice_service_metrics`, `boutique_mouvements`, `audit_logs` |

### Tables SQL brutes (sans entite TypeORM)
- `caisse_sessions`, `caisse_produits`, `bpay_transactions`, `api_keys`, `cron_jobs_config` -- gerees par `DbInitService.runInit()` (DDL idempotent `IF NOT EXISTS`) et requetees via `dataSource.query()`.

### Migrations
- **27 actives** + **31 archivees** (`_archive/`)
- **Baseline** : `1780200000000-BaselineSchema`
- **Idempotence financiere systematique** : `wallet_transactions.idempotencyKey`, `caisse_transactions.idempotencyKey`, `fidelite_evenements.idempotencyKey`, `stock_operation_idempotency`, `wallet_transaction_transfert_idempotence`, `wallet_transaction_commande_idempotence`.

## 6. Deploiement

> **Décision formalisée : `docs/adr/ADR-0004-cible-production-render.md`** (28/09/2026).
> Render = prod réelle ; OVH `julaba.online` = chaîne secondaire DR (non utilisée
> pour servir en nominal) ; Azure DevOps = miroir lecture seule (aucun
> déploiement).

### Render (prod reelle)
- `julaba-db` : PostgreSQL 16, `basic_256mb` (payant -- free expire 90 jrs)
- `julaba-api` : NestJS, `starter` (7$/mois, ne s'endort pas), `autoDeploy: true` sur `main`
- `julaba-web` : statique gratuit, `autoDeploy: true` sur `main`
- Secrets auto-generees : `JWT_SECRET`, `PIN_ENCRYPTION_KEY`, `REFRESH_TOKEN_SALT`
- ATTENTION **`DB_MIGRATIONS_RUN=false`** en prod (workaround incident 18/09/2026)
- Health check : `GET https://julaba-api.onrender.com/api/v1/health` -> 200

### OVH VPS julaba.online (chaine secondaire, non utilisee pour servir)
- Docker Compose local, `deploy.yml` en **`workflow_dispatch` manuel** (jamais branche sur `push`)
- Rôle : disaster recovery + tests d'integration realiste. Runbook : `GUIDE_DEPLOIEMENT.md` (marque secondaire).
- Nginx vhost `nginx/julaba.conf` (TLS 1.2/1.3, HSTS sans preload)
- Health check DR (lorsque la chaine est activee) : `GET https://julaba.online/api/v1/health` -> 200

### GitHub Releases (APK pilote)
- `apk.yml` (workflow_dispatch manuel), APK debug-signed, `pilote-latest` tag, retention 14 jrs

### Azure DevOps (miroir lecture seule)
- `mirror-azure.yml` pousse `main` + tags vers Azure DevOps (aucun deploiement)
- **`azure-pipelines.yml` DESACTIVE** (`trigger: none`) -- l'ancien trigger `master` visait une branche inexistante ; pipeline jamais execute
- PAT Azure expire le 08/09/2026 (a regenerer, action ops P0 -- voir `.ai/PROJECT_CONTEXT.md` §10)

## 7. CI/CD -- 9 workflows GitHub Actions

| Workflow | Role | Declenchement |
|---|---|---|
| `ci.yml` | Filet integration (build + tests unit + gate TS cliquet) | PR/push `main` |
| `invariants.yml` | Tests d'invariants metier (Postgres 16 jetable) | PR/push `main` |
| `deploy.yml` | Deploiement SSH/rsync vers julaba.online | `workflow_dispatch` |
| `apk.yml` | Build APK + publication GitHub Releases | `workflow_dispatch` |
| `mirror-azure.yml` | Miroir GitHub vers Azure DevOps | push `main` + tags |
| `schema-pilote.yml` | Verrou schema fige | PR/push `main` |
| `sauvegarde-db.yml` | Dump quotidien chiffre | cron `30 1 * * *` |
| `reinitialiser-db.yml` | Reset DB (avec dump obligatoire) | `workflow_dispatch` |
| `spike-tts.yml` | Spike TTS avant embarquement | `workflow_dispatch` |

## 8. Dette structurelle majeure (top 10)

1. **2 controleurs dupliques** (`cycles-rest` + `producteur/cycles`, `recoltes-rest` + `producteur/recoltes`) -- routes qui se chevauchent.
2. **Catalogue produit hardcode** dans `caisse-rest.controller.ts` (15 produits vivriers) -- devrait etre en base.
3. **God context `AppContext.tsx`** (1351 LOC) + 16 providers imbriques.
4. **2 design systems BO paralleles** (`components/ui/*` + `components/backoffice/universal/Universal*BO`).
5. **Typage faible massif** : 476 `any` back + 787 `any` front.
6. **SQL brut massif** : 592 `manager.query()` back.
7. **`DbInitService` redondant avec migrations** (765 LOC) -- ADR-0002 documente la convergence.
8. **`database/init.sql` obsolete** (vestige pre-migrations, dangereux si execute).
9. **Dependances frontend parasites** dans `backend/package.json` (`@capacitor/cli`, `react-router`).
10. **3 doctrines schema paralleles** (SCHEMA-01/02/03 P1 OUVERT).

## 9. Forces architecturales remarquables

1. **Idempotence financiere systematique** sur tous les mouvements d'argent.
2. **Verrous pessimistes** `pessimistic_write` sur `Wallet` + `assertCompteActif` dans la meme transaction.
3. **Fail-closed partout** : `InstitutionScopeGuard`, `rolesCreablesPar`, `OdooRealClient` allow-list.
4. **48 tests d'invariants** sur vrai PostgreSQL jetable en CI.
5. **Souverainete vocale** : STT + TTS embarques dans l'APK (aucune dependance cloud pour la boucle vocale).
6. **Mutex de refresh session unique** (prevent la revocation serveur).
7. **Offline-first pour l'argent reel** : IndexedDB durable + idempotence + lettres mortes 4xx/5xx.
8. **Verrou PIN modernise** : echelle d'attente, jamais definitif.
9. **Securite defense en profondeur** : `stripSensitiveUserFields` + `ClassSerializerInterceptor` + `@Exclude`.
10. **Backup chiffre AES-256-CBC + reset DB avec dump obligatoire**.

## 10. Liens utiles

- `CONSTITUTION.md` -- 8 principes + mecanismes CI.
- `JULABA_DECISIONS.md` -- 10 decisions arch + roadmap.
- `docs/adr/` -- 6 ADR (ADR-0004 = cible de production Render).
- `docs/dette/REGISTRE-MAITRE.md` -- registre dette (revision 20).
- `docs/invariants/TABLEAU_DE_BORD.md` -- invariants I1-I7.
- `render.yaml` -- config prod Render.
- `capacitor.config.ts` -- config mobile.
