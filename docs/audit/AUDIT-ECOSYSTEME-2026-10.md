# Audit de l'écosystème JULABA — octobre 2026

| | |
|---|---|
| Date | 03/10/2026 |
| Commit audité | `28bf9e8` (branche `claude/clever-allen-dnr8by`) |
| Branche du rapport | `claude/audit-ecosysteme` |
| Mode | **Lecture seule** : aucune ligne de code, aucune migration, aucun appel au VPS, à Render ni à Odoo réel |
| Périmètre | Tout JULABA **sauf la caisse** (régime RC1, `docs/pilote/RC1.md`), back-office en premier |
| Annexes détaillées | [`ecosysteme-2026-10/`](ecosysteme-2026-10/) : 7 rapports par domaine + [`SONDES.md`](ecosysteme-2026-10/SONDES.md) (reproductions exécutées) |

**Méthode.**
1. Les 349 routes réellement montées ont été extraites et confrontées aux appels du front. Un premier inventaire en comptait 360 ; 11 appartenaient à des modules jamais importés.
2. Chaque écran a été relu dans le front puis dans le back, jusqu'aux tables SQL.
3. Les suites existantes ont été rejouées.
4. Les constats les plus graves ont été **reproduits par HTTP réel** sur un PostgreSQL local et jetable (`./scripts/pg-test-local.sh`), avec le harnais des invariants.

Ce qui n'a pas pu être vérifié est marqué **À DÉFINIR**. Légende des statuts : ✅ fonctionne · 🟡 partiel · ❌ cassé · ⏳ coquille vide · 🔴 risque argent ou sécurité.

---

## 0. SYNTHÈSE

### 0.1 En une phrase

**Le back-office n'est pas aujourd'hui une tour de contrôle fiable.** Il affiche des données réelles sur ses écrans centraux (acteurs, supervision, enrôlement, mutations, modération), mais :
- **son modèle de permissions n'existe que dans le navigateur** ;
- **cinq écrans clés sont cassés** (Zones, Missions, Modération, Institutions, Marketplace) ;
- **il donne à tout rôle BO, y compris `operateur_terrain`, le pouvoir de créer de l'argent ou de destituer le super_admin**, sans trace.

Hors back-office, **un chemin de vol de wallet atteignable par n'importe quel compte connecté a été reproduit** (S1).

### 0.2 Tableau profil / module → statut → prochaine action

