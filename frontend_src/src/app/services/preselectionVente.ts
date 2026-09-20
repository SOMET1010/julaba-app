/**
 * LE PRODUIT DÉJÀ CHOISI NE DOIT PAS ÊTRE REDIT — VOIX-01, lot B2.
 *
 * LE DÉFAUT QU'ON FERME, reproduit avant d'être corrigé (20/09/2026). La
 * marchande touche « Tomate » dans Mon stock, arrive en caisse et dit
 * naturellement « trois tas ». Le moteur vocal recevait alors
 * `action.produit = undefined` : aucun produit à apparier, donc aucun prix de
 * catalogue, donc Tata répondait
 *
 *     « Je n'ai pas compris le prix. Redis-moi combien tu as vendu. »
 *
 * et le panier restait VIDE. L'écran savait qu'on parlait de tomate ; la voix
 * l'avait oublié. Pire que la couture : l'application redemandait un prix
 * qu'elle connaissait déjà.
 *
 * LA RÈGLE, ET SA LIMITE. La présélection ne sert que de REPLI, et seulement
 * sur le NOM :
 *
 *  - la parole prime TOUJOURS. « deux kilos d'oignons » après avoir touché
 *    Tomate vend des oignons : ce qu'elle dit est plus récent, donc plus vrai,
 *    que ce qu'elle a touché.
 *  - ni l'unité ni le prix de la fiche ne sont injectés ici. Les forcer
 *    court-circuiterait l'arbitrage métier de `resoudrePrixVocal` — celui qui
 *    refuse de vendre un « tas » au prix du kilo. Une fois le nom connu, le
 *    catalogue fournit ce qu'il faut, comme pour n'importe quelle vente dictée.
 *
 * Module PUR : aucune dépendance, testable sans écran.
 */

/** Ce que la fiche produit transmet — seul le nom sert ici. */
export interface PreselectionProduit {
  nom?: string | null;
}

/**
 * Le nom de produit à donner au moteur de vente.
 *
 * Renvoie `undefined` quand il n'y a ni parole ni présélection : c'est le
 * comportement d'origine, et il est volontaire — Tata redemande plutôt que
 * d'inventer un produit.
 */
export function produitPourVente(
  nomParle: string | null | undefined,
  preselection?: PreselectionProduit | null,
): string | undefined {
  const parle = typeof nomParle === 'string' ? nomParle.trim() : '';
  if (parle) return parle;
  const preselectionne = typeof preselection?.nom === 'string' ? preselection.nom.trim() : '';
  if (preselectionne) return preselectionne;
  return undefined;
}
