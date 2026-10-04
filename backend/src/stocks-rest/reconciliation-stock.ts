/**
 * RÉCONCILIATION `produits.stock` ⟷ ledger `stock_mouvements`.
 *
 * POURQUOI CE FICHIER EXISTE. `produits.stock` est un CACHE : la vérité, c'est
 * le ledger append-only. Le ledger enregistre, à chaque mouvement, le stock
 * d'AVANT (`stock_avant`) et ce qui a été retranché (`quantite_retranchee`,
 * négatif pour une restitution). Le stock attendu après un mouvement est donc
 * `stock_avant - quantite_retranchee`, et celui du DERNIER mouvement doit
 * égaler `produits.stock`.
 *
 * Rien, aujourd'hui, ne vérifie cette égalité. Or TROIS routes modifient
 * `produits.stock` SANS écrire de mouvement :
 *   - `PUT  /caisse/produits/:id`  (caisse-rest.controller.ts:641)
 *   - `PATCH /stocks/:id`          (stocks-rest.controller.ts:188 et :240)
 * Après l'une d'elles, le cache et le ledger divergent, définitivement et en
 * silence. C'est ce silence que ce fichier supprime : il ne corrige rien, il
 * REND L'ÉCART VISIBLE. (Pattern `Bin` ⟵ `Stock Ledger Entry` d'ERPNext.)
 *
 * LECTURE SEULE. Aucune de ces requêtes n'écrit.
 */

/**
 * Écarts entre le cache et le ledger, un par produit divergent.
 *
 * `DISTINCT ON (produit_id)` + `ORDER BY created_at DESC` = le dernier
 * mouvement de chaque produit. Départage par `id` pour rester déterministe,
 * mais voir `SQL_MOUVEMENTS_AMBIGUS` : si deux mouvements d'un même produit
 * partagent `created_at`, ce départage est arbitraire et le verdict devient
 * indéterminé plutôt que faussement rassurant.
 */
export const SQL_ECARTS_STOCK_LEDGER = `
  WITH dernier AS (
    SELECT DISTINCT ON (produit_id)
           produit_id,
           marchand_id,
           produit_nom,
           (stock_avant - quantite_retranchee) AS stock_attendu
      FROM stock_mouvements
     WHERE produit_id IS NOT NULL
     ORDER BY produit_id, created_at DESC, id DESC
  )
  SELECT d.produit_id,
         d.marchand_id,
         d.produit_nom,
         d.stock_attendu::numeric      AS stock_attendu,
         COALESCE(p.stock, 0)::numeric AS stock_constate,
         (COALESCE(p.stock, 0) - d.stock_attendu)::numeric AS ecart
    FROM dernier d
    JOIN produits p ON p.id = d.produit_id
   WHERE COALESCE(p.stock, 0) IS DISTINCT FROM d.stock_attendu
   ORDER BY abs(COALESCE(p.stock, 0) - d.stock_attendu) DESC
`;

/**
 * Mouvements dont l'ordre est INDÉTERMINÉ : même produit, même `created_at`.
 *
 * `created_at` vaut `now()`, c'est-à-dire l'instant de DÉBUT de transaction :
 * deux mouvements du même produit écrits dans une même transaction porteraient
 * donc un horodatage IDENTIQUE. Le panier fusionne les lignes d'un même produit
 * (`CaisseContext.tsx:526`), ce cas ne devrait donc jamais survenir — mais si
 * cette hypothèse tombe un jour, on veut le savoir, pas obtenir un verdict
 * tiré au sort.
 */
export const SQL_MOUVEMENTS_AMBIGUS = `
  SELECT produit_id, created_at, count(*)::int AS n
    FROM stock_mouvements
   WHERE produit_id IS NOT NULL
   GROUP BY produit_id, created_at
  HAVING count(*) > 1
`;

export interface EcartStock {
  produit_id: string;
  marchand_id: string;
  produit_nom: string | null;
  stock_attendu: string | number;
  stock_constate: string | number;
  ecart: string | number;
}

export type VerdictReconciliation = 'reconcilie' | 'ecart' | 'indetermine';

/**
 * Verdict PUR (aucune base) — testable sans Postgres.
 *
 * L'ambiguïté l'emporte sur l'absence d'écart : un ledger dont l'ordre n'est
 * pas déterminable ne PROUVE rien, et annoncer « réconcilié » dans ce cas
 * serait exactement le silence qu'on cherche à supprimer.
 */
export function verdictReconciliation(bilan: {
  ecarts: unknown[];
  ambigus: unknown[];
}): VerdictReconciliation {
  if (bilan.ambigus.length > 0) return 'indetermine';
  return bilan.ecarts.length > 0 ? 'ecart' : 'reconcilie';
}