| Profil / module | Statut | Constat principal (preuve en section détaillée) | Prochaine action |
|---|---|---|---|
| **Back-office : gouvernance** (login, rôles, permissions, utilisateurs BO, audit) | 🔴 | Permissions vérifiées uniquement côté front ; `PATCH /users/:id` permet de destituer le super_admin (S3) ; `DELETE /users/:id` est ouvert aux 5 rôles ; mots de passe rendus en clair (SEC-10, SEC-08b) ; clé de récupération en dur dans le bundle public | Lot BO-0 |
| **Back-office : acteurs et terrain** (dashboard, acteurs, enrôlement, zones, missions, mutations, carte) | 🟡 / ❌ | Listes réelles. Zones (500) et Missions (403 puis plantage) cassés ; boucle « complément » rompue ; XSS stocké sur la carte ; faux zéros en couche API | Lots BO-1 à BO-3 |
| **Back-office : opérations** (Keiwa, communication, support, modération, marketplace, cron, monitoring) | 🔴 / 🟡 / ⏳ | BOKeiwa crédite, débite et remet un solde à zéro sans audit (S2) ; Modération 500 (S4) ; Marketplace 403 ; Livraison et Contenus sont des coquilles | Lots BO-0, BO-2, BO-4 |
| **Marchand hors caisse** | 🟡 | Accueil, dépenses et stock réels. Écrans hors pilote accessibles avec des **actions d'argent** (tontine, protection sociale, commandes) ; faux numéros de support possibles | Arbitrage de Patrick : masquer les écrans hors pilote |
| **Producteur** (hors pilote) | 🟡 | Déclarer et publier fonctionnent. Plantation fantôme après création ; commandes toujours vides (formes de réponse) ; lien mort `/producteur/revenus` | Après le BO |
| **Identificateur** (enrôlement J0) | 🟡 / 🔴 | Le chemin nominal fonctionne (compte `en_attente_activation`, puis activation). **La skill `identifier` passe par `/auth/signup`**, qui crée un compte ACTIF avec le mot de passe par défaut, sans SMS. Aucune réémission du code d'activation ; enrôlement possible par n'importe quel rôle | Décision J0 de Patrick |
| **Coopérative** (hors pilote) | ❌ / 🔴 | Gestion des membres cassée (mauvais identifiant) ; une adhésion « en attente » ouvre la trésorerie et les données personnelles ; cotisation « validée » sans argent | Masquer |
| **Institution** | ❌ | Aucun chemin produit ne crée le lien `institutions.responsable_id` : 403 partout, affiché comme des zéros ; les routes `/admin/analytics/*` et `/admin/config` n'existent pas ; graphiques en dur | Lot BO-3 (rattacher l'institution) |
| **Wallet / Keiwa / argent** (hors pilote) | 🔴 | Vol par `vente_directe` (S1), création d'argent par le BO (S2), double crédit possible (callbacks B-Pay), double paiement au retrait, protection sociale qui débite vers nulle part. **No-Go Keiwa non appliqué côté serveur** | Lot ARGENT-0 avant toute ouverture de Keiwa |
| **Academy / marché / marketplace** | 🟡 / ⏳ | Academy : progression jamais enregistrée ; BO Academy sans jeton. Marché : faux message « paiement effectué ». `/marketplace` est une route orpheline | Hors pilote |
| **Catalogue maître / Odoo** | ✅ | Doctrine PILOTE-3 respectée (aucun prix) ; drapeaux Odoo fermés par défaut | — |
| **Modules backend restants** (61 dossiers) | 🟡 | 3 collisions de routes réelles ; code mort (ansut, escrow, tickets, producteur/{cycles,recoltes,publications}) ; tables créées hors migration | Inventaire en annexe |
| **Tests / CI** | 🟠 | Backend vert (249 unitaires, 252 invariants). **`test:ci` (CI gelée) rouge sur 3 maillons**, invisible parce que la CI GitHub ne tourne que sur `main` | Signalé au responsable RC1 (voir §1.3) |

### 0.3 Top 10 des problèmes

