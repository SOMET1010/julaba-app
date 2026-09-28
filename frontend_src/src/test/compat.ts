/**
 * Wrapper de compatibilité `ok()` / `eq()` — JULABA frontend (INIT-021).
 *
 * Pont de migration : permet à un test legacy (helpers ad-hoc `ok()/eq()` +
 * `main()` + `process.exit(1)`) d'être converti en test Vitest SANS réécrire
 * toutes ses assertions. Il suffit de :
 *   1. Remplacer la définition locale de `ok()`/`eq()` par
 *      `import { ok, eq } from "@/test/compat"`.
 *   2. Supprimer le `process.exit(1)` final (Vitest gère lui-même l'exit code
 *      selon le nombre d'échecs).
 *   3. Renommer `*.test.mts` → `*.vitest.test.{ts,mts}` pour qu'il soit pris
 *      en charge par la config Vitest (voir `vitest.config.ts`).
 *
 * Sémantique : chaque `ok(cond, label)` / `eq(actual, expected, label)`
 * déclare un `it(label, …)` Vitest. Les assertions apparaissent donc
 * individuellement dans le rapport (et non plus sous un seul `console.log`).
 *
 * NOTE : ce wrapper est une **strate de transition**. Tout nouveau test doit
 * utiliser la syntaxe native Vitest (`describe/it/expect`) — cf. les pilotes
 * `*.vitest.test.{ts,tsx}` dans `src/app/`.
 */
import { expect, it } from "vitest";

/**
 * Affirme qu'une condition est vraie. Équivalent Vitest : `expect(cond).toBe(true)`.
 * Le `label` devient le nom du cas de test (`it(label, …)`).
 */
export function ok(cond: boolean, label: string): void {
  it(label, () => {
    expect(cond).toBe(true);
  });
}

/**
 * Affirme l'égalité profonde de deux valeurs (sémantique identique à l'helper
 * legacy qui comparait via `JSON.stringify`). Équivalent Vitest :
 * `expect(actual).toEqual(expected)`.
 *
 * On privilégie `toEqual` (égalité profonde structurée) plutôt que la
 * comparaison par `JSON.stringify` de l'helper legacy : celle-ci échouait sur
 * les clés dans le désordre et sur `undefined`, et masquait les différences de
 * types (nombre vs chaîne). `toEqual` est strict et lisible.
 */
export function eq<T>(actual: T, expected: T, label: string): void {
  it(label, () => {
    expect(actual).toEqual(expected);
  });
}
