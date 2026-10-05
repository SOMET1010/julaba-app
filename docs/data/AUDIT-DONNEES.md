# Audit global des données JULABA — 22/09/2026

**Aucune migration, aucune suppression, aucune modification fonctionnelle dans
ce lot.** Ce document mesure et nomme. Il ne déplace rien.

Catalogue machine : [`CATALOGUE-DONNEES.csv`](./CATALOGUE-DONNEES.csv) —
**42 datasets**, 14 colonnes.
Cible : [`ARCHITECTURE-LAKE.md`](./ARCHITECTURE-LAKE.md).

---

## 0. Ce que l'audit a pu mesurer, et ce qu'il n'a pas pu

**Mesuré directement** : le schéma PostgreSQL de JULABA (59 tables, reconstruit
localement par le chemin officiel), tous les fichiers du dépôt, le schéma et le
seed Supabase du second dépôt, les corpus, les assets, les données écrites en
dur dans le code.

**Non mesuré, et il faut le dire** :

- **Les volumes réels de la base de production.** Le proxy de sortie de cette
  session refuse `julaba-api.onrender.com` (`CONNECT tunnel failed, 403`). Tous
  les volumes « prod » de ce document sont donc des **schémas**, pas des
  comptages. La seule exception est `catalogue_maitre`, dont on sait qu'il est
  vide **par construction** : rien dans le code ne le remplit sans Odoo, et
  `render.yaml` ne porte aucune variable `ODOO_*`.
- **Le contenu du vrai Odoo.** Établi par `docs/PASSATION.md:193`, pas par une
  requête.
- **La base Supabase du second dépôt.** Établie par ses migrations et son seed.

---

## 1. Le portrait en cinq chiffres

| | |
|---|---|
| Bases de données distinctes | **2** — PostgreSQL JULABA (59 tables) et Supabase akoun-dev (128 tables) |
| Datasets inventoriés | **42** |
| Référentiels produit concurrents | **5** (voir §3) |
| Datasets existants mais **jamais lus** par le runtime | **6** |
| Datasets portant des **données sensibles** | **11** |

---

## 2. Les cinq questions posées, et leurs réponses

### 2.1 — Données existantes mais NON UTILISÉES par la plateforme

| Dataset | Volume | Pourquoi personne ne le lit |
|---|---|---|
| **Référentiel maître vivrier** (Odoo) | **198 produits** | JULABA n'a aucune variable `ODOO_*` — il ne s'y connecte jamais |
| **Unités locales de vente** (`03_mapping_julaba_local.csv`) | 198 lignes, 12 unités | jamais chargé nulle part : ni Odoo (qui ne les porte pas), ni JULABA |
| **Corpus Manus 19 langues** | 3 360 énoncés | aucune locale du runtime ne les charge |
| **Academy** (3 tables) | 34 colonnes | **aucun contrôleur backend** ne les lit |
| **`voice_provider_config`** | 9 colonnes | la voix se configure par drapeaux d'environnement, pas par cette table |
| **`raccourcis_vocaux`** | 9 colonnes | à vérifier — table présente, lecture non trouvée |

Les **unités locales** sont le manque le plus coûteux : `tas` (149 produits),
`bassine` (35), `botte` (42), `panier` (47), `filet` (15) — exactement le
vocabulaire du marché, et exactement ce que les 21 produits en dur n'ont pas.

### 2.2 — Données DUPLIQUÉES

| Ce qui est dupliqué | Où | Gravité |
|---|---|---|
| **Le catalogue produit** | 5 endroits (§3) | **haute** — c'est ce que la marchande vend |
| **Le découpage administratif CIV** | `admin-divisions.seed.ts` (14/33/30/13) · `civ-regions.geo.json` (14 géométries, codes GADM) · Supabase `zones` (6) | **haute** — aucune clé commune entre géométrie et référentiel |
| **Les comptes de test** | 15 en dur dans JULABA (jamais créés) · 34 documentés dans `akoun-dev/COMPTES-TEST.md` | moyenne |
| **Le catalogue de phrases** | `catalog.ts` (548 clés, runtime) · `JULABA-LANG-CATALOG.csv` (514) · `DIOULA-A-TRADUIRE.csv` (514, mêmes lignes) | moyenne |
| **Les corpus de langue** | 20 fichiers × 168 · `JULABA-LANG-CATALOG-MANUS-DRAFT.csv` (3 192, les mêmes à plat) | basse |
| **Coopératives, fidélité, audit, ventes** | schéma JULABA **et** schéma Supabase | **structurelle** — deux plateformes, un seul nom |

