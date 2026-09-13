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
const UID = "user-A";

async function seed(store: oc.OutboxStore, ids: string[], userId: string = UID) {
  let t = 1;
  for (const id of ids) {
    await oc.enfilerOperation("/caisse/vente", { idempotency_key: id, montant: 100 }, userId, store);
    // ts croissant garanti par l'ordre d'insertion
    t++;
  }
}

async function run() {
  // T1 — CŒUR : 4xx en tête + une 2e op → op1 lettre morte, op2 TRAITÉE, file non bloquée.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["a", "b"]);
    const res = await oc.synchroniser(posterQui({ a: 403, b: "ok" }), UID, store);
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
    const r1 = await oc.synchroniser(p, UID, store);
    ok(r1.reste === 1 && r1.echecs === 0, "T2 5xx conservé (essai 1)");
    ok(((await store.list())[0].attempts ?? 0) === 1, "T2 attempts=1 après un essai transitoire");
    for (let i = 2; i < oc.REPLAY_CAP; i++) await oc.synchroniser(p, UID, store); // essais 2..CAP-1
    const rCap = await oc.synchroniser(p, UID, store); // essai CAP → lettre morte
    ok(rCap.echecs === 1 && rCap.reste === 0, `T2 parqué en lettre morte après ${oc.REPLAY_CAP} essais`);
  }

  // T3 — INVARIANT 1 : attempts n'augmente PAS sur un rejet permanent.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["p"]);
    await oc.synchroniser(posterQui({ p: 409 }), UID, store);
    const dead = await store.deadList();
    ok(dead.length === 1 && (dead[0].attempts ?? 0) === 0, "T3 attempts NON incrémenté sur permanent (invariant 1)");
  }

  // T4 — succès : retiré, aucun échec.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["s"]);
    const r = await oc.synchroniser(posterQui({ s: "ok" }), UID, store);
    ok(r.ok === 1 && r.reste === 0 && r.echecs === 0, "T4 succès → retiré");
  }

  // T5 — idempotence : la clé stable est transmise telle quelle au rejeu.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["k1"]);
    let seenKey = "";
    await oc.synchroniser(async (_e, pl) => { seenKey = (pl as { idempotency_key: string }).idempotency_key; }, UID, store);
    ok(seenKey === "k1", "T5 clé d'idempotence stable transmise (pas de double-comptage)");
  }

  // T6 — ordre préservé : un transitoire en tête ARRÊTE le tour (op suivante non tentée).
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["o1", "o2"]);
    const r = await oc.synchroniser(posterQui({ o1: 500, o2: "ok" }), UID, store);
    ok(r.ok === 0 && r.reste === 2, "T6 transitoire en tête → arrêt, ordre préservé (op2 non tentée)");
  }

  // T7 — atomicité observée : après un permanent, l'op est EXACTEMENT en dead (ni active, ni perdue).
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["z"]);
    await oc.synchroniser(posterQui({ z: 400 }), UID, store);
    const active = await store.activeCount();
    const dead = await store.deadCount();
    ok(active === 0 && dead === 1, "T7 move atomique : ni perte ni doublon (0 actif, 1 dead)");
  }

  // ── P0-1 — Cloisonnement par utilisateur (outbox financière) ──────────────

  // T8 — une opération de A n'est JAMAIS rejouée sous B (terminal partagé,
  // logout/login) : ni exécutée, ni supprimée, ni réattribuée.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["a1"], "user-A");
    const r = await oc.synchroniser(posterQui({ a1: "ok" }), "user-B", store);
    ok(r.ok === 0 && r.ignorees === 1, "T8 rejeu sous B ignore l'opération de A (0 exécutée)");
    ok((await store.activeCount()) === 1, "T8 l'opération de A reste active, non perdue");
    const encore = await store.list();
    ok(encore.length === 1 && encore[0].userId === "user-A", "T8 propriétaire toujours A, jamais réattribué à B");
  }

  // T9 — même scénario après un « redémarrage » (le store IndexedDB survit à la
  // fermeture de l'appli) : B se connecte d'abord (ignorée), puis A revient et
  // SA file se rejoue normalement, sans perte.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["a2"], "user-A");
    await oc.synchroniser(posterQui({ a2: "ok" }), "user-B", store); // B d'abord : ignorée
    const r = await oc.synchroniser(posterQui({ a2: "ok" }), "user-A", store); // A revient : rejouée
    ok(r.ok === 1, "T9 l'opération de A est rejouée quand A revient, jamais perdue");
    ok((await store.activeCount()) === 0, "T9 file de A vidée après son propre rejeu");
  }

  // T10 — CORRECTIF POST-REVUE : une opération héritée d'avant P0-1 (posée
  // directement dans le store, sans passer par enfilerOperation → pas de
  // userId) n'est JAMAIS adoptée par l'utilisateur connecté, ni rejouée,
  // quel que soit ce compte — l'identité courante n'est pas une preuve de
  // qui a créé l'opération. Elle reste intacte, comptée à part.
  {
    const store = oc.memoryOutboxStore();
    await store.enqueue({
      id: "legacy-1", endpoint: "/caisse/vente", method: "POST",
      payload: { idempotency_key: "legacy-1", montant: 50 }, ts: Date.now(),
    });
    const r = await oc.synchroniser(posterQui({ "legacy-1": "ok" }), "user-B", store);
    ok(r.ok === 0, "T10 opération héritée jamais rejouée automatiquement, même en ligne");
    ok(r.sansProprietaire === 1, "T10 comptée « sans propriétaire », jamais comme réussie ni ignorée");
    const encore = await store.list();
    ok(encore.length === 1 && !encore[0].userId, "T10 reste intacte en file, propriétaire toujours inconnu, jamais attribuée à B");
    const dead = await store.deadList();
    ok(dead.length === 0, "T10 pas non plus déplacée en lettre morte : simplement mise à part, récupérable");
  }

  // T10b — logout/login : que ce soit B ou A qui se connecte ensuite (dans
  // n'importe quel ordre), une opération héritée sans propriétaire ne change
  // JAMAIS de propriétaire implicitement.
  {
    const store = oc.memoryOutboxStore();
    await store.enqueue({
      id: "legacy-2", endpoint: "/caisse/vente", method: "POST",
      payload: { idempotency_key: "legacy-2", montant: 75 }, ts: Date.now(),
    });
    await oc.synchroniser(posterQui({ "legacy-2": "ok" }), "user-B", store);
    await oc.synchroniser(posterQui({ "legacy-2": "ok" }), "user-A", store);
    const encore = await store.list();
    ok(encore.length === 1 && !encore[0].userId, "T10b aucun changement de propriétaire implicite, quel que soit qui se connecte ensuite");
  }

  // T11 — purgerLettreMorte respecte aussi le cloisonnement : impossible de
  // purger la lettre morte d'un AUTRE compte ; le propriétaire, lui, le peut.
  {
    const store = oc.memoryOutboxStore();
    await seed(store, ["d1"], "user-A");
    await oc.synchroniser(posterQui({ d1: 409 }), "user-A", store); // → lettre morte de A
    await oc.purgerLettreMorte("d1", "user-B", store); // B tente de la purger
    ok((await store.deadCount()) === 1, "T11 purge refusée pour un compte qui n'est pas propriétaire");
    await oc.purgerLettreMorte("d1", "user-A", store); // A la purge
    ok((await store.deadCount()) === 0, "T11 propriétaire peut purger sa propre lettre morte");
  }

  // T12 — CORRECTIF POST-REVUE (2e passe) : enfilerOperation refuse toute
  // opération sans utilisateur authentifié RÉEL — jamais de propriétaire de
  // secours ('anon', chaîne vide, absent). Aucune entrée ne doit être créée.
  {
    const store = oc.memoryOutboxStore();

    let threwUndefined = false;
    try {
      await oc.enfilerOperation("/caisse/vente", { idempotency_key: "no-user-1", montant: 100 }, undefined as unknown as string, store);
    } catch { threwUndefined = true; }
    ok(threwUndefined, "T12 enfilerOperation refuse un userId absent (undefined)");

    let threwAnon = false;
    try {
      await oc.enfilerOperation("/caisse/vente", { idempotency_key: "no-user-2", montant: 100 }, "anon", store);
    } catch { threwAnon = true; }
    ok(threwAnon, "T12 enfilerOperation refuse explicitement le propriétaire de secours 'anon'");

    let threwEmpty = false;
    try {
      await oc.enfilerOperation("/caisse/vente", { idempotency_key: "no-user-3", montant: 100 }, "", store);
    } catch { threwEmpty = true; }
    ok(threwEmpty, "T12 enfilerOperation refuse une chaîne vide");

    ok((await store.list()).length === 0, "T12 aucune entrée créée dans l'outbox — ni sous anon, ni sous vide, ni sous undefined");
  }

  // T13 — CORRECTIF POST-REVUE (2e passe) : les compteurs retournés par
  // synchroniser() sont cloisonnés par utilisateur — les lettres mortes/actives
  // d'un AUTRE compte sur le même terminal n'apparaissent jamais dans le
  // résultat d'une session, pour éviter qu'un « avant/après » côté appelant
  // (ex. CaisseContext) ne compare le compte de A à un total incluant B.
  {
    const store = oc.memoryOutboxStore();
    // B accumule 2 lettres mortes (rejets définitifs).
    await seed(store, ["db1", "db2"], "user-B");
    await oc.synchroniser(posterQui({ db1: 409, db2: 409 }), "user-B", store);
    ok((await oc.nbEchecs("user-B", store)) === 2, "T13 (pré-requis) B a bien 2 lettres mortes");
    ok((await oc.nbEchecs("user-A", store)) === 0, "T13 (pré-requis) A n'a aucune lettre morte");

    // A synchronise sa propre file (vide) : le résultat ne doit refléter QUE A,
    // jamais les 2 lettres mortes de B présentes dans le même store.
    const r = await oc.synchroniser(posterQui({}), "user-A", store);
    ok(r.echecs === 0, "T13 synchroniser() sous A ne retourne PAS les lettres mortes de B (plus de deadCount() global)");
    ok(r.reste === 0, "T13 synchroniser() sous A ne retourne PAS les opérations actives de B (plus d'activeCount() global)");
  }

  console.log(failures === 0 ? "\nTous les tests file hors-ligne sont verts ✅" : `\n${failures} test(s) en échec ❌`);
  process.exit(failures ? 1 : 0);
}
run();
