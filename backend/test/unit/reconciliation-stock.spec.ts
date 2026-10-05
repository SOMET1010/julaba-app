/**
 * ARG-18 — UNE VENTE PEUT PARTIR SANS QUE LE STOCK BOUGE, ET IL FAUT QUE ÇA SE VOIE.
 *
 * LE CONSTAT, reformulé après l'audit du 27/09 (JUL-ARCH-05). Le défaut n'est
 * pas le `continue` de `caisse-rest.controller.ts:745` — celui-là est
 * documenté et voulu pour les articles libres. Le défaut est plus large :
 *
 *     une vente peut être ACCEPTÉE alors qu'aucun produit n'a été retrouvé
 *     pour le mouvement de stock, et cette non-réconciliation ne laisse
 *     AUCUNE trace.
 *
 * L'ASYMÉTRIE QUI LE PROUVE. Le cas voisin — stock insuffisant — écrit une
 * ligne dans `stock_mouvements` avec son `manquant`. Le registre sait donc
 * déjà dire « il en manquait 3 ». Il ne sait pas dire « ce produit-là, je ne
 * l'ai pas trouvé ». L'argent est juste, le stock diverge, et rien ne l'écrit :
 * c'est exactement le système qui a l'air de marcher.
 *
 * DEUX CAS, ET ILS NE SE VALENT PAS. `identifiantProduit` (ARG-16) a déjà
 * séparé le bon grain :
 *
 *   · `id = null`  → article libre ou produit dicté non apparié. Aucun produit
 *     de catalogue n'était visé. C'est ATTENDU, pas une anomalie — mais ça
 *     reste un mouvement qui n'a pas eu lieu, et le registre doit pouvoir le
 *     relire sans le confondre avec le suivant.
 *   · `id = <UUID valide>` mais introuvable → on visait un produit précis du
 *     catalogue et il n'est pas là : supprimé, désactivé, ou d'une autre
 *     marchande. C'est une ANOMALIE, et personne n'en était averti.
 *
 * CE QU'ON NE FAIT PAS, et c'est la moitié de la décision (arbitrage de
 * Patrick, 27/09) : on ne bloque pas la vente, on ne fabrique pas de stock, on
 * ne retombe pas en silence sur un autre produit. Le résultat financier est
 * rigoureusement inchangé. On écrit ce qui s'est passé, rien de plus.
 *
 * AUCUNE MIGRATION. `stock_mouvements` porte déjà `produit_id` nullable,
 * `produit_nom` nullable et une colonne `type` (`'vente'`, `'annulation'`).
 * La trace entre dans le registre qui existe, au lieu d'en ouvrir un second.
 */
import {
  mouvementDeLigne,
  TYPE_NON_RECONCILIE,
  TYPE_SANS_CATALOGUE,
  TYPE_VENTE,
} from '../../src/commun/reconciliation-stock';
import type { LigneVendue, ProduitTrouve } from '../../src/commun/reconciliation-stock';

