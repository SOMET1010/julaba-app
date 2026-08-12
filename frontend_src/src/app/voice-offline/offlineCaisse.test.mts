/**
 * Tests du rejeu de la file hors-ligne caisse (lot « 4xx »).
 * Lancer : npm run test:offline   (tsx, store mémoire injecté, sans IndexedDB)
 *
 * Vérifie : 4xx permanent → lettre morte + continue ; transitoire → attempts +
 * plafond ; invariant « attempts n'augmente que sur transitoire » ; atomicité
 * (ni perte ni doublon) ; idempotence ; ordre préservé sur transitoire.
 */
import * as oc from "./offlineCaisse.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

// poster factice : selon la clé d'idempotence, réussit ('ok') ou jette une
// HttpError avec un status (number). undefined = succès.
function posterQui(map: Record<string, number | "ok">) {
  return async (_endpoint: oc.CaisseEndpoint, payload: unknown): Promise<void> => {
    const key = (payload as { idempotency_key: string }).idempotency_key;
    const r = map[key];
    if (r === undefined || r === "ok") return;
    const e = new Error(`HTTP ${r}`) as Error & { status: number };
    e.status = r;
    throw e;
  };
}
async function seed(store: oc.OutboxStore, ids: string[]) {
  let t = 1;
  for (const id of ids) {
    await oc.enfilerOperation("/caisse/vente", { idempotency_key: id, montant: 100 }, store);
    // ts croissant garanti par l'ordre d'insertion
    t++;
  }
}

async function run() {
  // T1 — CŒUR : 4xx en tête + une 2e op → op1 lettre morte, op2 TRAITÉE, file non bloquée.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["a", "b"]);
    const res = await oc.synchroniser(posterQui({ a: 403, b: "ok" }), store);
    ok(res.ok === 1, "T1 op2 traitée malgré le rejet de op1 (plus de blocage)");
    ok(res.echecs === 1, "T1 op1 passée en lettre morte");
    ok(res.reste === 0, "T1 file active vidée");
    const dead = await store.deadList();
    ok(dead.length === 1 && dead[0].id === "a" && dead[0].echec.status === 403, "T1 lettre morte = op1 (status 403)");
  }

  // T2 — transitoire (5xx) : conservé + attempts, puis parqué au CAP.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["x"]);
    const p = posterQui({ x: 503 });
    const r1 = await oc.synchroniser(p, store);
    ok(r1.reste === 1 && r1.echecs === 0, "T2 5xx conservé (essai 1)");
    ok(((await store.list())[0].attempts ?? 0) === 1, "T2 attempts=1 après un essai transitoire");
    for (let i = 2; i < oc.REPLAY_CAP; i++) await oc.synchroniser(p, store); // essais 2..CAP-1
    const rCap = await oc.synchroniser(p, store); // essai CAP → lettre morte
    ok(rCap.echecs === 1 && rCap.reste === 0, `T2 parqué en lettre morte après ${oc.REPLAY_CAP} essais`);
  }

  // T3 — INVARIANT 1 : attempts n'augmente PAS sur un rejet permanent.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["p"]);
    await oc.synchroniser(posterQui({ p: 409 }), store);
    const dead = await store.deadList();
    ok(dead.length === 1 && (dead[0].attempts ?? 0) === 0, "T3 attempts NON incrémenté sur permanent (invariant 1)");
  }

  // T4 — succès : retiré, aucun échec.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["s"]);
    const r = await oc.synchroniser(posterQui({ s: "ok" }), store);
    ok(r.ok === 1 && r.reste === 0 && r.echecs === 0, "T4 succès → retiré");
  }

  // T5 — idempotence : la clé stable est transmise telle quelle au rejeu.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["k1"]);
    let seenKey = "";
    await oc.synchroniser(async (_e, pl) => { seenKey = (pl as { idempotency_key: string }).idempotency_key; }, store);
    ok(seenKey === "k1", "T5 clé d'idempotence stable transmise (pas de double-comptage)");
  }

  // T6 — ordre préservé : un transitoire en tête ARRÊTE le tour (op suivante non tentée).
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["o1", "o2"]);
    const r = await oc.synchroniser(posterQui({ o1: 500, o2: "ok" }), store);
    ok(r.ok === 0 && r.reste === 2, "T6 transitoire en tête → arrêt, ordre préservé (op2 non tentée)");
  }

  // T7 — atomicité observée : après un permanent, l'op est EXACTEMENT en dead (ni active, ni perdue).
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["z"]);
    await oc.synchroniser(posterQui({ z: 400 }), store);
    const active = await store.activeCount();
    const dead = await store.deadCount();
    ok(active === 0 && dead === 1, "T7 move atomique : ni perte ni doublon (0 actif, 1 dead)");
  }

  console.log(failures === 0 ? "\nTous les tests file hors-ligne sont verts ✅" : `\n${failures} test(s) en échec ❌`);
  process.exit(failures ? 1 : 0);
}
run();
