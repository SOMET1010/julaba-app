/**
 * Configuration Vitest — JULABA frontend (INIT-021).
 *
 * Stratégie de cohabitation : les 74 tests `.test.{ts,tsx,mts}` existants
 * continuent à s'exécuter via `tsx` (helpers ad-hoc `ok()/eq()` + `main()` +
 * `process.exit(1)`). Vitest ne sélectionne QUE les tests adoptant la
 * convention `*.vitest.test.{ts,tsx,mts}` (infixe `.vitest.`) pour éviter de
 * capter les tests legacy qui planteraient (process.exit, JSDOM manuel, pas
 * de `it()`/`expect()` déclaré).
 *
 * Une fois les 74 tests migrés vers la syntaxe native Vitest, l'inclusion
 * pourra être élargie à tous les fichiers `.test.{ts,tsx,mts}` (voir
 * `src/test/README.md`).
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // jsdom par défaut : les tests d'intégration React (@testing-library/react)
    // domineront la migration. Les tests purement Node (scan fs, etc.) peuvent
    // surcharger via `// @vitest-environment node` en tête de fichier.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Convention `.vitest.test.*` pour la cohabitation (cf. en-tête).
    include: ["src/**/*.vitest.test.{ts,tsx,mts}"],
    // On n'échoue pas si aucun test `.vitest.test.*` n'est trouvé (utile tant
    // que la migration est partielle — `test:vitest` reste un no-op vert
    // plutôt qu'un crash).
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/app/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.config.*",
        "**/*.d.ts",
        "src/main.tsx",
        "src/app/routes.tsx",
        // Types et énumérations pures (pas de logique testable).
        "src/app/types/**",
        "src/app/config/**",
      ],
    },
  },
});
