/**
 * L'UNITÉ D'UNE LIGNE LIBRE EST CELLE QU'ELLE A DITE — VOIX-01, lot E (a).
 * Lancer : npm run test:vendre-unifie-unite   (tsx, sans DOM)
 *
 * LE DÉFAUT QU'ON FERME, reproduit avant d'être corrigé (20/09/2026). Elle
 * dit « deux tas de gombo », gombo n'est pas dans son catalogue. Tata répète
 * « 2 tas de gombo » — et le panier, puis le reçu, enregistrent « unité ».
 * La phrase dite se construisait avec `uniteParlee` ; la ligne de panier
 * posait `unite: 'unité'` en dur. Deux sens à la même donnée : ce que la
 * marchande entend n'est pas ce que sa cliente lit sur le reçu.
 *
 * Contre le module de f0c965c, ce test a 6 échecs (voir le commit). Le test
 * gelé `vendreVocalUnifie.test.mts` ne fige rien sur l'unité de la ligne
 * libre : il n'a pas eu à bouger.
 *
 * Ce que ce test NE prouve PAS : que l'écran transmet bien `uniteParlee`
 * (c'est `MicroVenteCaisse.tsx`, hors de ce lot), ni ce que dit réellement
 * le moteur STT.
 */
import { readFileSync } from 'node:fs';
import { vendreVocalUnifie, type DependancesVendreVocalUnifie, type ProduitPourPanier } from "./vendreVocalUnifie.js";
import type { ProduitAppariable } from "./venteVocale.js";
import { quantiteAvecUnite } from "../utils/unite.utils.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

/** Produit CONNU, vendu au kilo — pour le garde-fou d'unité incompatible. */
const TOMATE: ProduitAppariable = { id: "p1", nom: "Tomate", prix: 500, prix_achat: 300, stock: 20, unite: "kg" };

function creerDeps() {
  const lignes: [ProduitPourPanier, number][] = [];
  const dits: string[] = [];
  let compteur = 0;
  const deps: DependancesVendreVocalUnifie = {
    products: [TOMATE],
    addToCart: (produit, quantite) => { lignes.push([produit, quantite]); },
    speak: (texte) => { dits.push(texte); },
    vibrerSucces: () => {},
    notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: null,
    estEnLigne: () => false,
    planifier: () => {},
    guidageVocalActif: () => true,
    creerIdLigne: () => `test-${++compteur}`,
  };
  return { deps, lignes, dits };
}

