# Étape 4 — Procès-verbal de bascule (EXÉCUTÉE le 2026-08-15)

ADR-0002. Convergence du schéma prod vers des migrations reproductibles.
Bascule réalisée en **fenêtre unique**, canal lecture/écriture direct sur la base
prod Supabase (`public`), après audit A1/A2/A3 tout vert.

> **Cible prod confirmée** : la production tourne sur la base **Supabase**
> `julaba` (PG 17.6). Preuve : l'empreinte A1 de cette base a matché **au md5
> près** la référence `schema-attendu-prod-actuelle.fp` (dérivée du `pg_dump`
> prod) — 728 objets, `acfcd55d8e6003bf61dd791798230faf`. Le `render.yaml`
> décrit une base Render `julaba-db` mais les `DB_*` réels sont surchargés au
> dashboard vers Supabase (les briques Render `julaba-db` ne sont pas la prod).

## Audit préalable (Phase 1) — lecture seule

| Porte | Requête | Résultat |
|---|---|---|
| **A1** | empreinte `schema-fingerprint.sql` vs `schema-attendu-prod-actuelle.fp` | **diff-nul** — `md5` identique (`acfcd55d…0faf`), 728 objets ; aucune dérive depuis le dump |
| **A2** | `to_regclass('public.migrations')` + `count(*)` | table **existe**, **0 ligne** (ardoise vierge) |
| **A3** | castabilité uuid + orphelins FK sur `cooperative_membres` | 3 membres, `coop_id`/`membre_id` non-uuid = **0**, orphelins = **0**, 1 coopérative cible |
| A3-bis | dépendances sur `recoltes.producteur_id`/`zone_id` | **0** dépendance non-auto, **0** FK |

Verdict : **GO** formel.

## Exécution (Phase 3) — une transaction

Snapshot pré-bascule (traçabilité) : 3 `cooperative_membres`, tous
`cooperative_id = dede0000-…-000000000401`, `membre_id` uuid valides ;
`migrations` vide ; `recoltes.producteur_id`/`zone_id` présentes.

```sql
BEGIN;
-- fake ciblé de la baseline (schéma déjà présent)
INSERT INTO migrations("timestamp", name) VALUES (1780200000000, 'BaselineSchema1780200000000');
-- FixSchemaDrifts — DDL réel (identique à la migration up())
ALTER TABLE recoltes DROP COLUMN IF EXISTS producteur_id;
ALTER TABLE recoltes DROP COLUMN IF EXISTS zone_id;
ALTER TABLE cooperative_membres ALTER COLUMN cooperative_id TYPE uuid USING cooperative_id::uuid;
ALTER TABLE cooperative_membres ALTER COLUMN membre_id     TYPE uuid USING membre_id::uuid;
ALTER TABLE cooperative_membres DROP CONSTRAINT IF EXISTS cooperative_membres_cooperative_id_fkey;
ALTER TABLE cooperative_membres
  ADD CONSTRAINT cooperative_membres_cooperative_id_fkey
  FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE CASCADE;
-- inscription du ledger TypeORM pour FixSchemaDrifts
INSERT INTO migrations("timestamp", name) VALUES (1780300000000, 'FixSchemaDrifts1780300000000');
COMMIT;
```

> Choix de canal : DDL appliqué directement (transaction atomique, vérifiable
> immédiatement) plutôt que `migration:run` distant. L'**état final est
> identique** à celui qu'aurait produit `migration:run` : ledger peuplé des deux
> lignes, schéma convergé. Au prochain boot, `migration:run` verra les deux
> migrations enregistrées → **no-op**.

## Vérification post-bascule

| Contrôle | Attendu | Constaté |
|---|---|---|
| empreinte prod vs `schema-attendu-apres-bascule.fp` | `md5 = 57f5cfc23fe5771e44900cb29b32cd43` | **identique** ✅ |
| ledger `migrations` | `[BaselineSchema…, FixSchemaDrifts…]` | conforme ✅ |
| `cooperative_membres.cooperative_id` / `membre_id` | `uuid` | `uuid` / `uuid` ✅ |
| FK `cooperative_membres_cooperative_id_fkey` | présente, validée | `convalidated = true` ✅ |
| `recoltes.producteur_id` / `zone_id` | absentes | 0 colonne restante ✅ |
| données `cooperative_membres` | 3 intactes | 3 ✅ |

Smoke fonctionnel (lecture seule) : `JOIN` uuid `cooperative_membres→cooperatives`
= 3, `→users` (membre_id) = 3, `recoltes` lisible (2 lignes) — tout vert.

## Reste à faire — geste opérationnel (hors code)

**Activer le mécanisme migrations au boot** : sur le dashboard Render du service
`julaba-api`, poser la variable d'environnement permanente **`DB_MIGRATIONS_RUN=true`**
(et vérifier que `DB_SYNCHRONIZE` n'est pas `'true'`), puis redéployer.
- Effet : à chaque boot, TypeORM applique les migrations *pending*. Les deux
  actuelles étant enregistrées → **no-op** immédiat ; les futures s'appliqueront
  automatiquement.
- `DbInitService` reste en place (filet de sécurité, prouvé redondant par
  `npm run verify:dbinit-subsumed`). Son retrait est un lot ultérieur.
- Ne PAS activer `DB_MIGRATIONS_RUN` sur une base où la baseline ne serait pas
  déjà marquée (ici : faite).

## Rollback (si nécessaire)

- `DELETE FROM migrations WHERE name IN ('FixSchemaDrifts1780300000000','BaselineSchema1780200000000');`
  puis `FixSchemaDrifts.down()` (rétablit varchar, ré-ajoute `producteur_id`/`zone_id`,
  drop la FK). Les colonnes fantômes étaient vides (A3) → aucune donnée perdue.
- `DB_MIGRATIONS_RUN=false` → retour au mécanisme `DbInit` d'origine.
