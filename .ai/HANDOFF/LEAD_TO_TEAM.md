# HANDOFF — LEAD_TO_TEAM

> Passation de l'Agent 1 (Tech Lead) vers l'équipe opérationnelle (Back/Front/DevOps).

## Feature concernée

- **ID** : FEATURE-XXX
- **Titre** : ...
- **Priorité** : P0 | P1 | P2 | P3
- **ADR lié** : ADR-XXX (si décision majeure)

## Découpage en sous-tâches

| Sous-tâche | Rôle | Fichiers concernés | Dépendances | Effort |
|---|---|---|---|---|
| ST-1 | Backend | `backend/src/...` | — | S |
| ST-2 | Frontend | `frontend_src/src/...` | ST-1 (contrat API) | M |
| ST-3 | DevOps | `.github/workflows/...` | — | S |

## Contrats d'interface

### API (Backend → Frontend)
- **Endpoint** : `POST /api/v1/...`
- **Request DTO** : ...
- **Response DTO** : ...
- **Codes d'erreur** : 400, 401, 403, 404, 409, 422, 429, 500
- **Idempotence** : `Idempotency-Key` header requis

### Modèles DB
- **Table** : `xxx`
- **Colonnes** : ...
- **Index** : ...
- **Migration** : `XXX-nom-migration.ts`

## Règles à respecter

1. **API-FIRST** : contrat API validé avant tout développement frontend
2. **Séparation des couches** : pas de requête DB dans composants frontend
3. **Non-duplication** : justifier toute duplication dans `ARCHITECTURE.md`
4. **Idempotence** si mutation financière
5. **Fail-closed** par défaut sur permissions
6. **Modules sacrés** : Auth, Caisse, Crédit, Fermeture, Synchro, Argent — tests complets + invariants verts + ADR obligatoire

## Tests attendus

- **Backend** : test unitaire + test invariant si module sacré
- **Frontend** : test sur la logique critique
- **E2E** : scénario nominal + erreur + edge case

## Critères de validation

- ✅ Code implémenté avec tests unitaires
- ✅ Mise à jour des `HANDOFF/` correspondants :
  - `BACKEND_TO_FRONTEND.md` (API prête)
  - `FRONTEND_TO_BACKEND.md` (besoin d'API)
  - `TEAM_TO_QA.md` (code prêt à tester)
  - `TEAM_TO_REVIEWER.md` (code prêt pour revue)
  - `TEAM_TO_COMMIT.md` (code prêt à commiter)

## Date de passation

YYYY-MM-DD
