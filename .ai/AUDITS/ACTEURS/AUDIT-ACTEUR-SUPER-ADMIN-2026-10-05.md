# AUDIT ACTEUR — SUPER-ADMIN — 2026-10-05

## 1. Identité et périmètre

- **Rôle audité** : super_admin (niveau système, plus haut privilège back-office), rôle porté par UserRole.SUPER_ADMIN.
- **Type d'audit** : statique (code) + sonde runtime (backend local :3001, lecture seule, 1 login + 1 test d'élévation + 4 GET).
- **Périmètre** : routes DEV frontend (/database, /create-super-admin, /setup-marchand, /dev-mode, /admin-recovery), backend (seed, bootstrap, allow-list rôles, création super_admin, secrets), backoffice critique (event-monitor, mutations, api-keys, cron), élévations, 2FA/passkeys, journalisation.
- **Audit antérieur vérifié** : .ai/AUDITS/ACTEURS/AUDIT-ACTEUR-SUPER-ADMIN-2026-09-28.md (statut « À RECETTER ») — ses 4 constats sont réévalués en §2/§3.
- **Contexte appliqué** : PROJECT_CONTEXT §8.8 (« super_admin jamais créable par signup générique, allow-list fail-closed »), ACCESSIBILITY_GUIDE §4/5/6, DESIGN_SYSTEM §9.

## 2. Fonctionnalités observées dans le code

| Capacité | Implémentation | Garde-fou serveur | Preuve |
|---|---|---|---|
| Signup public | POST /auth/signup — allow-list ACTEUR_ROLES puis 2e verrou service ROLES_JAMAIS_GENERIQUES + rolesCreablesPar() | Double fail-closed | auth.controller.ts:70-72 ; auth.service.ts:58,121-127,67-73 |
| Créer super_admin | POST /auth/create-super-admin | @Roles('super_admin') UNIQUEMENT | auth.controller.ts:822-824 |
| Créer admin BO | POST /users/backoffice-account — CREATABLE_BO_ACCOUNT_ROLES **exclut super_admin** ; POST /users/admin (admin_general → compte en attente de validation par super_admin) | Allow-list + validation à 2 étapes | users.controller.ts:190-216,129-168 ; create-backoffice-account.dto.ts:17-22 |
| Modifier rôle/permissions | PATCH /users/:id — rôle réservé super_admin ; boPermissions réservé super_admin ; hiérarchie exigerAutoriteSur | Serveur | users.controller.ts:281-294 ; bo-autorisation.ts:62-74 |
| Reset mot de passe admin | POST /users/:id/admin-reset-password | @Roles('super_admin') + throttle 5/10 min + audit | users.controller.ts:492-499 ; users.service.ts:504-525 |
| API keys partenaires | liste (aperçu left(key,11)), création (clé affichée 1 fois), toggle | JwtAuthGuard + assertBoAdmin (tout rôle admin, pas que super_admin) | partner.controller.ts:38-70 |
| Cron | GET /cron (statuts réels), PATCH /cron/:id/toggle (super_admin **et** admin_general), POST retry (stub factice) | Toggle role-guardé ; GET **sans @Roles** | misc-rest.controller.ts:49-88 |
| Event monitor | Écran EventMonitor.tsx gate client role !== 'super_admin' (:48) ; source = WebSocket /ws | **Écran seul** — la donnée est diffusée en WS avant le gate | EventMonitor.tsx:48 ; events.gateway.ts:95-98 |
| Seed démo | Hard-off en prod sauf SEED_DEMO="true" ; comptes BO **sans mot de passe par défaut** (refus de 123456) ; **aucun super_admin dans le seed** | Env | seed-demo.service.ts:64-71,127-131,158-169 |
| Secrets | Fail-fast prod sur JWT_SECRET/REFRESH_TOKEN_SALT/PIN_ENCRYPTION_KEY ; .env non versionné ; .env.example documenté ; render.yaml generateValue + SEED_DEMO_BO_PASSWORD: sync:false | Boot | main.ts:84-92 ; .gitignore:5-10 ; render.yaml:93-126 |
| WebAuthn | Register + authenticate complets, **optionnels** | Aucune obligation pour super_admin | auth.controller.ts:850-997 |

