/**
 * Tests de caractérisation + unitaires de `vendreVocalUnifie` (Convergence
 * voix/tactile POS, Lot 1 — extraction mécanique).
 *
 * Ces assertions caractérisent le comportement du closure `vendreUnifie` tel
 * qu'il vivait dans `VenteVocaleModal.tsx` AVANT extraction (ordre des
 * effets, délais 1400ms/2200ms, permissivité du try/catch) : elles doivent
 * rester IDENTIQUES, au caractère près, une fois `VenteVocaleModal.tsx`
 * branché sur ce module — c'est la preuve que l'extraction est mécanique et
 * ne change aucun comportement.
 *
 * Lancer : npm run test:vendre-unifie   (tsx, sans DOM ni navigateur)
 */
import { vendreVocalUnifie, type DependancesVendreVocalUnifie } from "./vendreVocalUnifie.js";
import type { ProduitAppariable } from "./venteVocale.js";
import { CLE_REFUS_PRODUITS, noterRefusCreation } from "./venteVocale.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

const TOMATE: ProduitAppariable = { id: "p1", nom: "Tomate", prix: 500, prix_achat: 300, stock: 20, unite: "kg" };

interface StockageMemoire { getItem(k: string): string | null; setItem(k: string, v: string): void; data: Record<string, string>; }
function creerStockage(seed: Record<string, string> = {}): StockageMemoire {
  const data: Record<string, string> = { ...seed };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
}

interface Enregistrement { effet: () => void; delaiMs: number; }

function creerDeps(overrides: Partial<DependancesVendreVocalUnifie> = {}) {
  const appelsEnregistrerVente: unknown[][] = [];
  const appelsRefreshProducts: number[] = [];
  const appelsSpeak: string[] = [];
  const appelsProposer: { nom: string; prix: number }[] = [];
  const planifications: Enregistrement[] = [];

  const deps: DependancesVendreVocalUnifie = {
    products: [TOMATE],
    enregistrerVente: async (montant, lignes, moyen, note) => { appelsEnregistrerVente.push([montant, lignes, moyen, note]); return { ok: true }; },
    refreshProducts: () => { appelsRefreshProducts.push(1); },
    speak: (texte) => { appelsSpeak.push(texte); },
    proposerCreationProduit: (p) => { appelsProposer.push(p); },
    stockage: creerStockage(),
    estEnLigne: () => true,
    planifier: (effet, delaiMs) => { planifications.push({ effet, delaiMs }); },
    guidageVocalActif: () => true,
    ...overrides,
  };

  return { deps, appelsEnregistrerVente, appelsRefreshProducts, appelsSpeak, appelsProposer, planifications };
}

