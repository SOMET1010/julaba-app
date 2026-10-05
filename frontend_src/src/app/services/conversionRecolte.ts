/**
 * CONVERSION D'UNE RÉCOLTE — et surtout, CE QU'ELLE NE DOIT PLUS PERDRE.
 *
 * LE DÉFAUT. Un producteur déclare « 3 paniers de gombo ». L'écran convertit
 * en kilos avec un facteur GLOBAL (panier = 10 kg, sac = 100 kg, tas = 50 kg —
 * quel que soit le produit), puis envoie `quantite = 30` et `unite = 'kg'`.
 * La saisie réelle — 3, « panier » — n'est enregistrée NULLE PART. Le poids,
 * lui, est inventé : un panier de gombo et un panier d'igname ne pèsent pas
 * pareil, et rien ne permet plus de retrouver ce qui a été dit.
 *
 * CE QUE CE MODULE CHANGE, ET CE QU'IL NE CHANGE PAS.
 *   - il ne change PAS `quantite` : elle reste en kilos. Réinterpréter une
 *     colonne déjà peuplée serait pire que le défaut lui-même ;
 *   - il RETOURNE en plus la saisie brute, pour qu'elle soit persistée à côté.
 *     La conversion devient alors RÉVERSIBLE : le jour où le facteur devient
 *     propre au produit, les lignes existantes sont recalculables.
 *
 * L'IDENTITÉ MONÉTAIRE EST PRÉSERVÉE, et testée :
 *     quantiteEnKg × prixParKg  =  quantiteSaisie × prixSaisi
 * Le prix est saisi PAR UNITÉ D'ORIGINE (« prix par sac ») ; le stocker brut à
 * côté d'une quantité en kilos gonflait « Valeur stock » et « Revenus » par le
 * facteur. On convertit donc le prix en prix/kg — l'argent, lui, n'a jamais
 * été faux. C'est le POIDS qui l'était.
 */

export interface SaisieRecolte {
  /** Ce que le producteur a tapé, dans SON unité. */
  quantiteSaisie: number;
  /** L'unité qu'il a choisie (`panier`, `sac`, `tas`…). */
  uniteSaisie: string;
  /** Le facteur appliqué pour arriver aux kilos. */
  facteur: number;
  /** Prix saisi, PAR UNITÉ D'ORIGINE. Vide = non renseigné. */
  prixSaisi: number | '';
}

export interface RecolteConvertie {
  /** Ce qui part dans `quantite` (colonne en kilos, inchangée). */
  quantiteEnKg: number;
  /** Ce qui part dans `prix_unitaire` (par kilo, cohérent avec ci-dessus). */
  prixParKg: number;
  /** La saisie brute, à persister TELLE QUELLE à côté. */
  quantiteSaisie: number;
  uniteSaisie: string;
  facteur: number;
}

/** Arrondi au dixième, comme l'écran l'a toujours fait. */
function auDixieme(v: number): number {
  return Math.round(v * 10) / 10;
}

export function convertirRecolte(s: SaisieRecolte): RecolteConvertie {
  const quantiteSaisie = Number.isFinite(s.quantiteSaisie) ? s.quantiteSaisie : 0;
  const facteur = Number.isFinite(s.facteur) && s.facteur > 0 ? s.facteur : 1;
  const prix = s.prixSaisi === '' || !Number.isFinite(Number(s.prixSaisi)) ? 0 : Number(s.prixSaisi);
  return {
    quantiteEnKg: auDixieme(quantiteSaisie * facteur),
    // Deux décimales : un prix/kg arrondi à l'unité ferait perdre jusqu'a
    // plusieurs centaines de francs sur un sac.
    prixParKg: prix > 0 ? Math.round((prix / facteur) * 100) / 100 : 0,
    quantiteSaisie,
    uniteSaisie: s.uniteSaisie,
    facteur,
  };
}

