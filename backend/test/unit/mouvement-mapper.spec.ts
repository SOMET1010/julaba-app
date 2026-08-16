import { mapLedgerRow, mapLedgerRows } from '../../src/stocks-rest/mouvement-mapper';

describe('mapLedgerRow — signe du delta de stock (vérité argent/stock)', () => {
  it('vente (retranchee > 0) => delta NÉGATIF (stock sorti)', () => {
    const m = mapLedgerRow({
      id: '1', produit_nom: 'Tomate', quantite_retranchee: 7,
      type: 'vente', created_at: '2026-08-16T10:00:00.000Z',
    });
    expect(m.quantite).toBe(-7);
    expect(m.type).toBe('vente');
    expect(m.produit_nom).toBe('Tomate');
  });

  it('annulation (retranchee < 0) => delta POSITIF (stock rentré)', () => {
    const m = mapLedgerRow({
      id: '2', produit_nom: 'Tomate', quantite_retranchee: -7,
      type: 'annulation', created_at: '2026-08-16T11:00:00.000Z',
    });
    expect(m.quantite).toBe(7);
    expect(m.type).toBe('annulation');
  });

  it('type absent => défaut "vente"', () => {
    const m = mapLedgerRow({
      id: '3', produit_nom: 'Riz', quantite_retranchee: 2,
      type: null, created_at: '2026-08-16T12:00:00.000Z',
    });
    expect(m.type).toBe('vente');
    expect(m.quantite).toBe(-2);
  });

  it('robuste aux valeurs texte / nulles et convertit la date en ISO', () => {
    const m = mapLedgerRow({
      id: '4', produit_nom: null, quantite_retranchee: '3',
      type: 'vente', created_at: new Date('2026-08-16T09:00:00.000Z'), unite: 'kg',
    });
    expect(m.quantite).toBe(-3);
    expect(m.produit_nom).toBeNull();
    expect(m.unite).toBe('kg');
    expect(m.date).toBe('2026-08-16T09:00:00.000Z');
  });

  it('quantite_retranchee null => 0 (pas de NaN)', () => {
    const m = mapLedgerRow({
      id: '5', produit_nom: 'Sucre', quantite_retranchee: null,
      type: 'vente', created_at: '2026-08-16T08:00:00.000Z',
    });
    expect(m.quantite).toBe(0);
  });

  it('mapLedgerRows mappe un lot et tolère un tableau vide', () => {
    expect(mapLedgerRows([]).length).toBe(0);
    expect(mapLedgerRows([
      { id: 'a', produit_nom: 'A', quantite_retranchee: 1, type: 'vente', created_at: '2026-08-16T00:00:00.000Z' },
      { id: 'b', produit_nom: 'B', quantite_retranchee: -1, type: 'annulation', created_at: '2026-08-16T01:00:00.000Z' },
    ]).map(m => m.quantite)).toEqual([-1, 1]);
  });
});