| # | Gravité | Problème | Preuve |
|---|---|---|---|
| 1 | 🔴 argent | **Vol de wallet par `vente_directe`** : tout compte connecté choisit un « acheteur » et un total, puis débite son wallet. **Reproduit** : 50 000 F → 10 000 F chez la victime, 40 000 F chez le voleur, en 2 requêtes | `commandes-rest.controller.ts:85-176,190-296` ; SONDES S1 |
| 2 | 🔴 argent | **Création et destruction d'argent par n'importe quel rôle BO** (`operateur_terrain` compris) : crédit, débit, remise à zéro, **aucun auteur journalisé**, pas de plafond, double-clic = double crédit. **Reproduit** : +1 000 000 F, 0 ligne d'audit | `admin-wallets.controller.ts:16-18,78-102`, `admin-wallets.service.ts:241-364` ; S2 |
| 3 | 🔴 sécurité | **Élévation de privilège BO** : `admin_national` ou `admin_general` peut suspendre le super_admin, changer son téléphone, ou s'octroyer toutes les permissions. **Reproduit** | `users.controller.ts:262-306` ; S3. Même famille : `PATCH /acteurs/:id` (`acteurs-rest.controller.ts:42`) |
| 4 | 🔴 sécurité | **Les permissions BO ne sont appliquées que dans le navigateur.** La matrice (59 clés) n'est lue qu'à **un** endroit côté serveur ; 44 routes `@Roles('ADMIN')` traitent les 5 rôles à l'identique, **sans cloisonnement par zone** ; `DELETE /users/:id` est ouvert à `operateur_terrain` | `roles.guard.ts:5,27` ; `users.controller.ts:112,455-460` |
| 5 | 🔴 sécurité | **Secrets exposés par le back-office** : mots de passe rendus en clair (SEC-10, SEC-08b toujours ouverts) ; clé de récupération super_admin **en dur dans le bundle public** (`pages/AdminRecovery.tsx:22`, page publique liée depuis le login) ; clés API partenaires en clair et relisibles ; téléphones des super_admin publics (`/auth/contacts-recovery-bo`) | annexe bo-b |
| 6 | 🔴 données | **Chaque vente et chaque dépense de caisse est diffusée en websocket à tous les comptes connectés** (room `all`) | `events.gateway.ts:61,96` ← `caisse-rest.controller.ts:822,885` |
| 7 | 🔴 pilote | **Le chemin J0 de la skill `identifier`** crée un compte **ACTIF avec le mot de passe par défaut**, sans SMS ni activation, ce qui contredit GO-PILOTE (« recevoir le code par SMS ») | `auth.controller.ts:64-83`, `auth.service.ts:108-148` |
| 8 | 🔴 sécurité | **XSS stocké dans le BO** : `acteur_nom` (écrit par tout compte via `POST /identifications/draft`) est injecté sans échappement dans la carte Leaflet ; le jeton BO vit en `sessionStorage` | `BOCarteActeurs.tsx:133` |
| 9 | ❌ BO | **Cinq écrans BO cassés** : Zones (`GET /zones` 500, S5), Missions (403 sauf super_admin, puis TypeError), Modération (`GET /users/flags` 500, S4), Institutions (suspendre ou supprimer : 500), Marketplace (modération : 403) | annexes bo-a, bo-b, bo-c |
| 10 | 🟠 BO | **Session BO fragile** : jeton absent de la plupart des appels, aucun rafraîchissement (le jeton meurt après 15 min), aucun émetteur de `bo-session-expired`, déconnexion qui n'appelle pas `/auth/logout` (session réouvrable). S'y ajoutent les **faux zéros** qui persistent sous BO-01/03 (l'API rend 0 sur erreur) | `backoffice-api.ts:68-71,415-417,645-650` ; `BOLayout.tsx:849-869` |

**Hors top 10, à ne pas perdre :** la CI gelée est rouge (§1.3) ; No-Go Keiwa n'est appliqué nulle part côté serveur ; la protection sociale en mode keiwa débite vers nulle part ; les callbacks B-Pay peuvent créditer deux fois ; le retrait mobile peut payer deux fois ; ONECI est interrogeable par tout compte connecté.

---

## 1. État mesuré des tests (03/10/2026, HEAD `28bf9e8`)

### 1.1 Ce qui a été exécuté

| Commande | Résultat |
|---|---|
| `npm run test:unit -w backend` | ✅ 33 suites, 249 tests |
| invariants backend (PostgreSQL local jetable, `--runInBand`) | ✅ 50 suites, 252 tests |
| `node ci/check-tsc-baseline.mjs` | ✅ 0 erreur (= baseline) |
| `npm run build -w backend`, `npm run build -w frontend_src` | ✅ |
| `npm run verify -w frontend_src` | 🟠 127/130, 3 rouges **connus et listés** (voix-trace-source, garde-argent, i18n-empreintes-argent) |
| `npm run test:ci -w frontend_src` | ❌ **rouge**, voir 1.3 |
| Tests BO isolés : `etatLectureBO.test.mts`, `etatSectionsBO.test.mts` | ✅ |

### 1.2 Couverture du périmètre audité

- **Back-office** : 2 tests frontend (rendu des faux zéros du dashboard) et quelques invariants backend : `bo-communication-send-bulk`, `bo-cron-toggle-reel`, `blocage-wallet-admin`, `m6-m8-role-escalation`, `institution-isolation`, `mutation-zone-reaffectation`, `p0-activation-backoffice`.
- **Aucun** test sur `PATCH /users/:id` par rôle, `DELETE /users/:id`, `bo-permissions`, `/admin/wallets/:id/credit|debit|reinitialiser`, `/users/flags`, `/zones`, `/missions`.
- **Argent hors caisse** : aucun test sur `/bpay/callback`, `/wallets/public/*`, le cron B-Pay, `retrait-mobile`, ni la `vente_directe` payée en keiwa.
- `backend/src/academy/academy.controller.spec.ts`, `auth.controller.spec.ts` et `stocks-rest.controller.spec.ts` ne sont **jamais exécutés** : jest ne lit que `test/unit` et `test/invariants`.

### 1.3 ⚠ La CI gelée `test:ci` est rouge, et personne ne pouvait le voir

`docs/PASSATION.md:47` affirme « `test:ci` → vert, GELÉ ». **C'est faux au 03/10.**

`test:ci` est une chaîne de 44 `npm run … &&`. Son **4ᵉ** maillon échoue, ce qui empêchait les 40 suivants de tourner. C'est exactement le piège que VER-01 a fermé pour `verify`, pas pour `test:ci`. Exécutés un par un, **trois** maillons sont rouges :

| Maillon | Échec |
|---|---|
| `test:vendre-unifie` | « le MONTANT est prononcé (1 500) » (`vendreVocalUnifie.test.mts:219`) |
| `test:offline-voice-hook` | 2 échecs : « avec clip Tata : une seule lecture sans voix navigateur », « sans clip Tata : ni voix navigateur ni clip de secours » |
| `test:correction` | « « bon » reconnu comme confirmation faible » (obtenu `ambigu`) |

`test:vendre-unifie` est rouge sur **tous** les commits testés, de `8ea0a43` (01/10) jusqu'à `28bf9e8`. `8ea0a43` est le plus ancien commit disponible dans ce clone superficiel ; la date d'apparition exacte reste donc **À DÉFINIR**. La CI GitHub (`.github/workflows/ci.yml:13-17`) ne tourne que sur `main` et sur les PR vers `main` : elle n'a jamais vu cette branche.

**Ces trois maillons appartiennent à la caisse et à la voix (régime RC1). Ils sont signalés, pas audités ni corrigés ici.**

---

## 2. BACK-OFFICE — section détaillée (priorité 1)

Détail complet, avec fichier:ligne pour chaque écran :
[`bo-a-acteurs-terrain.md`](ecosysteme-2026-10/bo-a-acteurs-terrain.md),
[`bo-b-gouvernance.md`](ecosysteme-2026-10/bo-b-gouvernance.md),
[`bo-c-operations.md`](ecosysteme-2026-10/bo-c-operations.md).

### 2.1 Architecture réelle

- **Routes front** : 33 écrans sous `/backoffice/*` (`routes.tsx:178-212`) plus `/backoffice/login`. `BORoot.tsx:15-37` ne vérifie qu'une chose : l'appartenance à l'un des 5 rôles BO. **Aucune garde par écran** : toute URL est atteignable par saisie directe.
- **Menu** : `BOLayout.tsx:80-191`, filtré par `hasPermission(permission)` et par `superOnly`. C'est le **seul** endroit où la matrice de permissions a un effet.
- **Données** : `BackOfficeContext.tsx` (965 l.) charge les listes ; `services/backoffice-api.ts` (1 593 l.) porte environ 50 appels (API-09). Il existe deux voies HTTP : `authHeaders()`, qui envoie le jeton `sessionStorage`, et `apiRequest/apiPatch/apiDelete`, où `getValidToken()` rend toujours `null`. Ces dernières n'envoient donc **aucun jeton** et reposent sur le seul cookie.
- **Rôles côté serveur** (`auth/guards/roles.guard.ts`) :
  - `@Roles('ADMIN')` signifie admin_general, super_admin, admin_national, gestionnaire_zone et operateur_terrain, **traités à l'identique**.
  - `@Roles('admin')` en minuscules ne correspond à **aucun** rôle de `UserRole` : seuls les autres rôles listés passent. C'est le cas de `missions.controller.ts:15`, `auth.controller.ts:466` et `financial-score.service.ts:35`.
  - Il n'y a **pas de garde JWT globale** : seul `ThrottlerGuard` l'est (`app.module.ts:154`).

### 2.2 Statut écran par écran

| Écran (menu → route) | Statut | Câblage / preuve | Accès |
|---|---|---|---|
| **Tableau de bord** `/dashboard` | 🟡 | Données réelles. Le rendu applique BO-01/03 et ses 2 tests passent. **Mais** `boDashboardStats` (`backoffice-api.ts:415-417`), `boGetTransactions` (`:645-650`), `fetchRoleCounts` (`:509`) et `admin.service.ts:99-104` rendent **0 sur erreur**, que l'écran tient pour « lu ». Reproduit par sonde | tous |
| **Acteurs** `/acteurs` | 🟡 | `GET /users` réel. La pagination est fausse (20 affichés pour 50 lus) et la recherche ne porte que sur la page chargée. Le reset de mot de passe (SEC-10) est encore branché ; « Supprimer » s'affiche sans permission | `acteurs.read` |
| **Fiche acteur** `/acteurs/:id` | 🟡 | « Acteur introuvable » pour tout acteur hors de la page courante. Le reset (SEC-08b) produit un mot de passe tiré par `Math.random` (`BOActeurDetail.tsx:353-419`). « Forcer la validation » contourne le super_admin | idem |
| **Nouvel acteur** `/acteurs/nouveau` | 🟡 | `POST /users/backoffice/create`, réel et cloisonné par zone. `operateur_terrain` reçoit 403 ; l'écran dépend de `GET /zones` (cassé) ; le mot de passe initial s'affiche en clair | `acteurs.write` |
| **Enrôlement** `/enrolement` | ❌ | La boucle « complément » est rompue : le BO écrit `complement_requis` alors que le serveur et l'app identificateur attendent `complement`, donc pas de SMS et l'acteur disparaît de la liste. « Relancer » affiche un succès alors que la route n'existe pas. Seuls 50 dossiers sont chargés | `enrolement.read` |
| **Supervision** `/supervision` | 🟡 | Réel. Changer la période ne relance pas la lecture ; une panne s'affiche comme « 0 transaction » | `supervision.read` |
| **Zones & Territoires** `/zones` | ❌ | `GET /zones` → **500 reproduit** (S5) : `stocks.zone_id` varchar comparé à `zones.id` uuid (`zones.service.ts:47`), même défaut au DELETE (`:184`). La description saisie est perdue. Type de la colonne en prod : **À DÉFINIR** | `zones.read` |
| **Carte des acteurs** `/carte` | 🔴 | **XSS stocké** (`BOCarteActeurs.tsx:133`). KPI plafonné à 100 ; les coopérateurs ne s'affichent jamais | `acteurs.read` |
| **Modération** `/moderation` | ❌ | `GET /users/flags` → **500 reproduit** (S4), route capturée par `GET /users/:id`. « Bannir » ne coupe pas les sessions ; le KPI « Traités » vaut toujours 0 | `moderation.read` |
| **Mutations** `/mutations` | ✅/🟡 | Réel, réaffectation transactionnelle (invariant vert). Erreurs silencieuses ; pas de contrôle de zone pour gestionnaire_zone | `mutations.read` |
| **Missions** `/missions` | ❌ | Lecture **403** pour tout rôle sauf super_admin (S5, `'admin'` minuscule) ; puis `TYPE_CONFIG[mission.type].icon` plante, le backend n'ayant pas de colonne `type` (`BOMissions.tsx:273-275`) | `missions.read` |
| **Keiwa** `/keiwa` | 🔴 | Lecture réelle, mais le « volume total » est gonflé par une jointure. **Crédit, débit et remise à zéro réels, ouverts aux 5 rôles, sans audit ni idempotence** (S2). Config services/banques : table `keiwa_config_items` inexistante (SCHEMA-06), écritures avalées. Upload de logo **sans filtre** dans un répertoire servi | **menu visible de tous** (`permission: null`) |
| **Score financier** `/score-financier` | ✅ | Front et back de même forme ; réservé au super_admin | super |
| **Marketplace** `/marketplace` | ❌ | La modération fait `PATCH /publications/:id`, réservé au propriétaire : **403** pour un admin. Noms des vendeurs lus dans les mauvais champs | `marketplace.read` |
| **Livraison** `/livraison` | ⏳ | `/admin/livraison` renvoie `[]` en dur ; l'assignation lance un `ALTER TABLE` à chaque appel | `livraison.read` |
| **Communication** `/communication` | 🟡 | Envoi réel `send-bulk` (in-app + push, 500 destinataires max, **pas de SMS**) alors que « SMS » est sélectionné par défaut. N'importe quel compte peut injecter de fausses campagnes via `POST /notifications` | `communication.read` |
| **Contenus** `/contenus` | ⏳ | Toujours vide, rien n'est persisté | `contenus.read` |
| **Academy** `/academy` | 🟡 | Endpoints réels, mais appels **sans jeton** (`BOAcademy.tsx:114-122`), donc 401 sur un déploiement à deux domaines | `academy.read` |
| **Utilisateurs BO** `/utilisateurs` | 🔴/🟡 | Création réelle (super_admin). **Mot de passe rendu et affiché en clair** (SEC-10). La matrice de permissions s'enregistre mais **n'a aucun effet serveur** | super |
| **Institutions** `/institutions` | ❌ | Création OK (nom, type, zone, modules). Suspendre ou supprimer → **500** (colonne `statut` absente). Email et référent perdus en silence. **Impossible de rattacher le responsable**, ce qui rend tout le profil institution inutilisable. `PermissionsEditor` est mort | super |
| **Config institution** `/config-institution` | ⏳ | `isBackendReady = false` (BO-02 toujours vrai) | super |
| **Audit & Logs** `/audit` | 🟡 | Lit `audit_logs` (même table que les écritures), mais 50 lignes seulement, rôle affiché toujours `'admin'`, UUID au lieu du nom, `details` invisibles, faux zéro sur erreur. **Non audités** : suppression de compte, `create-super-admin`, clés API, crédit/débit wallet. `POST /audit` est forgeable | `audit.read` |
| **Rapports** `/rapports` | 🟡 | `/admin/stats` réel ; radar inventé, commissions = 3 % en dur, filtres décoratifs | admin_general |
| **Monitoring IA** `/monitoring-ia` | ✅ | Métriques réelles (`voice_service_metrics`, `SELECT 1`) ; coût volontairement à 0 | super |
| **Event Monitor** `/event-monitor` | 🟡 | Bus d'événements **du navigateur local**, pas une supervision serveur | super |
| **Analytics produit** `/analytics` | 🟡 | « daily_active » compte en réalité des **inscriptions** ; onglets vides | super |
| **Clés API** `/api-keys` | 🔴 | Clés en clair, relisibles (« révéler »), `rate_limit` jamais appliqué, table absente sur base neuve (SCHEMA-05) | super |
| **Tâches planifiées** `/cron` | ✅/🟡 | Reflète les 2 vrais `@Cron`, pause réelle. « Relancer » ne fait rien mais affiche un succès | `cron.read` |
| **Notifications** `/notifications` | 🟡 | Notifications **fabriquées côté client** ; marquer lu ou supprimer est sans effet ; « Tout est en ordre » même sans données | tous |
| **Support** `/support` | 🟡 | Tickets réels, mais 10 seulement ; bouton « Simuler » en production | tous |
| **Paramètres** `/parametres` | ❌ | `GET` rend `{}`, affiché comme une config à zéro ; le `PUT` et `/reset` n'existent pas. BO-01 (feature flags) toujours vrai, masqué hors DEV | `parametres.read` |
| **Profil** `/profil` | 🟡 | Sessions, journal et photo branchés. gestionnaire_zone et operateur_terrain prennent **403 sur leur propre profil** ; changement de mot de passe sans jeton | tous |
| **Login** `/backoffice/login` | 🟡 | Mot de passe OK. WebAuthn : jeton non stocké. Expose les téléphones des super_admin (`contacts-recovery-bo`) | public |
| `pages/AdminRecovery.tsx` (`/admin-recovery`) | 🔴 | Page publique liée depuis le login. Ses 3 routes n'existent pas dans le back (404). **Une clé de récupération est en dur dans le bundle** (secret présent ligne 22). Comportement du serveur déployé face à cette clé : **À DÉFINIR** | public |

**Bilan : 33 écrans BO (32 routes sous `/backoffice` + le login).**
- ✅ fonctionnels (ou ✅/🟡) : **4**. Score financier, Monitoring IA, Mutations, Tâches planifiées.
- 🟡 partiels : **15**.
- ❌ cassés : **7**. Enrôlement, Zones, Modération, Missions, Marketplace, Institutions, Paramètres.
- ⏳ coquilles : **3**. Livraison, Contenus, Config institution.
- 🔴 risque majeur : **4**. Carte, Keiwa, Utilisateurs BO (partiellement fonctionnel par ailleurs), Clés API.

La page publique `AdminRecovery`, hors menu BO, s'y ajoute en 🔴.

### 2.3 Composants et code mort du BO

- Constitution §4 (doublons) : `UniversalSearchBarBO` (437 l.) et `UniversalFilterPanelBO` (766 l.) ne sont **importés par aucun écran**. Les versions vivantes sont `UniversalRechercheBO` et `UniversalFiltreBO` (7 écrans chacune). Sont morts aussi : Avatar, Badge, Table et Toast BO, 3 cartes de `UniversalCardBO`, `CIVLocationPicker`, `CIVPhoneInput`, `PermissionsEditor`, 5 fonctions `/rapport/*` de `backoffice-api.ts:812-866` (routes absentes **et** sans appelant), et les stubs `/admin/{moderation,livraison,communication,cron,rapports,scores}`.
- `/admin/health` est déclaré **deux fois** (`admin.controller.ts:19` et `admin-analytics.controller.ts:176`).

### 2.4 Ce qu'il faudrait pour que le BO soit une tour de contrôle fiable

1. **Autorisation serveur réelle.** Un garde de permission (`@RequirePermission('acteurs.write')`) qui lit `bo_permissions` ; un **cloisonnement par zone** pour gestionnaire_zone et operateur_terrain ; une **hiérarchie** des rôles sur toute écriture de compte. Sans cela, la matrice est décorative. *Décision de doctrine à prendre par Patrick : `bo_permissions` doit-il devenir une autorisation serveur, ou rester un réglage d'affichage ?*
2. **Aucune action d'argent sans auteur, sans plafond, sans idempotence, sans journal.** Tant qu'un ADR ne le décide pas, retirer crédit, débit et remise à zéro du BO, ou les réserver au super_admin avec un double contrôle.
3. **Aucun secret vu par un humain.** Doctrine AUTH-RECOVERY-01 : SEC-10, SEC-08b, mots de passe de création, clé de récupération en dur, clés API en clair.
4. **Un journal d'audit complet et non forgeable**, lisible (nom, rôle, avant/après, pagination).
5. **« Un zéro lu ou rien » sur tous les écrans**, pas seulement le dashboard : l'API doit lever une erreur, pas rendre 0.
6. **Une session BO qui tient** : jeton sur tous les appels, rafraîchissement, expiration signalée, déconnexion serveur.
7. **Les écrans cassés réparés ou masqués**, et les coquilles retirées du menu.

---

## 3. Proposition : plan de stabilisation du back-office

> **Proposition, non codée.** L'ordre et le découpage sont soumis à Patrick. Chaque lot est court, se prouve **rouge d'abord** (méthode du dépôt : reproduction par le code), et ne touche **pas** la caisse (RC1). Les sondes de [`SONDES.md`](ecosysteme-2026-10/SONDES.md) sont les tests rouges de départ des lots BO-0 et ARGENT-0.

| Lot | Contenu | Pourquoi d'abord | Preuve de sortie | Décision Patrick requise |
|---|---|---|---|---|
| **BO-0 — Fermer les portes** (sécurité, 1 à 2 jours) | (a) `PATCH /users/:id` et `PATCH /acteurs/:id` : retirer `boPermissions`, `status` d'un rôle supérieur, `phone` et `webauthnCredentials` de la liste blanche admin ; règle de hiérarchie. (b) `DELETE /users/:id` : super_admin seul, audité. (c) `/admin/wallets/:id/credit\|debit\|reinitialiser` : retirés ou super_admin seul, avec auteur, audit et clé d'idempotence. (d) Supprimer `AdminRecovery.tsx` et sa constante. (e) Échapper `acteur_nom` dans `BOCarteActeurs`. (f) `contacts-recovery-bo` sans téléphones. | Ce sont des abus **reproduits** (S2, S3), atteignables aujourd'hui | Sondes S2 et S3 converties en invariants, rouges puis verts | (c) : retrait pur ou super_admin ? |
| **BO-1 — Secrets** (SEC-10, SEC-08b, SEC-01) | Réinitialisation = code de récupération envoyé par SMS, jamais rendu ; création de compte BO sans mot de passe affiché ; clés API hachées et montrées une seule fois ; migration `api_keys` (SCHEMA-05) | Doctrine déjà actée (AUTH-RECOVERY-01), registre ouvert | Garde `pin-jamais-rendu` étendue à `password`/`defaultPassword` | Canal de réception du code pour un compte BO |
| **BO-2 — Écrans cassés** | Zones (cast uuid/varchar), Modération (ordre des routes `/users/flags`), Missions (`'admin'` → rôles réels, modèle `type`), Institutions (colonnes `statut`/contact + **rattachement du responsable**), Enrôlement (`complement` unique), Marketplace (route de modération admin) | Ce sont les écrans de pilotage du terrain | Un invariant HTTP par écran (forme de la réponse lue par le front) | Missions et Marketplace : réparer ou masquer (hors pilote ?) |
| **BO-3 — Autorisation serveur** | Garde `@RequirePermission` sur les écritures BO ; cloisonnement par zone (gestionnaire_zone, operateur_terrain) sur `GET /users`, enrôlement, mutations, audit ; garde par écran dans `BORoot` | La matrice de 59 clés devient vraie | Matrice rôle × route testée (au moins une écriture par module) | **Doctrine : `bo_permissions` = autorisation serveur ?** Portée attendue d'operateur_terrain |
| **BO-4 — Vérité des chiffres et session** | Supprimer les « 0 sur erreur » en API (front et back) ; généraliser `etatLectureBO` aux autres écrans ; jeton BO sur tous les appels, refresh, `bo-session-expired`, `/auth/logout` ; pagination réelle (acteurs, audit, enrôlement, support) | La tour de contrôle ne doit pas mentir | Sonde « faux zéro » (annexe bo-a) rouge puis verte | — |
| **BO-5 — Journal d'audit** | Auteur et action sur toute écriture BO (suppression, clés API, wallets, institutions, `create-super-admin`) ; `POST /audit` retiré ou marqué déclaratif ; BOAudit lisible (nom, rôle, détails, pages) | Traçabilité ANSUT | Chaque écriture BO testée laisse une ligne | — |
| **BO-6 — Ménage** | Retirer du menu Livraison, Contenus, Config institution, la fausse config Keiwa, BOParametres (ou brancher `PUT`), « Simuler », « Relancer » ; supprimer le code mort (§2.3) | Constitution §4 et §5 | Garde `test:maillons-orphelins` ou équivalent sur les imports | Liste des écrans à masquer |

**Hors BO, mais à placer avant toute ouverture de Keiwa — lot ARGENT-0 :**
- interdire `mode_paiement='keiwa'` sur `vente_directe` et exiger le consentement de l'acheteur pour tout débit (S1) ;
- appliquer No-Go Keiwa **côté serveur** ;
- callbacks B-Pay et retrait dans une seule transaction, avec idempotence ;
- protection sociale keiwa bloquée tant que les fonds n'ont pas de destination.

**Avant J0 du pilote, hors BO :**
- trancher le chemin d'enrôlement (skill `identifier` = signup ACTIF avec le mot de passe par défaut, ou fiche identificateur + code d'activation) ;
- trancher le masquage des écrans hors pilote qui portent des actions d'argent (tontine, protection sociale, commandes, coopérative) ;
- couper la diffusion websocket des ventes à la room `all`.

---

*Sections détaillées des autres domaines : à suivre dans le commit suivant.*
