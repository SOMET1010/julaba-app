# AUDIT ACTEUR — INSTITUTION — 2026-10-05

## 1. Identité et périmètre

- **Rôle** : `institution` (ANSUT / régulateur — partenaire réglementaire, cf. PROJECT_CONTEXT §1/§2).
- **Frontend audité** : `frontend/src/app/components/institution/` (10 fichiers, ~3 630 l.) : InstitutionLayout, InstitutionHome, Dashboard, DashboardAnalytics, Analytics, InstitutionActeurs, InstitutionSupervision, AuditTrail, InstitutionParametres, InstitutionProfil ; routes `routes.tsx:139-148` (9 routes) + backoffice `BOInstitutions.tsx` (951 l.), `BOConfigInstitution.tsx` (521 l., route `config-institution` :221).
- **Backend audité** : `backend/src/institutions/` (2 contrôleurs + guard + décorateurs + entité), `backend/src/ansut/` (service, **aucun contrôleur**), `backend/src/oneci/`, canaux adjacents ouverts au rôle institution : `users.controller.ts`, `scores.controller.ts`, `notifications.controller.ts`, `events.gateway.ts`.
- **Conformité** : loi ivoirienne n°2013-450 (données personnelles) — accès PII marchandes, traçabilité, justification.
- **Sondes runtime** (backend :3001, lecture seule) : login marchande Awa Koné (+2250700000009) → 200 ; login institution Aïcha Bamba (+2250700000015) → 200 ; 5 GET effectués (détaillés §3/§4).
- **Audit antérieur** : `AUDIT-ACTEUR-INSTITUTION-2026-09-28.md` (statique, « À RECETTER ») — vérifié : ses 3 constats restent valables (cf. §11).

## 2. Fonctionnalités observées dans le code

- **Backend — noyau correct** : `GET /institution/dashboard|acteurs|transactions` protégés par `JwtAuthGuard + RolesGuard + InstitutionScopeGuard` (institution-dashboard.controller.ts:21-23) ; le guard résout la zone via `institutions.responsable_id = user.id` et échoue **fail-closed** (403 si institution absente ou `zone_id` manquante, institution-scope.guard.ts:72-83) ; modules par clé (`RequireInstitutionModule`, :90-99). Filtrage SQL explicite par `zoneId` + `In(acteurIds)` (:40-54, :194-208). Correction d'isolement documentée en tête de fichiers (ancien fallback « tout voir » supprimé).
- **Backend — CRUD institutions** : `GET /institutions` scopé `responsable_id` pour le rôle institution (404 au lieu de 403, institutions.controller.ts:37-49) ; POST/PATCH réservés super_admin/admin_general avec allowlist ; audit log sur mise à jour des modules (:62-70).
- **Backend — ONECI** : pont RNPP `GET /oneci/lookup/:nni` + `/oneci/quota`, JwtAuthGuard **seul** (oneci.controller.ts:4-12).
- **Backend — ANSUT** : `ansut.service.ts` = pont traduction/TTS (ffmpeg→API distante), **aucun endpoint @Controller('ansut')** dans tout le backend (grep confirmé).
- **Frontend** : espace institution mobile-first avec BottomNav/sidebar, KPI macro (9 indicateurs), résumé du jour, graphiques recharts, acteurs (recherche/filtres/fiche FicheActeurDetailModal), supervision (onglets statut, drawer détail, audit inline, export), audit trail (recherche/filtres/CSV), profil/paramètres génériques.
- **Backoffice** : BOInstitutions (création, édition modules `aucun/lecture/ecriture/complet`, bascule statut, suppression), BOConfigInstitution (toggles KPI du dashboard institution).

## 3. Constats détaillés

### INSTITUTION-01 [P0] — Lookup ONECI (RNPP) accessible à tout compte authentifié, sans traçabilité

oneci.controller.ts:4-12 n'applique que JwtAuthGuard : AUCUN RolesGuard, aucun rôle requis. Tout marchand/producteur authentifié peut interroger `GET /api/v1/oneci/lookup/:nni` et recevoir nom, prénoms, date de naissance, genre + `raw` complet de la base RNPP nationale (oneci.service.ts:21-33), 300 requêtes/min (throttler global throttler.config.ts:17), zéro journal d'accès, zéro validation du NNI. `/oneci/quota` expose l'état d'abonnement. Le régulateur n'a ici aucun rôle dédié — c'est l'inverse : tout le monde a le pouvoir du régulateur. Preuve statique + endpoint enregistré (app.module.ts:140). **Impact** : violation majeure n°2013-450 (traitement sans base légale, sans traçabilité), harvesting d'identités à grande échelle via une session marchande compromise.

