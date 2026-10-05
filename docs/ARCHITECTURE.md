# Architecture JULABA — la structure réelle

**Ce document décrit ce qui EST, pas ce qui serait souhaitable.** Tout nouveau
code s'y range. Si rien ne convient, on met **d'abord** ce document à jour —
c'est la règle, et elle existe pour que l'architecture reste une décision et
non un résultat.

Relevé du **05/10/2026**. Les volumétries viennent de `find … | wc -l`.

---

## 1. Le dépôt, au premier niveau

| dossier | rôle | fichiers | état |
|---|---|---|---|
| **`frontend_src/`** | **LE front, celui qu'on modifie** — React 18 + Vite + TS | 668 | vivant |
| **`backend/`** | **L'API** — NestJS 11 + TypeORM, 56 modules, 47 entités | 365 | vivant |
| `frontend/` | **sorties de build** (`dist`, `dist-recette`) + clips audio servis | 984 | **généré — ne pas éditer** |
| `ci/` | gardes transverses : `garde-argent.mjs`, `PERIMETRE-ARGENT.json`, `EMPREINTE-GARDES.json` | 9 | vivant |
| `docs/` | documentation, ADR, passations, jalon du pilote | 349 | vivant |
| `scripts/` | utilitaires de dépôt | 19 | vivant |
| `android/` | projet Capacitor (`com.julaba.app`) + plugins natifs Sherpa en Kotlin | — | vivant |
| `maestro/`, `.maestro/` | bancs de parcours sur émulateur (OSS-01, **arrêté au run #13**) | 6 | gelé |
| `infra/` | `odoo-poc/`, outillage d'infrastructure | 26 | **à statuer** |
| `spike/` | `oss-02-vad/` — expérience VAD **REJETÉE** | 24 | **mort, à statuer** |
| `tests/`, `database/`, `coordination/`, `nginx/` | reliquats de volumétrie faible | 15 | **à statuer** |

> **`frontend/` contre `frontend_src/`** — le piège le plus coûteux de ce
> dépôt pour qui arrive. `frontend_src/` est **la source** ; `frontend/`
> contient des **sorties de build** (`capacitor.config.ts` pointe
> `webDir: 'frontend/dist'`). **Modifier un fichier de `frontend/` ne sert à
> rien** : il sera écrasé au prochain build.

---

## 2. Les couches du front — l'ordre compte

```
pages/ + components/     les écrans          → ne parlent JAMAIS à l'API
        ↓
hooks/                   état et cycle React
        ↓
services/                la LOGIQUE MÉTIER, pure et testée
        ↓
services/api/            l'accès aux données — un module par source
```

**Un écran passe par la logique métier pour atteindre les données.** C'est ce
qui permet de prouver une règle d'argent sans monter React ni base — et c'est
ainsi que cinq défauts ont été reproduits en quelques minutes le 03/10, sans
construire un seul APK.

### Où va quoi, dans `frontend_src/src/app/`

| dossier | ce qu'on y met |
|---|---|
| `components/` | écrans et composants, par rôle (`marchand/`, `backoffice/`, `auth/`, `shared/`, `layout/`) |
| `pages/` | points d'entrée de route |
| `hooks/` | état React, abonnements, cycle de vie |
| `services/` | **les règles** — pures, sans React, sans réseau |
| `services/api/` | appels HTTP, un fichier par domaine |
| `voice-offline/` | moteurs voix : `extraction`, `localIntent`, `vocabulaire`, `offlineStt`, `nativeTts` |
| `i18n/` | catalogue des phrases + **validateurs d'argent** (`empreintesArgent.mts`) |
| `styles/` | **`commerce.css` : la seule source des couleurs, typos et espacements** |
| `contexts/` | contextes React (`AppContext` et `ObjectifContext` sont **figés**) |
| `types/`, `utils/`, `config/`, `data/`, `assets/` | types partagés, utilitaires, configuration |

### Le modèle à suivre pour toute règle d'argent

`services/etatCaisseAccueil.ts`. Lis-le avant d'écrire une règle. Il tient
trois choses à la fois :
- la décision vit dans un **module pur**, relisible seul ;
- **la forme du type est la garantie** — sur un état non résolu, le champ
  `montant` **n'existe pas**, donc aucun écran ne peut l'afficher par mégarde,
  et le compilateur le refuse avant le banc ;
- le commentaire dit **le défaut qu'on ferme**, pas ce que fait la ligne.

---

## 3. Le back — par domaine, pas par couche technique

`backend/src/<domaine>/` contient son contrôleur, son service, ses entités et
ses DTO. 56 domaines. Les plus chargés en argent :

| module | rôle |
|---|---|
| **`caisse-rest/`** | **le cœur.** `POST /caisse/vente` est le **seul** chemin de vente : idempotence, mouvement de stock dans la même transaction, marge ligne par ligne, bornes de date |
| `stocks-rest/` | stock et son journal append-only |
| `auth/` | JWT, WebAuthn, PIN (**SMS strictement**, SEC-2), verrous |
| `agent/` | compte de service, portée, délégation par SMS, garde (AGENT-A1..A4) |
| `odoo-gateway/` | passerelle Odoo — **lecture seule**, voie **en suspens** depuis le 05/10 |
| `catalogue-maitre/` | référentiel `VIV-*` — 198 références **intouchables** (STK-03) |
| `database/` | **`db-init.service.ts`** et les migrations |
| `wallets/`, `bpay/`, `escrow/`, `fidelite-rest/` | autres chemins d'argent |

### Le schéma se construit par `DbInitService`, pas par les migrations

**`migrationsRun` est OFF** : les migrations **ne tournent jamais** sur la base
réelle. Le schéma vient de `synchronize` au premier démarrage d'une base
vierge, puis des patchs idempotents de `DbInitService.runInit()`.

Donc, pour toute table ou colonne nouvelle :
1. le DDL va dans **`DbInitService`** — c'est ce qui s'exécute ;
2. **et** dans une migration miroir, **DDL identique** (ADR-0002, « DbInit ⊆
   migrations »), pour que le schéma reste reproductible.

`test/invariants/schema-pilote.spec.ts` vérifie que toute table écrite en SQL
brut existe après ce seul chemin. Pour un DDL partagé, suis
`src/agent/agent-tables.ts` : **une constante, deux consommateurs, aucune
copie**.

---

## 4. Les gardes — la carte, parce qu'elle n'est pas devinable

| garde | ce qu'elle tient |
|---|---|
| `frontend_src` → `npm run verify` | **132 maillons, tous exécutés** (runner VER-01). Attendu : **exit 1, 3 rouges CONNUS, aucun rouge nouveau** |
| `scripts/maillons-verify.json` | **la source unique** de la liste des maillons. Une garde non inscrite ne s'exécute jamais |
| `test:maillons-orphelins` | refuse tout `test:*` qui n'est ni dans `verify`, ni dans `test:ci`, ni déclaré hors-verify **avec motif** |
| `test:ci` | **figé à 44 maillons.** On n'y ajoute rien |
| `ci/garde-argent.mjs` | périmètre d'argent + empreintes des gardes. État de référence : **12 entrés / 14 perdues** |
| `test:voix-trace-source` | empreintes VOICE-01 — **4 rouges permanents et voulus** |
| `test:i18n-empreintes-argent` | le comportement d'argent a-t-il changé |
| `backend` → `jest-unit` | 325 tests, 38 suites, sans base |
| `backend` → `jest-invariants` | **exige un Postgres de test** |

**Quatre refigeages appartiennent au propriétaire**, jamais à un agent :
`--regenerer` (VOICE-01), `empreintesArgent --calculer`,
`--figer-perimetre`, `--figer-gardes`.

---

## 5. Les fichiers figés — et comment travailler autour

`hooks/useVoiceCore.ts`, `components/layout/AppLayout.tsx`,
`contexts/ObjectifContext.tsx`, `contexts/AppContext.tsx` sont sous garde
d'empreinte (VOICE-01). **On ne les modifie pas.**

Quand un fait doit être noté et que le bon endroit est figé, on le note
**ailleurs, là où il se produit**. C'est exactement pourquoi
`services/lectureHistorique.ts` et `services/lectureSessionCaisse.ts`
existent : la couche API sait si le serveur a répondu, et c'est le seul
endroit qui le sache.

---

## 6. Ce qui reste à trancher sur la structure

- **`spike/oss-02-vad/`** — expérience **rejetée**, 24 fichiers. À supprimer ?
- **`infra/odoo-poc/`** — la voie Odoo est en suspens. À garder ?
- **`tests/`, `database/`, `coordination/`, `nginx/`** — 15 fichiers au total,
  rôle non établi. Morts ?
- **`docker-compose*.yml` et `azure-pipelines.yml`** — encore utilisés, ou
  vestiges d'avant Render ?

Ces quatre points sont au backlog de `STATUS.md`. **On ne supprime rien sans
arbitrage** : un dossier mort ne coûte presque rien, une suppression hâtive
peut coûter un historique.
