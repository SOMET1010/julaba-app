# AUDIT ACTEUR — ADMIN-NATIONAL — 2026-10-19

> **Mission** : 2ᵉ vague d'audits statiques par acteur (Task 45-d) — re-vérification de première main des 14 constats du 05/10 et des transverses BO (audit comptable 12/10 §5.7 : J5, C-13, M-01), sur `/home/z/julaba-wt` branche `dev`, HEAD `04ae652`. Numéros re-localisés par lecture directe.
> **Périmètre** : frontend `backoffice/` (BOLayout, BOUtilisateurs, BOKeiwa, BOAudit, BOSupervision, BOMutations, BOLogin, universal/*) ; backend `users/`, `identifications/`, `transactions-rest/`, `mutations/`, `notifications/`, `audit-rest/`, `admin/`, `auth/bo-autorisation.ts`.
> **Méthode** : statique READ-ONLY, sans exécution ni réseau. Delta git : le backend du périmètre n'a reçu QUE `ee0b4a0` (renommage audit→audit-log, suppression coquilles tickets/escrow) — **aucun changement d'autorisation**.
> **Auteur** : agent Z.ai Code — Task 45-d.

## 1. Identité et périmètre

- **Rôle** : admin_national (UserRole.ADMIN_NATIONAL) — back-office national (acteurs, enrôlement, supervision, mutations), sans comptes BO ni argent.
- **Évolutions depuis le 05/10** : défauts du rôle inchangés (bo-autorisation.ts = BackOfficeContext.tsx:191) ; ProfileSwitcher réinstallé derrière `import.meta.env.DEV` (BOLayout.tsx:1448-1449, mort en build) ; **seule amélioration métier réelle** : allow-list de champs + motif de rejet obligatoire sur PATCH /identifications/:id (identifications.controller.ts:494-517, :509-511).
- Recette runtime impossible : le compte démo dge-test@julaba.ci (seed-demo.service.ts:115) est admin_general, pas admin_national ; aucun compte du rôle dans le seed.

## 2. Fonctionnalités observées dans le code

- **Ouvert au rôle** (BOLayout.tsx:96-102, :144, :171-186 + hasPermission :767) : acteurs, enrôlement, supervision, zones, carte, modération, mutations, audit, academy, missions, notifications, support.
- **superOnly** (:141-143, :155-159) avec garde d'écran : BOInstitutions.tsx:363, BOScoreFinancier.tsx:303, BOApiKeys.tsx:78, EventMonitor.tsx:48. **Exception : BOUtilisateurs — AUCUNE garde d'écran**.
- **Serveur** : GET /users @Roles('ADMIN') (users.controller.ts:43-51) avec scope=bo servi (users.service.ts:222-233) ; PATCH /transactions/:id 3 admins (transactions-rest.controller.ts:71-73) ; PATCH /identifications/:id **sans @Roles** — liste locale isAdmin sans gestionnaire_zone (:485-488) ; send/send-bulk excluent admin_national (notifications.controller.ts:93, :141) ; GET+POST /audit 'ADMIN' (audit-rest.controller.ts:12, :30-31).
- **Argent** : crédit/débit/réinit refusés (admin-wallets.controller.ts:83-116, J5) ; gel/annulation = motif ≥5 car + audit in-transaction + restock ledger, argent jamais touché (transactions-rest.controller.ts:73-124) — conforme §8.6.

## 3. Constats détaillés

**[ADMINNAT-01] [P2] (05/10→19/10 VALABLE)** 3 matrices divergentes — BackOfficeContext.tsx:191 ≈ bo-autorisation.ts ≠ bo-permissions.ts:1-3 « non branché » : utilisateurs.read/parametres.read au rôle côté défauts, superOnly côté registre.

**[ADMINNAT-02] [P1] (VALABLE)** Annuaire des comptes BO lisible — BOUtilisateurs.tsx sans garde d'écran (seuls les boutons sont conditionnés) ; GET /users?scope=bo ouvert @Roles('ADMIN') (users.controller.ts:43-51 ; users.service.ts:222-233). URL directe → prénoms, noms, téléphones, rôles, statuts de tous les comptes BO — contredit « seul le super_admin gère les comptes BO ».

**[ADMINNAT-03] [P2] (VALABLE)** J6 non généralisé — PATCH /transactions/:id (:71-73) et PATCH /identifications/:id (:485) sous @Roles/listes locales sans exigerPermissionBO : un admin_national avec boPermissions={} garde gel/annulation/validation hors matrice.

**[ADMINNAT-04] [P2] (PARTIELLEMENT CORRIGÉ, noyau valable)** Validation d'enrôlement sans audit — identifications.controller.ts:485-585 : AUCUN auditService dans le PATCH (seul log : :618 sur DELETE draft super_admin) ; statut toujours chaîne libre ('statut' dans allowedFields sans allow-list de VALEURS). **Neuf** : allow-list de 13 champs — plus aucun spread du body — et motif_rejet obligatoire pour 'rejete' (:509-511).

**[ADMINNAT-05] [P2] (VALABLE)** Journal forgeable — audit-rest.controller.ts:31 `repo.save({...body, user_id})` accessible à tout ADMIN.

**[ADMINNAT-06] [P2] (VALABLE, = C-13)** Keiwa BO — BOKeiwa.tsx sans aucune garde de rôle : Créditer/Débiter/Réinitialiser affichés → 403 ; export CSV téléphones complets sans masquage ni trace (admin-wallets.service.ts:428-443 ; déclenché client BOKeiwa.tsx:280-289).

**[ADMINNAT-07] [P2] (VALABLE)** Stubs falsifiés — admin-analytics.controller.ts:118-130 (rapports fictifs), :132-133 (modération [] en dur), :135-136 (livraison []), :157-163 (2 jobs cron INVENTÉS), :165-173 (score 0 pour 200 users), :176-180 (health tts/stt « up ») — contredit la doctrine zéro-faux-zéro (etatSectionsBO.ts).

**[ADMINNAT-08] [P2] (VALABLE)** DDL runtime — admin-analytics.controller.ts:138-144 `ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livreur` sous @Roles('ADMIN'), sans audit.

**[ADMINNAT-09] [P3] (VALABLE)** Hex hardcodés (BODashboard 28, BOSupervision 24, BOLayout 25…) contre DESIGN_SYSTEM §9 ; pas de garde charte BO.

**[ADMINNAT-10] [P3] (VALABLE)** A11y — UniversalModalBO.tsx:162 Fermer 32×32 px ; 90 `console.*` dans les .tsx BO ; en positif universal/* sur Radix (:4-6) et BOLogin labellisé.

**[ADMINNAT-11] [P3] (VALABLE)** Superset serveur — DEFAUTS_PAR_ROLE.admin_national inclut acteurs.suspend + supervision.freeze, non vérifiés par les routes (seules 4 familles portent exigerPermissionBO).

**[ADMINNAT-12] [P3] (VALABLE)** create-super-admin sans trace — auth.controller.ts:822-840 : aucun audit log, aucun mustChangePassword, aucune politique de mot de passe.

**[ADMINNAT-13] [P3] (VALABLE)** boGetAuditLogs (backoffice-api.ts) : try/catch → `[]` — panne de lecture présentée comme journal vide.

**[ADMINNAT-14] [P3] (VALABLE)** Communication fantôme — notifications.controller.ts:93/:141 excluent admin_national pour toujours alors que l'écran est exposé (BOLayout.tsx:115).

## 4. Risques et vulnérabilités

| ID | Risque | Criticité | Statut |
|---|---|---|---|
| ADMINNAT-02 | Annuaire comptes BO lisible (URL + scope=bo) | P1 | Valable |
| ADMINNAT-03/05 | Gel/annulation/validation hors matrice ; journal forgeable | P2 | Valable |
| ADMINNAT-06 | Export PII sans masquage ni trace ; boutons morts Keiwa (C-13) | P2 | Valable |
| ADMINNAT-07/08 | Stubs falsifiés + DDL runtime | P2 | Valable |
| ADMINNAT-04 | Validation sans audit (motif rejet forcé = progrès) | P2 | Partiellement corrigé |
| ADMINNAT-01/11 | Matrices divergentes, superset serveur | P2/P3 | Valable |
| ADMINNAT-09/10/13/14 | Hex, 32 px, console.*, audit avalé, communication | P3 | Valable |
| ADMINNAT-12 | create-super-admin non journalisé | P3 | Valable |

## 5. Points forts

1. **Élévation impossible** : admin_national absent des rôles créables BO ; POST /users/backoffice-account = super_admin (users.controller.ts:190-192) ; exigerAutoriteSur bloque toute écriture sur compte BO.
2. **Argent intouchable (J5)** : 403 sur crédit/débit/réinit ; l'annulation ne touche pas l'argent (« L'argent n'est PAS touché », transactions-rest.controller.ts:105-108) et restitue le stock dans la même transaction.
3. **Amélioration réelle identifications** : allow-list + motif obligatoire + détection P0.0 activation (:534-560).
4. **PIN/secrets intacts** : PIN né serveur, jamais lisible ni journalisé ; @Exclude sur champs d'auth ; masquerTelephone sur remises.
5. **Seed BO durci** (02153dd) : le compte démo n'existe qu'avec SEED_DEMO_BO_PASSWORD ≠ '123456' (:64-75) ; prod hard-off (:131-132).
6. **Fail-closed de classe** : RolesGuard (roles.guard.ts:26-33) ; JwtStrategy recharge l'utilisateur en base à chaque requête.

## 6. Recommandations de correction

- ADMINNAT-02 (P1) : garde superOnly sur BOUtilisateurs + retirer utilisateurs.read/parametres.read de DEFAUTS_PAR_ROLE.admin_national + exigerPermissionBO('utilisateurs.read') sur GET /users.
- ADMINNAT-03 : généraliser J6 (supervision.freeze, enrolement.validate).
- ADMINNAT-04 : IDENTIFICATION_VALIDEE/REJETEE dans audit_logs DANS la transaction + allow-list des valeurs de statut.
- ADMINNAT-05 : supprimer POST /audit ou super_admin only (IP serveur).
- ADMINNAT-06/C-13 : BOKeiwa rôle-aware ; téléphones masqués + trace EXPORT_* sur chaque export.
- ADMINNAT-07/08 : brancher modération sur user-flags ; tuer /admin/{rapports,scores,communication,cron} inventés ; migrer l'ALTER TABLE.
- ADMINNAT-12 : journaliser createSuperAdmin + mustChangePassword forcé.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth BO | login admin_national | Menu sans superOnly ; mustChangePassword honoré |
| URL directe | /utilisateurs, /institutions, /keiwa | Écran refusé OU liste non servie (ADMINNAT-02) |
| API directe | PATCH /transactions/:id, /identifications/:id sans boPermissions | Refus si permission absente (ADMINNAT-03) |
| Élévation | création super_admin / admin_general | 403 partout |
| Argent | credit/debit/reset | 403 (J5) ; annulation = statut+restock+audit |
| Audit | validation dossier, export CSV, POST /audit | 1 ligne/action ; écriture refusée |
| PII | téléphones dans export CSV | Masqués + export tracé (ADMINNAT-06) |
| A11y | modales Universal BO | Focus trap Radix, Fermer ≥44 px, ESC |
| Stubs | /admin/health, /admin/moderation | Valeurs réelles ou 501 assumé |

## 8. Tests critiques recommandés

1. admin_national ouvre /backoffice/utilisateurs → 0 compte BO affiché.
2. boPermissions={} + PATCH /transactions/:id (gel) → 403 après BO-3.
3. Rejeu d'annulation → 1 seul restock, 1 seul TRANSACTION_STATUT_ANNULEE.
4. POST /audit par admin_national → 403 ; export CSV wallets → téléphones masqués + trace.
5. Validation de dossier → IDENTIFICATION_VALIDEE (auteur, motif, IP) présente.
6. POST /users/backoffice-account par admin_national → 403.
7. Clavier sur UniversalModalBO : Tab/ESC, Fermer ≥44 px mesuré.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | ADMINNAT-02 : garde BOUtilisateurs + défauts serveur | S |
| P2 | ADMINNAT-03 : généraliser exigerPermissionBO | M |
| P2 | ADMINNAT-04 : audit in-transaction + valeurs de statut bornées | S |
| P2 | ADMINNAT-05 : fermer POST /audit | S |
| P2 | ADMINNAT-06 : BOKeiwa rôle-aware + exports masqués/tracés | M |
| P2 | ADMINNAT-07/08 : tuer les stubs + sortir le DDL | S |
| P2 | ADMINNAT-01/11 : source unique + garde CI | M |
| P3 | ADMINNAT-09/10/13/14 : boCharte, 44 px, warnDev, communication | M |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité | 70/100 | Socle Radix + BOLogin exemplaires ; Fermer 32 px, console.*, hex |
| Sécurité | 73/100 | Élévation/PIN/secrets solides ; annuaire BO lisible (P1), journal forgeable, PII exportable |
| Argent/intégrité | 76/100 | J5 tenu, annulation conforme ; exports sans trace, KPI stubs |
| Qualité | 72/100 | Transactions atomiques, allow-list identifications neuve ; stubs falsifiés, DDL, 3 matrices |
| **Global** | **70/100** | PROD conditionnel — un seul P1 (ADMINNAT-02) à fermer avant montée en charge |

## 11. Conclusion + statut

Le rôle reste **correctement bridé sur l'essentiel** : pas de création de compte administrateur, pas d'argent (J5 vérifié ligne à ligne), annulation exemplaire (motif + audit + restock même transaction, argent jamais touché). Le delta 05/10→19/10 est quasi nul sur son backend : **14 constats sur 14 restent valables**, dont un partiellement corrigé (allow-list + motif obligatoire sur l'enrôlement — progrès réel mais sans audit journalisé). Le seul P1 (annuaire des comptes BO lisible par URL, ADMINNAT-02) est une correction d'une demi-journée. Les stubs falsifiés (/admin/health « tts: up », scores 0, jobs cron inventés) demeurent l'écart le plus gênant vis-à-vis de la doctrine zéro-faux-zéro.

**Statut : CONFORME SOUS CONDITIONS — 14 constats reconduits (1 P1), 1 partiellement corrigé. Aucune modification de code effectuée.**
