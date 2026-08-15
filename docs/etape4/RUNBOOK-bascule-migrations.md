# Runbook — #10 Étape 4 : bascule prod vers `migrationsRun` (ADR-0002)

**Statut : PLAN — non exécuté.** Aucune action prod avant audit + Go explicite.
La base de prod est la source de vérité ; on ne la reconstruit jamais.

Principe : la bascule n'est **pas** un `--fake` de tout. La prod est ≈ l'état
**baseline** (`1780200000000`), avec les colonnes fantômes `recoltes` et
`cooperative_id`/`membre_id` en `varchar`. Donc :
- **`--fake` de la baseline** (schéma déjà présent) — on marque, on n'exécute pas ;
- **exécution RÉELLE de `FixSchemaDrifts`** (`1780300000000`) — vraie conversion
  (`uuid` + FK, drop des colonnes fantômes).

Références committées (empreintes de schéma normalisées, générées sur base
jetable) :
- `docs/etape4/schema-attendu-prod-actuelle.fp` (666 objets) — ce à quoi prod
  **devrait** ressembler AVANT la bascule (état baseline).
- `docs/etape4/schema-attendu-apres-bascule.fp` (665 objets) — état **attendu
  APRÈS** la bascule.
- Delta connu (le seul) : `cooperative_id`/`membre_id` varchar→uuid ; drop
  `recoltes.producteur_id`/`zone_id` ; ajout FK `cooperative_membres_cooperative_id_fkey`.

---

## Phase 1 — AUDIT PROD (LECTURE SEULE, aucune écriture)

À exécuter sur la base de prod. Toutes ces requêtes sont en lecture seule.

### A1. Empreinte de schéma → comparer à la référence
```sql
SELECT 'col:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable
  FROM information_schema.columns WHERE table_schema='public' AND table_name<>'migrations'
UNION ALL
SELECT 'con:'||conname||':'||contype::text||':'||conrelid::regclass::text
  FROM pg_constraint WHERE connamespace='public'::regnamespace
    AND conname NOT LIKE 'PK_%' AND conrelid::regclass::text<>'migrations'
UNION ALL
SELECT 'idx:'||indexname||':'||tablename FROM pg_indexes
  WHERE schemaname='public' AND tablename<>'migrations'
UNION ALL
SELECT 'view:'||table_name FROM information_schema.views WHERE table_schema='public'
ORDER BY 1;
```
Sauver la sortie (une ligne par objet) → `prod.fp`, puis :
`diff docs/etape4/schema-attendu-prod-actuelle.fp prod.fp`.
- Lignes **en trop en prod** (objets prod-spécifiques hors dépôt) : à documenter,
  généralement tolérables.
- Lignes **manquantes en prod** (attendues mais absentes) : **CRITIQUE** — le
  `--fake` prétendrait qu'elles existent. À créer/réconcilier AVANT toute bascule.

### A2. État de la table d'historique des migrations
```sql
SELECT to_regclass('public.migrations') AS migrations_table;   -- attendu : NULL (migrationsRun a toujours été OFF)
-- si NON NULL :
SELECT * FROM migrations ORDER BY "timestamp";
```

### A3. Sûreté de `FixSchemaDrifts` (la migration réellement exécutée)
```sql
-- (a) orphelins : bloqueraient l'ajout de la FK
SELECT count(*) AS orphelins FROM cooperative_membres m
  LEFT JOIN cooperatives c ON c.id::text = m.cooperative_id::text
 WHERE m.cooperative_id IS NOT NULL AND c.id IS NULL;

-- (b) valeurs non castables en uuid : bloqueraient ALTER TYPE uuid
SELECT
  count(*) FILTER (WHERE cooperative_id IS NOT NULL AND cooperative_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS coop_id_non_uuid,
  count(*) FILTER (WHERE membre_id IS NOT NULL AND membre_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS membre_id_non_uuid
  FROM cooperative_membres;

-- (c) colonnes fantômes : doivent être VIDES (on les drop)
SELECT count(*) FILTER (WHERE producteur_id IS NOT NULL) AS producteur_id_non_null,
       count(*) FILTER (WHERE zone_id IS NOT NULL)       AS zone_id_non_null
  FROM recoltes;
```

### A4. Extensions
```sql
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp','pgcrypto');
```

### A5. Volumétrie (dimensionner le lock d'`ALTER TYPE`)
```sql
SELECT relname, n_live_tup FROM pg_stat_user_tables
 WHERE relname IN ('cooperative_membres','recoltes') ORDER BY 1;
```

