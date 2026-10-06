# AUDIT ACTEUR — ADMIN-GENERAL — 2026-10-05

## 1. Identité et périmètre

- **Rôle audité** : admin_general (enum UserRole.ADMIN_GENERAL, user.entity.ts:24) — 2e rôle BO le plus élevé, sous super_admin, au-dessus d'admin_national.
- **Périmètre audité** : frontend frontend/src/app/components/backoffice/ (BOParametres, BOApiKeys, BOMonitoringIA, EventMonitor, BOAnalyticsProduit, BOCronDashboard, BOConfigInstitution, BOKeiwa, BOMarketplace, BOLivraison, BOScoreFinancier, BOContenus, BOLayout, BORoot, routes) ; backend backend/src/{admin,auth,cron-jobs,partner,odoo-gateway,escrow,bpay,financial-score,events,audit,users,misc-rest}.
- **Références lues** : worklog.md, PROJECT_CONTEXT §1/§8, ACCESSIBILITY_GUIDE §4/5/6, DESIGN_SYSTEM §9, audit antérieur.
- **Vérification de l'audit antérieur (28/09/2026)** — c'était un squelette « À RECETTER » : ses 4 risques restent **valides** : secrets/API keys → partiellement traité (BO-1, jamais relisible) mais stockage en clair subsistant ; WebSocket → confirmé et aggravé (cf. ADMINGEN-03/05) ; permissions → partiellement traité (lot J6/BO-0 sur 5 familles de routes) mais non généralisé ; fonctions stub → confirmées (cf. ADMINGEN-06/08/09/13).
- **Sonde runtime (5 GET, lecture seule)** : /admin/monitoring sans token → **401** ; avec token marchand (Awa Koné, login phone/password +2250700000009) → **403** ; /audit → **403** ; /partner/api-keys → **403** ; /cron → **200** (cf. ADMINGEN-06). Le rôle admin_general lui-même n'existe pas dans le jeu de démo → recette par différenciation de rôles uniquement (statique + sondes marchand).

## 2. Fonctionnalités observées dans le code

- **Menu BO** (BOLayout.tsx:78-185, filtre :652-658/:882-887) : entrées superOnly réservées super_admin (utilisateurs, institutions, config-institution, monitoring-ia, event-monitor, analytics, score-financier, api-keys) ; rapports visible de admin_general seul (:155) ; parametres **non** marqué superOnly (:181) → visible d'admin_general par défaut (BO_SCREEN_PERMISSIONS, BackOfficeContext.tsx:190 inclut parametres.read/write, utilisateurs.read/write/delete).
- **Écrans avec garde UI super_admin** : BOApiKeys.tsx:76-85, EventMonitor.tsx:46-54, BOMonitoringIA.tsx:15-23, BOAnalyticsProduit.tsx:18-20, BOScoreFinancier.tsx:301-308, BOConfigInstitution.tsx:114-121, BOInstitutions.tsx:363, BOUtilisateurs (canEdit :190). **Sans garde** : BOKeiwa, BOLivraison, BOMarketplace, BOContenus, BOParametres, BOCronDashboard, BOCommunication.
- **Backend** : /admin/* et /admin/wallets/* = @Roles('ADMIN') (admin.controller.ts:7-8, admin-wallets.controller.ts:17-18) où ADMIN_ROLES inclut admin_general (roles.guard.ts:5). Argent : crédit/débit/réinitialisation = @Roles('super_admin') (admin-wallets.controller.ts:83-116, décision J5). Cron toggle/retry = @Roles('super_admin','admin_general') (misc-rest.controller.ts:76,84). Clés API partenaire = assertBoAdmin sur {'super_admin','admin'} (partner.controller.ts:26-30, financial-score.service.ts:35) → admin_general **403**. Journal d'audit : lecture ADMIN (audit-rest.controller.ts:30), écriture POST ouverte aux ADMIN (:31). Création de comptes admin : @Roles('super_admin','admin_general') (users.controller.ts:133) avec flux en deux temps (admin-users.service.ts:90-106, pending :146+, validation super_admin only). WS /ws : JWT obligatoire, rooms (events.gateway.ts:38-70).
- **Différences UI des 3 rôles** : admin_general = tout le périmètre défaut sauf superOnly ; admin_national = sans acteurs.delete/suspend ni freeze (BackOfficeContext.tsx:191) ; super_admin = tout + écrans superOnly. bo-permissions.ts (registre matrice, :14-15 « n'est branché nulle part ») diverge : il met utilisateurs.*/parametres.* superOnly et donne marketplace/livraison/contenus/cron à admin_general (:418-424) — ni le menu ni les défauts actuels ne le reflètent (cf. ADMINGEN-02/14).

