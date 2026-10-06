# AUDIT ACTEUR — GESTIONNAIRE-ZONE — 2026-10-05

## 1. Identité et périmètre

- **Rôle** : gestionnaire_zone (enum backend backend/src/users/entities/user.entity.ts:26) — back-office « Supervision de zone territoriale » (frontend_src/src/app/utils/role-config.ts:63, components/backoffice/BOProfil.tsx:88).
- **Routage post-login** : gestionnaire_zone → /backoffice/dashboard (frontend_src/src/app/components/auth/LoginPassword.tsx:918).
- **Méthode** : audit statique READ-ONLY (backend zones/users/marches/mutations/transactions/identifications/audit/misc + écrans BO) + sonde runtime (max 5 GET, lecture seule, backend :3001). Aucune écriture, aucun fichier modifié.
- **Référentiels lus** : worklog.md, PROJECT_CONTEXT.md §1/§8, ACCESSIBILITY_GUIDE.md §4/5/6, DESIGN_SYSTEM.md §9, AUDIT-ACTEUR-GESTIONNAIRE-ZONE-2026-09-28.md (squelette statique « À RECETTER »).
- **Limite runtime** : le seed démo ne contient **aucun compte gestionnaire_zone** (backend/src/database/seed-demo.service.ts:87-117) → pas de recette connectée possible pour ce rôle ; sondes faites en anonyme + en marchande (contrôle négatif).

## 2. Fonctionnalités observées dans le code

- **Liste acteurs BO** : GET /users (@Roles('ADMIN') → inclut GZ, users.controller.ts:43-47) ; détail GET /users/:id (:240-261) ; recherche par téléphone /users/by-phone/:phone (:54-72) ; historique /users/:id/historique (:218-238) ; doublons /users/duplicates (:96-107) ; compteurs /users/counts-by-role (:109-119).
- **Zones & marchés** : GET /zones (stats + volume caisse par zone, zones.controller.ts:13, zones.service.ts:21-56), POST/PATCH/DELETE /zones (:36-63), GET /marches **sans garde**, POST/PATCH/DELETE /marches (marches.controller.ts:32-167).
- **Supervision/transactions** : /transactions/all, /geo-aggregation, /by-acteur-geo avec applyZoneRestriction (transactions-rest.controller.ts:49-69,150-212,255-259) ; export CSV/XLSX/PDF réservé aux admins (:127-148) ; écran BOSupervision exporte côté client (BOSupervision.tsx:446-500).
- **Mutations** : liste BO nationale (mutations.controller.ts:45-61), décision @Roles(...gestionnaire_zone) (:113-115).
- **Création de comptes** : POST /users/backoffice/create autorisé au GZ **avec scoping zone serveur** (backoffice-users.service.ts:110-140) ; POST /auth/create-acteur décoré pour GZ mais **mort** (voir GESTZONE-06).
- **Autres** : user-flags (user-flags.controller.ts:14-33), audit logs (audit-rest.controller.ts:12,30-31), dashboard /dashboard/stats (misc-rest.controller.ts:200-265), missions (missions.controller.ts:14-21, jeton 'admin'), tickets (tickets-rest.controller.ts:17), WebSocket room admin (events.gateway.ts:62).
- **Frontend** : garde de rôle unique à l'entrée BO (BORoot.tsx:17-24), menu filtré par hasPermission (BOLayout.tsx:78-184), écrans BOActeurs/BOEnrolement/BOSupervision/BOZones/BOCarteActeurs/BOMutations/BOAudit/BOUtilisateurs ; registre de permissions config/bo-permissions.ts:394-439.

## 3. Constats détaillés

**GESTZONE-01 [P1] — La liste d'acteurs n'est PAS filtrée par zone côté serveur.** buildActeursListWhereClause (users.service.ts:195-261) ne reçoit le rôle du demandeur que pour exclure super_admin ; **aucun prédicat zone_id** pour gestionnaire_zone. Le DTO ne porte pas de filtre zone (users-bo-list-query.dto.ts:21-72). Un GZ reçoit donc TOUS les acteurs nationaux (téléphones, statuts, zones). Impact : rupture du contrat fondamental du rôle ; exfiltration PII massive par simple GET + pagination. Preuve croisée : docs/INVENTAIRE_RECETTES_V1.md:151 documente un filtre zone pour doublons — jamais généralisé.

**GESTZONE-02 [P1] — IDOR trans-zone sur lectures unitaires.** GET /users/:id (users.controller.ts:240-261) : le contrôle memeZone n'existe que pour identificateur ; le GZ lit n'importe quel profil. Idem /users/by-phone/:phone (:54-72, annuaire national par énumération de téléphones) et /users/:id/historique (:218-238). Impact : lecture ciblée de tout acteur hors zone (PII, historique complet).

