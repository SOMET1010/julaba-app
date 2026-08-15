import { EntityManager } from 'typeorm';

export type Restitution = { produit_id: string; produit_nom: string; quantite: number };

/**
 * Restitue au stock ce qu'une vente avait retranché, à son annulation (R7 / #20).
 *
 * Partagée entre l'annulation ADMIN (transactions-rest) et l'annulation
 * SELF-SERVICE marchand (caisse-rest) : une seule source de vérité.
 *
 * Idempotent PAR CONSTRUCTION : on travaille sur le NET du ledger (somme des
 * `quantite_retranchee` pour la transaction, restitutions négatives comprises).
 * Une 1ʳᵉ annulation ramène ce net à 0 (ligne inverse insérée). Toute annulation
 * ultérieure trouve un net ≤ 0 et ne restitue plus rien — aucune double remise.
 *
 * Append-only : on n'édite jamais un mouvement, on INSÈRE une ligne de
 * restitution (`quantite_retranchee` négative = stock rendu, `type='annulation'`).
 * Verrou de ligne (FOR UPDATE) sur le produit. À exécuter DANS la transaction du
 * changement de statut (EntityManager transactionnel passé en argument).
 */
export async function restituerStock(
  m: EntityManager,
  transactionId: string,
): Promise<Restitution[]> {
  const nets: Array<{ produit_id: string; produit_nom: string; marchand_id: string; net: string }> =
    await m.query(
      `SELECT produit_id,
              MAX(produit_nom)  AS produit_nom,
              MAX(marchand_id)  AS marchand_id,
              COALESCE(SUM(quantite_retranchee), 0) AS net
         FROM stock_mouvements
        WHERE transaction_id = $1 AND produit_id IS NOT NULL
        GROUP BY produit_id`,
      [transactionId],
    );

  const restitutions: Restitution[] = [];
  for (const row of nets) {
    const net = Number(row.net) || 0;
    if (net <= 0) continue; // déjà restitué, ou vente sans effet stock réel

    const prod = await m.query(
      `SELECT id, COALESCE(stock, 0) AS stock FROM produits WHERE id = $1 FOR UPDATE`,
      [row.produit_id],
    );
    if (!prod[0]) continue; // produit supprimé entre-temps : rien à restituer
    const stockAvant = Number(prod[0].stock) || 0;

    await m.query(`UPDATE produits SET stock = $1, updated_at = NOW() WHERE id = $2`, [
      stockAvant + net,
      row.produit_id,
    ]);
    await m.query(
      `INSERT INTO stock_mouvements
         (marchand_id, transaction_id, produit_id, produit_nom, stock_avant, quantite_demandee, quantite_retranchee, manquant, type)
       VALUES ($1::text, $2, $3, $4, $5, $6, $7, 0, 'annulation')`,
      [row.marchand_id, transactionId, row.produit_id, row.produit_nom, stockAvant, net, -net],
    );
    restitutions.push({ produit_id: row.produit_id, produit_nom: row.produit_nom, quantite: net });
  }
  return restitutions;
}
