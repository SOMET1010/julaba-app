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
    expect(manager.query).toHaveBeenCalledTimes(2);

    manager.query.mockReset().mockResolvedValueOnce([]);
    const replay = await controller.update('stock-1', { quantite: 12, idempotency_key: 'stock-op-1' }, user);
    expect(replay).toEqual({ success: true, replayed: true });
    expect(manager.query).toHaveBeenCalledTimes(1);
  });
});