async function main() {
  console.log("\n[1] Produit apparié, stock suffisant");
  {
    const h = creerDeps();
    await vendreVocalUnifie("tomates", 2, 1000, "Vente tomates", h.deps);
    eq(h.appelsEnregistrerVente.length, 1, "enregistrerVente appelé une seule fois");
    const [montant, lignes, moyen, note] = h.appelsEnregistrerVente[0] as [number, any[], string, string];
    eq(montant, 1000, "montant transmis tel quel (le dicté prime)");
    eq(lignes.length, 1, "une seule ligne");
    eq(lignes[0].productId, "p1", "ligne appariée au catalogue");
    eq(moyen, "cash", "moyen de paiement toujours cash pour ce chemin");
    eq(note, "Vente tomates", "note transmise telle quelle");
    eq(h.appelsRefreshProducts.length, 1, "refreshProducts appelé après la vente");
    eq(h.planifications.length, 0, "aucune planification : pas de rupture, rien à proposer");
  }

  console.log("\n[2] Produit apparié, stock insuffisant, guidage actif → avertissement différé de 1400ms");
  {
    const h = creerDeps();
    await vendreVocalUnifie("tomates", 50, 1000, "Vente tomates", h.deps); // 50 > stock (20)
    eq(h.planifications.length, 1, "une planification (l'avertissement de rupture)");
    eq(h.planifications[0].delaiMs, 1400, "délai de 1400ms préservé");
    eq(h.appelsSpeak.length, 0, "speak PAS encore appelé avant exécution de l'effet planifié");
    h.planifications[0].effet();
    eq(h.appelsSpeak.length, 1, "speak appelé une fois l'effet planifié exécuté");
    ok(h.appelsSpeak[0].includes("manquait"), "message de rupture parlé");
  }

  console.log("\n[3] Produit apparié, stock insuffisant, guidage INACTIF → aucune planification");
  {
    const h = creerDeps({ guidageVocalActif: () => false });
    await vendreVocalUnifie("tomates", 50, 1000, "Vente tomates", h.deps);
    eq(h.planifications.length, 0, "guidage inactif → jamais de planification, même en rupture");
  }

  console.log("\n[4] Produit non apparié, en ligne, produit inconnu → proposition différée de 2200ms");
  {
    const h = creerDeps();
    await vendreVocalUnifie("attiéké", 2, 1000, "Vente vocale", h.deps);
    eq(h.appelsRefreshProducts.length, 0, "refreshProducts PAS appelé côté branche non-appariée");
    eq(h.planifications.length, 1, "une planification (la proposition de création)");
    eq(h.planifications[0].delaiMs, 2200, "délai de 2200ms préservé");
    eq(h.appelsProposer.length, 0, "proposerCreationProduit PAS encore appelé avant exécution de l'effet planifié");
    h.planifications[0].effet();
    eq(h.appelsProposer.length, 1, "proposerCreationProduit appelé une fois l'effet exécuté");
    eq(h.appelsProposer[0], { nom: "attiéké", prix: 500 }, "nom et prix (montant/quantite) transmis à la proposition");
    eq(h.appelsSpeak.length, 1, "guidage actif → la question est aussi parlée");
  }

  console.log("\n[5] Produit non apparié, guidage INACTIF → proposition visuelle sans parole");
  {
    const h = creerDeps({ guidageVocalActif: () => false });
    await vendreVocalUnifie("attiéké", 2, 1000, "Vente vocale", h.deps);
    h.planifications[0].effet();
    eq(h.appelsProposer.length, 1, "la proposition reste affichée même sans guidage vocal");
    eq(h.appelsSpeak.length, 0, "mais rien n'est parlé");
  }

  console.log("\n[6] Produit non apparié, HORS-LIGNE → jamais de proposition");
  {
    const h = creerDeps({ estEnLigne: () => false });
    await vendreVocalUnifie("attiéké", 2, 1000, "Vente vocale", h.deps);
    eq(h.planifications.length, 0, "hors-ligne → aucune planification, quel que soit doitProposerCreation");
  }

  console.log("\n[7] Produit non apparié, refus déjà mémorisé pour CE produit → jamais de proposition");
  {
    const stockage = creerStockage();
    noterRefusCreation(stockage, "Attiéké");
    ok(stockage.data[CLE_REFUS_PRODUITS] !== undefined, "refus bien écrit en mémoire (sanity check)");
    const h = creerDeps({ stockage });
    await vendreVocalUnifie("attieke", 2, 1000, "Vente vocale", h.deps); // accents/casse différents, refus normalisé
    eq(h.planifications.length, 0, "refus mémorisé → aucune planification");
  }

  console.log("\n[8] enregistrerVente échoue → l'erreur remonte, aucun effet secondaire ne s'exécute");
  {
    const h = creerDeps({ enregistrerVente: async () => { throw new Error("panne réseau"); } });
    let erreurRecue: unknown = null;
    try { await vendreVocalUnifie("tomates", 2, 1000, "Vente tomates", h.deps); }
    catch (e) { erreurRecue = e; }
    ok(erreurRecue instanceof Error && erreurRecue.message === "panne réseau", "l'erreur d'enregistrerVente remonte telle quelle");
    eq(h.appelsRefreshProducts.length, 0, "refreshProducts jamais appelé après un échec");
    eq(h.planifications.length, 0, "aucune planification après un échec");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
