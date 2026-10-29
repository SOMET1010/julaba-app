/**
 * LA DEVISE, DITE UNE FOIS — arbitrage de Patrick, 19/09/2026.
 *
 * LE DÉFAUT QU'ON FERME (audit Odoo, constat 4). Le portefeuille déclare sa
 * devise (`currency DEFAULT 'XOF'` dans le schéma), mais la VENTE n'en déclare
 * aucune : le franc CFA y était une hypothèse implicite, écrite nulle part et
 * partout à la fois — « FCFA » en dur dans des dizaines d'écrans. Ce n'est pas
 * un bug aujourd'hui ; c'est un pari sur le fait que JULABA ne servira jamais
 * un autre pays de la zone. Le garde-fou XOF du POC Odoo nous a justement
 * appris à ne pas faire ce pari.
 *
 * LA RÈGLE, telle que Patrick l'a posée : « XOF explicite dans le modèle,
 * invisible dans l'UX quotidienne. » La marchande voit « F », comme au marché ;
 * la donnée, elle, sait qu'il s'agit de francs CFA d'Afrique de l'Ouest.
 *
 * CE QUE CE MODULE NE FAIT PAS ENCORE, et c'est délibéré : il n'ajoute pas de
 * colonne `devise` sur `caisse_transactions` — cette table est gelée par
 * PILOTE-2, et la toucher demande l'arbitrage qui va avec (même raison que
 * l'unité de la ligne de vente). Il supprime l'implicite CÔTÉ CODE : un seul
 * endroit nomme la devise, et le jour où une colonne sera ajoutée, c'est cette
 * constante qui la remplira.
 */

/** Code ISO 4217 de la devise du pilote. La DONNÉE, pas l'affichage. */
export const DEVISE_CODE = 'XOF' as const;

/** Ce que la marchande LIT. Court, comme au marché — jamais « XOF » à l'écran. */
export const DEVISE_SYMBOLE = 'F' as const;

/** Ce que Tata DIT. « francs », jamais « F » (une lettre ne s'entend pas). */
export const DEVISE_PARLEE = 'francs' as const;

/** Libellé long, pour les écrans de réglages et les documents officiels. */
export const DEVISE_LIBELLE = 'Franc CFA (XOF)' as const;

export type CodeDevise = typeof DEVISE_CODE;

/**
 * Un montant tel qu'il s'affiche pour une marchande : « 1 500 F ».
 * L'espace insécable évite qu'un montant se coupe en fin de ligne — un « 1 500 »
 * séparé de son « F » se lit comme deux nombres.
 */
export function montantAffiche(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR')} ${DEVISE_SYMBOLE}`;
}

/** Un montant tel que Tata le DIT : « mille cinq cents francs ». */
export function montantParle(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR')} ${DEVISE_PARLEE}`;
}