**GESTZONE-03 [P1] — Écritures zones/marches trans-zone.** POST/PATCH/DELETE /zones sont @Roles('ADMIN','super_admin') (zones.controller.ts:36-63) et le jeton 'ADMIN' **inclut** gestionnaire_zone (roles.guard.ts:5,27) → un GZ peut créer une zone, se réaffecter un gestionnaire (gestionnaire_id), désactiver/supprimer n'importe quelle zone. PATCH /marches/:id liste explicitement gestionnaire_zone **sans vérifier m.zone_id == user.zoneId** (marches.controller.ts:138-160) ; DELETE /marches/:id passe par le jeton ADMIN (:162-167). Le frontend masque (scope sans zones.write, bo-permissions.ts:394-406) mais le serveur autorise : garde UI-only.

**GESTZONE-04 [P1] — GET /zones expose toutes les zones + chiffres d'affaires.** getZonesWithStats (zones.service.ts:21-56) renvoie pour CHAQUE zone nbActeurs, stockTotal, **volumeTotal** (somme caisse_transactions) et tauxActivite. Accessible au GZ (zones.controller.ts:13). Impact : surveillance économique de toutes les zones, y compris celles des pairs.

**GESTZONE-05 [P1] — Restriction zone fail-open si zoneId est nul.** Les trois seuls filtres zone corrects sont conditionnés à user.zoneId : transactions-rest.controller.ts:256, user-flags.controller.ts:28, users.controller.ts:102. Un compte GZ sans zone affectée (création via ancien flux, zone supprimée) obtient une vue **nationale silencieuse** au lieu d'un refus. (À l'inverse la création de comptes BO est fail-closed : backoffice-users.service.ts:121-126.)

**GESTZONE-06 [P1] — Matrice de permissions divergente à 3 sources + permissions mortes.** Backend bo-autorisation.ts:24-29 (GZ inclut missions.read), frontend moderne bo-permissions.ts:394-406 (sans missions.read), frontend hérité BackOfficeContext.tsx:192 (avec missions.read). enrolement.validate est octroyé au GZ partout mais **aucun endpoint serveur ne l'exécute** : PATCH /identifications/:id exclut le GZ (identifications.controller.ts:485-492), /dossiers aussi (dossiers-rest.controller.ts:13). À l'inverse POST /auth/create-acteur décoré pour GZ (auth.controller.ts:761-763) est **refusé en service** pour tout rôle cible : rolesCreablesPar('gestionnaire_zone') → [] fail-closed (auth.service.ts:67-73,125-127). Impact : droits affichés ≠ droits réels ; écrans proposant des actions 403.

