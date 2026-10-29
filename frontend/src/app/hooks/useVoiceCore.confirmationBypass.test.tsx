/**
 * useVoiceCore — bypass de confirmation PAR INSTANCE (Lot 2, convergence
 * voix/tactile POS). Preuve que `confirmationBypassIntents` :
 * - supprime bien l'état "confirming" (et la fausse question visuelle
 *   résiduelle, `response`) pour une intention listée, quand elle est passée ;
 * - laisse le comportement PAR DÉFAUT strictement intact quand elle n'est
 *   pas passée (Tata Nanti Lou générique, `TantieSagesseModal`, qui ne passe
 *   jamais cette option) ;
 * - ne bypasse QUE les intentions listées : « dépense » reste confirmée même
 *   quand « vendre » est bypassée pour la même instance.
 *
 * Lancer : npm run test:voice-confirmation-bypass
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "https://julaba.local/",
});
Object.defineProperties(globalThis, {
  window: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
  localStorage: { configurable: true, value: dom.window.localStorage },
  sessionStorage: { configurable: true, value: dom.window.sessionStorage },
  CustomEvent: { configurable: true, value: dom.window.CustomEvent },
});
Object.defineProperty(dom.window.navigator, "onLine", { configurable: true, value: true });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalFetch = globalThis.fetch;
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: async () => { throw new Error("Le test interdit tout appel réseau"); },
});

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  createOscillator() { return { connect() {}, type: "sine", frequency: { value: 0 }, start() {}, stop() {} }; }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
Object.defineProperty(dom.window, "AudioContext", { configurable: true, value: FakeAudioContext });
Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: FakeAudioContext });

const React = await import("react");
const { act, render } = await import("@testing-library/react");
const audioManager = await import("../services/audioManager.js");
const { useVoiceCore } = await import("./useVoiceCore.js");

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

audioManager.__reset();
audioManager.__setPlayers(
  () => ({ promise: Promise.resolve("ended"), stop() {} }),
  () => ({ promise: Promise.resolve("ended"), stop() {} }),
);

type Core = ReturnType<typeof useVoiceCore>;

function makeHarness(options: {
  confirmationBypassIntents?: string[];
  onAction?: (data: unknown) => void;
}) {
  let core: Core | null = null;
  const stateHistory: string[] = [];
  function Harness() {
    const value = useVoiceCore({
      context: { module: "caisse", userId: "user-test", sessionOpen: true },
      confirmationBypassIntents: options.confirmationBypassIntents,
      onAction: async (data) => { options.onAction?.(data); },
    });
    React.useEffect(() => { core = value; stateHistory.push(value.state); }, [value]);
    return React.createElement("div", null, value.liveTranscript);
  }
  return { Harness, stateHistory, get core() { return core; } };
}

async function run() {
  // A — bypass actif pour "vendre" : jamais d'état "confirming", exécution immédiate.
  {
    let onActionCalls = 0;
    const h = makeHarness({ confirmationBypassIntents: ["vendre"], onAction: () => { onActionCalls++; } });
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(React.createElement(h.Harness), { container });

    await act(async () => { await h.core?.sendText("vends 2 tomates à 1000 francs"); });
    await act(async () => { await new Promise((r) => setTimeout(r, 1100)); }); // laisse le setState("idle") final se produire

    ok(!h.stateHistory.includes("confirming"), "A « vendre » bypassée : l'état 'confirming' n'est JAMAIS atteint");
    ok(h.core?.pendingResponse == null, "A jamais de pendingResponse posé (aucun cycle de confirmation amorcé)");
    ok(onActionCalls === 1, "A l'effet métier (onAction) s'exécute immédiatement, sans confirmation orale");
    ok(h.core?.response === null, "A aucune fausse question de confirmation résiduelle affichée (response=null)");
  }

  // B — SANS l'option (comportement par défaut = Tata générique) : la même
  // phrase continue d'exiger une confirmation orale, comme aujourd'hui.
  {
    let onActionCalls = 0;
    const h = makeHarness({ onAction: () => { onActionCalls++; } });
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(React.createElement(h.Harness), { container });

    await act(async () => { await h.core?.sendText("vends 2 tomates à 1000 francs"); });

    // Comme dans useVoiceCore.offline.multiuser.test.tsx : dans ce harnais
    // JSDOM sans vraie API micro, `startRecording()` (auto-écoute post-
    // question) peut faire retomber `state` sur "error" juste après être
    // passé par "confirming" — un artefact d'environnement de test, pas un
    // signal métier. `pendingResponse` reste truthy tant que la confirmation
    // orale n'a pas eu lieu : c'est la preuve robuste qu'on est bien entré
    // dans le cycle de confirmation, indépendamment de cet artefact.
    ok(h.core?.state === "confirming" || !!h.core?.pendingResponse, "B sans confirmationBypassIntents : « vendre » exige toujours une confirmation (Tata générique inchangée)");
    ok(onActionCalls === 0, "B l'effet métier n'est PAS exécuté tant que la confirmation orale n'a pas eu lieu");
  }

  // C — le bypass est bien LISTE PAR INTENTION, pas global : "dépense" reste
  // confirmée même quand "vendre" est bypassée pour la même instance.
  {
    let onActionCalls = 0;
    const h = makeHarness({ confirmationBypassIntents: ["vendre"], onAction: () => { onActionCalls++; } });
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(React.createElement(h.Harness), { container });

    await act(async () => { await h.core?.sendText("dépense de 500 francs pour le transport"); });

    ok(h.core?.state === "confirming" || !!h.core?.pendingResponse, "C « dépense » reste confirmée même avec confirmationBypassIntents:['vendre'] actif sur la même instance");
    ok(onActionCalls === 0, "C aucune exécution avant confirmation pour la dépense");
  }

  // D — setResponse(null) efface bien une carte de réponse RÉSIDUELLE d'une
  // interaction précédente, pas seulement l'absence de nouvelle question.
  {
    const h = makeHarness({ confirmationBypassIntents: ["vendre"] });
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(React.createElement(h.Harness), { container });

    // 1) une dépense (non bypassée) entre en confirming → response est peuplé
    //    avec la question de confirmation (jamais confirmée volontairement ici).
    await act(async () => { await h.core?.sendText("dépense de 500 francs pour le transport"); });
    ok(h.core?.response !== null, "D (pré-requis) une question de confirmation résiduelle est bien affichée après la dépense");

    // 2) puis une vente bypassée : la carte résiduelle doit disparaître,
    //    pas seulement ne pas être remplacée par une nouvelle question.
    await act(async () => { await h.core?.sendText("vends 2 tomates à 1000 francs"); });
    ok(h.core?.response === null, "D la carte de réponse résiduelle est explicitement effacée (pas juste laissée telle quelle)");
  }

  audioManager.__resetPlayers();
  audioManager.__reset();
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });

  console.log(failures === 0 ? "\nBypass de confirmation par instance validé." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

run();
