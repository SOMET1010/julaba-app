# AUDIT ACTEUR — SUPER-ADMIN — 2026-10-19

> **Mission** : 2ᵉ vague d'audits statiques par acteur (Task 45-d) — re-vérification de première main des 15 constats du 05/10 et des transverses (audit comptable 12/10 §5.10 : fix C-01, C-13/C-14/C-15, M-01/M-08), sur `/home/z/julaba-wt` branche `dev`, HEAD `04ae652`. Numéros re-localisés par lecture directe.
> **Périmètre** : allow-lists rôles + création super_admin (auth/), seed BO (database/seed-demo.service.ts), EventMonitor/WS (events/), cron (misc-rest/, cron-jobs/, bpay/bpay.cron.ts), clés API partenaires (partner/), journal d'audit (audit-rest/), gating Rapport/Dev Mode (04ae652), routes DEV, WebAuthn.
> **Méthode** : statique READ-ONLY. Delta git : `a0d56f5`+`35ae18d` (12/10 fix C-01 réconciliation retraits), `02153dd` (12/10 seed BO durci), `ee0b4a0` (06/10 reorg), `e04fa73`→`04ae652` (13-15/10 Rapport/Dev Mode).
> **Auteur** : agent Z.ai Code — Task 45-d.

## 1. Identité et périmètre

- **Rôle** : super_admin — plus haut privilège ; seul détenteur de la mutation d'argent BO (J5), de la gestion des comptes BO et des permissions.
- **Évolutions depuis le 05/10** : (1) **C-01 FERMÉ** — bpay.cron.ts réconcilie les retraits (`a0d56f5`, 12/10) ; (2) **seed BO durci** — mot de passe lu à l'exécution (`02153dd`), jamais en code, '123456' refusé ; (3) **Rapport/Dev Mode réinstallés** dans BOLayout (:1448-1449) derrière `import.meta.env.DEV` — évalué §3 (SUPERADMIN-16) ; (4) coquilles tickets/escrow supprimées (ee0b4a0). **Aucun changement d'autorisation** sur cron/audit/api-keys : les 15 constats du 05/10 restent ouverts.

## 2. Fonctionnalités observées dans le code

| Capacité | Implémentation actuelle | Preuve re-vérifiée |
|---|---|---|
| Mutation d'argent BO | super_admin only, motif, audit DANS la transaction, FOR UPDATE | admin-wallets.controller.ts:83-116 ; admin-wallets.service.ts:250-265, :267-301, :303-337, :400-426 |
| Créer super_admin | @Roles('super_admin') mais SANS audit ni mustChangePassword | auth.controller.ts:822-840 |
| Cron toggle | super_admin **et** admin_general, sans journal | misc-rest.controller.ts:75-77 |
| Cron retry | répondeur factice `{success:true, relancedAt}` | misc-rest.controller.ts:83-88 ; BOCronDashboard.tsx:110-119 |
| Réconciliation B-PAY (C-01) | @Cron */5 min, PENDING + PENDING_WITHDRAW, remboursement, alerte >24 h | bpay.cron.ts:23-24, :110, :131-190 ; cron-jobs.registry.ts:29-36 |
| Clés API partenaires | jamais relisibles (aperçu left(key,11)) mais en clair au repos | partner-api-keys.service.ts:18-22, :66-72 ; api-key.guard.ts:25, :34 |
| EventMonitor | gate client role !== 'super_admin' ; donnée diffusée AVANT | EventMonitor.tsx:48 ; events.gateway.ts:95-98, :60 |
| Audit | GET/POST ouverts à tout rôle ADMIN | audit-rest.controller.ts:12, :30-31 |
| Seed BO | SEED_DEMO_BO_PASSWORD obligatoire, '123456' refusé, prod hard-off, hash runtime | seed-demo.service.ts:64-75, :131-132, :154-168, :171-190 |
| Routes DEV | gated par constante de build | routes.tsx:28, :64 |

## 3. Constats détaillés

**[SUPERADMIN-01] [P1] (05/10→19/10 VALABLE, = C-14)** La donnée de l'EventMonitor n'est pas réservée — events.gateway.ts:60 (tous les clients authentifiés en room « all ») et :95-98 : `emitTransactionCreated` diffuse le payload complet (montant, userId) en broadcast public avant le gate de EventMonitor.tsx:48. La protection vit dans l'UI, pas dans la donnée.

