# AUDIT ACTEUR — INSTITUTION — 2026-10-19

> **Mission** : 2ᵉ vague d'audits statiques par acteur (rejouer les constats du 05/10 + constats comptables transverses C-12/D-05/C-14 + delta commits depuis le 05/10 + lecture seule stricte).
> **Périmètre** : front `frontend/src/app/components/institution/` (10 fichiers) + contexts `InstitutionContext`/`InstitutionAccessContext`, routes `routes.tsx:139-158` ; back `backend/src/institutions/` (dashboard controller, InstitutionScopeGuard, décorateurs, institutions.controller) + canaux latéraux `users`, `scores`, `notifications`, `oneci`, `events.gateway`, `wallets`.
> **Méthode** : relecture de première main sur `/home/z/julaba-wt` (dev, HEAD `04ae652`), preuves re-read le 19/10, `git log --since=2026-10-05`, aucune sonde réseau, aucune modification de code.
> **Auteur** : agent Z.ai Code — Task 45-c.

## 1. Identité et périmètre

- **Rôle** : `institution` (ANSUT / régulateur) — supervision lecture seule attendue, conformité loi n°2013-450.
- **Évolutions depuis le 05/10** :
  - `538d12f` fix(bo-institutions) : mapping `statut`↔`actif` — suspendre/réactiver/supprimer fonctionnent (INSTITUTION-13 corrigé) ;
  - `04ae652` (15/10) : `ProfileSwitcher` réinstallé dans `InstitutionLayout.tsx` et `Dashboard.tsx` ; `e04fa73` (13/10) l'avait retiré ;
  - `265062e` merge main (aucun changement institutionnel métier) ;
  - Backend institutions : allowlist create accepte désormais `zone_id`/`modules` (`institutions.controller.ts:15/:67`) — mais le flux BO reste incomplet (§3, 09).

### Évolutions depuis le 05/10 — verdict gating dev/prod
- **Dev Mode** : `InstitutionLayout.tsx:355/:368/:384/:440` et `Dashboard.tsx:169` — tous derrière `{import.meta.env.DEV && ...}` : **absents du bundle production** (double garde interne `ProfileSwitcher.tsx`). Le bloc « MODE DÉVELOPPEMENT » :333-344 et le debug vide :313-315 sont eux aussi DEV-gated.
- **Bouton Rapport** : AUCUN bouton Rapport dans l'espace institution connecté (`InstitutionLayout`/`Dashboard`/`AppLayout` non utilisé pour /institution). Seul l'écran de connexion partagé expose « 🐞 Rapport de test » **non gated** (`LoginPassword.tsx:1531-1544`) — visible en prod par le régulateur avant login (journal local de dictée, pas de données serveur, mais instrument de recette non gated).
- **Connexion** : réécriture LoginPassword (04ae652) sans effet de sécurité pour ce rôle — throttler login 5/min (`auth.controller.ts:118-119`), anti-énumération `check-phone` (`:85-95`), verrou PIN serveur inchangés.

## 2. Fonctionnalités observées dans le code

| Fonction | Où | Observation 19/10 |
|---|---|---|
| Dashboard/acteurs/transactions scopés | institution-dashboard.controller.ts:21-23 | JwtAuthGuard+RolesGuard+**InstitutionScopeGuard** (fail-closed :72-83) ; filtre `zoneId`+`In(acteurIds)` (:40-54, :194-208) |
| Modules par clé | guard :85-99 + décorateurs | `@RequireInstitutionModule` appliqué sur les 3 endpoints |
| Fiche institutions | institutions.controller.ts:39-63 | institution scopée à SA fiche (responsable_id), 404 anti-énumération (:56-60) |
| Mapping statut | institutions.controller.ts:11-23 | RC 07/10 : `versColonnes`/`avecStatut` — PATCH statut OK, DELETE = actif:false (:110) |
| Supervision UI | InstitutionSupervision.tsx | Valider/Rejeter :661-689 → PATCH /transactions/:id (refusé serveur) ; filtre `en_cours` :171/:181 |
| Données macro | Dashboard.tsx, InstitutionHome.tsx | littéraux `12%/18%/24% ce mois` (:31/:39/:47) ; fake `8,234/124/4,862,500,000/7,745` + date `03 Mar 2026` (InstitutionHome :241-402) |
| Bloc analytics/audit | InstitutionContext.tsx:121-181 | appelle `/admin/analytics*`, `/audit`, `/admin/config` → 403 institution |
| WS | events.gateway.ts:60/:95-98 | `transaction:created` broadcast room `all` ; l'institution y est exposée |
| Wallet | routes.tsx:152-157 | 6 routes Keiwa montées sous /institution (nav masquée roleConfig.ts:491) ; backend wallets sans garde de rôle |

