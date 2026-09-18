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
 * DEUX RÈGLES QUI PORTENT SUR SON ARGENT :
 *
 * 1. LE MONTANT DICTÉ GAGNE TOUJOURS. Une marchande négocie ; « deux tomates
 *    pour 350 » vaut 350, quel que soit le prix enregistré. La promotion est
 *    alors neutralisée, comme sur le chemin tactile.
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

/** Ce qu'on sait d'un produit pour en tirer un prix. */
export interface ProduitTarifable extends AvecPromo {
  nom: string;
  unite?: string;
}

export type ResolutionPrix =
  /** Prix trouvé. `origine` dit d'où il vient — utile pour l'expliquer. */
  | { type: 'prix'; total: number; origine: 'dicte' | 'catalogue' }
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
  /** Total prononcé par la marchande, s'il y en a un. */
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

  // 1. Ce qu'elle a dit gagne, toujours.
  const dicte = Number(args.montantDicte);
  if (Number.isFinite(dicte) && dicte > 0) {
    return { type: 'prix', total: dicte, origine: 'dicte' };
  }

  const produit = args.produit;
  const nom = (produit?.nom || args.nomParle || '').trim();
  if (!produit) return { type: 'prix_manquant', nom };

  // 2. L'unité doit concorder, sinon le prix n'est pas celui-là.
  if (!unitesCompatibles(args.uniteParlee, produit.unite)) {
    return {
      type: 'unite_incompatible',
      nom,
      uniteParlee: String(args.uniteParlee),
      uniteCatalogue: String(produit.unite),
    };
  }

  // 3. Prix du catalogue — via prixEffectif, comme le tactile.
  const unitaire = prixEffectif(produit);
  if (!(unitaire > 0)) return { type: 'prix_manquant', nom };

  return { type: 'prix', total: unitaire * qte, origine: 'catalogue' };
}
