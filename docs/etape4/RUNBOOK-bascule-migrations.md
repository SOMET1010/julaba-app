# Runbook — #10 Étape 4 : bascule prod vers `migrationsRun` (ADR-0002)

**Statut : EXÉCUTÉ le 2026-08-15.** Audit A1/A2/A3 tout vert, GO formel, bascule
réalisée et vérifiée (empreinte prod = `schema-attendu-apres-bascule.fp`). Voir le
procès-verbal détaillé : [`BASCULE-EXECUTEE-2026-08-15.md`](./BASCULE-EXECUTEE-2026-08-15.md).
Seul reste le geste opérationnel `DB_MIGRATIONS_RUN=true` (dashboard Render).
Ce runbook reste la référence de méthode (et de rollback).
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

Exécuter la **requête versionnée** `docs/etape4/schema-fingerprint.sql` (source de
vérité unique de la méthode d'empreinte — utilisée aussi pour générer les
références et prouver le diff nul de la baseline) :

```sh
psql "$PROD_URL" -tA -f docs/etape4/schema-fingerprint.sql | grep . | sort > prod.fp
diff docs/etape4/schema-attendu-prod-actuelle.fp prod.fp
```

L'empreinte couvre colonnes (`col:`), contraintes **PK comprises** (`con:`),
index (`idx:`) et vues (`view:`). Seule la table de métadonnées TypeORM
`migrations` est exclue (colonnes, contrainte PK et index) — objet géré par
TypeORM, hors DDL applicatif. Les contraintes PK sont **conservées** dans
l'empreinte : une PK manquante ou en trop est ainsi détectée.

Provenance des références (régénérables) :
- `schema-attendu-prod-actuelle.fp` = `BaselineSchema` seule, appliquée par
  `runMigrations()` sur une base jetable → **diff nul prouvé** contre un
  `pg_dump` fidèle de la prod (hors table `migrations`).
- `schema-attendu-apres-bascule.fp` = `BaselineSchema` + `FixSchemaDrifts` ; son
  **delta** contre l'état prod-actuelle est **exactement** celui de
  `FixSchemaDrifts` (7 lignes : drop `recoltes.producteur_id`/`zone_id`, retype
  `cooperative_membres.cooperative_id`/`membre_id` varchar→uuid, ajout FK
  `cooperative_membres_cooperative_id_fkey`) — rien d'autre.

Lecture du diff prod ↔ référence :
- Lignes **en trop en prod** (objets prod-spécifiques hors dépôt) : à documenter,
  généralement tolérables.
- Lignes **manquantes en prod** (attendues mais absentes) : **CRITIQUE** — le
  `--fake` prétendrait qu'elles existent. À créer/réconcilier AVANT toute bascule.

### A2. État de la table d'historique des migrations — **PRÉCONDITION BLOQUANTE**

> **Constat d'audit (à jour) :** contrairement à l'hypothèse initiale, la table
> `public.migrations` **existe en prod** (elle figure dans le `pg_dump` de
> référence). Elle est **exclue** du DDL applicatif de la baseline (gérée par
> TypeORM), mais son **contenu** conditionne la bascule : `migration:run --fake`
> **insère** une ligne par migration marquée. Si des lignes préexistent, il faut
> savoir lesquelles pour éviter doublons/incohérences d'horodatage.
>
> **Auditer son contenu est donc une condition préalable, non optionnelle, à
> toute opération de `--fake`.** Le résultat ci-dessous doit être capturé et
> analysé AVANT la Phase de bascule (pas dans la PR baseline).

```sql
SELECT to_regclass('public.migrations') AS migrations_table;   -- constaté : NON NULL
-- OBLIGATOIRE avant tout --fake : lister le contenu existant.
SELECT * FROM migrations ORDER BY "timestamp";
```

Décision selon la sortie :
- **table vide** → `--fake` de `BaselineSchema` + `FixSchemaDrifts` insère
  proprement les deux lignes ; rien à réconcilier.
