/**
 * Vitest — useOfflineVoiceQueue — cloisonnement par utilisateur (LOT 1 / P1-1).
 * Migration depuis `useOfflineVoiceQueue.test.tsx` (JSDOM manuel + helpers
 * ad-hoc `ok()` + `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:offline-voice-queue`) — cohabitation INIT-021.
 *
 * Scénarios exigés : terminal partagé (jamais rejoué sous le mauvais compte),
 * logout/login (la file du propriétaire se rejoue normalement à son retour),
 * redémarrage (la file survit à un démontage complet, localStorage), commande
 * héritée sans propriétaire (JAMAIS adoptée ni rejouée automatiquement, quel
 * que soit le compte connecté — correctif post-revue, voir T4/T4b), et
 * clearQueue() qui vide réellement le support persisté (localStorage, pas
 * sessionStorage — #7).
 *
 * Bénéfices de la migration :
 *   - plus de setup JSDOM manuel (géré par `environment: 'jsdom'` + setup.ts) ;
 *   - plus de `IS_REACT_ACT_ENVIRONMENT` à poser à la main (idem) ;
 *   - `cleanup()` + `localStorage.clear()` automatiques entre les `it()` ;
 *   - chaque scénario apparaît individuellement dans le rapport Vitest.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOfflineVoiceQueue, CURRENT_SEMANTICS_VERSION } from "./useOfflineVoiceQueue.js";

const STORAGE_KEY = "julaba_offline_voice_queue";

interface QueueEntry {
  id: string;
  text: string;
  timestamp: number;
  context: Record<string, unknown>;
  retries: number;
  userId?: string;
  semanticsVersion?: number;
}

function seedQueue(cmds: Array<Record<string, unknown>>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cmds));
}

function readQueue(): QueueEntry[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("useOfflineVoiceQueue — cloisonnement par utilisateur", () => {
  it("T1 — terminal partagé : une commande de A n'est JAMAIS rejouée sous B", async () => {
    seedQueue([{ id: "c1", text: "vends 2 tomates", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" }]);
    let replayCalls = 0;
    const { unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-B"),
    );
    await act(async () => { await wait(100); });
    expect(replayCalls).toBe(0);
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].userId).toBe("user-A");
    unmount();
  });

  it("T2 — logout/login : B se connecte d'abord (ignorée), puis A revient et SA commande se rejoue", async () => {
    seedQueue([{ id: "c2", text: "vends 1 oignon", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: CURRENT_SEMANTICS_VERSION }]);
    let replayCallsB = 0;
    const hookB = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCallsB++; return true; }, "user-B"),
    );
    await act(async () => { await wait(100); });
    expect(replayCallsB).toBe(0);
    hookB.unmount();

    let replayCallsA = 0;
    const hookA = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCallsA++; return true; }, "user-A"),
    );
    await act(async () => { await wait(1000); });
    expect(replayCallsA).toBe(1);
    expect(readQueue().length).toBe(0);
    hookA.unmount();
  });

  it("T3 — redémarrage : après un démontage COMPLET, la commande de A survit et se rejoue", async () => {
    seedQueue([{ id: "c3", text: "vends 3 bananes", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: CURRENT_SEMANTICS_VERSION }]);
    let replayCalls = 0;
    const hookA = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"),
    );
    await act(async () => { await wait(1000); });
    expect(replayCalls).toBe(1);
    expect(readQueue().length).toBe(0);
    hookA.unmount();
  });

  it("T4 — CORRECTIF POST-REVUE : une commande héritée (sans userId) n'est JAMAIS adoptée ni rejouée", async () => {
    // L'identité courante n'est pas une preuve de qui a prononcé cette commande
    // (potentiellement une vente). Reste intacte, consultable, jamais comptée
    // comme appartenant à qui que ce soit.
    seedQueue([{ id: "legacy-1", text: "vends 1 carotte", timestamp: Date.now(), context: {}, retries: 0 }]);
    let replayCalls = 0;
    const { result, unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-B"),
    );
    await act(async () => { await wait(1000); });
    expect(replayCalls).toBe(0);
    expect(result.current.pendingCount).toBe(0);
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].userId).toBeUndefined();
    unmount();
  });

  it("T4b — logout/login : aucun changement de propriétaire implicite, quel que soit qui se connecte", async () => {
    seedQueue([{ id: "legacy-2", text: "vends 1 mangue", timestamp: Date.now(), context: {}, retries: 0 }]);
    const hookB = renderHook(() => useOfflineVoiceQueue(async () => true, "user-B"));
    await act(async () => { await wait(300); });
    hookB.unmount();
    const hookA = renderHook(() => useOfflineVoiceQueue(async () => true, "user-A"));
    await act(async () => { await wait(300); });
    hookA.unmount();
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].userId).toBeUndefined();
  });

  it("T5 — sans utilisateur connu : aucun rejeu auto, et clearQueue() ne supprime RIEN (fail-closed)", async () => {
    // Avant ce correctif, clearQueue() vidait toute la file du terminal sans
    // distinction. Maintenant, sans utilisateur connu, fail-closed.
    seedQueue([{ id: "c5", text: "vends 1 huile", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" }]);
    // Leurre en sessionStorage : ne doit jamais être ce qu'on vérifie.
    sessionStorage.setItem(STORAGE_KEY, "leurre");
    const { result, unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => true, undefined),
    );
    await act(async () => { await wait(100); });
    expect(readQueue().length).toBe(1);
    act(() => { result.current.clearQueue(); });
    expect(readQueue().length).toBe(1);
    expect(result.current.queue.length).toBe(1);
    unmount();
  });

  it("T5b — terminal partagé : A vide sa file, SEULES les commandes de A disparaissent", async () => {
    seedQueue([
      { id: "c5b-a1", text: "vends 1 tomate", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" },
      { id: "c5b-a2", text: "vends 2 bananes", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" },
      { id: "c5b-b1", text: "vends 1 igname", timestamp: Date.now(), context: {}, retries: 0, userId: "user-B" },
    ]);
    const { result, unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => false, "user-A"),
    );
    await act(async () => { await wait(100); });
    act(() => { result.current.clearQueue(); });
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].userId).toBe("user-B");
    expect(result.current.queue.every((c) => c.userId !== "user-A")).toBe(true);
    unmount();
  });

  it("T5c — une commande héritée (sans userId) n'est JAMAIS supprimée par clearQueue()", async () => {
    seedQueue([
      { id: "c5c-legacy", text: "vends 1 mangue", timestamp: Date.now(), context: {}, retries: 0 },
      { id: "c5c-a", text: "vends 1 poivron", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" },
    ]);
    const { result, unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => false, "user-A"),
    );
    await act(async () => { await wait(100); });
    act(() => { result.current.clearQueue(); });
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].id).toBe("c5c-legacy");
    expect(q[0].userId).toBeUndefined();
    unmount();
  });

  it("T6 — pendingCount ne compte JAMAIS la file d'un autre compte sur le même terminal", async () => {
    seedQueue([
      { id: "c6a", text: "vends 1 aubergine", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" },
      { id: "c6b", text: "vends 1 huile", timestamp: Date.now(), context: {}, retries: 0, userId: "user-B" },
    ]);
    const { result, unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => false, "user-A"),
    );
    await act(async () => { await wait(1000); });
    expect(result.current.pendingCount).toBe(1);
    unmount();
  });

  it("T7 — Lot 2 : une nouvelle commande mise en file reçoit CURRENT_SEMANTICS_VERSION", async () => {
    const { result, unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => true, "user-A"),
    );
    act(() => { result.current.enqueue("vends 2 tomates", { module: "caisse" }); });
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].semanticsVersion).toBe(CURRENT_SEMANTICS_VERSION);
    unmount();
  });

  it("T8 — entrée v2 (sémantique courante) + bon utilisateur → rejeu normal", async () => {
    seedQueue([{ id: "v2-1", text: "vends 1 poivron", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: CURRENT_SEMANTICS_VERSION }]);
    let replayCalls = 0;
    const hookA = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"),
    );
    await act(async () => { await wait(1000); });
    expect(replayCalls).toBe(1);
    expect(readQueue().length).toBe(0);
    hookA.unmount();
  });

  it("T9 — QUARANTAINE SÉMANTIQUE (Lot 2) : une commande SANS version n'est JAMAIS rejouée automatiquement", async () => {
    // Une commande mise en file avant ce champ, sous l'ancienne sémantique
    // « vendre » = encaissement direct. Même doctrine que userId manquant :
    // ni supprimée, ni réinterprétée, ni comptée en échec (retries inchangé).
    seedQueue([{ id: "pre-lot2", text: "vends 5 mangues à 2500 francs", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A" }]);
    let replayCalls = 0;
    const { unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"),
    );
    await act(async () => { await wait(1000); });
    expect(replayCalls).toBe(0);
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].id).toBe("pre-lot2");
    expect(q[0].retries).toBe(0);
    expect(q[0].semanticsVersion).toBeUndefined();
    unmount();
  });

  it("T9b — une version explicitement différente de la courante est aussi mise en quarantaine", async () => {
    // Le test ne suppose jamais « ancien = absent » : une version future ou
    // différente est traitée pareil.
    seedQueue([{ id: "v1-ancien", text: "vends 1 igname", timestamp: Date.now(), context: {}, retries: 0, userId: "user-A", semanticsVersion: 1 }]);
    let replayCalls = 0;
    const { unmount } = renderHook(() =>
      useOfflineVoiceQueue(async () => { replayCalls++; return true; }, "user-A"),
    );
    await act(async () => { await wait(1000); });
    expect(replayCalls).toBe(0);
    expect(readQueue().length).toBe(1);
    unmount();
  });
});
