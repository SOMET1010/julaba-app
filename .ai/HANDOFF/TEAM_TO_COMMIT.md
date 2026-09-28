# HANDOFF — TEAM_TO_COMMIT

> Passation de l'équipe vers l'Agent Commit : code prêt à commiter.

## Commits à réaliser

### Commit 1
- **Type** : `feat` | `fix` | `docs` | `refactor` | `test` | `chore` | `ci` | `perf` | `style` | `build`
- **Scope** : `caisse` | `auth` | `wallets` | etc.
- **Sujet** : ... (max 50 chars, impératif présent)
- **Description** : ... (max 72 chars par ligne)
- **Fichiers** :
  - `path/to/file1.ts`
  - `path/to/file2.tsx`
- **Tests** : ✅ verts
- **Revue** : ✅ Reviewer OK
- **Atomicité** : ✅ 1 préoccupation

### Commit 2 (si besoin)
- ...

## Convention de commits

```
<type>(<scope>): <sujet>

<description optionnelle>

<footers optionnels>
```

## Règles d'atomicité

- 1 commit = 1 préoccupation
- Pas de `git add .` (ajout explicite par fichier)
- Pas de commits géants injustifiés

## Vérifications pré-commit

- ✅ Tests unitaires verts
- ✅ Tests invariants verts (si module sacré)
- ✅ Gate TypeScript : 0 erreur
- ✅ Budget bundle : X KB / 800 KB
- ✅ Revue Reviewer : APPROUVÉ
- ✅ Audit Security (si endpoint public ou module sacré) : OK
- ✅ Validation a11y (si feature frontend) : OK
- ✅ Validation Perf (si feature frontend ou perf-critique) : OK

## Après commit

- [ ] Mettre à jour `COMMIT_LOG.md`
- [ ] Mettre à jour `TASKS.md` (statut)
- [ ] Mettre à jour `TEAM_STATUS.md`
- [ ] Mettre à jour `CHANGELOG.md` (si feature utilisateur)

## Date de passation

YYYY-MM-DD
