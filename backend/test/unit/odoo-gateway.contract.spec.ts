import { OdooGatewayService } from '../../src/odoo-gateway/odoo-gateway.service';
import { OdooMockClient } from '../../src/odoo-gateway/odoo-mock.client';
import { OdooRealClient } from '../../src/odoo-gateway/odoo-real.client';
import { OdooClient } from '../../src/odoo-gateway/odoo-client.interface';

/**
 * Tests CONTRACTUELS : les mêmes assertions de lecture rejouées contre
 * OdooMockClient ET OdooRealClient (celui-ci avec `fetch` simulé et des
 * fixtures au format Odoo 19 attendu). Prouve que OdooGatewayService se
 * comporte IDENTIQUEMENT quel que soit le client injecté sous ODOO_CLIENT —
 * c'est tout le sens du contrat OdooClient.execute() (voir
 * odoo-client.interface.ts).
 *
 * Ne remplace PAS une validation contre une vraie instance Odoo, mais les
 * fixtures ci-dessous ne sont plus une hypothèse : la forme de la réponse
 * JSON-2 (le corps de la réponse EST le résultat, sans enveloppe façon ancien
 * JSON-RPC) a été confirmée sur Odoo Server 19.0 — voir
 * infra/odoo-poc/README.md, section « État de validation ».
 */
/** `currency_id` est présent sous la forme many2one d'Odoo, `[id, code ISO]` :
 *  le Gateway le demande et le mapper refuse tout ce qui n'est pas du XOF
 *  (voir produit-mapper.ts). Une fixture sans ce champ ferait légitimement
 *  échouer ces tests — c'est le garde-fou qui parle, pas un test cassé. */
const CATALOGUE_FIXTURE = [
  { id: 101, name: 'Tomate', list_price: 500, qty_available: 42, default_code: 'TOM-001', currency_id: [1, 'XOF'] },
  { id: 102, name: 'Oignon', list_price: 500, qty_available: 8, default_code: 'OIG-001', currency_id: [1, 'XOF'] },
];

function creerOdooRealClientSimule(): OdooClient {
  const fetchMock = jest.fn(async (url: string) => {
    if (url.endsWith('/product.product/search_read')) {
      return { ok: true, status: 200, json: async () => CATALOGUE_FIXTURE } as Response;
    }
    if (url.endsWith('/product.product/read')) {
      return { ok: true, status: 200, json: async () => [{ qty_available: 42 }] } as Response;
    }
    return { ok: true, status: 200, json: async () => [] } as Response;
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return new OdooRealClient({
    baseUrl: 'https://odoo-test.example.com',
    apiKey: 'cle-test',
    timeoutMs: 1000,
    writeEnabled: false,
  });
}

function creerOdooRealClientProduitInconnuSimule(): OdooClient {
  const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => [] }) as unknown as Response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return new OdooRealClient({
    baseUrl: 'https://odoo-test.example.com',
    apiKey: 'cle-test',
    timeoutMs: 1000,
    writeEnabled: false,
  });
}

describe.each([
  ['OdooMockClient', () => new OdooMockClient() as OdooClient],
  ['OdooRealClient (fetch simulé)', creerOdooRealClientSimule],
])('OdooGatewayService — contrat de lecture identique avec %s', (_label, creerClient) => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('liste le catalogue mappé au format JULABA', async () => {
    const service = new OdooGatewayService(creerClient());
    const catalogue = await service.listerCatalogue();
    expect(catalogue.length).toBeGreaterThan(0);
    expect(catalogue[0]).toMatchObject({
      nom: expect.any(String),
      prix: expect.any(Number),
      stock: expect.any(Number),
      odooProductId: expect.any(Number),
    });
  });

  it("lit le stock d'un produit connu", async () => {
    const service = new OdooGatewayService(creerClient());
    expect(await service.lireStock(101)).toBe(42);
  });
});

describe('OdooGatewayService — produit inconnu, comportement identique mock/réel', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('OdooMockClient : renvoie null', async () => {
    const service = new OdooGatewayService(new OdooMockClient());
    expect(await service.lireStock(999999)).toBeNull();
  });

  it('OdooRealClient (fetch simulé, aucune ligne renvoyée) : renvoie null', async () => {
    const service = new OdooGatewayService(creerOdooRealClientProduitInconnuSimule());
    expect(await service.lireStock(999999)).toBeNull();
  });
});
