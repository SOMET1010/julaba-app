/**
 * ELLE DIT SON PRODUIT — STK-05.
 *
 * LE DÉFAUT. L'écran du stock imprimait sur son plus gros bouton :
 * « dis : "ajoute 10 piments à 500" ». Mesuré le 24/09 : `intentLocal` rend
 * `null` sur cette phrase exacte. Et `ajouter_stock` — l'action que le bloc
 * de réception attendait — n'a AUCUN producteur dans le dépôt : quatre
 * occurrences, toutes consommatrices. Le bloc était inatteignable.
 *
 * Elle disait donc exactement ce que l'écran lui dictait, et recevait « Je
 * n'ai pas bien compris. Redis-moi ça autrement. » Ce n'est pas un bouton
 * muet : c'est un bouton qui lui donne tort.
 *
 * LA CAUSE N'ÉTAIT PAS UNE GRAMMAIRE MANQUANTE. `extraire()` comprenait
 * déjà tout :
 *
 *     extraire("ajoute 10 piments à 500")  → produit "piment", qté 10, 500
 *     extraire("ajoute dix kilos de tomate") → "tomate", qté 10, « kilos »
 *     extraire("gombo")                    → produit "gombo"
 *
 * Seul `intention` restait vide — et `intentLocal`, qui ne sait fabriquer que
 * `vendre` et `depense`, jetait le reste. Le mot « ajoute » est même dans
 * `MOTS_PAS_UNE_VENTE` : il FERME une porte au lieu d'en ouvrir une.
 * L'information existait, et l'aval la jetait. Encore.
 *
 * CE MODULE NE DEVINE RIEN. Il lit ce qu'elle a dit et dit ce qui manque.
 * Aucune unité, aucun prix, aucun nom n'est inventé : ce que la phrase ne
 * donne pas, `AjoutProduitGuide` le LUI demande.
 *
 * L'APPARIEMENT SERT À NE PAS LA DÉDOUBLER, pas à choisir à sa place.
 * `apparierProduit` refuse déjà d'apparier quand plusieurs produits
 * pourraient correspondre — on garde alors son mot tel qu'elle l'a dit,
 * plutôt que de toucher le mauvais.
 */
import { extraire } from '../voice-offline/extraction';
import { apparierProduit } from './venteVocale';
import { etapeCourante, type BrouillonProduit, type EtapeAjout } from './premierProduit';

export interface EcouteProduit {
  /** Ce qu'elle a donné, prêt à préremplir le parcours en trois questions. */
  brouillon: BrouillonProduit;
  /** Le nom EXACT tel qu'il figure déjà sur son étal, s'il n'y a aucun doute. */
  reconnu: string | null;
  /** La prochaine question à lui poser. Le parcours ne demande que ça. */
  manque: EtapeAjout;
  /**
   * LA QUANTITÉ ENTENDUE, CONSERVÉE SANS ÊTRE UTILISÉE.
   *
   * Le parcours en trois questions ne demande pas de stock (STK-03e : « une
   * marchande ne décrit pas son produit, elle le vend »), et `produitACreer`
   * pose délibérément `stock: 0`. Mais elle a bien dit « dix » : le jeter
   * serait la faute même qu'on ferme ici. On le garde, visible, en attendant
   * l'arbitrage sur le stock initial (voisin de STK-09).
   */
  quantite: number | null;
}

/**
 * Lit un produit dans ce qu'elle vient de dire.
 *
 * `null` quand aucun nom n'est compris : on ne prétend pas avoir entendu.
 * L'écran doit alors le dire, pas ouvrir un formulaire vide.
 */
export function produitDit(
  cequelleADit: string,
  sesProduits: readonly { nom: string }[] = [],
): EcouteProduit | null {
  const texte = (cequelleADit ?? '').trim();
  if (!texte) return null;

  const lu = extraire(texte);
  const nomParle = (lu.produit ?? '').trim();
  if (!nomParle) return null;

  // Son propre nom l'emporte sur le mot dicté : « piment » devient
  // « Piment » si c'est ainsi qu'il est écrit sur son étal. Deux orthographes
  // du même produit, ce sont deux lignes et deux totaux (STK-17).
  const sien = apparierProduit(nomParle, sesProduits as { nom: string }[]);

  const brouillon: BrouillonProduit = {
    nom: sien?.nom ?? nomParle,
    unite: (lu.uniteParlee ?? '').trim(),
    // Un montant n'est un prix que s'il est strictement positif : « zéro »
    // entrerait en caisse et fausserait chaque vente (STK-01d).
    prix: typeof lu.montant === 'number' && Number.isFinite(lu.montant) && lu.montant > 0
      ? lu.montant
      : null,
  };

  return {
    brouillon,
    reconnu: sien?.nom ?? null,
    manque: etapeCourante(brouillon),
    quantite: typeof lu.quantite === 'number' && Number.isFinite(lu.quantite) ? lu.quantite : null,
  };
}
