/**
 * Tests du module de persistance du panier (Phase 1, lot 1).
 * Lancer : npm run test:cart   (tsx, sans DOM ni navigateur)
 *
 * Couvre la spec R1/R2/R4/R5 + les tests demandés (R6) réalisables au niveau
 * du stockage. Les tests d'orchestration React (drapeau d'hydratation, A→B en
 * mémoire vive, confirmation de déconnexion à l'écran) viennent avec le lot 2.
 */
import * as cs from "./cartStorage.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

/** Store factice en mémoire. */
function makeStore(seed: Record<string, string> = {}): cs.KVStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}
/** Store dont TOUTE écriture échoue (quota / mode privé). */
function makeThrowingStore(): cs.KVStore {
  return {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => { throw new Error("QuotaExceededError"); },
  };
}

const ITEM = (o: Partial<cs.PersistedCartItem> = {}): cs.PersistedCartItem => ({
  productId: "p1", nom: "Tomate", prix: 500, quantite: 2, ...o,
});
const NOW = Date.parse("2026-08-10T12:00:00.000Z");
const NOW_ISO = new Date(NOW).toISOString();

function main() {
  console.log("\n[1] Aller-retour sérialisation");
  {
    const items = [ITEM(), ITEM({ productId: "p2", nom: "Piment", prix: 100, quantite: 5 })];
    const env = cs.parseCart(cs.serializeCart(items, NOW_ISO));
    // P0.1 (27/09) : la comparaison d'objet entier ne tient plus, la v3 ajoute
    // `ligneId` et `productIdCatalogue`. On vérifie MIEUX qu'avant : les
    // champs d'origine survivent À L'IDENTIQUE, et la séparation est faite.
    for (const [i, attendu] of items.entries()) {
      const obtenu = env?.items[i] as Record<string, unknown> | undefined;
      eq(obtenu?.nom, attendu.nom, `ligne ${i} : nom conservé`);
      eq(obtenu?.prix, attendu.prix, `ligne ${i} : prix conservé`);
      eq(obtenu?.quantite, attendu.quantite, `ligne ${i} : quantité conservée`);
      eq(obtenu?.ligneId, attendu.productId, `ligne ${i} : l'ancien productId devient l'identité de LIGNE`);
      eq(obtenu?.productIdCatalogue, null, `ligne ${i} : « ${attendu.productId} » n'est pas un UUID → pas un produit catalogue`);
    }
    // PAN-01 (27/09) : on écrit désormais en v2 — quatre champs de plus,
    // aucun retiré. La v1 reste LUE (voir « un panier v1 se recharge »).
    // P0.1 : version courante 3 (identité ligne/produit). v1 et v2 restent lues.
    eq(env?.v, 3, "enveloppe versionnée v=3");
  }

  console.log("\n[2] Lignes malformées écartées");
  {
    const raw = JSON.stringify({
      v: 1, updatedAt: NOW_ISO,
      items: [
        ITEM(),
        { productId: "", nom: "x", prix: 10, quantite: 1 },      // id vide
        { productId: "p3", nom: "y", prix: -5, quantite: 1 },     // prix négatif
        { productId: "p4", nom: "z", prix: 10, quantite: 0 },     // qté 0
        { productId: "p5", nom: "w", prix: 10, quantite: 1.5 },   // qté non entière
        { productId: "p6", prix: 10, quantite: 1 },               // nom manquant
        null, 42, "nope",
      ],
    });
    const env = cs.parseCart(raw);
    eq(env?.items.length, 1, "seule la ligne valide est conservée");
    eq(env?.items[0].productId, "p1", "c'est bien la bonne ligne");
  }

  console.log("\n[3] JSON corrompu / vide → null (jamais d'exception)");
  {
    eq(cs.parseCart("{ pas du json"), null, "JSON invalide → null");
    eq(cs.parseCart(null), null, "null → null");
    eq(cs.parseCart(""), null, "chaîne vide → null");
    // PAN-01 : `v: 2` servait ici d'exemple de version inconnue — il est
    // devenu la version COURANTE. On prend une version qui ne peut pas être
    // rattrapée par un lot futur, plutôt que la suivante immédiate.
    eq(cs.parseCart(JSON.stringify({ v: 99, items: [] })), null, "version inconnue → null");
    // La v1 reste LUE et ressort migrée en v2. Ce n'est pas `parseCart` qui
    // écarte un panier vide — c'est `loadCart`, et il le fait plus bas.
    eq(cs.parseCart(JSON.stringify({ v: 1, items: [] }))?.v, 3, "v1 → lue, et rendue en version courante");
    eq(cs.parseCart(JSON.stringify({ v: 2, items: [] }))?.v, 3, "v2 → lue, et rendue en version courante");
  }

  console.log("\n[4] Un panier vide n'est jamais restauré");
  {
    const store = makeStore({ [cs.cartKey("u1")]: cs.serializeCart([], NOW_ISO) });
    eq(cs.loadCart(store, "u1", NOW), null, "clé présente mais 0 ligne → loadCart null");
  }

  console.log("\n[5] La clé ne dépend QUE de l'utilisateur (R2)");
  {
    ok(cs.cartKey("A") !== cs.cartKey("B"), "A et B ont des clés distinctes");
    eq(cs.cartKey("A"), "julaba_cart_A", "forme de clé attendue");
    // Isolation : ce que A a écrit n'est pas lu sous la clé de B.
    const store = makeStore();
    cs.saveCart(store, "A", [ITEM()], NOW_ISO);
    eq(cs.loadCart(store, "B", NOW), null, "B ne voit pas le panier de A");
    ok(cs.loadCart(store, "A", NOW) !== null, "A voit bien son panier");
  }

  console.log("\n[6] Échec de stockage → { ok:false } sans lever (R4)");
  {
    const bad = makeThrowingStore();
    let threw = false;
    let res: { ok: boolean } = { ok: true };
    try { res = cs.saveCart(bad, "u1", [ITEM()], NOW_ISO); } catch { threw = true; }
    ok(!threw, "saveCart ne lève pas malgré l'erreur de stockage");
    eq(res.ok, false, "saveCart signale l'échec (ok:false)");
  }

  console.log("\n[7] Âge du panier — seuil 12 h (R5)");
  {
    const recent = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();   // -2 h
    const old = new Date(NOW - 13 * 60 * 60 * 1000).toISOString();     // -13 h
    eq(cs.cartAge(recent, NOW), "recent", "-2 h → récent");
    eq(cs.cartAge(old, NOW), "stale", "-13 h → ancien");
    eq(cs.cartAge("pas une date", NOW), "stale", "date invalide → ancien (prudent)");
    // Pile au seuil = encore récent (≤).
    eq(cs.cartAge(new Date(NOW - cs.STALE_AFTER_MS).toISOString(), NOW), "recent", "pile au seuil → récent");
  }

  console.log("\n[8] loadCart renvoie l'âge → déclenche reprendre/effacer (R5)");
  {
    const storeRecent = makeStore();
    cs.saveCart(storeRecent, "u1", [ITEM()], new Date(NOW - 60 * 1000).toISOString());
    eq(cs.loadCart(storeRecent, "u1", NOW)?.age, "recent", "panier récent → age recent");

    const storeOld = makeStore();
    cs.saveCart(storeOld, "u2", [ITEM()], new Date(NOW - 20 * 60 * 60 * 1000).toISOString());
    eq(cs.loadCart(storeOld, "u2", NOW)?.age, "stale", "panier vieux → age stale");
  }

  console.log("\n[9] saveCart d'un panier vide EFFACE la clé");
  {
    const store = makeStore();
    cs.saveCart(store, "u1", [ITEM()], NOW_ISO);
    ok(cs.cartKey("u1") in store.data, "clé présente après un ajout");
    cs.saveCart(store, "u1", [], NOW_ISO);
    ok(!(cs.cartKey("u1") in store.data), "clé effacée quand le panier devient vide");
  }

  console.log("\n[10] clearStoredCart efface (déconnexion volontaire — R3)");
  {
    const store = makeStore();
    cs.saveCart(store, "u1", [ITEM()], NOW_ISO);
    cs.clearStoredCart(store, "u1");
    eq(cs.loadCart(store, "u1", NOW), null, "panier effacé après clearStoredCart");
  }

  console.log(failures === 0
    ? "\n✅ Tous les tests cartStorage sont verts.\n"
    : `\n❌ ${failures} test(s) en échec.\n`);
  if (failures > 0) process.exit(1);
}

main();
