import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ODOO_CLIENT, OdooClient } from './odoo-client.interface';
import { SyncJournal, SyncJournalEntry } from './sync-journal';
import { versJulaba, JulabaProduitOdoo, OdooProductRecord } from './produit-mapper';
import { MouvementStockDto } from './dto/mouvement-stock.dto';

export type MouvementStockCommand = MouvementStockDto;

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
 * réutilisé avec un payload différent est un conflit explicite refusé, et
 * deux appels CONCURRENTS pour le même `operationId` ne déclenchent jamais
 * deux appels Odoo (voir `enCours` ci-dessous).
 */
@Injectable()
export class OdooGatewayService {
  private readonly journal = new SyncJournal();

  /**
   * Opérations Odoo actuellement en vol, par `operationId`. Sans ce
   * cloisonnement, deux requêtes concurrentes pour le même `operationId`
   * verraient toutes les deux l'état `syncing` du journal et repartiraient
   * chacune vers `odooClient.execute()`, recréant exactement le double effet
   * que l'idempotence est censée empêcher. Ici, la deuxième requête reçoit la
   * MÊME promesse que la première au lieu de démarrer un second appel.
   * Fonctionne car aucun `await` ne sépare la lecture et l'écriture de cette
   * map (JS single-threadé) : la vérification est atomique.
   */
  private readonly enCours = new Map<string, Promise<SyncJournalEntry>>();

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
   * Frontière d'intégration : on refuse une commande mal formée plutôt que de
   * la normaliser silencieusement (contrairement au mock, qui simule un
   * système externe). Réutilise class-validator, déjà la stack de validation
   * du backend (voir main.ts, ValidationPipe global) — pas de nouvelle
   * dépendance. Appelé explicitement ici (et pas seulement via le
   * ValidationPipe HTTP) pour que la même garantie protège aussi tout appelant
   * qui instancierait le service directement (tests, futurs jobs internes).
   */
  private validerCommande(cmd: MouvementStockCommand): void {
    const dto = plainToInstance(MouvementStockDto, cmd);
    const erreurs = validateSync(dto, { whitelist: true, forbidUnknownValues: true });
    if (erreurs.length > 0) {
      const messages = erreurs.flatMap((e) => Object.values(e.constraints ?? {}));
      throw new BadRequestException(
        messages.length > 0 ? messages : ['Commande de mouvement de stock invalide.'],
      );
    }
  }

  /**
   * Simule un mouvement de stock via le Gateway, idempotent sur `operationId`
   * — y compris face à des rejeux CONCURRENTS. Voir sync-journal.ts pour la
   * limite assumée (journal en mémoire, POC).
   */
  async simulerMouvementStock(cmd: MouvementStockCommand): Promise<SyncJournalEntry> {
    this.validerCommande(cmd);

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
      // légitime (ex. la vendeuse retente après un rejet transitoire) —
      // SAUF si un appel est déjà en vol, voir ci-dessous.
    }

    const enVol = this.enCours.get(cmd.operationId);
    if (enVol) {
      // Un appel identique est déjà en train de parler à Odoo : on rejoint
      // ce résultat au lieu d'en déclencher un second.
      return enVol;
    }

    const tentatives = (existant?.tentatives ?? 0) + 1;
    const creeLe = existant?.creeLe ?? Date.now();

    const execution = (async (): Promise<SyncJournalEntry> => {
      try {
        this.journal.upsert({
          operationId: cmd.operationId,
          domaine: 'stock_move',
          odooModel: 'stock.move',
          etat: 'pending',
          payloadSnapshot: snapshot,
          tentatives,
          creeLe,
        });
        this.journal.upsert({
          operationId: cmd.operationId,
          domaine: 'stock_move',
          odooModel: 'stock.move',
          etat: 'syncing',
          payloadSnapshot: snapshot,
          tentatives,
          creeLe,
        });

        const result = await this.odooClient.execute<{ id: number }>('stock.move', 'create', {
          product_id: cmd.odooProductId,
          product_qty: cmd.quantite,
          type: cmd.type,
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
      } finally {
        this.enCours.delete(cmd.operationId);
      }
    })();

    this.enCours.set(cmd.operationId, execution);
    return execution;
  }
}
