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
 *    RELIE, en lui fournissant la référence que lui seul connaît : le prix
 *    effectif du catalogue, pour l'unité qu'elle a prononcée.
 *
 * 1ter. L'AMBIGUÏTÉ QUI RESTE SE TRANCHE EN SA FAVEUR. Quand le catalogue ne
 *    départage pas (produit inconnu, prix à zéro, unité qui ne concorde pas),
 *    le montant est lu comme UNITAIRE : c'est la seule lecture qui ne
 *    sous-compte jamais sa vente.
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
  | { type: 'unite_incompatible'; nom: string; uniteParlee: string; uniteCatalogue: string };

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
  const dicte = Number(args.montantDicte);
  if (Number.isFinite(dicte) && dicte > 0) {
    const lu = resoudrePrix(qte, dicte, null, reference > 0 ? reference : null);
    if (lu.interpretationPrix !== 'a_confirmer' && lu.total != null && lu.prixUnitaire != null) {
      return { type: 'prix', total: lu.total, unitaire: lu.prixUnitaire, lecture: lu.interpretationPrix, origine: 'dicte' };
    }
    // AMBIGUÏTÉ RÉSIDUELLE — `resoudrePrix` s'abstient (`a_confirmer`), et
    // ici on ne peut pas lui poser la question : la ligne doit entrer au
    // panier maintenant. Deux situations, deux réponses.
    //
    // (a) ELLE A NÉGOCIÉ, et on connaît son prix habituel. Son montant ne
    //     ressemble ni au prix d'un, ni au prix de tous — « cinq tomates,
    //     1 500 » sur un catalogue à 500, c'est une remise. On garde SON
    //     montant (le négoce prime, toujours) et on retient la lecture dont le
    //     prix unitaire reste le plus proche de celui qu'elle pratique : 300
    //     l'unité, jamais 1 500 l'unité. Sans cela, « je te fais un prix »
    //     deviendrait un sur-comptage du quintuple — l'erreur symétrique de
    //     celle qu'on corrige.
    if (reference > 0 && qte > 1) {
      const ecart = (valeur: number) => (valeur > 0 ? Math.max(valeur, reference) / Math.min(valeur, reference) : Infinity);
      if (ecart(dicte / qte) < ecart(dicte)) {
        const negocie = resoudrePrix(qte, dicte, 'total', null);
        return { type: 'prix', total: negocie.total!, unitaire: negocie.prixUnitaire!, lecture: 'total', origine: 'dicte' };
      }
    }
    // (b) LE CATALOGUE EST MUET (produit inconnu, prix à zéro, unité qui ne
    //     concorde pas) : rien ne peut départager. ON LIT LE MONTANT COMME
    //     UNITAIRE — la seule lecture qui ne SOUS-COMPTE JAMAIS sa vente
    //     (unitaire ≥ total, toujours), et la façon dont une marchande parle :
    //     « c'est 500 le tas ». Une vente sous-comptée est une perte muette ;
    //     une vente sur-comptée, la cliente la relève à voix haute.
    const secours = resoudrePrix(qte, dicte, 'unitaire', null);
    return { type: 'prix', total: secours.total!, unitaire: secours.prixUnitaire!, lecture: 'unitaire', origine: 'dicte' };
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
