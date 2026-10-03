# Audit lecture seule — ACADEMY · ASSISTANT · MARCHÉ · MARKETPLACE · modules backend restants

Branche `claude/clever-allen-dnr8by`. Aucune modification du dépôt (`git status --porcelain` vide après les sondes).
Sondes : `scratchpad/academy-marche/` — `scan-order.ts` (scanner Nest réel → `route-order.tsv`, 349 routes **montées**, dans l'ordre d'enregistrement Express), `order-shadow.mjs` (routes masquées), `permod.mjs` (routes ↔ appelants front), `shadow*.mjs`.

> **Réserve sur `routes.tsv`** : la colonne `roles=` attribue parfois le `@Roles` d'une méthode voisine. Exemples faux : `GET /academy/questions` (n'a aucun `@Roles`, academy.controller.ts:79-91), `GET /notifications` et `POST /notifications/alertes/check-user` (notifications.controller.ts:43, 211-212). `routes.tsv` contient aussi 11 routes **non montées** (`backend/src/producteur/cycles|recoltes`) : 360 lignes contre 349 routes réellement montées.

---

## 1. Tableau synthèse

| Élément | Statut | Preuve courte | Prochaine action |
|---|---|---|---|
| Academy (app) `UniversalAcademy` | 🟡 | Lit `/academy/questions` et `/academy/my-progress`, mais **n'écrit jamais la progression** (aucun appel `enroll`/`progress`) ; la clé `"ch-le"` ne correspond jamais au `moduleId` UUID (UniversalAcademy.tsx:100, 285-287) | Décider si l'Academy (hors pilote) reste exposée ; sinon brancher `PATCH /academy/modules/:id/progress` |
| Academy backend | 🟡 | 13 routes montées, CRUD cohérent, `GET /academy/stats` ouvert à tout compte connecté (academy.controller.ts:180) ; aucune question en base par défaut (aucun seed) ; seul test = `src/academy/academy.controller.spec.ts`, **jamais exécuté** (jest ne lit que `test/unit` et `test/invariants`) | Déplacer/réécrire le test ; réserver `/stats` au BO |
| `AcademyWidget` + `academyQuestions.ALL_ACADEMY_QUESTIONS` | ⏳ mort | `showAcademyWidget` n'est passé par aucun appelant (RoleDashboard.tsx:880) ; 550 lignes de questions locales non importées | Supprimer ou documenter |
| Assistant `TantieSagesseModal` | 🟡 | Monté dans AppLayout.tsx:143 ; actions métier OK, mais erreurs avalées (`catch (e) { void e; }`, TantieSagesseModal.tsx:167) et navigation `/<rôle>/marche` inexistante pour producteur | Toast d'erreur ; table de routes par rôle |
| `components/marche/marketplace-data.ts` | 🟡 | Tableaux vides + `NOTIFS_MARCHE` (4 notifs inventées, 2026-03) **inutilisé** (marketplace-data.ts:108-163) | Supprimer le mock |
| `components/marche/HistoriqueList.tsx` | ✅ | Alimenté par les commandes réelles du contexte (MarcheVirtuel.tsx:529, 761) | — |
| Marketplace `/marketplace` | ⏳ | Route orpheline (aucun lien, routes.tsx:149) ; lit `/caisse/produits` = catalogue **de la marchande elle-même** ; vide seulement si l'API est sur un autre domaine (voir §2.4) | Supprimer la route ou créer la vraie ressource |
| BO Marketplace (`BOMarketplace`) | ❌ | Modération `PATCH /publications/:id` → **toujours 403** (le back filtre `user_id = admin`, publications-rest.controller.ts:224-230) ; noms vendeurs lus dans des champs qui n'existent pas ; `admin_national` voit le menu mais reçoit 403 → écran vide | Route admin de modération dédiée |
| `components/dev/ProfileSwitcher` | ✅ (non accessible en prod) | Tous les montages sont sous `import.meta.env.DEV` ; `MOCK_BO_USERS = []` | Supprimer `forceShow` / `data/mockUsers.ts` à terme |
| `components/figma/ImageWithFallback` | ✅ | Composant utilitaire vivant (7 importeurs) | Renommer (nom trompeur) |
| `components/shared/*` | ✅ globalement | Tous les fichiers .tsx ont un importeur ; dossier vide `shared/universal/`, 3 .md de doc dans le dossier | Ménage |
| publications-rest | 🟡 | 8 routes ; cloisonnement marché correct ; l'index unique exigé par `ON CONFLICT` n'existe **que** dans DbInitService (db-init.service.ts:719), pas dans les migrations exécutables | Migration formelle |
| commandes-rest | 🔴 | `POST /commandes` accepte **n'importe quel statut** du client, y compris `confirmee`/`livree` (commandes-rest.controller.ts:108-112), alors que le PATCH réserve ces statuts au vendeur (:309-317) | Forcer `en_attente` côté acheteur |
| evaluations-rest | 🔴 | Combiné au point précédent : une fausse commande `livree` vers n'importe quel `vendeur_id` permet de noter n'importe qui, sans limite (evaluations-rest.controller.ts:59-83) | Corriger `POST /commandes` d'abord |
| catalogue-maitre | ✅ | Doctrine PILOTE-3 respectée : aucune colonne prix dans `catalogue_maitre` ; prix > 0 imposé à l'adoption (DTO `PrixDeVenteValide`) | — |
| boutique | ⏳ | 2 routes montées, **0 appelant front** ; 2e grand livre stock/caisse rejoué à part (boutique.service.ts:48-66) | Supprimer ou documenter le « banc vocal » |
| odoo-gateway | ✅ (désactivé) | `/odoo-poc/*` → 404 sauf `ODOO_POC_ENABLED=true` (odoo-poc-enabled.guard.ts:13) ; écriture réelle verrouillée par `ODOO_REAL_WRITE_ENABLED` (odoo-client.config.ts:45) | Si activé : ajouter `@Roles` sur `POST mouvement-stock` |
| oneci | 🔴 | `GET /oneci/lookup/:nni` ouvert à **tout compte connecté** (oneci.controller.ts:5-9) → données d'identité ; renvoie `found: true` même quand ONECI ne renvoie que des erreurs (oneci.service.ts:31-32) | Restreindre aux identificateurs/BO ; ne pas forcer `found` |
| events (WebSocket) | 🔴 | Chaque vente/dépense est diffusée à la salle `all`, c'est-à-dire à tous les utilisateurs connectés (events.gateway.ts:79-81, 95-98 ; appelé à caisse-rest.controller.ts:822, 885) | Diffuser vers `user:<id>` + `admin` seulement |
| partner | ❌ sur base neuve | Table `api_keys` absente des migrations et de DbInit (SCHEMA-05, déjà connue) ; clés stockées et relues **en clair** (partner-api-keys.service.ts:35) ; `rate_limit` jamais appliqué | Déjà dans le registre (SCHEMA-05) |
| misc-rest | 🟡 | 13 routes ; route masquée `GET /transactions` (confirmée par le scanner) ; endpoints factices (`/supervision`, `/demandes`, `/academy/produits`, `/livraison`, `/system/settings`) ; `support_config` créé dans un GET | Supprimer les endpoints factices |
| **Collision `GET /users/flags`** | ❌ **nouveau** | Masquée par `GET /users/:id`, qui est enregistrée avant (scanner Nest : #78 avant #86) → l'écran BO Modération (`boGetUserFlags`) échoue | Déclarer `flags` avant `:id` ou renommer le chemin |
| Collision `GET /admin/health` | 🟡 | Doublon interne à AdminModule ; `AdminController` gagne | Déjà inventorié (INVENTAIRE_RECETTES_V1.md:101) |
| Modules morts | ❌ | `ansut`, `producteur/cycles`, `producteur/recoltes` (controllers jamais montés), `producteur/publications` (importé dans app.module.ts:17 mais absent de `imports`), `escrow` et `tickets` (vides), `SmsService.sendOtp` (jamais appelé) | Purge |

---

## 2. Détail front

### 2.1 Academy — `components/academy/`
- **Câblage**
  - `UniversalAcademy` (routes.tsx:78/97/118/139/167, une route par rôle) fait `GET /academy/my-progress` (UniversalAcademy.tsx:280) → academy.controller.ts:172 ✅.
  - Il fait aussi `GET /academy/questions?role&chapter` (:323) → academy.controller.ts:79 ✅.
  - Authentification par cookie (`credentials:'include'`), acceptée par `cookieOrBearer` (auth/strategies/jwt.strategy.ts:10-25) ✅.
  - Forme de réponse : le front lit `data.questions` et `correctIndex ?? correct_index`, `explication` ; le back renvoie `{questions}` ✅.
- **Progression jamais écrite** : `handleNext` ne met à jour que l'état local (UniversalAcademy.tsx:384-405). Aucun appel à `POST modules/:id/enroll` ni à `PATCH modules/:id/progress`. Au rechargement, tout est perdu.
- **Relecture impossible** : `completedLessons` est rempli à partir de `p.moduleId` (un UUID) (:285-287), puis comparé à `getLessonKey` = `"1-2"` (:100). Aucune correspondance possible : `isLessonUnlocked` ne débloque jamais rien au-delà de la leçon 1.1 après un rechargement.
- **« Score JÙLABA gagné »** : calcul local (`computeJulabaScore`, :107), jamais envoyé au module scores. Le chiffre affiché en victoire est fictif.
- **Données** : aucune question n'est seedée côté back (seule référence : la baseline). Sur une base neuve, Tantie répond « Pas encore de questions » (:349) tant que le BO n'a rien saisi (BOAcademy.tsx:306 `POST /academy/questions`).
- **Fuite mineure** : `GET /academy/questions` renvoie `correctIndex` au client (réponses lisibles), et cette route est ouverte à tout compte connecté.
- **Mort** :
  - `AcademyWidget.tsx` : jamais rendu (RoleDashboard.tsx:880, aucun appelant ne passe `showAcademyWidget`).
  - `academyQuestions.ts` : `ALL_ACADEMY_QUESTIONS`, `getQuestionsFor*` et `ACADEMY_QUESTIONS` ne sont importés nulle part (seuls `AcademyQuestion` et `CHAPTER_THEMES` sont utilisés, UniversalAcademy.tsx:26-29).
  - `README.md`, `IMPLEMENTATION_STATUS.md` (« 2 mars 2026 ») et `JULABA_ACADEMY_SPEC.md` sont périmés.
- **Accès** : écritures BO `@Roles(super_admin, admin_general, admin_national)` (academy.controller.ts:18). Cohérent avec le registre front (`academy.write` absent des périmètres gestionnaire/opérateur, bo-permissions.ts:394-414).
- **Tests** : aucun test front. Test back `backend/src/academy/academy.controller.spec.ts` **orphelin** : `jest-unit.config.cjs:6` et `jest-invariants.config.cjs:9` ne ciblent que `test/unit` et `test/invariants`. Même cas pour `src/auth/auth.controller.spec.ts` et `src/stocks-rest/stocks-rest.controller.spec.ts`.
- Hors pilote (docs/pilote/GO-PILOTE-JULABA.md).

### 2.2 Assistant — `components/assistant/TantieSagesseModal.tsx`
- Monté dans `AppLayout.tsx:143` pour tous les rôles de l'app.
- Moteur `useVoiceCore`, vente vocale `vendreVocalUnifie` (ajout au panier, jamais d'encaissement direct, :80-102), actions `executerActionTataMarchand`.
- `openDay`/`closeDay` (:155-158) relèvent du chantier caisse RC1 : cités, non audités.
- L'entrée `/commandes` de calls.tsv (:162) est un **faux positif** : c'est une navigation `navigate('/'+role+'/commandes')`.
- **Erreurs avalées** : `catch (e) { void e; }` (:167). Un échec de `closeDay`, `enregistrerDepense` ou `updateStock` déclenché à la voix ne produit ni message ni toast.
- **Navigation cassée selon le rôle** :
  - `voir_marche` → `/<rôle>/marche` n'existe que pour marchand et coopérative (routes.tsx : `/marchand/marche`, `/cooperative/marche`) ; pour un producteur, la route est inconnue.
  - `commandes` → `/marchand/commandes`, `/producteur/commandes` et `/cooperative/commandes` existent.
- **Tests lancés isolément** :
  - `services/tataMarchandActions.test.mts` → **OK**.
  - `services/vendreVocalUnifie.test.mts` → **1 échec** : « le MONTANT est prononcé (1 500) » (test :219). Échec déjà présent dans `testci.log:272`. Cause à définir : le formatage `fr-FR` de 1500 est correct sur ce Node (`"1 500"` avec U+202F, la regex `\s` le reconnaît), le texte prononcé est donc probablement formulé autrement.

### 2.3 Marché — `components/marche/`
- `marketplace-data.ts` : « Source unique de vérité (mock) — sera remplacé par Supabase » (:3).
  - `PRODUITS_PRODUCTEURS`, `PRODUITS_COOPERATIVE` et `COMMANDES_MARCHE` sont des tableaux vides ; `PRODUITS_PRODUCTEURS` reste importé par MarcheHub.tsx:32.
  - `NOTIFS_MARCHE` (:108-163) : 4 notifications inventées avec montants et dates, **aucun importeur** (code mort).
  - Les types, libellés et thèmes sont utilisés (MarcheVirtuel, MarcheHub, ProducteurProduction, HistoriqueList).
- `HistoriqueList.tsx` : composant de présentation pur, alimenté par `commandesMarcheFromContext` (MarcheVirtuel.tsx:529). ✅
- Le marché virtuel du marchand (`MarcheVirtuel`, `/publications/marche`, `/wallets/me`) est hors pilote. Côté back, son cloisonnement est correct (§3.1).

### 2.4 Marketplace — `components/marketplace/Marketplace.tsx`
- **Route orpheline** : `/marketplace` (routes.tsx:149-151) n'est la cible d'aucun lien de l'app (grep de `'/marketplace'` hors backoffice : seulement routes.tsx).
- `fetch(\`${API_URL}/caisse/produits\`, { headers: {} })` (:40) : le commentaire (:25-39) affirme que l'appel « n'envoie pas la session ». **C'est vrai seulement si l'API est sur un autre domaine** (Render : `julaba-web` → `julaba-api`, utils/api.ts:55-57). Le `fetch` par défaut est en `credentials: 'same-origin'`, et le repli d'`API_URL` est le relatif `/api/v1` (utils/api.ts:62-63). Sur un déploiement même-domaine (proxy Vite en dev, VPS derrière un proxy unique), le cookie part, et l'écran montre **le propre catalogue de la marchande étiqueté « Vendeur »**, exactement ce que le commentaire veut éviter. 🟡
- Données inventées : `sellerScore: 80` en dur (:49), lu à voix haute (:71).
- Exception nommée dans `convergenceApi.test.mts` : test lancé → ✅ « tous les cas passent ».

### 2.5 BO Marketplace (lié : `components/backoffice/BOMarketplace.tsx`)
- `GET /publications/admin/all` (BOMarketplace.tsx:90) : rôles inline `admin_general`, `super_admin` seulement (publications-rest.controller.ts:43-46). Or `admin_national` a `marketplace.read` (bo-permissions.ts:422 + menu BOLayout.tsx:112) : menu visible, 403 avalé en écran vide (`response.ok ? … : null`, :94).
- **Champs renommés** : le back renvoie `user_prenom` et `user_nom` (:48) ; le front lit `producteur_prenom` et `producteur_nom` (:110, :128). Le vendeur s'affiche toujours « Producteur ». `vues`, `commandes` et `categorie` n'existent pas : KPI « CA total » = 0.
- **Modération cassée** : `PATCH /publications/:id` (:171) → le back exige `user_id = admin` (publications-rest.controller.ts:224-230) → 403 systématique, toast « Impossible de mettre à jour ». Il n'existe aucune route admin de modération des publications.

### 2.6 `components/dev/ProfileSwitcher.tsx` — accessible en prod ? Non.
- Montages :
  - LoginPassword.tsx:1118 `{import.meta.env.DEV && showDevButton && <ProfileSwitcher forceShow />}` ;
  - AppLayout.tsx:195, BOLayout.tsx:1444, InstitutionLayout.tsx:355/368/384/440, IdentificateurLayout.tsx:39, institution/Dashboard.tsx:169 : tous sous `import.meta.env.DEV`.
- `vite build` (package.json:9, sans `--mode`) fixe `DEV=false` et élimine ces branches.
- Le garde interne `isDevEnvironment` (:66-70) accepte aussi `*.figma.site` et `makeproxy`, mais il est court-circuité par `forceShow` et n'est jamais atteint en prod.
- **Changement de rôle** : oui, mais seulement **côté client et en dev**. `setAppUser(DEV_MOCK_USERS[x])` (:49-51) sur 5 faux profils (data/mockUsers.ts:15), sans jeton : les appels API restent ceux du cookie réel. L'accès BO est inopérant (`MOCK_BO_USERS = []`, BackOfficeContext.tsx:847). Aucune élévation serveur.
- Routes dev (`/dev-mode`, `/database`, `/create-super-admin`, `/admin-recovery`, `/setup-marchand`) également sous `isDev` (routes.tsx:30-35, :54).

### 2.7 `components/figma/`, `components/shared/`
- `figma/ImageWithFallback.tsx` : vivant (GestionStock, SaisieGuidee, MarcheVirtuel, POSCaisse, MarcheHub, Stocks, CommandesProducteurPage).
- `shared/` : les 41 .tsx ont tous au moins un importeur. Pas de `Math.random` métier (seulement l'animation de VoiceLevelSelector.tsx:43). Reste à faire :
  - supprimer le dossier vide `shared/universal/` ;
  - supprimer les 3 docs (`README.md`, `UNIVERSAL_COMPONENTS_GUIDE.md`, `MIGRATION_EXAMPLE.md`) ;
  - noter que `FicheActeurDetailModal` et `ProfilUnifieModal` font des `fetch` directs (hors client commun).

---

## 3. Détail backend (domaine)

### 3.1 publications-rest (8 routes, JwtAuthGuard par méthode)
- Le cloisonnement `GET /publications/marche` est correct :
  - coopérateur → producteurs et coopérateurs ;
  - grossiste → `type_marche='producteur'` ;
  - demi-grossiste → sa coopérative, résolue côté serveur ;
  - autres rôles → `[]` (:57-105).
- `POST` est réservé aux rôles producteur et coopérateur (:117-121).
- `ON CONFLICT (user_id, LOWER(TRIM(produit)))` (:125) exige l'index unique `ux…` créé **uniquement** par DbInitService (db-init.service.ts:719) et par une migration **archivée** (`_archive/1779300000000`). Il est absent de la chaîne exécutable. DbInit tourne *après* l'ouverture du port (main.ts:303) : il existe une fenêtre où `POST /publications` part en 500.
- `PATCH /:id` accepte `statut` libre, sans liste blanche (:242), et une `quantite_disponible`/`prix_unitaire` négative ou nulle, sans aucune validation.
- Test : `publication-authorship.spec.ts`.

### 3.2 commandes-rest (9 routes) / commandes (porte-entités)
- `commandes/` n'a pas de contrôleur. Il porte les entités `Commande`, `Negociation`, `StockReservation` et `StockReservationService`, fournis par `CommandesRestModule` (commandes-rest.module.ts:13-19). Pas de doublon de routes.
- 🔴 **`POST /commandes` côté acheteur** :
  - `vendeur_id` est arbitraire ;
  - `statut` vient du corps de requête et n'importe quelle valeur de l'enum passe (`confirmee`, `livree`, `litige`…) (:108-112) ;
  - `prix_unitaire`/`total` sont libres, sans contrôle contre le prix de la publication (:113-118) ;
  - avec `publication_id` + `statut:'confirmee'`, `reservation.convertir` décrémente ferme le stock du vendeur (:155-157), **sans acceptation du vendeur et au prix choisi par l'acheteur**.
  - Le PATCH, lui, interdit ces statuts à l'acheteur (:309-317) : l'incohérence est démontrée. Les tests existants n'utilisent `statut:'confirmee'` qu'en vente directe par le vendeur (stock-reservation.spec.ts:188-192).
- `PATCH /:id` : l'acheteur peut remettre une commande confirmée en `en_attente` ou `litige` sans aucun effet stock (seuls `confirmee` et `annulee` en ont).
- `POST /:id/paiement` : verrou pessimiste, idempotence et `assertCompteActif` corrects (:207-290). Test `keiwa-paiement-commande.spec.ts`. Le montant débité reste toutefois `cmd.total`, fixé par l'acheteur.
- `GET /commandes` : les rôles BO reçoivent `[]` (:42-45). `boGetLivraison` (backoffice-api.ts:828) appelle cette route et attend `livraisons`, mais **personne n'appelle `boGetLivraison`** (code mort).
- Hors pilote (« commandes »).

### 3.3 evaluations-rest (3 routes)
- 🔴 La garde « commande livrée + partie prenante » (:66-75) est contournée via §3.2 : n'importe quel compte peut fabriquer une commande `livree` vers n'importe quel `vendeur_id`, puis la noter. L'unicité est par (commande, auteur), donc le nombre de fausses notes est illimité. Les moyennes publiques (`GET /evaluations/user/:id`, sans contrôle d'accès) sont donc manipulables.
- `BadRequestException(e?.message)` (:90) renvoie le message SQL brut au client.
- Table `evaluations` : baseline + DbInit (db-init.service.ts:414).
- Tests : aucun.

### 3.4 catalogue-maitre (5 routes) — doctrine PILOTE-3
- La table `catalogue_maitre` ne contient ni prix ni stock (catalogue-maitre.service.ts:71-75 ; SELECT :176-183 sans prix).
- L'adoption exige `prix > 0` (DTO `PrixDeVenteValide`, dto:32-64), avec une seule erreur explicite.
- `POST synchroniser` est réservé à `@Roles('ADMIN')` (5 rôles BO, aucun cloisonnement de zone, conforme à la sémantique du guard), sans appelant front.
- Test : `test/unit/catalogue-maitre.service.spec.ts`. ✅

### 3.5 boutique (2 routes)
- `POST /boutique/mouvements/sync` et `GET /boutique/etat`.
- Aucun appelant front (grep `boutique/` dans frontend_src : 0 appel).
- Rejoue un stock et une caisse **parallèles** à partir de `boutique_mouvements` (boutique.service.ts:48-66). Ce serait une 2e source de vérité si un client s'en servait (CONSTITUTION §1).
- Aucun test. Statut ⏳.

### 3.6 Route masquée misc-rest `GET /transactions`
- Le scanner Nest confirme l'ordre : `TransactionsRestController.findAll` (#196) avant `MiscRestController.getAllTransactions` (#339).
- Le handler misc-rest (misc-rest.controller.ts:267-310) n'est jamais atteint.
- Déjà documenté (PASSATION.md:148) et gardé par l'invariant `argent-agregats-administrateur.spec.ts:164`.
- Le gagnant renvoie **les transactions du seul appelant** (`where user_id`, transactions-rest.controller.ts:41-47), pas la liste admin. Aucun front n'appelle `GET /transactions` nu ; le BO utilise `/transactions/all`.

---

## 4. Doublons de modules et collisions de routes (CONSTITUTION §1)

Collisions établies par **ordre réel d'enregistrement** (scanner Nest 11.1.28, `route-order.tsv`), pas seulement par égalité textuelle :

| Méthode + chemin | Gagnant (monté en premier) | Perdant | Effet |
|---|---|---|---|
| `GET /transactions` | transactions-rest.controller.ts:41 (#196) | misc-rest.controller.ts:267 (#339) | Connu, documenté, gardé par un invariant |
| `GET /users/flags` | **users.controller.ts:241 `GET /users/:id`** (#78) | user-flags.controller.ts:21 (#86) | ❌ **Nouveau** : `id='flags'`. `RolesGuard` refuse `operateur_terrain` (403) ; pour les autres, `findOne({id:'flags'})` sur une colonne uuid échoue (500). `BOModeration.tsx:202` et `BOActeurDetail` (via `boGetUserFlags`, backoffice-api.ts:1277) sont cassés. Cause : `AuthModule → WalletsModule → UsersModule` est scanné avant `UserFlagsModule` (wallets.module.ts:17). La lecture « app.module.ts ordonne UserFlags avant Users » est fausse. |
| `GET /admin/health` | admin.controller.ts:19 (#90) | admin-analytics.controller.ts:176 (#102) | Doublon interne, connu (INVENTAIRE_RECETTES_V1.md:101) |
| `GET/POST /cycles`, `GET/PATCH/DELETE /cycles/:id` | cycles-rest (seul monté) | producteur/cycles/cycles.controller.ts:31-63 | Perdant **jamais monté** (`CyclesModule` importé nulle part). `POST /cycles/:id/complete` (:70) n'existe donc pas en runtime |
| `GET/POST /recoltes`, `PATCH/DELETE /recoltes/:id` | recoltes-rest (seul monté) | producteur/recoltes/recoltes.controller.ts:19-77 | Idem (`RecoltesModule` importé nulle part). `GET /recoltes/:id` (:29) n'existe pas en runtime |

Paires de modules qui ne présentent **pas** de collision de routes :

| Paire | Constat |
|---|---|
| producteur / producteur-rest / producteurs-rest | `producteur/` = entités + 2 contrôleurs morts + `PublicationsModule` vide, importé (app.module.ts:17) mais **absent du tableau `imports`**. `producteur-rest` = `GET /producteur/stats`. `producteurs-rest` = `GET /producteurs/recoltes-prevues`. Trois dossiers pour un même concept : violation de lisibilité, pas de collision runtime. |
| commandes / commandes-rest | Porte-entités / contrôleur ; aucune route en double |
| tickets / tickets-rest | `TicketsModule` **vide** (tickets.module.ts:3-8), seul tickets-rest a des routes |
| audit / audit-rest | `AuditService` (écriture `audit_logs`) / contrôleur de lecture : rôles séparés, pas de doublon |
| recoltes-rest / producteur/recoltes, cycles-rest / producteur/cycles | Voir le tableau ci-dessus : doublon de **code** seulement (les perdants ne sont pas montés), mais deux implémentations divergentes du même concept |

Aucune autre route masquée par un paramètre, intra- ou inter-fichier (`shadow2.mjs`, `order-shadow.mjs`).

---

## 5. Inventaire des dossiers de `backend/src`

`ls backend/src` renvoie 61 entrées : **57 dossiers** et 4 fichiers (`app.module.ts`, `health.controller.ts`, `instrument.ts`, `main.ts`).
Colonnes : routes = routes montées (scanner) ; front = nombre de fichiers front appelants (calls.tsv OK, re-mappé) ; tests = `test/unit` / `test/invariants` (import `src/<dossier>/` ou appel HTTP du préfixe) / `*.spec.ts` dans src.
Pour les modules hors de mon domaine, le statut est **structurel** (monté, appelé, testé). Il ne vaut pas audit fonctionnel.

| Dossier | Monté ? | Routes | Front | Tests | Statut | Notes |
|---|---|---|---|---|---|---|
| academy | oui | 13 | 2 (UniversalAcademy, BOAcademy) | spec orpheline dans src | 🟡 | Voir §2.1 |
| acteurs-rest | oui | 3 | 2 | fuite-champs-sensibles-membres | ✅ struct. | |
| admin | oui | 35 | 9 | transfert-compte-a-compte, argent-agregats, blocage-wallet | 🟡 | `/admin/health` en double |
| admin-divisions | oui | 5 | 2 | seed-divisions-idempotent, communes-gps-distance | ✅ struct. | Le seed crée districts/regions/departements/communes hors migration (admin-divisions-seed.service.ts:29-52) ; tables aussi en baseline |
| ansut | **non** (jamais importé) | 0 | 0 | 0 | ❌ mort | `AnsutService` (traduction audio, `execSync ffmpeg`) jamais injecté |
| audit | indirect (Auth, Users, TransactionsRest…) | 0 | — | indirect | ✅ | Service d'écriture `audit_logs` |
| audit-rest | oui | 3 | 4 | aucun | 🟡 | Non testé |
| auth | oui (+ ActivationModule via Users/Auth) | 31 | 21 | nombreux (p0-activation*, sec-2, m6-m8…) | ✅ struct. | Hors domaine |
| boutique | oui | 2 | **0** | aucun | ⏳ | §3.5 |
| bpay | oui | 2 (`callback`, `pending/:userId`) | 0 (webhook) | bo-cron-toggle-reel | 🟡 struct. | Hors domaine |
| caisse-rest | oui | 30 | 9 | ~18 invariants ARGENT/CAI | — | Chantier RC1 : non audité |
| catalogue-maitre | oui | 5 | 1 (useCatalogueMaitre) | catalogue-maitre.service.spec | ✅ | §3.4 |
| commandes | oui (entités seulement) | 0 | — | via commandes-rest | ✅ | Porte-entités |
| commandes-rest | oui | 9 | 6 | keiwa-paiement-commande, stock-reservation, negociation-reservation-stock, commande-negociation-lien, argent-gele-b2 | 🔴 | §3.2 |
| common | indirect (`paginate.ts`, 9 contrôleurs) | — | — | — | ✅ | Utilitaire |
| commun | indirect (caisse-rest, stocks-rest) | — | — | 4 specs unit | ✅ | Utilitaires purs testés |
| config | indirect (app.module.ts:7, main.ts:14) | — | — | throttler/trust-proxy specs | ✅ | |
| cooperatives-rest | oui (+ CooperativeResolverModule via publications-rest) | 28 | 8 | 5 invariants | ✅ struct. | Crée `cooperative_besoins` dans un contrôleur (cooperatives-rest.controller.ts:36) |
| cron-jobs | indirect (Bpay, Notifications, MiscRest) | 0 | — | bo-cron-toggle-reel | 🟡 | Table `cron_jobs_config` créée **uniquement** au runtime (cron-jobs-config.service.ts:36), absente des migrations |
| cycles-rest | oui | 5 | 2 | aucun direct | 🟡 | Gagnant contre producteur/cycles (mort) |
| database | oui | 0 | — | migrations-prod, schema-flags, schema-pilote, schema-ledger… | 🟡 | DbInitService recrée en `IF NOT EXISTS` 14 tables déjà en baseline/migrations et porte seul l'index unique `publications` (:719) → double source de schéma (SCHEMA-03, registre) |
| dossiers-rest | oui | 4 | **0** | aucun | ⏳ | Aucun appelant |
| escrow | oui | 0 | — | — | ❌ mort | Module vide (escrow.module.ts:3-8) |
| evaluations-rest | oui | 3 | 1 (evaluations.service) | aucun | 🔴 | §3.3 |
| events | oui (@Global) | WS `/ws` | NotificationsContext, BODashboard | aucun | 🔴 | Diffusion `transaction:created` à tous ; salle `admin` sans `admin_general` mais avec `admin` (inexistant) (events.gateway.ts:62) |
| feedbak-sms | oui | 0 | — | pin-jamais-journalise | ✅ | Utilisé par auth, users, identifications, admin-wallets |
| fidelite-rest | oui | 7 | 1 | fidelite-calcul, fidelite-cycle | ✅ struct. | Hors pilote |
| financial-score | oui | 1 | 2 | financial-score-self-access | ✅ struct. | |
| identifications | oui | 10 | 8 | p0-activation-sms-honnete, suppression-compte | ✅ struct. | |
| institutions | oui | 8 | 7 | institution-isolation | ✅ struct. | |
| marches | oui | 6 | 4 | aucun | 🟡 | Non testé |
| misc-rest | oui | 13 | 5 | bo-cron-toggle-reel, bo-communication-send-bulk, argent-agregats | 🟡 | `GET /transactions` masquée. Stubs en dur : `/supervision`, `/demandes`, `/academy/produits` (4 cultures en dur, :30-37), `/livraison`. `/system/settings` renvoie `+2250700000000` en dur (:148), et cette route sous JwtAuthGuard est appelée **avant connexion** (UnregisteredPhone.tsx:47) → 401. `support_config` créé dans un GET (:151-163) |
| missions | oui | 5 | 3 | aucun direct | 🟡 | |
| mutations | oui | 3 | 2 | mutation-zone-reaffectation | ✅ struct. | Contrôle de rôle inline (mutations.controller.ts:39-51) |
| notifications | oui | 17 | 8 | bo-communication-send-bulk, argent-alerte-rupture, stock-commun-coop | ✅ struct. | `routes.tsv` attribue de faux `@Roles` |
| odoo-gateway | oui (routes 404 par défaut) | 5 | 0 | 7 specs unit | ✅ | Flags §1. Si `ODOO_POC_ENABLED=true` : `POST /odoo-poc/mouvement-stock` ouvert à tout compte connecté (odoo-gateway.controller.ts:16, 31) ; les écritures réelles restent bloquées sans `ODOO_REAL_WRITE_ENABLED=true` |
| oneci | oui | 2 | 2 (fiches identification app + BO) | aucun | 🔴 | §1 ; `nni` concaténé tel quel dans l'URL ONECI (oneci.service.ts:24) ; `GET /oneci/quota` ouvert à tous |
| partner | oui | 4 | 1 (BOApiKeys) | aucun | ❌ base neuve | SCHEMA-05 (registre) ; clés en clair ; `rate_limit` non appliqué ; `GET /partner/financial-score/:userId` → score de n'importe quel acteur pour toute clé valide, sans consentement ni périmètre |
| producteur | **partiel** : entités seulement | 0 (11 dans routes.tsv, non montées) | 3 appelants « matchés », servis en réalité par cycles-rest/recoltes-rest | — | ❌ code mort | `CyclesModule`, `RecoltesModule` jamais importés ; `PublicationsModule` importé mais absent de `imports` (app.module.ts:17) |
| producteur-rest | oui | 1 | 1 | aucun | 🟡 | |
| producteurs-rest | oui | 1 | 1 (RecoltesPrevues) | communes-gps-distance | ✅ struct. | |
| protection-sociale | oui | 2 | 1 | protection-sociale-cotisations | ✅ struct. | Hors pilote |
| publications-rest | oui | 8 | 6 | publication-authorship | 🟡 | §3.1, §2.5 |
| recoltes-rest | oui | 4 | 2 | aucun direct | 🟡 | |
| revenus | oui | 1 | **0** | aucun | ⏳ | Aucun appelant (`/producteur/revenus` côté front est une navigation) |
| scores | oui | 2 | 2 | score-membres-cooperative | ✅ struct. | |
| sms | indirect (FeedbakSms) | 0 | — | p0-activation-sms-honnete, sec-2 | 🟡 | `sendOtp` (sms.service.ts:100-111) jamais appelé, code OTP jamais stocké |
| stocks-rest | oui | 6 | 5 | stocks-rest.idempotency + 3 invariants | ✅ struct. | Proche RC1 |
| tickets | oui | 0 | — | — | ❌ mort | Module vide |
| tickets-rest | oui | 8 | 2 | aucun | 🟡 | Non testé |
| tontines | oui | 4 | 2 | tontine-cycle-complet | ✅ struct. | Hors pilote |
| transactions-rest | oui | 6 | 2 | annulation-remise-stock, argent-agregats | ✅ struct. | Gagne `GET /transactions` |
| user-flags | oui | 3 | 1 | aucun | ❌ | `GET /users/flags` masqué (§4) |
| users | oui (via Wallets → avant UserFlags) | 20 | 14 | ~24 invariants | ✅ struct. | Masque `/users/flags` |
| voice | oui (+ VoiceConfigModule) | 3 (`/admin/voice-config`) | 1 | voice-config, tts-fallback, voice-metrics | ✅ | OpenAIService ne sert plus qu'au rapport hebdo (voice.module.ts:12-27) |
| wallets | oui | 12 | 4 | transfert, keiwa-paiement… | — | Hors domaine (argent) |
| zones | oui | 7 | 7 | aucun direct | 🟡 | |
| health (`health.controller.ts`, fichier) | oui | 2 | 2 | aucun | ✅ | Vivacité seule, sans ping DB ; `/health/net` public expose la config `trust proxy` |

**Tables créées hors migration** (code vivant) :
- `cron_jobs_config` (cron-jobs-config.service.ts:36) : **absente** des migrations ;
- `support_config` (misc-rest:151), `cooperative_besoins` (cooperatives-rest:36, seed-demo:392) et les tables de divisions (seed) : aussi en baseline ;
- DbInitService : 14 `CREATE TABLE IF NOT EXISTS` (caisse_sessions, caisse_fond_journal, produits, catalogue_maitre, stock_mouvements, stock_operation_idempotency, stock_reservations, evaluations, fidelite_config, fidelite_clients, bpay_transactions, clients, credits, boutique_mouvements), toutes aussi présentes dans la baseline ou les migrations, plus l'index unique `publications`, présent **seulement** là ;
- `api_keys` : créée par **aucun** chemin exécutable (SCHEMA-05).

---

## 6. Top problèmes du domaine

**🔴 argent / sécurité / données personnelles**
1. **`POST /commandes` accepte un statut client** (`confirmee`/`livree`) avec un prix libre → décrément ferme du stock d'un vendeur sans son accord, au prix de l'acheteur (commandes-rest.controller.ts:108-118, 155-157).
2. **Fausses évaluations illimitées** via des commandes `livree` fabriquées (evaluations-rest.controller.ts:59-83 + point 1).
3. **Diffusion WebSocket de chaque vente/dépense à tous les connectés** (events.gateway.ts:79-81, 95-98 ← caisse-rest.controller.ts:822, 885 ; écouté par NotificationsContext.tsx:189).
4. **ONECI ouvert à tout compte connecté** (`lookup` = nom, date de naissance, genre ; quota payant) et faux `found:true` (oneci.controller.ts:5-9, oneci.service.ts:31-32).
5. Partner : clés API en clair et relisibles, aucun plafond, accès au score de tout acteur (SCHEMA-05 pour la table).

**🟠 cassé**
6. **`GET /users/flags` masqué par `GET /users/:id`** → BO Modération / fiche acteur sans signalements (nouveau, prouvé par le scanner Nest).
7. BO Marketplace : modération toujours 403 ; noms vendeurs et CA faux ; écran vide pour `admin_national`.
8. Academy : progression jamais enregistrée ni relue (clés incompatibles) ; test backend jamais exécuté.
9. Code mort monté ou importé : `ansut`, `escrow`, `tickets`, `producteur/{cycles,recoltes,publications}`, `AcademyWidget`, `NOTIFS_MARCHE`, `sendOtp`, `boGetLivraison`.

**🟡 partiel**
10. Marketplace `/marketplace` : route orpheline ; sa sûreté dépend du domaine de déploiement.
11. misc-rest : endpoints factices, numéro de support en dur appelé avant connexion (401), `support_config` créé dans un GET.
12. Index unique `publications` et `cron_jobs_config` hors migrations ; DbInit lancé après l'ouverture du port.
13. Assistant : erreurs d'action vocale avalées ; navigation `/producteur/marche` inexistante ; 1 test unitaire voix en échec (`vendreVocalUnifie`, montant prononcé).
14. `boutique` : second grand livre stock/caisse sans appelant.

---

## 7. À DÉFINIR

- **Déploiement même-domaine** : le VPS sert-il front et API sur une seule origine ? Si oui, `Marketplace` envoie le cookie et affiche le propre stock de la marchande (utils/api.ts:62-63). Impossible à vérifier sans accès au VPS.
- **Échec `vendreVocalUnifie.test.mts:219`** : régression ou changement voulu de formulation (montant en lettres ?). Il faut lire `vendreVocalUnifie`, qui touche la chaîne caisse/voix (RC1), hors de mon périmètre.
- **Comportement exact de `GET /users/flags` selon le rôle** : 403 pour `operateur_terrain` est certain ; pour les autres rôles, 500 (uuid invalide) ou 404 selon le driver. Non exécuté, faute de toucher la base 55432.
- **`boutique`, `dossiers-rest`, `revenus`** : routes vivantes sans appelant. À conserver pour un client natif ou externe, ou à supprimer ? Décision produit.
- **ONECI** : la base `api-rnpp.verif.ci` est-elle l'environnement de production ou un bac à sable ? (`sandboxMode: true` est renvoyé quand toutes les réponses sont en erreur.)
- **Bpay `GET /bpay/pending/:userId`** : contrôle d'accès non lu ici (hors domaine).
- **Academy, marché virtuel, commandes** sont hors pilote (GO-PILOTE) : les écrans restent-ils joignables par les testeurs du pilote ? Les routes sont déclarées pour chaque rôle.