**GESTZONE-07 [P2] — GET /marches est PUBLIC (non authentifié).** Aucun @UseGuards sur la classe ni sur findAll (marches.controller.ts:24-40), seul ThrottlerGuard est global (app.module.ts:154). **Confirmé runtime : 200 sans token.** Données de marché peu sensibles, mais incohérent avec le reste et référence de taxonomie pour attaques ultérieures. (GET /admin-divisions/* public aussi : 200 runtime — référentiel assumable, à documenter.)

**GESTZONE-08 [P2] — KPI et logs d'audit nationaux pour un rôle zoné.** /dashboard/stats (@Roles inclut GZ, misc-rest.controller.ts:200-261) : total utilisateurs, revenus caisse **nationaux**. GET /audit (@Roles('ADMIN'), audit-rest.controller.ts:30) : journal complet de la plateforme sans filtre zone/entité. De plus POST /audit (:31) laisse tout rôle BO **écrire** des entrées de journal forgées (injection de logs).

**GESTZONE-09 [P2] — Mutations : liste et décision nationales.** GET /mutations renvoie toutes les mutations pour les rôles BO (mutations.controller.ts:53-61) sans filtre zone actuelle/demandée ; PATCH /mutations/:id/decision (:113-201) permet à un GZ d'approuver une mutation **vers une autre zone** (réaffectation users.zone_id :168-178) sans qu'aucun gestionnaire de la zone cible ne soit impliqué. Traçabilité correcte (décideur + motif rejet ≥10 car., transaction atomique).

**GESTZONE-10 [P2] — Temps réel et supervision non scopés.** WebSocket : GZ rejoint la room admin et reçoit tous les évènements nationaux (events.gateway.ts:62,89-98) ; emitTransactionCreated diffuse aussi en room all (:95-97). GET /supervision n'a **aucun** @Roles (misc-rest.controller.ts:20-23) — tout utilisateur authentifié (marchande incluse) l'appelle ; renvoie un stub vide.

**GESTZONE-11 [P2] — Gardes frontend par rôle unique + filtres zone UI-only.** /backoffice/* ne vérifie que le rôle BO à l'entrée (routes.tsx:189-222, BORoot.tsx:17-24) : navigation directe par URL vers /backoffice/utilisateurs (superOnly) rend l'écran ; la protection reste sur les 403 serveur. BOEnrolement filtre les dossiers « ma zone » **côté client** (BOEnrolement.tsx:226-307,704-708) — et reçoit de toute façon une liste vide car GET /identifications ne considère pas GZ comme admin (identifications.controller.ts:96-97) : l'écran Enrôlement du GZ est fonctionnellement **vide**.

**GESTZONE-12 [P2] — A11y : cibles tactiles < 44 px dans les composants universels.** Fermeture de UniversalModalBO 32×32 px (UniversalModalBO.tsx:160-162), bouton copier de UniversalTableBO 24×24 px (UniversalTableBO.tsx:144-152) — utilisés par toutes les fiches/écrans du rôle. Violation règle ≥44 px (ACCESSIBILITY_GUIDE §4).

**GESTZONE-13 [P3] — Couleurs hardcodées dans les écrans BO.** Ex. BOAudit.tsx:18 ('#10B981'), BOLayout.tsx:44, BOProfil.tsx:80, role-config.ts:24, ~24 hex dans BOSupervision, ~47 dans BOZones. Violation DESIGN_SYSTEM §9 (« jamais de couleurs hardcodées ») ; le garde caisseCharte.test.mts ne couvre pas le back-office.

**GESTZONE-14 [P3] — Incohérences de scope identifications + fuite géocodage tiers.** Même rôle traité différemment sur 3 endpoints : /identifications/geo = admin **national** (identifications.controller.ts:51), /identifications = ses propres dossiers (vide pour GZ, :96-97), PATCH = interdit. BOCarteActeurs affiche donc des points GPS nationaux (BOCarteActeurs.tsx:80-89) et géocode les adresses **directement chez nominatim.openstreetmap.org** (:172) — adresses d'acteurs envoyées à un tiers sans passer par le backend.

**Vérification de l'audit du 28/09** : les 3 constats (« isolation zone », « matrice permissions », « exports et stubs ») **restent tous valables** ; ce rapport les ancre par preuves fichier:ligne et les étend (GESTZONE-01→06, 08, 10, 14 ; exports client BOSupervision et stubs /supervision//demandes).

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| GESTZONE-01 | Liste acteurs nationale lisible par un GZ | Fuite de données / PII | P1 | GET /users authentifié GZ + pagination |
| GESTZONE-02 | Lecture de tout profil/téléphone/historique hors zone | IDOR | P1 | GET /users/:id, /by-phone/:phone, /:id/historique |
| GESTZONE-03 | Création/modification/suppression de zones & marches hors zone | Élévation / écriture trans-zone | P1 | POST/PATCH/DELETE /zones, /marches (jeton ADMIN) |
| GESTZONE-04 | Stats financières de toutes les zones | Fuite d'agrégats d'argent | P1 | GET /zones (volumeTotal) |
| GESTZONE-05 | Vue nationale silencieuse si zoneId nul | Fail-open | P1 | Compte GZ sans zone + /transactions, /users/flags |
| GESTZONE-06 | Droits affichés ≠ droits serveur (3 matrices, permissions mortes) | Incohérence d'autorisation | P1 | enrolement.validate, create-acteur, missions.read |
| GESTZONE-07 | /marches public sans authentification | Exposition endpoint | P2 | GET /marches anonyme (200 runtime) |
| GESTZONE-08 | KPI + audit logs nationaux ; logs forgeables | Sur-permission / intégrité | P2 | /dashboard/stats, GET+POST /audit |
| GESTZONE-09 | Décision de mutation vers une zone non gérée | Écriture trans-zone | P2 | PATCH /mutations/:id/decision |
| GESTZONE-10 | Évènements temps réel + /supervision non scopés | Fuite temps réel | P2 | WS room admin, GET /supervision sans @Roles |
| GESTZONE-11 | Routes BO non gardées par permission ; filtres client-only | Garde UI-only | P2 | URL directe /backoffice/*, filtres BOEnrolement |
| GESTZONE-12 | Cibles tactiles 24-32 px (modales/table BO) | A11y WCAG 2.5.5 | P2 | UniversalModalBO, UniversalTableBO |
| GESTZONE-13 | Couleurs hardcodées écrans BO | Conformité DS | P3 | BOAudit/BOZones/BOSupervision… |
| GESTZONE-14 | Scope identifications incohérent ; géocodage tiers | Cohérence / vie privée | P3 | /identifications vs /geo ; nominatim client |

## 5. Points forts

- **RolesGuard fail-closed vérifié au runtime** : GET /users et /zones avec token marchande → 403 (roles.guard.ts:26-33) ; sans token /zones → 401.
- **Stratégie JWT robuste** : utilisateur rechargé en base à chaque requête, suspension/pending bloqués, allow-list mustChangePassword (jwt.strategy.ts:32-46).
- **Création de comptes BO correctement zonée et hiérarchisée** : GZ ne crée ni admins ni hors sa zone ; comptes non-admins naissent inertes (activation 30 min) ; audit écrit (backoffice-users.service.ts:74-150,184-226,364-371).
- **Filtres zone bien implémentés là où ils existent** : /users/duplicates (users.controller.ts:100-106), /users/flags (user-flags.controller.ts:24-32), /transactions/all|geo|by-acteur-geo (transactions-rest.controller.ts:255-259).
- **Politique M6/M8 fail-closed dans le service** : aucune chaîne anonyme→admin (auth.service.ts:45-73,122-127).
- **Traçabilité des décisions** : mutation atomique statut+zone+mission, motif rejet obligatoire ≥10 car. (mutations.controller.ts:130-201) ; archivage utilisateur avec audit en transaction (users.service.ts:350-358).
- **Base a11y BO solide** : Radix Dialog/AlertDialog (UniversalModalBO.tsx:100-112, UniversalConfirmModalBO.tsx:6-10,93-116), focus trap manuel du Drawer (UniversalDrawerBO.tsx:38-57,88-89), recherche avec aria-label/listbox (UniversalRechercheBO.tsx:156,174,187), filtre 44 px + aria-expanded (UniversalFiltreBO.tsx:87-96,125-126).
- **Throttling effectif** : 429 constatés au runtime sur login après 3 tentatives (défense brute-force vivante).

## 6. Recommandations de correction

- **GESTZONE-01** : injecter requesterRole **et** requesterZoneId dans buildActeursListWhereClause ; si role='gestionnaire_zone' → AND u.zone_id = $zone (fail-closed si zone nulle) ; même clause pour counts.
- **GESTZONE-02** : factoriser un helper verifierMemeZone(acteur, cible) et l'exiger dans /users/:id, /by-phone, /:id/historique pour tout rôle non national (GZ, identificateur, institution).
- **GESTZONE-03** : POST/PATCH/DELETE /zones et /marches → remplacer le jeton 'ADMIN' par @Roles('super_admin','admin_general') ; pour GZ sur PATCH /marches/:id : JOIN zones z … AND z.gestionnaire_id = user.id avant update.
- **GESTZONE-04** : GET /zones filtré par z.gestionnaire_id = user.id pour GZ (ou exclure agrégats monétaires hors zone).
- **GESTZONE-05** : fail-closed partout — if (role==='gestionnaire_zone') { if (!zoneId) throw Forbidden } (aligner sur backoffice-users.service.ts:121-126).
- **GESTZONE-06** : unique source de vérité des permissions (déjà dessinée dans bo-autorisation.ts) + garde de cohérence front/back en CI ; supprimer enrolement.validate du scope GZ ou implémenter le endpoint ; trancher create-acteur (supprimer GZ du @Roles).
- **GESTZONE-07** : @UseGuards(JwtAuthGuard) sur GET /marches (ou assumer un contrat public documenté + rate-limit).
- **GESTZONE-08** : scope /dashboard/stats et /audit par zone pour GZ ; POST /audit réservé au serveur (supprimé du contrôleur).
- **GESTZONE-09** : autoriser la décision GZ uniquement si zoneActuelleId == user.zoneId OU zoneDemandeeId == user.zoneId.
- **GESTZONE-10** : room admin:zone:<id> ; /supervision → @Roles(...ROLES_BO) + stub documenté.
- **GESTZONE-11** : composant <PermissionGate permission> sur les routes BO + déplacer le filtre zone de BOEnrolement côté serveur.
- **GESTZONE-12** : Fermer 32→44 px, copier 24→44 px ; étendre scripts/test-cible-tactile.mjs aux composants universal*BO.
- **GESTZONE-13** : migrer les hex BO sur jetons bo-theme.ts ; charte BO fermée sur le modèle authCharte.test.mts.
- **GESTZONE-14** : aligner les 3 branches identifications sur une matrice unique ; proxifier le géocodage via le backend.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | login BO, refresh, logout | aucune session hors périmètre |
| Autorisation | GET /users, /users/:id, /by-phone | **uniquement sa zone**, 403 sinon |
| Zones | GET/POST/PATCH/DELETE /zones, /marches | lecture zone propre ; écritures refusées au GZ |
| Transactions | /transactions/all, geo, by-acteur | agrégats limités à la zone, même sans zoneId → 403 |
| Mutations | liste + décision | décisions bornées à sa zone |
| Dashboard/Audit | /dashboard/stats, /audit | chiffres et logs de sa zone uniquement |
| Création comptes | POST /users/backoffice/create | création dans sa zone, jamais d'admin (déjà OK) |
| Écrans BO | BOActeurs/Enrolement/Supervision/Zones/Carte | données = celles du serveur, pas de liste vide inexpliquée |
| A11y | modales, table, filtres | cibles ≥44 px, focus trap, ESC, contrastes 3 confits |
| Audit | action sensible | trace avec auteur + IP, non forgeable via API |

## 8. Tests critiques recommandés

1. GZ de zone A → GET /users : aucun acteur de zone B (test API + invariant CI).
2. GZ de zone A → GET /users/<id zone B>, /by-phone, /:id/historique → 403/404 sans fuite.
3. GZ → POST/PATCH/DELETE /zones, PATCH/DELETE /marches hors zone → 403 (correspondance UI masqué vs serveur).
4. GZ sans zoneId → toutes les listes → 403 (fail-closed), jamais vue nationale.
5. GZ → PATCH /mutations/:id/decision d'une mutation zone B → 403.
6. GET /marches anonyme → 401 après correctif (garde anti-régression).
7. GZ → GET /audit, /dashboard/stats → aucun chiffre hors zone.
8. Parcours écran : Enrôlement GZ affiche les dossiers de SA zone (bug liste vide GESTZONE-11/14).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | Zone-scope serveur sur GET /users + /users/:id + /by-phone + historique (GESTZONE-01/02) | M |
| P1 | Restreindre écritures zones/marches ; contrôle zone sur PATCH /marches (GESTZONE-03) | S |
| P1 | Fail-closed zoneId nul sur les 3 filtres existants (GESTZONE-05) | S |
| P1 | Unifier la matrice de permissions (1 source + garde CI) (GESTZONE-06) | M |
| P1 | Filtrer GET /zones (agrégats monétaires) par zone (GESTZONE-04) | S |
| P2 | Auth GET /marches ; scope /dashboard/stats, /audit, WS, /supervision (GESTZONE-07/08/10) | M |
| P2 | Décisions de mutation bornées à la zone (GESTZONE-09) | S |
| P2 | PermissionGate sur routes BO + cibles ≥44 px composants universels (GESTZONE-11/12) | S |
| P3 | Jetons couleurs BO + proxy géocodage + matrice identifications (GESTZONE-13/14) | S |
| P0 infra | Seeder un compte démo gestionnaire_zone zoné pour permettre la recette runtime | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Sécurité | 52/100 | Gardes de rôle solides et éprouvés, mais le contrat central (isolation trans-zone) est rompu sur listes, lectures unitaires, zones, KPI, mutations ; fail-open zoneId nul ; /marches public |
| Accessibilité | 68/100 | Base Radix/focus trap/aria-labels de qualité ; cibles 24-32 px, couleurs hardcodées, aucun test axe |
| Qualité | 63/100 | Code commenté, DTO validés, pagination bornée ; mais 3 matrices de permissions divergentes, permissions mortes, endpoint décoré inutilisable, écran Enrôlement vide pour le rôle |
| **Global** | **59/100** | Sous le seuil de confort (60) : corriger GESTZONE-01/02/03/05 avant toute montée en charge de comptes GZ |

## 11. Conclusion + statut

Le rôle gestionnaire_zone dispose d'un socle d'autorisation réel (RolesGuard fail-closed, JWT rechargé en base, création de comptes strictement zonée, filtres zone corrects sur doublons/flags/transactions) — mais **sa promesse d'isolation territoriale n'est pas tenue côté serveur** : la liste d'acteurs, les lectures unitaires, les stats de zones (dont volumes d'argent), les KPI, les logs d'audit et le temps réel sont nationaux, tandis que les écritures zones/marches restent ouvertes via le jeton ADMIN. Les trois constats de l'audit du 28/09 (isolation zone, matrice permissions, exports/stubs) restent tous valables et sont désormais prouvés fichier:ligne. La recette runtime du rôle est aujourd'hui impossible faute de compte démo GZ — à créer en priorité.

**Statut : À RECETTER — 0 P0 confirmé, 6 P1 bloquants pour l'attribution de comptes réels GZ.**
