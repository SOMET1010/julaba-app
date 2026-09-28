# REGRESSIONS.md — Régressions détectées JULABA

> Registre des régressions. Format : REG-XXX.

## État au 2026-09-28

- **Total régressions** : 0 (registre initialisé)
- **Bloquantes (P0)** : 0
- **Majeures (P1)** : 0
- **Mineures (P2)** : 0
- **Résolues** : 0

## Format d'enregistrement

```
### REG-XXX — [Titre court]
- **Priorité** : P0 | P1 | P2
- **Statut** : OUVERT | RÉSOLU
- **Date détection** : YYYY-MM-DD
- **Détecté par** : Agent QA
- **Commit introduisant** : <SHA>
- **Commit corrigeant** : <SHA>
- **Description** : ...
- **Test révélateur** : ...
- **Impact** : ...
- **Résolution** : ...
- **Date résolution** : YYYY-MM-DD
- **Leçon apprise** : ...
```

## Garde-fous anti-régression existants

### Backend
- **Cliquets Jest** (`it.failing` -> `it`) : un blocker corrigé mais non promu fait échouer la CI
- **48 tests d'invariants** sur vrai PostgreSQL jetable
- **Verrou schéma figé** (`schema-pilote.yml`)
- **Script `verify-dbinit-subsumed.cjs`** : prouve que `DbInitService` ⊆ migrations

### Frontend
- **Gate TypeScript cliquet** (`ci/check-tsc-baseline.mjs` + `ci/tsc-baseline.txt` = 0)
- **Budget bundle CI** (`check-bundle-budget.mjs` 800 KB max)
- **8 scripts de garde-fou source** dans `scripts/`
- **`caisseCharte.test.mts`** : pas de couleurs en dur dans POSCaisse

### CI
- `ci.yml` (filet intégration)
- `invariants.yml` (invariants métier)
- `schema-pilote.yml` (verrou schéma)

## Régressions historiques connues (depuis `JULABA_DECISIONS.md`)

### Incident 18/09/2026 — `caisse_transaction_status_enum already exists`
- **Cause** : `DB_MIGRATIONS_RUN=true` en prod après une migration TypeORM qui tentait de recréer un enum existant.
- **Correctif** : `DB_MIGRATIONS_RUN=false` en prod (workaround).
- **Dette ouverte** : SCHEMA-01/02/03 P1 architecture (3 mécanismes coexistent).
- **Leçon** : Migrations TypeORM désactivées en prod jusqu'à finalisation ADR-0002 étape 4.

### SCHEMA-07 — Trouvé par `schema-pilote.yml` avant le terrain
- **Cause** : Schéma divergent entre base vierge et base existante.
- **Correctif** : Gate `schema-pilote.yml` ajouté en CI.
- **Leçon** : Toujours valider l'empreinte schéma en CI.

## Surveillance active

L'Agent QA doit surveiller en priorité :
1. **Vente offline** : cohérence DB après rejeu (recette-pilote2-offline.mjs)
2. **Idempotence financière** : wallet_transactions, caisse_transactions, fidelite_evenements
3. **Verrous pessimistes** : `pessimistic_write` sur Wallet
4. **Sanitization** : `stripSensitiveUserFields` + `ClassSerializerInterceptor`
5. **Allow-list rôles** : fail-closed sur `super_admin`
6. **Argent gelé** : B-Pay / Keiwa / mobile money (invariant `argent-gele-b2.spec.ts`)
