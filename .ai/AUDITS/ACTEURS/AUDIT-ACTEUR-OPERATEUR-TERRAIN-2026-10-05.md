# AUDIT ACTEUR — OPERATEUR-TERRAIN — 2026-10-05

## 1. Identité et périmètre

- **Rôle** : `operateur_terrain` (enum UserRole.OPERATEUR_TERRAIN, backend/src/users/entities/user.entity.ts:27). Libellé UI : « Opérateur terrain » / « Analyste » (BOLayout.tsx:34, BOProfil.tsx:73).
- **Catégorie** : back-office web (5 rôles BO annoncés comme définitifs — JULABA_DECISIONS.md:74).
- **Entrée** : /backoffice/login → redirection /backoffice/dashboard (LoginPassword.tsx:916-921, types/constants.ts:87, garde BORoot.tsx:17-24).
- **Périmètre nominal** (registre vivant BackOfficeContext.tsx:193) : acteurs (read/write/suspend), enrôlement (read/**validate**), supervision (read/**write/freeze**), zones.read, missions.read, mutations (read/**write**), modération (read/**write**), audit.read, academy.read.
- **Occurrences** : ~100 lignes sur 58 fichiers (front 44, back 14, docs/gardes) — rôle réellement implémenté, pas vitrine.
- **Compte démo** : AUCUN (seed-demo.service.ts:87-116 ne crée aucun operateur_terrain) → sondes runtime limitées au fail-closed générique (§3, OPERATEUR-14).

## 2. Fonctionnalités observées dans le code

| Fonction | Écran front | API back | Verdict |
|---|---|---|---|
| Lister acteurs | BOActeurs.tsx (gate acteurs.read, BOLayout.tsx:95) | GET /users @Roles('ADMIN') → OK OT (users.controller.ts:43-52) | fonctionne |
| Détail acteur | BOActeurDetail.tsx | GET /users/:id — **OT absent des @Roles** (users.controller.ts:240) | 403 (OPERATEUR-02) |
| Modifier/suspendre acteur | boutons gated acteurs.write/suspend | PATCH /users/:id — **OT absent des @Roles** (users.controller.ts:263) | 403 (OPERATEUR-02) |
| Enrôlement / validation dossiers | BOEnrolement.tsx:227 (enrolement.validate) | GET/PATCH /identifications — OT dans la liste in-code (identifications.controller.ts:96,488) | fonctionne, MAIS sans permission serveur ni scope (OPERATEUR-06) |
| Supervision transactions | BOSupervision.tsx (geler/annuler/litige, l.478-857, **sans hasPermission**) | GET /transactions/all OK OT (l.50) ; PATCH /transactions/:id **refuse OT** (transactions-rest.controller.ts:72) | lecture OK, actions 403 (OPERATEUR-03) |
| Missions | BOMissions.tsx (gate missions.read, BOLayout.tsx:167) | GET /missions @Roles('super_admin','admin','institution') — 'admin' fantôme jamais résolu (missions.controller.ts:15, roles.guard.ts:27) | 403 pour OT ET admin_general/national/gestionnaire (OPERATEUR-01) |
| Mutations (décision) | mutations.read/write accordés | PATCH /mutations/:id/decision **sans OT** (mutations.controller.ts:115) | lecture OK, décision 403 (OPERATEUR-04) |
| Modération (signalements) | moderation.write accordé | GET /users/flags OK OT (user-flags.controller.ts:22) ; PATCH :id/resolve **sans OT** (l.36) | lecture OK, traitement 403 (OPERATEUR-04) |
| Zones | gate zones.read | GET OK ('ADMIN') ; mais POST/PATCH/DELETE zones aussi 'ADMIN' → OT passe serveur (zones.controller.ts:36,48,60) | serveur plus permissif que le front (OPERATEUR-09) |
| Audit & Logs | BOLayout.tsx:139 (audit.read) | GET /audit OK OT ; **POST /audit ouvert à tous les BO** (audit-rest.controller.ts:31) | voir OPERATEUR-07 |
| Academy | gate academy.read | /backoffice/academy + config academyConfig.ts:208 | fonctionne |
| Création d'acteur | — | POST /auth/create-acteur OK OT, escalade verrouillée (auth.controller.ts:763,781) | fonctionne |

## 3. Constats détaillés

### OPERATEUR-01 [P1] — Écran Missions mort pour le rôle (et pour presque tous les BO)

Le front accorde missions.read (BackOfficeContext.tsx:193), la sidebar affiche l'entrée (BOLayout.tsx:167), mais GET /missions exige super_admin|admin|institution et le littéral 'admin' minuscule n'est jamais résolu par RolesGuard (qui ne reconnaît que 'ADMIN' majuscule, roles.guard.ts:27). Preuve : missions.controller.ts:15 + backend/src/auth/guards/roles.guard.ts:26-29. Impact : l'opérateur terrain voit un écran en erreur permanent (lectureMissions « indisponible », BackOfficeContext.tsx:510-515). De plus POST/PATCH /missions écrivent des champs inexistants sur l'entité (date_debut/date_fin/objectif/recompense, missions.controller.ts:25 vs mission.entity.ts:4-15) alors que le front attend objectif/realise/points/region (BOMissions.tsx:14-28) : module doublement désaligné.

### OPERATEUR-02 [P1] — acteurs.write/acteurs.suspend inopérants serveur pour ce rôle

PATCH /users/:id est @Roles('super_admin','admin_general','admin_national','identificateur') — OT (et gestionnaire_zone) reçoivent 403 à la porte, rendant morte la logique in-code prévue pour eux (users.controller.ts:263-294 : exigerPermissionBO('acteurs.suspend') l.291 inatteignable). Idem GET /users/:id (users.controller.ts:240-247, OT présent dans isAdmin l.244 mais absent des @Roles l.240). Impact : le cœur « consulter/agir sur un acteur » du rôle est cassé ; la matrice de permissions front promet ce que le serveur refuse.

### OPERATEUR-03 [P1] — Actions supervision (geler/annuler/litige) affichées mais refusées

BO_SCREEN_PERMISSIONS accorde supervision.write/freeze à OT (BackOfficeContext.tsx:193, recopié serveur bo-autorisation.ts:28), mais PATCH /transactions/:id est @Roles('super_admin','admin_general','admin_national') (transactions-rest.controller.ts:71-72), et BOSupervision.tsx n'appelle JAMAIS hasPermission (0 occurrence) : l'opérateur voit les boutons, le serveur répond 403. Impact : UX trompeuse + échec silencieux en terrain.

### OPERATEUR-04 [P1] — mutations.write et moderation.write promis, refusés serveur

PATCH /mutations/:id/decision sans OT (mutations.controller.ts:113-115) ; PATCH /users/flags/:id/resolve sans OT (user-flags.controller.ts:35-36). Dans les deux cas le front affiche l'action (gates l.101, écrans BO*). Impact : deux missions « décider » du rôle sont des impasses.

### OPERATEUR-05 [P2] — Trois registres de permissions divergents, dont un mort

(a) config/bo-permissions.ts — déclaré « ce fichier n'est branché nulle part » (l.14-15) : SCOPE OT sans zones/missions (l.407-416), aligné sur la maquette (docs/maquette_matrice_permissions.html:270) ; (b) registre VIVANT BackOfficeContext.tsx:189-194 (avec zones.read+missions.read) ; (c) copie serveur bo-autorisation.ts:24-29 (alignée sur (b) « à garder synchronisé jusqu'à BO-3 »). Impact : toute décision de permission est ambiguë ; la source de vérité documentée n'est pas celle qui tourne.

### OPERATEUR-06 [P1] — enrolement.validate non vérifié côté serveur + aucun scope zone

PATCH /identifications/:id accepte tout rôle BO in-code (identifications.controller.ts:488) sans exigerPermissionBO('enrolement.validate') et sans filtre zone : un OT dont on a retiré la permission par matrice (PATCH /users/:id/bo-permissions, users.controller.ts:410-468) valide encore les dossiers ; et son zoneId n'est nulle part utilisé. Impact : la matrice super_admin est cosmétique sur LA permission cœur du rôle ; périmètre « terrain » inexistant.

### OPERATEUR-07 [P2] — POST /audit : tout rôle BO peut écrire des traces

audit-rest.controller.ts:31 — POST /audit accessible à @Roles('ADMIN') (= les 5 rôles BO) avec body libre (action/entite/details). Impact : un « Analyste » peut injecter des entrées d'audit forgées (piste d'audit non fiable) ; l'OT a audit.read mais l'écriture devrait être serveur-only.

### OPERATEUR-08 [P2] — Validation de dossiers non journalisée

PATCH /identifications/:id ne produit aucun audit_logs (seuls les SMS l.525-575 et le DELETE super_admin l.618 journalisent) ; à l'inverse les mutations acteurs le font (users.service.ts:395). Impact : la décision la plus sensible du rôle (valider/rejeter un dossier → activation de compte) n'est pas traçable.

### OPERATEUR-09 [P2] — Zones : le serveur autorise plus que le front

POST/PATCH/DELETE /zones en @Roles('ADMIN','super_admin') → OT passe (zones.controller.ts:36,48,60) alors que son registre front n'a pas zones.write ; seul garde : zone non vide (zones.service.ts:177-190). Impact : API directe = suppression/création de zones par un Analyste (dérive front/serveur en face de OPERATEUR-02/03, cette fois permissive).

### OPERATEUR-10 [P2] — Rôle « terrain » sans périmètre géographique réel

applyZoneRestriction ne traite que gestionnaire_zone (transactions-rest.controller.ts:255-259) ; la liste acteurs, les identifications et les flags sont nationaux. Impact : un OT affecté à San-Pédro voit tout le pays ; le mot « terrain » du rôle n'a pas d'effet.

### OPERATEUR-11 [P2] — Aucun compte démo + secret partagé historique

Le seed ne crée aucun OT (seed-demo.service.ts:87-116) → rôle incrécetable en l'état ; par ailleurs ALERTE-SEC-01 S1 documente 1 compte OT de test partageant le même mot de passe BO que 6 autres (docs/securite/ALERTE-SEC-01-comptes-test.md:36). Impact : recette bloquée ; risque si ces comptes existent encore hors dev.

### OPERATEUR-12 [P2] — Offline inexistant pour le back-office

Le service worker précharge pages + voix pour la marchande (frontend/public/sw.js:5-17) mais aucune file d'attente/outbox ni indicateur de connectivité n'existe dans components/backoffice/ (0 occurrence offline/outbox ; les 3 « Hors ligne » visibles concernent la santé serveur, BODashboard.tsx:381). Impact : l'opérateur en zone à réseau instable perd sa saisie d'enrôlement en cours (brouillons OK via /identifications/draft mais dépendants du réseau).

### OPERATEUR-13 [P2] — Voice-first non décliné pour ce rôle

Zéro occurrence parle(/Tata/entreeVoix dans components/backoffice/ (recherche vide). La doctrine « aucune information importante ne doit exister uniquement sous forme de texte » (PROJECT_CONTEXT §1) n'est pas appliquée aux écrans de validation dossiers. Impact : un opérateur peu-lecteur ne peut pas exercer le rôle ; non prioritaire si hypothèse « BO lettré », mais à trancher explicitement.

### OPERATEUR-14 [P3] — Garde cible tactile ≥ 44 px hors périmètre BO

scripts/test-cible-tactile.mjs ne couvre que POSCaisse (+ surfaces auth ajoutées Task 5) ; aucun contrôle équivalent sur les écrans BO. Impact : non mesuré — catégorie vierge pour le runtime tactile de ce rôle.

### OPERATEUR-15 [P3] — PII : profil complet exposé sans périmètre

GET /users/by-phone/:phone (accessible à OT, users.controller.ts:54-71) renvoie le profil entier (nin, numCNPS, numCMU, dateNaissance…) — la sanitisation ne retire que les secrets d'auth (sanitize-user.util.ts:14-20). Impact : exfiltration de PII nationale possible par un Analyste ; conforme « secrets » mais pas « minimisation ».

### OPERATEUR-16 [P3] — Scories de rôles

'admin' fantôme dans BO_ROLES front (constants.ts:94-100) et missions.controller ; 'operateur_terrain' dupliqué dans la liste WS (events.gateway.ts:62) ; 'institution' seul rôle non-BO admis sur /missions. Impact : faible mais entretient la confusion des registres.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| OPERATEUR-01 | Écran missions 403, module désaligné entité/UI | Fonctionnel | P1 | Navigation BO normale |
| OPERATEUR-02 | actions acteurs bloquées (403) malgré permissions | Autorisation (dérive front/serveur) | P1 | Navigation BO normale |
| OPERATEUR-03 | geler/annuler transaction affiché puis 403 | Autorisation (dérive) | P1 | Navigation BO normale |
| OPERATEUR-04 | décision mutation / traitement signalement 403 | Autorisation (dérive) | P1 | Navigation BO normale |
| OPERATEUR-06 | matrice non appliquée sur enrolement.validate ; pas de scope | Autorisation (fail-open partiel) | P1 | API directe avec token OT |
| OPERATEUR-09 | création/suppression de zones par OT (serveur permissif) | Autorisation (dérive inverse) | P2 | API directe |
| OPERATEUR-07 | falsification de journal d'audit | Intégrité / Traçabilité | P2 | POST /audit authentifié BO |
| OPERATEUR-08 | validation de dossier sans trace d'audit | Traçabilité | P2 | Navigation BO normale |
| OPERATEUR-10 | absence de périmètre zone (données nationales) | Données / Minimisation | P2 | Navigation BO normale |
| OPERATEUR-11 | rôle non recetable + mot de passe BO partagé (alerte S1) | Sécurité opérationnelle | P2 | Comptes de test |
| OPERATEUR-15 | PII sensible (nin/CNPS/CMU) exposée à l'OT | PII / RGPD-loi 2013-450 | P2 | GET /users/by-phone/:phone |
| OPERATEUR-12 | perte de travail en réseau instable (pas d'outbox BO) | Disponibilité / Offline | P2 | Terrain, réseau mobile |
| OPERATEUR-13 | parcours non vocal (doctrine voice-first) | A11y | P2 | Utilisateur peu-lecteur |
| OPERATEUR-05 | 3 registres de permissions divergents (1 mort) | Gouvernance | P2 | Évolution future |
| OPERATEUR-14 | cible tactile non garantie en BO | A11y | P3 | Tablette terrain |
| OPERATEUR-16 | rôles fantômes/duplications | Hygiène | P3 | — |

## 5. Points forts

- **Escalade de privilèges verrouillée et TESTÉE** : OT ne peut créer que marchand/producteur/coopérateur (auth.controller.ts:763-785) — gardes verts référencés : m6-m8-role-escalation.spec.ts:166-251 (super_admin/admin_general/institution via create-acteur → refusé), bo0-s3-escalade-privileges.spec.ts:128,199 (S3i suppression, S3o blocage compte BO).
- **Modèle J6 existe déjà** : counts-by-role vérifie réellement acteurs.read depuis boPermissions (users.controller.ts:113-116) et DELETE /users/:id applique exigerPermissionBO('acteurs.delete') + hiérarchie (users.controller.ts:477-487) — le patron à généraliser est en place.
- **Fail-closed confirmé en runtime** : sans token → 401 sur /missions, /identifications, /audit, /users ; token MARCHANDE (Awa Koné) → 403 sur /missions, /audit, /users ; throttler actif (429 observé au 1er POST login).
- **Brouillons d'enrôlement robustes** : accès in-code cloisonné, DELETE brouillon limité au propriétaire hors admins (identifications.controller.ts:139-160,579-603).
- **Suppression de zone défendue métier** : refus si acteurs ou marchés rattachés (zones.service.ts:177-190).
- **Session web conforme ADR-002** (cookies httpOnly, zéro jeton en localStorage — worklog Task 8) et redirection BO correcte pour OT.
- **Rôle documenté** : INVENTAIRE_RECETTES_V1 §rôles (l.584-617) décrit précisément le mécanisme ADMIN_ROLES/BO.

## 6. Recommandations de correction

- **OPERATEUR-01/02/03/04 (lot « dérive front↔serveur »)** : arbitrer chaque capacité du rôle et aligner : soit ajouter operateur_terrain aux @Roles (users GET/PATCH :id, mutations decision, flags resolve, transactions PATCH — avec exigerPermissionBO correspondant), soit retirer la permission du registre front + masquer l'action. Corriger le littéral 'admin' → 'ADMIN' dans missions.controller (et choisir qui accède à /missions). Effort **M**.
- **OPERATEUR-06** : sur PATCH /identifications/:id, appeler exigerPermissionBO(req.user, 'enrolement.validate') pour les rôles BO (patron users.controller:291) + filtre zone si zoneId présent. Effort **S**.
- **OPERATEUR-05** : faire de bo-permissions.ts la source unique branchée (ou le supprimer) ; générer DEFAUTS_PAR_ROLE serveur et BO_SCREEN_PERMISSIONS front depuis ce registre (garde CI de synchronisation sur le modèle test:enum-check-phone). Effort **M**.
- **OPERATEUR-07** : restreindre POST /audit au serveur (rôle système) ou valider une allow-list d'actions. Effort **S**.
- **OPERATEUR-08** : écrire un audit_logs DOSSIER_STATUT_* dans la même transaction que PATCH /identifications (patron transactions-rest.controller.ts:302-326). Effort **S**.
- **OPERATEUR-09** : ajouter exigerPermissionBO('zones.write') sur POST/PATCH/DELETE /zones. Effort **S**.
- **OPERATEUR-10** : définir le scope du rôle (colonne zoneId exploitée ou rôle explicitement national, à documenter dans ADR/INVENTAIRE). Effort **M**.
- **OPERATEUR-11** : ajouter un compte OT au seed démo (mot de passe dédicacé) + vérifier la clôture des comptes S1. Effort **S**.
- **OPERATEUR-12/13** : trancher la doctrine BO (offline outbox + voix nécessaires ou BO assumé online/lettré, à écrire dans le REQUIREMENTS). Effort **M/L**.
- **OPERATEUR-15** : projeter une liste de colonnes publiques pour by-phone/:id (pas l'entité). Effort **S**.
- **OPERATEUR-14/16** : étendre le garde tactile aux 5 écrans clés du rôle ; purge des littéraux fantômes. Effort **S**.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | connexion BO OT → /backoffice/dashboard | session cookie, aucune route hors périmètre |
| Autorisation | chaque permission du registre OT vs réponse API | 0 action affichée qui finit en 403 ; 0 mutation sans permission serveur |
| Enrôlement | valider / rejeter / complément un dossier | effet atomique + SMS + trace d'audit |
| Missions | lecture et création | statut 200 réel (pas d'écran en erreur) |
| Zones | lecture seule attendue | API directe sans zones.write → 403 |
| Mutations/Modération | décision selon arbitrage final | cohérence UI ↔ 200/403 assumé |
| Argent | aucune opération financière | OT ne touche wallets/transactions sensibles (FAIL-CLOSED) |
| Audit | traçabilité validation | ligne audit_logs avec auteur, IP, avant/après |
| Offline | coupure réseau pendant saisie | brouillon conservé, pas de doublon à la reprise |
| Voix/A11y | information critique sans lecture | parcours compréhensible ; cibles ≥ 44 px mesurées |

## 8. Tests critiques recommandés

1. Matrice de permissions OT : pour CHAQUE clé true du registre, un appel API réel doit réussir ; pour chaque clé false, un appel direct doit échouer 403 (garde automatisable sur le modèle EMPREINTE-GARDES).
2. OT + token : POST /zones, PATCH /transactions/:id, POST /audit, PATCH /identifications avec boPermissions retirés → comportements attendus documentés.
3. Escalade : OT → création identificateur/institution/super_admin via create-acteur → refus (gardes m6-m8 déjà verts, à maintenir).
4. Validation dossier : rejeu double POST/PATCH → un seul effet (statut + SMS uniques), crash réseau entre statut et SMS → aucune incohérence.
5. Idempotence mutations decision (double PATCH décision) → « déjà traitée » (déjà implémenté, l.136-138 — à garder vert).
6. Aucun compte BO OT de test avec secret partagé en recette/prod (clôture ALERTE-SEC-01 S1).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P0 | Aligner front↔serveur sur les 5 capacités cassées (missions, acteurs :id, supervision, mutations, modération) — OPERATEUR-01..04 | M |
| P0 | Brancher enrolement.validate + permission serveur sur /identifications (OPERATEUR-06) | S |
| P1 | Un seul registre de permissions (source unique + garde CI) — OPERATEUR-05 | M |
| P1 | Audit log sur validation de dossiers — OPERATEUR-08 | S |
| P1 | Fermer POST /audit aux clients — OPERATEUR-07 | S |
| P2 | exigerPermissionBO('zones.write') + décision de scope zone — OPERATEUR-09/10 | M |
| P2 | Compte OT de démo + clôture S1 — OPERATEUR-11 | S |
| P2 | Doctrine offline/voix pour le BO (à trancher) — OPERATEUR-12/13 | L |
| P3 | Minimisation PII by-phone, garde tactile BO, purge littéraux — OPERATEUR-15/14/16 | S |

## 10. Scores proposés

| Dimension | Score | Justification éclair |
|---|---|---|
| Sécurité | 68/100 | escalade verrouillée + J6 réel sur 4 routes, MAIS dérives bidirectionnelles front↔serveur, POST /audit ouvert, matrice cosmétique sur la permission cœur |
| Accessibilité | 55/100 | garde tactile absent du BO, zéro voix, offline inexistant ; non mesuré runtime (catégorie vierge) |
| Qualité | 60/100 | écran Missions mort, entité/UI désalignées, 3 registres divergents (1 mort), aucun compte démo pour le rôle |
| **Global** | **61/100** | au-dessus du seuil PROD 60 mais **rôle non recetable en l'état** (compte manquant + 5 capacités cassées) |

## 11. Conclusion + statut

Le rôle operateur_terrain n'est PAS une vitrine : il est câblé de bout en bout (login → dashboard → sidebar → écrans) et l'essentiel sécuritaire tient (escalade refusée, fail-closed observé en runtime, J6 amorcé). Mais son périmètre d'action déclaré (missions, écriture acteurs, gel de transactions, décisions de mutation, traitement de signalements) est **en grande partie refusé par le serveur** — l'inverse du risque classique, tout aussi bloquant pour l'exploitation — tandis que sa permission la plus sensible (validation d'enrôlement) échappe, elle, à la matrice de permissions. L'audit du 28/09 reste donc VALIDE sur son P1 (« permissions BO vs rôle »), ici confirmé, précisé et élargi en 4 dérives concrètes ; son P2 « actions stub » est en partie obsolète (les écrans sont branchés sur l'API réelle, c'est le contrat qui diverge). Aucun P0 sécurité ouvert : les risques majeurs sont fonctionnels et de gouvernance.

**Statut : À RECETTER — audit statique + sondes fail-closed (lecture seule, 0 écriture). Recette bloquée par l'absence de compte OT de démo (OPERATEUR-11).**
