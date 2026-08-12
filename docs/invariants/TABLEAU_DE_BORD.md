# Tableau de bord des invariants financiers

Suivi exécutable des invariants argent/stock/crédit. Les tests vivent dans
`backend/test/invariants/` et tournent en intégration contre une base Postgres
**jetable** (`invariants.yml` en CI, `npm run test:invariants -w backend` en local).

## Mécanique (non bloquant + cliquet)

- Un invariant **satisfait** est écrit `it(...)` : il doit passer (**bloquant**).
- Un invariant **non encore satisfait** (blocker ouvert) est écrit `it.failing(...)` :
  Jest le compte **vert tant qu'il échoue** → il ne bloque pas les merges, mais
  reste **visible**. Dès qu'un correctif (étape 4) le rend vrai, `it.failing`
  **devient rouge** → il faut le **promouvoir en `it(...)` dans la même PR**.
- Quand tous les invariants argent sont en `it(...)` verts, la suite entière est
  obligatoire de bout en bout.

## État courant

| # | Invariant | Statut | Test | Correctif (étape 4) |
|---|-----------|--------|------|---------------------|
| **I1** | Vente **atomique** : 1 vente = 1 `caisse_transaction` + décrément stock, tout-ou-rien | 🔴 | *différé* — exige une injection de panne (test ciblé, pas boîte noire) | transaction DB unique (`queryRunner`), ne plus avaler l'erreur de décrément |
| **I2** | **Idempotence vente** : même `idempotency_key` ⇒ 1 transaction ET 1 décrément | 🟢 | `it` (bloquant) — `i2-idempotence-vente.spec.ts` | — (déjà satisfait) |
| **I3** | **Pas de survente silencieuse** : vendre > stock est refusé (ou tracé), jamais clampé en silence | 🔴 | `it.failing` — `blockers.spec.ts` | garde de stock à la vente (refus) **ou** journal de manquant |
| **I4** | **Idempotence crédit** : même crédit rejoué ⇒ 1 dette, `montant_du` non doublé | 🔴 | `it.failing` — `blockers.spec.ts` | `idempotency_key` + contrainte unique sur `credits` |
| **I5** | **Idempotence acompte** : acompte rejoué ⇒ un seul encaissement | 🔴 | `it.failing` — `blockers.spec.ts` | `idempotency_key` sur `PATCH …/acompte` |
| **I6** | **Traçabilité crédit** : une vente à crédit laisse une trace en caisse (`caisse_transaction`) | 🔴 | `it.failing` — `blockers.spec.ts` | écrire une `caisse_transaction` (type crédit) à la création/au remboursement |
| **I7** | **Cohérence stock au rejeu offline** : rejouer une vente en file ne double pas le décrément | 🟡 | couvert au niveau endpoint par I2 (clé stable) | à renforcer par un test de file dédié si besoin |

Légende : 🟢 satisfait & bloquant · 🔴 blocker ouvert (documenté, non bloquant) · 🟡 partiel/indirect.

## Preuve locale (extrait)

```
[invariants] base jetable recréée : julaba_test
PASS test/invariants/blockers.spec.ts      (4 invariants 🔴 en it.failing)
PASS test/invariants/i2-idempotence-vente.spec.ts   (I2 🟢)
Test Suites: 2 passed · Tests: 5 passed
```

## Règle de gouvernance

Aucun correctif de stock/crédit/idempotence (étape 4) ne doit être mergé sans
que l'invariant correspondant passe de `it.failing` à `it(...)` **vert** dans la
même PR. Le cliquet Jest l'impose mécaniquement : un blocker « corrigé mais non
promu » fait **échouer** la CI.
