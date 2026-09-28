/**
 * PILOTE Vitest — useAudioUnlockFallback (filet de rattrapage audio, VOIX-V5).
 *
 * Migration du test legacy `useAudioUnlockFallback.test.tsx` (JSDOM manuel +
 * helpers ad-hoc `ok()` + `process.exit(1)`) vers la syntaxe native Vitest.
 * C'est l'un des 3 pilotes INIT-021 qui démontrent le pattern de migration
 * d'un test d'intégration React ; le test legacy continue de s'exécuter via
 * `tsx` (`npm run test:audio-unlock`).
 *
 * Bénéfices de la migration :
 *   - plus de setup JSDOM manuel (géré par `environment: 'jsdom'` + setup.ts) ;
 *   - plus de `IS_REACT_ACT_ENVIRONMENT` à poser à la main (idem) ;
 *   - `cleanup()` automatique entre les `it()` (pas de fuite d'écouteurs) ;
 *   - chaque scénario apparaît individuellement dans le rapport Vitest.
 *
 * Le scénario T4 verrouille le piège déjà rencontré puis documenté dans le
 * hook : une version antérieure filtrait la cible du geste (closest sur
 * button/img) et, l'écouteur étant en mode « une seule fois », un premier tap
 * sur un bouton le consommait SANS jamais jouer le son — silence total pour
 * le reste de la session. C'est exactement le défaut qu'on répare ; il ne
 * doit pas revenir par une « optimisation » future.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAudioUnlockFallback } from "./useAudioUnlockFallback.js";

/** Un vrai toucher, sur la cible demandée, qui remonte jusqu'à window. */
function toucher(cible: "page" | "bouton" = "page"): void {
  const node =
    cible === "bouton"
      ? (document.getElementById("b") as HTMLElement)
      : document.body;
  act(() => {
    node.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  });
}

describe("useAudioUnlockFallback — filet de rattrapage audio", () => {
  it("T1 — le premier toucher rejoue la consigne restée muette", () => {
    const appels = { count: 0 };
    renderHook(() => useAudioUnlockFallback(() => { appels.count++; }, true));
    expect(appels.count).toBe(0);
    toucher();
    expect(appels.count).toBe(1);
  });

  it("T2 — une seule fois, jamais en boucle", () => {
    const appels = { count: 0 };
    renderHook(() => useAudioUnlockFallback(() => { appels.count++; }, true));
    toucher();
    toucher();
    toucher();
    expect(appels.count).toBe(1);
  });

  it("T3 — filet désarmé : le hook se tait quand actif=false", () => {
    const appels = { count: 0 };
    renderHook(() => useAudioUnlockFallback(() => { appels.count++; }, false));
    toucher();
    expect(appels.count).toBe(0);
  });

  it("T4 — RÉGRESSION : la cible du geste ne doit JAMAIS être filtrée", () => {
    // On a besoin d'un bouton dans le DOM pour ce scénario.
    const bouton = document.createElement("button");
    bouton.id = "b";
    bouton.textContent = "ok";
    document.body.appendChild(bouton);

    const appels = { count: 0 };
    renderHook(() => useAudioUnlockFallback(() => { appels.count++; }, true));
    toucher("bouton");
    expect(appels.count).toBe(1);

    document.body.removeChild(bouton);
  });

  it("T5 — démontage : plus aucun rattrapage", () => {
    const appels = { count: 0 };
    const { unmount } = renderHook(() =>
      useAudioUnlockFallback(() => { appels.count++; }, true),
    );
    act(() => { unmount(); });
    toucher();
    expect(appels.count).toBe(0);
  });

  it("T6 — c'est la DERNIÈRE consigne qui est rejouée, pas celle du premier rendu", () => {
    const dits: string[] = [];
    const { rerender } = renderHook(
      ({ texte }: { texte: string }) => useAudioUnlockFallback(() => { dits.push(texte); }, true),
      { initialProps: { texte: "ancienne consigne" } },
    );
    act(() => { rerender({ texte: "consigne à jour" }); });
    toucher();
    expect(dits).toEqual(["consigne à jour"]);
  });
});
