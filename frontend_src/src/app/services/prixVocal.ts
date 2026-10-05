/**
 * QUEL PRIX RETENIR POUR UNE VENTE DICTÉE — fonction PURE, décidable seule.
 *
 * POURQUOI CE MODULE EXISTE. Le prix d'une vente vocale se décidait jusqu'ici
 * implicitement, éparpillé entre trois fichiers qui ne partagent pas les mêmes
 * connaissances : `extraction.ts` ne connaît pas le catalogue, `localIntent.ts`
 * décidait qu'une vente sans montant n'existait pas, et `vendreVocalUnifie.ts`
 * découvrait le vrai catalogue trop tard. Le résultat, sur le terrain : Patrick
 * dit « un tas de piment », il ne se passe RIEN.
 *
 * Ici, une seule fonction répond à une seule question — « quel prix, et si je
 * ne peux pas, pourquoi ? » — et elle le dit explicitement. LE SILENCE N'EST
 * PLUS UN ÉTAT MÉTIER : chaque cas a un nom, donc une réponse de Tata.
 *
 * TROIS RÈGLES QUI PORTENT SUR SON ARGENT :
 *
 * 1. LE MONTANT DICTÉ GAGNE TOUJOURS. Une marchande négocie ; « trois tas, je
 *    te fais 1 300 » vaut 1 300, quel que soit le prix enregistré. La promotion
 *    est alors neutralisée, comme sur le chemin tactile.
 *
 * 1bis. MAIS UN MONTANT DICTÉ N'EST PAS FORCÉMENT UN TOTAL — correctif du
 *    21/09/2026, et c'était de l'argent perdu en silence. Ce module traitait
 *    TOUT montant dicté comme le total de la vente. « Trois tas de tomates à
 *    500 », catalogue à 500 le tas, entrait au panier pour 500 F : le TIERS de
 *    la vente, avec un prix unitaire de 167 F que personne n'avait dit. Or
 *    annoncer son prix À L'UNITÉ est la façon normale de parler au marché.
 *    La règle qui tranche existait déjà, pure et testée, et servait déjà la
 *    saisie guidée : `resoudrePrix` (ligneProvisoire.ts, SPEC §5). Elle n'était
 *    simplement pas branchée sur la voix. Ce module ne la réécrit pas — il la
 *    RELIE, en lui fournissant ce que lui seul connaît : ce que la GRAMMAIRE a
 *    entendu, et le prix effectif du catalogue pour l'unité prononcée.
 *
 * 1ter. CE QUI RESTE AMBIGU NE SE DEVINE PAS — tranché par Patrick le
 *    21/09/2026. Une version intermédiaire de ce module choisissait, dans le
 *    doute, la lecture qui « ne sous-compte jamais ». C'était encore une
 *    devinette, et une devinette sur son argent : elle a été RETIRÉE, pas
 *    déplacée. L'ordre est désormais : la grammaire (« à » / « pour » / la
 *    négociation), puis le catalogue, puis la quantité 1 — et si rien ne
 *    départage, AUCUNE écriture : on demande (`ambiguite_prix`). Le silence
 *    n'est toujours pas un état métier ; l'invention non plus.
 *
 * 2. SANS MONTANT DICTÉ, ON N'UTILISE LE CATALOGUE QUE SI L'UNITÉ CONCORDE.
 *    Relevé par Patrick : si elle dit « un TAS de piment » et que son catalogue
 *    dit « Piment, 500 F le KILO », reprendre 500 F serait faux. Une unité
 *    prononcée qui ne correspond pas à celle du produit n'est pas un détail de
 *    présentation : c'est un prix différent. Dans le doute, on demande.
 *
 * Et le prix retenu passe par `prixEffectif`, la MÊME fonction que
 * `CaisseContext.addToCart`. Sans cela, une promotion s'appliquerait au doigt
 * et pas à la voix : deux caisses dans une seule application.
 */
import { prixEffectif, type AvecPromo } from '../utils/promo.utils';
import { resoudrePrix } from './ligneProvisoire';

/** Ce qu'on sait d'un produit pour en tirer un prix. */
export interface ProduitTarifable extends AvecPromo {
  nom: string;
  unite?: string;
}

