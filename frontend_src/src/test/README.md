# Tests frontend — stratégie de cohabitation Vitest + tsx (INIT-021)

> Mise en place le 2026-09-29 dans le cadre de l'adoption progressive de
> Vitest comme framework de test standard pour le frontend JULABA.

## Contexte

Avant INIT-021, les 74 tests du frontend s'exécutaient via `tsx` (Node direct)
avec des helpers ad-hoc `ok(cond, label)` / `eq(a, b, label)` et un `main()` +
`process.exit(1)` final. Ce montage **fonctionnait** mais limitait :
- pas de **coverage report** ;
- pas de **watch mode** ;
- pas de **snapshot** ;
- pas de **mocking avancé** (espionnage, modules entiers) ;
- pas de **parallélisation**.

INIT-021 met en place l'infrastructure Vitest et **3 tests pilotes** sans
casser les 74 tests existants. La migration complète est laissée à un lot
ultérieur.

## Convention de nommage (cohabitation)

| Suffixe de fichier | Runner | Statut |
|---|---|---|
| `*.test.mts` | `tsx` (legacy) | 74 fichiers existants — inchangés |
| `*.test.tsx` | `tsx` (legacy) | 5 fichiers existants (intégration React) — inchangés |
| `*.vitest.test.ts` | `vitest` (nouveau) | Pilotes INIT-021 + futurs migrés |
| `*.vitest.test.tsx` | `vitest` (nouveau) | Pilotes INIT-021 + futurs migrés |

La config Vitest (`vitest.config.ts`) sélectionne **uniquement** les fichiers
`*.vitest.test.{ts,tsx,mts}` via `include`. Les fichiers `*.test.*` (sans
`.vitest.`) ne sont **pas** captés par Vitest : ils continuent à s'exécuter
via `tsx` et leurs scripts `npm run test:*` dédiés.

### Pourquoi ne pas élargir `include` à tous les `*.test.*` ?

Les tests legacy planteraient sous Vitest :
1. `process.exit(1)` final → tuerait le process Vitest ;
2. pas de `it()`/`expect()` déclaré → Vitest échouerait (`passWithNoTests`) ;
3. setup JSDOM manuel dans les `.test.tsx` → conflit avec l'environnement
   `jsdom` déjà fourni par Vitest.

Une fois les 74 tests migrés vers la syntaxe native Vitest (un par un, en
supprimant `main()` + `process.exit()`), le `include` pourra être élargi à
`src/**/*.test.{ts,tsx,mts}` et les doublons `*.vitest.test.*` renommés en
`*.test.*`.

## Fichiers d'infrastructure

| Fichier | Rôle |
|---|---|
| `vitest.config.ts` | Configuration Vitest (jsdom, globals, coverage v8, include `*.vitest.test.*`) |
| `src/test/setup.ts` | Setup global : `cleanup()` @testing-library, `IS_REACT_ACT_ENVIRONMENT`, nettoyage `localStorage` |
| `src/test/compat.ts` | Wrapper `ok()` / `eq()` en `it(label, …)` Vitest — pont de migration pour les tests legacy |
| `src/test/vitest-globals.d.ts` | Déclaration ambiante `vitest/globals` — type les globals sans modifier `tsconfig.json` |

## Scripts npm (dans `frontend_src/package.json`)

| Script | Commande | Usage |
|---|---|---|
| `test:vitest` | `vitest run` | Exécute une fois les tests `*.vitest.test.*` (CI) |
| `test:watch` | `vitest` | Watch mode interactif (dev local) |
| `test:coverage` | `vitest run --coverage` | Coverage report v8 (`text` + `html` + `lcov`) |
| `test:ui` | `vitest --ui` | Interface web Vitest (`@vitest/ui`) |

Le script `verify` lance désormais `test:vitest` **avant** les tests legacy
`tsx`, de sorte que la CI valide d'abord les pilotes Vitest.

## 3 tests pilotes (démonstration du pattern)

