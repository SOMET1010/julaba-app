# HANDOFF — TEAM_TO_QA

> Passation de l'équipe vers l'Agent QA : code prêt à tester.

## Feature concernée

- **ID** : FEATURE-XXX
- **Branche** : `feature/XXX`
- **Commit** : <SHA>
- **Statut** : ✅ Implémenté + tests unitaires verts

## Scénarios de test E2E attendus

### Scénario nominal
1. ...
2. ...
3. ...

### Scénarios d'erreur
- **Erreur 1** : ...
- **Erreur 2** : ...

### Edge cases
- **Edge 1** : ...
- **Edge 2** : ...

## Tests unitaires déjà verts

- `backend/test/unit/xxx.spec.ts` : X tests
- `backend/test/invariants/xxx.spec.ts` : Y tests (si module sacré)
- `frontend/tests/xxx.test.mts` : Z tests

## Garde-fous à vérifier

- ✅ Gate TypeScript cliquet (`ci/check-tsc-baseline.mjs`)
- ✅ Budget bundle (`check-bundle-budget.mjs`)
- ✅ Verrou schéma (`schema-pilote.yml`) si migration DB
- ✅ `caisseCharte.test.mts` si touche POSCaisse

## Invariants business à vérifier

- **I1** : Vente atomique (si touche caisse)
- **I2** : Idempotence vente (si touche caisse)
- **I3** : Survente tracée (si touche stock)
- **I4** : Idempotence crédit (si crédit activé)
- **I5** : Idempotence acompte
- **I6** : Traçabilité crédit (spécification à réécrire)
- **I7** : Cohérence stock au rejeu offline

## Environnements de test

- **Local** : `docker compose up` + `npm run dev` (back + front)
- **Staging** : Render preview environment (si configuré)
- **Prod** : smoke test via `tests/specs/api.spec.ts`

## Date de passation

YYYY-MM-DD