/**
 * Comment le montant dicté a été LU. « 500 » sur trois tas peut être le prix
 * d'un tas (unitaire) ou celui des trois (total) — deux ventes qui diffèrent
 * du triple. Ce champ dit laquelle a été retenue, pour qu'on puisse l'expliquer.
 */
export type LecturePrix = 'unitaire' | 'total';

export type ResolutionPrix =
  /** Prix trouvé. `origine` dit d'où il vient — utile pour l'expliquer. */
  | { type: 'prix'; total: number; unitaire: number; lecture: LecturePrix; origine: 'dicte' | 'catalogue' }
  /** Produit connu, mais aucun prix utilisable : il faut le demander. */
  | { type: 'prix_manquant'; nom: string }
  /** L'unité prononcée n'est pas celle du produit : un autre prix, donc on demande. */
  | { type: 'unite_incompatible'; nom: string; uniteParlee: string; uniteCatalogue: string }
  /**
   * Un montant a bien été dicté, mais RIEN ne dit s'il vaut pour un ou pour
   * tous — ni sa phrase, ni son catalogue — et la quantité est supérieure à 1.
   * On ne tranche pas : on lui pose la question. Aucune ligne, aucun franc.
   */
  | { type: 'ambiguite_prix'; nom: string; montant: number; quantite: number };

/**
 * Unités que l'on considère comme UNE MÊME chose. Volontairement étroit : on
 * n'assimile que des variantes d'écriture ou de nombre du même mot, jamais deux
 * mesures différentes. « kilo » n'est pas « tas », et ne le sera jamais ici.
 */
const MEMES_UNITES: string[][] = [
  ['kg', 'kilo', 'kilos', 'kilogramme', 'kilogrammes'],
  ['tas'],
  ['sac', 'sacs'],
  ['piece', 'pièce', 'pieces', 'pièces', 'unite', 'unité', 'unites', 'unités'],
  ['regime', 'régime', 'regimes', 'régimes'],
  ['litre', 'litres', 'l'],
  ['portion', 'portions'],
  ['botte', 'bottes'],
  ['paquet', 'paquets'],
  ['carton', 'cartons'],
  ['bidon', 'bidons'],
  ['sachet', 'sachets'],
  ['boite', 'boîte', 'boites', 'boîtes'],
  ['panier', 'paniers'],
];

const normaliserUnite = (u: string): string =>
  u.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Deux unités désignent-elles la même mesure ? */
export function unitesCompatibles(parlee: string | null | undefined, catalogue: string | null | undefined): boolean {
  // Rien de prononcé : elle n'a pas contredit le catalogue, on lui fait confiance.
  if (!parlee) return true;
  // Produit sans unité déclarée : rien à contredire non plus.
  if (!catalogue) return true;
  const a = normaliserUnite(parlee);
  const b = normaliserUnite(catalogue);
  if (a === b) return true;
  return MEMES_UNITES.some((groupe) => {
    const g = groupe.map(normaliserUnite);
    return g.includes(a) && g.includes(b);
  });
}

