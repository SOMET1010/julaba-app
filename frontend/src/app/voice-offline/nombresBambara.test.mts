/**
 * Tests des nombres bambara → chiffres (inclusion, langue).
 * Lancer : npm run test:bambara   (tsx, sans DOM ni navigateur)
 *
 * Couvre le système numéral bamanankan (unités, tan/mugan, bi, kɛmɛ, ba/waa,
 * connecteur « ni »), la conversion dɔrɔmɛ (× 5 FCFA), les chiffres écrits
 * (« 12 500 »), l'extraction au milieu d'une phrase, et les pièges assumés.
 */
import { extraireNombreBambara, contientNombreBambara, normaliserBambara } from "./nombresBambara.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function main() {
  console.log("\n[1] Normalisation bambara");
  {
    eq(normaliserBambara("Kɛmɛ"), "keme", "ɛ → e, minuscules");
    eq(normaliserBambara("kɔnɔntɔn"), "kononton", "ɔ → o");
    eq(normaliserBambara("wɔɔrɔ"), "wooro", "voyelles spéciales rabattues");
    eq(normaliserBambara("  tan,  ni ! kelen "), "tan ni kelen", "ponctuation et espaces nettoyés");
  }

  console.log("\n[2] Unités et dizaines");
  {
    eq(extraireNombreBambara("kelen"), 1, "kelen = 1");
    eq(extraireNombreBambara("duuru"), 5, "duuru = 5");
    eq(extraireNombreBambara("kononton"), 9, "kɔnɔntɔn = 9");
    eq(extraireNombreBambara("tan"), 10, "tan = 10");
    eq(extraireNombreBambara("tan ni kelen"), 11, "tan ni kelen = 11");
    eq(extraireNombreBambara("tan ni duuru"), 15, "tan ni duuru = 15");
    eq(extraireNombreBambara("mugan"), 20, "mugan = 20");
    eq(extraireNombreBambara("mugan ni duuru"), 25, "mugan ni duuru = 25");
    eq(extraireNombreBambara("bi saba"), 30, "bi saba = 30");
    eq(extraireNombreBambara("bi saba ni fila"), 32, "bi saba ni fila = 32");
    eq(extraireNombreBambara("bi kononton ni kononton"), 99, "bi kɔnɔntɔn ni kɔnɔntɔn = 99");
  }

  console.log("\n[3] Centaines et milliers");
  {
    eq(extraireNombreBambara("keme"), 100, "kɛmɛ = 100");
    eq(extraireNombreBambara("keme fila"), 200, "kɛmɛ fila = 200");
    eq(extraireNombreBambara("keme saba ni bi duuru ni duuru"), 355, "kɛmɛ saba ni bi duuru ni duuru = 355");
    eq(extraireNombreBambara("ba kelen"), 1000, "ba kelen = 1000");
    eq(extraireNombreBambara("waa fila"), 2000, "waa fila = 2000 (variante waa)");
    eq(extraireNombreBambara("waga fila"), 2000, "waga = variante orthographique");
    eq(extraireNombreBambara("ba fila ni keme duuru"), 2500, "ba fila ni kɛmɛ duuru = 2500");
    eq(extraireNombreBambara("waa tan"), 10000, "waa tan = 10 000");
    eq(extraireNombreBambara("ba mugan"), 20000, "ba mugan = 20 000");
  }

  console.log("\n[4] Dɔrɔmɛ — l'unité de 5 francs du marché");
  {
    eq(extraireNombreBambara("dorome keme"), 500, "dɔrɔmɛ kɛmɛ = 100 dɔrɔmɛ = 500 FCFA");
    eq(extraireNombreBambara("dorome mugan"), 100, "dɔrɔmɛ mugan = 20 dɔrɔmɛ = 100 FCFA");
    eq(extraireNombreBambara("dorome tan ni duuru"), 75, "dɔrɔmɛ tan ni duuru = 15 dɔrɔmɛ = 75 FCFA");
    eq(extraireNombreBambara("keme fila dorome"), 1000, "le mot dɔrɔmɛ agit où qu'il soit dans le nombre");
  }

  console.log("\n[5] Chiffres écrits (sortie sherpa « 12 500 »)");
  {
    eq(extraireNombreBambara("12500"), 12500, "12500 d'un bloc");
    eq(extraireNombreBambara("12 500"), 12500, "12 500 avec séparateur de milliers recollé");
    eq(extraireNombreBambara("1 000"), 1000, "1 000 recollé");
    eq(extraireNombreBambara("500"), 500, "500 simple");
  }

  console.log("\n[6] Extraction au milieu d'une phrase");
  {
    eq(extraireNombreBambara("n ye tamati feere keme duuru la"), 500, "le nombre est trouvé dans la phrase (vente à 500)");
    eq(extraireNombreBambara("a ye ba kelen ni keme duuru sara"), 1500, "1500 au milieu d'une phrase");
    eq(extraireNombreBambara("aucun nombre ici"), null, "pas de nombre → null");
    eq(extraireNombreBambara(""), null, "chaîne vide → null");
    ok(contientNombreBambara("keme duuru"), "contientNombreBambara détecte kɛmɛ");
    ok(!contientNombreBambara("bonjour tamati"), "pas de faux positif sur mots ordinaires");
  }

  console.log("\n[7] Pièges assumés (limite v1 documentée)");
  {
    // « ba tan ni fila » veut dire 12 000 (12 milliers) mais se lit linéairement
    // 10 000 + 2 : ambiguïté réelle du parler, hors périmètre v1.
    const v = extraireNombreBambara("ba tan ni fila");
    ok(v === 10002, `multiplicateur composé non géré (obtenu ${v}, v1 assume 10002 — documenté)`);
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
