# Migration progressive `strictNullChecks` — Backend

> **Stratégie** : activer `strictNullChecks` + `noImplicitAny` + `strictBindCallApply` module par module, sans casser l'existant.
>
> **Référence** : INIT-016 (audit AUDIT-001-2026-09-28), dette TYPE-01 (registre `docs/dette/REGISTRE-MAITRE.md`).

## État actuel

- `backend/tsconfig.json` : `strictNullChecks: false`, `noImplicitAny: false`, `strictBindCallApply: false`
- 476 occurrences `any`/`as any` (346 `: any` + 130 `as any`) — concentrateurs : `auth.controller.ts` (81), `cooperatives-rest.controller.ts` (33), `users.controller.ts` (24), `identifications.controller.ts` (23), `caisse-rest.controller.ts` (23)
- 0 occurrence sur une donnée d'argent aux frontières (vérifié par le registre)

## Infrastructure posée

### `backend/tsconfig.strict.json`

Config TypeScript stricte qui étend `tsconfig.json` et active :
- `strictNullChecks: true`
- `noImplicitAny: true`
- `strictBindCallApply: true`

### Module pilote

`src/caisse-rest/caisse-produit.entity.ts` + `src/caisse-rest/caisse-produits.service.ts` (créés par INIT-012) sont les premiers modules à compiler en strict. Vérification :

```bash
cd backend && npx tsc --noEmit -p tsconfig.strict.json
# → 0 erreur
```

## Modules migrés

### Phase 1 (INIT-016 phase 1 — pilote)

- ✅ `src/caisse-rest/caisse-produit.entity.ts` (entité)
- ✅ `src/caisse-rest/caisse-produits.service.ts` (service)

### Phase 2 (INIT-016 phase 2 — extension 2026-09-29)

Couche 2 — Utilitaires :

- ✅ `src/common/paginate.ts` — `any` supprimés : `parsePagination(query: any)` → `PaginationInput` (= `Record<string, unknown> | PaginationParams | undefined`) + helper `readString()` ; `orderBy: any` → `Record<string, 'ASC' | 'DESC'>` (cast `as FindManyOptions<T>['order']` justifié en commentaire) ; `dataSource: any` → `DataSource` ; `params: any[]` → `unknown[]` ; `paginateRaw` devient générique `<T = Record<string, unknown>>`.
- ✅ `src/config/throttler.config.ts` — déjà propre (0 `any`).
- ✅ `src/config/trust-proxy.config.ts` — déjà propre (0 `any`).
- ✅ `src/database/schema-flags.ts` — déjà propre (0 `any`).

Couche 3 — Modules métier stables :

- ✅ `src/cycles-rest/cycles-rest.controller.ts` — `body: any` → interfaces `CreateCycleBody`/`UpdateCycleBody` (champs permissifs `unknown` pour les valeurs brutes JSON) ; `query: any` → `Record<string, string>` (réservé pagination future, paramètre renommé `_query`) ; `const values = []` → `const values: unknown[] = []` ; allow-list `UPDATE_ALLOWED_FIELDS` extraite en constante typée `readonly string[]`.
- ✅ `src/recoltes-rest/recoltes-rest.controller.ts` — `body: any` → interfaces `CreateRecolteBody`/`UpdateRecolteBody` ; `updateData: any = {}` → `Partial<Recolte>` ; `qualiteMap` local → `QUALITE_MAP` constante typée `Readonly<Record<string, RecolteQualite>>` ; cast `as RecolteStatut`/`as RecolteQualite` documentés (DB valide l'enum côté colonne). Dépendance : `Recolte.entity.ts` mise à jour — champs `cycleId`/`parcelle`/`notes`/`photoUrl` de `string` à `string | null` pour refléter le `nullable: true` du schéma (correctif de typage, pas de changement de comportement DB).

**Bilan phase 2** :

- 6 nouveaux modules ajoutés à `tsconfig.strict.json` (8 au total avec pilotes)
- 0 `any`/`as any` dans les modules migrés
- `npx tsc --noEmit -p tsconfig.strict.json` : 0 erreur ✅
- `npx tsc --noEmit -p tsconfig.build.json` : 0 erreur ✅ (les 3 erreurs préexistantes TS2503 `Cannot find namespace 'Express'` ont disparu après installation de `@types/express` via `npm install`)
- `npm run test:unit` : 207 tests / 27 suites ✅

### Couches restantes à migrer

- **Couche 4 — Modules sacrés** (effort XL) : `auth/`, reste de `caisse-rest/`, `wallets/`, `commandes/` — exigent tests complets + invariants verts + ADR.
- **Couche 5 — Backoffice** (effort XL) : `admin/`, `cooperatives-rest/`, `identifications/` — `any` massif (concentrateurs identifiés par l'audit : `auth.controller.ts` 81, `cooperatives-rest.controller.ts` 33, `users.controller.ts` 24, `identifications.controller.ts` 23, `caisse-rest.controller.ts` 23).

## Stratégie de migration

### Approche par couches (du sûr vers le risqué)

1. **Couche 1 — Nouveaux modules** (effort S) : tout nouveau fichier backend doit compiler en strict. L'ajouter à `tsconfig.strict.json` `include`.
2. **Couche 2 — Modules utilitaires** (effort M) : `common/paginate.ts`, `config/*`, `database/schema-flags.ts`, `database/db-init.service.ts` — peu de dépendances, peu de `any`.
3. **Couche 3 — Modules métier stables** (effort L) : `cycles-rest`, `recoltes-rest`, `publications-rest`, `stocks-rest` — après fusion INIT-011.
4. **Couche 4 — Modules sacrés** (effort XL) : `auth/`, `caisse-rest/`, `wallets/`, `commandes/` — exigent tests complets + invariants verts + ADR.
5. **Couche 5 — Backoffice** (effort XL) : `admin/`, `cooperatives-rest/`, `identifications/` — `any` massif.

### Procédure par module

1. Ajouter le chemin du module à `tsconfig.strict.json` `include`
2. Lancer `npx tsc --noEmit -p tsconfig.strict.json`
3. Corriger les erreurs une par une :
   - `: any` → typer explicitement (interface, type, generic)
   - `as any` → typer ou utiliser `unknown` + narrowing
   - `null`/`undefined` non géré → ajouter guard ou `?? defaultValue`
4. Lancer `npm run test:unit` — doit rester vert
5. Lancer `npm run test:invariants` — doit rester vert
6. Commit atomique `refactor(types): module X strictNullChecks`

### Quand activer globalement ?

Quand tous les modules sont en strict dans `tsconfig.strict.json`, basculer `tsconfig.json` :
```json
"strictNullChecks": true,
"noImplicitAny": true,
"strictBindCallApply": true
```

Puis supprimer `tsconfig.strict.json`.

## Anti-patterns à éviter

- `as any` pour faire taire le compilateur → utiliser `unknown` + narrowing
- `!` (non-null assertion) sans justification → préférer un guard `if (x === null) return`
- `?: ` optional sans vérifier `undefined` côté appelant
- `Record<string, any>` → typer la valeur explicitement

## Script npm à ajouter

Dans `backend/package.json` scripts :
```json
"typecheck:strict": "tsc --noEmit -p tsconfig.strict.json"
```

## Références

- TypeScript strict mode : https://www.typescriptlang.org/tsconfig#strict
- Registre dette : `docs/dette/REGISTRE-MAITRE.md` (TYPE-01 P2 OUVERT)
- Audit initial : `.ai/AUDITS/AUDIT-001-2026-09-28.md`
- ADR-0002 : convergence schéma (lot post-bascule pour `DbInitService`)
