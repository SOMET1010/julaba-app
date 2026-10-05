import {
  mouvementsDeVente,
  operationIdDeVente,
  type LigneVenteResolue,
} from '../../src/odoo-gateway/pont-vente-odoo';

/**
 * ODOO-L2 — ce qu'une vente JULABA devient pour Odoo.
 *
 * Test PUR : aucune base, aucun réseau. Ce que ce banc protège, c'est la
 * propriété qui porte l'argent — REJOUER LA MÊME VENTE NE DOIT PRODUIRE
 * AUCUN SECOND MOUVEMENT DE STOCK.
 */
describe('ODOO-L2 — mouvements de stock dérivés d’une vente', () => {
  const ligne = (odooProductId: number | null, quantite: number): LigneVenteResolue => ({
    odooProductId,
    quantite,
  });

  describe('la clé de rejeu traverse depuis la caisse', () => {
    it('dérive de l’idempotency_key de la vente, elle n’en invente pas une seconde', () => {
      const [m] = mouvementsDeVente('wa-abc-123', [ligne(42, 1)]);
      expect(m.operationId).toBe('vente-wa-abc-123-42');
      expect(m.operationId).toBe(operationIdDeVente('wa-abc-123', 42));
    });

    it('LE CŒUR DU LOT : deux appels avec la même clé donnent des commandes IDENTIQUES', () => {
      // C'est ce qui rend le rejeu inoffensif en aval : le Gateway reconnaît
      // l'operationId, retrouve l'entrée `confirmed` et n'appelle pas Odoo.
      const lignes = [ligne(42, 3), ligne(7, 1)];
      expect(mouvementsDeVente('wa-m1-msg99', lignes)).toEqual(
        mouvementsDeVente('wa-m1-msg99', lignes),
      );
    });

    it('deux ventes DIFFÉRENTES du même produit ne partagent jamais une clé', () => {
      const a = mouvementsDeVente('wa-m1-msg1', [ligne(42, 1)])[0];
      const b = mouvementsDeVente('wa-m1-msg2', [ligne(42, 1)])[0];
      expect(a.operationId).not.toBe(b.operationId);
    });
  });

  describe('une vente à plusieurs lignes', () => {
    it('produit un mouvement par produit, chacun avec sa propre clé', () => {
      const m = mouvementsDeVente('k', [ligne(42, 2), ligne(7, 5)]);
      expect(m).toHaveLength(2);
      expect(new Set(m.map((x) => x.operationId)).size).toBe(2);
    });

    it('FUSIONNE deux lignes du même produit — une seule clé, une seule quantité', () => {
      // Sans fusion, les deux porteraient la MÊME clé : le Gateway verrait la
      // seconde comme un rejeu et jetterait silencieusement sa quantité.
      const m = mouvementsDeVente('k', [ligne(42, 2), ligne(42, 3)]);
      expect(m).toHaveLength(1);
      expect(m[0].quantite).toBe(5);
    });

    it('l’ordre des lignes dans le panier ne change pas le résultat', () => {
      const a = mouvementsDeVente('k', [ligne(7, 1), ligne(42, 2)]);
      const b = mouvementsDeVente('k', [ligne(42, 2), ligne(7, 1)]);
      expect(a).toEqual(b);
    });
  });

  describe('ce qui ne se résout pas ne s’envoie pas', () => {
    it('une ligne sans identifiant Odoo est ignorée, pas devinée', () => {
      // Cas NORMAL : vente libre, ou produit hors référentiel maître.
      expect(mouvementsDeVente('k', [ligne(null, 3)])).toEqual([]);
    });

    it('les lignes résolues passent, les autres sont laissées — aucune contamination', () => {
      const m = mouvementsDeVente('k', [ligne(null, 3), ligne(42, 1)]);
      expect(m).toHaveLength(1);
      expect(m[0].odooProductId).toBe(42);
      expect(m[0].quantite).toBe(1); // surtout PAS 4
    });

    it('SANS clé d’idempotence, on n’envoie RIEN', () => {
      // Sans clé, un rejeu est indiscernable d'une vente neuve : envoyer
      // reviendrait à accepter de décrémenter deux fois le stock.
      for (const cle of [null, undefined, '', '   ']) {
        expect(mouvementsDeVente(cle, [ligne(42, 1)])).toEqual([]);
      }
    });

    it('une vente sans ligne ne produit aucun mouvement', () => {
      expect(mouvementsDeVente('k', [])).toEqual([]);
      expect(mouvementsDeVente('k', null)).toEqual([]);
    });
  });

  describe('aucune quantité n’est inventée', () => {
    it('rejette les quantités nulles, négatives ou non finies', () => {
      for (const q of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(mouvementsDeVente('k', [ligne(42, q)])).toEqual([]);
      }
    });

    it('rejette un identifiant Odoo non entier ou non positif', () => {
      for (const id of [0, -5, 1.5]) {
        expect(mouvementsDeVente('k', [ligne(id, 1)])).toEqual([]);
      }
    });
  });

  it('une vente SORT du stock — jamais `in`', () => {
    expect(mouvementsDeVente('k', [ligne(42, 1)])[0].type).toBe('out');
  });
});
