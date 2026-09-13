/**
 * useOfflineVoiceQueue — cloisonnement par utilisateur (LOT 1 / P1-1).
 * Lancer : npm run test:offline-voice-queue
 *
 * Scénarios exigés : terminal partagé (jamais rejoué sous le mauvais compte),
 * logout/login (la file du propriétaire se rejoue normalement à son retour),
 * redémarrage (la file survit à un démontage complet, localStorage), commande
 * héritée sans propriétaire (JAMAIS adoptée ni rejouée automatiquement, quel
 * que soit le compte connecté — correctif post-revue, voir T4/T4b), et
 * clearQueue() qui vide réellement le support persisté (localStorage, pas
 * sessionStorage — #7).
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
});
// En ligne dès le montage : les scénarios ci-dessous simulent une file
// remplie PENDANT une coupure passée (via localStorage direct), puis un
// retour réseau déjà effectif au montage du hook — pas besoin de simuler
// l'événement "online" en plus.
Object.defineProperty(dom.window.navigator, "onLine", { configurable: true, value: true });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const React = await import("react");
const { act, renderHook } = await import("@testing-library/react");
const { useOfflineVoiceQueue, CURRENT_SEMANTICS_VERSION } = await import("./useOfflineVoiceQueue.js");

const STORAGE_KEY = "julaba_offline_voice_queue";

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function seedQueue(cmds: Array<Record<string, unknown>>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cmds));
}
function readQueue(): Array<{ id: string; userId?: string; retries: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  // T1 — terminal partagé : une commande de A n'est JAMAIS rejouée sous B.
  {
    localStorage.clear();
    seedQueue([{ id: "c1", text: "vends 2 tomates", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" }]);
    let replayCalls = 0;
    const { unmount } = renderHook(() => useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-B"));
    await act(async () => { await wait(100); });
    ok(replayCalls === 0, "T1 rejeu sous B n'exécute jamais la commande de A");
    const q = readQueue();
    ok(q.length === 1 && q[0].userId === "user-A", "T1 la commande de A reste intacte en file, jamais réattribuée à B");
    unmount();
  }

  // T2 — logout/login : B se connecte d'abord (ignorée), puis A revient et
  // SA commande se rejoue normalement, sans perte.
  {
    localStorage.clear();
    seedQueue([{ id: "c2", text: "vends 1 oignon", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: CURRENT_SEMANTICS_VERSION }]);
    let replayCallsB = 0;
    const hookB = renderHook(() => useOfflineVoiceQueue(async () => { replayCallsB++; return true; }, "user-B"));
    await act(async () => { await wait(100); });
    ok(replayCallsB === 0, "T2 B (connecté avant A) n'exécute rien");
    hookB.unmount();

    let replayCallsA = 0;
    const hookA = renderHook(() => useOfflineVoiceQueue(async () => { replayCallsA++; return true; }, "user-A"));
    await act(async () => { await wait(1000); });
    ok(replayCallsA === 1, "T2 A, en revenant, voit sa commande rejouée");
    ok(readQueue().length === 0, "T2 file de A vidée après son propre rejeu, jamais perdue");
    hookA.unmount();
  }

  // T3 — redémarrage : après un démontage COMPLET (fermeture d'appli), la
  // commande de A survit (elle est en localStorage, pas en mémoire) et se
  // rejoue normalement quand A revient.
  {
    localStorage.clear();
    seedQueue([{ id: "c3", text: "vends 3 bananes", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: CURRENT_SEMANTICS_VERSION }]);
    let replayCalls = 0;
    const hookA = renderHook(() => useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"));
    await act(async () => { await wait(1000); });
    ok(replayCalls === 1, "T3 après redémarrage, la commande de A survit et se rejoue (rien perdu)");
    ok(readQueue().length === 0, "T3 file vidée après rejeu");
    hookA.unmount();
  }

  // T4 — CORRECTIF POST-REVUE : une commande héritée (sans champ userId) n'est
  // JAMAIS adoptée par l'utilisateur connecté ni rejouée automatiquement,
  // quel que soit ce compte — l'identité courante n'est pas une preuve de qui
  // a prononcé cette commande (potentiellement une vente). Reste intacte,
  // consultable, jamais comptée comme appartenant à qui que ce soit.
  {
    localStorage.clear();
    seedQueue([{ id: "legacy-1", text: "vends 1 carotte", timestamp: Date.now(), context: {}, retries: 0 }]);
    let replayCalls = 0;
    const { result, unmount } = renderHook(() => useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-B"));
    await act(async () => { await wait(1000); });
    ok(replayCalls === 0, "T4 commande héritée jamais rejouée automatiquement sous B");
    ok(result.current.pendingCount === 0, "T4 jamais comptée comme appartenant à B (pendingCount)");
    const q = readQueue();
    ok(q.length === 1 && !q[0].userId, "T4 reste intacte en file, propriétaire toujours inconnu, jamais attribuée à B");
    unmount();
  }

  // T4b — logout/login : que ce soit B ou A qui se connecte ensuite (dans
  // n'importe quel ordre), une commande héritée sans propriétaire ne change
  // JAMAIS de propriétaire implicitement.
  {
    localStorage.clear();
    seedQueue([{ id: "legacy-2", text: "vends 1 mangue", timestamp: Date.now(), context: {}, retries: 0 }]);
    const hookB = renderHook(() => useOfflineVoiceQueue(async () => true, "user-B"));
    await act(async () => { await wait(300); });
    hookB.unmount();
    const hookA = renderHook(() => useOfflineVoiceQueue(async () => true, "user-A"));
    await act(async () => { await wait(300); });
    hookA.unmount();
    const q = readQueue();
    ok(q.length === 1 && !q[0].userId, "T4b aucun changement de propriétaire implicite, quel que soit qui se connecte ensuite");
  }

  // T5 — sans utilisateur connu, aucun rejeu automatique (garde de sécurité) ;
  // clearQueue() vide réellement localStorage (#7 — avant, seul sessionStorage
  // était vidé, jamais la vraie file).
  {
    localStorage.clear();
    sessionStorage.setItem(STORAGE_KEY, "leurre"); // ne doit jamais être ce qu'on vérifie
    seedQueue([{ id: "c5", text: "vends 1 huile", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" }]);
    const { result, unmount } = renderHook(() => useOfflineVoiceQueue(async () => true, undefined));
    await act(async () => { await wait(100); });
    ok(readQueue().length === 1, "T5 (pré-requis) sans utilisateur connu, rien n'est rejoué automatiquement");
    act(() => { result.current.clearQueue(); });
    ok(localStorage.getItem(STORAGE_KEY) === null, "T5 clearQueue() vide réellement le support persisté (localStorage)");
    ok(result.current.queue.length === 0, "T5 clearQueue() vide aussi l'état React exposé au composant");
    unmount();
  }

  // T6 — pendingCount (badge affiché à la marchande) ne compte JAMAIS la file
  // d'un autre compte sur le même terminal.
  {
    localStorage.clear();
    seedQueue([
      { id: "c6a", text: "vends 1 aubergine", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" },
      { id: "c6b", text: "vends 1 huile", timestamp: Date.now(), context: {}, retries: 0, userId: "user-B" },
    ]);
    const { result, unmount } = renderHook(() => useOfflineVoiceQueue(async () => false, "user-A"));
    await act(async () => { await wait(1000); });
    ok(result.current.pendingCount === 1, "T6 pendingCount ne compte que la file de l'utilisateur courant");
    unmount();
  }

  // T7 — Lot 2 (convergence voix/tactile POS) : une nouvelle commande mise en
  // file reçoit bien CURRENT_SEMANTICS_VERSION — jamais silencieusement absente.
  {
    localStorage.clear();
    const { result, unmount } = renderHook(() => useOfflineVoiceQueue(async () => true, "user-A"));
    act(() => { result.current.enqueue("vends 2 tomates", { module: "caisse" }); });
    const q = readQueue() as Array<{ semanticsVersion?: number }>;
    ok(q.length === 1 && q[0].semanticsVersion === CURRENT_SEMANTICS_VERSION, "T7 enqueue() horodate la commande avec la sémantique courante");
    unmount();
  }

  // T8 — entrée v2 (sémantique courante) + bon utilisateur → rejeu normal.
  {
    localStorage.clear();
    seedQueue([{ id: "v2-1", text: "vends 1 poivron", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: CURRENT_SEMANTICS_VERSION }]);
    let replayCalls = 0;
    const hookA = renderHook(() => useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"));
    await act(async () => { await wait(1000); });
    ok(replayCalls === 1, "T8 une commande à la sémantique courante et au bon propriétaire est rejouée normalement");
    ok(readQueue().length === 0, "T8 file vidée après son rejeu");
    hookA.unmount();
  }

  // T9 — QUARANTAINE SÉMANTIQUE (Lot 2) : une commande SANS version (mise en
  // file avant ce champ, sous l'ancienne sémantique « vendre » = encaissement
  // direct) n'est JAMAIS rejouée automatiquement par le code courant, même
  // avec le bon propriétaire connecté — même doctrine que userId manquant.
  // Ni supprimée, ni réinterprétée, ni comptée en échec (retries inchangé).
  {
    localStorage.clear();
    seedQueue([{ id: "pre-lot2", text: "vends 5 mangues à 2500 francs", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" }]);
    let replayCalls = 0;
    const { result, unmount } = renderHook(() => useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"));
    await act(async () => { await wait(1000); });
    ok(replayCalls === 0, "T9 commande antérieure au Lot 2 (sans semanticsVersion) jamais rejouée automatiquement");
    const q = readQueue() as Array<{ id: string; retries: number; semanticsVersion?: number }>;
    ok(q.length === 1 && q[0].id === "pre-lot2", "T9 reste intacte en file, pas supprimée");
    ok(q[0].retries === 0, "T9 aucun incrément de retries pour une entrée en quarantaine (ce n'est pas un échec de rejeu)");
    ok(q[0].semanticsVersion === undefined, "T9 le champ n'est jamais ajouté après coup — pas de réinterprétation implicite");
    unmount();
  }

  // T9b — une entrée à une version FUTURE/différente (ex. 1, ou 3 lors d'une
  // prochaine bascule) est mise en quarantaine exactement comme une entrée
  // sans version — le test ne suppose jamais « ancien = absent ».
  {
    localStorage.clear();
    seedQueue([{ id: "v1-ancien", text: "vends 1 igname", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: 1 }]);
    let replayCalls = 0;
    const { unmount } = renderHook(() => useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"));
    await act(async () => { await wait(1000); });
    ok(replayCalls === 0, "T9b une version explicitement différente de la version courante est aussi mise en quarantaine");
    ok(readQueue().length === 1, "T9b reste intacte en file");
    unmount();
  }

  console.log(failures === 0 ? "\nTous les tests de cloisonnement de la file vocale sont verts ✅" : `\n${failures} test(s) en échec ❌`);
  process.exit(failures ? 1 : 0);
}
run();
