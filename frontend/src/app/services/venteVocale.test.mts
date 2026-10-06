/**
 * Tests de l'unification voix↔panier (Phase 5, lot 1).
 * Lancer : npm run test:voix   (tsx, sans DOM ni navigateur)
 *
 * Couvre l'appariement produit dicté → catalogue (accents, pluriels,
 * inclusion non ambiguë) et la construction de la ligne de vente unifiée
 * (total source de vérité, prix d'achat unitaire, productId).
 */
import {
  normaliserNom, apparierProduit, construireLigneVocale,
  doitProposerCreation, noterRefusCreation, CLE_REFUS_PRODUITS,
  type ProduitAppariable, type KVStore,
} from "./venteVocale.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

const PROD = (o: Partial<ProduitAppariable> = {}): ProduitAppariable => ({
  id: "p1", nom: "Tomate", prix: 500, prix_achat: 300, stock: 20, unite: "kg", ...o,
});

function main() {
  console.log("\n[1] Normalisation des noms");
  {
    eq(normaliserNom("Tomates Séchées"), "tomate sechee", "accents, majuscules et pluriels effacés");
    eq(normaliserNom("  piment  "), "piment", "espaces superflus effacés");
    eq(normaliserNom("Maïs"), "mai", "accent + pluriel (maïs → mai)");
    eq(normaliserNom("riz"), "riz", "mot court : le z final n'est pas un pluriel");
    eq(normaliserNom("os"), "os", "mot de 2 lettres : s final conservé");
    eq(normaliserNom(""), "", "chaîne vide inoffensive");
  }

  console.log("\n[2] Appariement exact (normalisé)");
  {
    const cat = [PROD(), PROD({ id: "p2", nom: "Piment" })];
    eq(apparierProduit("tomates", cat)?.id, "p1", "« tomates » retrouve « Tomate »");
    eq(apparierProduit("PIMENT", cat)?.id, "p2", "insensible à la casse");
    eq(apparierProduit("igname", cat), null, "produit inconnu → null");
    eq(apparierProduit("", cat), null, "nom vide → null");
    eq(apparierProduit("tomate", []), null, "catalogue vide → null");
  }

  console.log("\n[3] Appariement par inclusion — seulement s'il est unique");
  {
    const cat = [PROD({ id: "p1", nom: "Tomate cerise" }), PROD({ id: "p2", nom: "Piment" })];
    eq(apparierProduit("tomate", cat)?.id, "p1", "« tomate » ⊂ « Tomate cerise » (unique) → apparié");
    const ambigu = [PROD({ id: "p1", nom: "Tomate cerise" }), PROD({ id: "p2", nom: "Tomate ronde" })];
    eq(apparierProduit("tomate", ambigu), null, "deux candidats → ambigu → null (pas de mauvais stock)");
    const exactPrime = [PROD({ id: "p1", nom: "Tomate" }), PROD({ id: "p2", nom: "Tomate cerise" })];
    eq(apparierProduit("tomate", exactPrime)?.id, "p1", "l'égalité exacte prime sur l'inclusion");
  }

  console.log("\n[4] Ligne unifiée — produit apparié");
  {
    const l = construireLigneVocale({ nomParle: "tomates", quantite: 3, montant: 500, produit: PROD() });
    eq(l.productId, "p1", "productId présent");
    eq(l.nom, "Tomate", "nom du CATALOGUE (pas le nom dicté)");
    eq(l.quantite, 3, "quantité dictée");
    eq(l.total, 500, "total = montant dicté (source de vérité, bug #11)");
    eq(l.prix, 167, "prix unitaire arrondi (500/3)");
    eq(l.prix_unitaire, 167, "alias prix_unitaire aligné");
    eq(l.prix_achat, 300, "prix d'achat UNITAIRE du catalogue (marge réelle)");
  }

  console.log("\n[5] Ligne unifiée — sans appariement");
  {
    const l = construireLigneVocale({ nomParle: "attiéké", quantite: 2, montant: 1000, produit: null });
    eq(l.productId, undefined, "pas de productId");
    eq(l.nom, "attiéké", "nom dicté conservé");
    eq(l.prix_achat, undefined, "pas de prix d'achat inventé");
    eq(l.total, 1000, "total = montant dicté");
    const l2 = construireLigneVocale({ montant: 200 });
    eq(l2.quantite, 1, "quantité absente → 1");
    eq(l2.nom, "Produit vocal", "nom absent → « Produit vocal »");
    const l3 = construireLigneVocale({ nomParle: "pain", quantite: 0, montant: 200 });
    eq(l3.quantite, 1, "quantité 0 → 1 (jamais de division par zéro)");
  }

  console.log("\n[6] Prix d'achat nul ou absent → champ omis");
  {
    const l = construireLigneVocale({ nomParle: "sel", quantite: 1, montant: 100, produit: PROD({ prix_achat: 0 }) });
    eq(l.prix_achat, undefined, "prix_achat 0 → omis (le backend agrège pa × qte)");
    const l2 = construireLigneVocale({ nomParle: "sel", quantite: 1, montant: 100, produit: PROD({ prix_achat: undefined }) });
    eq(l2.prix_achat, undefined, "prix_achat absent → omis");
  }

  console.log("\n[7] « J'ajoute ce produit à ta boutique ? » (lot 2)");
  {
    const makeStore = (seed: Record<string, string> = {}): KVStore & { data: Record<string, string> } => {
      const data: Record<string, string> = { ...seed };
      return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
    };
    const cat = [PROD()];
    const s = makeStore();
    ok(doitProposerCreation(s, "attiéké", cat), "produit inconnu + nom exploitable → on propose");
    ok(!doitProposerCreation(s, "tomates", cat), "produit apparié au catalogue → rien à proposer");
    ok(!doitProposerCreation(s, "ta", cat), "nom trop court → pas de proposition");
    ok(!doitProposerCreation(s, "Produit vocal", cat), "nom générique → pas de proposition");
    ok(!doitProposerCreation(s, "", cat), "nom vide → pas de proposition");
    ok(noterRefusCreation(s, "Attiéké"), "refus mémorisé");
    ok(!doitProposerCreation(s, "attieke", cat), "refus respecté, accents/casse confondus");
    ok(doitProposerCreation(s, "gombo", cat), "un refus ne bloque QUE ce produit");
    const s2 = makeStore({ [CLE_REFUS_PRODUITS]: "{pas du json" });
    ok(doitProposerCreation(s2, "gombo", cat), "mémoire illisible → on propose (jamais de casse)");
    ok(!noterRefusCreation(makeStore(), ""), "nom vide → refus non enregistré");
    const casse: KVStore = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    ok(!noterRefusCreation(casse, "gombo"), "quota plein → false, pas d'exception");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