### INSTITUTION-02 [P1] — Contournement de l'isolement institution : GET /users/search-identificateur ouvert au rôle institution

users.controller.ts:74-94 : `allowedRoles` inclut `'institution'` (:81) et renvoie une recherche **nationale non scopée** (nom/téléphone sur tous marchands/producteurs/coopérateurs, users.service.ts:289-320) : id, **phone**, noms, commune, zone_id, statut. Sans filtre zone → contourne exactement l'isolement corrigé par InstitutionScopeGuard ; contrôleur entier `@SkipThrottle()` (users.controller.ts:25) ; zéro log d'accès. **Preuve runtime : 200** avec token institution sur `?q=awa` → 2 comptes avec téléphones complets. (Avec token marchande : 403.) **Impact** : énumération illimitée de la base nationale PII depuis un compte régulateur compromis, hors traçabilité.

### INSTITUTION-03 [P1] — GET /scores expose les téléphones de toute la base au rôle institution

scores.controller.ts:20-28 : `@Roles('super_admin','admin','institution')` → pagination de tous les utilisateurs avec `select` incluant **phone** et noms (:25), sans scope zone, sans journalisation. (Le rôle `'admin'` n'existe même pas dans la grille.) **Impact** : 2e canal PII national hors périmètre du guard.

### INSTITUTION-04 [P1] — Messagerie arbitraire depuis un compte institution (/notifications/send, /send-bulk)

notifications.controller.ts:92-117 et :140-154 : institution autorisé à notifier n'importe quel userId/liste, body typé inline (aucun DTO → la ValidationPipe globale ne valide rien, main.ts:239-246), `metadata?: any`, aucun log, aucun contrôle de cible. Combiné à INSTITUTION-02 (qui fournit les ids) → campagne d'hameçonnage signée « institution » sur toute la base. **Impact** : abus de l'autorité réglementaire, spam/phishing, aucune traçabilité.

### INSTITUTION-05 [P1] — Aucune journalisation des accès institution aux données marchandes

institution-dashboard.controller.ts n'appelle jamais AuditService (seule erreur loggée, :135, :183, :231) ; idem pour les canaux INSTITUTION-02/03/04. Or la traçabilité des accès du régulateur aux PII marchandes est une exigence centrale (loi n°2013-450 ; audit.service.ts existe et est déjà branché ailleurs). Chaque consultation d'acteurs/transactions par ANSUT est aujourd'hui **indétectable et non auditable**. **Impact** : impossibilité de prouver qui a consulté quoi ; non-conformité réglementaire ; risque en cas de fuite (pas d'investigation possible).

### INSTITUTION-06 [P1] — Écart UI/backend : boutons « Valider / Rejeter » institution systématiquement refusés