describe('ARG-18 — la non-réconciliation du stock laisse une trace', () => {
  // ── 1. LE CAS NORMAL NE CHANGE PAS ───────────────────────────────────────
  it('produit trouvé, stock suffisant : comportement inchangé', () => {
    const m = mouvementDeLigne(
      { nom: 'Tomate', qte: 3, id: '11111111-1111-4111-8111-111111111111' },
      { id: '11111111-1111-4111-8111-111111111111', stock: 10, unite: 'kg' },
    );
    expect(m.type).toBe(TYPE_VENTE);
    expect(m.produitId).toBe('11111111-1111-4111-8111-111111111111');
    expect(m.stockAvant).toBe(10);
    expect(m.quantiteDemandee).toBe(3);
    expect(m.quantiteRetranchee).toBe(3);
    expect(m.manquant).toBe(0);
    expect(m.stockApres).toBe(7);
    expect(m.unite).toBe('kg');
  });

  it('produit trouvé, stock INSUFFISANT : le manquant est écrit, comme aujourd’hui', () => {
    const m = mouvementDeLigne(
      { nom: 'Tomate', qte: 5, id: '11111111-1111-4111-8111-111111111111' },
      { id: '11111111-1111-4111-8111-111111111111', stock: 2, unite: 'kg' },
    );
    expect(m.type).toBe(TYPE_VENTE);
    expect(m.quantiteRetranchee).toBe(2);
    expect(m.manquant).toBe(3);
    // Le stock est borné à 0 : on ne descend jamais en négatif (I3).
    expect(m.stockApres).toBe(0);
  });

  it('stock déjà négatif en base : rien n’est retranché, et il n’est PAS aggravé', () => {
    // CE TEST A ÉTÉ CORRIGÉ, PAS LE CODE. Il exigeait d'abord que le stock
    // soit remonté à 0 — c'était imposer un changement de comportement que
    // personne n'avait demandé, sur du stock, dans un lot dont la consigne
    // était « sans changer le résultat ». Le comportement réel est de ne rien
    // retrancher et de laisser la valeur telle quelle : on n'aggrave pas, et
    // on ne réécrit pas un inventaire au passage.
    const m = mouvementDeLigne(
      { nom: 'Tomate', qte: 2, id: '11111111-1111-4111-8111-111111111111' },
      { id: '11111111-1111-4111-8111-111111111111', stock: -4, unite: 'kg' },
    );
    expect(m.quantiteRetranchee).toBe(0);
    expect(m.manquant).toBe(2);
    expect(m.stockApres).toBe(-4);
  });

  // ── 2. LE DÉFAUT QU'ON FERME ─────────────────────────────────────────────
  it('LE DÉFAUT : un UUID valide mais introuvable est une ANOMALIE, et elle est tracée', () => {
    const m = mouvementDeLigne(
      { nom: 'Tomate', qte: 3, id: '22222222-2222-4222-8222-222222222222' },
      null, // le SELECT n'a rien rendu
    );
    expect(m.type).toBe(TYPE_NON_RECONCILIE);
    // Ce qu'on visait est conservé : c'est toute l'information de l'anomalie.
    expect(m.produitId).toBe('22222222-2222-4222-8222-222222222222');
    expect(m.produitNom).toBe('Tomate');
    expect(m.quantiteDemandee).toBe(3);
    // AUCUN STOCK FABRIQUÉ : rien n'a été retranché, tout manque.
    expect(m.quantiteRetranchee).toBe(0);
    expect(m.manquant).toBe(3);
    expect(m.stockAvant).toBe(0);
    // On n'invente pas une unité : aucun produit, donc aucune unité catalogue.
    expect(m.unite).toBeNull();
  });

  it('un article libre (aucun identifiant visé) est tracé À PART : ce n’est pas une anomalie', () => {
    const m = mouvementDeLigne({ nom: 'Autre article', qte: 1, id: null }, null);
    expect(m.type).toBe(TYPE_SANS_CATALOGUE);
    expect(m.produitId).toBeNull();
    expect(m.produitNom).toBe('Autre article');
    expect(m.quantiteRetranchee).toBe(0);
    expect(m.manquant).toBe(1);
  });

  it('les deux silences ne portent PAS le même nom — sinon on ne peut pas les lire', () => {
    // Confondus, l'anomalie se noie dans le bruit des ventes libres, qui sont
    // nombreuses et normales. Personne ne relirait plus ce registre.
    expect(TYPE_NON_RECONCILIE).not.toBe(TYPE_SANS_CATALOGUE);
    expect(TYPE_NON_RECONCILIE).not.toBe(TYPE_VENTE);
    expect(TYPE_SANS_CATALOGUE).not.toBe(TYPE_VENTE);
  });

  // ── 3. CE QUE LA DÉCISION INTERDIT ───────────────────────────────────────
  it('une ligne non réconciliée n’écrit JAMAIS de stock', () => {
    for (const ligne of [
      { nom: 'X', qte: 4, id: '33333333-3333-4333-8333-333333333333' },
      { nom: 'Y', qte: 4, id: null },
    ]) {
      const m = mouvementDeLigne(ligne, null);
      expect(m.stockApres).toBeNull(); // rien à écrire dans `produits`
      expect(m.quantiteRetranchee).toBe(0);
    }
  });

  it('la vente n’est jamais refusée : la fonction décrit, elle ne lève pas', () => {
    expect(() => mouvementDeLigne({ nom: '', qte: 0, id: null }, null)).not.toThrow();
    expect(() => mouvementDeLigne({ nom: 'X', qte: -1, id: null }, null)).not.toThrow();
  });

  it('tout mouvement, quel que soit son type, porte de quoi retrouver la vente', () => {
    // Sans ces champs, une trace ne sert à rien : on saurait qu'il y a eu une
    // anomalie sans pouvoir dire laquelle, ni chez qui.
    const cas: Array<[LigneVendue, ProduitTrouve | null]> = [
      [{ nom: 'A', qte: 1, id: '44444444-4444-4444-8444-444444444444' },
       { id: '44444444-4444-4444-8444-444444444444', stock: 5, unite: 'kg' }],
      [{ nom: 'B', qte: 1, id: '55555555-5555-4555-8555-555555555555' }, null],
      [{ nom: 'C', qte: 1, id: null }, null],
    ];
    for (const [ligne, produit] of cas) {
      const m = mouvementDeLigne(ligne, produit);
      expect(typeof m.type).toBe('string');
      expect(m.type.length).toBeGreaterThan(0);
      expect(m.produitNom).toBe(ligne.nom);
      expect(m.quantiteDemandee).toBe(1);
    }
  });
});
