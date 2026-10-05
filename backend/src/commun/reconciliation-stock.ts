/**
 * CE QU'UNE LIGNE VENDUE FAIT AU STOCK — ARG-18, 27/09/2026.
 *
 * LE CONSTAT, reformulé après l'audit du 27/09 (JUL-ARCH-05). Le défaut
 * n'était pas le `continue` de `caisse-rest.controller.ts` : celui-là est
 * documenté, et sauter le stock d'un article libre est le bon comportement.
 * Le défaut est plus large, et il est de la famille que ce dépôt combat :
 *
 *     une vente peut être ACCEPTÉE alors qu'aucun produit n'a été retrouvé
 *     pour le mouvement de stock, et cette non-réconciliation ne laisse
 *     AUCUNE trace.
 *
 * L'ASYMÉTRIE QUI LE PROUVE. Le cas voisin — stock insuffisant — écrit une
 * ligne avec son `manquant`. Le registre sait donc déjà dire « il en manquait
 * 3 ». Il ne savait pas dire « ce produit-là, je ne l'ai pas trouvé ».
 * L'argent est juste, le stock diverge, et rien ne l'écrit : c'est exactement
 * le système qui a l'air de marcher.
 *
 * DEUX SILENCES, ET ILS NE SE VALENT PAS. `identifiantProduit` (ARG-16) a
 * déjà fait le tri :
 *
 *   · aucun identifiant visé → article libre, ou produit dicté non apparié.
 *     ATTENDU. Mais c'est quand même un mouvement qui n'a pas eu lieu, et le
 *     registre doit pouvoir le relire.
 *   · un UUID valide, mais introuvable → on visait un produit précis et il
 *     n'est pas là : supprimé, désactivé, ou d'une autre marchande. ANOMALIE.
 *
 * Les confondre les rendrait illisibles : les ventes libres sont nombreuses
 * et normales, l'anomalie s'y noierait et plus personne ne relirait rien.
 *
 * CE QUE CETTE RÈGLE NE FAIT PAS — c'est la moitié de la décision (arbitrage
 * de Patrick, 27/09) : elle ne bloque pas la vente, ne fabrique aucun stock,
 * ne retombe jamais en silence sur un autre produit. Le résultat financier est
 * rigoureusement inchangé. Elle DÉCRIT ce qui s'est passé, rien de plus, et
 * elle ne lève jamais.
 *
 * POURQUOI ICI ET PAS DANS LE CONTRÔLEUR. C'est une règle : elle se teste sans
 * base, sans transaction et sans HTTP. Même mouvement que
 * `identifiant-produit`, `journee-ouverte` et `stock-restitution`.
 */

/** Mouvement ordinaire : un produit du catalogue a été retrouvé. */
export const TYPE_VENTE = 'vente';
/** ANOMALIE : un identifiant de catalogue était visé, et il est introuvable. */
export const TYPE_NON_RECONCILIE = 'non_reconcilie';
/** Attendu : aucun produit de catalogue n'était visé (article libre, dictée). */
export const TYPE_SANS_CATALOGUE = 'sans_catalogue';

export interface LigneVendue {
  readonly nom: string;
  readonly qte: number;
  /** Déjà passé par `identifiantProduit` : un UUID, ou `null`. */
  readonly id: string | null;
}

export interface ProduitTrouve {
  readonly id: string;
  readonly stock: number;
  readonly unite: string | null;
}

export interface MouvementDeStock {
  readonly type: string;
  readonly produitId: string | null;
  readonly produitNom: string;
  readonly stockAvant: number;
  readonly quantiteDemandee: number;
  readonly quantiteRetranchee: number;
  readonly manquant: number;
  /** L'unité FIGÉE au moment du mouvement, jamais relue du catalogue ensuite. */
  readonly unite: string | null;
  /**
   * Ce qu'il faut écrire dans `produits.stock`, ou `null` quand il n'y a rien
   * à écrire. `null` est la garantie qu'aucun stock n'est fabriqué : le
   * contrôleur n'a pas à le redécider.
   */
  readonly stockApres: number | null;
}

const nombre = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function mouvementDeLigne(
  ligne: LigneVendue,
  produit: ProduitTrouve | null,
): MouvementDeStock {
  const demandee = nombre(ligne.qte);
  const nom = String(ligne.nom ?? '');

  if (!produit) {
    // RIEN N'A ÉTÉ RETRANCHÉ, DONC TOUT MANQUE. C'est la seule écriture
    // honnête : dire 0 manquant laisserait croire que le compte est bon.
    return {
      // L'identifiant VISÉ distingue les deux silences. C'est lui qui fait la
      // différence entre « elle a vendu autre chose » et « ce produit a
      // disparu du catalogue pendant qu'elle vendait ».
      type: ligne.id ? TYPE_NON_RECONCILIE : TYPE_SANS_CATALOGUE,
      // On conserve ce qu'on visait : sans lui, la trace ne sert à rien.
      produitId: ligne.id,
      produitNom: nom,
      stockAvant: 0,
      quantiteDemandee: demandee,
      quantiteRetranchee: 0,
      manquant: demandee,
      // Aucun produit, donc aucune unité de catalogue. On ne l'invente pas —
      // c'est la règle de l'unité figée, prise par l'autre bout.
      unite: null,
      // `null` : le contrôleur n'écrit RIEN dans `produits`.
      stockApres: null,
    };
  }

  const stockAvant = nombre(produit.stock);
  // Le stock ne descend jamais sous zéro (I3), et un stock déjà négatif n'est
  // pas aggravé : on retranche ce qu'on peut, on écrit ce qui manque.
  const retranchee = Math.min(demandee, Math.max(0, stockAvant));
  return {
    type: TYPE_VENTE,
    produitId: produit.id,
    produitNom: nom,
    stockAvant,
    quantiteDemandee: demandee,
    quantiteRetranchee: retranchee,
    manquant: demandee - retranchee,
    unite: produit.unite ?? null,
    stockApres: stockAvant - retranchee,
  };
}
