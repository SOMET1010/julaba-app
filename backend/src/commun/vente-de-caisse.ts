import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * UNE VENTE DE CAISSE, UNE SEULE DÉFINITION — pour tous les chiffres
 * « transactions » et « volume » montrés à l'institution et au back-office.
 *
 * Une vente retenue est une ligne de type `vente` qui n'a pas été annulée.
 * Ni une dépense, ni une vente annulée, ni une écriture de portefeuille
 * (Keiwa, hors pilote) n'y entrent. Avant ce module, trois écrans lisaient
 * trois définitions : portefeuille seul (institution), portefeuille + ventes
 * (Rapports), toutes les lignes de caisse (Supervision). « Ne jamais donner
 * deux sens à la même donnée. »
 */
export function conditionVenteRetenue(alias: string): string {
  return `${alias}.type = 'vente' AND ${alias}.statut <> 'annulee'`;
}

/**
 * Un montant lu en base. Illisible (absent, vide, non numérique) ⇒ `null`,
 * JAMAIS 0 : `Number(x || 0)` faisait passer une donnée perdue pour « zéro
 * franc » (ACC-03).
 */
export function montantLisible(brut: unknown): number | null {
  if (brut === null || brut === undefined) return null;
  if (typeof brut === 'string' && brut.trim() === '') return null;
  const n = typeof brut === 'number' ? brut : Number(brut);
  return Number.isFinite(n) ? n : null;
}

export interface BilanVentesDeCaisse {
  nombre_ventes: number;
  /** `null` dès qu'un montant est illisible : un total partiel serait faux. */
  volume_ventes: number | null;
  montants_illisibles: number;
}

/**
 * Agrège les ventes retenues d'une requête déjà filtrée par l'appelant
 * (périmètre, dates). La requête n'est pas modifiée : on travaille sur un clone.
 */
export async function bilanVentesDeCaisse<T extends ObjectLiteral>(
  requete: SelectQueryBuilder<T>,
  alias: string,
): Promise<BilanVentesDeCaisse> {
  const brut = await requete.clone()
    .andWhere(conditionVenteRetenue(alias))
    .select(`COUNT(${alias}.id)`, 'nombre')
    .addSelect(`SUM(${alias}.montant)`, 'volume')
    .addSelect(`COUNT(${alias}.id) FILTER (WHERE ${alias}.montant IS NULL)`, 'illisibles')
    .orderBy()
    .offset(undefined).limit(undefined).skip(undefined).take(undefined)
    .getRawOne<{ nombre: string; volume: string | null; illisibles: string }>();

  const nombre = Number(brut?.nombre);
  const illisibles = Number(brut?.illisibles);
  if (!Number.isInteger(nombre) || !Number.isInteger(illisibles)) {
    throw new Error('Bilan des ventes de caisse illisible');
  }
  let volume: number | null;
  if (nombre === 0) volume = 0; // aucune vente : zéro est la vraie réponse
  else if (illisibles > 0) volume = null;
  else {
    volume = montantLisible(brut?.volume);
    if (volume === null) throw new Error('Somme des ventes de caisse illisible');
  }
  return { nombre_ventes: nombre, volume_ventes: volume, montants_illisibles: illisibles };
}
