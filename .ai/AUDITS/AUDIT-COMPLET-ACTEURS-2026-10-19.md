# AUDIT COMPLET — Les 10 acteurs — 2ᵉ vague — 2026-10-19

> **Mission** : « Fais moi un audit complet pour chaque acteur » (Patrick, 19/10/2026).
> **Périmètre** : les 10 rôles de `UserRole` (`backend/src/users/entities/user.entity.ts:18-29`), tous workflows (argent, stock, enrôlement, supervision, offline, voix, a11y) — pas seulement l'argent (cf. audit comptable du 12/10).
> **Méthode** : seconde vague. 4 explorations parallèles (Tasks 45-a à 45-d) sur l'arbre **`dev@04ae652`** (worktree `/home/z/julaba-wt`) ; chaque constat re-vérifié de première main (preuves `fichier:ligne` relocalisées, jamais recopiées) ; recoupement avec les 10 audits du 05/10 (`.ai/AUDITS/ACTEURS/*2026-10-05.md`), l'audit comptable du 12/10 et les registres (`.ai/BUGS.md`, `.ai/SEC_BUGS.md`, `.ai/DEBT_REPORT.md`, `.ai/INCIDENTS.md`) ; delta git `--since=2026-10-05`.
> **Auteurs** : agents Z.ai Code (sandbox) Tasks 45-a/45-b/45-c/45-d, synthèse Task 45 — worklog 45.

---

## 1. Tableau général des 10 acteurs

| # | Acteur | 05/10 | **19/10** | Δ | Statut | Constat dominant |
|---|---|---|---|---|---|---|
| 1 | **Marchand** (grossiste/demi-grossiste/détaillant) | 80 | **82** | +2 | CONFORME SOUS CONDITIONS | MARCHAND-01 : crédit gelé UI seulement (I4/I6 `it.failing`, routes serveur ouvertes sans flag) |
| 2 | **Producteur** | 54 | **61** | +7 | CONFORME SOUS CONDITIONS | PRODUCTEUR-02/C-08 : IDOR `vendeur_id` + total encaissé jamais recalculé serveur |
| 3 | **Coopérateur** | 54 | **54** | = | **NON CONFORME** | C-02 : argent déclaratif (clôture « payé » sans mouvement, cotisation auto-validée non idempotente) |
| 4 | **Identificateur** | 61 | **61** | = | CONFORME SOUS CONDITIONS | C-12 : self-approbation du statut d'un dossier (PATCH propriétaire, zéro audit) |
| 5 | **Institution** | 42 | **43** | +1 | **NON CONFORME** | INSTITUTION-01 P0 : `/oneci/*` monté avec JwtAuthGuard SEUL (aucun rôle, aucun journal) |
| 6 | **Admin général** | 60 | **61** | +1 | CONFORME SOUS CONDITIONS | Routes BO sans garde front (`routes.tsx:198-231`) + fantôme `'admin'` |
| 7 | **Admin national** | 71 | **70** | −1 | CONFORME SOUS CONDITIONS | Annuaire des comptes BO lisible par URL (BOUtilisateurs sans garde + `users.service.ts:222-233` scope=bo) |
| 8 | **Gestionnaire de zone** | 59 | **58** | −1 | **NON CONFORME** | 6 P1 reconduits : pas de zone-scope sur `GET /users`, IDOR, fail-open `zoneId` nul, écritures via jeton ADMIN |
| 9 | **Opérateur terrain** | 61 | **61** | = | CONFORME SOUS CONDITIONS (non recetable) | 16/16 constats 05/10 valables, aucun corrigé ; aucun compte OT au seed |
| 10 | **Super admin** | 72 | **71** | −1 | CONFORME SOUS CONDITIONS | C-15 AGGRAVÉ : le cron pausable (super_admin **OU** admin_general, sans audit) réconcilie désormais AUSSI les retraits |

| | 05/10 | 19/10 |
|---|---|---|
| **MOYENNE GLOBALE** | 61,4/100 | **62,2/100** |
| NON CONFORMES | 2 (coopérateur, institution) | **3** (coopérateur, institution, gestionnaire de zone) |

---

## 2. Ce qui a changé depuis le 05/10 (delta `dev`, 30+ commits)

