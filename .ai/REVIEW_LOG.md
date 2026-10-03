# REVIEW_LOG.md — Journal des revues de code JULABA

> Tenu par l'Agent Reviewer. Format : chaque entrée = une revue de code.

## État au 2026-09-28

- **Total revues** : 0 (système initialisé)
- **Revues positives** : 0
- **Revues bloquantes** : 0
- **Revues en attente** : 0

## Format d'enregistrement

```
### REVIEW-XXX — [Feature / PR / Commit]
- **Date** : YYYY-MM-DD
- **Reviewer** : Agent Reviewer
- **Auteur du code** : <Agent>
- **Fichiers concernés** : ...
- **Statut** : ✅ APPROUVÉ / ⚠️ APPROUVÉ AVEC REMARQUES / ❌ BLOQUÉ
- **Critères évalués** :
  - Qualité du code : ✅/⚠️/❌
  - Patterns respectés : ✅/⚠️/❌
  - Lisibilité : ✅/⚠️/❌
  - Maintenabilité : ✅/⚠️/❌
  - Séparation des couches : ✅/⚠️/❌
  - Pas de duplication inutile : ✅/⚠️/❌
  - Tests unitaires : ✅/⚠️/❌
  - Tests E2E (si applicable) : ✅/⚠️/❌/N/A
  - Documentation : ✅/⚠️/❌
- **Remarques** : ...
- **Actions correctives demandées** : ...
- **Date de validation finale** : YYYY-MM-DD
- **Commit validé** : <SHA>
```

## Règles de revue (rappels)

### Critères obligatoires
1. **Qualité du code** : nommage explicite, fonctions courtes (<50 lignes), fichiers <500 lignes, complexité cyclomatique <10, nesting <3 niveaux
2. **Patterns respectés** : Repository/Service/Controller appliqués uniformément, imports cohérents (pas de mélange relatif/absolu injustifié)
3. **Lisibilité** : commentaires pédagogiques sur points critiques, pas de code mort, pas de TODO/FIXME non résolus
4. **Maintenabilité** : pas de console.log/debugger oubliés, pas de magic numbers
5. **Séparation des couches** : pas de requête DB dans composants frontend, logique métier dans services backend
6. **Pas de duplication inutile** : justifier toute duplication dans `ARCHITECTURE.md`
7. **Tests** : couverture des cas nominaux + erreurs + edge cases, pas de tests fragiles (flaky)
8. **Documentation** : fonctions publiques documentées, endpoints API avec exemples, ADR pour décisions majeures

### Garde-fous CI existants
- Gate TypeScript cliquet (`ci/check-tsc-baseline.mjs` + `ci/tsc-baseline.txt` = 0)
- Budget bundle CI (`check-bundle-budget.mjs` 800 KB max)
- Verrou schéma figé (`schema-pilote.yml`)
- 8 scripts de garde-fou source dans `scripts/`
- `caisseCharte.test.mts` (pas de couleurs en dur dans POSCaisse)

### Règle d'arrêt de revue
- ❌ **BLOQUÉ** si : vulnérabilité critique introduite, test critique supprimé sans remplacement, regression d'invariant, séparation des couches violée sur un module sacré
- ⚠️ **APPROUVÉ AVEC REMARQUES** si : dette technique mineure ajoutée (à tracer dans `DEBT_REPORT.md`), documentation manquante (à ajouter dans la même PR), typage faible (à améliorer dans une PR suivante)
- ✅ **APPROUVÉ** si : tous les critères obligatoires respectés

## Revues historiques (avant système multi-agents)

Le projet a un historique de revues très riche :
- 780 commits au total, dont ~51% signés Claude (instance IA JULABA historique)
- 35 branches vivantes (dont ~22 `review/`) — nombreuses PR formelles
- 5 ADR documentés avec revue par Patrick
- Registre de dette à 20 révisions (auto-correction documentée — l'auditeur rouvre et referme ses propres erreurs)

## À venir

*(Sera mis à jour à chaque revue du système multi-agents)*
