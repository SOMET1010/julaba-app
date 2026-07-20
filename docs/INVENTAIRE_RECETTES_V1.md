# Inventaire fonctionnel et technique - Julaba V1

Document de reference pour le cahier de recettes ANSUT. Toutes les affirmations sont issues de la lecture directe du code source du depot `Julabaovh`. Les chemins et numeros de ligne sont cites quand disponibles. Les zones non confirmees a la source sont listees en derniere section et signalees `NON VERIFIE` dans le corps du document.

Date de production : 14 juin 2026.

---

## 1. Vue d'ensemble

### 1.1 Stack technique

Backend (`backend/`) :
- NestJS 10, TypeORM 0.3, PostgreSQL (`pg`), base `julaba_db`.
- Authentification JWT (`@nestjs/jwt`, `passport-jwt`), refresh tokens, WebAuthn (`@simplewebauthn/server`).
- Throttling (`@nestjs/throttler`), WebSockets/Socket.io, taches planifiees (`@nestjs/schedule`).
- Exports : `exceljs` (xlsx), `pdfkit` (pdf). Notifications push : `web-push`. Hash : `bcryptjs`.
- Source : `backend/package.json`.

Frontend (`frontend_src/`) :
- React + Vite + TypeScript, routage `react-router` (`createBrowserRouter`).
- UI Radix + Tailwind 4, `framer-motion`/`motion`, `leaflet` (cartes), `jsqr` (QR), `jspdf`/`html2canvas` (export PDF), `papaparse` (CSV).
- WebAuthn cote client (`@simplewebauthn/browser`).
- Source : `frontend_src/package.json`, `frontend_src/src/app/routes.tsx`.

### 1.2 Perimetre fonctionnel

