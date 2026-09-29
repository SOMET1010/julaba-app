/**
 * UNE ALERTE DE STOCK SE RELIT AU STOCK D'AUJOURD'HUI — 25/09/2026.
 *
 * LE DÉFAUT, vu par l'agent de test : « Stock bas pour gombo : il te reste
 * 1 tas » affiché alors qu'il y en avait 24. Et la notification revenait sur
 * chaque écran.
 *
 * Le chiffre n'était pas faux : il était VRAI HIER. Le serveur fige le texte
 * au moment où il crée la notification (`Il te reste ${quantite} ...`), et
 * l'écran le réaffiche tel quel des jours plus tard. Une information d'argent
 * et de stock qui se périme dans une chaîne de caractères.
 *
 * ARBITRAGE DE PATRICK, 25/09 : « la recalculer à l'affichage. La notification
 * garde seulement l'identifiant du produit et le type d'alerte. Le texte est
 * construit au moment de l'affichage, à partir du stock actuel. Si le stock
 * est remonté au-dessus du seuil, la notification se ferme toute seule. »
 *
 * Il a écarté l'autre voie — retirer le chiffre du message — parce que la
 * marchande perdrait l'information utile : combien il lui reste.
 *
 * FONCTION PURE : mêmes entrées, mêmes sorties, aucun accès au monde
 * extérieur. On la met à l'épreuve avec une table, pas avec un téléphone.
 */

/** Ce que la notification a retenu — l'identité du produit, pas son état. */
export interface AlerteStockMemo {
  /** `metadata.reference` : l'identifiant du produit visé. */
  reference?: unknown;
  /** `metadata.produit` : son nom au moment de l'alerte, pour le repli. */
  produit?: unknown;
}

/** Ce que l'étal dit AUJOURD'HUI. */
export interface ProduitVivant {
  id: string;
  nom: string;
  /**
   * STK-04 — LE STOCK PEUT ÊTRE INCONNU, ET CE N'EST PAS ZÉRO.
   *
   * Arbitrage de Patrick, 29/09 : « je ne laisserais pas 0 signifier à la fois
   * "zéro produit" et "quantité inconnue". C'est une ambiguïté métier qui
   * finira par contaminer alertes, inventaire et argent. »
   *
   * Le parcours d'ajout ne réclame pas la quantité (STK-03 §2) : un produit
   * entrait donc dans l'étal à 0, et l'alerte criait « Plus de X ! » sur un
   * produit qu'elle venait de poser et dont elle a peut-être un plein sac.
   *
   * `null` = ELLE NE L'A JAMAIS DIT. C'est la même forme que partout ailleurs
   * dans ce dépôt : une valeur absente ne se lit pas, elle ne se remplace pas
   * par un zéro (voir `etatCaisseAccueil`, `perteSemantique`).
   */
  stock: number | null;
  unite?: string | null;
  seuilAlerte?: number | null;
}

const SEUIL_PAR_DEFAUT = 10;
const texte = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

/**
 * Le message à AFFICHER, ou `null` si l'alerte n'a plus lieu d'être.
 *
 * `null` veut dire « ferme-la » : le stock est repassé au-dessus du seuil, ou
 * le produit n'existe plus. On ne montre jamais un chiffre qu'on n'a pas
 * revérifié.
 */
export function messageAlerteStock(
  memo: AlerteStockMemo,
  produits: readonly ProduitVivant[],
): string | null {
  const ref = texte(memo.reference);
  const nom = texte(memo.produit);

  // L'identifiant d'abord — c'est la seule désignation qui ne confond pas deux
  // produits homonymes. Le nom reste le repli pour les alertes anciennes.
  const p = (ref ? produits.find((x) => x.id === ref) : undefined)
    ?? (nom ? produits.find((x) => x.nom.toLowerCase().trim() === nom.toLowerCase().trim()) : undefined);

  // Produit supprimé ou introuvable : l'alerte ne veut plus rien dire.
  if (!p) return null;

  // STK-04 — ON NE CRIE PAS RUPTURE SUR UN STOCK QU'ELLE N'A JAMAIS DONNÉ.
  // C'est le premier des deux sens du zéro, et le seul qu'on puisse fermer
  // ici : « inconnu » se tait. « zéro » continue de parler, parce qu'un vrai
  // zéro est une information — elle a tout vendu, et elle doit le savoir.
  if (p.stock == null) return null;

  const stock = Number(p.stock);
  if (!Number.isFinite(stock)) return null;

  const seuil = Number(p.seuilAlerte);
  const limite = Number.isFinite(seuil) && seuil > 0 ? seuil : SEUIL_PAR_DEFAUT;

  // LE STOCK EST REMONTÉ : elle a réapprovisionné. L'alerte se ferme d'elle-même.
  if (stock > limite) return null;

  if (stock <= 0) return `Plus de ${p.nom} !`;

  // L'unité de l'étal, jamais une unité inventée : « 3 tas de gombo ».
  const unite = texte(p.unite);
  const quantite = Number.isInteger(stock) ? String(stock) : String(stock);
  return unite
    ? `Il te reste ${quantite} ${unite} de ${p.nom}.`
    : `Il te reste ${quantite} de ${p.nom}.`;
}
