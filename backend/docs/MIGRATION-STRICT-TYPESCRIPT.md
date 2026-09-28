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