### Corrigé (vérifié de première main)
| Constat | Correction | Preuve 19/10 |
|---|---|---|
| **C-01** (retraits mobile money non réconciliés) — FERMÉ 12/10 | statut opérateur vérifié avant `COMPLETED`, `PENDING_WITHDRAW` réconcilié par cron + remboursement atomique + alerte >24 h, `pay_token = RET-<uuid>` | `bpay.cron.ts:23-24,131-190`, `wallets.controller.ts` (retraits), webhook `bpay.controller.ts` |
| PRODUCTEUR-01 (P0 : `speak` muet) | réparation du pipeline voix | `AppContext.tsx:726-748` (2e12cf6, 06/10) |
| PRODUCTEUR-06/C-10 volet revenus (graphique fictif en dur) | graphique supprimé — **résidu** : `revenusTotal` compte encore les non payées (BUG-010) | `ProducteurContext.tsx:611-614` |
| INSTITUTION-13 (mapping statut↔actif) | alignement RC 07/10 | `institutions.controller.ts:11-23,110` |
| Menu `<>` de test des rôles (a6a9eff) | retiré par 04ae652 (0 import restant) + double barrière `if (!import.meta.env.DEV) return null` | `MenuRolesTest.tsx:57` |
| ADMIN-NATIONAL (dérive identifications) | allow-list + motif obligatoire sur `PATCH /identifications/:id` | `identifications.controller.ts:494-511` |
| MARCHAND-01 (nuance) | I5 promu `it()` vert — **I4/I6 toujours `it.failing`** | `blockers.spec.ts` |
| Escrow backend fantôme | module mort SUPPRIMÉ (ee0b4a0) — mais le faux escrow `WalletContext:118-121` reste seul côté client (C-16 aggravé en contexte) | `WalletContext.tsx` |

### Aggravé (nouvelle vague)
| Constat | Aggravation | Preuve |
|---|---|---|
| **Bouton « Rapport » 🐞 NON gated** — livré en production, visible de tous (connexion + tous les écrans marchand/producteur/coop) ; commentaire code : « À RETIRER QUAND LE PILOTE SERA QUALIFIÉ ». Le ProfileSwitcher (Dev Mode), lui, est correctement gated sur 6 sites | **NOUVEAU** | `LoginPassword.tsx:1531-1544`, `AppLayout.tsx:172-192` |
| **PII identification migrée sessionStorage → localStorage** (nin, CNPS, CMU, signature « survivent au redémarrage ») | IDENTIFICATEUR-04 aggravé | `FicheIdentificationDynamique.tsx:976-1017` |
| **C-15 aggravé par la fix C-01** : le cron que admin_general peut mettre en pause réconcile maintenant aussi les RETRAITS (argent déjà débité) + retry factice `{success:true}` + toast mensonger | SUPERADMIN-04 | `misc-rest.controller.ts:75-88`, `BOCronDashboard.tsx:110-119` |
| **MARCHAND-13** : CAI-09 (journée fermée) appelé HORS transaction pour vente/dépense (fenêtre TOCTOU) alors que les crédits l'appellent DANS la tx | NOUVEAU | `caisse-rest.controller.ts:697,843` vs `credits.controller.ts:158,207` |
| **MARCHAND-09 étendu** : `NaN` traverse toutes les gardes wallets (`NaN<200` faux, `NaN<=0` faux) — recharge ET retrait corrompables en API directe | étendu | `wallets.controller.ts:46-47,107-108` |
| **IDENTIFICATEUR-16** : 6 routes Keiwa montées sous `/identificateur` avec JwtAuthGuard seul — la « neutralité monétique » de l'identificateur est une convention de navigation, PAS un contrôle serveur | NOUVEAU | `routes.tsx:182-187`, `wallets.controller.ts:15-16` |
| MARCHAND-06 : +3 couleurs hors cliquet dans `AppLayout:186` (fichier absent des plafonds) | léger | `charteMarchande.test.mts` |

### Non corrigé (inchangé — préuves re-confirmées ligne à ligne)
C-02 (coopérative, mot pour mot depuis le 12/10), C-04, C-05, C-06, C-07 (webhooks sans HMAC + `pay_token`/`merchant_tx_id` sans unicité — résidu de C-01), C-08, C-09, C-10 (résidu BUG-010), C-11, C-12, C-13, C-14, C-16, C-17, C-18 (P0 ONECI = INSTITUTION-01), D-05, M-01, M-02, M-03, M-05, M-06 (BUG-008/009), M-08 ; **0 correctif serveur sur producteur et coopérative depuis le 05/10** ; opérateur terrain 16/16 ouvert.

---

## 3. Verrous transverses (état au 19/10)

| Verrou | État | Preuve |
|---|---|---|
| **J5** (mutation argent BO = super_admin only, motif, audit même tx) | ✅ TENU | `admin-wallets.controller.ts:83-116`, service `:250-265`, FOR UPDATE `:279/:309/:406` |
| **C-01 réconciliation retraits** | ✅ FERMÉ (mais voir C-15) | `bpay.cron.ts:131-190` |
| **Gating dev/prod** : ProfileSwitcher/Dev Mode | ✅ SAIN (6 sites gated + garde interne + hostname) | `BOLayout.tsx:1448-1449`, `ProfileSwitcher.tsx:66-72` |
| **Gating dev/prod** : bouton Rapport | ❌ NON GATED (connexion + AppLayout) | `LoginPassword.tsx:1531-1544`, `AppLayout.tsx:172-192` |
| **Seed BO en production** | ✅ SÛR : hard-off (`seed-demo.service.ts:131-132`), mdp jamais en code, hash lu à l'exécution ; défaut = 0 super_admin et 0 gestionnaire_zone seedés (recette GZ impossible) | `seed-demo.service.ts:64-75,171-190` |
| **Cailloux dans la chaussure des sondes runtime** : toujours aucun compte `gestionnaire_zone` ni `operateur_terrain` au seed | ⚠️ | idem |