**[SUPERADMIN-02] [P3] (VALABLE, aggravé en détail)** Room « admin » — events.gateway.ts:62 : contient le fantôme 'admin', **omet admin_general** et contient **operateur_terrain EN DOUBLE** ; :126 getStats réservé à 'admin'+super_admin.

**[SUPERADMIN-03] [P2] (VALABLE)** GET /cron sans @Roles (misc-rest.controller.ts:49-73) : jobs, planification de la réconciliation B-PAY, compteurs, dernière erreur — lisibles par tout authentifié.

**[SUPERADMIN-04] [P2] (VALABLE, AGGRAVÉ — = C-15)** Pause de la réconciliation par admin_general — misc-rest.controller.ts:75-77 `@Roles('super_admin','admin_general')`, sans journal. **Aggravation depuis le 12/10** : le job pausable (`bpay_reconciliation`) est DEPUIS C-01 celui qui réconcilie aussi les RETRAITS mobile money (bpay.cron.ts:131-190 — argent DÉJÀ débité en attente de confirmation opérateur ou de remboursement). Retry factice (:83-88) + toast « Tâche relancée » de BOCronDashboard.tsx:110-119 ferment le tableau.

**[SUPERADMIN-05] [P2] (VALABLE)** Piste d'audit falsifiable — audit-rest.controller.ts:31 : POST tout ADMIN, `repo.save({...body, user_id})` sans filtre ni allow-list d'action.

**[SUPERADMIN-06] [P2] (VALABLE, = M-08)** Clés API en clair au repos — partner-api-keys.service.ts:18-22 (constat assumé), :66-72 INSERT sans hash ; api-key.guard.ts:25 `WHERE key = $1`, :34 usage_count par clé brute. Dump DB = toutes les clés partenaires.

**[SUPERADMIN-07] [P2] (VALABLE)** Journalisation lacunaire — createSuperAdmin (auth.controller.ts:822-840) : AUCUN audit, AUCUN mustChangePassword, aucune politique de mot de passe ; toggle cron (misc-rest:75-79) sans journal ; api-keys create/patch (partner.controller.ts:38-70) sans journal ; support/config GET sans rôle (misc-rest:161-174), POST JSON non validé 'super_admin+admin_general' (:175+).

**[SUPERADMIN-08] [P2] (VALABLE)** 2FA non exigée — WebAuthn implémenté mais optionnel ; mot de passe seul = accès super_admin complet.

**[SUPERADMIN-09] [P2] (VALABLE)** Bootstrap du 1ᵉʳ super_admin — @Roles('super_admin') sur create-super-admin (auth.controller.ts:822-825) : SQL manuel non documenté ; page CreateSuperAdmin.tsx toujours côté dev.

**[SUPERADMIN-10] [P2] (VALABLE)** Routes DEV — routes.tsx:28 (`isDev = import.meta.env.DEV`)/:64 : fiable au BUILD, mais un serveur Vite dev exposé (cas du sandbox) sert /database, /create-super-admin, /setup-marchand, /dev-mode sans auth.

**[SUPERADMIN-11] [P3] (VALABLE, impact BO réduit)** useDevMode.ts:14 : `import.meta.env.DEV || localStorage 'julaba_dev_mode'` — mais le ProfileSwitcher du BO est gated par `import.meta.env.DEV` DIRECTEMENT (BOLayout.tsx:1448-1449) : impact BO nul en build livré.

**[SUPERADMIN-12] [P3] (VALABLE)** Pas de règle « dernier super_admin » — auto-dégradation possible (isOwner court-circuite exigerAutoriteSur).

**[SUPERADMIN-13] [P3] (VALABLE)** POST /support/config — JSON sans schéma, GET lisible par tout authentifié (misc-rest:161-174).

**[SUPERADMIN-14] [P3] (PARTIELLEMENT CORRIGÉ)** Seed — le réalignement à chaque boot est écrasé par le démarrage rapide (seed-demo.service.ts:143-155) ; mots de passe BO jamais en code (:64-75). Restent : mustChangePassword=false posé sur les comptes démo (:199-213) et le réalignement initial complet.

**[SUPERADMIN-15] [P3] (VALABLE)** Incohérences mineures (JWT défaut vs émission ; REJETE non revérifié par JwtStrategy).

**[SUPERADMIN-16] [NOUVEAU] [P3]** Bouton « Rapport » réinstallé dans AppLayout.tsx:173-192 (tous les écrans connectés, hors BO) — NON gated, assumé par le commentaire comme instrument de recette (« À RETIRER QUAND LE PILOTE SERA QUALIFIÉ »). À ne pas livrer tel quel en production.

