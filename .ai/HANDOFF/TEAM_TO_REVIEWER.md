# HANDOFF — TEAM_TO_REVIEWER

> Passation de l'équipe vers l'Agent Reviewer : code prêt pour revue.

## Code à reviewer

- **Feature** : FEATURE-XXX
- **Branche** : `feature/XXX`
- **Commits** : <SHA1>, <SHA2>, ...
- **PR** : #XXX (si GitHub PR)

## Fichiers modifiés

| Fichier | Lignes ajoutées | Lignes supprimées | Criticité |
|---|---|---|---|
| `backend/src/xxx/xxx.service.ts` | +120 | -15 | Critique (module sacré) |
| `frontend_src/src/app/pages/xxx.tsx` | +85 | -0 | Standard |
| ... | ... | ... | ... |

## Critères de revue attendus

### Qualité du code
- [ ] Nommage explicite
- [ ] Fonctions < 50 lignes
- [ ] Fichiers < 500 lignes
- [ ] Complexité cyclomatique < 10
- [ ] Nesting < 3 niveaux

### Patterns
- [ ] Repository/Service/Controller appliqués uniformément
- [ ] Imports cohérents (pas de mélange relatif/absolu injustifié)

### Séparation des couches
- [ ] Pas de requête DB dans composants frontend
- [ ] Logique métier dans services backend

### Non-duplication
- [ ] Pas de duplication inutile (sinon justifiée dans ARCHITECTURE.md)

### Tests
- [ ] Cas nominaux couverts
- [ ] Erreurs couvertes
- [ ] Edge cases couverts
- [ ] Pas de tests fragiles (flaky)

### Documentation
- [ ] Fonctions publiques documentées (JSDoc)
- [ ] Endpoints API avec exemples (Swagger)
- [ ] ADR créé si décision majeure

## Tests actuels

- ✅ Tests unitaires backend : X verts
- ✅ Tests invariants backend : Y verts (si module sacré)
- ✅ Tests frontend : Z verts
- ✅ Gate TypeScript : 0 erreur
- ✅ Budget bundle : X KB / 800 KB

## Particularités à surveiller

- **Module sacré touché** : oui/non (si oui, ADR obligatoire + invariants complets)
- **Migration DB** : oui/non (si oui, vérifier `schema-pilote.yml`)
- **Endpoint API public** : oui/non (si oui, audit Security obligatoire)
- **Feature frontend** : oui/non (si oui, validation a11y + perf obligatoire)

## Date de passation

YYYY-MM-DD