## 3. Constats détaillés

### INSTITUTION-01 [P0] — Lookup ONECI ouvert à tout compte authentifié — **TOUJOURS VALABLE (05/10 → 19/10)**
`oneci.controller.ts:4-12` : JwtAuthGuard seul, aucun RolesGuard, aucun journal d'accès NNI, NNI non validé (service :25). Le marchand compromis a toujours le pouvoir du régulateur sur le RNPP. (P0 inchangé, partagé avec IDENTIFICATEUR-05.)

### INSTITUTION-02 [P1] — search-identificateur ouvert au rôle institution, non scopé — **TOUJOURS VALABLE**
`users.controller.ts:74-94` : `allowedRoles:81` inclut `'institution'`, recherche nationale (id/phone/noms/zone) sans filtre zone, contrôleur `@SkipThrottle()` :25, zéro log.

### INSTITUTION-03 [P1] — GET /scores expose téléphones nationaux — **TOUJOURS VALABLE**
`scores.controller.ts:21` (`@Roles(...,'institution')`) + `:25` (`select` inclut `phone`), sans scope ni journal.

### INSTITUTION-04 [P1] — Messagerie arbitraire (phishing « régulateur ») — **TOUJOURS VALABLE**
`notifications.controller.ts:93` (`send`) et `:141` (`send-bulk`) : institution admis, sans DTO validé ni contrôle de cible ni log.

### INSTITUTION-05 [P1] — Aucune journalisation des accès régulateur — **TOUJOURS VALABLE**
`institution-dashboard.controller.ts` : aucun appel AuditService (seuls logger.error :135/:183/:231) ; idem canaux 02/03/04. La traçabilité 2013-450 reste impossible.

### INSTITUTION-06 [P1] — Valider/Rejeter affichés, refusés serveur — **TOUJOURS VALABLE**
`InstitutionSupervision.tsx:661-689` PATCH /transactions/:id ; backend `transactions-rest.controller.ts:70-71` @Roles super_admin/admin_general/admin_national → 403 garanti. UI mensongère inchangée.

### INSTITUTION-07 [P1] — Données fabriquées — **TOUJOURS VALABLE**
`InstitutionHome.tsx:241/:273/:305/:339` (fake KPI), `:402` (date figée « 03 Mar 2026 »), faux « Écouter » :64-67 (setTimeout 4 s sans audio) ; `Dashboard.tsx:31/:39/:47` (`12%/18%/24% ce mois` en littéraux), `:121` `data={[]}` (graphique régional mort). Aucun littéral retiré depuis le 05/10.

### INSTITUTION-08 [P1] — Couche données sur routes admin → écrans/exports morts — **TOUJOURS VALABLE**
`InstitutionContext.tsx:121-181` : /admin/analytics*, /audit, /admin/config (GET+PATCH) — 403 pour le rôle, catchés en zéros. AuditTrail vide, « exports » supervision = toast (INSTITUTION-08 du 05/10 inchangé).

### INSTITUTION-09 [P1] — Flux BO institution incomplet → compte inutilisable — **TOUJOURS VALABLE (backend partiellement ouvert)**
Backend : `zone_id`/`modules` désormais dans les colonnes modifiables (`institutions.controller.ts:15/:67`). Front : `BOInstitutions.tsx:387-428` — le formulaire n'envoie **ni zone_id ni responsable_id** (:426 addInstitution{nom,type,region,email,referentNom,referentTelephone,statut,modules}), aucun flux ne crée le compte référent → InstitutionScopeGuard reste fail-closed (403) pour toute institution créée. Compte démo : `seed-demo.service.ts` sans ligne institutions pour Aïcha Bamba (inchangé).

### INSTITUTION-10 [P1] — BOConfigInstitution : hooks violés + config non persistée — **TOUJOURS VALABLE**
Retours anticipés avant hooks (`BOConfigInstitution.tsx:97/:117` précèdent useState :125-129) + `isBackendReady = false` :130 (toggles jamais persistés).

### INSTITUTION-11 [P1] — A11y quasi nulle — **TOUJOURS VALABLE**
Mesure 19/10 : 0-1 `aria-*`/fichier sur les 10 (InstitutionHome 0), hex en dur massif (InstitutionHome 60, Analytics 30), faux vocal :64-67, cibles <44 px, nav sans aria-current (`InstitutionLayout.tsx:150-227`). Aucun progrès mesurable.

