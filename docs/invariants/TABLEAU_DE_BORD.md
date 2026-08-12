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
| **I1** | Vente **atomique** : la vente ET tous ses effets d'inventaire (décrément + mouvement d'écart) sont tout-ou-rien | 🟢 | `it` — `i1-i3-atomicite-stock.spec.ts` | ✅ transaction unique `QueryRunner` + `FOR UPDATE`, rien d'avalé, rollback intégral |
| **I2** | **Idempotence vente** : même `idempotency_key` ⇒ 1 transaction ET 1 décrément | 🟢 | `it` (bloquant) — `i2-idempotence-vente.spec.ts` | — (déjà satisfait, préservé après refactor) |
| **I3** | **Survente tracée** : vendre > stock connu est **accepté** (jamais bloqué) mais produit une **trace explicite du manquant** — jamais de clamp silencieux | 🟢 | `it` — `i1-i3-atomicite-stock.spec.ts` | ✅ ledger `stock_mouvements` (stock avant, demandé, retranché, manquant) écrit dans la même transaction |
| **I4** | **Idempotence crédit** : même crédit rejoué ⇒ 1 dette, `montant_du` non doublé | 🔴 | `it.failing` — `blockers.spec.ts` | `idempotency_key` + contrainte unique sur `credits` |
| **I5** | **Idempotence acompte** : acompte rejoué ⇒ un seul encaissement | 🔴 | `it.failing` — `blockers.spec.ts` | `idempotency_key` sur `PATCH …/acompte` |
| **I6** | **Traçabilité crédit** : une vente à crédit laisse une trace en caisse (`caisse_transaction`) | 🔴 | `it.failing` — `blockers.spec.ts` | écrire une `caisse_transaction` (type crédit) à la création/au remboursement |
| **I7** | **Cohérence stock au rejeu offline** : rejouer une vente en file ne double pas le décrément | 🟡 | couvert au niveau endpoint par I2 (clé stable) | à renforcer par un test de file dédié si besoin |

Légende : 🟢 satisfait & bloquant · 🔴 blocker ouvert (documenté, non bloquant) · 🟡 partiel/indirect.

> **I1/I3 — clôture système.** Le correctif backend (transaction + ledger) est vert
> dès ce lot. La **fermeture au niveau du système** exige encore **L2** : retirer
> l'écriture de stock **absolue** côté client (`POSCaisse`), pour que le backend
> soit l'**unique autorité** d'écriture du stock (sinon une valeur périmée pourrait
> l'écraser).
>
> **Ledger `stock_mouvements`** = registre d'intégrité du **stock** (append-only :
> vente, produit, stock avant, demandé, retranché, manquant, date). Il est
> **distinct de I6**, qui concerne la traçabilité **comptable du crédit** — deux
> registres métier séparés.

## Preuve locale (extrait)

```
[invariants] base jetable recréée : julaba_test
PASS test/invariants/i1-i3-atomicite-stock.spec.ts  (I1 + I3 🟢 : normal, survente tracée, panne→rollback)
PASS test/invariants/blockers.spec.ts               (I4/I5/I6 🔴 en it.failing)
PASS test/invariants/i2-idempotence-vente.spec.ts   (I2 🟢)
Test Suites: 3 passed · Tests: 7 passed
```

## Règle de gouvernance

Aucun correctif de stock/crédit/idempotence (étape 4) ne doit être mergé sans
que l'invariant correspondant passe de `it.failing` à `it(...)` **vert** dans la
même PR. Le cliquet Jest l'impose mécaniquement : un blocker « corrigé mais non
promu » fait **échouer** la CI.