### 2.3 — Données EN DUR dans le code

| Où | Quoi | Conséquence |
|---|---|---|
| `caisse-rest.controller.ts` | **21 produits** (`const CATALOGUE`) | **c'est ce que la marchande voit**. Un seul « Igname » là où le référentiel en a quatre. Aucune unité locale. |
| `seed-demo.service.ts` | 15 comptes de démo | jamais créés (`SEED_DEMO=false`) — inerte |
| `admin-divisions.seed.ts` | 14 districts, 33 régions, 30 départements, 13 communes | **incomplet** : 13 communes d'Abidjan seulement, 30 départements sur ~110 |
| `categorieDepense.ts` | 11 catégories de dépense | **cas sain** — une seule liste depuis DEP-02 (22/09). Modèle à suivre. |

### 2.4 — Présent dans une source, ABSENT du runtime

| Source | Runtime | Écart |
|---|---|---|
| Odoo : **198 produits** | `catalogue_maitre` : **0 ligne** | 198 |
| CSV : **198 jeux d'unités locales** | nulle part | 198 |
| Corpus : **3 360 énoncés** en 19 langues | 5 locales dont 3 quasi vides (`bci`, `bm`, `any` : 8 Ko chacune) | ~3 300 |
| `civ-regions.geo.json` : 14 géométries | aucune jointure avec `regions`/`districts` | clé manquante |
| `COMPTES-TEST.md` : 34 comptes | aucun compte sur le pilote | 34 |

**Le cas le plus grave** : `catalogue_maitre` est vide **et** il n'existe
**aucun compte capable de lancer la synchronisation**. `POST
/catalogue-maitre/synchroniser` exige `@Roles('ADMIN')` ; `SEED_DEMO="false"` ;
`SEED_DEMO_BO_PASSWORD` absente ; `SELF_SIGNUP_ROLES` ne contient que
`marchand`, `producteur`, `cooperateur`. **Même Odoo branché, personne ne peut
déclencher la synchro.**

### 2.5 — Référentiels qui DOIVENT avoir une source de vérité unique

| Référentiel | Source de vérité à retenir | Ce qui doit en devenir un dérivé |
|---|---|---|
| **Produits** | **Odoo** (doctrine PILOTE-3, à ne pas rouvrir) | `catalogue_maitre` (miroir) → cache téléphone → `produits` (adoption, prix de la marchande). Les 21 en dur disparaissent. |
| **Unités locales de vente** | **JULABA** (Odoo ne les porte pas) | à charger **quelque part** — aujourd'hui elles n'existent qu'en CSV |
| **Découpage administratif CIV** | **une table, à créer ou à compléter** | le seed en dur et le `geo.json` s'y rattachent par une clé commune |
| **Phrases et voix** | **`catalog.ts`** (548 clés, gardé par 5 tests) | les CSV de langue en deviennent un **export**, jamais un double |
| **Catégories de dépense** | `categorieDepense.ts` | ✅ déjà fait (DEP-02) |

---

## 3. Le catalogue produit — cinq référentiels pour une seule chose

```
  Odoo VPS ............... 198 produits    ← SOURCE DE VÉRITÉ (doctrine)
      │
      │  synchroniser()  ✗ jamais exécuté (aucune variable ODOO_*, aucun ADMIN)
      ▼
  catalogue_maitre ....... 0 ligne         ← le miroir, vide depuis le 1er jour
      │
      │  adoption (prix de la marchande)
      ▼
  produits ............... n par marchande ← ce qu'elle vend vraiment

  ── EN PARALLÈLE, SANS LIEN AVEC CE QUI PRÉCÈDE ──

  CATALOGUE (code) ....... 21 produits     ← CE QUE LA MARCHANDE VOIT AUJOURD'HUI
  02_produits_odoo.csv ... 198 produits    ← l'artefact d'injection, sur disque
  03_mapping_local.csv ... 198 jeux d'unités ← jamais chargé nulle part
  Supabase products ...... 4 produits      ← autre plateforme, autre base
```

