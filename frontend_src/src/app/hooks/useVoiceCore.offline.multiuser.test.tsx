/**
 * useVoiceCore — preuve de câblage du cloisonnement par utilisateur (LOT 1 /
 * P1-1). Le hook useOfflineVoiceQueue.test.tsx prouve que l'ISOLATION elle-même
 * est correcte ; ce test-ci prouve que useVoiceCore la CÂBLE réellement (passe
 * bien context.userId à useOfflineVoiceQueue) — c'est exactement le genre de
 * régression qu'une revue de code peut manquer (un seul argument oublié à
 * l'appel) et qu'un test d'isolation seul ne détecte pas.
 *
 * Lancer : npm run test:offline-voice-multiuser
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
const { CURRENT_SEMANTICS_VERSION } = await import("./useOfflineVoiceQueue.js");

const STORAGE_KEY = "julaba_offline_voice_queue";

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

function makeHarness(userId: string, onAction: () => void) {
  let core: Core | null = null;
  function Harness() {
    const value = useVoiceCore({ context: { module: "caisse", userId }, onAction: async () => { onAction(); } });
    React.useEffect(() => { core = value; }, [value]);
    return React.createElement("div", null, value.liveTranscript);
  }
  return { Harness, get core() { return core; } };
}

async function run() {
  // Terminal partagé : une commande vocale mise en file par A ne doit jamais
  // être exécutée quand c'est B qui utilise useVoiceCore ensuite (même
  // appareil, logout/login, sans jamais rebrancher context.userId sur A).
  localStorage.clear();
  // semanticsVersion (Lot 2, convergence voix/tactile POS) : sans lui, la
  // commande serait mise en quarantaine par la doctrine « sémantique non
  // prouvée » (voir useOfflineVoiceQueue.ts) — hors sujet ici, ce test porte
  // sur le câblage userId, pas sur le versionnage sémantique.
  localStorage.setItem(STORAGE_KEY, JSON.stringify([
    { id: "shared-1", text: "j'ai vendu 3 tomates à 500 francs", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: CURRENT_SEMANTICS_VERSION },
  ]));

  let onActionCallsB = 0;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const harnessB = makeHarness("user-B", () => { onActionCallsB++; });
  const { unmount } = render(React.createElement(harnessB.Harness), { container });

  await act(async () => { await new Promise((r) => setTimeout(r, 300)); });

  ok(onActionCallsB === 0, "useVoiceCore sous B n'exécute jamais la commande vocale laissée par A");
  ok(harnessB.core?.transcript === "", "sous B, le transcript ne reflète jamais le texte de A (rien n'a été soumis au moteur)");
  const stillQueued = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  ok(stillQueued.length === 1 && stillQueued[0].userId === "user-A", "la commande de A reste intacte en file, jamais réattribuée à B");

  unmount();

  // Preuve positive du câblage (et pas seulement de son absence) : quand A
  // revient réellement, useVoiceCore doit soumettre SA commande au moteur —
  // sinon un oubli du passage de context.userId à useOfflineVoiceQueue
  // romprait le rejeu pour TOUT LE MONDE sans qu'aucune assertion "jamais
  // sous B" ne le révèle (un rejeu qui n'arrive jamais est aussi "jamais
  // exécuté sous B" = 0, donc indiscernable d'un cloisonnement correct).
  // La vente exige une confirmation orale avant tout enregistrement (jamais
  // d'exécution financière automatique, y compris au rejeu) : on vérifie
  // donc que le texte de A a bien été transmis au moteur d'intention sous SA
  // session — pas que la vente s'est auto-validée.
  const containerA = document.createElement("div");
  document.body.appendChild(containerA);
  const harnessA = makeHarness("user-A", () => {});
  const { unmount: unmountA } = render(React.createElement(harnessA.Harness), { container: containerA });

  await act(async () => { await new Promise((r) => setTimeout(r, 1200)); });

  ok(
    harnessA.core?.state === "confirming" || !!harnessA.core?.pendingResponse,
    "sous A, le câblage soumet réellement sa propre commande au moteur d'intention (entrée en confirmation, jamais d'exécution auto)",
  );

  unmountA();
  audioManager.__resetPlayers();
  audioManager.__reset();
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });

  console.log(failures === 0 ? "\nCâblage multi-utilisateur useVoiceCore validé." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

run();
