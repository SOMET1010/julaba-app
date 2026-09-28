/**
 * Setup global Vitest — JULABA frontend (INIT-021).
 *
 * Chargé avant chaque fichier de test via `setupFiles` dans `vitest.config.ts`.
 * Centralise les ajustements d'environnement jsdom et les gardes-fous communs
 * (pas de sortie réseau, pas de `console.error` bruyant non filtré).
 *
 * Les tests d'intégration React qui migraient depuis `tsx` + JSDOM manuel n'ont
 * plus besoin de configurer eux-mêmes `globalThis.window` / `document` /
 * `localStorage` : jsdom le fournit, et @testing-library/react s'appuie dessus.
 */
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react : démontage automatique après chaque `it()`.
// Sans ça, les hooks `renderHook`/`render` successifs polluent le DOM jsdom
// d'un test à l'autre et créent des fuites d'écouteurs.
afterEach(() => {
  cleanup();
});

// `IS_REACT_ACT_ENVIRONMENT` : requis par React 18 pour que `act()` soit
// actif. Les tests legacy le posaient à la main ; on le pose une fois ici.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Garde-fou optionnel : tout appel `fetch` non mocké dans un test est un bug
// (un test frontend ne doit JAMAIS taper le réseau réel). Les tests qui ont
// légitimement besoin de `fetch` le mockent explicitement via `vi.stubGlobal`
// ou `vi.spyOn`. On ne l'active que si le test ne l'a pas déjà surchargé.
const originalFetch = globalThis.fetch;
if (originalFetch === undefined) {
  // jsdom ne fournit pas `fetch` par défaut sur certaines versions ; on en
  // branche un qui échoue bruyamment pour qu'un test oublieux ne passe pas
  // silencieusement.
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error(
    "fetch non mocké appelé dans un test Vitest — mockez-le explicitement (INIT-021).",
  ))));
}

// Nettoyage du `localStorage` / `sessionStorage` entre les tests : les tests
// de file offline persistante s'appuient sur `localStorage` et doivent
// repartir d'un état vierge. On évite ainsi les fuites d'état cross-test.
// Garde : certains tests s'exécutent en environnement `node` (via
// `// @vitest-environment node`) où `localStorage` n'existe pas — on ne
// nettoie alors que ce qui est disponible.
afterEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});