### INSTITUTION-12 / C-14 [P1] — Fuite WebSocket transaction:created — **TOUJOURS VALABLE**
`events.gateway.ts:60` (tous clients join `all`), `:79-82` broadcast, `:95-98` `emitTransactionCreated` → appelé par `caisse-rest.controller.ts:824/:887` (montant+contenu+userId). Le régulateur ET tous les acteurs reçoivent les ventes de tous. SEC-023 (jwtService.verify :51, sans mustChangePassword/statut) également inchangée.

### INSTITUTION-13 [P2] — statut fantôme institutions — **CORRIGÉ (RC 07/10, preuve 19/10)**
`institutions.controller.ts:11-23` : traduction `statut`↔`actif` aux deux bords ; `remove()` = `update(actif:false)` :110 — plus de no-op/UpdateValuesMissingError. BO et écran lisent `statut` calculé (:21-22).

### INSTITUTION-14 / D-05 [P2] — Mapping statuts cassé, « En attente » toujours 0 — **TOUJOURS VALABLE**
Backend `institution-dashboard.controller.ts:211` : completed→validee, cancelled→annulee, **sinon brut** (pending reste `pending`) ; front `InstitutionSupervision.tsx:171` filtre `statut === 'en_cours'`, mapping :181 `en_attente→en_cours`. Le régulateur ne voit toujours JAMAIS les transactions en attente (WalletTransaction.statut default `pending`).

### INSTITUTION-15 [P2] — Trois registres de permissions contradictoires — **TOUJOURS VALABLE**
`InstitutionAccessContext.tsx:27-28` : modules codés en dur tous actifs (liste incluant `'keiwa'` !) ; `InstitutionLayout.tsx:310` fallback `'institution-001'` ; clé nav `audit` présente mais `MODULE_ROUTES.export: []` :24 ; `institutionProfil.statut` alimenté par l'écran BO seulement.

### INSTITUTION-16 [P2] — Panne ≠ zéros + volumétrie — **TOUJOURS VALABLE**
Catch-all zéros (`institution-dashboard.controller.ts:134-152`), `take: 5000` users (:44/:165/:198) + `take: 10000` transactions (:52/:206) + agrégation JS + `In()` de 5 000 UUID.

### INSTITUTION-17 [P2] — Handlers morts + rapprochement par nom — **TOUJOURS VALABLE**
`InstitutionActeurs.tsx:135-155` : handleSuspendre/handleReactiver → PATCH `/acteurs/:id` refusé aux institutions et sans bouton ; historique codé [].

### INSTITUTION-18 [P3] — ANSUT sans endpoint dédié — **TOUJOURS VALABLE**
`grep @Controller('ansut')` = vide ; ansut.service stubs inchangés.

### INSTITUTION-19 [P3] — Hygiène ONECI — **TOUJOURS VALABLE**
NNI non validé (aucune regex, service :25), erreurs mappées indistinctement.