Le chemin officiel est **construit, testé et complet** — cache offline,
recherche locale sans réseau, adoption par marchande avec son prix. **Il ne lui
manque que ses 198 lignes.**

---

## 4. Données sensibles — où elles sont, et ce qu'il faut en faire

Les valeurs ne sont pas recopiées ici. Seuls les emplacements sont nommés.

| Gravité | Où | Quoi |
|---|---|---|
| **haute** | `akoun-dev/julaba/COMPTES-TEST.md` | **mots de passe back-office et PIN en clair dans un fichier versionné** |
| **haute** | `identifications` (table) | documents d'identité, `latitude`/`longitude`, `form_data` libre non schématisé |
| **haute** | `users` (table) | `nin`, `date_naissance`, `lieu_naissance`, `photo_url`, `password_hash`, `pin_code_hash`, `pin_code_encrypted_identificateur` — **63 colonnes sur une seule table**, PII et sécurité mêlées |
| moyenne | `render.yaml` | `SEED_DEMO_PASSWORD: "1234"` en clair (inerte tant que `SEED_DEMO=false`) |
| moyenne | `frontend_src/public/voix/` | 155 clips — **voix d'une personne réelle**, consentement à tracer |
| moyenne | `akoun-dev/data/voice/ivoirian-v1/` | jeu de données de locuteurs (`VOICE_TALENT_CONSENT_TEMPLATE_FR.md` existe — la chaîne de consentement est à vérifier) |
| moyenne | `clients`, `credits` | noms et téléphones de clientes de la marchande |
| moyenne | `push_tokens` | jetons d'appareil |
| basse | `docs/parcours/captures/` | 150 captures d'écran de test (47 Mo) — à vérifier pour données de démo visibles |

**Ce que `SEED_DEMO_BO_PASSWORD` protège, et pourquoi il ne faut pas le
défaire** : après l'incident du mot de passe `123456` publié, la règle est
devenue *pas de variable → pas de compte back-office*. C'est ce qui bloque
aujourd'hui la synchronisation du catalogue — et c'est un bon blocage. La
réponse n'est pas d'activer `SEED_DEMO`, c'est de promouvoir **un** compte
existant.

---

## 5. Anomalies mineures relevées en passant

- **Clips voix** : 155 fichiers pour **128 entrées** au registre
  (`registre-tata-fr-ci.json`). 27 fichiers sans entrée, ou registre incomplet
  — à trancher.
- **Locales quasi vides** : `bci`, `bm`, `any` font 8 Ko chacune contre 24 Ko
  pour `fr-ci`. Cohérent avec « aucune langue locale n'hérite automatiquement
  de la règle de composition française », mais l'écart mérite d'être nommé.
- **Matrice de recette v1.0** : le fichier vit **hors du dépôt**
  (`/root/.claude/uploads/…`) alors que tout le backlog s'y réfère par ses
  identifiants `MAR-*`. À versionner.
- **Excel du kit référentiel** : `Referentiel_maitre_vivrier_Odoo_v1.xlsx` est
  listé au `manifest.json` avec son sha256 mais **n'a jamais été dans git**.
  Les trois CSV suffisent — ne pas bloquer dessus.
- **Base de test locale** : après reconstruction par le chemin officiel, elle
  est **entièrement vide** (0 district, 0 région, 0 utilisateur). Le seed des
  divisions ne s'exécute donc pas sur ce chemin-là — à vérifier côté prod.

---

## 6. Ce que cet audit ne fait pas

Il ne migre rien, ne supprime rien, ne déplace aucune donnée. Il ne tranche
aucune des trois décisions qu'il met à jour :

1. **Brancher Odoo sur Render** (variables + un compte ADMIN) — décidé le
   22/09, bloqué sur deux gestes qui appartiennent à Patrick.
2. **Le sort du second dépôt** `akoun-dev/julaba` — deux plateformes, deux
   bases, un seul nom. C'est une décision produit, pas technique.
3. **Les identifiants en clair** dans `COMPTES-TEST.md` — à traiter, mais dans
   l'autre dépôt.
