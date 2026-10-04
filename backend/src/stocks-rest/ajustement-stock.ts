import { EntityManager } from 'typeorm';

/**
 * AJUSTEMENT DE STOCK HORS VENTE — aligne `produits.stock` ET écrit la ligne
 * de ledger correspondante, dans la même transaction.
 *
 * LE DÉFAUT QU'ON FERME. Deux routes vivantes changeaient `produits.stock`
 * sans écrire le moindre mouvement :
 *   - `PUT   /caisse/produits/:id`  (caisse-rest.controller.ts)
 *   - `PATCH /stocks/:id`          (stocks-rest.controller.ts)
 * Le cache divergeait alors du ledger, définitivement et en silence — ce que
 * `reconciliation-stock.ts` sait désormais détecter, mais qu'il ne corrige pas.
 * Ici, on supprime la cause : plus aucune modification de stock n'est muette.
 *
 * La formule du ledger est préservée telle quelle :
 *     stock_après = stock_avant − quantite_retranchee
 * donc `quantite_retranchee = avant − après` (NÉGATIF quand on ajoute du
 * stock, exactement comme une annulation de vente). C'est ce qui garde la
 * réconciliation exacte, sans cas particulier.
 *
 * `transaction_id` est NULL : un ajustement n'appartient à aucune vente. Le
 * ledger le distingue par `type = 'ajustement'`.
 */
export interface ResultatAjustement {
  ecrit: boolean;
  stockAvant?: number;
  stockApres?: number;
}

export async function ajusterStockAvecMouvement(
  m: EntityManager,
  args: { marchandId: string; produitId: string; stockDemande: unknown },
): Promise<ResultatAjustement> {
  const demande = args.stockDemande;
  if (demande === null || demande === undefined || demande === '') return { ecrit: false };
  const apres = Number(demande);
  if (!Number.isFinite(apres)) return { ecrit: false };

  // Verrou de ligne : deux ajustements concurrents du même article se
  // sérialisent, et `stock_avant` est donc toujours celui réellement observé.
  const [p] = await m.query(
    `SELECT id, nom, COALESCE(stock, 0) AS stock, unite FROM produits
      WHERE id = $1 AND marchand_id = $2::text FOR UPDATE`,
    [args.produitId, args.marchandId],
  );
  if (!p) return { ecrit: false };

  const avant = Number(p.stock) || 0;
  // Rien n'a bougé → aucune ligne. Un ledger qui enregistre des non-événements
  // devient illisible, et « 0 mouvement » reste une information juste.
  if (apres === avant) return { ecrit: false };

  await m.query(`UPDATE produits SET stock = $1, updated_at = NOW() WHERE id = $2`, [apres, args.produitId]);
  await m.query(
    `INSERT INTO stock_mouvements
       (marchand_id, transaction_id, produit_id, produit_nom, stock_avant,
        quantite_demandee, quantite_retranchee, manquant, type, unite)
     VALUES ($1::text, NULL, $2, $3, $4, $5, $6, 0, 'ajustement', $7)`,
    [args.marchandId, args.produitId, p.nom, avant, Math.abs(avant - apres), avant - apres, p.unite ?? null],
  );
  return { ecrit: true, stockAvant: avant, stockApres: apres };
}
