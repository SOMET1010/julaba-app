/**
 * CE QU'UNE VENTE JULABA DEVIENT POUR ODOO — ODOO-L2, 05/10/2026.
 *
 * LE PONT N'EXISTAIT PAS. Vérifié avant d'écrire ce fichier : zéro occurrence
 * de « odoo » dans tout `backend/src/caisse-rest/`. La caisse et la passerelle
 * étaient deux mondes entièrement disjoints — seul `catalogue-maitre` lisait
 * le Gateway, et en lecture. Une vente enregistrée ne partait nulle part.
 *
 * CE MODULE NE PARLE À PERSONNE. Il ne lit aucune base, n'appelle aucun
 * réseau, ne connaît ni TypeORM ni NestJS. Il reçoit ce qu'une vente contient
 * et rend ce qu'il faudrait envoyer — rien de plus. C'est ce qui permet de le
 * prouver sans base, et c'est le dessin de tous les modules d'argent de ce
 * dépôt (`marge-vente.ts`, `reconciliation-stock`, `etatCaisseAccueil.ts`).
 *
 * ── TROIS DÉCISIONS, ET ELLES PORTENT TOUTES SUR L'ARGENT ────────────────
 *
 * 1. LA CLÉ DE REJEU DÉRIVE DE CELLE DE LA CAISSE, ELLE N'EN INVENTE PAS.
 *    `operationId = vente-<idempotency_key>-<produit>`. La caisse garantit
 *    déjà qu'une vente rejouée présente la MÊME `idempotency_key` (index
 *    unique `ux_caisse_tx_idempotency_key`). En dériver la clé du Gateway fait
 *    traverser cette garantie jusqu'à Odoo, au lieu d'en fabriquer une
 *    seconde qui pourrait diverger. « Sur l'argent, la preuve doit TRAVERSER. »
 *
 * 2. UNE VENTE À PLUSIEURS LIGNES DONNE PLUSIEURS MOUVEMENTS, et le suffixe
 *    est LE PRODUIT, jamais le rang de la ligne. Un rang change si l'ordre du
 *    panier change ; la référence, non. Avec un rang, le même rejeu produirait
 *    deux clés différentes — donc deux mouvements. Deux lignes du même produit
 *    sont FUSIONNÉES pour la même raison : une seule clé, une seule quantité.
 *
 * 3. CE QUI NE SE RÉSOUT PAS NE S'ENVOIE PAS. La chaîne
 *    `produits.default_code → catalogue_maitre.odoo_product_id` a DEUX
 *    maillons nullables : un produit peut naître hors référentiel (vente
 *    libre, article local), et une référence maître peut n'avoir aucun
 *    identifiant Odoo. Les deux cas sont normaux. Une ligne non résolue est
 *    donc IGNORÉE — jamais devinée, jamais rattachée au produit « le plus
 *    proche ». Le doute profite au silence, jamais à un mouvement inventé.
 *
 * CE MODULE NE DÉCIDE PAS SI LE PONT EST ACTIF : voir `ODOO_PONT_VENTE_ENABLED`
 * dans `odoo-client.config.ts`. Il ne décide pas non plus QUAND appeler — la
 * réponse est « après le commit de la vente, jamais dedans » (un appel réseau
 * dans une transaction Postgres la tient ouverte le temps du réseau, et un
 * timeout ferait échouer une vente déjà valide).
 */

/** Une ligne de vente, telle que `POST /caisse/vente` la connaît APRÈS
 *  résolution du lien vers Odoo. `odooProductId` à `null` = non résolu. */
export interface LigneVenteResolue {
  /** Identifiant Odoo du produit, ou `null` si la chaîne n'aboutit pas. */
  readonly odooProductId: number | null;
  /** Quantité vendue. Non entière ou non positive = ligne ignorée. */
  readonly quantite: number;
}

/** Ce qu'il faut demander au Gateway pour une ligne. Même forme que
 *  `MouvementStockCommand` — ce module la produit, il ne l'exécute pas. */
export interface MouvementDeVente {
  readonly operationId: string;
  readonly odooProductId: number;
  readonly quantite: number;
  /** Une vente SORT du stock. Jamais `in` : ce module ne sert qu'à la vente. */
  readonly type: 'out';
}

/**
 * La clé de rejeu d'une ligne. Publique parce qu'elle doit pouvoir être
 * relue — c'est par elle qu'on retrouve une opération dans le journal.
 */
export function operationIdDeVente(idempotencyKey: string, odooProductId: number): string {
  return `vente-${idempotencyKey}-${odooProductId}`;
}

/**
 * Ce qu'une vente doit produire comme mouvements de stock Odoo.
 *
 * Rend un tableau VIDE — et c'est une réponse, pas un échec — quand la vente
 * n'a aucune ligne résoluble, ou quand la clé d'idempotence manque. Sans clé,
 * on ne sait pas reconnaître un rejeu : envoyer quand même reviendrait à
 * accepter de décrémenter deux fois le stock d'une marchande.
 */
export function mouvementsDeVente(
  idempotencyKey: string | null | undefined,
  lignes: readonly LigneVenteResolue[] | null | undefined,
): MouvementDeVente[] {
  const cle = (idempotencyKey ?? '').trim();
  if (!cle || !lignes || lignes.length === 0) return [];

  // Fusion par produit : deux lignes du même article ne peuvent pas porter
  // deux fois la même clé de rejeu, et n'ont aucune raison de le faire.
  const parProduit = new Map<number, number>();
  for (const l of lignes) {
    const id = l.odooProductId;
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) continue;
    const q = Number(l.quantite);
    if (!Number.isFinite(q) || q <= 0) continue;
    parProduit.set(id, (parProduit.get(id) ?? 0) + q);
  }

  // Ordre stable par identifiant : deux rejeux de la même vente produisent la
  // même suite d'appels, ce qui rend les journaux comparables à l'œil.
  return [...parProduit.entries()]
    .sort(([a], [b]) => a - b)
    .map(([odooProductId, quantite]) => ({
      operationId: operationIdDeVente(cle, odooProductId),
      odooProductId,
      quantite,
      type: 'out' as const,
    }));
}
