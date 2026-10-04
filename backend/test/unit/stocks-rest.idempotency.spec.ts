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

    manager.query
      .mockResolvedValueOnce([{ idempotency_key: 'stock-op-1' }])
      .mockResolvedValueOnce([]);
    const first = await controller.update('stock-1', { quantite: 12, idempotency_key: 'stock-op-1' }, user);
    expect(first).toEqual({ success: true, replayed: false });
    // La 1re passe ECRIT : la cle est posee, puis le stock est applique. On
    // n'affirme plus un NOMBRE d'appels — l'ajustement tracable en ajoute
    // (verrou + ledger) et compter les requetes faisait de ce test un miroir
    // de l'implementation. Ce qui compte : au moins une ecriture a eu lieu.
    expect(manager.query.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(manager.query.mock.calls[0][0]).toContain('stock_operation_idempotency');

    manager.query.mockReset().mockResolvedValueOnce([]);
    const replay = await controller.update('stock-1', { quantite: 12, idempotency_key: 'stock-op-1' }, user);
    expect(replay).toEqual({ success: true, replayed: true });
    // LE coeur de l'idempotence : au rejeu, la cle est deja la et RIEN d'autre
    // n'est execute. Ce nombre-la reste une assertion de sens.
    expect(manager.query).toHaveBeenCalledTimes(1);
  });
});
