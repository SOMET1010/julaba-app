import { OdooGatewayService } from '../../src/odoo-gateway/odoo-gateway.service';
import { OdooMockClient, OdooSimulatedError } from '../../src/odoo-gateway/odoo-mock.client';
import { SyncJournal, SyncJournalEntry } from '../../src/odoo-gateway/sync-journal';
import { OdooClient } from '../../src/odoo-gateway/odoo-client.interface';

/**
 * POC structurel Gateway Odoo — catalogue + stock consolidé uniquement.
 * Test PUR (aucune base, aucun réseau) : OdooGatewayService instancié
 * directement avec un OdooMockClient, exactement comme il serait instancié
 * avec un futur OdooRealClient (même contrat OdooClient.execute()).
 */
describe('OdooGatewayService (POC structurel — catalogue + stock)', () => {
  let service: OdooGatewayService;

  beforeEach(() => {
    service = new OdooGatewayService(new OdooMockClient());
  });

  it('liste le catalogue simulé (8 produits) mappé vers le format JULABA', async () => {
    const catalogue = await service.listerCatalogue();
    expect(catalogue).toHaveLength(8);
    expect(catalogue[0]).toMatchObject({
      nom: expect.any(String),
      prix: expect.any(Number),
      stock: expect.any(Number),
      odooProductId: expect.any(Number),
    });
  });

  it("lit le stock d'un produit connu", async () => {
    expect(await service.lireStock(101)).toBe(42);
  });

  it('renvoie null pour un produit Odoo inconnu (lecture)', async () => {
    expect(await service.lireStock(999999)).toBeNull();
  });

  it('mouvement réussi : décrémente le stock et confirme le journal', async () => {
    const res = await service.simulerMouvementStock({
      operationId: 'op-succes', odooProductId: 101, quantite: 5, type: 'out',
    });
    expect(res.etat).toBe('confirmed');
    expect(res.odooRecordId).toBeDefined();
    expect(await service.lireStock(101)).toBe(37);
  });

  it('stock insuffisant : rejeté, stock inchangé', async () => {
    const avant = await service.lireStock(102); // 8
    const res = await service.simulerMouvementStock({
      operationId: 'op-insuffisant', odooProductId: 102, quantite: 999, type: 'out',
    });
    expect(res.etat).toBe('rejected');
    expect(res.derniereErreur).toMatch(/insuffisant/i);
    expect(await service.lireStock(102)).toBe(avant);
  });

  it('produit inconnu : rejeté explicitement', async () => {
    const res = await service.simulerMouvementStock({
      operationId: 'op-inconnu', odooProductId: 424242, quantite: 1, type: 'in',
    });
    expect(res.etat).toBe('rejected');
    expect(res.derniereErreur).toMatch(/introuvable/i);
  });

  it("erreur Odoo simulée sur le mock : levée en OdooSimulatedError('SIMULATED_ERROR')", async () => {
    // Le knob `_simulerErreur` n'existe QUE côté OdooMockClient (test-only) —
    // volontairement inatteignable depuis le DTO HTTP public (MouvementStockDto)
    // ni depuis OdooGatewayService, voir dto/mouvement-stock.dto.ts. On l'exerce
    // donc directement sur le mock, pas via le service.
    const mock = new OdooMockClient();
    await expect(
      mock.execute('stock.move', 'create', { product_id: 103, product_qty: 1, type: 'in', _simulerErreur: true }),
    ).rejects.toMatchObject({ code: 'SIMULATED_ERROR' });
    await expect(
      mock.execute('stock.move', 'create', { product_id: 103, product_qty: 1, type: 'in', _simulerErreur: true }),
    ).rejects.toBeInstanceOf(OdooSimulatedError);
  });

  it('toute erreur du client Odoo (quel qu\'il soit) devient un journal rejected', async () => {
    // Preuve découplée du mock : n'importe quelle implémentation OdooClient
    // qui échoue (mock, réel, ou un double de test) doit aboutir au même
    // comportement du service — c'est le point du contrat OdooClient.execute().
    const clientDefaillant: OdooClient = {
      execute: jest.fn().mockRejectedValue(new Error('Erreur technique Odoo simulée (ex. timeout, 500).')),
    };
    const serviceAvecClientDefaillant = new OdooGatewayService(clientDefaillant);
    const res = await serviceAvecClientDefaillant.simulerMouvementStock({
      operationId: 'op-erreur-simulee', odooProductId: 103, quantite: 1, type: 'in',
    });
    expect(res.etat).toBe('rejected');
    expect(res.derniereErreur).toMatch(/simulée/i);
  });

  it('idempotence : même operationId + même payload → même résultat, AUCUN second mouvement', async () => {
    const cmd = { operationId: 'op-idempotent', odooProductId: 104, quantite: 3, type: 'in' as const };
    const r1 = await service.simulerMouvementStock(cmd);
    const stockApres1 = await service.lireStock(104);
    const r2 = await service.simulerMouvementStock(cmd);
    const stockApres2 = await service.lireStock(104);

    expect(r2).toEqual(r1); // même entrée de journal, même odooRecordId
    expect(stockApres2).toBe(stockApres1); // le stock n'a pas bougé une 2e fois
  });

  it('conflit : même operationId + payload différent → rejeté explicitement', async () => {
    await service.simulerMouvementStock({
      operationId: 'op-conflit', odooProductId: 105, quantite: 2, type: 'in',
    });
    await expect(
      service.simulerMouvementStock({ operationId: 'op-conflit', odooProductId: 105, quantite: 999, type: 'out' }),
    ).rejects.toThrow(/payload différent/i);
    // Le stock ne doit refléter QUE le premier mouvement (le conflit n'exécute rien).
    expect(await service.lireStock(105)).toBe(27); // 25 + 2
  });

  it("le journal expose l'historique des opérations", async () => {
    await service.simulerMouvementStock({ operationId: 'op-journal', odooProductId: 106, quantite: 1, type: 'in' });
    const entry = service.getJournal('op-journal');
    expect(entry).toBeDefined();
    expect(entry?.etat).toBe('confirmed');
    expect(service.listJournal().some((e) => e.operationId === 'op-journal')).toBe(true);
  });

  it('écrit réellement pending → syncing → confirmed (pas un état mort)', async () => {
    const original = SyncJournal.prototype.upsert;
    const etats: string[] = [];
    const spy = jest
      .spyOn(SyncJournal.prototype, 'upsert')
      .mockImplementation(function (this: SyncJournal, entry: SyncJournalEntry) {
        etats.push(entry.etat);
        return original.call(this, entry);
      });

    await service.simulerMouvementStock({
      operationId: 'op-pending-reel',
      odooProductId: 107,
      quantite: 1,
      type: 'in',
    });

    spy.mockRestore();
    expect(etats).toEqual(['pending', 'syncing', 'confirmed']);
  });

  it('écrit réellement pending → syncing → rejected quand Odoo échoue (symétrique du cas confirmed)', async () => {
    const clientDefaillant: OdooClient = { execute: jest.fn().mockRejectedValue(new Error('panne réseau')) };
    const serviceAvecClientDefaillant = new OdooGatewayService(clientDefaillant);

    const original = SyncJournal.prototype.upsert;
    const etats: string[] = [];
    const spy = jest
      .spyOn(SyncJournal.prototype, 'upsert')
      .mockImplementation(function (this: SyncJournal, entry: SyncJournalEntry) {
        etats.push(entry.etat);
        return original.call(this, entry);
      });

    await serviceAvecClientDefaillant.simulerMouvementStock({
      operationId: 'op-pending-rejete',
      odooProductId: 107,
      quantite: 1,
      type: 'in',
    });

    spy.mockRestore();
    expect(etats).toEqual(['pending', 'syncing', 'rejected']);
  });

  describe('idempotence face à des appels CONCURRENTS (même operationId)', () => {
    it('deux appels simultanés → un seul appel Odoo, un seul mouvement, un seul odooRecordId', async () => {
      const executeSpy = jest.spyOn(OdooMockClient.prototype, 'execute');
      const cmd = { operationId: 'op-concurrent', odooProductId: 104, quantite: 2, type: 'in' as const };
      const stockAvant = await service.lireStock(104);

      const [r1, r2] = await Promise.all([
        service.simulerMouvementStock(cmd),
        service.simulerMouvementStock(cmd),
      ]);

      const appelsCreation = executeSpy.mock.calls.filter(([model, method]) => model === 'stock.move' && method === 'create');
      expect(appelsCreation).toHaveLength(1); // un seul appel effectif Odoo

      expect(r1.etat).toBe('confirmed');
      expect(r2.etat).toBe('confirmed');
      expect(r1.odooRecordId).toBeDefined();
      expect(r2.odooRecordId).toBe(r1.odooRecordId); // un seul mouvement, même id

      const stockApres = await service.lireStock(104);
      expect(stockApres).toBe(stockAvant! + 2); // pas +4 : un seul mouvement a réellement muté le stock

      executeSpy.mockRestore();
    });
  });

  describe('validation stricte de la commande — fail closed', () => {
    it('rejette un operationId vide, sans écrire au journal ni appeler Odoo', async () => {
      const executeSpy = jest.spyOn(OdooMockClient.prototype, 'execute');
      await expect(
        service.simulerMouvementStock({ operationId: '', odooProductId: 101, quantite: 1, type: 'in' }),
      ).rejects.toThrow();
      expect(service.getJournal('')).toBeUndefined();
      expect(executeSpy).not.toHaveBeenCalled();
      executeSpy.mockRestore();
    });

    it('rejette un odooProductId négatif', async () => {
      await expect(
        service.simulerMouvementStock({ operationId: 'op-neg-id', odooProductId: -10, quantite: 1, type: 'in' }),
      ).rejects.toThrow();
      expect(service.getJournal('op-neg-id')).toBeUndefined();
    });

    it('rejette une quantite négative ou nulle', async () => {
      await expect(
        service.simulerMouvementStock({ operationId: 'op-neg-qte', odooProductId: 101, quantite: -500, type: 'in' }),
      ).rejects.toThrow();
      await expect(
        service.simulerMouvementStock({ operationId: 'op-zero-qte', odooProductId: 101, quantite: 0, type: 'in' }),
      ).rejects.toThrow();
    });

    it("rejette un type inconnu au lieu de le convertir silencieusement en 'in'", async () => {
      const stockAvant = await service.lireStock(101);
      await expect(
        service.simulerMouvementStock({
          operationId: 'op-type-invalide',
          odooProductId: 101,
          quantite: 1,
          // @ts-expect-error valeur volontairement invalide pour le test
          type: 'toto',
        }),
      ).rejects.toThrow();
      expect(service.getJournal('op-type-invalide')).toBeUndefined();
      expect(await service.lireStock(101)).toBe(stockAvant); // aucune mutation silencieuse
    });
  });
});