Plateforme agri-fintech (pilote ANSUT, Cote d'Ivoire) avec deux grands ensembles :
- Applications acteurs terrain : Marchand, Producteur, Cooperative (cooperateur), Identificateur, Institution.
- Back-office d'administration (`/backoffice`) pour les roles BO (super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain).
- Portefeuille electronique Keiwa (wallet) transversal a tous les roles acteurs.
- Module de paiement public par QR (`/pay/:marchandId`) sans authentification.

### 1.3 Modules fonctionnels identifies

1. Authentification et comptes (auth, users)
2. Wallet Keiwa et paiements (wallets, bpay, escrow)
3. Caisse marchand et catalogue (caisse-rest : transactions, credits, objectifs, raccourcis, rapport hebdo)
4. Production : cycles, recoltes, publications, revenus (producteur, cycles-rest, recoltes-rest, publications-rest, stocks-rest, revenus)
5. Marche virtuel et commandes / negociations (marches, commandes-rest)
6. Cooperatives : membres, tresorerie, besoins (cooperatives-rest)
7. Identification des acteurs et dossiers (identifications, acteurs-rest, dossiers-rest)
8. Mutations de zone et missions (mutations, missions)
9. Zones, marches geographiques, divisions administratives (zones, marches, admin-divisions)
10. Institutions et tableaux de bord institutionnels (institutions)
11. Supervision, transactions et agregations geo (transactions-rest, admin)
12. Academy (formation) (academy)
13. Scores et score financier (scores, financial-score, partner)
14. Audit et logs (audit-rest, audit)
15. Notifications, alertes, SMS, voice (notifications, sms, voice, feedbak-sms)
16. Support et tickets (tickets-rest, misc-rest)
17. Flags utilisateurs et moderation (user-flags)
18. ONECI (identite nationale) et integration ANSUT (oneci, ansut)

---

## 2. Cartographie des modules backend

Chaque module NestJS reside sous `backend/src/`. Roles cles releves dans le code :

| Module | Role fonctionnel | Fichiers cles |
|---|---|---|
| auth | Inscription, connexion, PIN, sessions, WebAuthn, creation d'acteurs/admins | `auth/auth.controller.ts`, `auth/auth.service.ts`, `auth/guards/roles.guard.ts`, `auth/guards/jwt-auth.guard.ts`, `auth/decorators/roles.decorator.ts` |
| users | Profils, liste BO, comptes admin et back-office, permissions BO, sous-profil marchand | `users/users.controller.ts`, `users/entities/user.entity.ts`, `users/entities/sous-profil-marchand.enum.ts` |
| admin | Stats, activite, sante, timeline, analytics, monitoring, rapports, scores | `admin/admin.controller.ts`, `admin/admin-analytics.controller.ts`, `admin/admin-wallets.controller.ts` |
| wallets | Portefeuille Keiwa, recharge/retrait mobile, paiement public QR, administration wallet | `wallets/wallets.controller.ts`, `wallets/wallets-public.controller.ts`, `wallets/wallets-admin.controller.ts`, `wallets/entities/wallet.entity.ts`, `wallets/entities/wallet-transaction.entity.ts` |
| bpay | Webhook fournisseur de paiement, transactions en attente | `bpay/bpay.controller.ts`, `bpay/bpay.service.ts` |
| escrow | Module vide (`controllers/providers/exports` vides, aucun `escrow.service.ts`). La logique sequestre reelle (block/release/refund) est dans `wallets/wallets.service.ts` | `escrow/escrow.module.ts`, `wallets/wallets.service.ts` |
| caisse-rest | Caisse marchand (ventes, depenses, sessions), produits, credits, objectifs, raccourcis vocaux, rapport hebdo | `caisse-rest/caisse-rest.controller.ts`, `caisse-rest/credits.controller.ts`, `caisse-rest/objectifs.controller.ts`, `caisse-rest/raccourcis.controller.ts`, `caisse-rest/rapport-hebdo.controller.ts` |
| producteur (cycles, recoltes, publications) | Cycles de production, recoltes, publications marche | `producteur/cycles/cycles.controller.ts`, `producteur/recoltes/recoltes.controller.ts`, `producteur/publications/publications.module.ts` |
| cycles-rest, recoltes-rest | Variantes REST des cycles/recoltes (SQL brut) | `cycles-rest/cycles-rest.controller.ts`, `recoltes-rest/recoltes-rest.controller.ts` |
| publications-rest | Marche virtuel, publication et republication | `publications-rest/publications-rest.controller.ts` |
| stocks-rest | Stock (produits marchand / stocks cooperative-producteur) | `stocks-rest/stocks-rest.controller.ts` |
| commandes-rest, commandes | Commandes (achat, vente directe), negociations | `commandes-rest/commandes-rest.controller.ts`, `commandes/entities/commande.entity.ts`, `commandes/entities/negociation.entity.ts` |
| marches | Marches geographiques, suggestion, validation | `marches/marches.controller.ts`, `marches/marche.entity.ts` |
| cooperatives-rest | Membres, tresorerie, besoins, cotisations, adhesion | `cooperatives-rest/cooperatives-rest.controller.ts` |
| transactions-rest | Liste/export transactions caisse, agregations geo, changement de statut | `transactions-rest/transactions-rest.controller.ts`, `transactions-rest/transactions-export.service.ts` |
| revenus | Revenus derives des recoltes | `revenus/revenus.controller.ts` |
| scores, financial-score | Score Julaba par role, score financier | `scores/scores.controller.ts`, `financial-score/financial-score.controller.ts`, `financial-score/financial-score.service.ts` |
| partner | Acces API partenaire par cle (score financier), gestion des cles API | `partner/partner.controller.ts`, `partner/partner-api-keys.service.ts` |
| identifications, acteurs-rest, dossiers-rest | Fiches d'identification, brouillons, acteurs, dossiers | `identifications/identifications.controller.ts`, `acteurs-rest/acteurs-rest.controller.ts`, `dossiers-rest/dossiers-rest.controller.ts` |
| mutations, missions | Demandes de mutation de zone, missions | `mutations/mutations.controller.ts`, `missions/missions.controller.ts` |
| zones, admin-divisions | Zones et marches, decoupage administratif (districts/regions/departements/communes), reverse-geocode | `zones/zones.controller.ts`, `admin-divisions/admin-divisions.controller.ts` |
| institutions | CRUD institutions, dashboard institution (macro KPI, acteurs, transactions) | `institutions/institutions.controller.ts`, `institutions/institution-dashboard.controller.ts` |
| academy | Modules de formation, questions, progression, stats | `academy/academy.controller.ts`, `academy/academy-module.entity.ts`, `academy/academy-question.entity.ts`, `academy/academy-progress.entity.ts` |
| audit-rest, audit | Journal d'audit (lecture propre + admin), creation d'entrees | `audit-rest/audit-rest.controller.ts`, `audit/audit.service.ts`, `audit-rest/audit-log.entity.ts` |
| notifications | Notifications in-app, push, alertes cron, envoi cible/bulk | `notifications/notifications.controller.ts`, `notifications/alertes.service.ts`, `notifications/push.service.ts` |
| voice | STT, intent, TTS (ElevenLabs/OpenAI) | `voice/voice.controller.ts`, `voice/openai.service.ts`, `voice/voice.service.ts` |
| tickets-rest | Support tickets (BO + utilisateur) | `tickets-rest/tickets-rest.controller.ts`, `tickets-rest/ticket.entity.ts` |
| misc-rest | Endpoints transverses (supervision/cron/support/dashboard stats) sans prefixe | `misc-rest/misc-rest.controller.ts` |
| user-flags | Signalements / flags d'acteurs | `user-flags/user-flags.controller.ts` |
| oneci | Lookup identite nationale (NNI), quota. Appelle `https://api-rnpp.verif.ci/api/v1` (auth apiKey/secretKey, lookup POST `/oneci/persons/:nni/match`, mode sandbox detecte sur ErrorCode='1') | `oneci/oneci.controller.ts`, `oneci/oneci.service.ts` |
| sms | Envoi SMS via fournisseur ANSUT (`POST {ANSUT_BASE_URL}/api/message/send`, auth username/password dans le body, sender JULABA, tronque a 160 car.), OTP genere localement. Pas de fallback. | `sms/sms.service.ts`, `sms/sms.module.ts` |
| feedbak-sms | Notifications SMS metier (modeles : dossier soumis/valide/rejete, complement, compte suspendu/reactive, mutation) au-dessus de SmsService ; `notifyPin*` non branchees (console.log, TODO) | `feedbak-sms/feedbak-sms.service.ts`, `feedbak-sms/feedbak-sms.constants.ts` |
| ansut | Traduction audio langues locales (`POST {ANSUT_BASE_URL}/translate-audio`, defaut `https://ansut-test.lafricamobile.com`, conversion WAV 16k via ffmpeg) ; `translateText`/`textToSpeechLocal`/`synthesizeSpeech` non fonctionnels (stub) | `ansut/ansut.service.ts`, `ansut/ansut.module.ts` (pas de controller) |
| events | Gateway WebSocket Socket.IO (namespace `/ws`, auth JWT, rooms all/user/admin), broadcast d'events metier (transaction:created, wallet:updated, stock:updated, user:created). Module `@Global` | `events/events.gateway.ts`, `events/events.module.ts` |
| rapport | Rapport hebdomadaire vocal | `rapport/rapport.controller.ts` |
| raccourcis | Raccourcis vocaux (variante) | `raccourcis/raccourcis.controller.ts` |
| health | Healthcheck public | `health.controller.ts` |

Note : plusieurs paires de controleurs partagent le meme prefixe de route. Apres lecture de `backend/src/app.module.ts` (ordre du tableau `imports`) et des tableaux `controllers:` de chaque module, une seule collision est reelle en runtime (`GET /admin/health`) ; les autres sont des faux positifs car l'un des deux controleurs n'est jamais monte (son module n'est pas importe dans `AppModule`). Detail tranche en section 3.15.

---

## 3. Inventaire des endpoints

Convention : la colonne Roles indique les roles requis par decorateur `@Roles(...)` ; quand l'autorisation est faite par un test de role dans le corps de la methode, c'est precise `(controle in-code)`. Le token litteral `'ADMIN'` est resolu par `RolesGuard` (`backend/src/auth/guards/roles.guard.ts:5`) vers l'ensemble `ADMIN_ROLES = ['admin_general','super_admin','admin_national','gestionnaire_zone','operateur_terrain']`. Quand aucun `@Roles` n'est present, `RolesGuard` renvoie `true` (ligne 18) ; seul `JwtAuthGuard` s'applique alors (tout utilisateur authentifie).

### 3.1 Module auth (`backend/src/auth/auth.controller.ts`, prefixe `auth`)

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| POST | /auth/signup | public (throttle 3/60s) | SignupDto | Auto-inscription acteur (bloque les roles non-acteur), mot de passe par defaut, mustChangePassword | 42 |
| POST | /auth/check-phone | public (10/60s) | {phone} | Verifie existence d'un telephone | 62 |
| GET | /auth/contacts-recovery-bo | public (5/60s) | - | Jusqu'a 5 contacts super_admin pour recuperation BO | 71 |
| POST | /auth/login | public (5/60s) | LoginDto | Connexion, pose cookies token | 87 |
| POST | /auth/refresh | public | {refreshToken?} + cookie | Rotation refresh token | 99 |
| GET | /auth/me | authentifie | - | Utilisateur courant | 119 |
| GET | /auth/sessions | authentifie | - | Liste jusqu'a 10 sessions actives | 129 |
| DELETE | /auth/sessions/:id | authentifie | id | Revoque une session | 155 |
| DELETE | /auth/sessions | authentifie | - | Revoque toutes les sessions | 165 |
| PATCH | /auth/preferences | authentifie | Record | Met a jour les preferences | 173 |
| POST | /auth/pin/set | authentifie | {pin, currentPin?} | Definit/change le PIN 4 chiffres | 185 |
| POST | /auth/pin/verify | authentifie | {pin} | Verifie le PIN | 208 |
| POST | /auth/pin/disable | authentifie | {currentPin} | Desactive le PIN | 220 |
| POST | /auth/change-password | authentifie | {oldPassword, newPassword} | Change le mot de passe, vide mustChangePassword | 237 |
| DELETE | /auth/account | authentifie | {password} | Suppression douce (anonymise, statut REJETE) | 255 |
| POST | /auth/logout | public | {refreshToken?} + cookie | Deconnexion, vide cookies | 277 |
| POST | /auth/logout-all | authentifie | - | Revoque toutes les sessions | 288 |
| POST | /auth/reset-user-password | super_admin, admin | {userId, newPassword} | Reinitialise le mot de passe d'un utilisateur | 299 |
| POST | /auth/identificateur/:id/pin | super_admin, admin_general | id, {pin} | PIN chiffre identificateur (audite) | 316 |
| POST | /auth/identificateur/me/verify-pin | identificateur | {pin} | L'identificateur verifie son PIN | 343 |
| POST | /auth/identificateur/me/change-pin | identificateur | {oldPin, newPin} | Change son PIN, notifie par SMS | 371 |
| GET | /auth/identificateur/:id/pin-decrypted | super_admin, admin_general | id | Dechiffre le PIN pour le BO (audite) | 419 |
| POST | /auth/create-acteur | super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain, identificateur | CreateActeurDto | Creation d'acteur par un admin (PIN auto + SMS pour identificateur) | 446 |
| POST | /auth/create-super-admin | super_admin | {phone,password,firstName,lastName} | Cree un super_admin | 493 |
| GET | /auth/super-admin-status | super_admin | - | Indique si un super_admin existe | 513 |
| POST | /auth/webauthn/register/options | authentifie | - | Options d'enregistrement WebAuthn | 521 |
| POST | /auth/webauthn/register/verify | authentifie | RegistrationResponseJSON | Verifie et stocke le credential | 547 |
| POST | /auth/webauthn/authenticate/options | public | {phone} | Options d'authentification WebAuthn | 583 |
| POST | /auth/webauthn/authenticate/verify | public | {response, userId} | Verifie l'assertion, connecte | 614 |

### 3.2 Module users (`backend/src/users/users.controller.ts`, prefixe `users`, classe sous `JwtAuthGuard`)

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| GET | /users/me | authentifie | - | Profil propre | 37 |
| GET | /users | ADMIN | UsersBoListQueryDto | Liste BO paginee | 44 |
| GET | /users/by-phone/:phone | controle in-code (roles admin) | phone | Recherche par telephone, vue restreinte par zone pour identificateur | 53 |
| GET | /users/search-identificateur | controle in-code | q, limit | Recherche d'acteurs pour enrolement | 73 |
| GET | /users/duplicates | super_admin, admin_general, admin_national, gestionnaire_zone | - | Doublons (filtre zone pour gestionnaire) | 95 |
| GET | /users/counts-by-role | super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain | - | Compteurs par role | 108 |
| GET | /users/admin/pending | super_admin | - | Comptes admin en attente de validation | 120 |
| POST | /users/admin | super_admin, admin_general | CreateAdminUserDto | Cree un utilisateur admin | 128 |
| POST | /users/admin/:id/validate | super_admin | id | Valide un admin en attente | 140 |
| POST | /users/admin/:id/reject | super_admin | id, RejectAdminUserDto | Rejette un admin en attente | 152 |
| POST | /users/backoffice/create | super_admin, admin_general, admin_national, gestionnaire_zone | CreateBackofficeUserDto | Cree un utilisateur back-office | 169 |
| POST | /users/backoffice-account | super_admin | CreateBackofficeAccountDto | Cree un compte admin BO | 189 |
| GET | /users/:id/historique | controle in-code (admin ou proprietaire) | id | Historique utilisateur | 217 |
| GET | /users/:id | super_admin, admin_general, admin_national, gestionnaire_zone, identificateur, institution | id | Detail d'un utilisateur | 241 |
| PATCH | /users/:id | super_admin, admin_general, admin_national, identificateur | id, body | Mise a jour (allowlist de champs par role), SMS sur mutation de zone | 264 |
| PATCH | /users/:id/sous-profil | super_admin, admin_general, admin_national | id, UpdateSousProfilMarchandDto | Change le sous-profil marchand | 326 |
| POST | /users/:id/photo | controle in-code (admin/proprietaire/identificateur) | id, fichier | Upload photo acteur (5 Mo, image) | 341 |
| PATCH | /users/:id/bo-permissions | super_admin | id, {bo_permissions} | Met a jour la matrice de permissions BO | 394 |
| DELETE | /users/:id | ADMIN | id | Archive (suppression douce) | 457 |
| POST | /users/:id/admin-reset-password | super_admin | id | Reset mot de passe par admin | 463 |

### 3.3 Module admin (`backend/src/admin/`, prefixe `admin`, classe sous `@Roles('ADMIN')`)

admin.controller.ts :

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| GET | /admin/stats | ADMIN | - | Stats globales | 13 |
| GET | /admin/activity | ADMIN | limit | Flux d'activite recente | 16 |
| GET | /admin/health | ADMIN | - | Sante systeme | 19 |
| GET | /admin/timeline | ADMIN | - | Timeline des transactions | 22 |

admin-analytics.controller.ts :

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| GET | /admin/analytics | ADMIN | - | Analytics utilisateurs (totaux, par role, journalier, funnel) | 22 |
| GET | /admin/monitoring | ADMIN | - | Monitoring statique des services | 36 |
| GET | /admin/dashboard | ADMIN | - | Dashboard (delegue analytics) | 46 |
| GET | /admin/rapports | ADMIN | - | Liste de rapports preconfigures | 49 |
| GET | /admin/moderation | ADMIN | - | Signalements (stub) | 63 |
| GET | /admin/livraison | ADMIN | - | Livraisons (stub) | 66 |
| PATCH | /admin/livraison/:id/assign | ADMIN | id, {livreur} | Assigne un livreur a une commande | 69 |
| GET | /admin/communication | ADMIN | - | Messages/campagnes (stub) | 85 |
| GET | /admin/cron | ADMIN | - | Statut des taches cron (stub) | 88 |
| GET | /admin/scores | ADMIN | - | Liste des scores | 96 |
| GET | /admin/health | ADMIN | - | Healthcheck (collision avec admin.controller.ts:19) | 107 |

admin-wallets.controller.ts (prefixe `admin/wallets`, `@Roles('ADMIN')`) : stats, stats/chart, liste, transactions, bloquer/reinitialiser/credit/debit par userId, export CSV wallets et transactions, audit logs, config/items (CRUD + upload-logo), config/parametres, config/banques/attente, config/banques/notifier/:banqueId. Lignes 21 a 158. Ce controleur partage le prefixe `admin/wallets` avec `wallets-admin.controller.ts` (collision, voir section 8).

### 3.4 Module wallets et paiements

wallets.controller.ts (prefixe `wallets`, classe sous `JwtAuthGuard`) :

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| GET | /wallets/me | authentifie | - | Mon wallet | 22 |
| GET | /wallets/me/transactions | authentifie | - | Mes transactions | 29 |
| POST | /wallets/me/recharge-mobile | authentifie | {provider,montant,telephone} | Recharge mobile money via BPay (min 200) | 36 |
| POST | /wallets/me/retrait-mobile | authentifie | {provider,montant,telephone} | Retrait vers mobile money (debit + rollback) | 61 |
| GET | /wallets/me/pending | authentifie | - | Mes transactions BPay en attente | 120 |
| POST | /wallets/me/statut-paiement | authentifie | {payToken} | Verifie le statut d'un paiement | 129 |

wallets-public.controller.ts (prefixe `wallets`, public) :

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| POST | /wallets/public/pay | public | PublicPayBody | Paiement QR public vers un marchand via BPay | 47 |
| POST | /wallets/public/pay-callback | public | BpayCallbackBody | Callback BPay, credite le marchand sur SUCCESS | 80 |
| POST | /wallets/public/statut-paiement | public | {payToken} | Statut de paiement public | 128 |
| GET | /wallets/public/:marchandId | public | marchandId | Infos marchand pour la page QR | 134 |

wallets-admin.controller.ts (prefixe `admin/wallets`, `@Roles('admin','super_admin')`) : stats (SQL brut), stats/chart (30 jours + top 10), liste paginee, export CSV wallets, transactions paginees + export CSV, detail wallet `:userId` (50 dernieres tx), credit/debit/bloquer/debloquer/reinitialiser par userId (audites + SMS), audit/logs, config/items (CRUD + upload-logo disque 2 Mo), config/parametres (GET/PUT), config/banques/attente, config/banques/notifier/:banqueId. Lignes 29 a 422.

bpay.controller.ts (prefixe `bpay`) :

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| POST | /bpay/callback | public (verifie en-tete x-bpay-secret / x-webhook-secret) | body, headers | Webhook BPay, credite le wallet sur SUCCESS (tx verrouillee) | 21 |
| GET | /bpay/pending/:userId | authentifie + controle in-code (admin ou proprietaire) | userId | Transactions BPay en attente d'un utilisateur | 133 |

### 3.5 Module caisse-rest

caisse-rest.controller.ts contient deux controleurs (classe sous `JwtAuthGuard`).

CaisseRestController (prefixe `caisse`) :

| Methode | Chemin | Roles | Parametres | Description | Ligne |
|---|---|---|---|---|---|
| GET | /caisse/transactions | authentifie | - | Mes transactions caisse | 23 |
| POST | /caisse/transactions | authentifie | body | Cree une transaction caisse (valide type/montant) | 28 |
| GET | /caisse/session/:date | authentifie | date | Session de caisse d'une date | 56 |
| POST | /caisse/session/ouvrir | authentifie | body | Ouvre la session du jour | 65 |
| POST | /caisse/session/fermer | authentifie | body | Ferme la session du jour | 80 |
| POST | /caisse/vente | authentifie | body | Enregistre une vente (event + controle stock) | 90 |
| POST | /caisse/depense | authentifie | body | Enregistre une depense (event) | 127 |
| GET | /caisse/produits | authentifie | - | Produits actifs du marchand | 142 |
| POST | /caisse/produits | authentifie | body | Cree un produit | 151 |
| PUT | /caisse/produits/:id | authentifie | id, body | Met a jour un produit | 160 |
| DELETE | /caisse/produits/:id | authentifie | id | Supprime un produit (actif=false) | 169 |

CatalogueController (prefixe `catalogue`) : GET /catalogue (categorie, q) ligne 215 ; GET /catalogue/categories ligne 232.

credits.controller.ts (prefixe `caisse/credits`) : GET (liste + total du) l.14, POST (cree credit + upsert client) l.29, PATCH `:id/payer` l.76, PATCH `:id/acompte` l.103, GET `clients` l.134, GET `clients/:nom` l.147. Tous authentifie.

objectifs.controller.ts (prefixe `objectifs`) : GET /objectifs/today l.19, POST /objectifs/today l.28, PATCH /objectifs/alerte l.47. Tous authentifie.

raccourcis.controller.ts (prefixe `raccourcis`) : GET l.17, POST (max 5) l.23, PATCH `:id` l.41, DELETE `:id` l.54, GET `match/:texte` l.64. Tous authentifie. Variante : `backend/src/raccourcis/raccourcis.controller.ts` (GET, POST max 5, DELETE `:id`, GET `match/:texte`).

rapport-hebdo.controller.ts (prefixe `rapport`) : GET /rapport/hebdo l.20 (rapport hebdomadaire, texte GPT-4o + TTS ElevenLabs base64). Doublon avec `rapport/rapport.controller.ts` GET /rapport/hebdo.

### 3.6 Module production

producteurs-rest.controller.ts (prefixe `producteurs`) : GET /producteurs/recoltes-prevues l.44, authentifie + controle in-code (role marchand et sousProfilMarchand grossiste uniquement, sinon 403). Tri par distance Haversine depuis la commune de la cooperative.

cycles producteur (`producteur/cycles/cycles.controller.ts`, prefixe `cycles`, `JwtAuthGuard`) : POST l.31, GET l.38, GET `:id` l.45, PATCH `:id` l.52, DELETE `:id` l.63, POST `:id/complete` l.70. Collision de prefixe avec cycles-rest.

cycles-rest.controller.ts (prefixe `cycles`, SQL brut) : GET l.12, GET `:id` l.21, POST l.29, PATCH `:id` l.41, DELETE `:id` l.65. Tous authentifie.

recoltes producteur (`producteur/recoltes/recoltes.controller.ts`, prefixe `recoltes`) : GET l.19, GET `:id` l.29, POST (statut DECLAREE) l.35, PATCH `:id` l.54, DELETE `:id` l.77. Tous authentifie. Collision de prefixe avec recoltes-rest.

recoltes-rest.controller.ts (prefixe `recoltes`) : GET (pagine) l.14, POST l.25, PATCH `:id` l.59, DELETE `:id` l.77. Tous authentifie.

publications-rest.controller.ts (prefixe `publications`, JwtAuthGuard par methode) :

| Methode | Chemin | Roles | Description | Ligne |
|---|---|---|---|---|
| GET | /publications | authentifie | Mes publications | 22 |
| GET | /publications/admin/all | controle in-code (admin_general/super_admin) | Toutes les publications + auteur | 32 |
| GET | /publications/marche | authentifie (logique par role/sous-profil) | Marche filtre | 48 |
| POST | /publications | authentifie | Cree/upsert publication + notif marchands | 103 |
| POST | /publications/republier | controle in-code (marchand grossiste) | Republie vers marche cooperatif | 149 |
| PATCH | /publications/:id | authentifie (proprietaire) | Mise a jour | 208 |
| DELETE | /publications/:id | authentifie | Supprime | 245 |
| PATCH | /publications/:id/toggle | authentifie | Active/suspend | 255 |

stocks-rest.controller.ts (prefixe `stocks`) : GET l.14, POST l.61, PATCH `:id` l.81, DELETE `:id` l.111. Tous authentifie. La logique branche selon role : cooperateur/producteur vers table `stocks`, sinon marchand vers table `produits`.

revenus.controller.ts (prefixe `revenus`) : GET /revenus l.12, authentifie (revenus derives des recoltes : prix x quantite + total).

### 3.7 Module marche et commandes

marches.controller.ts (prefixe `marches`) :

| Methode | Chemin | Roles | Description | Ligne |
|---|---|---|---|---|
| GET | /marches | public | Liste filtree (commune, statut, zoneId, region, actif) | 32 |
| POST | /marches/suggestion | authentifie | Suggere un marche (statut en_attente) + notif admins | 84 |
| GET | /marches/:id | ADMIN, super_admin | Detail d'un marche | 106 |
| POST | /marches | ADMIN, super_admin | Cree un marche | 113 |
| PATCH | /marches/:id | ADMIN, super_admin, admin_general, admin_national, gestionnaire_zone | Met a jour / valide statut | 120 |
| DELETE | /marches/:id | ADMIN, super_admin | Supprime un marche | 142 |

commandes-rest.controller.ts (prefixe `commandes`, classe sous `JwtAuthGuard`) :

| Methode | Chemin | Roles | Description | Ligne |
|---|---|---|---|---|
| GET | /commandes | authentifie (marchand/producteur/cooperateur) | Liste commandes (acheteur/vendeur, paginee) | 25 |
| POST | /commandes | authentifie | Cree une commande (achat ou vente_directe) + notif | 81 |
| PATCH | /commandes/:id/livrer | authentifie (vendeur) | Marque livree | 140 |
| POST | /commandes/:id/paiement | authentifie (vendeur) | Encaisse (especes ou wallet Keiwa avec transfert) | 150 |
| PATCH | /commandes/:id | authentifie (acheteur/vendeur) | Met a jour statut/livraison/notes + decrement stock si confirmee | 220 |
| POST | /commandes/negociation | authentifie | Propose une negociation de prix | 311 |
| GET | /commandes/negociations | authentifie | Mes negociations | 336 |
| PATCH | /commandes/negociation/:id/repondre | authentifie (vendeur) | Repond (accepte/refuse/contre-offre, max 3) | 345 |
| PATCH | /commandes/negociation/:id/marchand-repondre | authentifie (marchand) | Marchand accepte/refuse la contre-offre | 417 |

### 3.8 Module cooperatives (`cooperatives-rest.controller.ts`, prefixe `cooperatives`, classe sous `JwtAuthGuard, RolesGuard`)

La plupart des methodes appliquent un controle in-code "president" (responsable) via `resolveUserCooperative`. Endpoints (lignes citees) :
- GET /cooperatives l.62 (ma coop), GET /cooperatives/membres l.75, POST /cooperatives/membres (president) l.108.
- GET /cooperatives/tresorerie l.142, POST /cooperatives/tresorerie (president, statut en_attente) l.166, PATCH /cooperatives/tresorerie/:id (president, valider/annuler) l.190.
- GET /cooperatives/besoins l.214, POST /cooperatives/besoins l.276, PATCH /cooperatives/besoins/:id l.309, POST /cooperatives/besoins/consolider l.343.
- GET /cooperatives/ma-cooperative l.378, GET /cooperatives/search-marchand (president) l.425, PATCH /cooperatives/membres/:id/statut (president) l.452, DELETE /cooperatives/membres/:id (president) l.473, PATCH /cooperatives/membres/:id/role (president) l.487.
- GET /cooperatives/commandes-groupees l.508 et POST l.517 (features mortes, pas d'ecriture), POST /cooperatives/distribution l.527 (non persistee).
- POST /cooperatives/commandes/:id/cloture l.547, POST /cooperatives/cotisation l.576, POST /cooperatives/rejoindre/:id l.601, GET /cooperatives/liste l.623, GET /cooperatives/:id l.634.
- POST /cooperatives (super_admin, admin_general, cooperateur) l.639, PATCH /cooperatives/:id (super_admin, admin_general, cooperateur) l.645.

### 3.9 Module transactions-rest (`transactions-rest.controller.ts`, prefixe `transactions`, classe sous `JwtAuthGuard, RolesGuard`)

| Methode | Chemin | Roles | Description | Ligne |
|---|---|---|---|---|
| GET | /transactions | authentifie | Mes transactions caisse (paginees, isolation user_id) | 40 |
| GET | /transactions/all | super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain | Toutes les transactions (restriction zone) | 48 |
| PATCH | /transactions/:id | super_admin, admin_general, admin_national | Change le statut (motif obligatoire pour gelee/annulee/litige) + audit | 70 |
| GET | /transactions/export | super_admin, admin_general, admin_national | Export csv/xlsx/pdf | 114 |
| GET | /transactions/geo-aggregation | super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain | Agregation par region | 137 |
| GET | /transactions/by-acteur-geo | super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain | Agregation par acteur + geo | 165 |

### 3.10 Module identification et acteurs

identifications.controller.ts (prefixe `identifications`, classe sous `JwtAuthGuard`, `SkipThrottle`, autorisations majoritairement in-code) :

| Methode | Chemin | Roles | Description | Ligne |
|---|---|---|---|---|
| GET | /identifications/geo | in-code (admins) sinon ses propres enregistrements | Points geo (max 5000) | 31 |
| GET | /identifications | in-code (admins) sinon les siens | Liste paginee | 87 |
| GET | /identifications/:id | in-code (admin/proprietaire) | Detail | 122 |
| GET | /identifications/drafts/:identificateurId | in-code (admins/proprietaire) | Brouillons | 135 |
| POST | /identifications/draft | authentifie | Cree/met a jour un brouillon | 178 |
| POST | /identifications | in-code (admins/operateur/identificateur) | Cree une identification (statut en_attente) + SMS + notif | 240 |
| POST | /identifications/create-with-acteur | in-code (identificateur) | Cree acteur + identification + adhesion coop (transaction) | 291 |
| PATCH | /identifications/:id | in-code (admin/proprietaire) | Met a jour (allowlist) + SMS sur changement de statut | 464 |
| DELETE | /identifications/draft/:id | in-code (admin/proprietaire) | Supprime un brouillon | 534 |
| DELETE | /identifications/:id | super_admin | Supprime un brouillon + audit | 560 |

acteurs-rest.controller.ts (prefixe `acteurs`, classe sous `@Roles('super_admin','admin_general')`) : GET /acteurs l.17, GET /acteurs/:id (super_admin, admin_general, identificateur) l.30, PATCH /acteurs/:id l.36 (changements role/status/validated reserves super_admin).

dossiers-rest.controller.ts (prefixe `dossiers`, `@Roles('identificateur','admin','super_admin')`) : POST l.20, GET l.35, GET `:id` l.43, PATCH `:id` l.52. L'identificateur est limite a ses propres dossiers ; la validation bascule `users.validated`.

### 3.11 Module mutations et missions

mutations.controller.ts (prefixe `mutations`, classe sous `JwtAuthGuard`, `SkipThrottle`) : GET /mutations l.38 (in-code admins sinon les siennes), POST /mutations l.71 (une seule en attente a la fois), PATCH /mutations/:id/decision l.113 (super_admin, admin_general, admin_national, gestionnaire_zone ; rejet exige un motif >= 10 caracteres ; approbation super_admin cree une mission).

missions.controller.ts (prefixe `missions`, classe sous `JwtAuthGuard, RolesGuard`) : GET (super_admin, admin, institution) l.14, GET `:id` (super_admin, admin, institution) l.19, POST (super_admin) l.22, PATCH `:id` (super_admin, admin) l.29, DELETE `:id` (super_admin, suppression douce statut supprime) l.38.

### 3.12 Module zones et divisions

zones.controller.ts (prefixe `zones`, classe sous `JwtAuthGuard, RolesGuard`) : GET (ADMIN, super_admin, identificateur) l.12, GET /zones/territoires (ADMIN, super_admin) l.18, GET /zones/villes l.24, GET /zones/public/:id (tout authentifie) l.30, POST l.35, PATCH `:id` l.47, DELETE `:id` l.59 (les ecritures : ADMIN, super_admin).

admin-divisions.controller.ts (prefixe `admin-divisions`, public) : GET /districts l.9, GET /regions (district_id) l.14, GET /departements (region_id) l.20, GET /communes (departement_id) l.26, POST /reverse-geocode l.32.

### 3.13 Module institutions

institutions.controller.ts (prefixe `institutions`, classe sous `JwtAuthGuard, RolesGuard`) : GET (super_admin, admin, institution) l.18, GET `:id` l.23, POST (super_admin, admin) l.26, PATCH `:id` (super_admin, admin) l.49, DELETE `:id` (super_admin) l.71.

institution-dashboard.controller.ts (prefixe `institution`, `@Roles('institution','super_admin','admin')`) : GET /institution/dashboard l.24, GET /institution/acteurs (max 5000) l.147, GET /institution/transactions l.179.

### 3.14 Modules transverses

academy.controller.ts (prefixe `academy`, `JwtAuthGuard`) : GET /modules l.30, POST /modules (admin academy) l.49, PATCH /modules/:id l.58, DELETE /modules/:id l.69, GET /questions l.79, POST /questions l.93, PATCH /questions/:id l.100, DELETE /questions/:id l.111, POST /modules/:id/enroll l.120, PATCH /modules/:id/progress l.137, GET /modules/:id/progress l.165, GET /my-progress l.172, GET /stats l.180. Roles admin academy = super_admin, admin_general, admin_national (constante l.18).

notifications.controller.ts (prefixe `notifications`, `JwtAuthGuard`) : POST /push-token l.18, GET /bo/counts (5 roles BO) l.24, GET / l.43, GET /trash l.48, POST / l.53, PATCH /read-all l.67, PATCH /:id/read l.73, PATCH /:id/restore l.78, DELETE /:id l.84, POST /send (admin, institution, identificateur, super_admin) l.92, POST /notify-member (cooperateur, marchand, producteur) l.119, POST /send-bulk (admin, institution, super_admin ; max 500) l.140, POST /dossier-valide (super_admin, admin) l.177, POST /dossier-rejete l.190, POST /alertes/run l.203, POST /alertes/check-user l.211, POST /statut-change l.225.

tickets-rest.controller.ts (prefixe `tickets`, classe sous `JwtAuthGuard, RolesGuard`) : GET (roles BO) l.25, GET /mes-tickets l.32, POST l.42, PATCH /:id (BO) l.62, POST /:id/statut (BO) l.70, POST /:id/reponse (BO) l.78, PATCH /:id/lu (BO) l.94, GET /count/non-lus (BO) l.102. ROLES_BO = super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain (l.17).

voice.controller.ts : VoiceController (prefixe `voice`) POST /process l.41, POST /intent-fast l.70, POST /intent l.94 ; TtsController (prefixe `tts`) POST /openai l.136. Tous `JwtAuthGuard`, throttle 60/60s.

financial-score.controller.ts (prefixe `financial-score`, `JwtAuthGuard`) : GET /:userId l.21 (soi-meme ou role admin sinon 403).

scores.controller.ts (prefixe `scores`, `JwtAuthGuard, RolesGuard`) : GET (super_admin, admin, institution) l.19, GET /me l.29 (score calcule par role).

partner.controller.ts (prefixe `partner`) : GET /financial-score/:userId (ApiKeyGuard, cle API) l.32, GET /api-keys (JWT + assertBoAdmin) l.38, POST /api-keys l.45, PATCH /api-keys/:id l.58.

audit-rest.controller.ts (prefixe `audit`, classe `@Roles('ADMIN')`) : GET /me (override @Roles vide, tout authentifie) l.17, GET / (ADMIN, paginee) l.30, POST / (ADMIN) l.31.

user-flags.controller.ts (prefixe `users/flags`, `JwtAuthGuard, RolesGuard`) : POST (super_admin, admin_general, admin_national, gestionnaire_zone) l.14, GET (les precedents + operateur_terrain) l.21, PATCH /:id/resolve (super_admin, admin_general, admin_national) l.35.

oneci.controller.ts (prefixe `oneci`, `JwtAuthGuard`) : GET /lookup/:nni l.8, GET /quota l.11.

misc-rest.controller.ts (prefixe vide `@Controller()`, `JwtAuthGuard, RolesGuard`) : GET /supervision l.17, GET /demandes l.22, GET /academy/produits l.27, GET /livraison l.37, GET /cron l.42, PATCH /cron/:id/toggle (super_admin, admin_general) l.61, POST /cron/:id/retry l.84, GET /communication l.91, GET /system/settings l.96, GET /support/config l.111, POST /support/config (super_admin, admin_general) l.125, GET /dashboard/stats (super_admin, admin_general, admin_national, gestionnaire_zone) l.150, GET /transactions (super_admin, admin_general, admin_national) l.197.

health.controller.ts (prefixe `health`, public) : GET /health l.5.

### 3.15 Collisions de routes - resolution (source `backend/src/app.module.ts` et tableaux `controllers:`)

Principe NestJS verifie : une route n'est montee que si son controleur figure dans le tableau `controllers:[...]` d'un module effectivement importe dans le graphe a partir de `AppModule`. Quand deux controleurs montes declarent la meme route, le dernier enregistre (ordre des `imports` d'`AppModule` puis ordre du tableau `controllers`) ecrase le precedent. Ordre de reference des imports dans `app.module.ts` : `WalletsModule` l.78, `AdminModule` l.82, `CyclesRestModule` l.94, `RecoltesRestModule` l.95, `CaisseRestModule` l.106. Les modules `producteur/cycles`, `producteur/recoltes`, `rapport`, `raccourcis` (standalone) sont ABSENTS du tableau `imports`.

| Collision | Controleurs en presence | Verdict (handler actif) |
|---|---|---|
| `admin/wallets` | admin-wallets.controller.ts (`AdminWalletsController`, monte via `AdminModule`, `admin.module.ts:15`) vs wallets-admin.controller.ts (`WalletsAdminController`) | Pas de collision reelle. `WalletsAdminController` n'est dans aucun tableau `controllers:` (code mort). Actif = `AdminWalletsController`. Les routes propres a wallets-admin (`:userId/debloquer`, `config/parametres` PUT, `GET :userId`) ne sont jamais exposees. |
| `wallets` | wallets.controller.ts (`me/*`) vs wallets-public.controller.ts (`public/*`) | Pas de collision : chemins disjoints. Les deux montes via `WalletsModule` (`wallets.module.ts:14`). |
| `admin` GET /admin/health | admin.controller.ts l.19 vs admin-analytics.controller.ts l.107, meme module `AdminModule` (`admin.module.ts:15`, ordre `[AdminController, AdminAnalyticsController, AdminWalletsController]`) | Collision reelle. `AdminAnalyticsController` enregistre apres `AdminController` : actif = `AdminAnalyticsController.health()` (l.107). Le handler de admin.controller.ts:19 est ecrase. |
| `cycles` | producteur/cycles/cycles.controller.ts (module non importe) vs cycles-rest.controller.ts (`CyclesRestModule`, app.module.ts:94) | Pas de collision. Actif = `CyclesRestController`. La route producteur `POST :id/complete` n'existe pas en runtime. |
| `recoltes` | producteur/recoltes/recoltes.controller.ts (module non importe) vs recoltes-rest.controller.ts (`RecoltesRestModule`, app.module.ts:95) | Pas de collision. Actif = `RecoltesRestController`. La route producteur `GET :id` n'existe pas en runtime. |
| `rapport/hebdo` | rapport/rapport.controller.ts (module non importe) vs caisse-rest/rapport-hebdo.controller.ts (`CaisseRestModule`, app.module.ts:106) | Pas de collision. Actif = `RapportHebdoController` (caisse-rest). |
| `raccourcis` | raccourcis/raccourcis.controller.ts (module non importe) vs caisse-rest/raccourcis.controller.ts (`CaisseRestModule`) | Pas de collision. Actif = `RaccourcisController` de caisse-rest (GET, POST max 5, PATCH :id, DELETE :id, GET match/:texte). |

Conclusion : code mort non expose (jamais monte) = `WalletsAdminController`, et les controleurs standalone `producteur/cycles`, `producteur/recoltes`, `rapport`, `raccourcis`. Seul `GET /admin/health` est une vraie collision (resolue en faveur de admin-analytics).

---

## 4. Inventaire des ecrans (frontend)

Source des chemins de route : `frontend_src/src/app/routes.tsx`. Les routes hors back-office sont enveloppees par `AppLayout` (ou `InstitutionLayout`, `IdentificateurLayout`) sous `RootLayout`. Le gating de role/profil est applique par `EntryGate` (auth/EntryGate.tsx) et par les composants (sous-profil marchand, president cooperative, permissions BO).

### 4.1 Ecrans d'authentification (publics)

| Route | Ecran | Acces | Actions cles | Fichier |
|---|---|---|---|---|
| / | EntryGate | public | Aiguillage splash/onboarding/login/app, redirection par role, /change-password si mustChangePassword | components/auth/EntryGate.tsx |
| /welcome | Welcome (splash) | public | Bouton "Commencer" | components/auth/Welcome.tsx |
| /login | LoginPassword | public | Saisie telephone (+225, 10 chiffres) puis PIN 4 chiffres, biometrie WebAuthn, verrouillage apres 5 essais (15 min) | components/auth/LoginPassword.tsx |
| /change-password | ChangePasswordScreen | authentifie | Ancien mdp, nouveau (min 4), confirmation, POST /auth/change-password | components/auth/ChangePasswordScreen.tsx |
| /non-enregistre | UnregisteredPhone | public | Telephone non enregistre, lien support, retour | components/auth/UnregisteredPhone.tsx |
| /backoffice/login | BOLogin | public | Identifiant telephone OU email (BO), mdp, biometrie, modal recuperation super_admin | components/backoffice/BOLogin.tsx |

### 4.2 Application Marchand (`/marchand`, AppLayout)

| Route | Ecran | Actions cles | Fichier |
|---|---|---|---|
| /marchand | MarchandHome | Vue simple/avancee, ouverture/fermeture journee, fond de caisse, KPIs, vente vocale, notifications | components/marchand/MarchandHome.tsx |
| /marchand/caisse | POSCaisse | Recherche produit, panier (+/-), encaisser, vente a credit, modes de paiement | components/marchand/POSCaisse.tsx |
| /marchand/cahier | MarchandDepenses | Liste depenses, KPIs filtrants, recherche, filtres date, noter une depense | components/marchand/MarchandDepenses.tsx |
| /marchand/depense | DepenseForm | Saisie de depense en 2 etapes : choix categorie (3 actions rapides Transports/Nourritures/Taxe mairie + categories depliables + micro vocal Tata Lou), puis pave numerique tactile et "Enregistrer la depense" (modal de confirmation vocale) | components/marchand/DepenseForm.tsx |
| /marchand/stock | GestionStock | Ajouter/vendre produit, recherche vocale, tri marge, swipe-delete, reapprovisionnement, edition inline | components/marchand/GestionStock.tsx |
| /marchand/marche | MarcheVirtuel | Onglets par sous-profil, panier, favoris, commander, negocier, republier (grossiste), paiement (Keiwa/Mobile Money) + PIN | components/marchand/MarcheVirtuel.tsx |
| /marchand/recoltes-prevues | RecoltesPrevues | Lecture seule (reservee grossiste), tri par distance | components/marchand/RecoltesPrevues.tsx |
| /marchand/profil | MarchandProfil | Carte profil, reglages, academy, Keiwa, coop, documents, support, langue, deconnexion | components/marchand/MarchandProfil.tsx (delegue shared/UniversalProfil.tsx) |
| /marchand/ventes-passees | VentesPassees | Export PDF, recherche, filtres source/date, credits (marquer paye) | components/marchand/VentesPassees.tsx |
| /marchand/resume-caisse | ResumeCaisse | 4 KPIs (gagne/depense/net/en caisse), selecteur de periode (aujourd'hui/7j/ce mois/perso), carte vocale Tantie Lou, heure de pointe, courbe d'evolution, produit star, top 5 produits (pas d'export) | components/marchand/ResumeCaisse.tsx |
| /marchand/commandes | MesCommandes | Filtres type/statut, annuler/confirmer/refuser/livrer/payer, contre-offre | components/marchand/MesCommandes.tsx |
| /marchand/alertes | MarchandAlertes | Alertes temps reel derivees du stock/session (ruptures, stock faible, journee non ouverte, surstock), badge d'urgence par carte, bouton d'action et ignorer, "Rafraichir", conseil vocal Tata Lou | components/marchand/MarchandAlertes.tsx |
| /marchand/parametres | Parametres | Delegue a `UniversalParametres role="marchand"` (shared/UniversalParametres.tsx) | components/marchand/Parametres.tsx |
| /marchand/cooperative | MaCooperative | Adhesion, payer cotisation 25 000 FCFA, rejoindre une coop | components/marchand/MaCooperative.tsx |
| /marchand/cooperative/besoin | BesoinMarchand | Formulaire "Soumettre un besoin" a la coop : produit (autocomplete catalogue), categorie auto, quantite, unite, prix max optionnel, priorite, notes ; ecran de confirmation | components/marchand/BesoinMarchand.tsx |

### 4.3 Application Producteur (`/producteur`, AppLayout)

| Route | Ecran | Actions cles | Fichier |
|---|---|---|---|
| /producteur | ProducteurHome | KPIs recoltes/revenus, message vocal, modals KPI, academy | components/producteur/ProducteurHome.tsx |
| /producteur/production | ProducteurProduction | 4 onglets (Plantation/Recoltes/Marche/Historique), nouvelle plantation, publier, modifier prix | components/producteur/ProducteurProduction.tsx |
| /producteur/commandes | CommandesProducteurPage (ProducteurCommandes) | KPIs filtrants, demandes marchands accepter/negocier/refuser, ajouter commande (stepper 3), encaisser | components/producteur/CommandesProducteurPage.tsx |
| /producteur/profil | ProducteurMoi | Delegue a `UniversalProfil role="producteur"` (shared/UniversalProfil.tsx) | components/producteur/ProducteurMoi.tsx |
| /producteur/declarer-recolte | RecolteForm | Culture, photo, quantite/unite (conversion kg), qualite, prix, localisation, date | components/producteur/RecolteForm.tsx |
| /producteur/recoltes | MesRecoltesPage | KPIs, filtres statut, detail recolte, declarer | components/producteur/MesRecoltesPage.tsx |
| /producteur/stocks | StocksWrapper | Conteneur "Mes stocks" a 2 onglets (Stocks, Revenus) deleguant aux composants Stocks et Revenus | components/producteur/StocksWrapper.tsx |
| /producteur/publier-recolte | PublierRecolte | Produit, quantite/unite, prix, stock, localisation, photo, POST /publications | components/producteur/PublierRecolte.tsx |
| /producteur/parametres | ProducteurParametres | Delegue a `UniversalParametres role="producteur"` | components/producteur/ProducteurParametres.tsx |
| /producteur/alertes | ProducteurAlertes | Alertes agricoles derivees des cycles/recoltes/publications (recoltes proches, stocks bas/epuises, recoltes non declarees en retard, offres sans acheteur), boutons d'action et "Ignorer les infos" | components/producteur/ProducteurAlertes.tsx |

### 4.4 Application Cooperative (`/cooperative`, AppLayout)

| Route | Ecran | Actions cles | Fichier |
|---|---|---|---|
| /cooperative | CooperativeHome | KPI volume groupe, tresorerie, cotisations, bannieres adhesions | components/cooperative/CooperativeHome.tsx |
| /cooperative/membres | Membres | Recherche, filtres, notifier, suspendre/promouvoir/exclure, accepter/refuser, ajouter marchand | components/cooperative/Membres.tsx |
| /cooperative/finances | FinancesCooperative | KPIs, ajouter transaction (en_attente), valider/annuler | components/cooperative/FinancesCooperative.tsx |
| /cooperative/tresorerie | TresorerieCooperative | Nouvelle entree/sortie, detail transaction (sans valider/annuler) | components/cooperative/TresorerieCooperative.tsx |
| /cooperative/profil | CooperativeProfil | Delegue a `UniversalProfil role="cooperative"` | components/cooperative/CooperativeProfil.tsx |
| /cooperative/stock | Stock | Ajouter/collecter, editer, supprimer, distribuer | components/cooperative/Stock.tsx |
| /cooperative/marche | MarcheHub | Vues Achats/Ventes/Historique, commander, publier, retirer, negocier, cloturer | components/cooperative/MarcheHub.tsx |
| /cooperative/commandes | Commandes | Negociations, nouvelle commande, faire avancer le statut, payer/cloturer, besoins membres (dispatch president) | components/cooperative/Commandes.tsx |
| /cooperative/parametres | CooperativeParametres | Delegue a `UniversalParametres role="cooperative"` | components/cooperative/CooperativeParametres.tsx |

### 4.5 Application Identificateur (`/identificateur`, IdentificateurLayout)

| Route | Ecran | Actions cles | Fichier |
|---|---|---|---|
| /identificateur | IdentificateurHome | Recherche acteur, nouveau dossier, compteurs (brouillons/en attente/valides/rejetes), territoire | components/identificateur/IdentificateurHome.tsx |
| /identificateur/identification, /fiche-identification | FicheIdentificationDynamique | Assistant multi-etapes (profil + stepper 7-8), GPS CI, signature, brouillon, soumission | components/identificateur/FicheIdentificationDynamique.tsx |
| /identificateur/suivi | SuiviIdentifications | KPIs filtrants, filtres type/statut, consulter, modifier | components/identificateur/SuiviIdentifications.tsx |
| /identificateur/brouillons | MesBrouillons | Reprendre, supprimer (confirmation) | components/identificateur/MesBrouillons.tsx |
| /identificateur/acteurs, /identifications | Identifications | Liste des dossiers (sensible) : 4 KPIs cliquables filtrants, "Nouveau dossier", "Acteurs (bientot)" desactive, onglets par role, recherche nom/telephone, sections (Soumissions/Valides/Rejetes/Complements), detail via FicheActeurDetailModal | components/identificateur/Identifications.tsx |
| /identificateur/profil | IdentificateurProfil | Delegue a `UniversalProfil role="identificateur"` | components/identificateur/IdentificateurProfil.tsx |
| /identificateur/acteur/:numero | ActeurDetails | Detail acteur, reprendre/modifier (lecture seule si hors-zone) | components/identificateur/ActeurDetails.tsx |
| /identificateur/demande-mutation | DemandeMutation | Zone destination, raison (20-500 caracteres), envoyer | components/identificateur/DemandeMutation.tsx |
| /identificateur/statistiques | IdentificateurStats | "Statistiques" : 2 KPIs (Total, Objectif), barre de progression objectif du mois, courbe activite par jour, camembert par commune, barres top produits (pas d'export) | components/identificateur/IdentificateurStats.tsx |
| /identificateur/rapports | RapportsIdentificateur | "Rapports" (sensible) : 4 KPIs cliquables (modals), 2 onglets (Rapports/Performance), recherche, filtres avances, liste mensuelle avec "Telecharger PDF" (jsPDF) et "Details", onglet Performance avec graphiques, partage WhatsApp/Email/impression | components/identificateur/RapportsIdentificateur.tsx |
| /identificateur/dashboard | IdentificateurDashboard | Tableau de bord (sensible) : header nom/zone + "Nouveau", 4 KPIs, CTA "Nouveau dossier", "Missions en cours" (progression + prime), "Dernieres identifications" (lien vers suivi), "Informations de ma zone" | components/identificateur/IdentificateurDashboard.tsx |
| /identificateur/parametres | IdentificateurParametres | Delegue a `UniversalParametres role="identificateur"` ; reexporte IdentificateurPinChangeSection (changement de PIN) | components/identificateur/IdentificateurParametres.tsx |

### 4.6 Application Institution (`/institution`, InstitutionLayout)

| Route | Ecran | Actions cles | Fichier |
|---|---|---|---|
| /institution | InstitutionHome | Vue macro nationale, 9 KPIs, resume du jour, alertes critiques, ecouter (vocal) | components/institution/InstitutionHome.tsx |
| /institution/analytics | Analytics | 3 onglets (Global/Regional/Secteur), filtres avances | components/institution/Analytics.tsx |
| /institution/acteurs | InstitutionActeurs | Liste, filtres type/region, detail (4 onglets) | components/institution/InstitutionActeurs.tsx |
| /institution/supervision | InstitutionSupervision | Periodes, audit log, export, sous-onglets statut, valider/rejeter | components/institution/InstitutionSupervision.tsx |
| /institution/parametres | InstitutionParametres | Delegue a `UniversalParametres role="institution"` | components/institution/InstitutionParametres.tsx |
| /institution/profil | InstitutionProfil | Delegue a `UniversalProfil role="institution"` | components/institution/InstitutionProfil.tsx |
| /institution/dashboard | Dashboard | "Dashboard Analytics National" : 4 KPIs (utilisateurs actifs, transactions, volume Mds FCFA, taux activite), courbe d'evolution du volume, camembert par role (donnees via useInstitutionData ; pas d'export visible) | components/institution/Dashboard.tsx |
| /institution/dashboard-analytics | DashboardAnalytics | Dashboard analytique avance : selecteur de periode (7/30/90j, 1 an), KPIs nationaux, stats par role, top produits, alertes non lues, graphiques Area/Bar/Line/Pie | components/institution/DashboardAnalytics.tsx |
| /institution/audit-trail | AuditTrail | KPIs, export CSV, filtres action/role, detail evenement, pagination | components/institution/AuditTrail.tsx |

### 4.7 Back-office (`/backoffice`, BORoot)

Acces gouverne par `BORoot` + permissions BO. Index redirige vers /backoffice/dashboard.

| Route | Ecran | Actions cles | Fichier |
|---|---|---|---|
| /backoffice/dashboard | BODashboard | KPIs cliquables, acces rapide, inscriptions mensuelles, flux en direct (blocs gates par hasPermission) | components/backoffice/BODashboard.tsx |
| /backoffice/acteurs | BOActeurs | Onglets role, filtres statut/alerte, export CSV (avertissement PII), nouvel acteur, actions par ligne (suspendre/reactiver/PIN/reset/supprimer) | components/backoffice/BOActeurs.tsx |
| /backoffice/acteurs/nouveau | NouvelActeurPage | Wrapper de l'assistant d'enrolement BO | components/backoffice/NouvelActeurPage.tsx |
| /backoffice/acteurs/:id | BOActeurDetail | Detail acteur, 6 onglets, actions critiques (forcer validation, suspendre, reset, signaler, changer type, supprimer) | components/backoffice/BOActeurDetail.tsx |
| /backoffice/enrolement | BOEnrolement | Onglets dossiers/brouillons/anomalies/admins, valider/rejeter/complement, bulk, validation admin | components/backoffice/BOEnrolement.tsx |
| /backoffice/supervision | BOSupervision | Liste/carte, export CSV/Excel/PDF, filtres, periode, detail (geler/litige/annuler) | components/backoffice/BOSupervision.tsx |
| /backoffice/zones | BOZones | Onglets zones/marches/GPS, nouvelle zone, editer/suspendre/supprimer, saisie GPS | components/backoffice/BOZones.tsx |
| /backoffice/carte | BOCarteActeurs | Carte Leaflet d'acteurs par role, toggles de filtre, KPIs cliquables (tous/geo/zones/sans GPS), drawer "acteurs a geolocaliser" + formulaire de localisation (geocodage Nominatim OpenStreetMap) ; donnees via /identifications/geo, /identifications, /zones | components/backoffice/BOCarteActeurs.tsx |
| /backoffice/academy | BOAcademy | Onglets vue/modules/questions, CRUD modules et questions | components/backoffice/BOAcademy.tsx |
| /backoffice/missions | BOMissions | Nouvelle mission, filtres, activer/cloturer, classement (Modifier/Analytics desactives) | components/backoffice/BOMissions.tsx |
| /backoffice/parametres | BOParametres | Parametres BO multi-sections (scoring, seuils d'alertes, suspension automatique, regles de commissions, sessions/securite, feature flags, A/B tests, sante des services, changelog), avec boutons Save/Reset | components/backoffice/BOParametres.tsx |
| /backoffice/audit | BOAudit | Timeline immuable, export CSV/PDF, filtres module/role, pagination | components/backoffice/BOAudit.tsx |
| /backoffice/utilisateurs | BOUtilisateurs | Matrice de permissions admins, toggles modules/permissions (auto-save), nouvel utilisateur, reset password | components/backoffice/BOUtilisateurs.tsx |
| /backoffice/institutions | BOInstitutions | super_admin : creer/modifier acces/suspendre/supprimer institutions | components/backoffice/BOInstitutions.tsx |
| /backoffice/profil | BOProfil | Profil/preferences BO : photo (upload), mise a jour profil, sessions actives (parsing user-agent + revocation), logs, preferences, theme, deconnexion | components/backoffice/BOProfil.tsx |
| /backoffice/rapports | BORapports | Graphiques, filtres periode/region, export CSV, boutons PDF (a venir) | components/backoffice/BORapports.tsx |
| /backoffice/notifications | BONotifications | "Centre de notifications" derive des donnees BO reelles (dossiers en attente, acteurs suspendus, zones inactives, audit logs), lecture vocale, "Tout lire", "Nettoyer", filtres par categorie + compteurs, toggle non lues, actions par carte | components/backoffice/BONotifications.tsx |
| /backoffice/support | BOSupport | Gestion support : tickets, contacts, FAQ, general, lieu | components/backoffice/BOSupport.tsx |
| /backoffice/moderation | BOModeration | Signalements, marches a valider, avertir/suspendre/bannir | components/backoffice/BOModeration.tsx |
| /backoffice/contenus | BOContenus | "Contenus dynamiques" (FAQ, bannieres, messages systeme, onboarding, templates notif) : "Nouveau contenu" (si contenus.write), recherche, filtres par type, toggle actif/editer/supprimer ; NB : creations/modifs non persistees (toasts "non persiste") | components/backoffice/BOContenus.tsx |
| /backoffice/monitoring-ia | BOMonitoringIA | "Monitoring IA" (OpenAI/ElevenLabs), reserve Super Admin : selecteur periode, 4 KPIs (requetes/jour, cout cumule, temps reponse, taux erreur), statut des services, graphiques ; donnees via /admin/monitoring | components/backoffice/BOMonitoringIA.tsx |
| /backoffice/event-monitor | EventMonitor | "Event Monitor" reserve Super Admin : surveillance temps reel de l'eventBus, Pause/Reprendre, "Replay 10", Export JSON, Clear, 4 KPIs, filtres (event/priorite/source), tableau d'events avec viewer de payload | components/backoffice/EventMonitor.tsx |
| /backoffice/analytics | BOAnalyticsProduit | "Analytics produit" reserve Super Admin : 4 KPIs (DAU, conversion, retention S4, NPS estime), 4 onglets (Funnel, Retention, Engagement, Drop-off onboarding) ; donnees via /admin/analytics | components/backoffice/BOAnalyticsProduit.tsx |
| /backoffice/mutations | BOMutations | Onglets statut, examiner (DecisionModal approuver/rejeter) | components/backoffice/BOMutations.tsx |
| /backoffice/score-financier | BOScoreFinancier | super_admin : calculer score (UUID/telephone), telecharger PDF | components/backoffice/BOScoreFinancier.tsx |
| /backoffice/api-keys | BOApiKeys | super_admin : creer/activer/desactiver cles API | components/backoffice/BOApiKeys.tsx |
| /backoffice/marketplace | BOMarketplace | "Marketplace" : 4 KPIs (produits publies/en attente/boutiques/CA), 2 onglets (Produits/Boutiques), recherche, filtre statut, moderation produits valider/rejeter/suspendre (PATCH /publications/:id) ; donnees via /publications/admin/all | components/backoffice/BOMarketplace.tsx |
| /backoffice/livraison | BOLivraison | Suivi livraisons : 3 onglets (Courses/Livreurs/Stats), KPIs courses, recherche, statuts de course, graphique temps par zone ; donnees via /admin/livraison | components/backoffice/BOLivraison.tsx |
| /backoffice/communication | BOCommunication | "Communication" (SMS/Push/Email) : "Nouvelle campagne" (si communication.write), 4 KPIs, onglets (Campagnes/Templates/Nouvelle), formulaire campagne ; NB envoi indisponible ("endpoint backend manquant") ; donnees via /communication | components/backoffice/BOCommunication.tsx |
| /backoffice/cron | BOCronDashboard | "Taches planifiees" : 4 KPIs (total/actives/pause/erreur), liste des taches (statut, expression cron, dernieres/prochaines executions), "Relancer" (POST retry) et toggle pause/activer (PATCH toggle) ; donnees via /cron | components/backoffice/BOCronDashboard.tsx |
| /backoffice/config-institution | BOConfigInstitution | super_admin : config interface institution (Enregistrer desactive) | components/backoffice/BOConfigInstitution.tsx |
| /backoffice/keiwa | BOKeiwa | 7 onglets Keiwa : dashboard, wallets, transactions, services, banques, mobile money, parametres | components/backoffice/BOKeiwa.tsx |

### 4.8 Wallet Keiwa (sous chaque app role, prefixe `keiwa`)

Routes presentes a l'identique sous /marchand, /producteur, /cooperative, /institution, /identificateur.

| Sous-route | Ecran | Actions cles | Fichier |
|---|---|---|---|
| keiwa | WalletPage | Creation/verrouillage PIN, solde, QR payer/scanner, recharger/retirer, tuiles transfert/paiements/banque/carte | components/wallet/WalletPage.tsx |
| keiwa/transfert | TransfertPage | Assistant 3 etapes (destinataire, methode, montant) ; envoi "bientot disponible" | components/wallet/TransfertPage.tsx |
| keiwa/paiements | PaiementsPage | Recherche services, categories, payer (modal, sans soumission reelle) | components/wallet/PaiementsPage.tsx |
| keiwa/banque | BanquePage | Lier banque (a venir), m'avertir | components/wallet/BanquePage.tsx |
| keiwa/carte | CartePage | Carte virtuelle, bloquer/debloquer, recharger, plafond | components/wallet/CartePage.tsx |
| keiwa/historique | HistoriquePage | Historique transactions, filtres, detail | components/wallet/HistoriquePage.tsx |

### 4.9 Pages transverses et publiques

| Route | Ecran | Acces | Fichier |
|---|---|---|---|
| {role}/academy | UniversalAcademy | authentifie | components/academy/UniversalAcademy.tsx |
| {role}/support | SupportPage | authentifie | components/shared/SupportPage.tsx |
| /marketplace | Marketplace | authentifie | components/marketplace/Marketplace.tsx (recherche, filtre par region, grille de cartes produit, clic = lecture vocale du produit, pas d'ecran d'achat ; donnees via /caisse/produits) |
| /pay/:marchandId | PayPage | public | components/wallet/PayPage.tsx |
| /pay/success, /pay/error, /paiement/success, /paiement/failed | PaySuccessPage | public | components/wallet/PaySuccessPage.tsx (page resultat minimale : "Paiement effectue" ou "Paiement echoue" selon presence de "error" dans l'URL, bouton unique "Retour") |
| * | NotFound | public | pages/NotFound.tsx |
| /dev-mode, /database, /create-super-admin, /admin-recovery, /setup-marchand | pages diagnostiques | DEV uniquement (`import.meta.env.DEV`) | DevModeHome (redirige vers / et rend null), DatabaseViewer (visualiseur statique du schema, lecture seule), CreateSuperAdmin (bootstrap usage unique, POST /auth/create-super-admin), AdminRecovery (outil d'urgence multi-modes protege par cle JULABA_RECOVERY_2026), SetupMarchand (tests connexion + creation marchands de test) |

---

## 5. Roles et permissions

### 5.1 Roles utilisateurs (source `backend/src/users/entities/user.entity.ts:18-29`)

`UserRole` : producteur, marchand, identificateur, cooperateur, institution, admin_general, admin_national, gestionnaire_zone, operateur_terrain, super_admin.

Sous-categories (source `backend/src/auth/auth.service.ts:20-21`) :
- BO_ROLES : super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain.
- ACTEUR_ROLES : marchand, producteur, cooperateur, institution, identificateur.

Sous-profil marchand (source `backend/src/users/entities/sous-profil-marchand.enum.ts`) : grossiste, demi_grossiste, detaillant.

Statuts utilisateur (`user.entity.ts:31-38`) : pending, actif, suspendu, rejete, en_attente_validation, supprime.

### 5.2 Mecanisme de garde (source `backend/src/auth/guards/roles.guard.ts`)

- `RolesGuard` lit les roles requis via `@Roles(...)`. Sans `@Roles`, il renvoie true (ligne 18) ; seul `JwtAuthGuard` protege alors la route.
- Le token litteral `'ADMIN'` correspond a n'importe quel role de `ADMIN_ROLES = ['admin_general','super_admin','admin_national','gestionnaire_zone','operateur_terrain']` (ligne 5). Sinon comparaison stricte `user.role === role`.
- Connexion email reservee aux BO_ROLES (`auth.service.ts:156-159`). Connexion bloquee pour les statuts suspendu/rejete/en_attente_validation.
- JWT : access token 15 min par defaut, refresh token 7 jours, max 5 sessions par utilisateur (`auth.service.ts:19`), rotation single-use du refresh token.

### 5.3 Matrice de permissions Back-office (source `frontend_src/src/app/config/bo-permissions.ts`)

Le registre `BO_PERMISSION_TREE` definit 21 modules de permissions, chacun avec des feuilles de type view/write/danger. Modules : dashboard (avec KPI et panneaux detailles), acteurs, enrolement, supervision, zones, moderation, mutations, academy, missions, audit, marketplace, livraison, communication, contenus, monitoring_ia, analytics_produit, cron, commissions, utilisateurs (superOnly), parametres / config institution (superOnly).

Le super_admin dispose de tout par definition (`BackOfficeContext.tsx:577`, non re-detaille dans le registre). Les 4 roles BO reglables sont admin_general, admin_national, gestionnaire_zone, operateur_terrain.

Perimetres maximaux (CAPS) par role (lignes 418-425) :
- admin_general : tout sauf les modules superOnly (utilisateurs.*, parametres.*).
- admin_national : comme admin_general, sans `acteurs.delete`.
- gestionnaire_zone : ensemble restreint (`GESTIONNAIRE_ZONE_SCOPE`, lignes 394-406) : acteurs.read/write, enrolement.read/write/validate, supervision.read, zones.read, moderation.read/write, mutations.read/write, audit.read, academy.read, plusieurs KPI dashboard.
- operateur_terrain : ensemble restreint (`OPERATEUR_TERRAIN_SCOPE`, lignes 407-416) : acteurs.read/write/suspend, enrolement.read/validate, supervision.read/write/freeze, moderation.read/write, mutations.read/write, audit.read, academy.read, dashboard.read.

Droits par defaut (DEFAULTS) pre-coches a l'ouverture (lignes 429-459) :
- admin_general : tout le perimetre.
- admin_national : perimetre sauf `acteurs.suspend` et `supervision.freeze`.
- gestionnaire_zone : `GESTIONNAIRE_ZONE_DEFAULT` (lignes 429-439).
- operateur_terrain : `OPERATEUR_TERRAIN_DEFAULT` (lignes 440-447).

Branchement reel (verifie par lecture directe) :
- Le commentaire des lignes 14-15 de `bo-permissions.ts` ("ce fichier n'est branche nulle part", etape A) est PERIME. Le registre EST branche, mais uniquement comme source de l'UI d'edition de la matrice dans `BOUtilisateurs.tsx` (import lignes 12-17) : `BO_PERMISSION_TREE` filtre les modules affiches (l.156), `buildDefaultPermissions(role)` pre-coche (DEFAULTS), `roleCanHave(role, key)` verrouille les cases (CAPS), `allPermissionKeys()` itere. Aucun autre fichier n'importe `bo-permissions.ts`.
- Le controle d'acces runtime est INDEPENDANT du registre. `hasPermission(permission)` est implementee dans `frontend_src/src/app/contexts/BackOfficeContext.tsx:584-592` : si `user.role === 'super_admin'` -> true (l.586) ; sinon si `user.boPermissions` est un objet -> `boPermissions[permission] === true` (l.587-589) ; sinon fallback sur une table en dur SEPAREE `BO_SCREEN_PERMISSIONS` (definie l.131-136, par role) (l.590-591). Il n'utilise ni `BO_PERMISSION_TREE`, ni les CAPS, ni les DEFAULTS du registre.
- La sidebar (`BOLayout.tsx`) masque les entrees via `superOnly` (flag code en dur sur chaque item de `SIDEBAR_MENU`, defini dans BOLayout, pas dans le registre) ET `hasPermission(item.permission)` : items de premier niveau l.888-895, items de groupe l.661-666 (un groupe vide est masque, l.668).
- Gardes d'acces URL sur les 6 ecrans plateforme super-only (BOMonitoringIA, BOAnalyticsProduit, BOApiKeys, BOConfigInstitution, BOInstitutions, BOScoreFinancier) : early-return en tete de composant testant directement `boUser.role !== 'super_admin'` (affiche "Acces reserve"), independamment de `hasPermission` (commit d9e89a235).
- Point d'attention recette : il existe deux definitions paralleles non synchronisees des scopes par role (le registre `bo-permissions.ts` pour l'edition, et `BO_SCREEN_PERMISSIONS` dans BackOfficeContext pour le fallback runtime).
- Liste serveur autorisee des cles `bo_permissions` : voir 5.5.

### 5.4 Matrice role / action (endpoints) - synthese

| Action / capacite | Roles autorises (source endpoint) |
|---|---|
| Creer un acteur | super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain, identificateur (auth.controller.ts:446) |
| Creer un admin | super_admin, admin_general (users.controller.ts:128) ; valider/rejeter : super_admin |
| Creer un utilisateur back-office | super_admin, admin_general, admin_national, gestionnaire_zone (users.controller.ts:169) |
| Modifier la matrice de permissions BO | super_admin (users.controller.ts:394) |
| Supprimer/archiver un utilisateur | ADMIN (users.controller.ts:457) |
| Lister/exporter toutes les transactions | super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain (transactions-rest) |
| Changer le statut d'une transaction (geler/litige/annuler) | super_admin, admin_general, admin_national (transactions-rest:70) |
| Decider d'une mutation | super_admin, admin_general, admin_national, gestionnaire_zone (mutations:113) |
| Creer une mission | super_admin (missions:22) ; modifier : super_admin, admin |
| Valider un dossier (dossiers) | identificateur, admin, super_admin (dossiers-rest) |
| Supprimer une identification (brouillon) | super_admin (identifications:560) |
| Gerer Academy (modules/questions) | super_admin, admin_general, admin_national (academy:18) |
| CRUD institutions | super_admin, admin (institutions) ; suppression : super_admin |
| Dashboard institution | institution, super_admin, admin (institution-dashboard) |
| CRUD zones / marches | ADMIN, super_admin (zones, marches) |
| Gerer les cles API partenaires | BO admin via assertBoAdmin (partner) |
| Resoudre un flag utilisateur | super_admin, admin_general, admin_national (user-flags:35) |
| Operations wallet admin (credit/debit/bloquer/reinit) | admin, super_admin (wallets-admin) et ADMIN (admin-wallets) |
| Republier une publication | marchand grossiste (publications-rest:149, in-code) |
| Recoltes prevues a proximite | marchand grossiste (producteurs-rest:44, in-code) |
| Gestion membres/tresorerie cooperative | president de la cooperative (in-code) |

### 5.5 Liste serveur autorisee des cles `bo_permissions` (source `backend/src/users/users.controller.ts:406-438`)

L'endpoint `PATCH /users/:id/bo-permissions` (super_admin uniquement, l.394-396) valide le corps `bo_permissions` contre une allowlist en dur `ALLOWED_PERMISSIONS` (l.406-438). Toute cle hors liste declenche une `BadRequestException("Permissions invalides : ...")` (l.440-445). Cles autorisees (relevees ligne a ligne) :
- acteurs.read/write/delete/suspend ; enrolement.read/write/validate ; supervision.read/write/freeze ; zones.read/write ; missions.read/write ; audit.read ; utilisateurs.read/write/delete ; parametres.read/write ; academy.read/write ; marketplace.read/write ; livraison.read/write ; communication.read/write ; contenus.read/write ; moderation.read/write ; monitoring_ia.read ; analytics_produit.read ; cron.read (l.407-423).
- Cles ajoutees pour couvrir l'integralite du registre frontend (l.424-437) : mutations.read/write ; commissions.read/write/pay ; dashboard.read ; dashboard.kpi.total_acteurs/actifs/volume/suspendus/attente/transactions/zones ; dashboard.live/inscriptions/repartition/acces_rapide/objectifs ; dashboard.activite_region/alertes/perf_identificateurs/qualite_donnees/activite_directe/sante_systeme.

Le commentaire (l.424-426) precise que cette liste doit rester synchronisee avec `config/bo-permissions.ts` (`allPermissionKeys()`), designe comme source unique de verite des permissions BO. La persistance se fait via `usersService.update(id, { boPermissions }, ...)` (l.450).

---

## 6. Parcours utilisateur par role

Deduits du routage et des ecrans. Le point d'entree commun est `EntryGate` (/), qui aiguille vers splash, onboarding, login, puis la route de role. `mustChangePassword` force `/change-password`.

### 6.1 Marchand
Connexion (telephone + PIN) puis `/marchand`. Parcours principal : ouvrir la journee (MarchandHome) puis encaisser des ventes (POSCaisse, paiement comptant ou a credit), gerer le stock (GestionStock), noter les depenses (MarchandDepenses/DepenseForm), consulter le marche virtuel et passer commande / negocier (MarcheVirtuel), suivre ses commandes et encaisser (MesCommandes), payer la cotisation et rejoindre une cooperative (MaCooperative), fermer la journee. Acces Keiwa (recharge, paiement QR), Academy, support. Pour le grossiste : acces additionnel a RecoltesPrevues et a la republication.

### 6.2 Producteur
Connexion puis `/producteur`. Parcours : creer une plantation et declarer une recolte (RecolteForm, statut declaree), publier la recolte sur le marche (PublierRecolte), recevoir et traiter les demandes de marchands (CommandesProducteurPage : accepter / negocier / refuser / livrer / encaisser), suivre les recoltes (MesRecoltesPage) et revenus. Keiwa, Academy, support disponibles.

### 6.3 Cooperative (cooperateur)
Connexion puis `/cooperative`. Parcours : gerer les membres (accepter/refuser adhesions, suspendre, promouvoir president), tenir la tresorerie (FinancesCooperative : saisir transaction en_attente puis valider/annuler), gerer le stock commun et la distribution, agreger et dispatcher les besoins des membres (Commandes), acheter/vendre sur le marche cooperatif (MarcheHub), cloturer les commandes livrees. Les actions de gestion sont reservees au president (controle in-code).

### 6.4 Identificateur
Connexion (PIN dedie) puis `/identificateur`. Parcours : rechercher un acteur ou creer un nouveau dossier (FicheIdentificationDynamique multi-etapes avec GPS et signature), enregistrer en brouillon puis soumettre (statut en_attente), suivre l'avancement (SuiviIdentifications), reprendre les brouillons (MesBrouillons), consulter le detail d'un acteur (ActeurDetails ; lecture seule si hors-zone), demander une mutation de zone (DemandeMutation). PIN gere via endpoints dedies (verify/change).

### 6.5 Institution
Connexion puis `/institution`. Parcours de supervision et lecture : vue macro nationale (InstitutionHome), analytics (Analytics), liste des acteurs (InstitutionActeurs), supervision des transactions avec validation/rejet (InstitutionSupervision), piste d'audit (AuditTrail). Lecture majoritairement, quelques actions de validation.

### 6.6 Roles back-office
Connexion via `/backoffice/login` (telephone ou email, BO_ROLES) puis `/backoffice/dashboard`. Parcours selon permissions : valider l'enrolement (BOEnrolement), gerer les acteurs (BOActeurs/BOActeurDetail), superviser les transactions (BOSupervision), traiter mutations (BOMutations) et signalements (BOModeration), gerer zones et marches (BOZones), missions (BOMissions), Academy (BOAcademy), wallet Keiwa (BOKeiwa), audit (BOAudit). Le super_admin a en plus : utilisateurs BO et matrice de permissions (BOUtilisateurs), institutions (BOInstitutions), config institution (BOConfigInstitution), score financier (BOScoreFinancier), cles API (BOApiKeys).

---

## 7. Regles metier (statuts, enums, calculs, validations)

### 7.1 Statuts et enums (source backend)

- Commande (`commandes/entities/commande.entity.ts:13-19`) : `CommandeStatut` = en_attente, confirmee, en_livraison, livree, annulee, litige. Statut paiement (l.83-84) : champ `statut_paiement`, defaut `non_paye`.
- Negociation (`commandes/entities/negociation.entity.ts:3-8`) : `NegociationStatut` = en_attente, accepte, refuse, contre_offre. Compteur `nb_contre_offres` (limite metier de 3 imposee dans le controleur commandes-rest).
- Recolte (`producteur/recoltes/entities/recolte.entity.ts`) : `RecolteQualite` = standard, premium, bio ; `RecolteStatut` = declaree (defaut), validee, vendue. Variante `recoltes-rest/recolte.entity.ts` : statut texte defaut `en_cours`.
- Cycle (`producteur/cycles/entities/cycle.entity.ts:15-20`) : `CycleStatus` = preparation, active (defaut), completed, archived.
- Publication (`producteur/publications/entities/publication.entity.ts:16-26`) : `PublicationStatut` = disponible, epuise, suspendu, archive ; `MarcheVirtuelType` = producteur, cooperative.
- Mutation (`mutations/mutation.entity.ts:9-13`) : `MutationStatus` = en_attente (defaut), approuvee, rejetee.
- Mission (`missions/mission.entity.ts:10`) : statut texte defaut `en_attente` (valeurs vues cote BO : active, terminee, echouee, brouillon, supprime).
- Ticket (`tickets-rest/ticket.entity.ts:6`) : statut = ouvert, en_cours, resolu, ferme (defaut ouvert).
- Identification (`identifications/identification.entity.ts:9,24-26`) : statut texte defaut `en_attente` ; source enum = terrain, admin_bo.
- Transaction wallet (`wallets/entities/wallet-transaction.entity.ts:11-17`) : `TransactionType` = credit, debit, escrow_block, escrow_release, escrow_refund. Statut texte separe (l.37).

### 7.2 Regles et validations relevees

- Inscription : mot de passe par defaut par role (BO : 123456, acteurs : 0000), `mustChangePassword=true`, `status=ACTIF`, `validated=false`. cooperateur cree une cooperative ; institution cree une institution (auth.service.ts:59-134).
- Connexion : email reserve aux BO ; statuts suspendu/rejete/en_attente_validation rejetes ; verrouillage cote client apres 5 essais (15 min, LoginPassword.tsx).
- PIN : 4 chiffres, bcrypt, verification timing-safe pour identificateur ; liste de PIN interdits cote BO (Modifier-PIN).
- Recharge mobile : montant minimum 200 (wallets.controller.ts:36). Paiement public QR : minimum 100 (PayPage.tsx). Retrait : debit avec rollback en cas d'echec.
- Commande : decrement de stock a la confirmation ; paiement encaissable en especes ou via transfert Keiwa ; seul le vendeur peut livrer/encaisser.
- Negociation : maximum 3 contre-offres ; ecart de prix borne a +/-50 cote frontend (MarcheVirtuel, CommandesProducteurPage).
- Mutation : une seule demande en attente a la fois ; rejet exige un motif >= 10 caracteres ; raison du formulaire identificateur entre 20 et 500 caracteres (DemandeMutation.tsx).
- Recoltes prevues / republication : reservees au marchand grossiste (controle in-code 403).
- Cooperative : actions de gestion reservees au president ; transaction de tresorerie creee en_attente puis validee/annulee ; cotisation 25 000 FCFA (MaCooperative.tsx).
- Publication recolte : champs obligatoires, stock <= quantite, nom requis si culture "Autre", compression photo > 500 Ko (PublierRecolte.tsx).
- Notifications bulk : maximum 500 destinataires (notifications:140). Raccourcis vocaux : maximum 5 par utilisateur. Identification geo : maximum 5000 points.
- Telephone : format CI valide (10 chiffres, prefixe 07/+225) sur les formulaires acheteur/livraison et a la connexion.
- Score Julaba : 3 chapitres x 5 lecons x 5 questions, score 0-100 (UniversalAcademy.tsx, scores.controller.ts:29). Score financier : sur 1000 avec 7 dimensions (BOScoreFinancier.tsx, financial-score.service.ts).
- Conversion d'unites recolte : kg/tonne/tas/sac/cagette/panier/botte convertis en kg (RecolteForm.tsx).

### 7.3 Actions desactivees / a venir (a prendre en compte en recette)

D'apres la lecture des ecrans, plusieurs actions sont volontairement desactivees ou en stub : envoi de transfert Keiwa (TransfertPage), paiement de service (PaiementsPage), liaison bancaire (BanquePage), boutons Modifier/Analytics des missions (BOMissions), boutons PDF de BORapports, Enregistrer de BOConfigInstitution, Performance de SuiviIdentifications, Resoudre de BOActeurDetail (signalements), import CSV de BOEnrolement. Cote backend, plusieurs endpoints sont des stubs (admin moderation/livraison/communication/cron, misc-rest supervision/demandes/livraison/communication, cooperatives commandes-groupees/distribution).

### 7.4 Validations DTO (class-validator) - source `backend/src/**/dto/*.dto.ts`

33 fichiers DTO. Contraintes relevees utiles a la recette (toutes citees a la source) :
- signup (`auth/dto/signup.dto.ts`) : `phone` @Matches `^\+225[0-9]{10}$` obligatoire (l.20-22) ; `password?` @IsOptional @MaxLength(128), AUCUN minimum (l.24-25) ; `firstName`/`lastName` obligatoires ; `role` @IsEnum(UserRole) ; `genre?` in ['homme','femme','autre'] ; nombreux champs localisation optionnels @MaxLength(200/500) ; `objectifMensuel?`/`primeObjectif?` @IsInt @Min(0) ; `sousProfilMarchand?` @IsEnum.
- login (`auth/dto/login.dto.ts`) : `phone?` et `email?` mutuellement exclusifs via @ValidateIf (un des deux requis) ; `phone` @Matches `^\+225[0-9]{10}$` ; `email` @IsEmail @MaxLength(255) ; `password` @IsNotEmpty @MaxLength(128), AUCUN minimum.
- create-acteur (`auth/dto/create-acteur.dto.ts`) : `phone` @Matches `^\+?[0-9]{8,15}$` (format DIFFERENT de signup) ; `password?` @IsOptional sans MaxLength ; `photoUrl?` @IsUrl @MaxLength(2048).
- create-admin-user (`users/dto/create-admin-user.dto.ts`) : roles creables limites a admin_general/admin_national/gestionnaire_zone/operateur_terrain ; `firstName`/`lastName` @MinLength(2) @MaxLength(100) ; `phone` @Matches `^(\+225)?\s?(0?[1-9]\d{8})$` ; `email` @IsEmail obligatoire ; `zoneId?` @IsUUID obligatoire si gestionnaire_zone ; `boPermissions?` @IsObject.
- create-backoffice-user (`users/dto/create-backoffice-user.dto.ts`) : 9 roles creables ; `lastName?` OPTIONNEL ici ; `email` obligatoire (via ValidateIf) si role admin BO ou identificateur ; `sousProfilMarchand` obligatoire si marchand ; `zoneId` obligatoire si gestionnaire_zone ou identificateur.
- create-backoffice-account (`users/dto/create-backoffice-account.dto.ts`) : `role` @IsEnum(UserRole) accepte TOUS les roles (la restriction aux 4 roles admin n'est PAS portee par le DTO, seulement documentee) ; pas de champ password (genere serveur).
- reject-admin-user : `motif` @MinLength(10) @MaxLength(2000). update-sous-profil-marchand : `sousProfilMarchand` @IsEnum, `motif?` @MaxLength(500). users-bo-list-query : `page?` @Min(1), `limit?` @Min(1) @Max(100), `statut?` in [actif,suspendu,en_attente,rejete].
- Autres : admin-wallet-operations `montant` @Min(1) @Max(10 000 000), `confirmation` @Equals('CONFIRMER') pour reinit ; credit-wallet `montant` @Min(100), `provider?` @IsEnum(ORANGE/MTN/MOOV/WAVE) ; create-mutation `raison` @MinLength(20) @MaxLength(500) ; update-transaction-status `motif?` @MinLength(5) @MaxLength(500) ; user-flags `raison` @MaxLength(500), `commentaire?` @MinLength(10) @MaxLength(2000) ; voice tts-request `text` @MaxLength(2000).
- Incoherences a noter en recette : (a) format telephone divergent entre signup/login (`^\+225[0-9]{10}$`), create-acteur (`^\+?[0-9]{8,15}$`) et les DTO admin (`^(\+225)?\s?(0?[1-9]\d{8})$`) ; (b) aucun @MinLength sur les mots de passe ; (c) aucun champ PIN dans les DTO (validation PIN faite hors class-validator) ; (d) `lastName` obligatoire dans certains DTO, optionnel dans create-backoffice-user.

### 7.5 Schema des tables manipulees en SQL brut - source `backend/src/database/`

Constat de fond : `synchronize: false` dans les deux configs TypeORM (`database/data-source.ts:15`, `database/database.module.ts:20`). TypeORM ne cree donc jamais les tables a partir des entites. `db-init.service.ts` (lu integralement) ne contient AUCUN `CREATE TABLE` : il fait seulement des `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` sur `users` (l.13-32) et `identifications` (l.39-46), et recree la FK `cooperative_membres.cooperative_id` (l.52-61). Les `CREATE TABLE` reels en migrations couvrent : users, wallets, wallet_transactions, cycles, recoltes, publications, commandes (`1710172800000-InitialSchema.ts`), api_keys, user_flags, mutations, marchand_sous_profil_historique.

Tables citees, statut verifie :
- `caisse_transactions` : aucun CREATE TABLE ; definie par l'entite `caisse-rest/caisse-transaction.entity.ts:11`. Migration `1778700000000-AddCaisseTransactionStatusAndMotif.ts` ajoute (ALTER) `statut` enum DEFAULT 'validee' et `motif`, et cree le type `caisse_transaction_status_enum` (validee/en_cours/gelee/annulee/litige, l.9).
- `produits` : aucun CREATE TABLE, AUCUNE entite. Manipulee uniquement en SQL brut (caisse-rest.controller.ts:145-172, stocks-rest.controller.ts). Doit preexister en base.
- `stocks` : entite `stocks-rest/stock.entity.ts:3` (synchronize off). INCOHERENCE : l'INSERT brut (stocks-rest.controller.ts:65) insere `prix_achat, prix_vente, seuil_alerte, categorie, image` ABSENTS de l'entite ; la table reelle a plus de colonnes que l'entite.
- `besoins` : table reelle = `cooperative_besoins`, creee en SQL brut a l'execution (`CREATE TABLE IF NOT EXISTS`, cooperatives-rest.controller.ts:25-44, methode `ensureCooperativeBesoinsTable`).
- `cooperatives` : entite `cooperatives-rest/cooperative.entity.ts:3` (synchronize off, aucun CREATE TABLE).
- `objectifs` : table reelle = `objectifs_journaliers`, entite `caisse-rest/objectif-journalier.entity.ts:3` (synchronize off).
- `raccourcis` : DEUX entites distinctes sans CREATE TABLE : `raccourcis` (`raccourcis/raccourci.entity.ts:3`) et `raccourcis_vocaux` (`caisse-rest/raccourci-vocal.entity.ts:3`).
- `push_tokens` : entite `notifications/push-token.entity.ts:3` (synchronize off) ; upsert SQL brut `ON CONFLICT (user_id, token)`.
- `credits`/`clients` : aucun CREATE TABLE, aucune entite (SQL brut credits.controller.ts). La lecture se fait sur la VUE `credits_avec_statut` (l.17,79), jamais creee dans le code (preexistence requise). `clients` a une cle unique `(marchand_id, nom)` (ON CONFLICT l.48).
- Autres tables creees en SQL brut hors migrations : `districts/regions/departements/communes` (admin-divisions/seed/admin-divisions-seed.service.ts:29-52), `cron_jobs_config` (misc-rest.controller.ts:53), `support_config` (misc-rest.controller.ts:103).
- Risque recette : tables/vue utilisees en SQL brut SANS aucune definition `CREATE` dans le depot (preexistence requise en base) : `produits`, `credits`, `clients`, vue `credits_avec_statut`.

### 7.6 Contrats des integrations externes - source backend (verifies)

CSP confirmant les hotes autorises (`backend/src/main.ts:34-40`) : api.elevenlabs.io, v2.b-pay.co, b-pay.co, api-rnpp.verif.ci.

- BPay (`bpay/bpay.service.ts`) : base `BPAY_BASE_URL` defaut `https://b-pay.co/service`. Login `POST /api/v1/oauth/login` (l.35-40, body {email,password}, token cache 50 min). Init paiement `POST /api/v1/paiement` (l.77, Bearer token, payload currency XOF, payment_method mappe WAVE_CI/MTN_CI/MOOV_CI/OM_CI l.4-11, amount, merchant_transaction_id, success/failed/notify_url, telephone, reference_cl ; reponse lit pay_token, payment_url, status). Statut `GET /api/v1/check-status/{payToken}` (l.105). Retrait `POST /api/v1/collect/cashin` (l.128). Env : BPAY_BASE_URL/EMAIL/PASSWORD/REFERENCE_CL, BPAY_WEBHOOK_SECRET.
- Webhook `POST /bpay/callback` (`bpay/bpay.controller.ts:21`) : verifie le secret via header `x-bpay-secret` OU `x-webhook-secret` (l.24-25, comparaison simple `!==`, non constant-time) ; ne fait PAS confiance au statut du body, rappelle `verifierStatut` avec retry x3 (l.50) ; statusMap SUCCESS->COMPLETED, FAILED/EXPIRED->FAILED, PENDING->PENDING, inconnu->FAILED (l.53-59) ; sur COMPLETED credite le wallet (verrou pessimiste, plafond 10 000 000 XOF). Cron de reconciliation toutes les 5 min sur les PENDING > 15 min (`bpay/bpay.cron.ts`). Le callback QR public `POST /wallets/public/pay-callback` (wallets-public.controller.ts:80) ne verifie PAS de secret (contrairement a /bpay/callback).
- ElevenLabs (`voice/openai.service.ts:92-127`) : `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`, header `xi-api-key: ELEVENLABS_API_KEY`, model_id `eleven_turbo_v2_5`, voice_settings (stability 0.65...), retour binaire converti base64 par les appelants. Env : ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (sinon retourne null). Variante rapport (`rapport/rapport.controller.ts:112-126`) : model `eleven_multilingual_v2`, voiceId par defaut hardcode `Z6q6fRauBHtc4E9CUCbD`.
- OpenAI (`voice/openai.service.ts`) : STT `POST https://api.openai.com/v1/audio/transcriptions` model `whisper-1` (l.43), intent `POST https://api.openai.com/v1/chat/completions` model `gpt-4o` response_format json_object (l.61-76). Env : OPENAI_API_KEY uniquement. Groq Whisper : INEXISTANT en production (aucun appel api.groq.com, aucune var GROQ_API_KEY ; "Groq Whisper operationnel" est une etiquette cosmetique hardcodee dans admin-analytics.controller.ts:42). Aucun fallback Groq ; le STT leve 502 en cas d'echec. Pour dioula/bambara, le STT/TTS passe par ANSUT (translate-audio reel, le reste stub).
- ONECI (`oneci/oneci.service.ts`) : base hardcodee `https://api-rnpp.verif.ci/api/v1` (l.3, pas de var d'env pour l'URL). Auth `POST /authenticate` body {apiKey,secretKey} (l.14, token cache 50 min). Lookup `POST /oneci/persons/{nni}/match` multipart avec champs vides (recherche par NNI seul, l.22-24) ; 401/403/404 -> 404 "NNI introuvable", autre -> 502. Mode sandbox detecte si la reponse est un tableau dont tous les elements ont ErrorCode='1' (l.29-30). Quota `GET /subscription/remaining-requests` (l.35). Env : ONECI_API_KEY, ONECI_SECRET_KEY avec des valeurs par defaut codees EN CLAIR dans le source (l.12-13, vraisemblablement sandbox). Aucune validation de format du NNI cote code.

---

## 8. Zones NON VERIFIE

Les 8 points de la version precedente de cette section ont ete resolus par lecture directe du code (voir les renvois). Statut detaille :

1. RESOLU - Branchement de la matrice de permissions BO : confirme en 5.3 (registre `bo-permissions.ts` branche uniquement dans l'UI d'edition `BOUtilisateurs.tsx` ; `hasPermission` runtime en `BackOfficeContext.tsx:584-592` independant du registre ; sidebar `BOLayout.tsx:888-895` et 661-666 ; gardes URL super-only par early-return).
2. RESOLU - Collisions de routes backend : tranchees en 3.15. Une seule collision reelle (`GET /admin/health`, gagnant `AdminAnalyticsController`), les autres sont des faux positifs (controleurs non montes / chemins disjoints).
3. RESOLU - Ecrans precedemment deduits du seul routage : tous lus et documentes en section 4 (les ecrans Profil/Parametres deleguent a UniversalProfil/UniversalParametres ; details des autres reportes).
4. RESOLU - Modules backend (ansut, sms, feedbak-sms, escrow, events, push, identifications, institutions) : documentes en section 2 et 7.6. A noter : `escrow/` est un module vide (logique dans `wallets.service.ts`) ; `identifications/` et `institutions/` n'ont pas de fichier service (logique dans les controleurs).
5. RESOLU - DTO et validations class-validator : reportes en 7.4 (avec les incoherences de format telephone, l'absence de minimum sur les mots de passe, l'absence de champ PIN).
6. RESOLU pour ce qui est verifiable - Migrations et schema : reportes en 7.5. Limite intrinseque signalee : `synchronize: false` et l'absence de `CREATE TABLE` dans le depot pour `produits`, `credits`, `clients` et la vue `credits_avec_statut` font que le schema reel de ces objets PREEXISTE en base hors depot et reste non sourcable depuis le code (preexistence requise). De meme, le schema exact des tables definies seulement par une entite (caisse_transactions, stocks, cooperatives, objectifs_journaliers, raccourcis, push_tokens) n'est garanti que par l'entite, pas par une migration de creation.
7. RESOLU - Liste serveur autorisee des cles `bo_permissions` : relue ligne a ligne et reportee en 5.5 (`users.controller.ts:406-438`).
8. RESOLU - Contrats des integrations externes (BPay, ElevenLabs, OpenAI, ONECI) : verifies et reportes en 7.6. Confirmation factuelle : Groq Whisper n'existe pas en production (etiquette cosmetique) ; le callback QR public n'a pas de verification de secret ; ONECI expose des credentials par defaut en clair dans le source.

Zones restant non determinables depuis le code seul :
- Schema reel en base des objets sans definition dans le depot (`produits`, `credits`, `clients`, vue `credits_avec_statut`) : depend de la base `julaba_db` reelle, non versionnee ici (cf. 7.5).
- Valeurs de production des variables d'environnement et secrets (BPAY_*, ELEVENLABS_*, OPENAI_API_KEY, ONECI_* hors valeurs sandbox par defaut, VAPID_*, ANSUT_*) : non presentes dans le code, donc comportement runtime reel des integrations non observable sans l'environnement deploye.
- Comportement reel des API externes (codes de retour effectifs de BPay/ONECI/ElevenLabs/OpenAI en conditions reelles) : seuls les contrats d'appel cote client sont verifiables dans le code (cf. 7.6), pas les reponses serveur effectives.

---

Fin de l'inventaire V1 (section 8 resolue le 14 juin 2026).
