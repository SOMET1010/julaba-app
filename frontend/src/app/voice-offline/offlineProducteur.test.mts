/**
 * Tests de la file hors-ligne du PRODUCTEUR (BUG-008).
 * Lancer : npm run test:offline-producteur  (tsx, store mémoire injecté, sans IndexedDB)
 *
 * La sémantique de rejeu n'est PAS recopiée : elle est EMPRUNTÉE à
 * offlineCaisse (le même `synchroniser` tourne). Ce banc prouve donc les
 * QUATRE comportements attendus par le registre BUG-008, sur les endpoints
 * du producteur :
 *   T1  nominal — une récolte et une publication mises en file partent au
 *       premier tour, avec la clé d'idempotence portée par le payload ;
 *   T2  4xx lettre morte — un rejet métier (400/403) parque l'op ET ne
 *       bloque pas la file : la suivante part quand même ;
 *   T3  5xx rejeu — conservée, essais comptés, ordre préservé, lettre morte
 *       au CAP (le producteur n'est pas de l'argent : le CAP le protège
 *       comme le stock, contrairement à une vente ARG-03) ;
 *   T4  cloisonnement — l'opération d'un AUTRE producteur n'est ni rejouée
 *       ni touchée par la session courante (P0-1, même règle que la caisse) ;
 *   T5  garde du propriétaire — pas d'utilisateur réel ('anon') → refus
 *       d'enfiler : une récolte sans propriétaire ne naît pas.
 */
import * as op from "./offlineProducteur.js";
import * as oc from "./offlineCaisse.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

// poster factice : selon la clé d'idempotence, réussit ('ok') ou jette une
// HttpError avec un status (number). undefined = succès.
function posterQui(map: Record<string, number | "ok">) {
  return async (_endpoint: oc.ProducteurEndpoint, payload: unknown): Promise<void> => {
    const key = (payload as { idempotency_key: string }).idempotency_key;
    const r = map[key];
    if (r === undefined || r === "ok") return;
    const e = new Error(`HTTP ${r}`) as Error & { status: number };
    e.status = r;
    throw e;
  };
}
const UID = "producteur-A";

async function seed(store: oc.OutboxStore, ids: string[], endpoint: "/recoltes" | "/publications" = "/recoltes", userId: string = UID) {
  for (const id of ids) {
    if (endpoint === "/recoltes") await op.enfilerRecolte({ idempotency_key: id, produit: "igname", quantite: 10 }, userId, store);
    else await op.enfilerPublication({ idempotency_key: id, produit: "igname", prix_unitaire: 500 }, userId, store);
  }
}

async function run() {
  // T1 — NOMINAL : récolte et publication partent, chaque endpoint est vu.
  {
    const store = op.storeProducteurMemoire();
    await op.enfilerRecolte({ idempotency_key: "r-1", produit: "igname", quantite: 10 }, UID, store);
    await op.enfilerPublication({ idempotency_key: "p-1", produit: "igname", prix_unitaire: 500 }, UID, store);
    const vus: oc.ProducteurEndpoint[] = [];
    const res = await op.synchroniserProducteur(async (endpoint) => { vus.push(endpoint); }, UID, store);
    ok(res.ok === 2 && res.reste === 0, "T1 récolte + publication parties au premier tour");
    ok(vus.includes("/recoltes") && vus.includes("/publications"), "T1 les DEUX endpoints du producteur visités");
    ok(await store.activeCount() === 0 && await store.deadCount() === 0, "T1 file et lettres mortes vides");
  }

  // T2 — 4xx lettre morte : parquée, la file CONTINUE (op suivante traitée).
  {
    const store = op.storeProducteurMemoire();
    await seed(store, ["r-1", "r-2"]);
    const res = await op.synchroniserProducteur(posterQui({ "r-1": 400, "r-2": "ok" }), UID, store);
    ok(res.ok === 1 && res.echecs === 1, "T2 la récolte suivante part malgré le rejet métier de la première");
    const dead = await store.deadList();
    ok(dead.length === 1 && dead[0].id === "r-1" && dead[0].echec.status === 400, "T2 lettre morte = la récolte rejetée (400)");
    // purge protégée : un AUTRE utilisateur ne peut pas la purger.
    await op.purgerLettreMorteProducteur("r-1", "producteur-B", store);
    ok(await store.deadCount() === 1, "T2 la lettre morte d'A ne se purge pas sous B");
    await op.purgerLettreMorteProducteur("r-1", UID, store);
    ok(await store.deadCount() === 0, "T2 son propriétaire la purge");
  }

  // T3 — 5xx rejeu : conservé, ordre préservé, lettre morte au CAP.
  {
    const store = op.storeProducteurMemoire();
    await op.enfilerRecolte({ idempotency_key: "x", produit: "manioc", quantite: 3 }, UID, store);
    let tours = 0;
    const bilan1 = await op.synchroniserProducteur(posterQui({ x: 503 }), UID, store);
    ok(bilan1.ok === 0 && bilan1.reste === 1, "T3 503 : la récolte reste en file");
    const opApres = (await store.list()).find(o => o.id === "x");
    ok(opApres?.attempts === 1, "T3 l'essai transitoire est compté");
    for (let i = 0; i < oc.REPLAY_CAP; i++) {
      await op.synchroniserProducteur(posterQui({ x: 503 }), UID, store);
      tours++;
    }
    const dead = await store.deadList();
    ok(dead.length === 1 && dead[0].id === "x", `T3 au CAP (${oc.REPLAY_CAP} essais) : lettre morte, pas d'abandon muet (${tours} tours)`);
  }

  // T4 — CLOISONNEMENT (P0-1) : la file de A n'est pas rejouée sous B.
  {
    const store = op.storeProducteurMemoire();
    await seed(store, ["r-A"], "/recoltes", "producteur-A");
    await seed(store, ["r-B"], "/recoltes", "producteur-B");
    const res = await op.synchroniserProducteur(posterQui({}), "producteur-B", store);
    ok(res.ok === 1 && res.ignorees === 1, "T4 B rejoue la sienne, la récolte de A est ignorée, intacte");
    const restantes = await store.list();
    ok(restantes.find(o => o.id === "r-A")?.attempts === undefined, "T4 la récolte de A n'a subi AUCUN essai sous B");
    await op.synchroniserProducteur(posterQui({ "r-A": "ok" }), "producteur-A", store);
    ok(await store.activeCount() === 0, "T4 au retour de A, sa récolte part");
  }

  // T5 — GARDE DU PROPRIÉTAIRE : 'anon' ne met rien en file (fail closed).
  {
    const store = op.storeProducteurMemoire();
    let refuse = false;
    try { await op.enfilerRecolte({ produit: "igname" }, null, store); } catch { refuse = true; }
    ok(refuse, "T5 enfiler une récolte SANS propriétaire réel est refusé");
    try { await op.enfilerPublication({ produit: "igname", prix_unitaire: 100 }, "anon", store); } catch { refuse = true; }
    ok(refuse && await store.activeCount() === 0, "T5 'anon' ne vaut pas propriétaire — rien n'est en file");
  }

  console.log(failures === 0 ? "\nFile producteur : tout est vert ✅" : `\n${failures} échec(s) ❌`);
  if (failures) process.exit(1);
}

void run();
