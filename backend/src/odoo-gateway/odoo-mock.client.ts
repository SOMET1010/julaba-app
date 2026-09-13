import { OdooClient } from './odoo-client.interface';

/** Erreurs Odoo simulées — typées pour que le Gateway puisse distinguer les
 *  scénarios sans dépendre du texte du message. */
export class OdooSimulatedError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNKNOWN_PRODUCT' | 'INSUFFICIENT_STOCK' | 'SIMULATED_ERROR',
  ) {
    super(message);
    this.name = 'OdooSimulatedError';
  }
}

interface FakeOdooProduct {
  id: number;
  name: string;
  list_price: number;
  qty_available: number;
  default_code: string;
  /** Forme many2one d'Odoo : `[id, code ISO]`. Le mock simule une instance
   *  configurée en XOF, seule devise que le mapper JULABA accepte. */
  currency_id: [number, string];
}

/** Devise du catalogue simulé. Les prix ci-dessous sont des prix de marché
 *  ivoiriens en francs CFA — le mock a toujours été dans le bon contexte, ce
 *  qui a longtemps masqué l'absence de garde-fou : une vraie instance Odoo de
 *  démonstration, elle, est en USD. */
const DEVISE_MOCK: [number, string] = [1, 'XOF'];

const CATALOGUE_INITIAL: FakeOdooProduct[] = [
  { id: 101, name: 'Tomate', list_price: 500, qty_available: 42, default_code: 'TOM-001', currency_id: DEVISE_MOCK },
  { id: 102, name: 'Oignon', list_price: 500, qty_available: 8, default_code: 'OIG-001', currency_id: DEVISE_MOCK },
  { id: 103, name: 'Aubergine', list_price: 500, qty_available: 30, default_code: 'AUB-001', currency_id: DEVISE_MOCK },
  { id: 104, name: 'Banane', list_price: 300, qty_available: 60, default_code: 'BAN-001', currency_id: DEVISE_MOCK },
  { id: 105, name: 'Carotte', list_price: 500, qty_available: 25, default_code: 'CAR-001', currency_id: DEVISE_MOCK },
  { id: 106, name: 'Poivron', list_price: 500, qty_available: 18, default_code: 'POI-001', currency_id: DEVISE_MOCK },
  { id: 107, name: 'Pomme de terre', list_price: 500, qty_available: 50, default_code: 'PDT-001', currency_id: DEVISE_MOCK },
  { id: 108, name: 'Huile', list_price: 1500, qty_available: 15, default_code: 'HUI-001', currency_id: DEVISE_MOCK },
];

/**
 * Client Odoo SIMULÉ — aucun appel réseau, aucun secret. Catalogue et stock
 * tenus en mémoire, réinitialisés à chaque redémarrage du processus (voir la
 * limite documentée dans sync-journal.ts pour le journal de synchronisation).
 *
 * Respecte strictement le contrat `OdooClient.execute()` : le futur
 * `OdooRealClient` sera un remplacement direct, sans toucher au service ni
 * au contrôleur qui consomment cette interface.
 */
export class OdooMockClient implements OdooClient {
  private readonly produits = new Map<number, FakeOdooProduct>(
    CATALOGUE_INITIAL.map((p) => [p.id, { ...p }]),
  );
  private nextMoveId = 9000;

  async execute<T = unknown>(model: string, method: string, params: Record<string, unknown>): Promise<T> {
    if (model === 'product.product' && method === 'search_read') {
      return [...this.produits.values()] as unknown as T;
    }
    if (model === 'product.product' && method === 'read') {
      const ids = (params.ids as number[]) || [];
      return ids.map((id) => this.produits.get(id)).filter((p): p is FakeOdooProduct => !!p) as unknown as T;
    }
    if (model === 'stock.move' && method === 'create') {
      return this.creerMouvement(params) as unknown as T;
    }
    throw new Error(`OdooMockClient : modèle/méthode non simulés (${model}.${method})`);
  }

  private creerMouvement(params: Record<string, unknown>): { id: number } {
    // Knob de démonstration/tests UNIQUEMENT — n'existe dans aucun vrai
    // client Odoo. Sert à déclencher de façon déterministe le scénario
    // « erreur Odoo simulée » (timeout, 500, etc.) sans dépendre du hasard.
    if (params._simulerErreur) {
      throw new OdooSimulatedError(
        'Erreur technique Odoo simulée (ex. timeout, 500).',
        'SIMULATED_ERROR',
      );
    }

    const productId = Number(params.product_id);
    const produit = this.produits.get(productId);
    if (!produit) {
      throw new OdooSimulatedError(`Produit Odoo introuvable (id=${productId}).`, 'UNKNOWN_PRODUCT');
    }

    const quantite = Number(params.product_qty) || 0;
    const type = params.type === 'out' ? 'out' : 'in';
    if (type === 'out' && quantite > produit.qty_available) {
      throw new OdooSimulatedError(
        `Stock insuffisant pour ${produit.name} (demandé ${quantite}, disponible ${produit.qty_available}).`,
        'INSUFFICIENT_STOCK',
      );
    }

    produit.qty_available += type === 'out' ? -quantite : quantite;
    return { id: this.nextMoveId++ };
  }
}