### INSTITUTION-20 [P2] — **NOUVEAU (nuance « lecture seule stricte »)** — Surface Keiwa montée + wallets sans garde de rôle
`routes.tsx:152-157` monte 6 pages wallet sous /institution (URL directe ; nav masquée roleConfig.ts:491) ; `wallets.controller.ts:15-16` JwtAuthGuard SEUL : le compte régulateur peut ouvrir SON wallet et faire recharge/retrait/transfert. Les mutations d'argent D'AUTRUI restent fermées (J5, PATCH transactions 403) — la « lecture seule » tient pour la donnée marchande, pas comme contrainte serveur sur le compte régulateur lui-même.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| INSTITUTION-01 | RNPP ouvert sans rôle ni log | PII/Autorisation | **P0** | GET /oneci/lookup/:nni + JWT quelconque |
| INSTITUTION-02 | Recherche PII nationale non scopée | PII | P1 | GET /users/search-identificateur |
| INSTITUTION-03 | Téléphones nationaux via /scores | PII | P1 | GET /scores |
| INSTITUTION-04 | Notifications arbitraires | Abus | P1 | POST /notifications/send[-bulk] |
| INSTITUTION-05 | Accès régulateur non journalisés | Conformité 2013-450 | P1 | Tous canaux institution |
| INSTITUTION-06 | Actions UI mortes (403) | Fonctionnel | P1 | PATCH /transactions/:id |
| INSTITUTION-07 | Chiffres fabriqués | Intégrité | P1 | KPI littéraux front |
| INSTITUTION-08 | Données sur routes admin (403) | Fonctionnel | P1 | /admin/analytics*, /audit |
| INSTITUTION-09 | Compte inutilisable (zone non saisie) | Fonctionnel | P1 | flux BO incomplet |
| INSTITUTION-10 | Hooks violés + config non persistée | Qualité | P1 | BOConfigInstitution |
| INSTITUTION-11 | Zéro ARIA, faux vocal | A11y | P1 | 10 fichiers |
| INSTITUTION-12/C-14 | WS broadcast `all` (montant+userId) | PII temps réel | P1 | socket.io /ws |
| INSTITUTION-13 | statut fantôme | Intégrité schéma | P2 | **CORRIGÉ** |
| INSTITUTION-14/D-05 | « En attente » jamais visible | Intégrité données | P2 | mapping pending |
| INSTITUTION-15 | 3 registres permissions | Gouvernance | P2 | contexts dupliqués |
| INSTITUTION-16 | Panne=zéros ; 5k/10k en JS | Fiabilité/perf | P2 | catch-all |
| INSTITUTION-17 | Handlers morts, matching par nom | Qualité | P2 | InstitutionActeurs |
| INSTITUTION-18 | Pas d'endpoint ANSUT | Vision produit | P3 | module sans contrôleur |
| INSTITUTION-19 | NNI non validé | Robustesse | P3 | /oneci/* |
| INSTITUTION-20 | Keiwa monté + wallets ouverts | Argent/surface | P2 | URL directe |

## 5. Points forts

1. **InstitutionScopeGuard exemplaire et inchangé** : fail-closed documenté (guard :60/:72-83), résolution par responsable_id, modules par clé (:85-99) — jamais de fallback « tout voir ».
2. **404 anti-énumération** sur fiche tierce (`institutions.controller.ts:56-60`) + scope GET liste (:42-47).
3. **Le serveur refuse toujours les mutations d'argent du régulateur** : PATCH /transactions/:id (403), PATCH /acteurs/:id (403), admin-wallets J5 — supervision sans ingérence tenue côté serveur.
4. **INSTITUTION-13 corrigée proprement** (RC 07/10) : mapping aux bords + audit des changements de modules conservé (:97-105).
5. **Dev Mode strictement gated** : aucun widget de dev ne peut fuiter en production (4 sites DEV-gated vérifiés).
6. Throttler global + login 5/min actifs ; stripSensitiveUserFields sur /acteurs.

## 6. Recommandations de correction

1. **01 (P0)** : @Roles('institution','super_admin','admin_general','identificateur','operateur_terrain') + throttle strict + journal d'accès NNI (qui/quel NNI masqué/résultat) + regex NNI.
2. **02/03/04** : retirer `'institution'` des canaux PII nationaux OU créer GET /institution/* scopé, journalisé, paginé ; DTO validé sur send/send-bulk ; retirer @SkipThrottle de users.
3. **05** : AuditService.log('INSTITUTION_ACCESS_*') sur dashboard/acteurs/transactions + canaux latéraux ; onglet BO « Accès régulateur ».
4. **06** : masquer Valider/Rejeter pour le rôle (ou circuit « signalement » séparé).
5. **07** : supprimer les littéraux (garde CI anti-KPI) ; Dashboard.tsx:31/39/47 + InstitutionHome.
6. **08** : réécrire InstitutionContext sur /institution/* ; exports serveurs réels.
7. **09** : compléter le flux BO (zone_id obligatoire + création du compte référent via P0.0) ; seed démo avec ligne institutions+zone.
8. **10** : déplacer le garde après les hooks ; brancher PATCH /institutions/:id (isBackendReady).
9. **11** : Radix Dialog, aria-current, 44 px, tokens CSS, vrai clip vocal ou retrait du faux « Écouter ».
10. **12/C-14** : supprimer le broadcast `all` ; room scopée par propriétaire + agrégats pour institution.
11. **14/D-05** : mapper pending→en_attente serveur (ou filtre front) + test de contrat.
12. **20** : même décision que IDENTIFICATEUR-16 — @Roles sur wallets.controller ou retrait des routes keiwa des espaces non monétiques.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Autorisation | /institution/*, search-identificateur, /scores, /oneci/* | fail-closed, scopé zone, journalisé |
| Périmètre | 2 institutions, zones différentes | aucun croisement |
| Modules | modules.aucun | 403 + écran Accès restreint |
| Mutations argent | Valider/Rejeter/Suspendre UI | 403 serveur ET bouton absent |
| PII | acteurs/transactions | téléphone masqué ou justifié + JOURNAL |
| D-05 | compteur « En attente » supervision | > 0 quand des pending existent |
| WS | socket institution pendant vente tierce | aucun transaction:created reçu |
| Chiffres | KPI vs BD | zéro littéral (garde CI) |
| Exports | PDF/Excel/CSV | fichier réel serveur, journalisé |
| A11y | 9 routes au clavier/lecteur | trap, 44 px, aria, zéro hex HC |
| Gating prod | build VITE_ production | aucun ProfileSwitcher ; décision sur Rapport login |

## 8. Tests critiques recommandés

1. Marchand authentifié → GET /oneci/lookup/:nni → **403** (rouge aujourd'hui — P0).
2. Institution zone A : search/scores/transactions → 0 ligne hors zone + 1 ligne audit_logs par accès.
3. PATCH /transactions/:id avec token institution → 403 + UI sans bouton.
4. Contrat statut : seed 3 transactions (pending/validee/annulee) → supervision les voit toutes.
5. Institution sans ligne institutions → 403 propre + message actionnable (cas Aïcha Bamba inchangé).
6. Axe-core sur les 9 routes (0 aria aujourd'hui).
7. Socket institution pendant vente d'un tiers → 0 événement.
8. Build production : grep dist/ sans `ProfileSwitcher` ; décision tracée sur « Rapport de test ».

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P0 | INSTITUTION-01 : rôles+throttle+journal ONECI | S |
| P1 | Retirer institution des canaux PII (02,03) + DTO notifications (04) | S |
| P1 | Journaliser les accès (05) | S |
| P1 | Supprimer données fabriquées (07) + brancher InstitutionContext (08) | M |
| P1 | Terminer flux BO zone/référent + seed démo (09) | M |
| P1 | Fix hooks BOConfig (10) + lot a11y (11) + room WS (12) | M |
| P2 | D-05 mapping pending (14) ; source unique permissions (15) ; fiabiliser dashboard (16) ; nettoyage acteurs (17) | M |
| P2 | Cadrer surface Keiwa/wallets (20) | S |
| P3 | Décision ANSUT (18), hygiène ONECI (19) | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Sécurité | 46/100 | Guard fail-closed intact + statut réparé ; mais 4 canaux PII non scopés (ONECI P0) et wallets sans garde (20) |
| Argent/intégrité | 58/100 | Lecture seule tenue sur l'argent d'autrui (403) ; D-05 toujours vrai, WS `all` toujours vrai, chiffres fabriqués toujours là |
| Accessibilité | 40/100 | 0-1 aria/fichier, hex massifs, faux vocal — inchangé |
| Voice-first | 35/100 | « Écouter » = animation sans audio ; aucun canal vocal réel |
| Qualité | 51/100 | INSTITUTION-13 corrigée (+) ; hooks violés, 3 registres, catch-all zéros inchangés |
| **Global** | **43/100** | Sous le seuil PROD 60 : rôle non livrable à ANSUT en l'état |

## 11. Conclusion + statut

Sur les 20 constats du 05/10 : **17 toujours valables** (dont le P0 ONECI, re-prouvé), **1 corrigé** (INSTITUTION-13, RC 07/10, preuve :11-23/:110), **2 partiellement traités** (09 : backend accepte zone_id/modules mais le BO n'envoie ni zone ni référent ; 08/16 inchangés). Les trois constats comptables transverses concernant ce rôle sont **re-confirmés ligne en main** : D-05 (mapping :211 vs filtre :171 — le régulateur ne voit jamais les pending), C-14 (events.gateway.ts:95-98 + caisse-rest :824/:887 — broadcast `all`), lecture seule des mutations d'argent (403 tenus). La « lecture seule stricte » doit être requalifiée : elle est vraie pour les données marchandes, mais le backend wallets reste ouvert à tout rôle authentifié et 6 pages Keiwa sont montées sous /institution. Le gating dev/prod est sain (4 sites DEV-gated) ; seul le bouton « Rapport de test » non gated de l'écran de connexion partagé reste à trancher. Aucun progrès a11y et aucune journalisation des accès depuis le 05/10.

**Statut : NON CONFORME — P0 ONECI ouvert + 3 canaux PII nationaux + zéro traçabilité : corrections requises avant toute exposition du rôle à ANSUT (inchangé depuis le 05/10).**