---

## Phase 2 — CRITÈRES GO / NO-GO

**GO** seulement si TOUT est vrai :
- [ ] A1 : aucun objet **attendu manquant** en prod (les seuls écarts tolérés sont
      des objets prod-spécifiques en trop, documentés).
- [ ] A2 : table `migrations` absente (ou contenu connu et compatible).
- [ ] A3(a) : `orphelins = 0`.
- [ ] A3(b) : `coop_id_non_uuid = 0` **et** `membre_id_non_uuid = 0`.
- [ ] A3(c) : `producteur_id_non_null = 0` **et** `zone_id_non_null = 0`
      (sinon : investiguer/sauvegarder ces données avant de droper).
- [ ] Sauvegarde base + schéma effectuée (point de rollback).
- [ ] Fenêtre de faible trafic (l'`ALTER TYPE` verrouille `cooperative_membres`).

**NO-GO** si un écart A1 inexpliqué, des orphelins, des valeurs non-uuid, ou des
données dans les colonnes fantômes. On corrige la cause d'abord.

---

## Phase 3 — EXÉCUTION (uniquement après GO)

Ordre STRICT. Chaque étape est vérifiée avant la suivante.

1. **Sauvegarde** : dump schéma + données (rétention selon politique).
2. **Marquer la baseline « déjà appliquée » sans l'exécuter** (fake ciblé — on ne
   fake QUE la baseline, pas `FixSchemaDrifts`) :
   ```sql
   CREATE TABLE IF NOT EXISTS migrations (
     id SERIAL PRIMARY KEY, "timestamp" bigint NOT NULL, name varchar NOT NULL);
   INSERT INTO migrations ("timestamp", name)
   VALUES (1780200000000, 'BaselineSchema1780200000000');
   ```
3. **Exécuter réellement `FixSchemaDrifts`** (run ponctuel de maintenance, app
   encore en `migrationsRun` OFF) :
   ```bash
   # depuis backend/, env prod en lecture/écriture, one-shot
   npm run migration:run     # data-source.ts : voit la baseline enregistrée,
                             # exécute UNIQUEMENT FixSchemaDrifts1780300000000
   ```
   Puis **vérifier** : re-jouer A1 sur prod → `diff` == `schema-attendu-apres-bascule.fp`.
4. **Basculer le mécanisme** : variable d'env permanente `DB_MIGRATIONS_RUN=true`
   (et s'assurer que `DB_SYNCHRONIZE` n'est pas `'true'`). Redéployer. Les boots
   suivants ne voient plus de migration pending → no-op.
5. **`DbInit`** : le **laisser en place** (filet de sécurité) pour cette bascule.
   Son retrait est un lot ULTÉRIEUR, une fois quelques boots confirmés sains
   (le contrôle `npm run verify:dbinit-subsumed` garantit qu'il est redondant).

---

## Phase 4 — ROLLBACK

- **Pendant l'exécution** : `FixSchemaDrifts` tourne dans une transaction TypeORM
  → en cas d'échec (orphelin, cast), rollback automatique ; la migration n'est pas
  enregistrée. Corriger la cause (Phase 1 A3) et rejouer l'étape 3.
- **Après coup** :
  - `npm run migration:revert` (exécute `FixSchemaDrifts.down()` : rétablit
    varchar, ré-ajoute `producteur_id`/`zone_id`, drop la FK), **ou** manuellement
    `DELETE FROM migrations WHERE name='FixSchemaDrifts1780300000000';` puis down.
  - `DB_MIGRATIONS_RUN=false` → retour au mécanisme précédent. `DbInit` étant
    resté intact, l'app refonctionne exactement comme avant la bascule.
- **Limite** : le `down` ré-crée les colonnes fantômes mais **pas leurs données**
  (elles doivent être vides — vérifié en A3(c) — et une sauvegarde existe).

---

## Qui exécute quoi

- L'**audit (Phase 1)** et la **sauvegarde** : opérateur avec accès prod
  lecture (audit) puis lecture/écriture (sauvegarde + exécution).
- La **décision Go/No-Go (Phase 2)** : sur la base des sorties d'audit comparées
  aux références committées.
- L'**exécution (Phase 3)** : one-shot manuel, hors cycle de recette, fenêtre
  calme. Ne pas activer `DB_MIGRATIONS_RUN` AVANT le fake de la baseline (sinon le
  boot tenterait d'exécuter la baseline pour de vrai → `already exists`).
