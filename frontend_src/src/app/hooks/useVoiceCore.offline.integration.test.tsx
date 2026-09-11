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
Object.defineProperty(dom.window.navigator, "onLine", { configurable: true, value: false });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalFetch = globalThis.fetch;
let networkCalls = 0;
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: async () => {
    networkCalls++;
    throw new Error("Le test interdit tout appel réseau vocal");
  },
});

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

type Core = ReturnType<typeof useVoiceCore>;
let core: Core | null = null;
let onActionCalls = 0;
let localTtsCalls = 0;
let localClipCalls = 0;

function Harness() {
  const value = useVoiceCore({
    context: { module: "caisse" },
    onAction: async () => { onActionCalls++; },
  });
  React.useEffect(() => { core = value; }, [value]);
  return React.createElement("div", null, value.liveTranscript);
}

audioManager.__reset();
audioManager.__setPlayers(
  () => {
    localTtsCalls++;
    return { promise: Promise.resolve("ended"), stop() {} };
  },
  () => {
    localClipCalls++;
    return { promise: Promise.resolve("ended"), stop() {} };
  },
);

render(React.createElement(Harness), { container: document.getElementById("root")! });

await act(async () => { await Promise.resolve(); });
await act(async () => {
  await core!.sendText("J'ai vendu 3 tomates à 500 francs");
});
if (core!.pendingResponse) {
  await act(async () => { await core!.confirmAction(); });
}

const queued = JSON.parse(localStorage.getItem("julaba_offline_voice_queue") || "[]") as Array<{ text: string }>;
ok(onActionCalls === 0, "hors ligne : le vrai callback onAction n’est pas appelé");
ok(queued.length === 1 && queued[0].text === "J'ai vendu 3 tomates à 500 francs", "hors ligne : la vraie file locale reçoit la commande");
ok(core!.liveTranscript.includes("synchronisée"), "hors ligne : le message de synchronisation est exposé par le hook");
ok(localClipCalls === 1 && localTtsCalls === 0, "avec clip Tata : le vrai hook lance une seule lecture sans voix navigateur");
ok(networkCalls === 0, "avec clip Tata : le vrai hook n’effectue aucun appel réseau");

localTtsCalls = 0;
localClipCalls = 0;
await act(async () => { await core!.speak("Montant dynamique : 1 250 francs"); });
ok(localTtsCalls === 0 && localClipCalls === 0, "sans clip Tata : le vrai hook ne lance ni voix navigateur ni clip de secours");

audioManager.__resetPlayers();
audioManager.__reset();
Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
console.log(failures === 0 ? "\nIntégration useVoiceCore hors ligne validée." : `\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
