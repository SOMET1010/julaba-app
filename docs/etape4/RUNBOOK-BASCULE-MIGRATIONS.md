# RUNBOOK-BASCULE-MIGRATIONS — ADR-0002 étape 4 (bascule prod `migrationsRun`)

> **Statut : PRÉPARÉ, EN ATTENTE DE VALIDATION HUMAINE POUR EXÉCUTION.**
>
> Ce runbook **ne doit pas être exécuté** tant que toutes les cases de la section 9
> (Validation humaine) ne sont pas cochées. L'exécution est une action humaine
> d'exploitation, horsCI, dans un créneau de maintenance planifié.
>
> Ce runbook est tenu par l'Agent Tech Lead (INIT-010). Exécution opérée par Alex
> (CEO/lead dev), validation Patrick (Audit Global).

---

## 0. Préambule — pourquoi ce runbook existe

### 0.1 Rappel de l'incident du 18/09/2026

Le 18/09/2026, une synchronisation Blueprint Render a poussé
`DB_MIGRATIONS_RUN=true` sur le service `julaba-api`. L'API est morte au boot
sur `type "caisse_transaction_status_enum" already exists`, dix tentatives,
puis extinction. Elle n'a survécu que parce que Render garde l'instance
précédente quand un déploiement échoue (voir `.ai/INCIDENTS.md` et le commentaire
de `render.yaml` ligne 131).

**Cause racine, structurelle.** Sur une base VIERGE, le boot construit le schéma
depuis les entités (`synchronize`) et n'enregistre **aucune** migration : la table
`migrations` reste vide. Au démarrage suivant, la base n'est plus vierge, TypeORM
croit donc la baseline `1780200000000-BaselineSchema` « en attente » et la rejoue.
Or cette baseline contient 17 `CREATE TYPE` **sans** protection `IF NOT EXISTS` :
sur un schéma déjà présent, le premier `CREATE TYPE` déjà existant fait planter
tout le boot. Le schéma est là, son **enregistrement** (ledger `migrations`) ne
l'est pas : la chaîne de migrations ne sait pas **adopter** une base qu'elle n'a
pas créée.

**Workaround appliqué.** `DB_MIGRATIONS_RUN=false` dans `render.yaml`. Le schéma
est reconstruit en prod par `synchronize` (sur base vierge) + `DbInitService`
(DDL `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`, idempotent). Trois
mécanismes coexistent en parallèle — dette SCHEMA-01/02/03 P1 OUVERT au registre
maître.

### 0.2 Ce que ce runbook prépare

La bascule de la doctrine schéma actuelle (**3 mécanismes** : `synchronize` +
`DbInitService` + migrations) vers **migrations TypeORM seules**, sans
`synchronize` ni `DbInit` au boot. C'est l'**étape 4** de l'ADR-0002. Les étapes
1-3 sont réalisées (baseline `1780200000000` reproductible, 27 migrations actives,
31 archivées, `verify-dbinit-subsumed.cjs` prouve que `DbInit ⊆ migrations`).

### 0.3 Relation avec le runbook historique

