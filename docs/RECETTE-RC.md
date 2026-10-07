# Recette RC — écosystème complet (07/10/2026)

> Demande de Patrick (07/10) : « une RC à tester de l'ensemble des fonctionnalités, pas seulement la vente ».
> Ce document est le **cahier de recette** : un parcours par profil, le résultat attendu, et le statut **constaté** par l'agent avec sa preuve.

## 1. La RC

| Élément | Valeur |
|---|---|
| Code | `main` = **`9fb4655`** (05/10/2026), commits « Z User » (AUTH-01…14) compris |
| Repère git | branche **`claude/rc-20261007`** (= `9fb4655`). Tag prévu : `rc-20261007-9fb4655`. Le proxy git de la session de l'agent refuse les tags ; Patrick le pose avec `git tag -a rc-20261007-9fb4655 9fb4655 -m "RC 07/10" && git push origin rc-20261007-9fb4655` |
| APK | [`julaba-9fb4655.apk`](https://github.com/SOMET1010/julaba-app/releases/download/pilote-latest/julaba-9fb4655.apk) dans la release `pilote-latest`. Construit par `apk.yml` (run #63, 07/10 00:27 UTC) depuis `main@9fb4655`, avec les paramètres standard : API `https://julaba-api.onrender.com/api/v1`, clips prototypes éteints, dioula éteint. sha256 `4bfab03ba960807d93b57866d8e9631960e1ada3380e9fa27521e0423d1bf768` |
| Web | https://julaba-web.onrender.com (BO : `/backoffice/login`) |
| API | https://julaba-api.onrender.com/api/v1 — `GET /health` rend `commit` (7 caractères) |

**⚠️ Pas encore vérifié : Render sert-il bien `9fb4655` ?** L'hôte `onrender.com` est bloqué par la politique réseau de la session de l'agent (403 au proxy). `render.yaml` porte `autoDeploy: true`, donc main a probablement été déployé. **Première action de Patrick** : ouvrir `https://julaba-api.onrender.com/api/v1/health` et vérifier que `"commit":"9fb4655"`.

### Où les statuts ont été constatés

Faute d'accès à Render, l'agent a joué la recette sur une **stack locale** construite depuis `9fb4655` :
- PostgreSQL 16 jetable ;
- API Nest avec le seed de démo ;
- web servi par `vite preview` ;
- passage navigateur avec Chromium/Playwright (412×915), plus des appels API directs.

Pour les écrans BO, coopérative et producteur, la stack locale portait aussi les correctifs de la PR #262 (`claude/rc-correctifs`). Chaque ligne dit si le statut vaut **sur main** ou **avec les correctifs**.

Légende : ✅ constaté OK · ❌ constaté cassé · 🟡 partiel · ⬜ non testé (raison donnée) · 🔒 hors pilote (accessible, non masqué).

## 2. Comptes de test

Arbitrage Patrick (03/10) : **identifiants remis par SMS, jamais en clair**. Aucun identifiant ne figure donc ici.

| Profil | Comment l'obtenir en production | État |
|---|---|---|
| marchand, producteur, coopérateur | Le BO (`Acteurs → Nouvel acteur`) crée un compte inerte et produit un code d'activation. La personne saisit ce code dans l'app (`/activation`) et choisit son code secret. | ⬜ **à créer par Patrick**, voir ci-dessous |
| identificateur | BO → nouvel acteur, rôle identificateur. Code d'activation, plus PIN envoyé par SMS. | ⬜ idem |
| institution | BO → nouvel acteur, rôle institution | ❌ **inutilisable** : rien ne relie un compte à une institution (§3.5) |
| admin BO (admin_general / admin_national / gestionnaire_zone / operateur_terrain) | BO → Utilisateurs (super_admin). Mot de passe envoyé **par SMS** (BO-1). | ⬜ idem |
| super_admin | Compte existant de Patrick | — |
| partenaire API | BO → Clés API (super_admin). La clé n'est montrée qu'une fois. | ⬜ idem |

**Pourquoi l'agent n'a créé aucun compte en production :**
1. Créer un compte en production est une **écriture en prod**, donc un point d'arrêt qui demande l'accord de Patrick.
2. L'API de production n'est pas joignable depuis la session.
3. La skill `identifier` exige des **noms et numéros réels** de testeurs et interdit de les inventer.

**Décision attendue de Patrick :** la liste des testeurs (prénom, nom, téléphone, profil), et le chemin à utiliser. Deux chemins existent :
- **BO + code d'activation** (recommandé) : conforme à « identifiants par SMS ».
- **`POST /auth/signup`**, le chemin de la skill : il crée un compte **actif** avec le code par défaut et `mustChangePassword=true`, **sans SMS**. Il est contraire à l'esprit de BO-1bis (3).

**Note BO-1bis (3).** Le code d'activation d'un acteur est **rendu à l'administrateur** dans la réponse (`activationCode`), il n'est pas envoyé par SMS. C'est le point « à faire après intégration », toujours ouvert. En recette, l'administrateur transmet donc le code lui-même.

Comptes locaux de l'agent : ceux du seed de démo (`backend/src/database/seed-demo.service.ts`). Les secrets étaient tirés au hasard dans un fichier hors dépôt, détruit avec la session.

## 3. Parcours par profil

### 3.1 Marchand (cœur du pilote, APK)

| # | Parcours pour Patrick | Attendu | Statut | Preuve |
|---|---|---|---|---|
| M1 | Ouvrir l'app → numéro → code | Accueil « Ton comptoir est prêt », caisse du jour | ✅ main | Navigateur, `/marchand` |
| M2 | Caisse → toucher « Banane » ×2 → Encaisser | Vente enregistrée, stock −2 | ✅ main | `POST /caisse/vente` 201, stock 40→38 |
| M3 | Même vente renvoyée (double tap / réseau instable) | **Une seule** vente, un seul décrément | ✅ main | Même `idempotency_key` deux fois : 201, 201, stock 38 (pas 36) ; invariant `i2-idempotence-vente` |
| M4 | Vente à la voix : « Vends deux tas de tomates à 500 » → oui | Confirmation parlée puis encaissement | ⬜ téléphone requis | Couvert par `verify` (`test:vendre-unifie`, `test:offline-voice-hook` verts) |
| M5 | Mode avion → vendre → réseau | Vente marquée « en attente » puis synchronisée, **sans doublon** | ⬜ téléphone requis | maestro `05-hors-ligne.yaml` ; `test:vente-hors-ligne-statut`, `test:vente-synchronisee` verts |
| M6 | Mes ventes (`Ventes passées`) | Les ventes du jour, total juste | ✅ main | « 3 ventes aujourd'hui · 2 700 F » |
| M7 | Annuler une vente | Vente annulée, stock restitué | ⬜ non joué | Invariant `annulation-remise-stock` vert |
| M8 | Mon stock : ajouter un produit, vérifier les mouvements | Produit visible, valeur du stock | ✅ main (lecture) | `/marchand/stock` : 3 produits, valeur affichée |
| M9 | Dépense « transport 500 » | Ligne dans « Mes dépenses », caisse diminuée | ✅ main | `POST /caisse/depense` 201 ; visible dans `/marchand/cahier` |
| M10 | Ouvrir puis clôturer la journée | Écart affiché cohérent | ⬜ non joué | Invariants `caisse-fond-declare`, `cai-02` verts |
| M11 | Dire « mes ventes » au micro de la caisse | Ouvre Mes ventes | ❌ main | `MicroVenteCaisse.tsx:410` navigue vers `/marchand/ventes`, qui n'existe pas. Fichier du **périmètre d'argent gelé** : non corrigé, décision Patrick |
| M12 | Crédit / acompte | **Introuvable** (hors pilote) | ✅ main | `CAISSE_CREDIT_ACTIF=false`, `test:credit-hors-pilote` |
| M13 | Tontines, Keiwa, protection sociale, marché, coopérative | 🔒 accessibles depuis le menu, avec des actions d'argent | 🔒 | Arbitrage « masquer les modules hors pilote » toujours ouvert |

### 3.2 Producteur (🔒 hors pilote)

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| P1 | Connexion → accueil | Kg produits, revenus | ✅ main | Navigateur `/producteur` |
| P2 | Déclarer une récolte (30 kg tomate) | Ligne dans « Mes récoltes » | ✅ main | `POST /recoltes` 201 ; `/producteur/recoltes` |
| P3 | Déclarer « 3 paniers » | Saisie d'origine conservée | ❌ main | Le poids est inventé (`unite:'kg'` en dur). Corrigé par **PR #260**, non fusionnée |
| P4 | Nouvelle plantation | Plantation visible avec ses dates | ❌ main → ✅ correctifs | Le front lisait `res.id` alors que l'API rend `{cycle}` |
| P5 | Mes commandes | Les demandes des acheteurs | ❌ main → ✅ correctifs | La liste restait vide (`data.data` au lieu de `data.commandes`) ; avec le correctif : « 2 commandes » |
| P6 | Revenus | Écran revenus | ❌ main | Lien mort (`Stocks.tsx:561`), non corrigé (écran à créer) |

### 3.3 Coopérative (🔒 hors pilote)

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| C1 | Connexion (président) → accueil | Nom de la coop, membres | ✅ main | `/cooperative` |
| C2 | Membres → suspendre un membre → réactiver | Statut changé | ❌ main → ✅ correctifs | main : 404 « Membre introuvable » ; correctifs : 200. Un président d'une **autre** coopérative reste refusé (404) |
| C3 | Trésorerie | Solde, entrées, sorties | ✅ main | `/cooperative/tresorerie` |
| C4 | Commandes groupées | Liste | ⏳ coquille | La route rend toujours `[]` (table jamais créée) |
| C5 | Une adhésion « en attente » donne-t-elle accès à la trésorerie ? | Non | ⬜ non joué | Audit §6 : oui, c'est une fuite. Non corrigé |

### 3.4 Identificateur (enrôlement J0)

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| I1 | Connexion → accueil | Ses identifications | ✅ main | `/identificateur`, 4 identifications |
| I2 | Nouvelle fiche marchande (7 étapes) → PIN → soumettre | Dossier créé, compte en attente d'activation, code d'activation | ⬜ téléphone requis | Écran de choix du profil OK ; route `create-with-acteur` couverte par les invariants `p0-activation*` |
| I3 | Sur le téléphone de la marchande : `/activation` + code | Compte actif, connexion avec le nouveau code | ✅ main (chemin BO) | BO crée → login refusé avant activation (401) → activer 200 → **rejeu du code refusé** (401) |
| I4 | Suivi / Acteurs | Liste des dossiers | ✅ main | `/identificateur/suivi`, `/acteurs` |
| I5 | Missions | Missions de l'agent | ❌ main | `GET /missions` → 403 (`@Roles('admin')` en minuscules) : **arbitrage de permission** |

### 3.5 Institution

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| N1 | Connexion → tableau de bord | Indicateurs de l'institution | ❌ main | 403 sur `/institution/dashboard`, `acteurs` et `transactions`, **affichés comme des zéros**. Rien ne relie un compte à son institution (`responsable_id`). Arbitrage + évolution, non corrigé |

### 3.6 Back-office

Constaté avec un **super_admin**, plus un admin_general pour les contrôles de droits.

| # | Écran / action | Attendu | Statut | Preuve |
|---|---|---|---|---|
| B1 | Connexion BO (email ou téléphone) | Tableau de bord | ✅ main | `/backoffice/dashboard` |
| B2 | Acteurs : liste, filtres | Comptes par rôle | ✅ main | 18 acteurs, compteurs par rôle |
| B3 | Acteurs → Nouvel acteur (marchand, avec zone) | Compte inerte + code d'activation, **jamais de mot de passe** | ✅ main | 201, réponse sans mot de passe |
| B4 | Zones : liste, création | Zones listées | ❌ main → ✅ correctifs | main : `GET /zones` en 500 (varchar = uuid). **Bloque aussi B3**, car la création d'acteur exige une zone |
| B5 | Modération : liste et création de signalements | Liste | ❌ main → ✅ correctifs | main : 500 (route avalée par `/users/:id`, puis jointure uuid/varchar) ; correctifs : POST 201, GET 200 |
| B6 | Enrôlement → « demander un complément » | SMS à l'acteur, dossier visible chez l'identificateur | ❌ main → ✅ correctifs (code) | Le BO écrivait `complement_requis`, le serveur attend `complement` ; ⬜ SMS non joué |
| B7 | Supervision, Audit, Rapports, Notifications, Support, Mutations, Contenus, Monitoring IA, Analytics, Score financier, Livraison, Communication, Cron, Config institution, Carte, Utilisateurs, Profil, Paramètres (lecture) | Page chargée sans erreur API | ✅ main | Navigateur : aucune erreur API sur ces pages (certaines sont des coquilles, voir l'audit) |
| B8 | Academy | Modules et stats | ❌ main | 401 sur `/academy/modules` et `/academy/stats` (appels sans jeton) |
| B9 | Missions : création par un admin_general | Mission créée | ❌ main | 403 (seul super_admin passe) : **arbitrage de permission** |
| B10 | Institutions : créer puis suspendre | Suspendue | 🟡 main | Création 201, **suspension 500** (colonne `statut` absente de l'entité) |
| B11 | Marketplace : modérer une publication | Publication suspendue | ❌ main | 403 « accès refusé » même pour un super_admin (route réservée au propriétaire) : **arbitrage** |
| B12 | Paramètres : enregistrer | Sauvegardé | ❌ main (code) | `PUT` absent côté serveur |
| B13 | Clés API : lister, créer | Clé montrée une fois, jamais relisible | ❌ base neuve | 500 : la table `api_keys` est absente des migrations (SCHEMA-05). ⬜ **En prod la table existe probablement** : à vérifier par Patrick dans le BO |
| B14 | Keiwa (wallets) | 🔒 | ❌ | 500 sur `/admin/wallets/config/items` ; lecture ouverte à tous les rôles BO |
| B15 | Sécurité BO-0/BO-1 : crédit de wallet, escalade, clé de récupération | Refusés / supprimés | ✅ main | Invariants `bo0-s1..s4`, `bo1-*` verts (290/290) |

### 3.7 Partenaire API

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| A1 | BO → Clés API → créer (type bank) | Clé affichée une seule fois | ⬜ prod / ❌ base neuve | Voir B13 |
| A2 | `curl -H "x-api-key: <clé>" …/partner/financial-score/<id>` | Score rendu ; fausse clé → 401 | ⬜ | Sans table : 500 au lieu de 401 |

### 3.8 Transverses

| # | Sujet | Statut | Preuve |
|---|---|---|---|
| T1 | Inscription publique (`/auth/signup`) | ✅ main | 201, compte actif, `mustChangePassword=true` ; rôle admin refusé (403) |
| T2 | Anti-rafale de connexion (5 par minute et par IP) | ✅ main | 429 constaté. ⚠️ Au marché, plusieurs téléphones derrière une même IP NAT : TRUST_PROXY non calibré (prérequis GO-PILOTE) |
| T3 | Hors ligne (caisse) | ⬜ téléphone requis | Voir M5 |
| T4 | Voix hors ligne (sherpa) | ⬜ téléphone requis | APK : voix FR embarquée (`installer-voix.sh`) |
| T5 | Odoo (`/odoo-poc/*`) | ✅ local (mock, drapeau allumé) / fermé en prod | `ODOO_POC_ENABLED=false` en prod → 404 voulu ; aucun écran |
| T6 | Diffusion temps réel des ventes à tous les comptes connectés | ❌ main | `events.gateway.ts`, room `all` (audit) : non corrigé |

## 4. État des tests sur `9fb4655`

| Suite | Résultat |
|---|---|
| CI GitHub sur main (`CI — filet d'intégration`) | ❌ **rouge** : 1 échec sur 251, `pin-jamais-rendu.spec.ts` SEC-07 (`Math.random` dans `anti-enumeration.ts`, AUTH-07). Corrigé par la PR #262 (`claude/rc-correctifs`) |
| CI GitHub `GARDE-ARGENT` sur main | ❌ **rouge** : une assertion retirée de `test-verrou-connexion.mjs` par 4bef809 (AUTH-03). Le refigeage est réservé à Patrick |
| Backend unitaires (avec correctifs) | ✅ 251/251 |
| Backend invariants PostgreSQL (avec correctifs) | ✅ 290/290 (57 suites) |
| Front `tsc -b` + baseline | ✅ 0 erreur |
| Front `verify` | 🟡 135/138. Nouveau rouge : `test:i18n-source` (inventaire 412 contre source 411), **déjà rouge sur main**. Les 2 autres rouges sont connus |
