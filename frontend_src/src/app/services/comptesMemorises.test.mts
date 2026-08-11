/**
 * Tests de « Tata se souvient de moi » (connexion inclusive, lot 1).
 * Lancer : npm run test:comptes   (tsx, sans DOM ni navigateur)
 *
 * Couvre : mémorisation après entrée réussie, accueil du plus récent, téléphone
 * partagé (liste bornée, remontée en tête), conservation du drapeau biométrie,
 * oubli explicite, données illisibles et stockage en panne.
 */
import * as cm from "./comptesMemorises.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function makeStore(seed: Record<string, string> = {}): cm.KVStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}
function makeThrowingStore(): cm.KVStore {
  return {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => { throw new Error("QuotaExceededError"); },
  };
}

const T1 = "2026-08-11T08:00:00.000Z";
const T2 = "2026-08-11T09:00:00.000Z";
const T3 = "2026-08-11T10:00:00.000Z";

function main() {
  console.log("\n[1] Première entrée réussie → Tata se souvient");
  {
    const s = makeStore();
    ok(cm.memoriserCompte(s, { phone: "0708123456", prenom: "Awa" }, T1), "mémorisation acceptée");
    const c = cm.dernierCompte(s);
    eq(c?.prenom, "Awa", "accueillie par son prénom");
    eq(c?.phone, "0708123456", "numéro retenu (plus jamais 10 chiffres à redonner)");
    eq(c?.biometrie, false, "biométrie pas encore connue sur ce téléphone");
  }

  console.log("\n[2] Numéro invalide refusé");
  {
    const s = makeStore();
    ok(!cm.memoriserCompte(s, { phone: "12345", prenom: "X" }, T1), "9 chiffres → refusé");
    ok(!cm.memoriserCompte(s, { phone: "+2250708123456", prenom: "X" }, T1), "préfixe +225 → refusé (format national attendu)");
    eq(cm.chargerComptes(s), [], "rien n'est écrit");
  }

  console.log("\n[3] Téléphone partagé : liste bornée, plus récent d'abord");
  {
    const s = makeStore();
    cm.memoriserCompte(s, { phone: "0700000001", prenom: "Awa" }, T1);
    cm.memoriserCompte(s, { phone: "0700000002", prenom: "Adjoua" }, T2);
    cm.memoriserCompte(s, { phone: "0700000003", prenom: "Mariam" }, T3);
    eq(cm.dernierCompte(s)?.prenom, "Mariam", "la dernière entrée est accueillie");
    cm.memoriserCompte(s, { phone: "0700000004", prenom: "Fatou" }, T3);
    const comptes = cm.chargerComptes(s);
    eq(comptes.length, cm.MAX_COMPTES, `jamais plus de ${cm.MAX_COMPTES} comptes`);
    eq(comptes.map(c => c.prenom), ["Fatou", "Mariam", "Adjoua"], "le plus ancien (Awa) est sorti");
    cm.memoriserCompte(s, { phone: "0700000002", prenom: "Adjoua" }, T3);
    eq(cm.dernierCompte(s)?.prenom, "Adjoua", "un compte existant remonte en tête (pas de doublon)");
    eq(cm.chargerComptes(s).length, cm.MAX_COMPTES, "toujours borné après remontée");
  }

  console.log("\n[4] Le drapeau biométrie se conserve");
  {
    const s = makeStore();
    cm.memoriserCompte(s, { phone: "0708123456", prenom: "Awa" }, T1);
    ok(cm.marquerBiometrie(s, "0708123456", true), "reconnaissance réussie notée");
    cm.memoriserCompte(s, { phone: "0708123456", prenom: "Awa" }, T2); // reconnexion par CODE
    eq(cm.dernierCompte(s)?.biometrie, true, "une entrée par code ne fait pas oublier que l'empreinte marche");
    ok(cm.marquerBiometrie(s, "0708123456", false), "échec matériel → on peut repasser à false");
    eq(cm.dernierCompte(s)?.biometrie, false, "drapeau retombé");
    ok(!cm.marquerBiometrie(s, "0799999999", true), "compte inconnu → false, rien d'écrit");
  }

  console.log("\n[5] Oublier un compte");
  {
    const s = makeStore();
    cm.memoriserCompte(s, { phone: "0700000001", prenom: "Awa" }, T1);
    cm.memoriserCompte(s, { phone: "0700000002", prenom: "Adjoua" }, T2);
    ok(cm.oublierCompte(s, "0700000002"), "oubli accepté");
    eq(cm.dernierCompte(s)?.prenom, "Awa", "l'autre compte reste");
    ok(cm.oublierCompte(s, "0700000001"), "dernier compte oublié");
    eq(s.data[cm.CLE_COMPTES], undefined, "clé supprimée quand la liste est vide");
  }

  console.log("\n[6] « Tata propose de me reconnaître » (lot 2)");
  {
    const s = makeStore();
    ok(!cm.doitProposerReconnaissance(s, "0708123456"), "personne inconnue → pas de proposition");
    cm.memoriserCompte(s, { phone: "0708123456", prenom: "Awa" }, T1);
    ok(cm.doitProposerReconnaissance(s, "0708123456"), "connue, sans reconnaissance → on propose");
    ok(cm.noterRefusProposition(s, "0708123456"), "elle dit « Non » → noté");
    ok(!cm.doitProposerReconnaissance(s, "0708123456"), "refus respecté → on ne redemande pas");
    cm.memoriserCompte(s, { phone: "0708123456", prenom: "Awa" }, T2);
    ok(!cm.doitProposerReconnaissance(s, "0708123456"), "le refus survit aux reconnexions");
    cm.marquerBiometrie(s, "0708123456", true);
    ok(!cm.doitProposerReconnaissance(s, "0708123456"), "reconnaissance active → plus rien à proposer");
    const s2 = makeStore();
    cm.memoriserCompte(s2, { phone: "0700000009", prenom: "Fatou" }, T1);
    cm.marquerBiometrie(s2, "0700000009", true);
    ok(!cm.doitProposerReconnaissance(s2, "0700000009"), "déjà reconnue ici → pas de proposition");
    ok(!cm.noterRefusProposition(s2, "0799999999"), "compte inconnu → false, rien d'écrit");
  }

  console.log("\n[7] Données illisibles ou stockage en panne → jamais de casse");
  {
    const s = makeStore({ [cm.CLE_COMPTES]: "{pas du json" });
    eq(cm.chargerComptes(s), [], "JSON invalide → liste vide (connexion classique)");
    const s2 = makeStore({ [cm.CLE_COMPTES]: JSON.stringify({ v: 99, comptes: [{ phone: "0708123456", prenom: "Awa", biometrie: false, updatedAt: T1 }] }) });
    eq(cm.chargerComptes(s2), [], "version inconnue → liste vide");
    const s3 = makeStore({ [cm.CLE_COMPTES]: JSON.stringify({ v: 1, comptes: [{ phone: "abc", prenom: "X", biometrie: false, updatedAt: T1 }, { phone: "0708123456", prenom: "Awa", biometrie: false, updatedAt: T1 }] }) });
    eq(cm.chargerComptes(s3).map(c => c.prenom), ["Awa"], "compte malformé écarté, les valides survivent");
    ok(!cm.memoriserCompte(makeThrowingStore(), { phone: "0708123456", prenom: "Awa" }, T1), "quota plein → false, pas d'exception");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
