import { StocksRestController } from '../../src/stocks-rest/stocks-rest.controller';

describe('StocksRestController — idempotence', () => {
  const user = { id: 'marchand-1', role: 'marchand' } as any;

  it('n’applique qu’une fois un PATCH de stock portant la même clé', async () => {
    const manager: { query: jest.Mock } = { query: jest.fn() };
    const rootManager = {
      transaction: jest.fn(async (callback: (tx: typeof manager) => Promise<unknown>) => callback(manager)),
      query: jest.fn(),
    };
    const controller = new StocksRestController({ manager: rootManager } as any);

    // STK-04 (20/10/2026) : depuis que le réassort est un ACHAT tracé dans le
    // ledger, l'exécution d'un PATCH marchand lit l'ancien stock SOUS VERROU
    // (`SELECT … FOR UPDATE`) AVANT l'UPDATE. Le premier passage porte donc
    // TROIS requêtes dans la transaction : INSERT d'idempotence, lecture
    // verrouillée, UPDATE. Le stock mocké (12 → 12) donne delta 0 : pas de
    // ligne d'achat inventée, ce test reste focalisé sur l'idempotence — le
    // mouvement d'achat lui-même est couvert par l'invariant stk-04.
    manager.query
      .mockResolvedValueOnce([{ idempotency_key: 'stock-op-1' }])
      .mockResolvedValueOnce([{ nom: 'Piment', stock: 12, unite: 'kg' }])
      .mockResolvedValueOnce([]);
    const first = await controller.update('stock-1', { quantite: 12, idempotency_key: 'stock-op-1' }, user);
    expect(first).toEqual({ success: true, replayed: false });
    expect(manager.query).toHaveBeenCalledTimes(3);

    // Rejeu avec la MÊME clé : l'INSERT en conflit ne retourne rien, la
    // transaction s'arrête AVANT toute écriture — ni lecture verrouillée,
    // ni UPDATE. Le compteur repart de zéro (mockReset) : exactement UN
    // appel, celui de l'INSERT.
    manager.query.mockReset().mockResolvedValueOnce([]);
    const replay = await controller.update('stock-1', { quantite: 12, idempotency_key: 'stock-op-1' }, user);
    expect(replay).toEqual({ success: true, replayed: true });
    expect(manager.query).toHaveBeenCalledTimes(1);
  });
});
