# Audit BO lot A : acteurs et terrain (lecture seule)

Branche `claude/clever-allen-dnr8by`. Aucun fichier du dépôt n'a été modifié. Les sondes sont dans `scratchpad/bo-a/`.
Chemins front relatifs à `frontend_src/src/app/`, chemins back relatifs à `backend/src/`.

## 1. Synthèse

| Élément | Statut | Preuve courte | Prochaine action |
|---|---|---|---|
| BODashboard | 🟡 | Le rendu applique BO-01/03 et les tests passent. En revanche la couche API fabrique encore des zéros « lus » : `boDashboardStats` (backoffice-api.ts:415-417), `boGetTransactions` (:645-650), `fetchRoleCounts` (:509), et côté serveur `admin.service.ts:99-104`. Reproduit par sonde. | Faire lever l'erreur au lieu de renvoyer 0 (front et back) |
| BOActeurs | 🟡 | La liste est réelle (GET /users). Pagination fausse : 20 par page à l'écran contre 50 par lecture. La recherche ne porte que sur la page chargée. Le reset mot de passe SEC-10 est toujours branché. L'option « Supprimer » s'affiche sans permission. | Aligner la pagination, chercher côté serveur, retirer le reset |
| BOActeurDetail | 🟡 | « Acteur introuvable » dès que l'acteur n'est pas sur la page courante du contexte. SEC-08b toujours présent. « Forcer la validation » contourne la validation super_admin. « Supprimer » est une coquille. | Lire par `boGetActeur(id)`, retirer le reset, bloquer `en_attente_validation` |
| NouvelActeurPage | ✅ | Simple enveloppe de FicheIdentificationDynamiqueBO (NouvelActeurPage.tsx:17-23) | — |
| FicheIdentificationDynamiqueBO | 🟡 | Soumission réelle `POST /users/backoffice/create`, cloisonnée par zone. operateur_terrain reçoit 403. Dépend de GET /zones (probablement cassé). Le mot de passe initial est affiché en clair. | Voir BOZones et SEC-10 |
| BOEnrolement | 🟠 | La boucle « complément » est cassée (`complement_requis` contre `complement`). La relance affiche un faux succès alors que la route est absente. gestionnaire_zone voit une liste vide. Seuls 50 dossiers sont chargés. | Unifier le statut, retirer le faux toast, paginer |
| BOSupervision | 🟡 | Changer la période ne relance pas la lecture. Une panne s'affiche comme « 0 transaction ». Les actions sont alignées sur les rôles. | Ajouter `periodPreset` aux dépendances, propager l'erreur |
| BOSupervisionMap | ✅ | Contenu échappé (BOSupervisionMap.tsx:78), erreurs toastées (:171,301) | — |
| BOZones | ❌ (probable) | `GET /zones` : `stocks.zone_id` (varchar) = `zones.id` (uuid) (zones.service.ts:47). DELETE : `users.zone_id = $1::uuid` (:184). La description saisie est perdue. | Exécuter sur une base jetable pour confirmer, caster |
| BOZonesMap | ✅ | Présentation pure, contenu échappé (BOZonesMap.tsx:20,179) | Dépend des zones |
| UniversalCardBOZone | ✅ | Présentation pure, aucun appel réseau | — |
| BOCarteActeurs | 🔴 | XSS stocké : `acteur_nom` est injecté non échappé dans une popup Leaflet (BOCarteActeurs.tsx:133). Le KPI « Total acteurs » plafonne à 100. Les coopérateurs ne s'affichent jamais. | Échapper le HTML, compter côté serveur |
| CIVLocationPicker | ⏳ | `CIVLocationPicker` et `CIVPhoneInput` ne sont importés nulle part. Seul `FilterableSelect` sert, dans BOZones.tsx:32 | Supprimer le code mort |
| BOMissions | ❌ | Plante dès qu'une mission existe : `TYPE_CONFIG[mission.type].icon` alors que le backend n'a pas de colonne `type` (BOMissions.tsx:273-275, mission.entity.ts). Lecture réservée au super_admin, à cause du `'admin'` minuscule (missions.controller.ts:15). | Revoir le modèle ou masquer l'écran (hors pilote ?) |
| BOMutations | ✅/🟡 | Lecture et décision réelles, réaffectation transactionnelle (invariant PASS). Erreurs silencieuses. Aucun contrôle de zone pour gestionnaire_zone. | Afficher les erreurs |
| BOModeration | 🟡 | Les signalements fonctionnent. La validation d'un marché échoue sans rien dire si `!res.ok`. Le KPI « Traités » vaut toujours 0. « Bannir » ne coupe pas les sessions. | — |
| SignalementModal | ✅ | DTO aligné (create-user-flag.dto.ts, enum FlagType) | — |

