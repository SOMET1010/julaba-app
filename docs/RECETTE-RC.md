# Recette RC — écosystème complet (07/10/2026)

> Demande de Patrick (07/10) : « une RC à tester de l'ensemble des fonctionnalités, pas seulement la vente ».
> Le même jour, Patrick a délégué ses décisions : « GO 2-3-6-7-8-9 ». Ce document est le **cahier de recette** de la RC qui en résulte. Pour chaque profil, il donne le parcours, le résultat attendu et le statut **constaté**, avec sa preuve.

## 1. La RC

| Élément | Valeur |
|---|---|
| Code | `main` = **`4d91c4b`** (07/10/2026) — CI de main **verte** (filet d'intégration, GARDE-ARGENT, invariants, check) |
| Repère git | branche **`claude/rc-20261007-4d91c4b`**. Le tag est à poser par Patrick, car le proxy git de l'agent refuse les tags : `git fetch origin && git tag -a rc-20261007-4d91c4b 4d91c4b -m "RC 07/10" && git push origin rc-20261007-4d91c4b` |
| APK | [`julaba-4d91c4b.apk`](https://github.com/SOMET1010/julaba-app/releases/download/pilote-latest/julaba-4d91c4b.apk) — release `pilote-latest`, `apk.yml` run #65, paramètres standard (API `https://julaba-api.onrender.com/api/v1`, clips prototypes et dioula éteints, modules hors pilote masqués). sha256 `13fff5d97de50abb28383657f45b16940d36dadffd0d3a3b61e1d4baa3e78ace`, 272 977 863 octets |
| Web | https://julaba-web.onrender.com — BO : `/backoffice/login` |
| API | https://julaba-api.onrender.com/api/v1 — `GET /health` rend `commit` |

**À vérifier par Patrick :** Render a redéployé main tout seul (`autoDeploy: true`). Ouvre `https://julaba-api.onrender.com/api/v1/health` : il doit rendre `"commit":"4d91c4b"`. L'hôte `onrender.com` est bloqué dans la session de l'agent.

### Contenu de la RC par rapport à `9fb4655`

| PR | Contenu |
|---|---|
| #265 | main au vert : assertion du verrou restaurée (GARDE-ARGENT), SEC-07 (`crypto.randomInt`) |
| #262 | BO Modération (500 → OK, route `/user-flags`), BO Enrôlement « complément », BO Institutions (suspendre / réactiver / supprimer), écran Missions qui ne plante plus, producteur (commandes, plantation) |
| #264 | `skills/` et `tool-results/` retirés de main (sorties sandbox) |
| #267 | inventaire vocal régénéré (`test:i18n-source`) |
| #268 | **modules hors pilote portant de l'argent masqués** (drapeau `VITE_JULABA_MODULES_HORS_PILOTE`, garde de route, rien supprimé) |
| #266 | périmètre d'argent : BO Zones (500 → OK), membres de coopérative (404 → OK), « mes ventes » vocal (404 → OK) — CI verte, 23 invariants d'argent |
| #261 | cadre de travail : `STATUS.md` fait foi, agents, garde-fous (`check`) |
| #269 | logigramme des parcours et des voix (`docs/logigramme/`) |

**Hors RC, par décision :** #260 (Récolte) passe à la RC suivante.

### Où les statuts ont été constatés

Sur une **stack locale construite depuis `4d91c4b`** : PostgreSQL 16 sur une base neuve, API Nest avec le seed de démo (`/health` → `commit 4d91c4b`), web servi par `vite preview`. La vérification passe par un script d'appels API et par Chromium/Playwright en 412×915.

Légende : ✅ constaté OK · ❌ constaté cassé · ⬜ non testé (raison donnée) · 🔒 masqué dans cette RC.

## 2. Comptes de test

Arbitrage (03/10) : **identifiants remis par SMS, jamais en clair**. Aucun identifiant n'apparaît ici. **Aucun compte n'a été créé en production** : c'est une écriture en prod, et le point 4 attend la liste des testeurs fournie par Patrick.

| Profil | Comment l'obtenir en production |
|---|---|
| marchand, producteur, coopérateur, identificateur | Back-office → Acteurs → Nouvel acteur : compte inerte + code d'activation, puis `/activation` dans l'app. sélecteur de zone OK (`GET /zones` 200 depuis #266) |
| Recette ANSUT | Numéros de `AUTH_TELEPHONES_TEST`, déjà présents en production |
| admin BO | BO → Utilisateurs (super_admin), mot de passe envoyé par SMS (BO-1) |
| institution | Créable, mais tableau de bord en 403 tant que le lien compte → institution n'est pas tranché (arbitrage 5) |
| partenaire API | BO → Clés API (super_admin), clé montrée une seule fois |

Le code d'activation d'un acteur est rendu à l'administrateur, il ne part pas par SMS. Le point BO-1bis (3) reste ouvert.

## 3. Parcours par profil

### 3.1 Marchand (cœur du pilote, APK)

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| M1 | Ouvrir l'app → numéro → code | « Ton comptoir est prêt » | ✅ | navigateur `/marchand` ; login 200 |
| M2 | Caisse → toucher un produit ×2 → Encaisser | vente enregistrée, stock −2 | ✅ | `POST /caisse/vente` 201, stock 40→38 |
| M3 | Même vente renvoyée (réseau instable) | **une seule** vente | ✅ | même clé rejouée : 201/201, stock 38 (pas 36) |
| M4 | Vente à la voix « Vends deux tas de tomates à 500 » | confirmation puis encaissement | ⬜ téléphone | `verify` : `test:vendre-unifie`, `test:offline-voice-hook` verts |
| M5 | Mode avion → vendre → réseau | synchronisée, sans doublon | ⬜ téléphone | maestro `05-hors-ligne.yaml` |
| M6 | Ventes passées | ventes et total du jour | ✅ | « 3 ventes aujourd'hui » |
| M7 | Dépense « transport 500 » | ligne dans Mes dépenses | ✅ | `POST /caisse/depense` 201 ; `/marchand/cahier` |
| M8 | Mon stock | produits, valeur | ✅ | `/marchand/stock` |
| M9 | Ouvrir puis clôturer la journée | écart cohérent | ✅ (lecture) / ⬜ clôture | `GET /caisse/session/<jour>` 200 ; invariants `caisse-fond-declare`, `cai-02` verts |
| M10 | Dire « mes ventes » au micro | ouvre Ventes passées | ✅ code / ⬜ téléphone | route `/marchand/ventes-passees` (#266) |
| M11 | Crédit / acompte | introuvable | ✅ | `CAISSE_CREDIT_ACTIF=false` |
| M12 | Keiwa, tontines, commandes, marché, protection sociale, cotisation | **masqués** : retour à l'accueil | 🔒 ✅ | les URL `/marchand/keiwa`, `/tontines`, `/commandes`, `/marche` renvoient sur `/marchand` ; barre du bas : Accueil, Moi |

### 3.2 Producteur

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| P1 | Connexion → accueil | kg produits, revenus, **sans carte Keiwa** | ✅ | navigateur `/producteur` |
| P2 | Déclarer une récolte | ligne dans Mes récoltes | ✅ | `POST /recoltes` 201 |
| P3 | Nouvelle plantation | plantation avec id et dates | ✅ | `POST /cycles` 201, `cycle.id` présent (#262) |
| P4 | Commandes | 🔒 masquées (paiement keiwa) | 🔒 ✅ | `/producteur/commandes` → accueil. API corrigée (#262) : 2 commandes lues |
| P5 | Déclarer « 3 paniers » | saisie d'origine conservée | ❌ | poids inventé ; corrigé par #260, prévue pour la RC suivante |

### 3.3 Coopérative

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| C1 | Connexion président → accueil | nom de la coop, membres | ✅ | login 200 |
| C2 | Membres → liste | membres | ✅ | 3 membres |
| C3 | Suspendre ou réactiver un membre | statut changé | ✅ | PATCH 200 (#266) |
| C4 | Trésorerie | solde, entrées, sorties | ✅ | `GET /cooperatives/tresorerie` 200 |

### 3.4 Identificateur

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| I1 | Connexion → accueil, suivi, acteurs | ses identifications | ✅ | `GET /identifications` 200 |
| I2 | Nouvelle fiche (7 étapes) → PIN → soumettre | compte en attente + code d'activation | ⬜ téléphone | invariants `p0-activation*` verts |
| I3 | Activation sur le téléphone de l'acteur | compte actif, rejeu du code refusé | ✅ | activer 200, rejeu 401 |
| I4 | Missions | ses missions | ❌ | 403 : **arbitrage 5** (permissions) |

### 3.5 Institution

| # | Parcours | Attendu | Statut | Preuve |
|---|---|---|---|---|
| N1 | Connexion → tableau de bord | indicateurs | ❌ | 403, affiché comme des zéros : lien compte → institution, **arbitrage 5** |

### 3.6 Back-office (super_admin)

| # | Écran / action | Attendu | Statut | Preuve |
|---|---|---|---|---|
| B1 | Connexion, tableau de bord, acteurs, supervision, audit, enrôlement, institutions | pages chargées | ✅ | navigateur + API 200 |
| B2 | Zones | liste des zones | ✅ | `GET /zones` 200 (#266) |
| B3 | Créer un acteur (avec zone) | compte inerte + code, **jamais de mot de passe** | ✅ | 201, réponse sans mot de passe |
| B4 | Modération : signaler, lister | signalement visible | ✅ | POST 201, GET 200 (#262) |
| B5 | Institutions : suspendre | statut « suspendu » | ✅ | PATCH 200, statut relu (#262) |
| B6 | Enrôlement : demander un complément | SMS + dossier visible chez l'identificateur | ✅ code / ⬜ SMS | statut canonique `complement` (#262) |
| B7 | Missions | liste | ✅ super_admin / ❌ admin_general | 403 pour les autres rôles BO : **arbitrage 5** |
| B8 | Keiwa | 🔒 masqué | 🔒 ✅ | `/backoffice/keiwa` → tableau de bord |
| B9 | Academy | modules | ❌ | 401 sur `/academy/*` (appels sans jeton) |
| B10 | Clés API | clé montrée une fois | ❌ base neuve / ⬜ prod | table `api_keys` absente des migrations (SCHEMA-05) ; en prod elle existe probablement |
| B11 | Marketplace : modérer | publication suspendue | ❌ | 403 : **arbitrage 5** |
| B12 | Sécurité BO-0/BO-1 | refus | ✅ | invariants `bo0-s1..s4`, `bo1-*` verts |

### 3.7 Transverses

| # | Sujet | Statut | Preuve |
|---|---|---|---|
| T1 | Inscription publique ; rôle admin refusé | ✅ | signup 201 ; admin 403 |
| T2 | Anti-rafale de connexion (5 par minute et par IP) | ✅ | 429 constaté. ⚠️ Au marché, avec plusieurs téléphones derrière une même IP NAT, TRUST_PROXY reste à calibrer (prérequis GO-PILOTE) |
| T3 | Voix hors ligne, hors ligne caisse | ⬜ téléphone | APK : voix FR embarquée |
| T4 | Odoo `/odoo-poc/*` | fermé en prod (voulu) | `ODOO_POC_ENABLED=false` |
| T5 | Diffusion temps réel des ventes à tous les comptes connectés | ❌ | `events.gateway.ts`, room `all` : non corrigé |

**Bilan API automatisé sur `4d91c4b` : 33 ✅ / 2 ❌.** Les 2 ❌ relèvent de l'arbitrage 5 (permissions).

## 4. Ce qu'il reste à Patrick

1. Vérifier `/health` → `4d91c4b`, puis poser le tag (commande au §1).
2. Fournir la liste des testeurs (nom, téléphone, profil) et donner son accord pour créer les comptes en prod.
3. Arbitrage 5 : permissions Missions (rôles BO, identificateur) et Marketplace, lien compte → institution. La session de l'agent refuse d'élargir des permissions sans accord explicite.
