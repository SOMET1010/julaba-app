/**
 * CE QUE LA CAISSE A LE DROIT D'AFFIRMER SUR LE CATALOGUE — CAI-01.
 *
 * LE DÉFAUT QU'ON FERME. Banc terrain, écran 5 : « ZÉRO QUI MENT — l'écran a
 * demandé au serveur (6 lectures), n'a rien obtenu, et affirme quand même
 * "Aucun produit" ». C'est l'écran de VENTE. Une marchande qui lit « Aucun
 * produit » range son téléphone et vend sans lui.
 *
 * D'OÙ VENAIT L'AFFIRMATION. `CaisseContext.loadProducts` avale l'échec
 * (`catch { console.warn(…) ; restaurerDepuisCache(…) }`). Le repli sur le
 * cache est la BONNE décision — un marché n'a pas de réseau. Mais quand le
 * cache est vide lui aussi, la liste reste `[]`, et `[]` s'affiche « Aucun
 * produit » : la même phrase pour « tu n'as rien créé » et pour « je n'ai pas
 * pu demander ». Deux situations, une seule phrase.
 *
 * TROISIÈME JUMEAU VOLONTAIRE, après `etatVentesPassees` (HIST-01) et
 * `etatCaisseAccueil` (ACC-01) : trois écrans, une seule façon de dire « je ne
 * sais pas ». Sur les branches non résolues, `nbProduits` N'EXISTE PAS — le
 * compilateur refuse de l'afficher avant même le banc.
 *
 * CE MODULE NE LIT NI NE COMPTE RIEN. Il reçoit trois faits et rend un état.
 */
import type { LectureHistorique } from './etatVentesPassees';

/** Réutilise le vocabulaire de HIST-01 : mêmes mots pour la même idée. */
export type LectureCatalogue = LectureHistorique;

export type EtatCatalogueCaisse =
  /** Pas encore de réponse. Ni liste, ni « aucun ». */
  | { readonly type: 'attente' }
  /** On a demandé, on n'a rien obtenu, et le téléphone n'avait rien en réserve. */
  | { readonly type: 'illisible' }
  /** Le serveur n'a pas répondu, mais le téléphone se souvient. Ces produits
   *  existent ; ils sont PÉRIMÉS, pas faux. On ne dit donc jamais « aucun ». */
  | { readonly type: 'memoire'; readonly nbProduits: number }
  /** Le serveur a répondu et il n'a rien : la SEULE situation où « aucun
   *  produit » est vrai. */
  | { readonly type: 'vide' }
  /** Le serveur a répondu et il y a des produits. */
  | { readonly type: 'liste'; readonly nbProduits: number };

export interface FaitsCatalogueCaisse {
  /** Où en est la dernière lecture du catalogue serveur. */
  readonly lecture: LectureCatalogue;
  /** Combien de produits la caisse porte À L'ÉCRAN, cache compris. */
  readonly nbProduits: number;
  /** Ces produits viennent-ils du cache du téléphone plutôt que du serveur ? */
  readonly servisDepuisCache: boolean;
}

export function etatCatalogueCaisse(faits: FaitsCatalogueCaisse): EtatCatalogueCaisse {
  const nbProduits = Math.max(0, Math.trunc(faits.nbProduits) || 0);

  if (faits.lecture === 'echec') {
    // Le cache a sauvé l'écran : on montre, mais on ne présente pas ça comme
    // l'état du serveur. Sans cache, on ne sait rien — et on le dit.
    return faits.servisDepuisCache && nbProduits > 0
      ? { type: 'memoire', nbProduits }
      : { type: 'illisible' };
  }

  if (faits.lecture === 'jamais' || faits.lecture === 'chargement') {
    return nbProduits > 0 ? { type: 'memoire', nbProduits } : { type: 'attente' };
  }

  // LE SERVEUR A RÉPONDU. Une incohérence reste possible : il a répondu, la
  // liste est vide, et l'écran annonce pourtant servir le cache (course entre
  // deux rendus). Deux faits qui se contredisent ne font pas une certitude :
  // on n'affirme pas « aucun produit ».
  if (nbProduits === 0) return faits.servisDepuisCache ? { type: 'illisible' } : { type: 'vide' };
  return { type: 'liste', nbProduits };
}
