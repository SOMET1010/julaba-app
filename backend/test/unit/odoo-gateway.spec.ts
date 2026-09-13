import { OdooGatewayService } from '../../src/odoo-gateway/odoo-gateway.service';
import { OdooMockClient } from '../../src/odoo-gateway/odoo-mock.client';

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

  it('erreur Odoo simulée : rejetée avec le message technique', async () => {
    const res = await service.simulerMouvementStock({
      operationId: 'op-erreur-simulee', odooProductId: 103, quantite: 1, type: 'in', simulerErreur: true,
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
});
