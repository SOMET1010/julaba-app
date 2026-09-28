/**
 * Vitest — Tests du compteur local « réponses du support non lues ».
 * Migration depuis `supportLu.test.mts` (helpers ad-hoc `ok()/eq()` +
 * `main()` + `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:support`) — cohabitation INIT-021.
 *
 * Lancer : `npm run test:vitest`.
 */
import { describe, it, expect } from "vitest";
import {
  compterReponsesNonVues,
  marquerToutVu,
  CLE_SUPPORT_VU,
  type KVStore,
  type TicketSupport,
} from "./supportLu.js";

function makeStore(
  seed: Record<string, string> = {},
): KVStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const T = (
  id: string,
  messages: Array<["user" | "bo", string]>,
): TicketSupport => ({
  id,
  messages: messages.map(([auteur, date]) => ({ auteur, date })),
});

describe("Comptage des réponses du support", () => {
  it("2 réponses du support, jamais rien vu", () => {
    const s = makeStore();
    const tickets = [
      T("t1", [["user", "2026-08-01"], ["bo", "2026-08-02"], ["bo", "2026-08-03"]]),
      T("t2", [["user", "2026-08-05"]]),
    ];
    expect(compterReponsesNonVues(s, tickets)).toBe(2);
  });

  it("aucun ticket → 0", () => {
    const s = makeStore();
    expect(compterReponsesNonVues(s, [])).toBe(0);
  });

  it("pas de stockage → tout compte (jamais de casse)", () => {
    const tickets = [
      T("t1", [["user", "2026-08-01"], ["bo", "2026-08-02"], ["bo", "2026-08-03"]]),
      T("t2", [["user", "2026-08-05"]]),
    ];
    expect(compterReponsesNonVues(null, tickets)).toBe(2);
  });
});

describe("Les messages de l'utilisatrice ne comptent JAMAIS", () => {
  it("que des messages user → 0", () => {
    const s = makeStore();
    expect(
      compterReponsesNonVues(s, [T("t1", [["user", "2026-08-01"], ["user", "2026-08-02"]])]),
    ).toBe(0);
  });
});

describe("Ouvrir le support remet à zéro — puis une nouvelle réponse recompte", () => {
  it("marquage accepté, tout vu → 0 ; une réponse POSTÉRIEURE au dernier vu → 1", () => {
    const s = makeStore();
    const tickets = [T("t1", [["bo", "2026-08-02"], ["bo", "2026-08-03"]])];
    expect(marquerToutVu(s, tickets, "2026-08-04T00:00:00.000Z")).toBe(true);
    expect(compterReponsesNonVues(s, tickets)).toBe(0);
    const apres = [T("t1", [["bo", "2026-08-02"], ["bo", "2026-08-03"], ["bo", "2026-08-05"]])];
    expect(compterReponsesNonVues(s, apres)).toBe(1);
  });
});

describe("Chaque ticket a sa propre mémoire", () => {
  it("t1 vu, t2 jamais vu → 1", () => {
    const s = makeStore();
    marquerToutVu(s, [T("t1", [["bo", "2026-08-02"]])], "2026-08-03");
    const tickets = [T("t1", [["bo", "2026-08-02"]]), T("t2", [["bo", "2026-08-02"]])];
    expect(compterReponsesNonVues(s, tickets)).toBe(1);
  });
});

describe("Robustesse : mémoire illisible, stockage en panne, borne", () => {
  it("mémoire illisible → on recompte tout", () => {
    const s = makeStore({ [CLE_SUPPORT_VU]: "{pas du json" });
    expect(compterReponsesNonVues(s, [T("t1", [["bo", "2026-08-02"]])])).toBe(1);
  });

  it("quota plein → false, pas d'exception", () => {
    const casse: KVStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(marquerToutVu(casse, [T("t1", [])], "2026-08-04")).toBe(false);
  });

  it("mémoire bornée à 100 tickets", () => {
    const s2 = makeStore();
    const beaucoup = Array.from({ length: 150 }, (_, i) => T(`t${i}`, []));
    marquerToutVu(s2, beaucoup, "2026-08-04");
    const memoire = JSON.parse(s2.data[CLE_SUPPORT_VU]) as Record<string, unknown>;
    expect(Object.keys(memoire).length).toBe(100);
  });
});
