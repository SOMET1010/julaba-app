import {
  SQL_ECARTS_STOCK_LEDGER,
  SQL_MOUVEMENTS_AMBIGUS,
  verdictReconciliation,
} from '../../src/stocks-rest/reconciliation-stock';

/**
 * Verdict de réconciliation — test PUR (aucune base).
 *
 * Le cœur est la règle de préséance : un ledger dont l'ordre n'est pas
 * déterminable ne prouve RIEN. Annoncer « réconcilié » dans ce cas serait
 * précisément le silence que ce lot supprime.
 */
describe('verdictReconciliation', () => {
  it('aucun écart, aucune ambiguïté → réconcilié', () => {
    expect(verdictReconciliation({ ecarts: [], ambigus: [] })).toBe('reconcilie');
  });

  it('un écart → ecart', () => {
    expect(verdictReconciliation({ ecarts: [{}], ambigus: [] })).toBe('ecart');
  });

  it("l'ambiguïté l'emporte sur l'absence d'écart — on ne rassure pas à tort", () => {
    expect(verdictReconciliation({ ecarts: [], ambigus: [{}] })).toBe('indetermine');
  });

  it("l'ambiguïté l'emporte aussi sur un écart constaté", () => {
    // Avec un ordre indéterminable, l'écart CHIFFRÉ n'est pas fiable non plus :
    // on ne peut pas affirmer de combien ça diverge.
    expect(verdictReconciliation({ ecarts: [{}], ambigus: [{}] })).toBe('indetermine');
  });
});

describe('requêtes de réconciliation — lecture seule', () => {
  it('aucune écriture : ni UPDATE, ni INSERT, ni DELETE, ni TRUNCATE', () => {
    for (const sql of [SQL_ECARTS_STOCK_LEDGER, SQL_MOUVEMENTS_AMBIGUS]) {
      expect(sql).not.toMatch(/\b(update|insert|delete|truncate|drop|alter)\b/i);
    }
  });

  it('compare bien le cache au ledger, et non le ledger à lui-même', () => {
    expect(SQL_ECARTS_STOCK_LEDGER).toContain('stock_mouvements');
    expect(SQL_ECARTS_STOCK_LEDGER).toContain('JOIN produits');
    // La formule du stock attendu, celle qui porte tout l'invariant.
    expect(SQL_ECARTS_STOCK_LEDGER).toContain('stock_avant - quantite_retranchee');
  });

  it("l'ordre du dernier mouvement est départagé, jamais laissé au hasard", () => {
    expect(SQL_ECARTS_STOCK_LEDGER).toContain('ORDER BY produit_id, created_at DESC, id DESC');
  });
});
