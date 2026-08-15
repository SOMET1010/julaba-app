/**
 * Tests du calcul de statistiques de vente (bugs #10 / #11 audit voix-caisse).
 * Lancer : npm run test:stats   (tsx, sans DOM ni navigateur)
 *
 * Garantit qu'on n'affiche JAMAIS un chiffre d'affaires gonflé : le total par
 * produit est la somme des montants, jamais price * quantity.
 */
import { topProduitsVentes, montantLigne, resumeVentes, venteComptee, type LigneVente } from "./statsVente.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

const v = (productName: string, quantity: number, montant: number): LigneVente =>
  ({ productName, type: "vente", quantity, montant });

function main() {
  console.log("\n[1] montantLigne : montant, sinon price, jamais * quantity");
  {
    eq(montantLigne({ productName: "t", type: "vente", quantity: 3, montant: 500 }), 500, "montant utilisé tel quel");
    eq(montantLigne({ productName: "t", type: "vente", quantity: 3, price: 800 }), 800, "price en repli (pas *3)");
    eq(montantLigne({ productName: "t", type: "vente", quantity: 3 }), 0, "ni montant ni price → 0");
  }

  console.log("\n[2] #11 — un total indivisible ne resomme jamais faux (500 / 3)");
  {
    const top = topProduitsVentes([v("tomate", 3, 500)]);
    eq(top, [{ productName: "tomate", quantity: 3, total: 500 }], "500 pour 3 → total 500 (pas 501, pas 1500)");
  }

  console.log("\n[3] #10 — la vraie quantité s'accumule, le total = somme des montants");
  {
    const top = topProduitsVentes([v("tomate", 3, 500), v("tomate", 2, 400)]);
    eq(top, [{ productName: "tomate", quantity: 5, total: 900 }], "3+2 = 5 vendus, 500+400 = 900 FCFA");
  }

  console.log("\n[4] Anti-gonflement — total JAMAIS multiplié par la quantité");
  {
    const top = topProduitsVentes([v("riz", 10, 1000)]);
    ok(top[0].total === 1000, "riz ×10 à 1000 FCFA → CA 1000 (et surtout pas 10 000)");
  }

  console.log("\n[5] Les dépenses sont exclues, tri décroissant + limite");
  {
    const lignes: LigneVente[] = [
      v("tomate", 1, 300),
      { productName: "loyer", type: "depense", quantity: 1, montant: 99999 },
      v("igname", 1, 900),
      v("piment", 1, 600),
    ];
    const top = topProduitsVentes(lignes, 2);
    eq(top.map((p) => p.productName), ["igname", "piment"], "dépense exclue ; top 2 par CA décroissant");
  }

  console.log("\n[6] Le CA total reste cohérent (somme des tops = somme des ventes)");
  {
    const lignes = [v("a", 2, 500), v("b", 3, 700), v("a", 1, 250)];
    const totalVentes = lignes.reduce((s, t) => s + montantLigne(t), 0);
    const sommeTop = topProduitsVentes(lignes).reduce((s, p) => s + p.total, 0);
    eq(sommeTop, totalVentes, `somme des tops (${sommeTop}) = total ventes (${totalVentes})`);
  }

  console.log("\n[7] #20 — une vente ANNULÉE ne compte dans AUCUN KPI (resumeVentes)");
  {
    const ventes = [
      { montant: 6000, totalBenefice: 2000, statut: "annulee" }, // annulée → exclue partout
      { montant: 500,  totalBenefice: 150,  statut: "validee" },
      { montant: 2000, totalBenefice: 800 },                     // statut absent → comptée
    ];
    const r = resumeVentes(ventes);
    eq(r.totalVentes, 2500, "CA exclut la vente annulée (500 + 2000, pas 8500)");
    eq(r.totalCount, 2, "volume exclut la vente annulée (2, pas 3)");
    eq(r.totalBenefices, 950, "bénéfices excluent la vente annulée (150 + 800)");
    eq(r.panierMoyen, 1250, "panier moyen = 2500 / 2 (pas 8500 / 3)");
  }

  console.log("\n[8] #20 — resumeVentes : que des annulées → tout à zéro, pas de division par zéro");
  {
    const r = resumeVentes([{ montant: 6000, statut: "annulee" }]);
    eq([r.totalVentes, r.totalCount, r.totalBenefices, r.panierMoyen], [0, 0, 0, 0], "aucune vente comptée → 0 partout");
  }

  console.log("\n[9] #20 — venteComptee : seul 'annulee' exclut ; validee / absent comptent");
  {
    ok(venteComptee({ statut: "validee" }) === true, "validee comptée");
    ok(venteComptee({}) === true, "statut absent → comptée (ventes historiques / crédits)");
    ok(venteComptee({ statut: "annulee" }) === false, "annulee exclue");
  }

  console.log("\n[10] #20 — topProduitsVentes exclut aussi les ventes annulées");
  {
    const lignes: LigneVente[] = [
      { productName: "tomate", type: "vente", quantity: 30, montant: 6000, statut: "annulee" },
      { productName: "tomate", type: "vente", quantity: 2,  montant: 400,  statut: "validee" },
    ];
    eq(topProduitsVentes(lignes), [{ productName: "tomate", quantity: 2, total: 400 }],
      "l'annulée ne gonfle ni la quantité (2, pas 32) ni le CA (400, pas 6400)");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