## 2. Constats transversaux

### T1. Les faux zéros de BO-01/BO-03 persistent sous la couche d'affichage 🟠

- `etatLectureBO.test.mts` et `etatSectionsBO.test.mts` passent tous les deux (lancés seuls). La règle de rendu est donc correcte.
- Mais `refreshStats` et `refreshTransactions` (BackOfficeContext.tsx:345-359, 443-466) marquent la lecture `lue` dès que l'appel API ne lève pas d'erreur. Or l'API avale l'erreur et rend 0 :
  - `boDashboardStats` : `catch { return { total_acteurs: 0, … } }` (backoffice-api.ts:415-417). Les champs absents deviennent aussi 0 via `|| 0` (:403-412).
  - `boGetTransactions` : `if (!res.ok) return { data: [], total: 0 }` et `catch` → idem (:645-650).
  - `fetchRoleCounts` : `if (!res.ok) return DEFAULT_ROLE_COUNTS` (:509). Ce sont les compteurs des onglets de BOActeurs.
  - Côté serveur : `AdminService.getStats` rend 200 avec des zéros sur exception (admin.service.ts:99-104), et `activeUsers .catch(() => [{cnt:0}])` (:86).
- **Reproduit** (`scratchpad/bo-a/sonde-fauxzero.mts`, fetch → 500) :
  ```
  KPI totalActeurs = {"type":"nombre","valeur":0}
  KPI volumeTotal  = {"type":"nombre","valeur":0}
  KPI transactions = {"type":"nombre","valeur":0}
  ```
- Seul BODashboard lit `lectures.*`. Aucun autre écran du lot ne le fait (vérifié par grep `lectures\.`). Sur BOEnrolement, BOMissions, BOZones, BOMutations et BOModeration, une panne s'affiche donc comme une liste vide et des KPI à 0.

### T2. Aucun cloisonnement par zone pour gestionnaire_zone / operateur_terrain (sauf exceptions) 🔴

Le cloisonnement serveur n'existe que pour **gestionnaire_zone**, et à 5 endroits seulement :
- `GET /users/flags` (user-flags.controller.ts:28-30) ;
- `GET /users/duplicates` (users.controller.ts:100-102) ;
- les routes transactions `all`, `geo-aggregation` et `by-acteur-geo` (transactions-rest.controller.ts:255-259) ;
- la création `POST /users/backoffice/create` (backoffice-users.service.ts, l. 120-138 du fichier).

**operateur_terrain n'est cloisonné nulle part.**

Routes sans aucun cloisonnement :
- `GET /users` (users.service.ts:192-256, aucune clause de zone) ;
- `GET /users/counts-by-role` ;
- `GET /users/:id` ;
- `DELETE /users/:id` ;
- `PATCH /mutations/:id/decision` : un gestionnaire_zone décide pour n'importe quelle zone ;
- les écritures sur zones et marchés (`@Roles('ADMIN')`, ouvertes aussi à operateur_terrain).

### T3. `DELETE /users/:id` ouvert aux 5 rôles BO 🔴

- `@Roles('ADMIN')` (users.controller.ts:457-462) : operateur_terrain et gestionnaire_zone peuvent archiver n'importe quel compte, y compris admin_general ou super_admin (via l'API directe).
- `usersService.remove` (users.service.ts:344-346) ne fait ni vérification du rôle cible, ni audit, ni contrôle de zone.
- Côté front, l'option « Supprimer » de BOActeurs n'est conditionnée par aucune permission (BOActeurs.tsx:725-742), alors que `acteurs.delete` n'existe que pour admin_general (BackOfficeContext.tsx:206).
- Effet réel : `deletedAt` est posé, donc `findOne` exclut le compte (`@DeleteDateColumn`, user.entity.ts:261). La connexion et le JWT tombent.

### T4. Élévation de privilège par PATCH utilisateur 🔴