| Pilote | Source legacy | Pattern démontré |
|---|---|---|
| `src/app/utils/fcfa.vitest.test.ts` | `fcfa.test.mts` | Test unitaire pur — `describe/it/expect` direct |
| `src/app/services/antiJargon.vitest.test.ts` | `antiJargon.test.mts` | Test avec `node:fs` — `// @vitest-environment node` |
| `src/app/hooks/useAudioUnlockFallback.vitest.test.tsx` | `useAudioUnlockFallback.test.tsx` | Test d'intégration React — jsdom auto, `renderHook`/`act` |

### Bénéfices observés sur les pilotes

- **fcfa** : 18 assertions individuelles visibles dans le rapport (vs 1 bloc
  console). Couverture `fcfa.ts` : **95,55 %** des lignes.
- **useAudioUnlockFallback** : 6 scénarios isolés, `cleanup()` automatique
  entre eux (plus de fuite d'écouteurs). Couverture : **100 %**.
- **antiJargon** : 1 test unique avec `expect.fail()` détaillant TOUTES les
  violations si échec (au lieu d'un `process.exit(1)` brut).

## Migration d'un test legacy (procédure)

1. **Copier** `foo.test.mts` → `foo.vitest.test.ts` (ou `.tsx` pour React).
2. **Supprimer** : `let failures = 0`, la définition locale de `ok()`/`eq()`,
   le `function main() { … }`, l'appel `main()`, et surtout le
   `if (failures > 0) process.exit(1)` final.
3. **Remplacer** le corps par des blocs `describe/it/expect` (voir les
   pilotes). Pour une migration mécanique sans réécrire les assertions,
   importer `import { ok, eq } from "@/test/compat"` — chaque `ok()`/`eq()`
   devient un `it()` Vitest individuel.
4. Pour les tests d'intégration React : **supprimer** tout le setup JSDOM
   manuel (`new JSDOM(...)`, `Object.defineProperties(globalThis, …)`,
   `IS_REACT_ACT_ENVIRONMENT`). C'est géré par `src/test/setup.ts` +
   l'environnement `jsdom` de la config. Remplacer les `await import(...)` par
   des imports statiques en haut de fichier.
5. Pour les tests qui utilisent `node:fs` / `node:path` (scan statique, etc.)
   : ajouter `// @vitest-environment node` en tête de fichier.
6. Vérifier : `npm run test:vitest` doit passer, `npx tsc -b` doit rester à 0
   erreur.
7. **Supprimer** le test legacy `foo.test.mts` et son script `test:foo` dans
   `package.json` (et l'entrée dans `verify` / `test:ci` si présente).
8. Une fois tous les tests migrés, élargir `include` dans `vitest.config.ts` à
   `src/**/*.test.{ts,tsx,mts}` et renommer les `*.vitest.test.*` en
   `*.test.*`.

## Tests legacy à ne PAS casser

Les 74 tests `*.test.{mts,tsx}` continuent de s'exécuter via `tsx` avec leurs
scripts dédiés (`test:fcfa`, `test:jargon`, `test:audio-unlock`, etc.). La
garde `antiJargon.test.mts` a été mise à jour pour exclure les fichiers
`*.vitest.test.*` de son scan (les tests peuvent légitimement citer les mots
interdits comme données de test).

## Choix techniques

- **Vitest 2.1.9** (et non 3.x) : compatibilité éprouvée avec Vite 6 + React
  18, et `@vitest/coverage-v8` + `@vitest/ui` alignés sur la même version.
- **`globals: true`** : autorise le style Jest (`describe/it/expect` sans
  import). Les pilotes utilisent néanmoins des imports explicites
  (`import { describe, it, expect } from 'vitest'`) pour la lisibilité et
  l'autocomplétion IDE.
- **`environment: 'jsdom'`** par défaut : la majorité des tests frontend est
  React. Les tests purement Node surchargent via `// @vitest-environment node`.
- **`passWithNoTests: true`** : `test:vitest` reste vert (no-op) tant que la
  migration est partielle — évite un échec CI bloquant.
- **Coverage `v8`** : plus rapide que Istanbul, natif Vitest. Reporteurs
  `text` (console), `html` (browse), `lcov` (CI / Coveralls).
- **`coverage.include`** limité à `src/app/**/*.{ts,tsx}` : exclut
  `src/main.tsx`, `routes.tsx`, `types/`, `config/` (pas de logique testable).