## 4. Risques et vulnérabilités

| ID | Risque | Criticité | Statut |
|---|---|---|---|
| SUPERADMIN-01 | transaction:created diffusée à tous les clients WS (C-14) | P1 | Valable |
| SUPERADMIN-04 | Pause de la réconciliation (retraits inclus) par admin_general + retry factice (C-15) | P2 | **Aggravé** |
| SUPERADMIN-03/05 | GET /cron public ; POST /audit forgeable | P2 | Valable |
| SUPERADMIN-06 | Clés API en clair au repos (M-08) | P2 | Valable |
| SUPERADMIN-07 | createSuperAdmin/toggle/api-keys non journalisés | P2 | Valable |
| SUPERADMIN-08/09/10 | 2FA optionnelle, bootstrap SQL non documenté, routes DEV | P2 | Valable |
| SUPERADMIN-02 | Room WS fantôme + admin_general absent + doublon | P3 | Valable, détail aggravé |
| SUPERADMIN-11/12/13/15/16 | Flag dev, dernier super_admin, support/config, JWT, Rapport | P3 | Valable |
| SUPERADMIN-14 | Réalignement seed | P3 | Partiellement corrigé |

## 5. Points forts

1. **J5 intact et exemplaire** : super_admin SEUL mutateur d'argent BO, motif ≤500 car, FOR UPDATE, assertCompteActif, journal auteur/montant/motif/soldes avant/après DANS la transaction (admin-wallets.service.ts:250-266, :297, :330, :422) — panne du journal = mouvement annulé.
2. **C-01 FERMÉ** : réconciliation des retraits PENDING_WITHDRAW idempotente (`UPDATE ... WHERE status='PENDING_WITHDRAW'`, bpay.cron.ts:154), remboursement atomique sur refus opérateur (:175), alerte ERROR >24 h (:188).
3. **Seed BO durci** (02153dd) : hash lu à l'exécution (:171-190), '123456' refusé (:69-71), comptes BO non créés sans variable (:154-168), prod hard-off (:131-132), aucun super_admin dans le seed.
4. **Anti-élévation triple fail-closed** : allow-list contrôleur + ROLES_JAMAIS_GENERIQUES + rolesCreablesPar ; POST /users/backoffice-account = super_admin (users.controller.ts:190-192) ; PATCH bo-permissions = super_admin (:410-412).
5. **Toggle cron réel** : cron-jobs-config.service.ts persiste l'état (bug tuple RETURNING corrigé et documenté), le job lit isEnabled avant chaque exécution.
6. **Gating Rapport/Dev Mode correct en build** : BOLayout.tsx:1448-1449 et AppLayout.tsx:195 derrière `import.meta.env.DEV` (branche morte) + gate hostname (ProfileSwitcher.tsx:66-72).
7. **Odoo POC fail-closed** (odoo-gateway.controller.ts:18-24 ; crash au boot en real sans secrets, odoo-client.config.ts:36-37) ; **coquilles tickets/escrow supprimées** (ee0b4a0).

## 6. Recommandations de correction

- SUPERADMIN-04/C-15 (priorité argent) : toggle → @Roles('super_admin') + journal CRON_TOGGLE (qui, quoi, avant/après) ; retry = 501.
- SUPERADMIN-01/C-14 : supprimer le broadcast « all » de emitTransactionCreated ; room super_admin dédiée à l'EventMonitor.
- SUPERADMIN-02/M-01 : remplacer la liste WS littérale par BO_ROLES importé (corrige fantôme + oubli + doublon) ; idem bpay.controller.ts:198 et financial-score.service.ts:35.
- SUPERADMIN-05 : supprimer POST /audit (l'audit s'écrit côté serveur).
- SUPERADMIN-06 : hash SHA-256 des clés API + migration (SCHEMA-05).
- SUPERADMIN-07 : journaliser createSuperAdmin (+ mustChangePassword), toggle, api-keys, support/config ; SUPERADMIN-03 : @Roles sur GET /cron.
- SUPERADMIN-08/09/10 : passkey obligatoire super_admin ; runbook bootstrap ; ne jamais exposer un serveur Vite hors loopback ; SUPERADMIN-16 : retirer le bouton Rapport du build production.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Élévation | signup role=super_admin × {sans token, acteur, admin_general} | 403 partout, 0 ligne créée |
| Création super_admin | POST /auth/create-super-admin par super_admin | 200 + ligne audit (actuellement 200 SANS audit) |
| Argent | credit/debit/reinit par super_admin | Motif obligatoire ; journal = mouvement (même transaction) |
| Cron toggle | par admin_general | 403 après C-15 ; par super_admin : effectif + journalisé |
| Réconciliation | retrait refusé opérateur | Wallet recrédité dans la même tx que le statut (C-01) |
| WS | marchand sur /ws | AUCUN transaction:created reçu |
| Audit | POST /audit par admin_general | 403 (actuellement 200) |
| API keys | liste/rotation | Jamais de clé complète ; hash au repos |
| Seed | boot prod sans SEED_DEMO | 0 compte BO, 0 super_admin |
| Dev Mode | build livré | ProfileSwitcher absent des bundles ; Rapport absent ou documenté |
| Passkeys | super_admin avec passkey | Politique 2FA appliquée |