function main() {
  console.log("\n[1] Produit inconnu + unité parlée « tas » → la ligne ET la phrase portent « tas »");
  {
    const h = creerDeps();
    vendreVocalUnifie("gombo", 2, 1000, h.deps, "tas", "total");
    eq(h.lignes.length, 1, "une ligne libre ajoutée au panier");
    eq(h.lignes[0][0].unite, "tas", "la ligne enregistre l'unité PRONONCÉE, pas « unité »");
    const dit = h.dits.join(" ");
    ok(/\btas\b/.test(dit), `Tata dit « tas » — obtenu « ${dit} »`);
    ok(dit.includes(`${quantiteAvecUnite(2, h.lignes[0][0].unite)} de gombo`),
      "la phrase dite est construite avec l'unité ENREGISTRÉE : un seul sens pour la même donnée");
  }

  console.log("\n[2] Produit inconnu SANS unité parlée → « unité », et Tata ne la prononce pas");
  {
    const h = creerDeps();
    vendreVocalUnifie("gombo", 2, 1000, h.deps, undefined, "total");
    eq(h.lignes[0][0].unite, "unité", "valeur par défaut d'un article libre : « unité »");
    ok(!/unit/i.test(h.dits.join(" ")), "« unité » n'apprend rien : elle ne se dit pas (« 2 gombos »)");

    // `null` explicite (extraction sans unité) : même chose, pas « null » ni un blanc.
    const h2 = creerDeps();
    vendreVocalUnifie("gombo", 1, 500, h2.deps, null);
    eq(h2.lignes[0][0].unite, "unité", "uniteParlee=null → « unité »");
  }

  console.log("\n[3] Produit CONNU au kilo + unité parlée « tas » → le garde-fou unite_incompatible refuse toujours");
  {
    const h = creerDeps();
    vendreVocalUnifie("tomate", 1, 0, h.deps, "tas");
    eq(h.lignes.length, 0, "AUCUNE ligne : un tas n'est pas un kilo, on ne prend pas le prix du catalogue");
    const dit = h.dits.join(" ");
    ok(/tas/.test(dit) && /kg/.test(dit), `Tata nomme les deux unités pour qu'elle entende le désaccord — obtenu « ${dit} »`);
    ok(/combien/i.test(dit), "et lui demande le prix au lieu de l'inventer");
  }

  console.log("\n[4] La graphie de la ligne est celle de la boutique, et Tata dit la même");
  {
    // « deux kilos de gombo » : le bouton de la caisse écrit « kg ». Si la
    // voix écrivait « kilos », le même gombo aurait deux unités selon la main
    // qui l'a vendu.
    const h = creerDeps();
    vendreVocalUnifie("gombo", 2, 1000, h.deps, "kilos", "total");
    eq(h.lignes[0][0].unite, "kg", "« kilos » entendu → « kg » enregistré, comme au doigt");
    ok(/\bkg\b/.test(h.dits.join(" ")), "et c'est « kg » que Tata dit — pas un autre mot que celui qui est enregistré");

    const h2 = creerDeps();
    vendreVocalUnifie("gombo", 3, 1500, h2.deps, "Sacs", "total");
    eq(h2.lignes[0][0].unite, "sac", "« Sacs » → « sac » : singulier, minuscule ; l'accord se fait à la lecture");
    ok(h2.dits.join(" ").includes("3 sacs de gombo"), "Tata accorde à la lecture : « 3 sacs de gombo »");
  }

  console.log("\n[5] Produit CONNU + unité compatible → l'unité du CATALOGUE reste celle qui compte");
  {
    // Non-régression : quand le produit est apparié, c'est son unité qui a
    // servi à décider du prix, c'est elle qui se dit. Ce lot ne change rien ici.
    const h = creerDeps();
    vendreVocalUnifie("tomate", 2, 0, h.deps, "kilos");
    eq(h.lignes.length, 1, "prix du catalogue accepté (kilos ≡ kg)");
    eq(h.lignes[0][0].unite, "kg", "la ligne porte l'unité du produit apparié");
    ok(/\bkg\b/.test(h.dits.join(" ")), "Tata dit l'unité du catalogue");
  }

  // ── CE QUI EST DIT DOIT AUSSI ÊTRE ÉCRIT ───────────────────────────────
  //
  // Retour terrain du 24/09 : « il prononce bien 2 tas de piments, mais écrit
  // "2 piments" ». Mesuré : `extraire` rend bien `uniteParlee: "tas"`, et
  // `vendreVocalUnifie` la garde jusqu'à la parole. L'information EXISTE.
  //
  // C'est l'ÉCRIT qui la jetait : le retour au panier composait
  // `${l.quantite} × ${l.nomAffiche}` à la main, sans unité — alors que
  // `resumeQuantite` existe, compose « 2 tas de piment » et gère l'accord.
  //
  // Pour une marchande qui ne lit pas, entendre une chose et voir l'autre est
  // pire que ne rien voir : c'est la voix qu'elle croit, et l'écran la
  // contredit sur SA vente.
  {
    const src = readFileSync(
      new URL('../components/marchand/MicroVenteCaisse.tsx', import.meta.url), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
      .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

    ok(/resumeQuantite\(/.test(src),
       "le retour au panier passe par la règle qui compose quantité + unité + produit");
    ok(!/\$\{[a-z]\.quantite\}\s*×\s*\$\{[a-z]\.nomAffiche\}/.test(src),
       "et plus aucune composition à la main qui jette l'unité");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