---

## 4. Recommandations consolidées (priorisation inter-acteurs)

**P1 — avant le prochain APK pilote / tout élargissement**
1. **Gater le bouton Rapport** (`import.meta.env.DEV`) sur `LoginPassword` + `AppLayout` — effort S, élimine le seul élément dev livré en prod (le prochain APK l'embarquera sinon).
2. **P0 ONECI** : rôles + journal d'audit sur `/oneci/*` (institutions) — effort M.
3. **Annuler la régression PII** : brouillon d'identification retour à sessionStorage (ou purge à la fermeture) — effort S.
4. **Blinder C-15** : retirer `admin_general` du toggle cron + entrée d'audit + supprimer le retry factice — effort S (la pause bloque maintenant la réconciliation des retraits débités).
5. **C-02 comptabilisation coopérative** (chantier déjà en file) + **C-07** (HMAC webhooks + unicité `pay_token`) — efforts M/L.
6. **C-05/C-06** : condamner ou mettre au niveau la route héritée `/caisse/transactions` + fermer `PATCH /session/fond` sur journée fermée — efforts S/M.
7. **Machine à états statut identification + permission serveur `enrolement.validate`** (C-12 / OPERATEUR-06) — effort M.

**P2**
8. Zone-scope sur `GET /users` + IDOR + fail-open `zoneId` (gestionnaire de zone, 6 P1) — M.
9. Garde de route front sur `/bo/*` + garde serveur sur l'annuaire des comptes BO — S/M.
10. Verdir I4/I6 + feature-flag serveur crédit avant toute réactivation (C-04) — M.
11. NaN-guards sur montants wallets (MARCHAND-09) + CAI-09 DANS la transaction vente/dépense (MARCHAND-13) — S.
12. Re-câbler le résidu BUG-010 (`revenusTotal`) — S.
13. Seed : comptes `gestionnaire_zone` + `operateur_terrain` (recette runtime) — S.

**P3** : routes Keiwa sous `/identificateur` à débrancher ou blinder (IDENTIFICATEUR-16), dédoublonner `'admin'` fantôme (M-01), clés API chiffrées (M-08), offline terrain (identificateur/OT), exports CSV permission+trace (C-13), WS rooms ciblées (C-14), isolation territoriale agrégats (C-11).

---

## 5. Verdict global

| Domaine | Lecture 19/10 |
|---|---|
| **Cœur pilote (marchande espèces)** | 82/100 — tient et progresse (+2) ; les 4 conditions du statut restent : gel crédit, gate Rapport, NaN/CAI-09, recette IDOR/modales |
| **Espaces enrôlement/lecture (identificateur, opérateur)** | 61/100 — au seuil sans marge ; la PII en localStorage est une régression à annuler d'urgence |
| **Back-office (admin général/national, super admin)** | 61-71/100 — J5 exemplaire ; exports/WS/cron/annuaire à blinder |
| **Producteur** | 61/100 — première fois au-dessus du seuil (+7, grâce à la voix et au graphique) ; reste IDOR + prix non recalculé + offline |
| **Coopérative** | 54/100 — **NON CONFORME**, l'argent y est toujours déclaratif (C-02, mot pour mot depuis le 12/10) |
| **Institution** | 43/100 — **NON CONFORME**, P0 ONECI ouvert + 4 canaux PII nationaux non scopés |
| **Gestionnaire de zone** | 58/100 — **NON CONFORME** pour comptes réels, 6 P1 reconduits, non recetable (seed manquant) |
| **GLOBAL** | **62,2/100** (+0,8 vs 05/10) — le pilote marchande peut continuer ; coopérative, institution et gestionnaire de zone restent interdits d'exposition réelle |

> **En une phrase** : en 14 jours, la plateforme a fermé son plus gros trou d'argent (C-01) et fait sortir le producteur du rouge, mais n'a corrigé **aucun** des constats serveurs coopérative/institution/zone — et la vague a révélé une nouvelle classe de risque « gating » : un élément de recette (bouton Rapport) est livré en production, et la PII d'enrôlement a migré vers un stockage plus persistant.

## 6. Sources
- 10 fichiers d'audit détaillés : `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-*-2026-10-19.md` (1 602 lignes, preuves relocalisées)
- Historiques : `.ai/AUDITS/ACTEURS/*2026-10-05.md`, `.ai/AUDITS/AUDIT-COMPTA-ACTEURS-2026-10-12.md`
- Registres : `.ai/{BUGS,SEC_BUGS,DEBT_REPORT,INCIDENTS}.md`
- Arbre audité : `dev@04ae652` (worktree `/home/z/julaba-wt`) ; delta `git log --since=2026-10-05`
- Worklog : Tasks 37-44 (fix C-01, déploiement PM2 `julaba-dev.ansut.ci`, APK pilote `d6617d7`), Tasks 45-a..45-d (cette vague)
