/**
 * Tests du compteur local « réponses du support non lues ».
 * Lancer : npm run test:support   (tsx, sans DOM ni navigateur)
 */
import { compterReponsesNonVues, marquerToutVu, CLE_SUPPORT_VU, type KVStore, type TicketSupport } from "./supportLu.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function makeStore(seed: Record<string, string> = {}): KVStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...seed };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
}

const T = (id: string, messages: Array<[('user' | 'bo'), string]>): TicketSupport => ({
  id, messages: messages.map(([auteur, date]) => ({ auteur, date })),
});

function main() {
  console.log("\n[1] Comptage des réponses du support");
  {
    const s = makeStore();
    const tickets = [
      T("t1", [["user", "2026-08-01"], ["bo", "2026-08-02"], ["bo", "2026-08-03"]]),
      T("t2", [["user", "2026-08-05"]]),
    ];
    eq(compterReponsesNonVues(s, tickets), 2, "2 réponses du support, jamais rien vu");
    eq(compterReponsesNonVues(s, []), 0, "aucun ticket → 0");
    eq(compterReponsesNonVues(null, tickets), 2, "pas de stockage → tout compte (jamais de casse)");
  }

  console.log("\n[2] Les messages de l'utilisatrice ne comptent JAMAIS");
  {
    const s = makeStore();
    eq(compterReponsesNonVues(s, [T("t1", [["user", "2026-08-01"], ["user", "2026-08-02"]])]), 0, "que des messages user → 0");
  }

  console.log("\n[3] Ouvrir le support remet à zéro — puis une nouvelle réponse recompte");
  {
    const s = makeStore();
    const tickets = [T("t1", [["bo", "2026-08-02"], ["bo", "2026-08-03"]])];
    ok(marquerToutVu(s, tickets, "2026-08-04T00:00:00.000Z"), "marquage accepté");
    eq(compterReponsesNonVues(s, tickets), 0, "tout vu → 0");
    const apres = [T("t1", [["bo", "2026-08-02"], ["bo", "2026-08-03"], ["bo", "2026-08-05"]])];
    eq(compterReponsesNonVues(s, apres), 1, "une réponse POSTÉRIEURE au dernier vu → 1");
  }

  console.log("\n[4] Chaque ticket a sa propre mémoire");
  {
    const s = makeStore();
    marquerToutVu(s, [T("t1", [["bo", "2026-08-02"]])], "2026-08-03");
    const tickets = [T("t1", [["bo", "2026-08-02"]]), T("t2", [["bo", "2026-08-02"]])];
    eq(compterReponsesNonVues(s, tickets), 1, "t1 vu, t2 jamais vu → 1");
  }

  console.log("\n[5] Robustesse : mémoire illisible, stockage en panne, borne");
  {
    const s = makeStore({ [CLE_SUPPORT_VU]: "{pas du json" });
    eq(compterReponsesNonVues(s, [T("t1", [["bo", "2026-08-02"]])]), 1, "mémoire illisible → on recompte tout");
    const casse: KVStore = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    ok(!marquerToutVu(casse, [T("t1", [])], "2026-08-04"), "quota plein → false, pas d'exception");
    const s2 = makeStore();
    const beaucoup = Array.from({ length: 150 }, (_, i) => T(`t${i}`, []));
    marquerToutVu(s2, beaucoup, "2026-08-04");
    eq(Object.keys(JSON.parse(s2.data[CLE_SUPPORT_VU])).length, 100, "mémoire bornée à 100 tickets");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