**Sondes runtime** : login Awa Koné → 200 (marchande) ; POST /auth/signup role=super_admin → **403 « Ce role ne peut pas etre cree via l'inscription publique »** (rien créé, système sain) ; /users/admin/pending, /partner/api-keys, /cron sans token → **401/401/401** ; /cron **AVEC** token marchande → **200** (liste des jobs, planifications, erreurs) (anomalie) ; /users/counts-by-role avec token marchande → 403.

## 3. Constats détaillés

**SUPERADMIN-01 [P1]** — La donnée de l'EventMonitor n'est pas réservée au super_admin. Le gate est purement visuel (boUser?.role !== 'super_admin', EventMonitor.tsx:48) ; côté serveur, emitTransactionCreated fait broadcast("transaction:created", data) vers la room **« all »** (events.gateway.ts:95-98) : toute personne authentifiée (marchande comprise) reçoit les payloads de transactions globales via /ws (JWT vérifié à la connexion :38-71, mais pas de filtre par rôle sur les broadcasts publics). Impact : l'« outil de surveillance réservé » expose sa matière première à tous les clients connectés.

**SUPERADMIN-02 [P2]** — Room « admin » incohérente : la liste inclut le rôle fantôme 'admin' (2×) et **omet admin_general** (events.gateway.ts:62) — l'admin général ne reçoit pas les événements admin ; un rôle qui n'existe pas en base en fait partie. Risque de faux « silence » du monitoring et d'autorisations fantômes.