- **lignes préexistantes** (ex. reliquat d'anciens essais) → **CRITIQUE** :
  décider table par table s'il faut purger, conserver ou ré-horodater AVANT de
  faker, sous peine de collision de clé ou d'historique menteur.

### A3. PORTE-DONNÉES — `FixSchemaDrifts` réussira-t-elle sur les données réelles ?

> Un schéma conforme (A1) **ne garantit pas** que la migration passe : une seule
> valeur non castable ou orpheline la fait échouer. Cette porte est **bloquante**
> et doit être **re-jouée juste avant** l'exécution (Phase 3 étape 3) — les
> données peuvent changer entre l'audit et la bascule.

Le motif uuid réutilisé ci-dessous :
`'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'` (insensible à la
casse). Il rejette aussi la **chaîne vide** `''` (varchar NOT NULL peut contenir
`''`, or `''::uuid` échoue).

```sql
-- (a) valeurs non castables en uuid → bloqueraient `ALTER COLUMN ... TYPE uuid`
--     (couvre NULL-safe : NULL::uuid est valide ; on ne compte que les non-NULL
--      qui ne matchent pas, dont la chaîne vide).
SELECT
  count(*) FILTER (WHERE cooperative_id IS NOT NULL AND cooperative_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS coop_id_non_uuid,
  count(*) FILTER (WHERE membre_id      IS NOT NULL AND membre_id      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS membre_id_non_uuid
  FROM cooperative_membres;

-- (a') LISTER les lignes fautives (pour inspection/correction ciblée avant bascule)
SELECT id, cooperative_id, membre_id FROM cooperative_membres
 WHERE (cooperative_id IS NOT NULL AND cooperative_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    OR (membre_id      IS NOT NULL AND membre_id      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
 LIMIT 100;

-- (b) orphelins vis-à-vis de la FK cible (cooperative_membres.cooperative_id →
--     cooperatives.id) → bloqueraient l'ADD CONSTRAINT. On compare en ::text pour
--     rester valide même tant que la colonne est varchar.
SELECT count(*) AS coop_orphelins FROM cooperative_membres m
  LEFT JOIN cooperatives c ON c.id::text = m.cooperative_id::text
 WHERE m.cooperative_id IS NOT NULL AND c.id IS NULL;

-- (b') LISTER les orphelins (cooperative_id sans cooperative correspondante)
SELECT m.id, m.cooperative_id FROM cooperative_membres m
  LEFT JOIN cooperatives c ON c.id::text = m.cooperative_id::text
 WHERE m.cooperative_id IS NOT NULL AND c.id IS NULL
 LIMIT 100;

-- (b'') sanité de données (pas de FK posée, mais informe) : membre_id sans user
SELECT count(*) AS membre_sans_user FROM cooperative_membres m
  LEFT JOIN users u ON u.id::text = m.membre_id::text
 WHERE m.membre_id IS NOT NULL AND u.id IS NULL;

-- (c) colonnes fantômes recoltes : doivent être VIDES (on les DROP → données perdues)
SELECT count(*) FILTER (WHERE producteur_id IS NOT NULL) AS producteur_id_non_null,
       count(*) FILTER (WHERE zone_id IS NOT NULL)       AS zone_id_non_null
  FROM recoltes;
```

**Interprétation / traitement si non conforme :**
- `coop_id_non_uuid` ou `membre_id_non_uuid > 0` → corriger/normaliser les valeurs
  fautives (liste a') **avant** la bascule ; sinon `ALTER TYPE uuid` échoue.
- `coop_orphelins > 0` → les lignes (liste b') empêcheraient la FK. Décider :
  nettoyer les orphelins, ou recréer la cooperative manquante. **Ne pas** poser la
  FK tant qu'il en reste.
- `producteur_id_non_null` / `zone_id_non_null > 0` → données inattendues dans des
  colonnes réputées mortes : investiguer + sauvegarder avant de droper.

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
- [ ] A3 PORTE-DONNÉES (bloquante) : `coop_id_non_uuid = 0`, `membre_id_non_uuid = 0`,
      `coop_orphelins = 0`, `producteur_id_non_null = 0`, `zone_id_non_null = 0`.
      (`membre_sans_user` : informatif, pas bloquant — pas de FK posée dessus.)
- [ ] A3 re-jouée **juste avant** l'exécution (Phase 3 étape 3), résultats inchangés.
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
3. **RE-JOUER la porte-données A3** (les données ont pu changer depuis l'audit) —
   n'avancer que si tous les compteurs bloquants sont à 0. Puis **exécuter
   réellement `FixSchemaDrifts`** (run ponctuel de maintenance, app encore en
   `migrationsRun` OFF) :
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
