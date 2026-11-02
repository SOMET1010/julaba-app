/**
 * Tests du sélecteur de comptes (rang 3 — LOT-MULTI-COMPTES, P1-AUTH-04).
 * Lancer : npm run test:selection-comptes   (tsx, sans DOM ni navigateur)
 *
 * Couvre : la table de décision d'ouverture (0/1/2+ comptes), la borne
 * défensive MAX_COMPTES, le nom affiché (appellation > prénom, jamais un
 * titre déduit), et la cible après choix (biométrie scellée vs pavé de code
 * — sans jamais re-taper le numéro).
 */
import * as sc from "./selectionComptes.js";
import type { CompteMemorise } from "./comptesMemorises.js";
import { MAX_COMPTES } from "./comptesMemorises.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function compte(partiels: Partial<CompteMemorise> & { phone: string; prenom: string }): CompteMemorise {
  return { biometrie: false, updatedAt: "2026-10-29T10:00:00.000Z", ...partiels };
}

function main() {
  console.log("\n[1] Aucun compte connu → le parcours classique");
  {
    const vue = sc.vueSelection([]);
    eq(vue.mode, "aucun", "0 compte → mode aucun");
    eq(vue.comptes, [], "rien à afficher");
  }

  console.log("\n[2] Un seul compte → PAS de liste (comme hier)");
  {
    const awa = compte({ phone: "0708123456", prenom: "Awa" });
    const vue = sc.vueSelection([awa]);
    eq(vue.mode, "unique", "1 compte → mode unique");
    eq(vue.comptes.length, 1, "une seule carte");
    eq(vue.comptes[0].prenom, "Awa", "c'est elle");
  }

  console.log("\n[3] Deux comptes et plus → LE SÉLECTEUR, plus récent d'abord");
  {
    const awa = compte({ phone: "0708123456", prenom: "Awa" });
    const fatou = compte({ phone: "0708998877", prenom: "Fatou" });
    const vue = sc.vueSelection([fatou, awa]);
    eq(vue.mode, "selection", "2 comptes → mode selection");
    eq(vue.comptes.map((c) => c.prenom), ["Fatou", "Awa"], "l'ordre du stockage EST l'ordre des cartes (dernière passée en tête)");
  }

  console.log("\n[4] La borne est réaffirmée à la lecture (enveloppe falsifiée)");
  {
    const trop = Array.from({ length: MAX_COMPTES + 2 }, (_, i) =>
      compte({ phone: `070800000${i}`, prenom: `P${i}` }));
    const vue = sc.vueSelection(trop);
    eq(vue.comptes.length, MAX_COMPTES, `jamais plus de ${MAX_COMPTES} cartes`);
  }

  console.log("\n[5] Le nom affiché : appellation > prénom, jamais un titre déduit");
  {
    eq(sc.nomAffiche(compte({ phone: "0708123456", prenom: "Awa" })), "Awa", "sans appellation → le prénom");
    eq(sc.nomAffiche(compte({ phone: "0708123456", prenom: "Awa", appellation: "Maman Awa" })), "Maman Awa", "appellation choisie gagne");
    eq(sc.nomAffiche(compte({ phone: "0708123456", prenom: "", appellation: "  " })), "", "rien des deux → vide (l'écran garde la photo)");
  }

  console.log("\n[6] La cible après choix : SA vérification, jamais de re-saisie");
  {
    eq(sc.cibleApresChoix(compte({ phone: "0708123456", prenom: "Awa", biometrie: true })),
      "reconnaissance", "reconnue ici → la cérémonie biométrique, verrouillée sur SON compte");
    eq(sc.cibleApresChoix(compte({ phone: "0708123456", prenom: "Awa", biometrie: false })),
      "password", "pas encore reconnue → SON pavé de code (numéro déjà posé par la carte)");
  }

  console.log("\n[7] Le module ne sait rien dire des secrets");
  {
    // Garde de surface : les cartes ne portent que les champs de la liste
    // « Tata se souvient de moi » — jamais de code, jamais de jeton.
    const vue = sc.vueSelection([compte({ phone: "0708123456", prenom: "Awa" })]);
    const cles = Object.keys(vue.comptes[0]).sort();
    ok(cles.every((k) => ["phone", "prenom", "photo", "appellation", "biometrie", "propositionRefusee", "updatedAt"].includes(k)),
      "aucune clé hors la liste connue (pas de password/token/secret)");
  }

  console.log("");
  if (failures > 0) { console.error(`${failures} échec(s)`); process.exit(1); }
  console.log("✅ selectionComptes : tous les cas passent");
}

main();
