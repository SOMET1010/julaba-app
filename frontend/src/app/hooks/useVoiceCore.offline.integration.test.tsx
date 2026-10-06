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
const dit: string[] = [];

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
  (text) => {
    localTtsCalls++;
    dit.push(`synthèse:${text}`);
    return { promise: Promise.resolve("ended"), stop() {} };
  },
  (source) => {
    localClipCalls++;
    dit.push(`clip:${source.url ?? "base64"}`);
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
// La question porte un montant dynamique : sans clip, le filet la dit
// (décision du 25/09/2026, « le filet parle partout »). Elle est dite UNE
// fois. Après le « oui », Tata dit « J'ai compris » (clip ui-057) et
// enregistre — elle ne repose pas « c'est bien ça ? » sur une vente déjà
// confirmée.
const QUESTION = "synthèse:Vente de 3 tomates pour 500 francs, c'est bien ça ?";
ok(
  JSON.stringify(dit) === JSON.stringify([QUESTION, "clip:/voix/tata/ui-057.mp3"]),
  `confirmation : la question est dite une seule fois, puis « J'ai compris » (${JSON.stringify(dit)})`,
);
ok(networkCalls === 0, "avec clip Tata : le vrai hook n’effectue aucun appel réseau");

// Un second « oui » (bouton ou voix) après la confirmation n'envoie rien.
await act(async () => { await core!.confirmAction(); });
await act(async () => { await core!.sendText("oui"); });
const apres = JSON.parse(localStorage.getItem("julaba_offline_voice_queue") || "[]") as unknown[];
ok(apres.length === 1 && onActionCalls === 0, "un second « oui » après la confirmation ne crée pas de seconde vente");

localTtsCalls = 0;
localClipCalls = 0;
await act(async () => { await core!.speak("Montant dynamique : 1 250 francs"); });
// « Le filet parle partout » — arbitrage de Patrick du 25/09/2026 (commit
// 6a142d2) : sans clip de Tata, la synthèse prend le relais. L'ancienne
// attente (« ni voix navigateur ni clip ») était la règle « Choix B » que
// cette décision a abolie : une phrase importante ne se tait plus.
ok(localTtsCalls === 1 && localClipCalls === 0, "sans clip Tata : le filet parle — une seule synthèse, aucun clip (décision du 25/09)");

audioManager.__resetPlayers();
audioManager.__reset();
Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
console.log(failures === 0 ? "\nIntégration useVoiceCore hors ligne validée." : `\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