InstitutionSupervision.tsx:655-690 envoie `PATCH /transactions/:id` (statut validee/annulee) ; le backend réserve cette mutation à `super_admin/admin_general/admin_national` (transactions-rest.controller.ts:71-72) → 403 garanti, toast « Impossible… ». Le régulateur voit des actions qui ne fonctionnent jamais (côté positif : le serveur empêche bien le régulateur de muter l'argent des marchandes). **Impact** : UI mensongère, recette impossible, perte de confiance du partenaire ANSUT.

### INSTITUTION-07 [P1] — Données fabriquées présentées comme réelles au régulateur

InstitutionHome.tsx : `explication={`${12.3}% vs mois dernier`}` (:239), détails KPI codés en dur (« 8,234 marchands actifs » :241, « 4,862,500,000 FCFA » :305, suspensions fraude « 124 » :273, affiliation CNPS « 7,745 » :339, etc.), date figée « 03 Mar 2026 » (:402) ; évolution mensuelle entièrement fausse (useInstitutionData.ts:21-29, Sep→Mar figé) affichée dans 2 graphiques (InstitutionHome.tsx:462, :578). Même motifs dans Dashboard.tsx (:31,39,47 : « 12/18/24% ce mois » en littéral). **Impact** : le partenaire réglementaire reçoit des chiffres inventés = intégrité de l'information détruite, risque juridique direct pour ICONE Solutions.

### INSTITUTION-08 [P1] — Couche données institution branchée sur des routes admin → 403 silencieux, écrans morts

InstitutionContext.tsx:119-165 appelle `/admin/analytics`, `/admin/analytics/roles|produits|alertes`, `/admin/config`, `/audit` — tous `@Roles('ADMIN')` (admin.controller.ts:7, admin-analytics.controller.ts:10, audit-rest.controller.ts:12) → 403 pour un vrai compte institution, catchés en retours zéro (InstitutionContext.tsx:129-164). Conséquences : DashboardAnalytics.tsx:49-74 toujours à zéro ; **AuditTrail institution toujours vide** (AuditTrail.tsx:44-51 : /audit 403 → fallback AuditContext, lui-même vide) ; « Exporter » du trail = CSV client-side de données vides (AuditTrail.tsx:130-149) ; « Export données PDF/Excel/CSV » supervision = **simple toast** sans aucun export (InstitutionSupervision.tsx:192-194). **Impact** : aucun rapport/export réglementaire réel ; l'écran « Audit » est un décor.

### INSTITUTION-09 [P1] — Workflow backoffice institution inachevé → aucun compte institution utilisable (prouvé runtime)

La création BO n'envoie ni `zone_id` ni `responsable_id` (BOInstitutions.tsx:386-428 ; allowlist backend sans region/referentNom/referentTelephone — institutions.controller.ts:53) ; aucun flux ne crée le compte du référent (le message « identifiants envoyés par email » :792 est faux) ; `zone_id` n'est configurable nulle part → InstitutionScopeGuard fail-closed bloque pour toujours. **Preuve runtime : GET /institution/dashboard avec token institution Aïcha Bamba (compte démo seed-demo.service.ts:99, sans ligne institutions) → 403 « Périmètre non configuré… »**. **Impact** : l'acteur régulateur ne peut pas fonctionner en démo/recette/production ; le correctif d'isolement (bon) rend l'acteur inopérant faute d'outillage d'administration.

### INSTITUTION-10 [P1] — BOConfigInstitution : violation des règles des hooks React + sauvegarde désactivée

BOConfigInstitution.tsx:114-130 : retour anticipé (`role !== 'super_admin'` → return :116-123) AVANT useState/useEffect (:125-135) → ordre de hooks variable entre rendus = erreur React (« Rendered more hooks… ») dès qu'un non-super_admin affiche la page après un super_admin. `isBackendReady = false` (:130) : la configuration (toggles KPI) n'est **jamais persistée** alors que le backend porte déjà institutions.modules et que le guard l'applique — écran purement local. **Impact** : crash potentiel écran admin ; promesse de configuration sans effet.

### INSTITUTION-11 [P1] — A11y des écrans institution : quasiment nulle

Grep sur les 10 fichiers : **0** aria-label, **0** role="dialog", **0** aria-modal, **0** aria-live, **0** aria-current. Modales custom sans focus trap ni ESC (AuditTrail.tsx:363-457, drawer InstitutionSupervision.tsx:589-706) ; bouton Fermer 32 px (AuditTrail.tsx:389 w-8) et 36 px (InstitutionSupervision.tsx:617-618 w-9) < cible 44 px (ACCESSIBILITY_GUIDE §1/§4) ; bouton filtre 32 px (InstitutionSupervision.tsx:431-436) ; navigation active sans aria-current (InstitutionLayout.tsx:150-227) ; **169 hexadécimaux hardcodés** sur 8 fichiers (violation DESIGN_SYSTEM §9) ; « Écouter » Tantie = animation 4 s **sans aucun audio** (InstitutionHome.tsx:64-67, aucun appel parle()/clip dans tout le dossier — doctrine voice-first bafouée : bouton mensonger pour une administratrice malvoyante) ; compteurs animés sans alternative statique pour lecteurs d'écran. **Impact** : les écrans régulateurs sont inutilisables au clavier/lecteur d'écran ; charte DS/a11y systématiquement contournée.

### INSTITUTION-12 [P1] — WebSocket : transactions marchandes diffusées à la salle « all » (transversal)

events.gateway.ts:79-97 + caisse-rest.controller.ts:824,887 : chaque vente/dépense (montant, contenu, userId) est broadcast à **tous** les clients authentifiés (marchands, producteurs, institutions…). Le régulateur n'a pas de canal scopé dédié ; tous les acteurs reçoivent la donnée de tous. **Impact** : fuite temps réel inter-acteurs (PII + activité marchande), hors tout périmètre de supervision.

### INSTITUTION-13 [P2] — Colonne statut fantôme sur institutions

La table n'a pas de statut (BaselineSchema.ts:494-504, institution.entity.ts:4-14) mais : allowlist create/update l'accepte (institutions.controller.ts:53,76) → no-op silencieux ; remove() fait `update(id, {statut:'supprime'})` (:97) → aucune valeur valide → UpdateValuesMissingError (500) au mieux ; le BO lit inst.statut (BOInstitutions.tsx:208-212,403-404) → jamais persisté → affichage erroné. **Impact** : suspension/suppression d'institution non fonctionnelle ; désynchronisation UI/BD.

### INSTITUTION-14 [P2] — KPI « En attente » supervision toujours à 0 (mapping de statut incohérent)

Backend : completed→validee, cancelled→annulee, sinon brut (institution-dashboard.controller.ts:211) ; WalletTransaction.statut vaut pending par défaut (entité :66-67). Frontend filtre `statut === 'en_cours'` (InstitutionSupervision.tsx:171-173,181) → valeur jamais produite. **Impact** : le régulateur ne voit jamais les transactions en attente.

### INSTITUTION-15 [P2] — Trois sources de permissions incohérentes côté client + écrans morts

InstitutionAccessContext.tsx:26-29 : modules **codés en dur tous actifs** (ignore institutions.modules serveur) ; InstitutionContext.permissions (2e source) ; serveur (3e). institutionProfil.statut jamais alimenté → écran « Compte suspendu » mort (InstitutionLayout.tsx:380-387) ; nav « Audit » masquée car clé 'audit' absente de la liste (qui contient 'audit-trail', InstitutionLayout.tsx:33 vs InstitutionAccessContext.tsx:28) ; fallback d'identité 'institution-001' (:310) passé au panneau notifications ; MODULE_ROUTES.export: [] sans effet (:24). **Impact** : granularité de droits purement décorative côté UI, confusion, maintenance impossible.

### INSTITUTION-16 [P2] — Dashboard : erreurs masquées en « zéros » + volumétrie fragilisante

Catch-all renvoyant un dashboard valide à zéros (institution-dashboard.controller.ts:134-152) : le régulateur ne distingue pas panne et inactivité ; take: 5000 users + take: 10000 transactions + agrégation JS et In(acteurIds) 5 000 UUID (:40-54, :194-208) → perfs/limites SQL.

### INSTITUTION-17 [P2] — InstitutionActeurs : handlers de mutation morts et rapprochement par nom

handleSuspendre/handleReactiver → PATCH /acteurs/:id refusé aux institutions (acteurs-rest.controller.ts:28) et plus branché sur aucun bouton (InstitutionActeurs.tsx:135-155) ; transactions de l'acteur rapprochées par acteurNom.includes(nom) (:375) → collisions d'homonymes ; onglet « Historique » codé [] (:376).

### INSTITUTION-18 [P3] — ANSUT sans endpoint dédié

Aucun @Controller('ansut') → /api/v1/ansut* = 404 (statique) ; ansut.service.ts:65-89 : translateText/TTS renvoient le texte d'origine (stubs assumés, warns). L'écart « vision ANSUT partenaire » (PROJECT_CONTEXT §1) est structurel : le régulateur n'a ni endpoint propre, ni service vivant.

### INSTITUTION-19 [P3] — Hygiène ONECI

NNI non validé (aucune regex/longueur, oneci.service.ts:21-33), erreurs 401/403 mappées « NNI introuvable » (:26, acceptable anti-énumération mais indistinct), res.json() sans garde.

### INSTITUTION-20 [P3] — Divers

Action d'audit 'UPDATE_INSTITUTION_MODULES' émise aussi sur POST create (institutions.controller.ts:63-69) ; modules: any non typé (institution.entity.ts:10) ; getHistoriqueComplet attend data.logs (InstitutionContext.tsx:163) alors que /audit renvoie {logs, meta} avec champs details objets — mapping jamais exercé car 403.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| INSTITUTION-01 | RNPP/ONECI ouvert à tout compte authentifié, sans log | PII / Autorisation | P0 | GET /oneci/lookup/:nni + session quelconque |
| INSTITUTION-02 | Recherche nationale PII non scopée via rôle institution | PII / IDOR-like | P1 | GET /users/search-identificateur (prouvé 200) |
| INSTITUTION-03 | Téléphones nationaux via GET /scores | PII | P1 | GET /scores (rôles trop larges) |
| INSTITUTION-04 | Notifications arbitraires (phishing « régulateur ») | Abus / intégrité | P1 | POST /notifications/send[-bulk] |
| INSTITUTION-05 | Accès institution aux données non journalisés | Conformité 2013-450 | P1 | Absence d'AuditService sur tous les accès |
| INSTITUTION-06 | Actions de validation UI → 403 backend | Fonctionnel | P1 | PATCH /transactions/:id (rôles admins) |
| INSTITUTION-07 | Chiffres fabriqués montrés au régulateur | Intégrité données | P1 | KPI/évolutions hardcodés front |
| INSTITUTION-08 | Bloc données sur routes admin → écrans/exports morts | Fonctionnel | P1 | /admin/analytics*, /audit → 403 catchés |
| INSTITUTION-09 | Compte institution inutilisable (zone non configurable) | Fonctionnel / sécurité OK | P1 | 403 fail-closed prouvé runtime |
| INSTITUTION-10 | Violation hooks React + config non persistée | Qualité | P1 | BOConfigInstitution |
| INSTITUTION-11 | Zéro ARIA, modales sans trap, faux vocal, cibles <44 px | A11y | P1 | 10 fichiers institution |
| INSTITUTION-12 | Broadcast WS national des transactions | PII / exposition | P1 | room « all » (events.gateway) |
| INSTITUTION-13 | statut institutions hors schéma | Intégrité schéma | P2 | PATCH no-op / DELETE 500 |
| INSTITUTION-14 | « En attente » toujours 0 | Intégrité données | P2 | mapping statut en_cours vs pending |
| INSTITUTION-15 | 3 systèmes de permissions UI contradictoires | Qualité / droits | P2 | contexts dupliqués |
| INSTITUTION-16 | Panne ≠ zéros ; 5 000/10 000 rows en JS | Fiabilité / perf | P2 | catch-all + agrégation mémoire |
| INSTITUTION-17 | Handlers morts + rapprochement par nom | Qualité | P2 | InstitutionActeurs |
| INSTITUTION-18 | Régulateur sans endpoint ANSUT (404) | Vision produit | P3 | module sans contrôleur |
| INSTITUTION-19 | NNI non validé, quota exposé | Robustesse | P3 | /oneci/* |
| INSTITUTION-20 | Divers (action audit fausse, entité any) | Hygiène | P3 | — |

*(Aucune catégorie vierge : sécurité, conformité, a11y, données, perf, qualité toutes pourvues.)*

## 5. Points forts

1. **InstitutionScopeGuard exemplaire** : fail-closed documenté, 403 sans fuite, résolution zone via responsable_id, modules par clé (institution-scope.guard.ts:44-108) — corrige l'ancien fallback « tout voir ».
2. **404 plutôt que 403** sur fiche institution tierce (institutions.controller.ts:43-46) — anti-énumération correcte.
3. **Runtime : gardes efficaces** — 401 sans token, 403 marchande sur /institution/* et /users/search-identificateur (probes 1-3).
4. **Serveur refuse les mutations du régulateur** : PATCH transactions / acteurs réservés aux admins — la doctrine « supervision sans ingérence » est tenue côté backend (INSTITUTION-06 est un défaut d'UI, pas d'autorisation).
5. **Couches sanitize existantes** : stripSensitiveUserFields sur /acteurs (acteurs-rest.controller.ts:45) ; PIN jamais exposé (règles §8 respectées sur ce périmètre).
6. **Allowlists de champs** sur POST/PATCH /institutions + audit des changements de modules (institutions.controller.ts:53-70).
7. **Throttler global** 300/min + login 5/min (throttler.config.ts, auth.controller.ts:118).
8. **UNIQUE(responsable_id)** sur institutions (BaselineSchema.ts:1003) — un responsable par institution.

## 6. Recommandations de correction

1. **INSTITUTION-01 (P0)** : @Roles('institution','super_admin','admin_general') + RolesGuard sur /oneci/* ; limiter lookup aux comptes enrôlement/identification légitimes + institution avec module ; journaliser chaque lookup (qui, quel NNI masqué, résultat) ; @Throttle strict (ex. 10/min) ; regex ^[0-9]{10}$ sur le NNI.
2. **02/03/04 (P1)** : retirer 'institution' de allowedRoles (users.controller.ts:81) et de @Roles de /scores (scores.controller.ts:21) OU créer un service dédié institution, **scopé zone via InstitutionScopeGuard, journalisé via AuditService, paginé** ; retirer 'institution' de send/send-bulk ou exiger un DTO validé + journalisation + liste de cibles autorisées ; retirer @SkipThrottle() du contrôleur users ou l'appliquer route par route.
3. **05 (P1)** : brancher AuditService.log({action:'INSTITUTION_ACCESS_*'}) sur /institution/dashboard|acteurs|transactions et sur tout canal PII institution ; offrir au BO un onglet « Accès régulateur ».
4. **06 (P1)** : masquer Valider/Rejeter pour le rôle institution (ou créer un circuit « signalement régulateur » séparé, sans mutation directe).
5. **07 (P1)** : supprimer tout littéral de KPI/évolution/date ; dériver explication de données réelles ou afficher « — » ; alimenter dataEvolution/dataRegions côté backend.
6. **08 (P1)** : réécrire InstitutionContext sur /institution/* (ou créer GET /institution/analytics scopé) ; servir un audit trail institution (logs de SON périmètre) ; implémenter l'export serveur (GET /institution/export?format= réutilisant TransactionsExportService) et supprimer le toast factice.
7. **09 (P1)** : compléter le flux BO : création du compte référent (P0.0 activation), saisie zone_id obligatoire, responsable_id lié ; seed démo : ligne institutions + zone pour Aïcha Bamba ; écran BO de rattachement zone/modules.
8. **10 (P1)** : déplacer le garde de rôle après les hooks (ou extraire un composant enfant) ; brancher la sauvegarde sur PATCH /institutions/:id (modules/zone) ; supprimer isBackendReady=false.
9. **11 (P1)** : Radix Dialog partout (trap, ESC, retour focus), aria-current="page" sur nav, Fermer ≥44 px + aria-label, aria-live sur KPI/toasts, tokens CSS au lieu des 169 hex, remplacer le faux « Écouter » par un vrai clip ou le retirer.
10. **12 (P1)** : supprimer le broadcast transaction:created en « all » ; créer une room institution:{zoneId} alimentée en données agrégées.
11. **13 (P2)** : migration ALTER TABLE institutions ADD COLUMN statut (ou basculer sur actif) + aligner entity/BO/remove.
12. **14 (P2)** : mapper pending→en_attente backend (ou filtrer pending front) + test de contrat.
13. **15 (P2)** : source unique = institutions.modules serveur ; supprimer la liste codée en dur ; alimenter statut ; corriger clé 'audit' ; supprimer 'institution-001'.
14. **16 (P2)** : distinguer erreur/inactivité (flag degraded:true), SQL GROUP BY + pagination au lieu de take 5000/10000.
15. **17 (P2)** : supprimer les handlers morts ; rapprochement par userId ; brancher un GET /institution/acteurs/:id/historique scopé.
16. **18/19/20 (P3)** : décision produit sur l'offre ANSUT (ADR), DTO OneCiLookupDto, renommage action d'audit, typage modules.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | login institution → refresh → logout | aucune route hors périmètre |
| Autorisation | /institution/*, /users/*, /scores, /oneci/*, /notifications/send* | fail-closed, institution scopé zone, marchand 403 partout |
| Périmètre | 2 institutions zones différentes | aucun croisement de données |
| Modules | modules.aucun sur un module | 403 backend + écran « Accès restreint » |
| PII | acteurs/transactions | téléphone masqué ou justifié + JOURNAL d'accès |
| Mutations | Valider/Rejeter/Suspendre depuis UI institution | aucun write serveur possible (et UI sans bouton mensonger) |
| Exports | PDF/Excel/CSV | fichier réel généré par le backend, journalisé |
| Audit trail | écran Audit institution | données serveur réelles, filtrables, exportables |
| Chiffres | KPI vs BD | zéro valeur hardcodée (garde CI anti-littéraux) |
| WS | socket marchand vs institution | aucune transaction tierce reçue |
| A11y | Tab/ESC/lecteur d'écran sur les 9 routes | focus trap, 44 px, aria, zéro hex HC |
| Offline | perte réseau dashboard | état d'erreur visible, jamais de « zéros » silencieux |

## 8. Tests critiques recommandés

1. Marchand authentifié → GET /oneci/lookup/:nni → **403** (aujourd'hui 200 théorique — P0).
2. Institution zone A → série search-identificateur/scores/transactions → aucun utilisateur hors zone A, chaque accès retrouve une ligne audit_logs.
3. Institution sans ligne institutions (compte démo) → 403 propre + message actionnable (cas Aïcha Bamba, prouvé).
4. PATCH /transactions/:id avec token institution → 403 + trace ; UI ne doit plus proposer l'action.
5. Institution avec modules.dashboard:'aucun' → 403 + écran Accès restreint.
6. Injection de 5 000 acteurs → dashboard < 2 s (fin du take 5000 en JS).
7. PATCH /institutions/:id {statut} et DELETE /institutions/:id → comportement défini (plus de no-op/500).
8. Audit visuel CI : interdiction de littéraux KPI/date dans components/institution/** (garde type authCharte).
9. Recette axe-core sur les 9 routes institution (aujourd'hui 0 aria).
10. Socket marchand connecté pendant une vente d'un autre marchand → aucun événement transaction:created reçu.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P0 | INSTITUTION-01 : rôles + throttle + logs sur /oneci/* | S |
| P1 | Retirer 'institution' des canaux PII nationaux (02, 03) + @SkipThrottle users | S |
| P1 | Journaliser tous les accès institution (05) via AuditService | S |
| P1 | Restreindre notifications/send[-bulk] (04) + DTO | S |
| P1 | Supprimer les données fabriquées (07) et brancher l'écran sur /institution/* (08) | M |
| P1 | Terminer le flux BO (compte référent + zone_id) + seed démo institution (09) | M |
| P1 | Fix hooks BOConfigInstitution + persistance config (10) | S |
| P1 | Lot a11y institution : Radix Dialog, aria, 44 px, tokens, vrai/faux voix (11) | M |
| P1 | Room WS scopée, fin du broadcast « all » (12) | S |
| P2 | Migration statut (13), mapping en_attente (14), source unique permissions (15), fiabilisation dashboard (16), nettoyage acteurs (17) | M |
| P3 | Décision produit ANSUT (18), hygiène ONECI (19), divers (20) | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Sécurité | 45/100 | Guard fail-closed exemplaire sur /institution/*, mais 4 canaux PII non scopés (ONECI P0, search, scores, WS) et messagerie ouverte |
| Conformité réglementaire (2013-450) | 35/100 | Aucune traçabilité des accès régulateur, PII sans justification/masquage, chiffres fabriqués |
| Accessibilité | 40/100 | 0 ARIA/10 fichiers, modales sans trap, cibles 28-36 px, faux vocal, 169 hex HC |
| Qualité | 48/100 | Hooks violés, statut hors schéma, 3 systèmes de permissions, données mock, mapping statut cassé |
| Global | 42/100 | Sous le seuil PROD 60 : acteur institution non livrable en l'état |

## 11. Conclusion + statut

L'isolement du régulateur a été **correctement traité au cœur du périmètre** (InstitutionScopeGuard fail-closed, scope zone, 404 anti-énumération) — c'est le progrès majeur depuis l'audit du 28/09. Mais ce même rôle **contourne le périmètre par trois canaux latéraux PII nationaux non journalisés** (search-identificateur, scores, notifications — le premier prouvé 200 en runtime), et le **registre d'identité ONECI est ouvert à tout compte authentifié sans trace (P0)**. Parallèlement, l'expérience régulateur est largement décorative : chiffres fabriqués, exports factices, audit trail vide, actions de validation refusées par le serveur, écrans admin en hooks cassés — et aucun compte institution n'est utilisable faute de workflow de configuration zone/référent (prouvé runtime 403). L'a11y est quasi absente de tout l'espace.

**Validité de l'audit antérieur (2026-09-28)** : P1 « vérifier scope institutionnel » → partiellement traité mais **contourné** (INSTITUTION-02/03/12) ; P1 « actions de validation » → sécurisé serveur mais UI mensongère (INSTITUTION-06) ; P2 « fonctionnalités/stubs et droits fins » → toujours vrai et aggravé (07/08/10/15). Son statut « À RECETTER » est remplacé par la recette ci-dessus.

**Statut : AUDIT RÉALISÉ (statique + 5 sondes runtime lecture seule) — NON CONFORME, corrections P0/P1 requises avant toute exposition du rôle institution à ANSUT.**
