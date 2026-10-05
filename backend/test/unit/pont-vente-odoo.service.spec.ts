import { PontVenteOdooService } from '../../src/odoo-gateway/pont-vente-odoo.service';
import { OdooGatewayService } from '../../src/odoo-gateway/odoo-gateway.service';
import { OdooMockClient } from '../../src/odoo-gateway/odoo-mock.client';
import { SyncJournalMemoire } from '../../src/odoo-gateway/sync-journal';
import type { DataSource } from 'typeorm';

/**
 * ODOO-L2 — une vente rejouée ne décrémente pas le stock Odoo deux fois.
 *
 * Test SANS BASE : `DataSource.query` est remplacé par une fonction qui rend
 * la correspondance produit → Odoo. Ce qui est prouvé ici n'est pas le SQL,
 * c'est la PROPRIÉTÉ qui porte l'argent — et elle traverse le vrai Gateway,
 * le vrai journal et le vrai mock Odoo, pas des doublures.
 */
describe('ODOO-L2 — le pont vente → Odoo', () => {
  const PRODUIT_JULABA = 'p-piment';
  const ODOO_ID = 104; // Piment, 25 en stock dans le mock

  /** Une base qui sait relier `p-piment` à l'article Odoo 104. */
  const baseQuiResout = (appels: string[] = []): DataSource =>
    ({
      query: async (sql: string, params: unknown[]) => {
        appels.push(sql);
        const ids = (params?.[0] as string[]) ?? [];
        return ids.includes(PRODUIT_JULABA)
          ? [{ id: PRODUIT_JULABA, odoo_product_id: ODOO_ID }]
          : [];
      },
    }) as unknown as DataSource;

  /** Un Gateway réel, dont le journal SURVIT entre deux instanciations —
   *  c'est ce que la table `odoo_sync_journal` fait depuis ODOO-L1. */
  const gatewayAvecJournalPartage = (journal: SyncJournalMemoire, client = new OdooMockClient()) =>
    ({ gateway: new OdooGatewayService(client, journal), client });

  const vente = { id: PRODUIT_JULABA, qte: 2 };

  beforeEach(() => { process.env.ODOO_PONT_VENTE_ENABLED = 'true'; });
  afterEach(() => { delete process.env.ODOO_PONT_VENTE_ENABLED; });

  it('LE CŒUR DU LOT : même idempotency_key rejouée → UN seul mouvement Odoo', async () => {
    const journal = new SyncJournalMemoire();
    const { gateway, client } = gatewayAvecJournalPartage(journal);
    const espion = jest.spyOn(client, 'execute');
    const pont = new PontVenteOdooService(baseQuiResout(), gateway);

    const appel = { idempotencyKey: 'wa-m1-msg42', lignes: [vente], marchandId: 'm1' };
    await pont.suivreVente(appel);
    const stockApres1 = await gateway.lireStock(ODOO_ID);

    await pont.suivreVente(appel); // le rejeu
    const stockApres2 = await gateway.lireStock(ODOO_ID);

    const creations = espion.mock.calls.filter(([m, me]) => m === 'stock.move' && me === 'create');
    expect(creations).toHaveLength(1);
    expect(stockApres2).toBe(stockApres1);
    expect(await gateway.listJournal()).toHaveLength(1);
  });

  it('le rejeu survit à un REDÉMARRAGE — nouveau service, journal persisté', async () => {
    const journal = new SyncJournalMemoire(); // la table, qui survit
    const appel = { idempotencyKey: 'wa-m1-msg43', lignes: [vente], marchandId: 'm1' };

    const avant = gatewayAvecJournalPartage(journal);
    const espionAvant = jest.spyOn(avant.client, 'execute');
    await new PontVenteOdooService(baseQuiResout(), avant.gateway).suivreVente(appel);

    const apres = gatewayAvecJournalPartage(journal);
    const espionApres = jest.spyOn(apres.client, 'execute');
    await new PontVenteOdooService(baseQuiResout(), apres.gateway).suivreVente(appel);

    const creations = (e: jest.SpyInstance) =>
      e.mock.calls.filter(([m, me]) => m === 'stock.move' && me === 'create').length;
    expect(creations(espionAvant)).toBe(1);
    expect(creations(espionApres)).toBe(0);
  });

  it('une vente part bien en SORTIE de stock, du bon produit, de la bonne quantité', async () => {
    const { gateway, client } = gatewayAvecJournalPartage(new SyncJournalMemoire());
    const espion = jest.spyOn(client, 'execute');
    const avant = await gateway.lireStock(ODOO_ID);

    await new PontVenteOdooService(baseQuiResout(), gateway).suivreVente({
      idempotencyKey: 'wa-m1-msg44', lignes: [{ id: PRODUIT_JULABA, qte: 3 }], marchandId: 'm1',
    });

    const [, , params] = espion.mock.calls.find(([m, me]) => m === 'stock.move' && me === 'create')!;
    expect(params).toMatchObject({ product_id: ODOO_ID, product_qty: 3, type: 'out' });
    expect(await gateway.lireStock(ODOO_ID)).toBe((avant as number) - 3);
  });

  describe('le pont est muet quand il doit l’être', () => {
    it('FLAG ABSENT : aucune requête, aucun appel Odoo', async () => {
      delete process.env.ODOO_PONT_VENTE_ENABLED;
      const { gateway, client } = gatewayAvecJournalPartage(new SyncJournalMemoire());
      const espion = jest.spyOn(client, 'execute');
      const requetes: string[] = [];

      await new PontVenteOdooService(baseQuiResout(requetes), gateway).suivreVente({
        idempotencyKey: 'k', lignes: [vente], marchandId: 'm1',
      });

      expect(requetes).toHaveLength(0); // il ne touche même pas la base
      expect(espion).not.toHaveBeenCalled();
    });

    it('produit hors référentiel : rien n’est envoyé, et rien n’est deviné', async () => {
      const { gateway, client } = gatewayAvecJournalPartage(new SyncJournalMemoire());
      const espion = jest.spyOn(client, 'execute');
      await new PontVenteOdooService(baseQuiResout(), gateway).suivreVente({
        idempotencyKey: 'k', lignes: [{ id: 'p-inconnu', qte: 1 }], marchandId: 'm1',
      });
      expect(espion).not.toHaveBeenCalled();
    });

    it('sans Gateway (déploiement sans Odoo), le pont ne fait rien et ne lève rien', async () => {
      const requetes: string[] = [];
      await expect(
        new PontVenteOdooService(baseQuiResout(requetes)).suivreVente({
          idempotencyKey: 'k', lignes: [vente], marchandId: 'm1',
        }),
      ).resolves.toBeUndefined();
      expect(requetes).toHaveLength(0);
    });
  });

  it('UNE PANNE ODOO NE FAIT PAS ÉCHOUER LA VENTE — elle est déjà enregistrée', async () => {
    const clientEnPanne = { execute: jest.fn().mockRejectedValue(new Error('Odoo injoignable')) };
    const gateway = new OdooGatewayService(clientEnPanne, new SyncJournalMemoire());
    await expect(
      new PontVenteOdooService(baseQuiResout(), gateway).suivreVente({
        idempotencyKey: 'k', lignes: [vente], marchandId: 'm1',
      }),
    ).resolves.toBeUndefined(); // AUCUNE exception ne remonte
  });

  it('la base est interrogée avec le marchand — jamais le stock d’une autre', async () => {
    let parametres: unknown[] = [];
    const base = {
      query: async (_sql: string, params: unknown[]) => { parametres = params; return []; },
    } as unknown as DataSource;
    const { gateway } = gatewayAvecJournalPartage(new SyncJournalMemoire());

    await new PontVenteOdooService(base, gateway).suivreVente({
      idempotencyKey: 'k', lignes: [vente], marchandId: 'marchande-1',
    });
    expect(parametres[1]).toBe('marchande-1');
  });
});
