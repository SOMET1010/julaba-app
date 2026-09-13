import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ODOO_CLIENT, OdooClient } from './odoo-client.interface';
import { SyncJournal, SyncJournalEntry } from './sync-journal';
import { versJulaba, JulabaProduitOdoo, OdooProductRecord } from './produit-mapper';

export interface MouvementStockCommand {
  operationId: string;
  odooProductId: number;
  quantite: number;
  type: 'in' | 'out';
  /** Knob de démonstration/tests UNIQUEMENT — jamais exposé côté JULABA réel,
   *  jamais transmis par un vrai appelant. Déclenche le scénario « erreur
   *  Odoo simulée » de façon déterministe pour les tests. */
  simulerErreur?: boolean;
}

/**
 * Gateway JULABA → Odoo, périmètre POC : catalogue + stock consolidé
 * uniquement. Aucune vente cash, aucun crédit, aucun Mobile Money, aucune
 * comptabilité dans ce lot (voir docs/ETUDE_ARCHITECTURE_JULABA_ODOO.md).
 *
 * N'écrit jamais directement dans Odoo depuis un appelant JULABA — toute
 * commande passe par `simulerMouvementStock`, qui applique la même
 * discipline d'idempotence que l'outbox financière déjà en production
 * (voir frontend_src/.../voice-offline/offlineCaisse.ts) : un `operationId`
 * rejoué à l'identique ne produit jamais un second effet, un `operationId`
 * réutilisé avec un payload différent est un conflit explicite refusé.
 */
@Injectable()
export class OdooGatewayService {
  private readonly journal = new SyncJournal();

  constructor(@Inject(ODOO_CLIENT) private readonly odooClient: OdooClient) {}

  async listerCatalogue(): Promise<JulabaProduitOdoo[]> {
    const produits = await this.odooClient.execute<OdooProductRecord[]>('product.product', 'search_read', {
      fields: ['id', 'name', 'list_price', 'qty_available', 'default_code'],
    });
    return produits.map(versJulaba);
  }

  async lireStock(odooProductId: number): Promise<number | null> {
    const rows = await this.odooClient.execute<Array<{ qty_available: number }>>('product.product', 'read', {
      ids: [odooProductId],
      fields: ['qty_available'],
    });
    return rows.length > 0 ? rows[0].qty_available : null;
  }

  getJournal(operationId: string): SyncJournalEntry | undefined {
    return this.journal.get(operationId);
  }

  listJournal(): SyncJournalEntry[] {
    return this.journal.list();
  }

  /**
   * Simule un mouvement de stock via le Gateway, idempotent sur `operationId`.
   * Voir sync-journal.ts pour la limite assumée (journal en mémoire, POC).
   */
  async simulerMouvementStock(cmd: MouvementStockCommand): Promise<SyncJournalEntry> {
    const snapshot = JSON.stringify({ odooProductId: cmd.odooProductId, quantite: cmd.quantite, type: cmd.type });
    const existant = this.journal.get(cmd.operationId);

    if (existant) {
      if (existant.payloadSnapshot !== snapshot) {
        throw new ConflictException(
          `operationId "${cmd.operationId}" déjà utilisé avec un payload différent — ` +
            `un operationId doit rester lié à une seule opération métier.`,
        );
      }
      if (existant.etat === 'confirmed') {
        // Rejeu à l'identique déjà confirmé : AUCUN second appel à Odoo,
        // aucun second mouvement — c'est la propriété d'idempotence exigée.
        return existant;
      }
      // pending/syncing/rejected avec le MÊME payload : nouvelle tentative
      // légitime (ex. la vendeuse retente après un rejet transitoire).
    }

    const tentatives = (existant?.tentatives ?? 0) + 1;
    const creeLe = existant?.creeLe ?? Date.now();
    this.journal.upsert({
      operationId: cmd.operationId,
      domaine: 'stock_move',
      odooModel: 'stock.move',
      etat: 'syncing',
      payloadSnapshot: snapshot,
      tentatives,
      creeLe,
    });

    try {
      const result = await this.odooClient.execute<{ id: number }>('stock.move', 'create', {
        product_id: cmd.odooProductId,
        product_qty: cmd.quantite,
        type: cmd.type,
        ...(cmd.simulerErreur ? { _simulerErreur: true } : {}),
      });
      return this.journal.upsert({
        operationId: cmd.operationId,
        domaine: 'stock_move',
        odooModel: 'stock.move',
        odooRecordId: result.id,
        etat: 'confirmed',
        payloadSnapshot: snapshot,
        tentatives,
        creeLe,
        confirmeLe: Date.now(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return this.journal.upsert({
        operationId: cmd.operationId,
        domaine: 'stock_move',
        odooModel: 'stock.move',
        etat: 'rejected',
        payloadSnapshot: snapshot,
        tentatives,
        derniereErreur: message,
        creeLe,
      });
    }
  }
}
