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

  it('liste le catalogue simulé (8 articles) mappé vers le format JULABA — Tips (technique) exclu', async () => {
    // Le mock contient 9 enregistrements bruts (8 articles suivis en stock +
    // Tips, is_storable:false) : ce test prouve que le catalogue livré à
    // JULABA en compte 8, pas 9.
    const catalogue = await service.listerCatalogue();
    expect(catalogue).toHaveLength(8);
    expect(catalogue[0]).toMatchObject({
      nom: expect.any(String),
      prix: expect.any(Number),
      stock: expect.any(Number),
      odooProductId: expect.any(Number),
    });
  });

  it("exclut un produit technique (is_storable=false) — Tips n'atteint jamais le catalogue JULABA", async () => {
    const catalogue = await service.listerCatalogue();
    expect(catalogue.find((p) => p.nom === 'Tips')).toBeUndefined();
    expect(catalogue.find((p) => p.codeOdoo === 'TIPS')).toBeUndefined();
  });

  it('exige currency_id ET is_storable dans le search_read du catalogue', async () => {
    const champsDemandes: string[] = [];
    const espion: OdooClient = {
      async execute(model, method, params) {
        if (model === 'product.product' && method === 'search_read') {
          champsDemandes.push(...((params.fields as string[]) ?? []));
        }
        return [] as unknown as never;
      },
    };
    await new OdooGatewayService(espion).listerCatalogue();
    expect(champsDemandes).toContain('currency_id');
    expect(champsDemandes).toContain('list_price');
    expect(champsDemandes).toContain('is_storable');
  });

  it('un produit hors catalogue (is_storable=false) est écarté AVANT le garde-fou de devise — jamais un faux 502 sur Tips', async () => {
    // Tips n'a souvent ni prix ni devise fiables (produit purement technique) :
    // le filtre is_storable doit passer AVANT assurerDeviseJulaba, pour ne
    // jamais faire échouer le catalogue entier à cause d'un produit qu'on
    // écarte de toute façon.
    const odooAvecTipsSansDevise: OdooClient = {
      async execute(model, method) {
        if (model === 'product.product' && method === 'search_read') {
          return [
            { id: 1, name: 'Tomate', list_price: 500, qty_available: 10, currency_id: [1, 'XOF'], is_storable: true },
            // Le vrai Tips d'Odoo 19 : sale_ok VAUT true. C'est is_storable qui l'écarte.
            { id: 999, name: 'Tips', list_price: 1, qty_available: 0, currency_id: undefined, is_storable: false, sale_ok: true },
          ] as unknown as never;
        }
        return [] as unknown as never;
      },
    };
    const catalogue = await new OdooGatewayService(odooAvecTipsSansDevise).listerCatalogue();
    expect(catalogue).toHaveLength(1);
    expect(catalogue[0].nom).toBe('Tomate');
  });

  it("écarte un enregistrement sans is_storable — le silence n'autorise rien", async () => {
    // Même discipline que le garde-fou de devise. Un champ absent ne prouve
    // pas que le produit est un article : il prouve qu'on n'a pas regardé.
    // Un catalogue vide est bruyant et se voit ; un produit technique livré à
    // une marchande est silencieux et faux.
    const odooSansChamp: OdooClient = {
      async execute(model, method) {
        if (model === 'product.product' && method === 'search_read') {
          return [
            { id: 1, name: 'Tomate', list_price: 500, qty_available: 10, currency_id: [1, 'XOF'] },
          ] as unknown as never;
        }
        return [] as unknown as never;
      },
    };
    expect(await new OdooGatewayService(odooSansChamp).listerCatalogue()).toEqual([]);
  });

  it('refuse le catalogue entier en 502 si Odoo répond dans une autre devise', async () => {
    // Scénario réel : une instance Odoo de démonstration est configurée en USD.
    // Sans garde-fou, « 400.00 » deviendrait « 400 FCFA » dans le catalogue
    // JULABA, pour un produit valant environ 260 000 FCFA.
    const odooEnUsd: OdooClient = {
      async execute(model, method) {
        if (model === 'product.product' && method === 'search_read') {
          return [
            { id: 1, name: 'Hotel Accommodation', list_price: 400, qty_available: 0, currency_id: [2, 'USD'], is_storable: true },
          ] as unknown as never;
        }
        return [] as unknown as never;
      },
    };
    const serviceUsd = new OdooGatewayService(odooEnUsd);
    await expect(serviceUsd.listerCatalogue()).rejects.toMatchObject({
      status: 502,
    });
  });

  it('ne livre aucun produit partiel quand une seule ligne est dans la mauvaise devise', async () => {
    const odooMixte: OdooClient = {
      async execute(model, method) {
        if (model === 'product.product' && method === 'search_read') {
          return [
            { id: 1, name: 'Tomate', list_price: 500, qty_available: 10, currency_id: [1, 'XOF'], is_storable: true },
            { id: 2, name: 'Office Chair', list_price: 70, qty_available: 3, currency_id: [2, 'USD'], is_storable: true },
          ] as unknown as never;
        }
        return [] as unknown as never;
      },
    };
    await expect(new OdooGatewayService(odooMixte).listerCatalogue()).rejects.toThrow();
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

  // ── ODOO-L1 — L'IDEMPOTENCE SURVIT AU REDÉMARRAGE ──────────────────────────
  //
  // Le défaut que ce lot ferme, et `sync-journal.ts` l'écrivait lui-même :
  // « un redémarrage du serveur vide ce journal, et rejouer un operationId
  // après un redémarrage recréerait un nouveau mouvement ». Sur Render, un
  // redéploiement suffit.
  //
  // CE QUE CE TEST PROUVE, ET COMMENT. Un redémarrage, c'est un service qui
  // repart à neuf devant un journal qui, LUI, a survécu. On ne simule donc pas
  // le temps : on construit DEUX services successifs — deux processus — et on
  // leur donne LE MÊME journal, ce qu'une table fait par nature. Le second ne
  // doit ni rappeler Odoo, ni rebouger le stock.
  //
  // CE QU'IL NE PROUVE PAS : que Postgres tienne la contrainte. Ça, c'est le
  // rôle de la clé primaire sur `operation_id` et de SCHEMA-PILOTE, qui vérifie
  // que la table existe après le seul chemin autorisé. Ici on prouve que le
  // service LIT le journal qu'on lui donne au lieu d'un état caché — et c'est
  // exactement ce qui manquait.
  it('ODOO-L1 : rejeu APRÈS redémarrage — journal survivant, aucun second mouvement', async () => {
    const journalQuiSurvit = new SyncJournal();
    const cmd = { operationId: 'op-apres-redemarrage', odooProductId: 104, quantite: 2, type: 'in' as const };

    // Premier processus.
    const clientAvant = new OdooMockClient();
    const espionAvant = jest.spyOn(clientAvant, 'execute');
    const avantRedemarrage = new OdooGatewayService(clientAvant, journalQuiSurvit);
    const r1 = await avantRedemarrage.simulerMouvementStock(cmd);
    const mouvementsAvant = espionAvant.mock.calls.filter(([m, me]) => m === 'stock.move' && me === 'create').length;

    // Le processus meurt. Le journal, lui, est en base : il reste.
    const clientApres = new OdooMockClient();
    const espionApres = jest.spyOn(clientApres, 'execute');
    const apresRedemarrage = new OdooGatewayService(clientApres, journalQuiSurvit);
    const r2 = await apresRedemarrage.simulerMouvementStock(cmd);
    const mouvementsApres = espionApres.mock.calls.filter(([m, me]) => m === 'stock.move' && me === 'create').length;

    expect(mouvementsAvant).toBe(1);
    expect(mouvementsApres).toBe(0);              // AUCUN appel Odoo au rejeu
    expect(r2).toEqual(r1);                        // même entrée, même odooRecordId
    expect(r2.etat).toBe('confirmed');
    expect((await apresRedemarrage.listJournal()).filter((e) => e.operationId === cmd.operationId)).toHaveLength(1);
  });

  // LE MÊME SCÉNARIO SANS JOURNAL SURVIVANT — la preuve que le test ci-dessus
  // mord. Sans lui, on pourrait croire que l'idempotence vient d'ailleurs.
  // Deux services, deux journaux neufs : le mouvement part DEUX fois. C'est
  // très exactement ce qui se passait en production avant ce lot.
  it('ODOO-L1 : sans journal survivant, le rejeu recrée un mouvement — le défaut d\'origine', async () => {
    const cmd = { operationId: 'op-sans-survie', odooProductId: 104, quantite: 2, type: 'in' as const };

    const clientA = new OdooMockClient();
    const espionA = jest.spyOn(clientA, 'execute');
    await new OdooGatewayService(clientA, new SyncJournal()).simulerMouvementStock(cmd);

    const clientB = new OdooMockClient();
    const espionB = jest.spyOn(clientB, 'execute');
    await new OdooGatewayService(clientB, new SyncJournal()).simulerMouvementStock(cmd);

    const creations = (espion: jest.SpyInstance) =>
      espion.mock.calls.filter(([m, me]) => m === 'stock.move' && me === 'create').length;
    expect(creations(espionA)).toBe(1);
    expect(creations(espionB)).toBe(1); // le second mouvement — le défaut
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
    const entry = await service.getJournal('op-journal');
    expect(entry).toBeDefined();
    expect(entry?.etat).toBe('confirmed');
    expect((await service.listJournal()).some((e) => e.operationId === 'op-journal')).toBe(true);
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
      expect(await service.getJournal('')).toBeUndefined();
      expect(executeSpy).not.toHaveBeenCalled();
      executeSpy.mockRestore();
    });

    it('rejette un odooProductId négatif', async () => {
      await expect(
        service.simulerMouvementStock({ operationId: 'op-neg-id', odooProductId: -10, quantite: 1, type: 'in' }),
      ).rejects.toThrow();
      expect(await service.getJournal('op-neg-id')).toBeUndefined();
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
      expect(await service.getJournal('op-type-invalide')).toBeUndefined();
      expect(await service.lireStock(101)).toBe(stockAvant); // aucune mutation silencieuse
    });
  });
});
