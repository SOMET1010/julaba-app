# AUDIT ACTEUR — GESTIONNAIRE-ZONE — 2026-10-19

> **Mission** : 2ᵉ vague d'audits statiques par acteur (Task 45-d) — re-vérification de première main des 14 constats du 05/10 et du transverse C-11 (audit comptable 12/10 §5.8 : « isolation territoriale non tenue sur l'argent »), sur `/home/z/julaba-wt` branche `dev`, HEAD `04ae652`. Numéros re-localisés par lecture directe.
> **Périmètre** : backend `users/`, `zones/`, `marches/`, `mutations/`, `transactions-rest/`, `user-flags/`, `identifications/`, `misc-rest/`, `audit-rest/`, `events/` ; frontend BOActeurs, BOZones, BOSupervision, BOEnrolement, BOCarteActeurs, BOMutations, BOAudit.
> **Méthode** : statique READ-ONLY. Delta git sur le périmètre : `ee0b4a0` (reorg audit-log), `4e8c8f0` (**fix SQL « GET/DELETE /zones ne plantent plus » — cast varchar↔uuid : correctif de crash, PAS d'autorisation**). Aucun filtre territorial ajouté.
> **Auteur** : agent Z.ai Code — Task 45-d.

## 1. Identité et périmètre

- **Rôle** : gestionnaire_zone (UserRole.GESTIONNAIRE_ZONE) — supervision territoriale ; contrat attendu : ne voir et ne piloter QUE sa zone.
- **Évolutions depuis le 05/10** : aucune fonctionnelle. `4e8c8f0` répare le crash SQL de /zones sans toucher la surface d'autorisation. ProfileSwitcher réinstallé derrière `import.meta.env.DEV` (BOLayout.tsx:1448-1449, sans effet en build). GET /users/:id : le GZ reste dans isAdmin (users.controller.ts:240-241) ; PATCH /users/:id l'exclut désormais (:263) — léger resserrement d'écriture.
- **Le seed ne crée toujours AUCUN compte gestionnaire_zone** (seed-demo.service.ts:84-117 : acteurs + 2 admin_general seulement) — la recette runtime du rôle reste IMPOSSIBLE (P0 infra reconduit de la 1ʳᵉ vague).

## 2. Fonctionnalités observées dans le code

- **Listes/lectures** : GET /users @Roles('ADMIN') (users.controller.ts:43-51) → buildActeursListWhereClause (users.service.ts:195-238) : exclut super_admin (:214), **aucun prédicat zone_id** ; GET /users/:id (:240-256, memeZone réservé aux identificateurs :249-253) ; /users/by-phone/:phone (:54-72) ; /users/:id/historique (:218).
- **Zones & marchés** : GET /zones @Roles('ADMIN','super_admin','identificateur') (zones.controller.ts:13-17) ; POST/PATCH/DELETE /zones 'ADMIN','super_admin' (:36-63) — le jeton ADMIN **inclut** gestionnaire_zone (roles.guard.ts:5) ; GET /marches **sans garde** (marches.controller.ts:23 classe sans UseGuards, :32) ; PATCH /marches/:id liste gestionnaire_zone **sans contrôle de zone** (:138-140) ; DELETE :164.
- **Supervision** : /transactions/all|geo|by-acteur-geo avec applyZoneRestriction (transactions-rest.controller.ts:166/:198/:240) — fail-open si zoneId nul (:255-257 `&& user.zoneId`) ; export serveur 3 admins (:127-129) ; user-flags fail-open (~:32) ; /dashboard/stats inclut le GZ (misc-rest.controller.ts:200-201) ; GET /supervision sans @Roles (:20-23).
- **Mutations & audit** : PATCH /mutations/:id/decision @Roles(...gestionnaire_zone) sans bornage de zone (mutations.controller.ts:113-115) ; GET+POST /audit 'ADMIN' (audit-rest.controller.ts:12, :30-31).
- **Front** : BORoot.tsx:17-24 (rôle seul) ; BOZones.tsx affiche et totalise le volumeTotal de TOUTES les zones (:680, :722-723, :753, :1308, :1383) ; BOEnrolement filtre « ma zone » côté client ; BOCarteActeurs.tsx:172 géocode chez nominatim.

## 3. Constats détaillés

**[GESTZONE-01] [P1] (05/10→19/10 VALABLE, = C-11)** Liste d'acteurs non filtrée par zone — users.service.ts:195-238 sans prédicat zone_id pour gestionnaire_zone : le GZ reçoit TOUS les acteurs nationaux (téléphones, statuts, zones). Contrat fondamental rompu.

**[GESTZONE-02] [P1] (VALABLE)** IDOR trans-zone — users.controller.ts:240-256 : le GZ est isAdmin, seul l'identificateur a memeZone ; /users/by-phone/:phone = annuaire national énumérable ; /:id/historique idem.

**[GESTZONE-03] [P1] (VALABLE)** Écritures trans-zone — POST/PATCH/DELETE /zones via jeton ADMIN (zones.controller.ts:36-63 + roles.guard.ts:5) ; PATCH /marches/:id sans vérification m.zone_id (marches.controller.ts:138-140) ; DELETE /marches 'ADMIN' (:164). Garde UI-only.

**[GESTZONE-04] [P1] (VALABLE, = C-11 — preuve complète)** GET /zones expose le CA de TOUTES les zones — zones.service.ts:21-56 : sous-requête `SUM(ct.montant) ... WHERE u2.zone_id = z.id AND ct.type='vente'` renvoyée en `volumeTotal` par zone, accessible au GZ (et même à l'identificateur) ; BOZones.tsx:680/:753/:1383 l'affiche et le totalise ; complété par les KPI nationaux de /dashboard/stats (:200-201).

**[GESTZONE-05] [P1] (VALABLE)** Fail-open si zoneId nul — transactions-rest.controller.ts:255-257 et user-flags.controller.ts (~:32) : compte GZ sans zone = vue NATIONALE silencieuse. (Seule la création de comptes BO est fail-closed.)

**[GESTZONE-06] [P1] (VALABLE)** Matrice divergente + permissions mortes — DEFAUTS_PAR_ROLE.gestionnaire_zone porte enrolement.validate + missions.read ; PATCH /identifications/:id exclut le GZ (:485-488) ; POST /auth/create-acteur décoré pour GZ mais refusé en service (rolesCreablesPar → []). Droits affichés ≠ droits réels.

**[GESTZONE-07] [P2] (VALABLE)** GET /marches PUBLIC — marches.controller.ts:23/:32 sans garde : lisible sans token (taxonomie + zones d'implantation).

**[GESTZONE-08] [P2] (VALABLE)** KPI et audit nationaux — /dashboard/stats GZ (:200-201) ; GET /audit sans filtre zone (audit-rest:30) et POST /audit forgeable (:31).

**[GESTZONE-09] [P2] (VALABLE)** Décision de mutation trans-zone — mutations.controller.ts:113-115 : un GZ peut approuver une mutation VERS une autre zone sans implication du gestionnaire cible ; traçabilité correcte (motif ≥10 car., atomique).

**[GESTZONE-10] [P2] (VALABLE, détail aggravé)** WS non scopé — events.gateway.ts:62 : le GZ rejoint la room « admin » (liste contenant le fantôme 'admin', sans admin_general, avec operateur_terrain EN DOUBLE) ; :95-98 diffuse transaction:created en room « all ». GET /supervision sans @Roles (misc-rest:20-23).

**[GESTZONE-11] [P2] (VALABLE)** Routes BO sans garde de permission — routes.tsx:198-231 + BORoot.tsx:17-24 ; filtres zone client-only ; écran Enrôlement du GZ fonctionnellement vide (GET /identifications sans GZ).

**[GESTZONE-12] [P3] (VALABLE)** A11y — UniversalModalBO.tsx:162 Fermer 32×32 px ; hex (BOZones 47, BOSupervision 24) ; universal/* restent sur Radix (:4-6).

**[GESTZONE-13] [P3] (VALABLE)** Scope identifications incohérent + géocodage tiers — geo national (:36-44), liste sans GZ (:92-97), PATCH interdit ; BOCarteActeurs.tsx:172 envoie les adresses chez nominatim.openstreetmap.org.

## 4. Risques et vulnérabilités

| ID | Risque | Criticité | Statut |
|---|---|---|---|
| GESTZONE-01/02 | Liste nationale + IDOR (PII) | P1 | Valable |
| GESTZONE-03 | Écritures zones/marches trans-zone | P1 | Valable |
| GESTZONE-04/C-11 | volumeTotal (CA caisse) de toutes les zones, AFFICHÉ | P1 | Valable |
| GESTZONE-05 | Vue nationale si zoneId nul | P1 | Valable |
| GESTZONE-06 | Droits affichés ≠ droits serveur | P1 | Valable |
| GESTZONE-07/08/09/10 | /marches public, KPI+audit nationaux, mutations, WS | P2 | Valable |
| GESTZONE-11/12/13 | URL directe, 32 px/hex, géocodage tiers | P2/P3 | Valable |

## 5. Points forts

- **Fail-closed de classe** : RolesGuard (roles.guard.ts:26-33) ; JwtStrategy recharge l'utilisateur en base à chaque requête (suspension immédiate).
- **Création de comptes BO strictement zonée** (backoffice-users.service.ts : jamais d'admin, jamais hors zone, comptes inertes, audit) — la seule zone-scope qui tient.
- **Filtres zone corrects là où ils existent** : /users/duplicates (users.controller.ts:96-107), /transactions/all|geo (:166/:198), user-flags (bémol fail-open).
- **PATCH /users/:id fermé au GZ** (users.controller.ts:263) — resserrement réel.
- **Fix 4e8c8f0 propre** : /zones ne plantent plus (cast uuid), sans élargir les droits.
- **Mutations traçables** (motif rejet ≥10 car., atomique) et **a11y universal/*BO saine** (Radix, focus trap).
- **Gating Dev correct** : ProfileSwitcher derrière `import.meta.env.DEV` (BOLayout.tsx:1448-1449).

## 6. Recommandations de correction

- GESTZONE-01/02 : injecter requesterZoneId dans buildActeursListWhereClause (`AND u.zone_id = $zone`, fail-closed si nulle) + helper verifierMemeZone sur /users/:id, /by-phone, /:id/historique.
- GESTZONE-03 : @Roles('super_admin','admin_general') sur les écritures /zones et DELETE /marches ; PATCH /marches/:id : `AND z.gestionnaire_id = user.id`.
- GESTZONE-04/C-11 : filtrer GET /zones par `z.gestionnaire_id = user.id` (ou retirer volumeTotal aux rôles territoriaux) ; scoper /dashboard/stats.
- GESTZONE-05 : `if (role==='gestionnaire_zone' && !zoneId) throw Forbidden` (transactions, user-flags, doublons).
- GESTZONE-07/08 : auth sur GET /marches (ou contrat public documenté) ; scope /audit ; fermer POST /audit.
- GESTZONE-09 : décision bornée à zoneActuelle OU zoneDemandée == user.zoneId.
- GESTZONE-10 : rooms WS admin:zone:<id> ; @Roles sur /supervision ; purger la liste WS.
- GESTZONE-11/12/13 : PermissionGate, Fermer 44 px, proxifier le géocodage.
- **Infra** : seeder un compte démo gestionnaire_zone zoné.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | login BO gestionnaire_zone | Entrée OK, menu sans zones.write |
| Listes | GET /users, /users/:id, /by-phone | Uniquement sa zone (actuellement national) |
| Zones | GET/POST/PATCH/DELETE /zones | Lecture sa zone ; écritures refusées |
| Argent | volumeTotal /zones, /dashboard/stats | Aucun chiffre hors zone (C-11) |
| Fail-closed | compte GZ sans zoneId | 403 partout, jamais vue nationale |
| Mutations | PATCH /:id/decision zone tierce | 403 |
| WS | socket GZ | Évènements de sa zone seulement |
| Audit | GET+POST /audit | Logs de sa zone ; écriture refusée |
| Écrans | BOEnrolement, BOZones | Données serveur = données affichées |
| A11y | modales/table | ≥44 px, focus trap, ESC |

## 8. Tests critiques recommandés

1. GZ de zone A → GET /users : aucun acteur de zone B (API + invariant CI).
2. GZ → /users/<id zone B>, /by-phone/:phone, /:id/historique → 403/404 sans fuite.
3. GZ → POST/PATCH/DELETE /zones et PATCH/DELETE /marches hors zone → 403.
4. GZ sans zoneId → toutes les listes 403 (jamais vue nationale).
5. GZ → GET /zones et /dashboard/stats : aucun volumeTotal/KPI hors zone (régression C-11).
6. GZ → PATCH /mutations/:id/decision d'une mutation vers zone B → 403.
7. GET /marches anonyme → 401 après garde.
8. Seed : un compte GZ zoné existe et se connecte (fin du blocage recette).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | Zone-scope serveur GET /users + lectures unitaires (01/02) | M |
| P1 | Fail-closed zoneId nul (05) | S |
| P1 | Restreindre écritures zones/marches (03) | S |
| P1 | Filtrer GET /zones + dashboard/stats (04/C-11) | S |
| P1 | Unifier la matrice de permissions + garde CI (06) | M |
| P2 | Auth /marches ; scope /audit, WS, /supervision (07/08/10) | M |
| P2 | Mutations bornées à la zone (09) | S |
| P2 | PermissionGate + cibles 44 px (11/12) | S |
| P3 | Proxy géocodage + jetons couleurs (13) | S |
| P0 infra | Seeder un GZ zoné de démo (2ᵉ fois) | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité | 68/100 | Socle universal/*BO de qualité ; Fermer 32 px, hex 47+24, aucun test axe |
| Sécurité | 52/100 | Gardes de rôle éprouvés, comptes BO zonés ; mais le contrat central (isolation territoriale) rompu sur listes, lectures, zones, KPI argent, mutations ; fail-open zoneId nul ; /marches public |
| Argent/intégrité | 55/100 | Aucune écriture d'argent (J5) mais visibilité nationale des volumes de caisse (C-11) et POST /audit forgeable |
| Qualité | 63/100 | Fix SQL propre, code commenté ; 3 matrices divergentes, permissions mortes, écran Enrôlement vide |
| **Global** | **58/100** | Sous le seuil de confort — les 6 P1 du 05/10 sont TOUS reconduits sans exception |

## 11. Conclusion + statut

Deuxième vague, même tableau : **la promesse d'isolation territoriale n'est toujours pas tenue côté serveur**. Aucun des six P1 du 05/10 n'a bougé — la seule modification du périmètre (`4e8c8f0`) répare un crash SQL, pas une autorisation — et le C-11 comptable se vérifie ligne à ligne : `SUM(ct.montant)` de toutes les zones renvoyé et AFFICHÉ (BOZones.tsx:1383) à un rôle censé ne voir que la sienne, complété par les KPI nationaux de /dashboard/stats et un journal d'audit sans filtre. Deux nuances positives : PATCH /users/:id fermé au GZ (users.controller.ts:263) et coquilles tickets/escrow supprimées. La recette runtime reste bloquée par l'absence de compte GZ dans le seed (P0 infra reconduit). Ce rôle ne doit PAS recevoir de comptes réels tant que GESTZONE-01/02/03/05 ne sont pas corrigés.

**Statut : NON CONFORME pour l'attribution de comptes réels — 13 constats reconduits (6 P1), 1 resserré (PATCH users). Aucune modification de code effectuée.**