- **`PATCH /acteurs/:id`** (acteurs-rest.controller.ts:40-58, ouvert à `super_admin` et `admin_general`) fonctionne par **liste noire** : seuls 7 champs sont protégés (`PROTECTED_FIELDS`, l. 42). Un admin_general peut donc écrire sur n'importe quel compte, y compris un super_admin :
  - `webauthnCredentials` et `webauthnChallenge`,
  - `boPermissions`, `phone`, `lockedUntil`, `deletedAt`…
  - Le BO accepte la connexion WebAuthn (`boWebAuthnAuthenticateOptions`, backoffice-api.ts:174). Injecter sa propre clé publique sur le compte super_admin permettrait donc de s'y connecter. Ce n'est pas exécuté ; c'est déduit du code, **à confirmer**.
- **`PATCH /users/:id`** pour admin_general et admin_national (users.controller.ts:293) accepte `status`, `boPermissions`, `phone` et `zoneId` sur **n'importe quel** compte :
  - aucun contrôle du rôle cible, sauf pour `role` ;
  - `boPermissions` contourne la route `PATCH /users/:id/bo-permissions`, réservée au super_admin et dotée d'une liste blanche (:394-454) ;
  - `status` permet de passer `en_attente_validation` à `actif`, ce qui contourne `POST /users/admin/:id/validate` (super_admin seul). Voir BOActeurDetail.

### T5. Auto-validation d'un dossier par l'identificateur 🔴

- `PATCH /identifications/:id` (identifications.controller.ts:485-497) : un non-admin propriétaire du dossier peut écrire `statut`, qui figure dans `allowedFields`. Un identificateur peut donc passer son propre dossier à `approuve`.
- Conséquences : le SMS « dossier validé » part (:520-565), et le dossier est compté dans les scores (scores.service.ts:442).
- Le même schéma existe sur `PATCH /dossiers/:id` (dossiers-rest.controller.ts:52-77). Cette route n'est appelée par **aucun** écran (calls.tsv), mais elle met en plus `users.validated = true` (:66-74). C'est une surface morte mais active.

### T6. Appels `fetch()` directs sans jeton BO

- Tous les `fetch` directs du lot n'envoient que `credentials:'include'` : BOActeurs:460, BOActeurDetail:390, BOEnrolement:903, BOZones:292/363, BOCarteActeurs:79-81/198, BOMutations:71/342, BOModeration:132/154/172, FicheIdentificationDynamiqueBO (12 appels), ainsi que `loadUser` `/auth/me` (BackOfficeContext.tsx:284).
- Le filet `main.tsx:46-61` lit `localStorage['julaba_access_token']`, alors que le login BO range son jeton dans `sessionStorage['julaba:bo:access-token']` (backoffice-api.ts:14-23, :157). **Le filet ne couvre donc pas le BO.**
- Le BO dépend entièrement du cookie `bo_access_token`. C'est déjà compté dans API-10 et API-07 (REGISTRE-MAITRE.md:550), mais le fait que le filet ne s'applique pas au BO mérite d'être écrit.

## 3. Détail par écran

### BODashboard 🟡

- Câblage : il lit uniquement le contexte (`acteurs`, `transactions`, `dossiers`, `zones`, `missions`) et `useRealtime` (`/admin/stats`, `/admin/activity`, `/admin/health`, `/admin/timeline`, admin.controller.ts:13-23, `@Roles('ADMIN')`).
- Ce que BO-01/03 a bien réglé :
  - les 7 KPI (`kpisTableauDeBord`) ;
  - les sections croissance, régions, répartition et identificateurs (`sectionDe`) ;
  - les alertes (`alertesBO`) et les objectifs.
- Ce qui reste :
  1. T1 : faux zéros produits en amont (prouvé).
  2. **Graphiques calculés sur un échantillon** : croissance mensuelle, régions, répartition par type et top identificateurs sont calculés sur `acteurs` = page 1, limite 50 (BackOfficeContext.tsx:388) et `transactions` = 50 (:447). Ils sont présentés comme des totaux nationaux (BODashboard.tsx:191-325).
  3. `taux: 0` est codé en dur dans le top identificateurs (BODashboard.tsx:324).
  4. Le ticker affiche « Aucune transaction / 0 » sur panne (:300-311), sans passer par les lectures.
  5. Le badge Missions filtre `statut === 'en_cours'` (:352), une valeur que ni le front (`active`) ni le back (`en_attente`) n'emploient.
  6. Côté serveur, `montant_total` = `SUM(wallet_transactions.montant)`, tous types et signes confondus, plus les ventes caisse (admin.service.ts:65-67, 94). Cela mélange Keiwa (hors pilote) et caisse. `total_transactions` = wallet **du jour** + caisse **depuis toujours** (:91). 🟡 argent affiché.
- Tests : `etatLectureBO.test.mts` et `etatSectionsBO.test.mts` sont ✅ (lancés ce jour).

