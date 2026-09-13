import { OdooRealClient, OdooRealError } from '../../src/odoo-gateway/odoo-real.client';
import { OdooRealClientConfig } from '../../src/odoo-gateway/odoo-client.config';

/**
 * OdooRealClient — validé PAR CONTRAT dans ce lot (fetch simulé, aucune
 * instance Odoo réelle jointe). Voir odoo-real.client.ts pour l'hypothèse
 * assumée sur la forme de la réponse JSON-2, à confirmer contre une vraie
 * instance dans un lot ultérieur.
 */
describe('OdooRealClient (validation par contrat — fetch simulé)', () => {
  const config: OdooRealClientConfig = {
    baseUrl: 'https://odoo-test.example.com',
    apiKey: 'cle-test-ne-jamais-logger',
    timeoutMs: 50,
    writeEnabled: false,
  };

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function reponseOk(body: unknown) {
    return { ok: true, status: 200, json: async () => body } as Response;
  }

  it('appelle POST {baseUrl}/json/2/{model}/{method} avec les bons en-têtes et un body à params nommés', async () => {
    const fetchMock = jest.fn().mockResolvedValue(reponseOk([{ id: 101, name: 'Tomate' }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new OdooRealClient(config);
    const result = await client.execute('product.product', 'search_read', { fields: ['id', 'name'] });

    expect(result).toEqual([{ id: 101, name: 'Tomate' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://odoo-test.example.com/json/2/product.product/search_read');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('bearer cle-test-ne-jamais-logger');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Odoo-Database']).toBeUndefined(); // pas de ODOO_DB dans cette config
    expect(JSON.parse(options.body)).toEqual({ fields: ['id', 'name'] }); // named args, jamais positionnels
  });

  it('ajoute X-Odoo-Database uniquement si la configuration le fournit', async () => {
    const fetchMock = jest.fn().mockResolvedValue(reponseOk([]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new OdooRealClient({ ...config, database: 'julaba_test' });
    await client.execute('product.product', 'search_read', {});

    const options = fetchMock.mock.calls[0][1];
    expect(options.headers['X-Odoo-Database']).toBe('julaba_test');
  });

  it('ne renvoie jamais la clé API dans le message d\'une erreur', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new OdooRealClient(config);
    expect.assertions(1);
    try {
      await client.execute('product.product', 'read', { ids: [1] });
    } catch (err) {
      expect((err as Error).message.includes(config.apiKey)).toBe(false);
    }
  });

  it('erreur 4xx : PAS de retry, échec immédiat', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new OdooRealClient(config);
    await expect(client.execute('product.product', 'read', { ids: [999999] })).rejects.toThrow(OdooRealError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('erreur 5xx transitoire : un retry, puis succès', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(reponseOk([{ id: 1 }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new OdooRealClient(config);
    const result = await client.execute('product.product', 'search_read', {});

    expect(result).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('erreur 5xx persistante : échoue après le nombre maximal de tentatives, jamais plus', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new OdooRealClient(config);
    await expect(client.execute('product.product', 'search_read', {})).rejects.toThrow(OdooRealError);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 essai + 1 retry, pas plus
  });

  it('timeout : abandonne via AbortController après timeoutMs et retente (transitoire)', async () => {
    const fetchMock = jest.fn().mockImplementation(
      (_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new OdooRealClient(config); // timeoutMs: 50
    await expect(client.execute('product.product', 'search_read', {})).rejects.toThrow(OdooRealError);
    expect(fetchMock).toHaveBeenCalledTimes(2); // timeout = transitoire → 1 retry
  }, 10000);

  describe('allowlist stricte de lecture — pas une blacklist de méthodes mutantes', () => {
    it('autorise product.product/search_read même writeEnabled=false', async () => {
      const fetchMock = jest.fn().mockResolvedValue(reponseOk([]));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: false });
      await client.execute('product.product', 'search_read', {});
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('autorise product.product/read même writeEnabled=false', async () => {
      const fetchMock = jest.fn().mockResolvedValue(reponseOk([]));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: false });
      await client.execute('product.product', 'read', { ids: [1] });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('refuse stock.move/create SANS appel réseau quand writeEnabled=false', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: false });
      await expect(
        client.execute('stock.move', 'create', { product_id: 101, product_qty: 1, type: 'in' }),
      ).rejects.toThrow(/allowlist/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuse product.product/write SANS appel réseau quand writeEnabled=false', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: false });
      await expect(client.execute('product.product', 'write', { ids: [1], vals: {} })).rejects.toThrow(
        OdooRealError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuse une méthode métier mutante (action_*) SANS appel réseau — hors blacklist create/write/unlink", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: false });
      await expect(client.execute('stock.move', 'action_confirm', {})).rejects.toThrow(/allowlist/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuse product.product/unlink SANS appel réseau quand writeEnabled=false', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: false });
      await expect(client.execute('product.product', 'unlink', { ids: [1] })).rejects.toThrow(OdooRealError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('autorise stock.move/create quand writeEnabled=true', async () => {
      const fetchMock = jest.fn().mockResolvedValue(reponseOk({ id: 9001 }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: true });
      const result = await client.execute('stock.move', 'create', { product_id: 101, product_qty: 1, type: 'in' });
      expect(result).toEqual({ id: 9001 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry différencié — lectures rejouables, mutations JAMAIS rejouées', () => {
    it('une mutation en échec transitoire (5xx) n\'est PAS rejouée, même writeEnabled=true', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: true });
      await expect(
        client.execute('stock.move', 'create', { product_id: 101, product_qty: 1, type: 'in' }),
      ).rejects.toThrow(OdooRealError);
      expect(fetchMock).toHaveBeenCalledTimes(1); // zéro retry — un timeout/5xx peut survenir APRÈS exécution réelle
    });

    it('un timeout sur une mutation n\'est PAS rejoué, même writeEnabled=true', async () => {
      const fetchMock = jest.fn().mockImplementation(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new OdooRealClient({ ...config, writeEnabled: true }); // timeoutMs: 50
      await expect(
        client.execute('stock.move', 'create', { product_id: 101, product_qty: 1, type: 'in' }),
      ).rejects.toThrow(OdooRealError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }, 10000);
  });
});