## 3. Constats détaillés

**[ADMINGEN-01] [P1] Écrans BO accessibles par URL sans garde de route** — routes.tsx:189-223 déclare toutes les routes BO enfants de BORoot (contrôle rôle seul, BORoot.tsx:17-24) sans vérification de permission ; le filtrage ne porte que sur le menu (BOLayout.tsx:652-658). Six écrans sensibles sans garde d'écran : BOKeiwa (wallets+actions argent), BOLivraison, BOMarketplace, BOContenus, BOParametres, BOCronDashboard. Impact : navigation directe /backoffice/api-keys par un admin_general → écran « Accès réservé » OK, mais /backoffice/keiwa s'ouvre et expose boutons crédit/débit qui échoueront 403 (UI mensongère) ; /backoffice/cron expose la lecture (donnée effectivement publique, cf. 06).

**[ADMINGEN-02] [P1] Trois registres de permissions divergents** — BackOfficeContext.tsx:190 (admin_general : + utilisateurs.read/write/delete, parametres.read/write) ≈ bo-autorisation.ts:25 (copie serveur identique) ≠ bo-permissions.ts:351-377 (utilisateurs/parametres superOnly: true, registre non branché :14). Impact : « par défaut », un admin_general porte des droits de niveau super_admin sur la gestion des comptes (neutralisés seulement par exigerAutoriteSur, bo-autorisation.ts:66-71) ; la matrice validée (maquette) n'est pas la loi effective.

**[ADMINGEN-03] [P1] Littéral fantôme 'admin' dans les listes de rôles serveur** — financial-score.service.ts:35 ADMIN_SCORE_ROLES = new Set(['super_admin','admin']) ; bpay.controller.ts:146 ['admin','super_admin'] ; events.gateway.ts:62 et :126. Le rôle 'admin' n'existe pas dans l'enum (user.entity.ts:18-29) et BORoot.tsx:16 documente son retrait. Impact double : admin_general/admin_national sont **exclus à tort** de la room WS admin et de bpay/pending (droits en moins, EventMonitor en direct cassé pour eux) ; et un hypothétique compte admin ré-obtiendrait ces accès.

**[ADMINGEN-04] [P1] Clés API partenaires stockées et comparées en clair** — partner-api-keys.service.ts:17-20 (constat assumé dans le code, table api_keys hors migrations SCHEMA-05) ; api-key.guard.ts:24-27 SELECT … WHERE key = $1 (pas de hash, pas de comparaison temps constant) ; :33-36 usage_count incrémenté par la clé brute. L'exposition API est corrigée (BO-1 : clé complète une seule fois, aperçu left(key,11), service:21-22) mais un dump DB = toutes les clés partenaires. Impact : compromission des intégrations banques/microfinance.

**[ADMINGEN-05] [P1] Fuite d'événements métier par WebSocket** — events.gateway.ts:95-98 emitTransactionCreated diffuse transaction:created à la room **"all"** (rejointe par tout client authentifié, :60) avec le payload complet ; émis depuis caisse-rest.controller.ts:824 et :887 ({...result, type:'vente'/'depense', userId}). Impact : tout marchand connecté reçoit les ventes/dépenses de tous — violation de la confidentialité attendue d'un BO (§8 : journal/argent), volume PII métier.

