# AUDIT ACTEUR — ADMIN-GENERAL — 2026-10-19

> **Mission** : 2ᵉ vague d'audits statiques par acteur (Task 45-d) — re-vérification de première main des 18 constats du 05/10 et des transverses BO de l'audit comptable 12/10 (§5.6, J5, C-11/C-13/C-14/C-15, M-01/M-02/M-08), sur `/home/z/julaba-wt` branche `dev`, HEAD `04ae652`. Numéros de ligne re-localisés par lecture directe (jamais recopiés des anciens audits).
> **Périmètre** : frontend `backoffice/` (BOLayout, BOKeiwa, BOParametres, BOCronDashboard, BOApiKeys, BOUtilisateurs, EventMonitor, universal/*), routes `/backoffice/*` ; backend `admin/`, `auth/bo-autorisation.ts` + guards, `cron-jobs/`, `events/`, `partner/`, `bpay/`, `audit-rest/`, `database/seed-demo.service.ts`.
> **Méthode** : statique READ-ONLY (aucune exécution, aucun réseau). Delta git `--since=2026-10-05`.
> **Auteur** : agent Z.ai Code — Task 45-d.

## 1. Identité et périmètre

- **Rôle** : admin_general (UserRole.ADMIN_GENERAL) — 2ᵉ niveau BO, sous super_admin. Enum inchangé.
- **Évolutions depuis le 05/10** (delta backend BO = 4 commits) : `628ef4e` renommage frontend_src→frontend (mécanique) ; `ee0b4a0` suppression des coquilles vides `escrow/`+`tickets/`, renommage audit→audit-log ; `a0d56f5`+`35ae18d` (12/10) **fix C-01** réconciliation des retraits B-PAY ; `02153dd` (12/10) mot de passe seed BO lu à l'exécution. Côté front : `e04fa73` retire Rapport/Dev Mode puis `04ae652` (15/10) réinstalle **ProfileSwitcher** dans BOLayout — derrière `import.meta.env.DEV` (BOLayout.tsx:1448-1449).
- Aucun commit de correction des 18 constats 05/10 dans le périmètre. Recette runtime : le compte démo Admin +2250700000016 (seed-demo.service.ts:101) est admin_general mais n'existe qu'avec SEED_DEMO_BO_PASSWORD fournie en env locale.

## 2. Fonctionnalités observées dans le code

- **Menu** BOLayout.tsx:96-186 : superOnly :141-143/:155-159 (utilisateurs, institutions, config-institution, monitoring-ia, event-monitor, analytics, score-financier, api-keys) ; `rapports` :160 = roles:['admin_general'] + audit.read ; filtre 3 clauses :661-666/:888-896 ; `parametres` :186 non superOnly.
- **Défauts** BackOfficeContext.tsx:190 (utilisateurs.read/write/delete + parametres.read/write) ≡ bo-autorisation.ts ≠ bo-permissions.ts:1-3 (« non branché ») — 3 registres divergents.
- **Backend** : admin-wallets.controller.ts:17 @Roles('ADMIN') classe ; :83-116 argent = @Roles('super_admin') ×3 (J5) ; :118-128 exports CSV ; :137-186 config sans audit. audit-rest.controller.ts:12/:30-31 GET+POST 'ADMIN'. misc-rest.controller.ts:49 GET /cron sans @Roles, :75-76 toggle, :83-85 retry. partner.controller.ts:26-30 → ADMIN_SCORE_ROLES={'super_admin','admin'} (financial-score.service.ts:35) → 403 clés API/score.

## 3. Constats détaillés

**[ADMINGEN-01] [P1] (05/10→19/10 VALABLE)** Routes BO sans garde — routes.tsx:198-231 sans vérification de permission ; BORoot.tsx:17-24 rôle seul. BOKeiwa/BOParametres/BOCronDashboard/BOUtilisateurs/BOContenus/BOLivraison/BOMarketplace par URL directe ; boutons crédit/débit affichés qui échoueront 403 (UI mensongère).

**[ADMINGEN-02] [P1] (VALABLE)** 3 registres divergents — BackOfficeContext.tsx:190 vs bo-autorisation.ts vs bo-permissions.ts:1-3 : admin_general quasi-super_admin par défaut.

**[ADMINGEN-03] [P1] (VALABLE, aggravé)** Fantôme 'admin' — financial-score.service.ts:35, bpay.controller.ts:198, events.gateway.ts:62 (liste avec 'admin', **sans admin_general**, **operateur_terrain en double**) et :126.

**[ADMINGEN-04] [P1] (VALABLE, = M-08)** Clés API en clair — partner-api-keys.service.ts:18-22/:66-72 ; api-key.guard.ts:25/:34. Pas de migration SCHEMA-05.

**[ADMINGEN-05] [P1] (VALABLE, = C-14)** events.gateway.ts:60 (tous en room « all ») + :95-98 transaction:created diffusée publiquement.

**[ADMINGEN-06] [P2] (VALABLE, part aggravée par C-15)** GET /cron sans @Roles (misc-rest:49-73) ; retry factice :83-88 ; BOCronDashboard.tsx:110-119 toast « Tâche relancée » + tuile repassée 'actif' sans effet serveur.

**[ADMINGEN-07] [P2] (VALABLE)** POST /audit ouvert 'ADMIN' — audit-rest.controller.ts:31, action libre.

**[ADMINGEN-08] [P1] (VALABLE)** Paramètres = stub — BOParametres.tsx:250 GET (service :482 `return {}`), :392 PUT et :423 reset inexistants serveur (controller :143 GET seul). Enregistrement 404.

**[ADMINGEN-09] [P2] (VALABLE)** admin-analytics.controller.ts:157-163 (2 jobs cron inventés), :138-144 (ALTER TABLE runtime livraison).

**[ADMINGEN-10] [P2] (VALABLE)** roles.guard.ts:5 — ADMIN_ROLES inclut gestionnaire_zone/operateur_terrain.

**[ADMINGEN-11] [P2] (VALABLE, = C-13)** Exports CSV sans permission ni trace — admin-wallets.controller.ts:118-128 ; service :428-443 (téléphones+soldes), :444-461 ; et BOAudit.tsx:133-146 exporte le JOURNAL d'audit en CSV/PDF client sans trace.

**[ADMINGEN-12] [P2] (VALABLE, = M-08)** CRUD config Keiwa sans journal — admin-wallets.controller.ts:153-186.

**[ADMINGEN-13] [P2] (PARTIELLEMENT CORRIGÉ)** Coquille escrow SUPPRIMÉE (ee0b4a0) ; restent BOContenus (useState jamais POSTé) et le DDL livraison (:138-144).

**[ADMINGEN-14] [P2] (VALABLE)** BO_SCREEN_PERMISSIONS:190 omet marketplace/livraison/contenus/communication/cron.read — écrans publics par URL mais invisibles au menu.

**[ADMINGEN-15] [P2] (VALABLE)** A11y — hex : BOKeiwa 128, BOZones 47, BODashboard 28, BOLayout 25, BOSupervision 24, BOParametres 18 ; UniversalModalBO.tsx:162 Fermer 32×32 px ; Radix uniquement dans universal/* (:4-6).

**[ADMINGEN-16] [P3] (VALABLE)** Secret webhook `!==` — bpay.controller.ts:28-32 (fail-closed correct, pas timingSafeEqual).

**[ADMINGEN-17] [P3] (VALABLE)** users.controller.ts:129-141 — DTO role non borné (compensation pending/validation inchangée).

**[ADMINGEN-18] [P2] (VALABLE)** Journal best-effort — audit-log/audit-log.service.ts console.warn sans alerte.

## 4. Risques et vulnérabilités

| ID | Risque | Criticité | Statut |
|---|---|---|---|
| ADMINGEN-01/02 | Routes + registres non gardés | P1 | Valable |
| ADMINGEN-05 | Fuite WS room « all » (C-14) | P1 | Valable |
| ADMINGEN-08 | Faux panneau Paramètres (PUT 404) | P1 | Valable |
| ADMINGEN-03/04 | Fantôme 'admin' / clés API en clair | P1 | Valable, 03 aggravé |
| ADMINGEN-06 | /cron public + retry mensonger + pause réconciliation retraits (C-15) | P2 | **Aggravé** |
| ADMINGEN-11/07/09/10/12/14/18 | Exports sans trace, POST /audit, stubs+DDL, ADMIN_ROLES, config sans audit, menu, audit best-effort | P2 | Valable |
| ADMINGEN-13 | Escrow fantôme retiré ; contenus/DDL restants | P2 | Partiellement corrigé |
| ADMINGEN-15/16/17 | A11y, timing webhook, bornage DTO | P2/P3 | Valable |

## 5. Points forts

- **J5 intact** : controller :83-116 + service exigerMotif/exigerMontant (nouveau serveur) :250-265, FOR UPDATE :279/:309/:406, assertCompteActif, journal DANS la transaction (:259-266, :297, :330, :422).
- **Aucune voie d'élévation** ni de mutation d'argent pour le rôle (403 garantis).
- **Seed BO durci** (02153dd) : hash lu à l'exécution (:171-190), '123456' refusé (:69-71), prod hard-off (:131-132).
- **Coquille escrow retirée** (ee0b4a0) ; **fix C-01 réelle** (bpay.cron.ts:131-190) ; **toggle cron réel** (cron-jobs-config.service.ts, bug tuple RETURNING corrigé).
- **Gating Dev correct en BO** : ProfileSwitcher derrière `import.meta.env.DEV` (BOLayout.tsx:1448-1449) + hostname (ProfileSwitcher.tsx:66-72) — mort en build livré.

## 6. Recommandations de correction

- ADMINGEN-01/02 : `<ExigerPermission>` sur routes.tsx:198-231 + brancher bo-permissions.ts comme source unique + garde CI d'égalité des 3 registres.
- ADMINGEN-03 : remplacer 'admin' par admin_general/admin_national (3 fichiers) + dédoublonner la liste WS.
- ADMINGEN-05 : supprimer le broadcast « all » de emitTransactionCreated.
- ADMINGEN-08 : brancher GET+PUT persistés ou masquer l'écran ; ADMINGEN-09 : tuer /admin/cron inventé + migration du DDL.
- C-15 : toggle cron → super_admin + journal ; retry = 501 ; C-13 : permission+trace sur tous les exports ; ADMINGEN-04 : hash clés API.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth BO | login +2250700000016 | Menu sans superOnly ; 403 argent |
| URL directe | /keiwa, /utilisateurs, /cron | Écran gardé OU actions 403 |
| Argent | crédit/débit/réinit | 403 (J5) ; super_admin OK motif+journal |
| Cron | toggle bpay_reconciliation | Actuellement 200 — attendu 403 (C-15) |
| Retry | POST /cron/:id/retry | Jamais « Tâche relancée » sans effet |
| WS | EventMonitor + transaction:created | admin_general reçoit admin:* ; marchand rien |
| Exports | CSV wallets + journal | Permission dédiée + trace EXPORT_* |
| Clés API | /partner/api-keys | 403 pour admin_general (M-01) |
| Seed | boot prod sans SEED_DEMO | 0 compte BO, 0 super_admin |

## 8. Tests critiques recommandés

1. admin_general vs super_admin vs admin_national sur POST /admin/wallets/:id/credit → 403/200/403.
2. Toggle bpay_reconciliation par admin_general → 403 après C-15 ; effet RÉEL vérifié (le cron des retraits s'arrête).
3. Marchand sur /ws pendant une vente tierce → aucun transaction:created.
4. PUT /admin/wallets/config/parametres → persisté ou écran masqué.
5. POST /audit par admin_general → 403 ; export CSV wallets → permission + trace.
6. Garde CI : égalité des 3 registres + zéro littéral de rôle hors UserRole.
7. Build livré : ProfileSwitcher/julaba_dev_mode absents des bundles BO.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | ADMINGEN-05 : couper broadcast WS « all » | S |
| P1 | ADMINGEN-03 : purger 'admin' + dédoublonner room WS | S |
| P1 | ADMINGEN-01/02 : gardes de route + registre unique (BO-3) | M |
| P1 | ADMINGEN-08 : brancher ou masquer Paramètres | M |
| P1 | ADMINGEN-04 : hash clés API (SCHEMA-05) | M |
| P2 | C-15 toggle→super_admin+audit ; C-13 exports tracés | S |
| P2 | ADMINGEN-07/09/10/12/14/18 : lot fermetures | M |
| P3 | ADMINGEN-15 : lot a11y BO (Radix, tokens, 44 px) | L |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité | 50/100 | ~270 hex, Fermer 32 px, modales hors Radix — inchangé |
| Sécurité | 66/100 | J5 verrouillé, seed durci, escrow retiré ; WS bavard, clés en clair, journal inscriptible |
| Argent/intégrité | 70/100 | J5 + audit in-transaction exemplaires ; C-15 aggravé (pause réconciliation retraits), exports sans trace |
| Qualité | 62/100 | Cron honnête + toggle réel ; Paramètres 404, /admin/cron inventé, DDL runtime |
| **Global** | **61/100** | Au seuil PROD — aucun constat 05/10 fermé sauf escrow/seed ; C-15 aggravé |

## 11. Conclusion + statut

Quatorze jours après la 1ʳᵉ vague, **l'autorisation BO n'a pas bougé** : mêmes 3 registres divergents, même fantôme 'admin', mêmes routes sans garde, même POST /audit ouvert, mêmes stubs. Les seuls mouvements sont positifs (escrow supprimée, seed durci, exigerMontant serveur) ou neutres (Rapport/Dev Mode réinstallés **derrière un gate de build correct**). Le C-15 **s'aggrave** : depuis la fix C-01 (12/10), le cron pausable par admin_general réconcilie aussi les RETRAITS (argent déjà débité) — la surface d'impact a grandi sans que la garde bouge. J5 reste le socle intact du rôle.

**Statut : CONFORME SOUS CONDITIONS — 18 constats reconduits (7 P1), 1 aggravé (C-15), 2 partiellement corrigés (ADMINGEN-13, exigerMontant). Aucune modification de code effectuée.**