export function resoudrePrixVocal(args: {
  /** Montant prononcé par la marchande, s'il y en a un. PAS forcément un
   *  total : « à 500 » sur trois tas est un prix À L'UNITÉ. C'est
   *  `resoudrePrix` qui tranche, pas l'appelant — et l'appeler « total » ici
   *  est précisément l'erreur qui comptait ses ventes au tiers. */
  montantDicte?: number | null;
  quantite: number;
  /** Produit du catalogue, ou null s'il n'a pas été apparié. */
  produit?: ProduitTarifable | null;
  /** Unité prononcée (« tas », « kilos »…), ou null. */
  uniteParlee?: string | null;
  /** Nom prononcé — sert à nommer le produit quand il est inconnu. */
  nomParle?: string;
  /**
   * CE QUE LA GRAMMAIRE A ENTENDU — « à » (unitaire), « pour » ou une
   * tournure de négociation (total), ou `null` si la phrase ne tranche pas.
   * Vient de `extraction.lecturePrix` et rien d'autre : ce module ne relit
   * jamais la phrase, et n'infère jamais ce marqueur.
   */
  lectureDictee?: 'unitaire' | 'total' | null;
}): ResolutionPrix {
  const qte = args.quantite > 0 ? args.quantite : 1;
  const produit = args.produit;
  const nom = (produit?.nom || args.nomParle || '').trim();
  const uniteConcorde = unitesCompatibles(args.uniteParlee, produit?.unite);

  // La RÉFÉRENCE qui sert à lire son montant : le prix effectif du catalogue,
  // et lui seul — pas un prix d'une autre unité. Si elle dit « kilos » et que
  // le produit est au tas, ce prix-là ne dit rien de ce qu'elle vient
  // d'annoncer : on ne s'en sert pas pour trancher (voir règle 2).
  const reference = produit && uniteConcorde ? prixEffectif(produit) : 0;

  // 1. Ce qu'elle a dit gagne, toujours — mais encore faut-il savoir CE
  //    QU'ELLE A DIT. « Trois tas à 500 » n'est pas une vente de 500 F.
  //
  //    L'ORDRE EST CELUI DE LA CERTITUDE, et il s'arrête net quand elle
  //    s'épuise. `resoudrePrix` applique successivement : (1) la formulation
  //    explicite, si la grammaire en a entendu une ; (2) le catalogue, quand
  //    le montant ressemble au prix d'un ou au prix de tous ; (3) la quantité
  //    1, où les deux lectures se confondent. Rien de plus — et surtout RIEN
  //    APRÈS. Ce qui reste indécidable revient ici en `a_confirmer`, et se
  //    DEMANDE.
  const dicte = Number(args.montantDicte);
  if (Number.isFinite(dicte) && dicte > 0) {
    const lu = resoudrePrix(qte, dicte, args.lectureDictee ?? null, reference > 0 ? reference : null);
    if (lu.interpretationPrix !== 'a_confirmer' && lu.total != null && lu.prixUnitaire != null) {
      return { type: 'prix', total: lu.total, unitaire: lu.prixUnitaire, lecture: lu.interpretationPrix, origine: 'dicte' };
    }
    // UNE SEULE UNITÉ : IL N'Y A RIEN À ARBITRER. « Un tas de gombo à 500 »
    // vaut 500, que ce 500 soit le prix du tas ou celui du lot — c'est le
    // même tas. Ce n'est pas une devinette, c'est une identité ; la traiter
    // comme ambiguë ferait poser une question qui n'a pas de second terme.
    // (`resoudrePrix` ne l'applique que lorsqu'un prix catalogue existe ; ici
    // on sait aussi la reconnaître sans catalogue.)
    if (qte === 1) {
      const seule = resoudrePrix(1, dicte, 'unitaire', null);
      return { type: 'prix', total: seule.total!, unitaire: seule.prixUnitaire!, lecture: 'unitaire', origine: 'dicte' };
    }

    // NI SA PHRASE NI SON CATALOGUE NE TRANCHENT. On ne devine pas : 500 sur
    // trois tas vaut 1 500 ou 500 selon ce qu'elle voulait dire, et se
    // tromper coûte le triple. Aucune ligne n'entre au panier ; la question
    // lui est posée, sur le MÊME écran que le prix manquant.
    return { type: 'ambiguite_prix', nom, montant: dicte, quantite: qte };
  }

  if (!produit) return { type: 'prix_manquant', nom };

  // 2. L'unité doit concorder, sinon le prix n'est pas celui-là.
  if (!uniteConcorde) {
    return {
      type: 'unite_incompatible',
      nom,
      uniteParlee: String(args.uniteParlee),
      uniteCatalogue: String(produit.unite),
    };
  }

  // 3. Prix du catalogue — via prixEffectif, comme le tactile. Un prix de
  //    catalogue est un prix À L'UNITÉ : c'est la MÊME multiplication que
  //    ci-dessus, faite par la MÊME fonction.
  if (!(reference > 0)) return { type: 'prix_manquant', nom };
  const duCatalogue = resoudrePrix(qte, reference, 'unitaire', null);
  return { type: 'prix', total: duCatalogue.total!, unitaire: duCatalogue.prixUnitaire!, lecture: 'unitaire', origine: 'catalogue' };
}