**SUPERADMIN-03 [P2]** — GET /api/v1/cron sans @Roles : **200 avec un token marchande** (preuve runtime) — fuite d'information d'infrastructure (noms des jobs, planification BPay, stats d'exécution, dernière erreur, misc-rest.controller.ts:49-73). Les autres endpoints du même contrôleur sont correctement gardés.

**SUPERADMIN-04 [P2]** — Séparation des pouvoirs insuffisante sur les opérations système : PATCH /cron/:id/toggle (pause de la réconciliation financière BPay !) et POST /cron/:id/retry sont ouverts à admin_general (misc-rest.controller.ts:75-88) ; la création/suppression de clés API partenaires aussi (partner.controller.ts:26-70, assertBoAdmin). Le retry est un stub qui répond {success:true} sans rien faire (misc-rest.controller.ts:83-88) — un bouton mensonger dans un écran système.

**SUPERADMIN-05 [P2]** — Piste d'audit falsifiable : POST /audit (audit-rest.controller.ts:31) permet à **tout rôle ADMIN** (dont operateur_terrain, via @Roles('ADMIN') de classe + ADMIN_ROLES, roles.guard.ts:5) d'insérer des lignes arbitraires dans audit_logs (spread ...body sans filtre de champs). Lecture globale GET /audit également accessible à tous les ADMIN (:30).

**SUPERADMIN-06 [P2]** — Clés API partenaires toujours stockées/comparées **en clair** (partner-api-keys.service.ts:17-20,66-72 ; api-key.guard.ts:24-27). Le P0 2026-09-28 est **partiellement fermé** : plus jamais relisibles, aperçu key_apercu (service:21-22), affichage une seule fois côté UI (BOApiKeys.tsx:19-23,238). Le hachage au repos reste ouvert (documenté dans le code), sans migration api_keys.

**SUPERADMIN-07 [P2]** — Journalisation super_admin lacunaire : createSuperAdmin (auth.controller.ts:822-840) n'écrit **aucune** ligne audit_logs (alors que c'est l'action la plus sensible du système) ; idem toggle cron (misc-rest.controller.ts:75-81), POST support/config (:175-198), create/patch api-keys. À contrario, modification/suppression/reset de compte sont bien journalisés (users.service.ts:350-405,523-525).

**SUPERADMIN-08 [P2]** — 2FA non exigée pour super_admin : WebAuthn est implémenté et fonctionnel (register/authenticate, auth.controller.ts:850-997) mais purement optionnel ; un mot de passe seul donne un accès super_admin complet. De plus webauthn/authenticate/options distingue « Utilisateur introuvable » / « Aucune clé biométrique enregistrée » / options (auth.controller.ts:925-929) — énumération de l'existence d'un compte BO et de son enregistrement passkey (l'anti-énumération AUTH-07 ne couvre pas ce endpoint).

**SUPERADMIN-09 [P2]** — Bootstrap du premier super_admin cassé et trompeur : la page DEV CreateSuperAdmin.tsx:1-8 promet « usage unique… désactivée après création », mais l'endpoint est @Roles('super_admin') (auth.controller.ts:822-824) — le **premier** super_admin ne peut donc être créé que par SQL manuel. La procédure réelle (SQL direct en prod) n'est documentée nulle part ; la page peut pousser un opérateur à chercher un contournement.

**SUPERADMIN-10 [P2]** — Routes DEV et exposition du serveur Vite : le gate import.meta.env.DEV (routes.tsx:28-33,64) est **fiable au build** (constante remplacée, branches mortes retirées — confirmé par warnDev.ts:12). MAIS dans tout environnement où un serveur Vite dev est exposé (c'est le cas du sandbox : Caddy :81 → Vite :3000, worklog Task 1), /database, /create-super-admin, /setup-marchand, /dev-mode sont servis sans auth : contenu inoffensif serveur (DatabaseViewer = doc statique d'un schéma Supabase **périmé** ; DevModeHome = redirect ; SetupMarchand appelle /auth/users/create **inexistant** → 404 ; CreateSuperAdmin → 403 si non super_admin) mais surface de désinformation et de reconnaissance. /admin-recovery est **absente** des routes et une garde CI l'interdit (test-recuperation-admin.mjs:57-58) — DESIGN_SYSTEM.md §7 est périmé sur ce point.

**SUPERADMIN-11 [P3]** — Drapeau dev réactivable en prod : useDevMode.ts:17 = import.meta.env.DEV || localStorage 'julaba_dev_mode' — en build livré, le flag localStorage (5 tapes sur le logo) rallume des affordances dev. Impact cosmétique uniquement (ProfileSwitcher n'est rendu que derrière import.meta.env.DEV aux emplacements AppLayout.tsx:195, BOLayout.tsx:1444 ; ses profils sont des mocks, components/dev/ProfileSwitcher.tsx:14-15,46-64).

**SUPERADMIN-12 [P3]** — Pas de règle « dernier super_admin » : un super_admin peut modifier son propre rôle (PATCH /users/:id, isOwner court-circuite exigerAutoriteSur, users.controller.ts:281-284) ou se faire supprimer — verrouillage total possible, compensé seulement par contacts-recovery-bo (noms seuls, auth.controller.ts:102-116).

**SUPERADMIN-13 [P3]** — POST /support/config stocke un JSON **sans validation** et sans rôle super_admin seul (admin_general inclus), GET lisible par tout authentifié (misc-rest.controller.ts:161-198) ; contenu arbitraire retourné tel quel au backoffice.

**SUPERADMIN-14 [P3]** — Seed démo : réalignement du mot de passe/du rôle de CHAQUE compte démo à chaque boot quand le seed est actif (seed-demo.service.ts:194-205) — réinitialise silencieusement un mot de passe changé par un testeur ; et en non-prod **sans aucune variable**, le seed tourne par défaut avec 1234 (:131, :43). Solides compensations : hard-off prod (:130), BO sans défaut (:64-71).

**SUPERADMIN-15 [P3]** — Incohérences mineures : défaut JWT 24h dans le module (auth.module.ts:32-33) vs 15m à l'émission (auth.service.ts:452) ; statut REJETE non revérifié par JwtStrategy.validate (jwt.strategy.ts:35-36, ne bloque que SUSPENDU/EN_ATTENTE_ACTIVATION).

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| SUPERADMIN-01 | Payloads transactions diffusés à tous les clients WS authentifiés | Fuite de données / autorisation | P1 | Socket.IO /ws, room « all » |
| SUPERADMIN-03 | Stats cron lisibles par une marchande (preuve runtime 200) | Fuite d'information | P2 | GET /cron sans @Roles |
| SUPERADMIN-05 | Écriture arbitraire dans audit_logs par tout rôle ADMIN | Intégrité de la piste d'audit | P2 | POST /audit body spread |
| SUPERADMIN-06 | Clés API partenaires en clair en base | Secret au repos | P2 | Accès base / dump |
| SUPERADMIN-04 | Pause réconciliation BPay par admin_general ; retry factice | Séparation des pouvoirs | P2 | PATCH /cron/:id/toggle |
| SUPERADMIN-07 | Création super_admin / toggle cron / api-keys non journalisés | Traçabilité | P2 | Absence d'insertion audit_logs |
| SUPERADMIN-08 | Pas de 2FA obligatoire super_admin + énumération WebAuthn | Authentification | P2 | Login mot de passe seul |
| SUPERADMIN-09 | Bootstrap 1er super_admin impossible via l'UI (poule-œuf) | Opérationnel | P2 | SQL manuel non documenté |
| SUPERADMIN-10 | Pages DEV servies si Vite dev exposé (sandbox actuel) | Exposition config | P2 | Serveur dev ouvert |
| SUPERADMIN-11 | Flag dev localStorage en prod | Hygiène | P3 | localStorage |
| SUPERADMIN-12 | Pas de protection du dernier super_admin | Disponibilité gouvernance | P3 | Auto-dégradation |
| SUPERADMIN-13 | JSON support/config non validé | Validation entrée | P3 | POST /support/config |
| SUPERADMIN-14 | Seed réaligne mots de passe démo à chaque boot | Hygiène (démo) | P3 | Boot + SEED_DEMO |
| SUPERADMIN-02 | admin_general absent de la room WS « admin » | Fiabilité monitoring | P3 | events.gateway.ts:62 |

## 5. Points forts

1. **Allow-list fail-closed vérifiée en triple couche** : contrôleur (auth.controller.ts:70-72), service (ROLES_JAMAIS_GENERIQUES + rolesCreablesPar → liste vide pour tout créateur non mappé, auth.service.ts:58,67-73) — **preuve runtime : 403 sur role=super_admin, rien créé**.
2. create-super-admin réservé super_admin existant ; backoffice-account exclut explicitement super_admin (create-backoffice-account.dto.ts:14-22) ; création admin par admin_general = **validation à deux étapes** (pending → validate super_admin).
3. JwtStrategy.validate **recharge l'utilisateur en base à chaque requête** (jwt.strategy.ts:32-45) : suspension et changement de rôle effectifs immédiatement, indépendamment du JWT ; mustChangePassword enforcé **côté serveur** par allow-list d'URL.
4. Rôle jamais modifiable hors super_admin (PATCH /users/:id :282-284, CHAMPS_RESERVES_SUPER_ADMIN, bo-autorisation.ts:74) ; auto-suspension interdite (:290) ; suppression journalisée en transaction (:350-358).
5. Secrets : fail-fast prod (main.ts:84-92), aucun fallback dur trouvé (grep \|\| 'fallback…' = 0 hit), .env non versionné, .env.example exhaustif, render.yaml sans mot de passe BO (sync:false) et refus explicite de l'ancienne valeur publiée (seed-demo.service.ts:69).
6. Seed : hard-off prod, aucun super_admin/admin avec mot de passe connu, warning explicite sur les comptes BO non créés (seed-demo.service.ts:163-169).
7. contacts-recovery-bo anonymisé (noms seuls, LIMIT 5, throttle) — ferme la fuite P0 bo-b 2.3 (auth.controller.ts:97-116).
8. API keys : jamais relisibles, aperçu côté UI, affichage unique — aligné front/back (BOApiKeys.tsx).
9. /admin-recovery supprimée **avec garde CI anti-régression** ; /dev-mode réduite à un redirect ; gate DEV = constante de build.
10. Throttle ciblé sur les routes sensibles (login 5/min, signup 3/min, reset 5/10min) + ThrottlerGuard global (app.module.ts:72-77,152-153).
11. Webhook BPay **fail-closed** (secret absent → callbacks ignorés, bpay.controller.ts:26-32) — le SEC-022 documenté est sain.
12. Garde test-api-authorization.mjs existante (gouvernance CI des autorisations API).

## 6. Recommandations de correction

- **SUPERADMIN-01** : ne diffuser transaction:created qu'aux rooms user:${id} + admin ; retirer le broadcast « all » des données métier ; introduire une room super_admin dédiée à l'EventMonitor.
- **SUPERADMIN-02** : remplacer la liste littérale par BO_ROLES importé (events.gateway.ts:62) — corrige l'oubli admin_general et le fantôme 'admin'.
- **SUPERADMIN-03** : @Roles('super_admin','admin_general') sur GET /cron (+ entrée à la garde api-authorization).
- **SUPERADMIN-04** : réserver toggle/retry cron et api-keys à super_admin (ou preuve de permission dédiée cron.write) ; implémenter ou retirer le bouton retry.
- **SUPERADMIN-05** : supprimer POST /audit (l'audit s'écrit côté serveur) ou n'accepter qu'une liste fermée de champs + action allow-listée ; restreindre GET /audit à audit.read.
- **SUPERADMIN-06** : migration api_keys → stockage haché (SHA-256 avec sel serveur, comparaison constante), colonne key_hash (SCHEMA-05).
- **SUPERADMIN-07** : écrire auditService.log dans createSuperAdmin, toggle cron, api-keys create/patch, support/config (action, auteur, IP, cible).
- **SUPERADMIN-08** : politique « passkey obligatoire pour super_admin » (bloquer login mot de passe si passkey enregistrée, ou exiger enregistrement au 1er login) ; réponses uniformes (timing + corps) sur webauthn/authenticate/options.
- **SUPERADMIN-09** : script/opération documentée de bootstrap (env var BOOTSTRAP_SUPER_ADMIN_* consommée une fois au boot avec log, ou CLI) ; corriger le texte de la page DEV.
- **SUPERADMIN-10** : ne jamais exposer de serveur Vite dev hors loopback (Caddy du sandbox → serve un dev server : resserrer le Caddyfile ou servir un build) ; purger/actualiser DatabaseViewer (schéma Supabase périmé).
- **SUPERADMIN-11** : conditionner useDevMode à import.meta.env.DEV seul.
- **SUPERADMIN-12** : interdire au dernier super_admin actif de se dégrader/suspendre (comptage avant UPDATE).
- **SUPERADMIN-13** : schéma DTO pour support/config + restriction écriture super_admin.
- **SUPERADMIN-14/15** : aligner JWT_EXPIRES_IN ; ajouter REJETE à JwtStrategy ; ne réaligner le seed que si le hash diffère de la valeur démo.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Élévation | signup role=super_admin / admin / institution, sans token et avec token marchande | 403 systématique, zéro ligne créée (constaté pour super_admin) |
| Création super_admin | POST /auth/create-super-admin avec token non-super_admin | 403 ; avec token super_admin → 200 + ligne audit |
| Passkeys | super_admin sans passkey / avec passkey | Politique appliquée (bloqué ou 2e facteur exigé) |
| WS | Socket /ws en tant que marchande | AUCUN transaction:created global reçu |
| Cron | GET /cron (marchande) ; toggle (admin_general) | 403 aux deux (actuellement 200 / 200) |
| Audit | POST /audit par operateur_terrain ; lecture globale | 403 (actuellement 200) |
| API keys | GET liste → jamais de clé complète ; POST sans être admin | aperçu seul ; 403 |
| Seed | Boot prod sans SEED_DEMO | 0 compte démo, 0 BO, 0 super_admin |
| Suspension | Token super_admin avant/après suspension du compte | Requête suivante 401 immédiate |
| Bootstrap | Création du 1er super_admin | Procédure documentée, répétable, journalisée |
| Routes DEV | Build prod (grep bundles) | /database, /create-super-admin, /setup-marchand, /dev-mode absents |
| A11y BO | Écrans super_admin (event-monitor, api-keys, cron) | Labels associés, aria-live, cibles ≥ 44 px, tokens DS |

## 8. Tests critiques recommandés

1. Matrice d'élévation complète (signup × {sans token, acteur, identificateur, admin_general} × {super_admin, admin_general, identificateur, institution}) — 403 partout sauf acteurs.
2. Création de super_admin : par non-super_admin (403), par super_admin (200 + audit_logs), par le seed (absent).
3. WS : authentifié marchande → filtrer les events reçus ; assert absence de payloads transactions.
4. Toggle cron en tant qu'admin_general → 403 après correctif ; vérifier l'effet réel sur le job (pas seulement le flag).
5. Forgery d'audit : POST /audit par operateur_terrain → 403 après correctif.
6. Cycle passkey super_admin : register → login mot de passe refusé (politique) → login passkey OK.
7. Suspension live d'un super_admin → 401 à la requête suivante (validate re-DB).
8. Dump de l'APK/bundles prod : absence des chaînes create-super-admin, /database, julaba_dev_mode.
9. Bootstrap : réinitialisation de base + création 1er super_admin via la procédure documentée, avec trace d'audit.
10. Rotation des clés API : ancienne clé rejetée après toggle is_active=false.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | SUPERADMIN-01 — Rooms WS par rôle, stop du broadcast « all » métier | M |
| P2 | SUPERADMIN-05 — Fermer/sanitiser POST /audit, restreindre GET | S |
| P2 | SUPERADMIN-03/04 — @Roles sur GET /cron ; toggle/retry + api-keys → super_admin ; supprimer le stub retry | S |
| P2 | SUPERADMIN-07 — Journaliser createSuperAdmin, toggle cron, api-keys, support/config | S |
| P2 | SUPERADMIN-06 — Hachage des clés API au repos (migration) | M |
| P2 | SUPERADMIN-08 — Politique passkey obligatoire super_admin + uniformisation WebAuthn options | M |
| P2 | SUPERADMIN-09 — Procédure de bootstrap 1er super_admin documentée + page DEV corrigée | S |
| P2 | SUPERADMIN-10 — Caddyfile/sandbox : ne pas servir de dev server exposé ; purge DatabaseViewer | S |
| P3 | SUPERADMIN-02/11/12/13/14/15 — Room WS BO_ROLES, flag dev, dernier super_admin, validation support, seed, constantes JWT | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Sécurité | 74/100 | Fail-fast secrets, .env propre, webhook fail-closed, throttle solides ; WS trop bavard (P1), clés API en clair, audit falsifiable |
| Élévation / autorisation | 84/100 | Allow-list triple fail-closed prouvée en runtime (403), création super_admin verrouillée, rôles rechargés en DB ; résiduel : GET /cron, POST /audit, cron api-keys trop larges |
| Accessibilité (écrans super_admin / BO) | 56/100 | CreateSuperAdmin : labels non associés (:153-224), couleurs littérales (#E6A817/#FFD700, :243) contre DS §9, erreur sans role="alert" (:227-236) ; DatabaseViewer : tables sans caption/scope (:242-269) ; aucun parcours vocal, aucune cible mesurée |
| Qualité | 70/100 | Code documenté et commenté (décisions tracées), mais stub retry, page DEV cassée (endpoint inexistant), double défaut JWT, schéma Supabase périmé |
| **Global** | **72/100** | Au-dessus du seuil PROD 60 ; conditionné à la fermeture du P1 WS et des P2 autorisation/audit |

## 11. Conclusion + statut

Le verrou central demandé par PROJECT_CONTEXT §8.8 est **réellement en place et prouvé en runtime** : l'allow-list des rôles est fail-closed à trois niveaux, la création d'un super_admin exige un super_admin existant, le seed ne contient aucun compte d'administration, et la tentative d'élévation signup role=super_admin a été **refusée 403 sans créer de compte** — le système est sain sur ce point. Les constats P0/P1 de l'audit du 28/09/2026 sont **partiellement fermés** : « API keys en clair » n'est plus lisible mais reste stocké en clair (SUPERADMIN-06), le « secret fallback » a disparu (fail-fast + .env hors repo), la « séparation des pouvoirs » est réelle sur la création de comptes mais poreuse sur cron/api-keys/audit (SUPERADMIN-04/05), et « l'audit des opérations sensibles » couvre les comptes mais pas les actions super_admin les plus critiques (SUPERADMIN-07). La faille la plus structurante reste la **diffusion WS des transactions à tous les clients authentifiés** derrière un écran « réservé super_admin » (SUPERADMIN-01) : la protection existe dans l'UI, pas dans la donnée. Le bootstrap du premier super_admin (poule-œuf SQL non documenté) et l'absence de 2FA obligatoire complètent le lot prioritaire.

**Statut de l'audit : COMPLET — statique + runtime. Verdict : conforme sur l'anti-élévation ; à recetter après correctifs SUPERADMIN-01..10 (aucun P0).**