### BOActeurs 🟡

- Câblage :
  - `boGetActeurs` → `GET /users` (users.controller.ts:42-51, `ADMIN`), SQL réel (users.service.ts:66-130). Forme `{data, meta.total}` correctement lue (backoffice-api.ts:443-468).
  - Compteurs : `GET /users/counts-by-role`.
  - `boGetDuplicates` → `/users/duplicates` : operateur_terrain reçoit 403, avalé (BOActeurs.tsx:315).
  - `boGetUserFlags` → `/users/flags`.
- Cassé ou partiel :
  - **Pagination** : `ACTEURS_PAGE_SIZE = 20` (BOActeurs.tsx:77), `totalPages = total/20` (:242), mais le contexte lit 50 par page serveur (BackOfficeContext.tsx:388) et `filtered` affiche les 50 (:1118). Avec 120 acteurs, l'écran annonce 6 pages et les pages 4 à 6 arrivent vides.
  - **Recherche** : `search` local (:80, :203) filtre seulement les 50 chargés. `setActeursSearch` du contexte, qui interroge le serveur, n'est pas utilisé.
  - **Réinitialiser le PIN** : la route `POST /auth/identificateur/:id/reinitialiser-pin` et `/renvoyer-pin` **existe** (auth.controller.ts:699, :763). Le MISSING de calls.tsv est un faux positif, dû au chemin dynamique.
    - L'option est affichée à tout rôle BO (BOActeurs.tsx:644-662), alors que le serveur la réserve à `super_admin` et `admin_general`. Les autres reçoivent 403, affiché comme « La réinitialisation a échoué » générique.
    - Aucun jeton n'est envoyé (T6).
  - **SEC-10 toujours présent** : « Réinitialiser le mot de passe » → `boAdminResetPassword` → `POST /users/:id/admin-reset-password` (backoffice-api.ts:1077-1079 ; users.controller.ts:463-469 ; users.service.ts:485-506 rend `defaultPassword` en clair). Le toast écarte le secret (BOActeurs.tsx:553-554) : le compte se retrouve avec un mot de passe que personne ne connaît. Pour les rôles autres que super_admin, la route répond 403.
  - Suspendre et réactiver → `PATCH /users/:id {status, suspension_reason}`. `suspension_reason` est ignoré (absent d'ALLOWED_FIELDS, users.controller.ts:293). gestionnaire_zone et operateur_terrain ont `acteurs.suspend`/`write` côté front (BackOfficeContext.tsx:208-209) mais reçoivent 403 (users.controller.ts:264).
  - « Supprimer » : voir T3.

### BOActeurDetail 🟡

- L'acteur est cherché dans `acteurs.find(a => a.id === id)` (BOActeurDetail.tsx:89), c'est-à-dire les 50 de la page et du filtre courants du contexte.
  - Un lien direct, un acteur de la page 2, ou une ouverture avant chargement affiche « Acteur introuvable » (:250-255), sans état de chargement.
  - `boGetActeur(id)` existe (backoffice-api.ts:534) mais n'est jamais appelé (grep).
- Onglet transactions : calculé sur les 50 transactions du contexte (:130-133).
- **SEC-08b toujours présent** :
  - `POST /auth/reset-user-password {userId,newPassword}` (BOActeurDetail.tsx:390 ; auth.controller.ts:466-493, `@Roles('super_admin','admin')`). `admin` n'existe pas, donc admin_general reçoit 403.
  - Le mot de passe est généré par `Math.random` (BOActeurDetail.tsx:353-360) puis affiché pour copie (:416-419).
  - Aucune révocation des sessions.
- **« Forcer la validation »** est proposé si `statut === 'en_attente' || 'en_attente_validation'` et `enrolement.validate` (:561). Il appelle `updateActeurStatut(id,'actif')` → `PATCH /users/:id {status:'actif'}`, accepté pour admin_general et admin_national (users.controller.ts:293). Un compte admin en attente de validation super_admin (`EN_ATTENTE_VALIDATION`, user.entity.ts:36) peut donc être activé sans le super_admin. 🔴
- « Supprimer » est une coquille : un toast « Disponible en Phase 4F-3 » plus une écriture d'audit `SUPPRESSION: ATTEMPT_PLACEHOLDER` (:236-248).
- Fonctionnent :
  - le sous-profil marchand (`PATCH /users/:id/sous-profil`, admins nationaux) ;
  - l'objectif et la prime (`PATCH /users/:id`) ;
  - le changement de type (super_admin seul côté serveur).
- `boGetUserFlags` n'a pas de `catch` (:117-124) : rejet non géré si 403.

### NouvelActeurPage ✅ / FicheIdentificationDynamiqueBO 🟡

- Soumission (création) : `boCreateBackofficeUser` → `POST /users/backoffice/create` (users.controller.ts:169-183, rôles `super_admin`, `admin_general`, `admin_national`, `gestionnaire_zone`).
  - Les règles du créateur et le bornage de zone sont faits côté serveur (backoffice-users.service.ts:78-138).
  - operateur_terrain (front `acteurs.write`) reçoit 403.
- Le résultat `defaultPassword` est affiché (FicheIdentificationDynamiqueBO.tsx:2163, 2295). C'est la famille SEC-10, hors périmètre nommé : `backoffice-users.service.ts:416`.
- `activationCode` est affiché pour les acteurs métier : c'est le modèle P0.0, conforme.
- Mode « complément » (:2002-2140) : jamais atteint depuis le BO. `FicheActeurDetailModal.tsx:407-417` envoie vers `/identificateur/...` et seulement si `statut === 'complement'` (voir BOEnrolement).
- Contrôle du PIN identificateur désactivé (`skipPinCheck = true`, :1092). C'est voulu en BO.
- Référentiels :
  - `/admin-divisions/*` est public (admin-divisions.controller.ts, sans garde), alimenté par seed, ce qui est acceptable ;
  - `POST /admin-divisions/reverse-geocode` est un **relais Nominatim non authentifié** (admin-divisions.service.ts:51), seulement limité par le throttle global. 🟡
- Des listes en dur coexistent avec l'API : `FILIERES`, `COMMUNES_CI`, `REGIONS_CI` (:342-390).
- `GET /oneci/lookup/:nni` (oneci.controller.ts:8, **JwtAuthGuard seul**) : tout compte connecté, y compris un marchand, peut interroger le registre national (RNPP) et consommer le quota. En sandbox, la réponse est `found:true` avec des champs nuls (oneci.service.ts:31). 🔴 données personnelles.
- `/zones` (:3538) est nécessaire au choix de zone : voir BOZones.

### BOEnrolement 🟠

- Câblage :
  - `refreshDossiers` → `GET /identifications?page=1&limit=50` (backoffice-api.ts:996-1010). Le SQL est réel (identifications.controller.ts:91-123).
  - Décisions : `updateDossierStatut` → `PATCH /identifications/:id {statut, motif_rejet}`.
- Cassé :
  - **Boucle complément** : le BO envoie `complement_requis` (BOEnrolement.tsx:985), mais :
    - le serveur n'envoie le SMS que pour `complement` (identifications.controller.ts:567) ;
    - le bouton « Compléter » côté identificateur exige `complement` (FicheActeurDetailModal.tsx:407) ;
    - la liste des acteurs BO et les statistiques ne retiennent que `complement` (users.service.ts:205 ; admin.service.ts:39). L'acteur **disparaît** donc de BOActeurs.
    - `complement_requis` n'est géré nulle part ailleurs (grep).
  - **Relance identificateur** : `POST /notifications/relancer-identificateur` n'existe pas (grep backend vide). Sur échec, le code affiche quand même « Notification envoyée… (à implémenter côté backend) » (BOEnrolement.tsx:917). Faux succès.
  - **gestionnaire_zone** :
    - absent de `isAdmin` (identifications.controller.ts:96), il voit donc la branche identificateur `WHERE identificateur_id = moi` : liste vide (lue comme vide) ;
    - `PATCH` lui renvoie 403 (:488-491) malgré `enrolement.validate`.
  - Seuls les **50 dossiers les plus récents**, brouillons compris, sont chargés ; les KPI d'onglet sont calculés dessus (:370-380).
  - Les erreurs sont invisibles : `refreshDossiers` avale l'erreur (BackOfficeContext.tsx:474-482) et le `.catch` de l'écran (:318-321) ne se déclenche jamais.
  - `date_validation` n'existe pas (table identifications, BaselineSchema.ts:470-491). L'écran affiche « Non renseigné » (:1378).
- Fonctionnent :
  - valider et rejeter (motif obligatoire côté serveur) pour super_admin, admin_general, admin_national et operateur_terrain ;
  - suppression d'un brouillon (`DELETE /identifications/:id`, super_admin) ;
  - onglet admins en attente, super_admin seul (BOEnrolement.tsx:231).
- La validation ne fait **aucun audit** (PATCH, :485-578). Voir aussi T5.

### BOSupervision 🟡 / BOSupervisionMap ✅

- `GET /transactions/all` est cloisonné pour gestionnaire_zone. Les actions `geler`, `annuler` et `litige` sont réservées à `super_admin`, `admin_general` et `admin_national`, aligné entre front (BOSupervision.tsx:505) et back (transactions-rest.controller.ts:71-125, avec audit dans la transaction).
- Annuler restitue le stock : c'est le **périmètre caisse RC1, non audité ici**.
- Bug : l'effet de chargement dépend de `[currentPage, filterRegion, filterStatut, itemsPerPage, reloadTick]` (:367), sans `periodPreset` ni dates personnalisées. Passer de « Aujourd'hui » à « 7 jours » sur la page 1 ne relance **pas** la requête : l’effet de la ligne :389 remet la page à 1 sans la changer.
- Une panne donne `{data:[], total:0}` (T1). Le toast d’erreur (:358) est inatteignable.
- La carte positionne par centre de région (`getRegionCenter`) et échappe le HTML. ✅

### BOZones ❌ (probable) / BOZonesMap ✅ / UniversalCardBOZone ✅

- `GET /zones` → `getZonesWithStats` (zones.service.ts:21-56) contient `LEFT JOIN stocks s ON s.zone_id = z.id`.
  - `stocks.zone_id` est `character varying` (BaselineSchema.ts, table stocks ; stock.entity.ts:9) et `zones.id` est `uuid`.
  - PostgreSQL n'a pas d'opérateur `varchar = uuid`, d'où l'erreur attendue `operator does not exist`. **Non exécuté** : base 55432 interdite, et instance jetable impossible (`/tmp/claude-0` en 700 root). **À confirmer.**
  - Si c'est confirmé, sont cassés : BOZones, le KPI zones du dashboard, BOCarteActeurs (le `Promise.all` échoue entièrement, :78-85), le choix de zone dans la fiche, et l'app identificateur.
- Même famille sur `deleteZone` : `users WHERE zone_id = $1::uuid` (:184), alors que `users.zone_id` est varchar.
- Même si le type était bon, `SUM(s.quantite)` est multiplié par la jointure users × caisse_transactions : `stockTotal` serait gonflé.
- `description` est envoyée à la création et à l'édition (BOZones.tsx:1004, :1026) mais ignorée par le service (:96-129, :143-175).
- Les écritures zones et marchés sont en `@Roles('ADMIN')`, donc ouvertes aussi à gestionnaire_zone et operateur_terrain (zones.controller.ts:35-63 ; marches.controller.ts:131-166), alors que le front réserve `zones.write` à admin_general et admin_national.
- `GET /marches` est **public**, sans garde (marches.controller.ts:32). `POST /marches/suggestion` est ouvert à tout compte connecté.
- BOZonesMap (GeoJSON statique, échappé) et UniversalCardBOZone (présentation) n'appellent pas le réseau.

### BOCarteActeurs 🔴

- **XSS stocké dans le BO** : `bindPopup` reçoit une chaîne contenant `${p.acteur_nom}` non échappé (BOCarteActeurs.tsx:130-140). Leaflet fait `innerHTML = content` (node_modules/leaflet/dist/leaflet-src.js:10034).
  - Source : `GET /identifications/geo`, sans filtre de statut, donc brouillons inclus (identifications.controller.ts:46-88).
  - Écriture possible par **tout compte connecté**, marchand compris : `POST /identifications/draft` (:182-241) accepte `acteurNom`, `typeActeur`, `latitude` et `longitude` librement.
  - Le jeton BO est en sessionStorage, lisible par le script.
  - La CSP helmet ne s'applique qu'aux réponses de l'API (main.ts:197). La CSP du frontal est **À DÉFINIR**.
  - Les autres cartes échappent (BOSupervisionMap.tsx:78, BOZonesMap.tsx:20).
- « Total acteurs » = `GET /identifications?limit=100`, plafonné à 100 par `parsePagination` (paginate.ts). « Sans GPS » et « Récents » sont calculés sur ces 100.
- `type_acteur = 'cooperateur'` (normalisé côté serveur, identifications.controller.ts:308-313), mais les couches attendent `cooperative` (BOCarteActeurs.tsx:64, :126). Les coopérateurs ne s'affichent jamais.
- La géolocalisation manuelle passe par Nominatim directement depuis le navigateur, puis `PATCH /identifications/:id`. gestionnaire_zone reçoit 403.

### CIVLocationPicker ⏳

- `export function CIVLocationPicker` (:152) et `CIVPhoneInput` (:259) ne sont importés par aucun fichier (grep).
- Seul `FilterableSelect` est utilisé (BOZones.tsx:32). Les données sont statiques (`data/civ-geography`).

### BOMissions ❌

- Lecture : `GET /missions` est en `@Roles('super_admin','admin','institution')` (missions.controller.ts:15). admin_general, admin_national, gestionnaire_zone et operateur_terrain reçoivent donc 403, et voient une liste vide avec des KPI à 0.
- Création : super_admin seul (:23), alors que `missions.write` est accordé à admin_general et admin_national.
- **Modèle incompatible** :
  - le front attend `type, cible, objectif, realise, dateDebut, dateFin, region, points, participantsCount` et des statuts `active|terminee|echouee|draft` (BOMissions.tsx:14-28) ;
  - la table n'a que `titre, description, assignee_id, zone_id, statut('en_attente'), priorite, date_echeance` (mission.entity.ts ; BaselineSchema.ts:530-541) ;
  - la création filtre sur `CHAMPS` (missions.controller.ts:25) puis `repo.create` jette les colonnes inconnues. Une mission créée ne garde que le titre et la description.
- **Plantage** : `TYPE_CONFIG[mission.type]` vaut `undefined`, donc `typeConf.icon` lève une TypeError (BOMissions.tsx:273-275) dès la première mission rendue. Avec `statut = 'en_attente'`, `statutConf` est aussi `undefined`.
- Le cas est **atteignable** : toute mutation approuvée par un super_admin insère une mission sans `type` (mutations.controller.ts:186-196). L'erreur est rattrapée par `errorElement`, donc ErrorFallback à l'écran (routes.tsx:190).
- Le classement attend `rang` et `pts` (:218-227), qu'aucune source ne fournit.
- Les missions sont hors périmètre pilote ? → À DÉFINIR.

### BOMutations ✅/🟡

- `GET /mutations` (admins : toutes ; sinon les siennes) et `PATCH /mutations/:id/decision` : statut et `users.zone_id` mis à jour dans une seule transaction (mutations.controller.ts:113-200). Invariant `mutation-zone-reaffectation.spec.ts` **PASS** (inv.log:213).
- Les champs snake_case sont lus tels quels (BOMutations.tsx:20-33). C'est cohérent.
- `!res.ok` → `return` silencieux (:74) : faux vide.
- operateur_terrain a `mutations.write` mais reçoit 403.
- Pas de contrôle de zone pour gestionnaire_zone (T2).
- `POST /mutations` est ouvert à tout compte connecté, marchand compris (:71-108). Une approbation changerait sa `zone_id`.

### BOModeration 🟡

- Signalements : `GET /users/flags?resolved=false` puis `PATCH /users/flags/:id/resolve`. Réel, transactionnel, audité (user-flags.service.ts:119-170).
- « Traités » vaut toujours 0, puisque seuls les signalements non résolus sont chargés (BOModeration.tsx:201, :231-235).
- `bannir` met `status = rejete`. Le login le refuse (auth.service.ts:267), mais `jwt.strategy.ts:35-36` ne contrôle que `SUSPENDU` et `EN_ATTENTE_ACTIVATION` : les sessions en cours d'un compte banni restent valides. Même famille qu'AUTH-03.
- gestionnaire_zone et operateur_terrain (`moderation.write`) reçoivent 403 sur resolve.
- Marchés suggérés : `GET /marches?statut=en_attente` puis `PATCH /marches/:id {statut}`. En cas de `!res.ok`, **rien** n'est affiché (:160-163, :178-181). Le marché validé n'a pas de `zone_id`.

### SignalementModal ✅

- `POST /users/flags` : DTO `{userId, flagType ∈ doublon|fraude|abus|autre, raison 1-500, commentaire 10-2000 optionnel}`. Les validations front (:95-103) sont identiques à `create-user-flag.dto.ts`.
- Rôles : `CAN_SIGNAL` (permissions-bo.ts:24-31) correspond à la route POST (user-flags.controller.ts:15). Doublon refusé en 409 et affiché.

## 4. Top problèmes du domaine

**🔴 Sécurité / argent**

1. **XSS stocké dans le BO** via la carte des acteurs. Un marchand peut écrire un brouillon et voler le jeton BO (BOCarteActeurs.tsx:133 ; identifications.controller.ts:182).
2. **Élévation de privilège** par `PATCH /acteurs/:id` en liste noire : `webauthnCredentials`, `boPermissions` et `phone` sont modifiables par admin_general sur un super_admin (acteurs-rest.controller.ts:42).
3. `PATCH /users/:id` : admin_general et admin_national modifient `status`, `boPermissions` et `phone` de tout compte, et activent un admin en attente de validation super_admin. C'est ce que fait « Forcer la validation » de BOActeurDetail (users.controller.ts:293 ; BOActeurDetail.tsx:561).
4. `DELETE /users/:id` ouvert à operateur_terrain et gestionnaire_zone sur tout compte, sans audit (users.controller.ts:457 ; users.service.ts:344). Bouton visible sans permission.
5. **Auto-validation** d'un dossier par l'identificateur (identifications.controller.ts:494 ; dossiers-rest.controller.ts:58-74). Impact sur les scores et `users.validated`.
6. **SEC-08b et SEC-10 toujours présents** (auth.controller.ts:466 ; users.controller.ts:463 ; users.service.ts:505 ; BOActeurDetail.tsx:353-419 ; BOActeurs.tsx:544-562).
7. Aucun cloisonnement par zone pour operateur_terrain, et seulement partiel pour gestionnaire_zone (T2).
8. `GET /oneci/lookup/:nni` ouvert à tout compte connecté (oneci.controller.ts:8).

**🟠 Cassé**

9. `GET /zones` : jointure varchar = uuid, cassé probablement partout (zones.service.ts:47). Idem pour `deleteZone` (:184). À confirmer par exécution.
10. BOMissions plante dès qu'une mission existe, et la lecture est réservée au super_admin.
11. Boucle complément d'enrôlement cassée (`complement_requis`). L'acteur disparaît de la liste BO.
12. Faux zéros encore produits par l'API (T1), prouvés par sonde.
13. Pagination et recherche de BOActeurs fausses ; BOActeurDetail introuvable hors de la page courante.
14. Relance identificateur : faux succès affiché alors que la route est absente.
15. gestionnaire_zone : enrôlement vide et 403 en validation ; changer la période de BOSupervision ne recharge pas.

**🟡 Partiel**

16. Graphiques du dashboard calculés sur 50 lignes ; volume mêlant wallet et caisse.
17. Carte : KPI plafonnés à 100, coopérateurs invisibles.
18. « Bannir » ne coupe pas les sessions ; relais Nominatim public ; `GET /marches` public.
19. Description de zone perdue ; KPI « Traités » de la modération à 0 ; erreurs silencieuses (BOMutations, BOModeration).
20. Code mort : `CIVLocationPicker`, `CIVPhoneInput`, `/dossiers`, `boGetActeur`.
21. Tests : aucun test front des écrans du lot. Côté back, seuls `mutation-zone-reaffectation` et `sec-2-pin-identificateur` couvrent le domaine (PASS).

## 5. À DÉFINIR

- **GET /zones en production** : faut-il exécuter `getZonesWithStats` sur une base jetable ? La base 55432 était interdite et aucune instance locale n'a pu être lancée (`/tmp/claude-0` en 700 root). Le schéma de référence (BaselineSchema.ts) donne `stocks.zone_id varchar`. Si la production diffère (colonne uuid), le constat tombe.
- **Déploiement** : le front et l'API sont-ils sur le même site ? Les `fetch` directs du BO, `/auth/me` compris, n'envoient que le cookie. `VITE_API_URL` n'a pas été trouvé dans le dépôt.
- **CSP du frontal** : elle détermine l'exploitabilité réelle du XSS de BOCarteActeurs. Aucune en-tête trouvée dans le dépôt pour le front.
- **WebAuthn** : l'injection d'une clé publique via `PATCH /acteurs/:id` permet-elle vraiment de se connecter en BO ? C'est déduit du code, pas exécuté. Il faut vérifier `boWebAuthnAuthenticateVerify` côté serveur.
- **Missions** et **carte des acteurs** sont-elles dans le périmètre pilote ? Elles ne figurent pas dans la liste hors pilote de GO-PILOTE.
- **gestionnaire_zone** doit-il valider des dossiers ? Le front lui donne `enrolement.validate` ; le serveur le traite comme un identificateur.
- **operateur_terrain** : quelle portée doit-il avoir ? Le front lui donne `acteurs.write`, `acteurs.suspend` et `supervision.freeze` ; le serveur refuse la plupart de ces actions mais lui ouvre `DELETE /users` et l'écriture sur les zones.
