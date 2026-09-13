/**
 * Tests de `vendreVocalUnifie` — Convergence voix/tactile POS, Lot 2 :
 * « vendre » devient un ajout au panier, jamais un encaissement direct.
 *
 * Lancer : npm run test:vendre-unifie   (tsx, sans DOM ni navigateur)
 */
import { vendreVocalUnifie, type DependancesVendreVocalUnifie, type ProduitPourPanier } from "./vendreVocalUnifie.js";
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
  const appelsAddToCart: [ProduitPourPanier, number, number | undefined][] = [];
  const appelsSpeak: string[] = [];
  const appelsVibrer: number[] = [];
  const appelsNotifier: string[] = [];
  const appelsProposer: { nom: string; prix: number }[] = [];
  const planifications: Enregistrement[] = [];
  let compteurId = 0;

  const deps: DependancesVendreVocalUnifie = {
    products: [TOMATE],
    addToCart: (produit, quantite, totalExact) => { appelsAddToCart.push([produit, quantite, totalExact]); },
    speak: (texte) => { appelsSpeak.push(texte); },
    vibrerSucces: () => { appelsVibrer.push(1); },
    notifierAjoutPanier: (message) => { appelsNotifier.push(message); },
    proposerCreationProduit: (p) => { appelsProposer.push(p); },
    stockage: creerStockage(),
    estEnLigne: () => true,
    planifier: (effet, delaiMs) => { planifications.push({ effet, delaiMs }); },
    guidageVocalActif: () => true,
    // Un id UNIQUE par appel — jamais dérivé du nom (voir P0, contre-revue) :
    // deux ajouts du même produit inconnu à des prix différents ne doivent
    // jamais fusionner en une seule ligne (addToCart n'augmente QUE la
    // quantité au second appel, il ne reprend jamais le nouveau prix).
    creerIdLigne: () => `test-${++compteurId}`,
    ...overrides,
  };

  return { deps, appelsAddToCart, appelsSpeak, appelsVibrer, appelsNotifier, appelsProposer, planifications };
}