**[ADMINGEN-06] [P2] /cron lisible par tout utilisateur authentifié + retry mensonger** — misc-rest.controller.ts:49-73 @Get('cron') sans @Roles (sonde live : **200 avec token marchand**, registre + statuts + erreurs) ; :83-88 POST /cron/:id/retry répond {success:true} sans rien faire. Impact : information d'exploitation (cibles de jobs de réconciliation BPay), fausse confirmation d'action admin_general.

**[ADMINGEN-07] [P2] Écriture ouverte dans le journal d'audit** — audit-rest.controller.ts:31 @Post() create accessible à tout rôle ADMIN (classe :8-9) : un admin_general (ou gestionnaire_zone) peut insérer une entrée d'audit arbitraire (action/entite/details libres) à son nom. Le journal d'argent est protégé (inserts dans la transaction, admin-wallets.service.ts:260-274) mais le journal général devient polluable. Impact : atteinte à la fiabilité probante (§8.2/8.6).

**[ADMINGEN-08] [P1] Écran Paramètres = lecture d'un stub + sauvegarde 404** — BOParametres.tsx:250 charge GET /admin/wallets/config/parametres qui retourne {} (admin-wallets.service.ts:484) ; :392 PUT /admin/wallets/config/parametres **n'existe pas** côté backend (seul le GET est déclaré, admin-wallets.controller.ts:143) → tout enregistrement échoue ; :423 reset sur route inexistante également. L'écran présente 2FA, liste blanche IP, suspension automatique, barèmes (BOParametres.tsx:57-61) — critères critiques — tous non persistés. Impact : faux contrôle de configuration pour l'admin_general (risque de croire un flag actif).

**[ADMINGEN-09] [P2] Données inventées et DDL à l'exécution** — admin-analytics.controller.ts:157-163 @Get('admin/cron') renvoie 2 jobs fabriqués (« sync-acteurs », « rapport-hebdo ») que cron-jobs.registry.ts:1-15 qualifie précisément d'inventés ; :141-143 PATCH admin/livraison/:id/assign exécute ALTER TABLE commandes ADD COLUMN IF NOT EXISTS à chaque appel, par un rôle ADMIN (donc gestionnaire_zone aussi). Impact : mensonge d'interface (double source avec /cron honnête), dérive de schéma en prod.

**[ADMINGEN-10] [P2] ADMIN_ROLES trop large** — roles.guard.ts:5 inclut gestionnaire_zone et operateur_terrain dans « ADMIN » : ils passent sur **tout** endpoint @Roles('ADMIN') (stats, health, exports CSV PII, CRUD config items, POST /audit, DDL livraison) ; seuls 5 groupes de routes portent la permission fine J6 (cf. grep exigerPermissionBO). Impact : sur-permission massive des rôles bas ; pour admin_general, le principle of least privilege n'est pas discriminant.

**[ADMINGEN-11] [P2] Exports CSV de wallets/transactions sans permission fine** — admin-wallets.controller.ts:118-128 (export/csv, transactions/export/csv) : un seul GET par tout rôle ADMIN exporte soldes + identités. Impact : exfiltration PII/financière triviale, sans trace d'export.

**[ADMINGEN-12] [P2] Mutations de config Keiwa sans trace d'audit** — createConfigItem/updateConfigItem/deleteConfigItem/uploadLogo (admin-wallets.controller.ts:153-186) ne journalisent rien (aucun audit_logs pour ces actions dans admin-wallets.service.ts:487+). Impact : modification de banques/opérateurs/logo non traçable (§8.6).

**[ADMINGEN-13] [P2] Stubs persistants dans le périmètre** — BOConfigInstitution.tsx:127 isBackendReady=false, sauvegarde locale seulement (:174-190) ; BOContenus.tsx:81/93/109/117 mutations uniquement en useState (jamais POSTées) ; BOLivraison/BOMarketplace alimentés par stubs (/admin/livraison misc-rest.controller.ts:40-43, admin-analytics.controller.ts:135-136) ; escrow.module.ts:1-9 module **vide** (aucune logique escrow hors wallets.service.ts:393-505). Impact : fonctionnalités affichées sans effet serveur.

