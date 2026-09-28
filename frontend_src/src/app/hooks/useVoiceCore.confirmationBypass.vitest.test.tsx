/**
 * Vitest — useVoiceCore : bypass de confirmation PAR INSTANCE (Lot 2,
 * convergence voix/tactile POS). Migration depuis
 * `useVoiceCore.confirmationBypass.test.tsx` (JSDOM manuel + helpers ad-hoc
 * `ok()` + `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:voice-confirmation-bypass`) — cohabitation INIT-021.
 *
 * Preuve que `confirmationBypassIntents` :
 * - supprime bien l'état "confirming" (et la fausse question visuelle
 *   résiduelle, `response`) pour une intention listée, quand elle est passée ;
 * - laisse le comportement PAR DÉFAUT strictement intact quand elle n'est
 *   pas passée (Tata Nanti Lou générique, `TantieSagesseModal`, qui ne passe
 *   jamais cette option) ;
 * - ne bypasse QUE les intentions listées : « dépense » reste confirmée même
 *   quand « vendre » est bypassée pour la même instance.
 *
 * Bénéfices de la migration : plus de setup JSDOM manuel, plus de
 * `IS_REACT_ACT_ENVIRONMENT`, `cleanup()` auto, chaque scénario isolé.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { act, render } from "@testing-library/react";
import * as audioManager from "../services/audioManager.js";
import { useVoiceCore, type VoiceCoreResult } from "./useVoiceCore.js";

// Garde-fou : le test interdit tout appel réseau. On stub `fetch` une fois
// pour toutes — le setup.ts le ferait de toute façon, mais on l'explicite
// pour la lisibilité (et on le restore en `afterAll` via le cleanup global).
const fetchMock = vi.fn(() => Promise.reject(new Error("Le test interdit tout appel réseau")));
vi.stubGlobal("fetch", fetchMock);

// AudioContext factice : on n'a pas de vraie API micro en jsdom, mais on a
// besoin que `new AudioContext()` ne plante pas les chemins de code qui
// l'appellent. On le pose sur `window` (jsdom) et `globalThis`.
class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  createOscillator() {
    return { connect() {}, type: "sine", frequency: { value: 0 }, start() {}, stop() {} };
  }
  createGain() {
    return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } };
  }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
vi.stubGlobal("AudioContext", FakeAudioContext);

// AudioManager : on injecte des players qui se terminent immédiatement, pour
// que les `await speak()` du hook ne restent pas en attente.
beforeEach(() => {
  audioManager.__reset();
  audioManager.__setPlayers(
    () => ({ promise: Promise.resolve("ended"), stop() {} }),
    () => ({ promise: Promise.resolve("ended"), stop() {} }),
  );
});

interface HarnessOptions {
  confirmationBypassIntents?: string[];
  onAction?: (data: unknown) => void;
}

function makeHarness(options: HarnessOptions): {
  Harness: () => React.ReactElement;
  stateHistory: string[];
  getCore: () => VoiceCoreResult | null;
} {
  let core: VoiceCoreResult | null = null;
  const stateHistory: string[] = [];
  function Harness(): React.ReactElement {
    const value = useVoiceCore({
      context: { module: "caisse", userId: "user-test", sessionOpen: true },
      confirmationBypassIntents: options.confirmationBypassIntents,
      onAction: async (data) => { options.onAction?.(data); },
    });
    React.useEffect(() => {
      core = value;
      stateHistory.push(value.state);
    }, [value]);
    return React.createElement("div", null, value.liveTranscript);
  }
  return { Harness, stateHistory, getCore: () => core };
}

function mount(Harness: () => React.ReactElement): { container: HTMLElement } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(React.createElement(Harness), { container });
  return { container };
}

describe("useVoiceCore — bypass de confirmation par instance", () => {
  it("A — bypass actif pour « vendre » : jamais d'état confirming, exécution immédiate", async () => {
    let onActionCalls = 0;
    const h = makeHarness({ confirmationBypassIntents: ["vendre"], onAction: () => { onActionCalls++; } });
    mount(h.Harness);

    await act(async () => { await h.getCore()?.sendText("vends 2 tomates à 1000 francs"); });
    await act(async () => { await new Promise((r) => setTimeout(r, 1100)); });

    expect(h.stateHistory.includes("confirming")).toBe(false);
    expect(h.getCore()?.pendingResponse == null).toBe(true);
    expect(onActionCalls).toBe(1);
    expect(h.getCore()?.response).toBeNull();
  });

  it("B — SANS l'option (comportement par défaut = Tata générique) : la même phrase exige une confirmation", async () => {
    let onActionCalls = 0;
    const h = makeHarness({ onAction: () => { onActionCalls++; } });
    mount(h.Harness);

    await act(async () => { await h.getCore()?.sendText("vends 2 tomates à 1000 francs"); });

    // Comme dans useVoiceCore.offline.multiuser.test.tsx : dans ce harnais
    // JSDOM sans vraie API micro, `startRecording()` (auto-écoute post-
    // question) peut faire retomber `state` sur "error" juste après être passé
    // par "confirming" — un artefact d'environnement de test, pas un signal
    // métier. `pendingResponse` reste truthy tant que la confirmation orale
    // n'a pas eu lieu : c'est la preuve robuste qu'on est bien entré dans le
    // cycle de confirmation, indépendamment de cet artefact.
    const core = h.getCore();
    const estEnConfirmation = core?.state === "confirming" || !!core?.pendingResponse;
    expect(estEnConfirmation).toBe(true);
    expect(onActionCalls).toBe(0);
  });

  it("C — le bypass est bien LISTE PAR INTENTION, pas global : « dépense » reste confirmée", async () => {
    let onActionCalls = 0;
    const h = makeHarness({ confirmationBypassIntents: ["vendre"], onAction: () => { onActionCalls++; } });
    mount(h.Harness);

    await act(async () => { await h.getCore()?.sendText("dépense de 500 francs pour le transport"); });

    const core = h.getCore();
    const estEnConfirmation = core?.state === "confirming" || !!core?.pendingResponse;
    expect(estEnConfirmation).toBe(true);
    expect(onActionCalls).toBe(0);
  });

  it("D — setResponse(null) efface bien une carte de réponse RÉSIDUELLE d'une interaction précédente", async () => {
    const h = makeHarness({ confirmationBypassIntents: ["vendre"] });
    mount(h.Harness);

    // 1) une dépense (non bypassée) entre en confirming → response est peuplé
    //    avec la question de confirmation (jamais confirmée volontairement ici).
    await act(async () => { await h.getCore()?.sendText("dépense de 500 francs pour le transport"); });
    expect(h.getCore()?.response).not.toBeNull();

    // 2) puis une vente bypassée : la carte résiduelle doit disparaître,
    //    pas seulement ne pas être remplacée par une nouvelle question.
    await act(async () => { await h.getCore()?.sendText("vends 2 tomates à 1000 francs"); });
    expect(h.getCore()?.response).toBeNull();
  });
});