function main() {
  console.log("\n[1] Produit apparié : addToCart appelé, JAMAIS d'écriture financière");
  {
    const h = creerDeps();
    vendreVocalUnifie("tomates", 2, 1000, h.deps);
    eq(h.appelsAddToCart.length, 1, "addToCart appelé une seule fois");
    const [produit, quantite, totalExact] = h.appelsAddToCart[0];
    eq(produit.id, "p1", "produit apparié au catalogue (même id)");
    eq(produit.prix, 500, "prix dicté (1000/2) — le négoce prime sur le catalogue");
    eq(produit.prix_promo, null, "promo catalogue neutralisée (prix dicté prioritaire)");
    eq(quantite, 2, "quantité dictée transmise telle quelle");
    eq(totalExact, 1000, "total EXACT dicté transmis à addToCart (source de vérité du panier)");
    eq(h.appelsVibrer.length, 1, "retour haptique de succès");
    eq(h.appelsNotifier.length, 1, "notification visuelle de l'ajout");
    ok(h.appelsNotifier[0].includes("panier"), "le message mentionne le panier, jamais une vente");
    eq(h.appelsSpeak.length, 1, "confirmation parlée (guidage actif)");
    ok(h.appelsSpeak[0].toLowerCase().includes("panier"), "« C'est dans le panier », jamais « vente enregistrée »");
  }

  console.log("\n[2] Produit apparié, guidage INACTIF → pas de parole, mais ajout et notification visuelle inchangés");
  {
    const h = creerDeps({ guidageVocalActif: () => false });
    vendreVocalUnifie("tomates", 1, 500, h.deps);
    eq(h.appelsAddToCart.length, 1, "addToCart toujours appelé");
    eq(h.appelsSpeak.length, 0, "guidage inactif → rien de parlé");
    eq(h.appelsNotifier.length, 1, "la notification visuelle reste, elle ne dépend pas du guidage vocal");
  }

  console.log("\n[3] Produit non apparié → ligne libre ajoutée au panier");
  {
    const h = creerDeps();
    vendreVocalUnifie("attiéké", 2, 1000, h.deps);
    eq(h.appelsAddToCart.length, 1, "addToCart appelé pour la ligne libre aussi");
    const [produit, quantite] = h.appelsAddToCart[0];
    eq(produit.nom, "attiéké", "nom dicté conservé pour une ligne libre");
    eq(produit.categorie, "Autre", "catégorie « Autre » pour une ligne libre");
    eq(produit.stock, 0, "stock 0 pour une ligne libre (pas de suivi catalogue)");
    eq(quantite, 2, "quantité dictée transmise");
  }

  console.log("\n[4] P0 — même produit inconnu, DEUX PRIX différents → deux lignes DISTINCTES, total cumulé exact");
  {
    // Piège identifié en contre-revue : addToCart() fusionne sur `product.id`
    // en augmentant SEULEMENT la quantité — il ne reprend jamais le nouveau
    // prix passé au second appel. Un id stable dérivé du nom ferait donc
    // silencieusement écraser 2×500 + 1×700 (= 1700F) par 3×500 (= 1500F).
    const h = creerDeps();
    vendreVocalUnifie("piment", 2, 1000, h.deps); // 2 piments pour 1000F → 500F/unité
    vendreVocalUnifie("piment", 1, 700, h.deps); // 1 piment pour 700F → 700F/unité
    eq(h.appelsAddToCart.length, 2, "deux appels à addToCart, un par énoncé");
    const [ligne1, qte1] = h.appelsAddToCart[0];
    const [ligne2, qte2] = h.appelsAddToCart[1];
    ok(ligne1.id !== ligne2.id, "id DIFFÉRENT malgré le même nom dicté → jamais de fusion sur addToCart");
    eq(qte1, 2, "quantité de la première ligne");
    eq(qte2, 1, "quantité de la seconde ligne");
    eq(ligne1.prix, 500, "prix unitaire de la première ligne (1000/2)");
    eq(ligne2.prix, 700, "prix unitaire de la seconde ligne (700/1)");
    const totalCumule = ligne1.prix * qte1 + ligne2.prix * qte2;
    eq(totalCumule, 1700, "total cumulé EXACT (1000 + 700), jamais 1500 (3 × 500)");
  }

  console.log("\n[5] Panier existant : ce module ne touche jamais aux lignes déjà présentes");
  {
    // addToCart est une fonction opaque ici — vendreVocalUnifie ne lit ni ne
    // vide jamais un panier existant, il ne fait qu'appeler addToCart une
    // fois par vente vocale reconnue. On le prouve en s'assurant qu'aucune
    // autre méthode de mutation (clearCart, removeFromCart, etc.) n'existe
    // dans les dépendances déclarées.
    const h = creerDeps();
    vendreVocalUnifie("tomates", 1, 500, h.deps);
    eq(Object.keys(h.deps).includes("clearCart"), false, "aucune dépendance de vidage/suppression de panier n'existe dans ce module");
    eq(h.appelsAddToCart.length, 1, "un seul appel additif, jamais de remplacement du panier");
  }

  console.log("\n[6] Produit non apparié, en ligne, produit inconnu → proposition différée de 2200ms, APRÈS l'ajout");
  {
    const h = creerDeps();
    vendreVocalUnifie("attiéké", 2, 1000, h.deps);
    eq(h.appelsAddToCart.length, 1, "l'ajout au panier a bien eu lieu");
    eq(h.planifications.length, 1, "une planification (la proposition de création)");
    eq(h.planifications[0].delaiMs, 2200, "délai de 2200ms préservé");
    eq(h.appelsProposer.length, 0, "proposerCreationProduit pas encore appelé avant exécution de l'effet planifié");
    h.planifications[0].effet();
    eq(h.appelsProposer.length, 1, "proposerCreationProduit appelé une fois l'effet exécuté");
    eq(h.appelsProposer[0], { nom: "attiéké", prix: 500 }, "nom et prix transmis à la proposition");
  }

  console.log("\n[7] La proposition de création n'est JAMAIS bloquante sur l'ajout au panier");
  {
    // `estEnLigne()` qui explose (dépendance fournie par l'appelant, donc pas
    // sous le contrôle de ce module) : la proposition doit échouer en
    // silence (try/catch), sans jamais empêcher ni annuler l'ajout au
    // panier qui a déjà eu lieu juste avant dans la même fonction.
    const h = creerDeps({ estEnLigne: () => { throw new Error("détection réseau indisponible"); } });
    vendreVocalUnifie("attiéké", 1, 500, h.deps);
    eq(h.appelsAddToCart.length, 1, "l'ajout au panier réussit malgré l'échec de la vérification réseau");
    eq(h.planifications.length, 0, "aucune planification si la vérification échoue (jamais bloquant)");
  }

  console.log("\n[8] Produit non apparié, HORS-LIGNE → pas de proposition, mais l'ajout au panier reste immédiat");
  {
    const h = creerDeps({ estEnLigne: () => false });
    vendreVocalUnifie("attiéké", 2, 1000, h.deps);
    eq(h.appelsAddToCart.length, 1, "hors-ligne : l'ajout au panier a quand même lieu (c'est tout le sens du Lot 2)");
    eq(h.planifications.length, 0, "hors-ligne → aucune proposition de création (elle parle au serveur)");
  }

  console.log("\n[9] Produit non apparié, refus déjà mémorisé pour CE produit → jamais de proposition, ajout inchangé");
  {
    const stockage = creerStockage();
    noterRefusCreation(stockage, "Attiéké");
    ok(stockage.data[CLE_REFUS_PRODUITS] !== undefined, "refus bien écrit en mémoire (sanity check)");
    const h = creerDeps({ stockage });
    vendreVocalUnifie("attieke", 2, 1000, h.deps); // accents/casse différents, refus normalisé
    eq(h.appelsAddToCart.length, 1, "l'ajout au panier a toujours lieu");
    eq(h.planifications.length, 0, "refus mémorisé → aucune planification");
  }

  console.log("\n[10] Invariant financier — montant NON DIVISIBLE (3 pour 500F) : le panier garde le total EXACT, jamais un arrondi");
  {
    // 500 / 3 = 166,67 : `construireLigneVocale` arrondit l'unitaire à 167 pour
    // l'affichage/reçu (prix_unitaire), mais 167 × 3 = 501 ≠ 500. Le panier ne
    // doit JAMAIS recalculer depuis cet unitaire arrondi — addToCart doit
    // recevoir le montant dicté EXACT (500) comme 3e argument, quel que soit
    // le produit (apparié ou libre).
    const h = creerDeps();
    vendreVocalUnifie("tomates", 3, 500, h.deps);
    eq(h.appelsAddToCart.length, 1, "addToCart appelé une fois");
    const [produit, quantite, totalExact] = h.appelsAddToCart[0];
    eq(produit.prix, 167, "prix unitaire ARRONDI pour l'affichage (500/3 → 167)");
    eq(quantite, 3, "quantité dictée transmise");
    eq(totalExact, 500, "total EXACT transmis (500), JAMAIS 501 (167 × 3, arrondi)");
    ok(produit.prix * quantite !== totalExact, "sanity check : l'arrondi unitaire × quantité NE RETOMBE PAS sur le total exact — c'est justement pourquoi totalExact existe");

    // Même invariant pour une ligne LIBRE (produit non apparié) : « 3 piments
    // pour 500 » ne doit pas non plus dériver vers 501F au panier.
    const h2 = creerDeps();
    vendreVocalUnifie("piment inconnu", 3, 500, h2.deps);
    const [ligneLibre, qteLibre, totalLibre] = h2.appelsAddToCart[0];
    eq(ligneLibre.prix, 167, "ligne libre : même arrondi unitaire pour l'affichage");
    eq(qteLibre, 3, "ligne libre : quantité dictée");
    eq(totalLibre, 500, "ligne libre : total EXACT transmis (500), jamais 501");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