Un runbook antérieur — `docs/etape4/RUNBOOK-bascule-migrations.md` (casse
différente) — a été exécuté le 2026-08-15 (procès-verbal :
`docs/etape4/BASCULE-EXECUTEE-2026-08-15.md`). Il décrivait un `--fake` ciblé de
la baseline puis une exécution réelle de `FixSchemaDrifts` (`1780300000000`) par
DDL direct. Cette bascule a été **invalidée** par l'incident du 18/09/2026 : la
base a été reconstruite par `synchronize` + `DbInit` et le ledger `migrations` a
été perdu (ou n'a jamais été correctement posé). **Le présent runbook
 supersede le runbook historique** pour la nouvelle tentative. Il conserve
cependant les références aux empreintes de schéma committées
(`schema-attendu-prod-actuelle.fp`, `schema-attendu-apres-bascule.fp`,
`schema-fingerprint.sql`) qui restent valables comme méthode d'audit.

---

## 1. Objectif

Bascule de la doctrine schéma actuelle (**3 mécanismes parallèles** :
`synchronize` + `DbInitService` + migrations TypeORM désactivées) vers
**migrations TypeORM seules** comme source unique de vérité du schéma.

### 1.1 Cible après bascule

| Variable / mécanisme     | Avant (aujourd'hui)                 | Après (cible)                       |
|--------------------------|-------------------------------------|-------------------------------------|
| `DB_MIGRATIONS_RUN`      | `"false"` (render.yaml)             | `"true"` (Render dashboard)         |
| `DB_SYNCHRONIZE`         | auto (`schema-flags.ts` décide)     | `"false"` explicite                 |
| `synchronize` au boot    | `true` sur base vierge, `false` sinon | `false` toujours                    |
| `DbInitService.runInit()`| exécuté à chaque boot (filet)       | **laissé en place** (lot ultérieur) |
| Ledger `migrations`      | vide / incohérent                    | peuplé, 0 migration en attente      |

### 1.2 Périmètre

- **In scope** : activation des migrations au boot, désactivation de
  `synchronize`, vérification que le schéma prod est adoptable par la chaîne de
  migrations.
- **Hors scope** (lot ultérieur, section 7) : retrait du code de
  `DbInitService` (765 LOC), fermeture de SCHEMA-01/02/03, mise à jour de
  `render.yaml` pour refléter l'état dashboard.
- **Invariant absolu** : aucune perte de données. La base de prod est la source
  de vérité, on ne la reconstruit jamais à partir de zéro.

### 1.3 Conditions bloquantes préalables (lot de code)

> ⚠️ **Ce runbook est documentation. Le lot de code suivant doit être mergé
> AVANT toute exécution.** Il n'est pas rédigé dans ce runbook — il est
> prérequis.

1. **Idempotence de la baseline.** La migration
   `1780200000000-BaselineSchema.ts` doit protéger ses `CREATE TYPE` par
   `IF NOT EXISTS` (ou `DO $$ … EXCEPTION WHEN duplicate_object $$`). Sans cela,
   tout boot avec `DB_MIGRATIONS_RUN=true` sur une base dont le ledger serait
   incohéquent replantera exactement comme le 18/09/2026.
2. **Mise à jour du test `backend/test/unit/migrations-prod.spec.ts`.** Ce test
   ASSERT aujourd'hui (intentionnellement) que la baseline **n'est pas**
   idempotente et que `render.yaml` porte `DB_MIGRATIONS_RUN="false"`. Une fois la
   baseline rendue idempotente et la bascule exécutée, ce test doit être mis à
   jour pour refléter le nouvel invariant (« la baseline sait adopter un schéma
   existant »). Le commentaire en tête de fichier le prévoit explicitement.
3. **`render.yaml` non modifié par ce runbook.** La bascule effective se fait au
   dashboard Render (pas dans `render.yaml`) — la divergence fichier/dashboard
   est assumée pendant la phase de stabilité, puis résorbée au lot post-bascule.

---

## 2. Pré-requis obligatoires

Tous les pré-requis suivants doivent être **verts** au moment de l'exécution.
Un seul manquant → NO-GO.

### 2.1 Sauvegarde DB

- [ ] **Backup DB chiffré récent (< 24h)**, déclenché via
      `.github/workflows/sauvegarde-db.yml` (workflow_dispatch manuel).
- [ ] **Taille de l'artefact vérifiée ≥ 10 000 octets** (le statut vert du
      workflow ne suffit pas — l'incident du 18/09/2026 a montré un job « succès
      vert » pendant 31 jours sans aucun fichier produit, car
      `BACKUP_DATABASE_URL` n'était pas posé).
- [ ] **Télécharger le dump** en local et le **déchiffrer** avec
      `BACKUP_PASSPHRASE` (`openssl enc -d -aes-256-cbc -pbkdf2 -in
      julaba-YYYY-MM-DD.dump.enc -out julaba-YYYY-MM-DD.dump -pass pass:…`).
- [ ] **Test de restauration réussi** sur une base jetable locale (section 4,
      étape 3). Si la restauration échoue → NO-GO.

### 2.2 CI verte

- [ ] **Workflow `invariants.yml`** vert sur `main` (invariants financiers I1-I3
      bloquants verts, I4-I6 `it.failing` inchangés, I7 inchangé — pas de
      régression).
- [ ] **Workflow `schema-pilote.yml`** vert sur `main` (empreinte figée du
      pilote, garde-fou tables + colonnes, second démarrage idempotent).
- [ ] **Workflow `ci.yml`** vert sur `main` (filet rapide : types, lint, unit).

### 2.3 Preuves de convergence (ADR-0002 étapes 1-3)

- [ ] **`npm run verify:dbinit-subsumed` vert** localement (depuis `backend/`,
      sur base jetable). Ce script prouve que `DbInit ⊆ migrations` : sur une
      base neuve construite par les migrations, `DbInit.runInit()` ne change rien
      au schéma (0 objet ajouté / 0 retiré). C'est la **preuve** que `DbInit` est
      un filet redondant, sans lequel la bascule serait imprudente.
- [ ] **27 migrations actives** dans `backend/src/database/migrations/` (hors
      `_archive/`), baseline `1780200000000-BaselineSchema` présente.
- [ ] **31 migrations archivées** dans
      `backend/src/database/migrations/_archive/` (hors glob exécutable).

### 2.4 Validation humaine

- [ ] **Validation Patrick (Audit Global)** — revue du runbook, des empreintes
      de schéma et du lot de code préalable (idempotence baseline). Go formel
      écrit (commentaire de PR ou échange tracé).
- [ ] **Revue Alex (CEO/lead dev)** — confirmation de la disponibilité à opérer.

### 2.5 Créneau de maintenance

- [ ] **Fenêtre de 1 à 2 heures** planifiée, en dehors des heures de marché
      (typiquement 02:00-04:00 UTC, soit 02:00-04:00 à Abidjan UTC+0 — après la
      sauvegarde quotidienne 01:30 UTC).
- [ ] **Communication aux utilisatrices** diffusée si interruption de service
      prévisible (le redéploiement Render entraîne un downtime court : 1-3 min
      pendant le spin-up de la nouvelle instance).

### 2.6 Accès opérationnels

- [ ] **Accès dashboard Render** au service `julaba-api` (pour setter
      `DB_MIGRATIONS_RUN` et redéployer).
- [ ] **Accès lecture à la base de prod** (`BACKUP_DATABASE_URL` ou équivalent)
      pour les requêtes d'audit (lecture seule).
- [ ] **Accès écrit à la base de prod** pour la phase de remédiation du ledger
      (`INSERT INTO migrations …`) si nécessaire.
- [ ] **Postgres client ≥ 18** en local (`pg_dump`/`pg_restore` refusent un
      serveur plus récent qu'eux — `julaba-db` est en PostgreSQL 18).

---

## 3. Étapes de pré-validation (staging)

Avant de toucher à la prod, reproduire la bascule sur un environnement de
preview Render. L'objectif est de prouver que le backend démarre avec
`DB_MIGRATIONS_RUN=true` + `DB_SYNCHRONIZE=false` sans erreur.

### 3.1 Déploiement sur Render preview environment

- [ ] Créer un **preview environment** sur Render depuis la branche portant le
      lot de code préalable (baseline idempotente).
- [ ] Le preview monte une base `julaba-db` **neuve** (vierge) + un service
      `julaba-api` lié.
- [ ] Sur le preview, setter au dashboard :
  - `DB_MIGRATIONS_RUN=true`
  - `DB_SYNCHRONIZE=false`
- [ ] Déclencher un déploiement manuel.

### 3.2 Vérifications sur staging

- [ ] **Le boot termine sans erreur.** Sur un preview avec base vierge,
      `schema-flags.ts` active `synchronize=true` + `migrationsRun=false` (cas
      vierge). Pour tester réellement le chemin « base existante + migrations »,
      il faut soit : (a) déclencher un second déploiement après le premier
      (la base n'est plus vierge), soit (b) restaurer le dump prod sur la base
      preview. La méthode (b) est plus fidèle.
- [ ] **`migration:show` indique 0 migration en attente** après le boot. À
      exécuter en one-shot sur la base preview (depuis un shell Render ou en
      local via tunnel) :
      ```bash
      cd backend && npm run migration:show
      ```
      Attendu : `[]` (liste vide). Si des migrations apparaissent « pending » →
      le ledger est incohérent avec le schéma → NO-GO.
- [ ] **`/api/v1/health` répond 200 OK** sur l'URL du preview.
- [ ] **`/api/v1/health/net` répond** et indique le bon nombre de sauts proxy
      (`TRUST_PROXY` calibré — voir `docs/AUDIT_THROTTLING.md`).

### 3.3 Tests E2E contre staging

- [ ] **`tests/specs/api.spec.ts`** exécuté contre l'URL du preview (variable
      `BASE` à surcharger). Ce test couvre : login, `GET /caisse/transactions`,
      `GET /stocks`, `GET /caisse/session/today`, et autres endpoints clés.
- [ ] **Aucune régression** sur les invariants financiers I1-I3 (les bloquants)
      et état inchangé de I4-I7.

### 3.4 Critère de sortie staging

**GO staging** uniquement si :
- Boot sans erreur avec `DB_MIGRATIONS_RUN=true` + `DB_SYNCHRONIZE=false`.
- `migration:show` = 0 pending.
- `tests/specs/api.spec.ts` vert.
- `/api/v1/health` et `/api/v1/health/net` verts.

Sinon : **documenter l'écart**, corriger le lot de code préalable, rejouer la
pré-validation staging. Ne pas passer à la prod.

---

## 4. Procédure de bascule (prod)

> ⚠️ **Cette section ne s'exécute qu'après GO staging (section 3) et GO Patrick
> (section 9).** Elle est opérée par Alex, dans le créneau de maintenance.

Procédure pas-à-pas. Chaque étape est vérifiée avant la suivante. En cas
d'échec d'une étape, **ne pas forcer** — appliquer le rollback (section 5) et
documenter.

### 4.1 Sauvegarde pré-bascule (dans le créneau)

1. **Déclencher `sauvegarde-db.yml` manuellement** (onglet Actions → « Sauvegarde
   quotidienne DB » → Run workflow). Attendre le terme (~5-10 min).
2. **Vérifier la taille de l'artefact** téléchargé :
   - Télécharger l'artefact `julaba-dump-YYYY-MM-DD` depuis le run.
   - Déchiffrer : `openssl enc -d -aes-256-cbc -pbkdf2 -in
     julaba-YYYY-MM-DD.dump.enc -out julaba-pre-bascule.dump -pass
     pass:$BACKUP_PASSPHRASE`.
   - **Vérifier `stat -c %s julaba-pre-bascule.dump` ≥ 10 000 octets** (un dump
     vide ou corrompu est typiquement < 1 ko). Si < 10 ko → **NO-GO**, la
     sauvegarde est inutilisable.
3. **Copie de sécurité locale** du dump déchiffré dans un dossier hors Render,
   hors dépôt (voir `docs/SAUVEGARDES.md`).

### 4.2 Restauration du dump sur base de test locale

4. **Préparer une base Postgres locale jetable** (Docker ou instance locale,
   PostgreSQL ≥ 18) :
   ```bash
   docker run --rm -d --name julaba-restore-test -e POSTGRES_PASSWORD=test \
     -e POSTGRES_DB=julaba_restore -p 5433:5432 postgres:18
   ```
5. **Restaurer le dump** :
   ```bash
   pg_restore --clean --if-exists --no-owner \
     -h localhost -p 5433 -U postgres -d julaba_restore \
     julaba-pre-bascule.dump
   ```
   - `--clean --if-exists` : supprime puis recrée les objets (safe sur base
     jetable).
   - `--no-owner` : ignore les `OWNER` du dump (sinon `permission denied`).
   - En cas d'erreurs non fatales (warnings sur objets préexistants), les
     vérifier une à une — elles ne doivent pas concerner des tables
     applicatives.

### 4.3 Vérification du schéma et du ledger sur la base restaurée

6. **Vérifier l'empreinte du schéma** contre la référence committée
   `docs/etape4/schema-attendu-apres-bascule.fp` :
   ```bash
   psql -h localhost -p 5433 -U postgres -d julaba_restore -tA \
     -f docs/etape4/schema-fingerprint.sql | grep . | sort > restore.fp
   diff docs/etape4/schema-attendu-apres-bascule.fp restore.fp
   ```
   - Attendu : **diff nul** (ou écarts documentés et expliqués — objets
     prod-spécifiques en trop tolérés, mais **aucun objet attendu manquant**).
   - Si écarts inexpliqués → **NO-GO**. Le schéma prod a dérivé depuis le dump de
     référence ; il faut d'abord réconcilier.
7. **Vérifier le contenu du ledger `migrations`** sur la base restaurée :
   ```sql
   SELECT to_regclass('public.migrations') AS table_existe;
   SELECT count(*) FROM migrations;
   SELECT * FROM migrations ORDER BY "timestamp";
   ```
   - **Si la table n'existe pas ou est vide** : le schéma a été construit par
     `synchronize` + `DbInit`, jamais enregistré. Il faut **peupler le ledger**
     avant la bascule (étape 8 ci-dessous).
   - **Si la table contient déjà** `BaselineSchema1780200000000` **et**
     `FixSchemaDrifts1780300000000` : passer directement à l'étape 9.
8. **Peupler le ledger `migrations`** (le `--fake` de la baseline + de
   `FixSchemaDrifts`) — opération **écriture** sur la base restaurée de test
   d'abord, puis sur la prod à l'étape 10. Sur la base restaurée :
   ```sql
   CREATE TABLE IF NOT EXISTS migrations (
     id SERIAL PRIMARY KEY,
     "timestamp" bigint NOT NULL,
     name varchar NOT NULL
   );
   INSERT INTO migrations ("timestamp", name)
   VALUES
     (1780200000000, 'BaselineSchema1780200000000'),
     (1780300000000, 'FixSchemaDrifts1780300000000')
   ON CONFLICT DO NOTHING;
   ```
   > ⚠️ Cette étape suppose que le schéma restauré **correspond exactement** à
   > l'état produit par la baseline + `FixSchemaDrifts`. L'empreinte A1
   > (étape 6) le prouve. Si elle ne correspond pas, **ne pas faker** — corriger
   > d'abord la cause de la dérive.
9. **Lancer `npm run migration:show` sur la base restaurée** :
   ```bash
   cd backend
   DB_HOST=localhost DB_PORT=5433 DB_USERNAME=postgres DB_PASSWORD=test \
     DB_NAME=julaba_restore DB_SSL=false \
     npm run migration:show
   ```
   - **Attendu : `[]` (0 migration en attente).**
   - Si des migrations apparaissent « pending » → le schéma ne correspond pas au
     ledger attendu → **NO-GO**. Investiguer (migration manquante dans le ledger,
     ou schéma en avance sur le ledger).
10. **Répéter les étapes 6-9 sur la base de prod** (avec les accès prod). Le
    `--fake` doit être appliqué sur la prod si le ledger y est vide. C'est
    l'**écriture prod** la plus risquée — la faire dans une transaction
    atomique :
    ```sql
    BEGIN;
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      "timestamp" bigint NOT NULL,
      name varchar NOT NULL
    );
    INSERT INTO migrations ("timestamp", name)
    VALUES
      (1780200000000, 'BaselineSchema1780200000000'),
      (1780300000000, 'FixSchemaDrifts1780300000000')
    ON CONFLICT DO NOTHING;
    COMMIT;
    ```
    Puis vérifier `migration:show` = `[]` sur la prod.

### 4.4 Bascule du drapeau

11. **Sur le dashboard Render** du service `julaba-api`, setter (variables
    d'environnement permanentes) :
    - `DB_MIGRATIONS_RUN` = `true`
    - `DB_SYNCHRONIZE` = `false`
    - ⚠️ **Ne pas modifier `render.yaml`** dans ce lot (la divergence
      fichier/dashboard est assumée pendant la phase de stabilité, résorbée au
      lot post-bascule section 7).
12. **Redéployer `julaba-api`** sur Render (Manual Deploy → Deploy latest commit,
    ou push d'un commit noop sur la branche suivie).

### 4.5 Vérification post-bascule (prod)

13. **Surveiller les logs de boot** Render du service `julaba-api`. Attendre le
    message indiquant que l'API écoute sur son port (pas d'erreur
    `already exists`, pas de crash-loop).
14. **`GET /api/v1/health`** → attendu `200 OK` (sur
    `https://julaba-api.onrender.com/api/v1/health` ou le domaine prod réel).
15. **`GET /api/v1/health/net`** → attendu `200 OK` avec `TRUST_PROXY` calibré
    (nombre de sauts proxy correct — voir `docs/AUDIT_THROTTLING.md`). Sans cette
    calibration, les quotas par IP (login 5/min) deviennent un verrou collectif.
16. **Smoke test fonctionnel** (lecture seule) :
    - `POST /api/v1/auth/login` avec un compte réel (marchande pilote) → 200,
      cookie de session posé.
    - `GET /api/v1/caisse/transactions` → 200, payload valide (liste non nulle
      si la marchande a un historique).
    - `GET /api/v1/stocks` → 200, payload valide.
    - `GET /api/v1/wallets/me` → 200, solde lisible.
    - Optionnel : `GET /api/v1/caisse/session/{today}` → 200.
17. **Vérifier `migration:show` post-boot** sur la prod (depuis un shell Render
    ou en local via tunnel) → attendu `[]` (0 pending). Prouve que le boot
    n'a rien tenté de rejouer.
18. **Surveiller Sentry 30 minutes** :
    - Aucune nouvelle erreur critique (transaction échouée, `QueryFailedError`,
      crash).
    - Si Sentry n'est pas branché (`SENTRY_DSN` absent) → surveiller les logs
      Render à la place.
19. **Communiquer la fin de maintenance** aux utilisatrices (si interruption
    annoncée) et à l'équipe.

---

## 5. Plan de rollback

Le rollback est **premier geste** en cas d'anomalie. Il doit être exécutable en
moins de 5 minutes.

### 5.1 Rollback drapeau (erreur au démarrage)

**Symptôme** : après redéploiement, l'API ne démarre pas (crash-loop Render,
`already exists`, `QueryFailedError` au boot).

1. **Sur le dashboard Render**, restaurer les variables :
   - `DB_MIGRATIONS_RUN` = `false`
   - `DB_SYNCHRONIZE` = (supprimer la variable, pour revenir au comportement
     `schema-flags.ts` : `synchronize` auto sur base vierge, `false` sur base
     existante)
2. **Redéployer `julaba-api`** sur Render.
3. **Vérifier** `GET /api/v1/health` → 200 OK.
4. **Vérifier** que le schéma n'a pas été partiellement modifié (si une
   migration avait commencé à tourner avant l'échec, elle a rollbacké — TypeORM
   exécute chaque migration dans une transaction).
5. **Documenter l'incident** dans `.ai/INCIDENTS.md` (format INC-XXX).

### 5.2 Rollback données (corruption avérée)

**Symptôme** : données corrompues, ledger `migrations` incohérent, ou schéma
altéré par une migration mal fichue.

1. **Mettre `julaba-api` en maintenance** (page d'attente ou simplement
   `DB_MIGRATIONS_RUN=false` + redéploiement — l'API repart sur le schéma
   `synchronize` + `DbInit`).
2. **Restaurer le dump pré-bascule** sur la base de prod :
   ```bash
   pg_restore --clean --if-exists --no-owner -d "$PROD_DATABASE_URL" \
     julaba-pre-bascule.dump
   ```
   - ⚠️ `--clean --if-exists` supprime puis recrée les objets. **Toutes les
     données post-dump sont perdues.** À n'utiliser que si le dump pré-bascule
     est plus récent que la corruption.
3. **Vérifier** `GET /api/v1/health` et smoke test lecture seule.
4. **Documenter l'incident** dans `.ai/INCIDENTS.md` (sévérité P0/P1 selon
   impact terrain).
5. **Post-mortem obligatoire** avant toute nouvelle tentative de bascule.

### 5.3 Rollback ledger (fake intempestif)

**Symptôme** : le `--fake` (étape 10) a été appliqué alors que le schéma ne
correspondait pas à la baseline + `FixSchemaDrifts`. L'API démarre mais
`migration:show` est incohérent (par exemple : une migration future s'applique
sur un schéma qui n'est pas à jour).

1. **Supprimer les lignes faker** :
   ```sql
   DELETE FROM migrations
    WHERE name IN ('BaselineSchema1780200000000',
                   'FixSchemaDrifts1780300000000');
   ```
2. Revenir à `DB_MIGRATIONS_RUN=false`.
3. Ré-auditer le schéma (section 4.3 étape 6) avant toute nouvelle tentative.

---

## 6. Critères de succès

La bascule est déclarée **réussie** si toutes les conditions suivantes sont
vraies simultanément :

- [ ] **Backend démarre sans erreur** après redéploiement (pas de crash-loop
      Render, logs propres).
- [ ] **`GET /api/v1/health` 200 OK** sur l'URL prod.
- [ ] **`GET /api/v1/health/net` 200 OK** avec `TRUST_PROXY` calibré.
- [ ] **`migration:show` = `[]`** post-boot sur la prod (0 migration pending).
- [ ] **Aucune régression sur les invariants I1-I7** : I1/I2/I3 verts (bloquants),
      I4/I5/I6 inchangés (`it.failing`), I7 inchangé (couvert par I2). À vérifier
      au prochain run CI `invariants.yml` sur `main`.
- [ ] **Aucune erreur Sentry critique pendant 30 min** post-bascule (ou, à
      défaut de Sentry, logs Render propres).
- [ ] **Smoke tests verts** : login + `GET /caisse/transactions` + `GET /stocks`
      + `GET /wallets/me` tous 200 OK avec payload valide.
- [ ] **Patrick valide** formellement (commentaire ou échange tracé).
- [ ] **Empreinte schéma prod** = `schema-attendu-apres-bascule.fp` (diff nul
      après exécution de l'audit A1 sur la prod, cf. section 4.3 étape 6).

Si une seule case ne peut être cochée → rollback (section 5) et NO-GO.

---

## 7. Post-bascule (lot ultérieur)

Cette section décrit les actions à planifier **une fois la bascule stable
pendant 1 semaine** en prod. Elles ne font PAS partie du présent runbook.

### 7.1 Stabilisation observée

- [ ] **7 jours consécutifs** sans incident prod lié au schéma.
- [ ] **7 jours de boots propres** (pas de `already exists`, pas de
      `QueryFailedError` au boot).
- [ ] **3 redéploiements** au moins observés sans régression (Render spin-up +
      spin-down).

### 7.2 Retrait de `DbInitService`

- [ ] **Créer ADR-0005 « Retrait DbInitService »** décrivant :
  - La preuve `verify:dbinit-subsumed.cjs` (DbInit ⊆ migrations).
  - Le retrait du code `backend/src/database/db-init.service.ts` (765 LOC).
  - Le retrait de l'appel `dbInit.runInit()` dans `main.ts`.
  - La mise à jour de `schema-pilote.spec.ts` (le test appelle encore
    `dbInit.runInit()` dans son `beforeAll` — à adapter).
- [ ] **Merger le retrait** après revue + tests CI complets.
- [ ] **Vérifier** que `verify:dbinit-subsumed.cjs` devient un no-op (le script
      ne trouvera plus `DbInitService` dans `dist/`).

### 7.3 Fermeture de la dette SCHEMA-01/02/03

Une fois `DbInitService` retiré et la bascule stable, les entries du registre
maître peuvent être **FERMÉES** :

- [ ] **SCHEMA-01** (P1) — « Trois mécanismes coexistent » → FERMÉ (un seul
      mécanisme : migrations).
- [ ] **SCHEMA-02** (P1) — « `schema-flags.ts` multiplie les chemins » → FERMÉ
      (`synchronize` désactivé en permanence, `schema-flags.ts` simplifié ou
      retiré).
- [ ] **SCHEMA-03** (P1) — « Évolutions recopiées à la main dans DbInit » →
      FERMÉ (DbInit retiré).

### 7.4 Synchronisation `render.yaml`

- [ ] **Mettre à jour `render.yaml`** pour refléter l'état dashboard :
      `DB_MIGRATIONS_RUN=true`, `DB_SYNCHRONIZE=false` (variables permanentes
      explicites). Lever la divergence fichier/dashboard.
- [ ] **Mettre à jour `backend/test/unit/migrations-prod.spec.ts`** pour
      refléter le nouvel invariant : la baseline sait adopter un schéma
      existant (idempotente), et `render.yaml` porte `DB_MIGRATIONS_RUN="true"`.

---

## 8. Risques et mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|------------|
| R1 | La baseline rejoue ses `CREATE TYPE` sur un schéma existant (incident 18/09/2026 reproduit) | Moyenne | **Critique** (API morte au boot) | (a) Idempotence de la baseline pré-requis (section 1.3). (b) Ledger peuplé avant activation du drapeau (section 4.3 étape 10). (c) Rollback drapeau < 5 min (section 5.1). |
| R2 | Le schéma prod a dérivé depuis le dump de référence (empreinte A1 non nulle) | Moyenne | Élevé (bascule bloque) | Audit A1 systématique (section 4.3 étape 6). Si diff inexpliqué → NO-GO, réconcilier d'abord. |
| R3 | Le `--fake` est appliqué alors que le schéma ne correspond pas à la baseline | Faible | **Critique** (ledger menteur, futures migrations appliquées sur faux état) | L'audit A1 (empreinte) est **bloquant** avant tout `--fake`. L'étape 8 suppose A1 vert. |
| R4 | Sauvegarde prod corrompue ou vide (incident 18/09/2026 reproduit) | Faible | **Critique** (pas de rollback possible) | Vérification de la **taille** de l'artefact ≥ 10 ko (section 4.1 étape 2). Test de restauration locale avant tout (section 4.2). |
| R5 | `pg_restore` échoue en local (version client < serveur) | Moyenne | Faible (délai) | Postgres client ≥ 18 en local (pré-requis section 2.6). Le workflow `sauvegarde-db.yml` installe `postgresql-client-18`. |
| R6 | Downtime prolongé pendant le redéploiement Render | Élevée | Moyen (interruption de caisse) | Créneau de maintenance hors heures de marché (section 2.5). Communication aux utilisatrices. Render garde l'instance précédente si le nouveau déploiement échoue. |
| R7 | Régression sur invariants financiers I1-I3 (vente, stock, idempotence) | Faible | **Critique** (argent des marchandes) | CI `invariants.yml` verte pré-requis. Smoke tests post-bascule (section 4.5 étape 16). Surveillance Sentry 30 min. |
| R8 | `TRUST_PROXY` mal calibré → quotas IP partagés (verrou collectif au login) | Moyenne | Élevé (login bloqué pour toutes les marchandes derrière le routeur Render) | Vérifier `/api/v1/health/net` post-bascule (section 4.5 étape 15). Voir `docs/AUDIT_THROTTLING.md`. |
| R9 | Dérive fichier/dashboard (`render.yaml` dit `false`, dashboard dit `true`) | Élevée | Faible (confusion) | Documentée dans ce runbook (section 1.3 + 4.4 étape 11). Résorbée au lot post-bascule (section 7.4). |
| R10 | Un nouveau commit sur `main` pendant le créneau déclenche un auto-deploy avec drapeau intermédiaire | Faible | Moyen | `render.yaml` a `autoDeploy: true` sur `julaba-api`. Pendant le créneau, éviter de merger des PR sur `main`. Communicer à l'équipe. |
| R11 | Test `migrations-prod.spec.ts` rouge après mise à jour du code (lot préalable) | Élevée | Faible (CI rouge bloque le merge du lot préalable) | Le test est intentionnellement conçu pour rougir quand la baseline devient idempotente — sa mise à jour fait partie du lot préalable (section 1.3 point 2). |
| R12 | `DbInitService` retiré trop tôt (avant stabilisation) | Faible | **Critique** (perte du filet de sécurité) | Retrait explicitement différé au lot post-bascule après 1 semaine stable (section 7.2). |

---

## 9. Validation humaine

Ce runbook ne peut être exécuté que si **toutes** les cases suivantes sont
cochées. La checklist est à remplir par Alex (opérateur) et Patrick (validateur).

### 9.1 Revue du runbook

- [ ] **Runbook revu par Alex** (Tech Lead / CEO / lead dev) — compréhension
      complète de la procédure, des rollback, des pré-requis.
- [ ] **Runbook validé par Patrick** (Audit Global) — validation formelle de la
      méthode, des risques, des critères de succès.

### 9.2 Pré-requis vérifiés (section 2)

- [ ] Lot de code préalable mergé (baseline idempotente + test
      `migrations-prod.spec.ts` mis à jour).
- [ ] Backup DB chiffré récent, taille ≥ 10 ko, test de restauration réussi.
- [ ] CI verte (`invariants.yml`, `schema-pilote.yml`, `ci.yml`).
- [ ] `verify:dbinit-subsumed` vert localement.
- [ ] 27 migrations actives, 31 archivées.

### 9.3 Pré-validation staging (section 3)

- [ ] Preview environment déployé avec `DB_MIGRATIONS_RUN=true` +
      `DB_SYNCHRONIZE=false`.
- [ ] Boot sans erreur, `migration:show` = `[]`.
- [ ] `tests/specs/api.spec.ts` vert contre staging.
- [ ] `/api/v1/health` et `/api/v1/health/net` verts sur staging.

### 9.4 Planification

- [ ] **Créneau de maintenance planifié** (1-2h, hors heures de marché).
- [ ] **Communication aux utilisatrices** diffusée (si interruption prévisible).
- [ ] **Accès opérationnels confirmés** (Render dashboard, base prod lecture +
      écriture, Postgres client ≥ 18).

### 9.5 Go formel

- [ ] **Go Patrick écrit** (commentaire de PR, échange tracé, ou signature
      physique de ce runbook).
- [ ] **Go Alex écrit** (disponibilité à opérer dans le créneau).

---

## Annexe A — Références

### A.1 Documents internes

- `docs/adr/ADR-0002-convergence-schema-migrations.md` — ADR source.
- `docs/etape4/RUNBOOK-bascule-migrations.md` — runbook historique (2026-08-15,
  exécuté puis invalidé par l'incident 18/09/2026).
- `docs/etape4/BASCULE-EXECUTEE-2026-08-15.md` — procès-verbal de la bascule
  historique.
- `docs/etape4/schema-fingerprint.sql` — requête d'empreinte de schéma (méthode
  A1).
- `docs/etape4/schema-attendu-prod-actuelle.fp` — empreinte attendue avant
  bascule (666 objets).
- `docs/etape4/schema-attendu-apres-bascule.fp` — empreinte attendue après
  bascule (665 objets).
- `docs/SAUVEGARDES.md` — runbook de sauvegarde / restauration.
- `docs/AUDIT_THROTTLING.md` — calibration `TRUST_PROXY`.
- `docs/dette/REGISTRE-MAITRE.md` — registre dette (SCHEMA-01/02/03 P1 OUVERT).
- `docs/invariants/TABLEAU_DE_BORD.md` — état des invariants I1-I7.
- `.ai/INCIDENTS.md` — incident du 18/09/2026 documenté.

### A.2 Code source

- `backend/src/database/db-init.service.ts` — DDL idempotent (765 LOC, à retirer
  au lot post-bascule).
- `backend/src/database/schema-flags.ts` — décision
  `synchronize` / `migrationsRun` au boot.
- `backend/scripts/verify-dbinit-subsumed.cjs` — preuve `DbInit ⊆ migrations`.
- `backend/test/unit/migrations-prod.spec.ts` — verrou anti-réactivation
  (intentionnellement rouge quand la baseline devient idempotente).
- `backend/test/invariants/schema-pilote.spec.ts` — verrou schéma figé.
- `backend/src/database/migrations/1780200000000-BaselineSchema.ts` — baseline
  (à rendre idempotente dans le lot préalable).
- `backend/src/database/migrations/1780300000000-FixSchemaDrifts.ts` —
  correction des drifts (uuid + FK + drop colonnes fantômes).
- `render.yaml` — config prod actuelle (`DB_MIGRATIONS_RUN=false`).

### A.3 CI / workflows

- `.github/workflows/sauvegarde-db.yml` — dump quotidien chiffré.
- `.github/workflows/invariants.yml` — invariants financiers (Postgres jetable).
- `.github/workflows/schema-pilote.yml` — verrou schéma figé.

### A.4 Tests E2E

- `tests/specs/api.spec.ts` — smoke tests API (login, caisse, stocks, wallets).

---

## Annexe B — Historique des versions

| Version | Date       | Auteur        | Changement                                                              |
|---------|------------|---------------|-------------------------------------------------------------------------|
| 1.0     | 2026-08-15 | Tech Lead     | Runbook initial (lowercase `RUNBOOK-bascule-migrations.md`), exécuté.   |
| 2.0     | 2026-09-29 | Agent Tech Lead (INIT-010) | Runbook **superseding** après incident 18/09/2026. Pré-requis idempotence baseline. Audit A1 renforcé. Cas de la divergence fichier/dashboard explicitée. Retrait `DbInit` différé au lot post-bascule. Statut : **PRÉPARÉ, EN ATTENTE DE VALIDATION HUMAINE POUR EXÉCUTION.** |