**[ADMINGEN-14] [P2] Périmètre admin_general incohérent produit** — BO_SCREEN_PERMISSIONS (BackOfficeContext.tsx:190) omet marketplace/livraison/communication/contenus/monitoring_ia/analytics_produit/cron.read : le menu masque Plateforme/Système à l'admin_general, en contradiction avec le registre non branché (bo-permissions.ts:418-424) et avec l'intention éditoriale. Impact : des écrans publics par URL restent invisibles au rôle censé les tenir (droits en moins), confusion de recette.

**[ADMINGEN-15] [P1] A11y BO sous les normes §4/5/6** — sur les 12 écrans : **0** Radix Dialog, modales custom framer-motion sans Escape (ESC=0 partout), aria-modal absent (1 seul cas BOApiKeys), pas de focus trap documenté ; **~353 couleurs hex littérales** (BOKeiwa 148, BOMonitoringIA 30, BOConfigInstitution 29…) en violation de DESIGN_SYSTEM §9 ; aria-label = 0 sur BOParametres/BOCronDashboard/BOKeiwa/BOLivraison ; erreurs async sans role="alert"/aria-live ; cibles 28×28 px (BOKeiwa ~:657) < 44 px ; voice-first absent (acceptable pour un BO, mais rien n'est documenté comme exception). Impact : WCAG 2.1 AA non atteinte sur l'espace admin.

**[ADMINGEN-16] [P3] Comparaison de secret webhook non temps constant** — bpay.controller.ts:29 (providedSecret !== expectedSecret) ; fail-closed correct si secret absent (:29-32). Impact : marginal (timing attack sur webhook), à durcir.

**[ADMINGEN-17] [P3] CreateAdminUserDto.role non borné aux rôles admin** — users.controller.ts:133-141 accepte tout UserRole ; seules les cibles admin_general sont bloquées (admin-users.service.ts:90-106) : un admin_general peut soumettre un compte de rôle arbitraire (ex. marchand) en EN_ATTENTE_VALIDATION. Impact : faible (validation super_admin requise), mais la liste des rôles créables n'est pas contrainte en amont comme pour backoffice-account (CREATABLE_BO_ACCOUNT_ROLES, create-backoffice-account.dto.ts:17-22).

**[ADMINGEN-18] [P2] Journal d'audit best-effort** — audit.service.ts:33-36 : échec d'INSERT avalisé par console.warn sans alerte ni file d'attente. Impact : perte silencieuse de traces d'audit.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| ADMINGEN-05 | Diffusion des transactions à tous les clients WS | Confidentialité | P1 | socket.io /ws, room « all », JWT marchand |
| ADMINGEN-04 | Clés API en clair en base + comparaison non hashée | Secrets | P1 | Dump DB / lecture disque ; doc SCHEMA-05 |
| ADMINGEN-08 | Faux panneau de configuration système (404 au save) | Intégrité config | P1 | Écran Paramètres (admin_general), PUT inexistant |
| ADMINGEN-03 | Rôle fantôme 'admin' : incohérences d'autorisation WS/BPay | Autorisation | P1 | Littéraux figés, sans test de cohérence |
| ADMINGEN-01 | Routes BO sans garde de route/permission | Autorisation | P1 | Navigation directe par URL |
| ADMINGEN-02 | Registres de permissions divergents (défauts = quasi super_admin) | Autorisation | P1 | Défauts de rôle si boPermissions absent |
| ADMINGEN-15 | A11y BO hors normes (modales, tokens, cibles) | A11y | P1 | Clavier/lecteur d'écran |
| ADMINGEN-07 | POST /audit polluable par tout rôle ADMIN | Traçabilité | P2 | API directe |
| ADMINGEN-10 | ADMIN_ROLES trop large (zone/terrain = ADMIN) | Autorisation | P2 | Tout @Roles('ADMIN') |
| ADMINGEN-11 | Export CSV PII+soldes sans permission ni trace | Fuite de données | P2 | GET /admin/wallets/export/csv |
| ADMINGEN-06 | /cron public + retry fictif | Info disclosure | P2 | GET /cron authentifié (sonde : 200) |
| ADMINGEN-09 | Données cron inventées + DDL runtime | Qualité/Intégrité | P2 | /admin/cron, PATCH livraison |
| ADMINGEN-12 | Config Keiwa sans journal d'audit | Traçabilité | P2 | CRUD config/items |
| ADMINGEN-13 | Écrans stub (contenus, config-institution, livraison, escrow) | Honnêteté produit | P2 | Écrans BO |
| ADMINGEN-14 | Périmètre menu vs registre incohérent | Gouvernance | P2 | BO_SCREEN_PERMISSIONS |
| ADMINGEN-18 | Journal d'audit best-effort sans alerte | Traçabilité | P2 | Échec DB silencieux |
| ADMINGEN-16 | Secret webhook comparé non temps constant | Sécurité générale | P3 | Timing |
| ADMINGEN-17 | Rôle de compte admin non borné en amont | Autorisation | P3 | POST /users/admin |

## 5. Points forts

- **Fail-closed vérifié en runtime** : 401 sans token, 403 marchand sur /admin/monitoring, /audit, /partner/api-keys (4 sondes/4) ; aucun rôle BO créable par signup public (auth.controller.ts:66-76, ACTEUR_ROLES).
- **Argent verrouillé** : crédit/débit/réinit = super_admin only (J5), transactionnels avec FOR UPDATE, journal auteur/montant/motif/soldes **dans la même transaction** (admin-wallets.service.ts:260-274, 297, 326, 422) — conforme §8.1/8.2 ; blocage = users.status unique source de vérité (:338-346).
- **Clés API jamais relisibles** (BO-1) : clé complète uniquement dans la réponse de création, aperçu 11 caractères ailleurs (partner-api-keys.service.ts:12-22) ; UI alignée (BOApiKeys.tsx:18-20).
- **Création de comptes BO en 2 étapes** : admin_general crée → EN_ATTENTE_VALIDATION → validation super_admin only ; mot de passe généré serveur et remis par SMS, jamais dans la réponse (admin-users.service.ts:134-176 ; BO-1/SEC-10) ; auto-création d'admin_general interdite (:90-106).
- **Champs réservés super_admin protégés** (role/status/boPermissions/validated, bo-autorisation.ts:74) ; PATCH bo-permissions et backoffice-account = super_admin only (users.controller.ts:404-436, :190-200).
- **Registre cron honnête** : 2 vrais jobs documentés, toggle effectif, statuts réels (cron-jobs.registry.ts:29-46, cron-jobs-config.service.ts:83+), toggle restreint à super_admin/admin_general.
- **POC Odoo fail-closed** : désactivé par défaut (404 avant même le JWT) et crash au boot si mode real sans secrets (odoo-gateway.controller.ts:16-17, odoo-client.config.ts:33-39).
- **Enum UserRole sans fantôme** (user.entity.ts:18-29) et monitoring IA réécrit sans latences inventées (admin-analytics.controller.ts:38-55).

## 6. Recommandations de correction

- **ADMINGEN-01** : wrapper de route <ExigerPermission permission="…"> sur routes.tsx:189-223 + garde serveur systématique ; généraliser exigerPermissionBO (BO-3 prévu par bo-autorisation.ts:6).
- **ADMINGEN-02** : brancher bo-permissions.ts comme source unique (générer BO_SCREEN_PERMISSIONS et DEFAUTS_PAR_ROLE depuis l'arbre), trancher utilisateurs.*/parametres.* = superOnly, et ajouter un test CI d'égalité des 3 registres.
- **ADMINGEN-03** : remplacer 'admin' par admin_general/admin_national dans financial-score.service.ts:35, bpay.controller.ts:146, events.gateway.ts:62/:126 ; garde CI « aucun littéral de rôle hors UserRole ».
- **ADMINGEN-04** : migrer vers hash (SHA-256 + préfixe) de api_keys, comparaison temps constant, migration table (SCHEMA-05), rotation documentée.
- **ADMINGEN-05** : supprimer le broadcast room « all » de emitTransactionCreated (le doublon admin: suffit) ou anonymiser/masquer le payload.
- **ADMINGEN-06** : @Roles('ADMIN') (ou permission cron.read) sur GET /cron ; remplacer le retry fictif par 404/501 explicite.
- **ADMINGEN-07** : supprimer POST /audit ou le réserver super_admin avec un action préfixé et des clés de details contraintes.
- **ADMINGEN-08** : implémenter GET+PUT persistés de /admin/wallets/config/parametres avec journal (ou masquer l'écran tant que non branché) ; étiqueter visuellement les sections non persistées.
- **ADMINGEN-09** : supprimer /admin/cron (inventé) au profit de /cron ; remplacer le DDL runtime par une migration.
- **ADMINGEN-10** : resserrer ADMIN_ROLES (exclure gestionnaire_zone/operateur_terrain des routes sensibles) ou remplacer par permissions fines partout.
- **ADMINGEN-11** : exiger une permission dédiée (ex. supervision.export) + journaliser chaque export (qui, quoi, quand, volume).
- **ADMINGEN-12** : journaliser create/update/delete/upload de config items (audit_logs, auteur+payload).
- **ADMINGEN-13** : marquer clairement « démo/non branché » (bannières) ou cacher les écrans stub ; créer ADR pour escrow avant implémentation (module sacré §8.1).
- **ADMINGEN-14** : arbitrer le périmètre admin_general (marketplace/livraison/contenus/cron) et aligner menu+registres+serveur en un lot unique.
- **ADMINGEN-15** : migrer les modales vers Radix Dialog (§5), remplacer les hex par tokens (--commerce-*/--encre-*), aria-label sur boutons icônes, cibles ≥44 px, role="alert" sur erreurs ; étendre test-cible-tactile.mjs au BO.
- **ADMINGEN-16** : timingSafeEqual sur le secret webhook BPay.
- **ADMINGEN-17** : restreindre CreateAdminUserDto.role à [ADMIN_NATIONAL, GESTIONNAIRE_ZONE, OPERATEUR_TERRAIN] quand créateur = admin_general.
- **ADMINGEN-18** : échec d'audit = alerte (Sentry) + buffer de rejeu, au minimum log ERROR structuré.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth BO | login admin_general, session cookie, logout | Aucun écran superOnly rendu, 403 serveur sur argent |
| Autorisation | URL directe des 12 écrans × 5 rôles | Écran gardé OU donnée 403 ; /cron non lisible par marchand |
| Argent Keiwa | crédit/débit/réinit par admin_general | 403 ; super_admin OK avec motif ; journal = mouvement |
| Blocage wallet | bloquer/debloquer par admin_general | OK si acteurs.suspend ; SMS + trace BLOQUER_WALLET |
| Cron | toggle + retry | Toggle effectif (job réellement pausé) ; retry jamais « succès » fictif |
| Clés API | création/liste/activation | Clé complète 1 seule fois ; impossible à relire ; 403 hors super_admin |
| Journal d'audit | lecture admin_general, POST | Lecture OK ; écriture arbitraire refusée |
| Config système | sauvegarde Paramètres | Comportement honnête (persisté OU écran absent) |
| WS | EventMonitor en direct admin_general | Reçoit admin:* ; ne reçoit PAS les transactions d'autrui |
| Exports | CSV wallets par rôle | Refusé hors permission dédiée ; chaque export tracé |
| A11y BO | modale de création de clé au clavier | ESC ferme, focus piégé puis rendu, cibles ≥44 px |
| Comptes BO | admin_general crée un admin_national | EN_ATTENTE ; inactif tant que super_admin ne valide pas |

## 8. Tests critiques recommandés

1. Différenciation live des 3 rôles (super_admin vs admin_general vs admin_national) sur /admin/wallets/:id/credit, /cron/:id/toggle, /users/:id/bo-permissions — attendu 403/403/200 selon le rôle.
2. Un marchand connecté ouvre socket /ws pendant une vente d'un autre marchand → **ne** doit recevoir aucun transaction:created (régression ADMINGEN-05).
3. Dump de api_keys ne doit révéler aucune clé utilisable (post-migration hash).
4. Admin_general tente POST /audit avec details arbitraires → refus, et toute écriture subsistante doit être identifiable (préfixe).
5. PUT /admin/wallets/config/parametres puis reconnexion → l'état lu = l'état écrit (ou l'écran n'existe pas).
6. Toggle bpay_reconciliation par admin_general → le cron s'arrête VRAIMENT (aucun crédit pendant la pause), re-toggle → reprise ; action tracée.
7. Tentative de création d'un admin_general par un admin_general → 403 (admin-users.service.ts:90-106) et aucune notification super_admin.
8. Garde CI : égalité des 3 registres de permissions + interdiction des littéraux de rôle hors UserRole.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | ADMINGEN-05 : couper/limiter le broadcast WS « all » | S |
| P1 | ADMINGEN-03 : purger le littéral admin (3 fichiers) + garde CI | S |
| P1 | ADMINGEN-08 : brancher ou masquer la config Paramètres (PUT 404) | M |
| P1 | ADMINGEN-01/02 : gardes de route + unification des registres de permissions (BO-3) | M |
| P1 | ADMINGEN-04 : hash des clés API + migration SCHEMA-05 | M |
| P1 | ADMINGEN-15 : lot a11y BO (Radix, tokens, aria, 44 px) | L |
| P2 | ADMINGEN-06/07/10/11 : rôle sur /cron, fermer POST /audit, resserrer ADMIN_ROLES, tracer exports | S |
| P2 | ADMINGEN-09/12/13/14 : supprimer stubs mensongers, tracer config, arbitrer périmètre | M |
| P3 | ADMINGEN-16/17/18 : timingSafeEqual, bornage DTO, alerte échec audit | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Sécurité | 66/100 | Fail-closed global et argent verrouillé ; mais clés API en clair, fuite WS, journal polluable |
| Autorisation | 60/100 | J6/BO-0 réel mais partiel ; 3 registres divergents ; ADMIN_ROLES trop large ; fantômes admin |
| A11y | 50/100 | 0 Radix Dialog, ESC/focus absents, ~353 hex, aria quasi nul, cibles < 44 px |
| Qualité | 62/100 | Bases saines (journal in-transaction, registre cron honnête) mais stubs mensongers, PUT 404, DDL runtime |
| **Global** | **60/100** | Au seuil PROD (60) de justesse — à consolider avant d'élargir le rôle |

## 11. Conclusion + statut

Le rôle admin_general n'a pas de voie d'élévation vers super_admin : l'argent, les comptes BO et les permissions restent sous verrou super_admin (J5/J6), les sondes runtime sont fail-closed, et le journal d'argent est exemplaire. En revanche le rôle vit dans un écosystème d'autorisation **divergent** (trois registres contradictoires, littéral fantôme admin, ADMIN_ROLES englobant les rôles terrain) et sur des écrans partiellement factices (Paramètres non persistés, config-institution locale, contenus local-only, retry cron fictif, escrow vide) ; l'a11y BO est très en dessous des normes §4/5/6. Les quatre risques de l'audit du 28/09/2026 restent tous valables, deux étant partiellement traités. Actions immédiates : WS broadcast (ADMINGEN-05), littéraux fantômes (03), Paramètres (08).

**Statut de l'audit : COMPLET — statique + sondes runtime lecture seule (5/5 GET). 18 constats (7 P1, 8 P2, 3 P3). Aucune modification de fichier effectuée.**