## 8. Tests critiques recommandés

1. Matrice d'élévation complète (signup × 4 identités × 4 rôles) → 403 hors acteurs.
2. create-super-admin → ligne audit SUPER_ADMIN_CREATION (régression SUPERADMIN-07).
3. Toggle bpay_reconciliation par admin_general → 403 ; effet RÉEL (statut cron_jobs_config + absence d'exécution).
4. Retrait refusé par l'opérateur → wallet recrédité + REFUNDED dans la même transaction (régression C-01).
5. Marchand sur /ws pendant une vente tierce → aucun payload transaction.
6. POST /audit par operateur_terrain → 403 ; dump api_keys → aucune clé utilisable (post-hash).
7. Bundle production : absence de ProfileSwitcher, julaba_dev_mode, /database, create-super-admin.
8. Suspension d'un super_admin → 401 à la requête suivante ; rotation d'une clé API → ancienne rejetée.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | SUPERADMIN-01/C-14 : stop broadcast WS « all » | M |
| P2 | SUPERADMIN-04/C-15 : toggle → super_admin + audit + retry honnête | S |
| P2 | SUPERADMIN-05 : fermer POST /audit | S |
| P2 | SUPERADMIN-07 : journaliser createSuperAdmin/toggle/api-keys/support | S |
| P2 | SUPERADMIN-06/M-08 : hash clés API (migration) | M |
| P2 | SUPERADMIN-03 : @Roles sur GET /cron | S |
| P2 | SUPERADMIN-08/09/10 : passkey, runbook bootstrap, serveurs dev | M |
| P3 | SUPERADMIN-02/M-01 : BO_ROLES en WS + purge 'admin'/doublon | S |
| P3 | SUPERADMIN-11/12/13/15/16 : lot hygiène | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité | 56/100 | Écrans système (CreateSuperAdmin, DatabaseViewer) hors normes ; universal/*BO corrects |
| Sécurité | 74/100 | Anti-élévation triple fail-closed, seed durci, odoo fail-closed ; WS bavard (P1), clés en clair, audit forgeable |
| Argent/intégrité | 74/100 | J5 exemplaire + C-01 fermé ; MAIS pause de la réconciliation des retraits à portée d'admin_general (C-15 aggravé) |
| Qualité | 71/100 | Toggle cron réel et documenté ; retry factice, stubs /admin/*, bootstrap non documenté |
| **Global** | **71/100** | Au-dessus du seuil PROD — conditionné à C-14 (P1) et au lot cron/audit |

## 11. Conclusion + statut

Le verrou central (§8.8) tient toujours : **nul ne devient super_admin par les portes normales**, le seed n'en crée aucun, et J5 fait du super_admin le seul mutateur d'argent avec un journal in-transaction exemplaire. La 2ᵉ vague apporte deux vraies fermetures (C-01 : les retraits mobile money sont réconciliés avec remboursement atomique ; seed BO : plus aucun mot de passe en code, prod hard-off, hash lu à l'exécution) et un gating Rapport/Dev Mode **correctement fait** (constante de build + hostname, mort en build livré — le faux super_admin du ProfileSwitcher ne peut pas sortir dans un bundle). Le point qui s'aggrave est C-15 : la pause de la réconciliation (désormais celle des RETRAITS, argent déjà débité) reste accessible à admin_general, sans journal, avec un bouton retry qui ment. Les 15 constats du 05/10 restent ouverts hors SUPERADMIN-14.

**Statut : CONFORME SOUS CONDITIONS — 15 constats reconduits (1 P1, C-15 aggravé), C-01 fermé, seed durci, gating dev correct. Aucune modification de code effectuée.**
