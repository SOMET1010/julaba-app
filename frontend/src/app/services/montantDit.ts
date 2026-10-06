/**
 * LE PRIX QU'ELLE VIENT DE DIRE — VOX-03.
 *
 * LE DÉFAUT QU'ON FERME. Quand JULABA demande son prix, il lui tendait un
 * pavé de chiffres et un champ texte. Rien pour parler. Constat de Patrick
 * sur le terrain, 24/09 : « il me demande mon prix, mais avec une interface
 * pour saisir — si je ne sais pas lire ? ». C'est l'écran de l'ARGENT, chez
 * précisément la personne pour qui cette application existe.
 *
 * CE MODULE NE FAIT QU'UNE CHOSE : lire un montant dans ce qu'elle a dit. Ni
 * l'unité, ni la quantité, ni la vente — d'autres s'en chargent, et les
 * mélanger ici recréerait la confusion qu'ARG-12 vient de fermer.
 *
 * IL RÉUTILISE `extraire`, IL NE REFAIT PAS UN LECTEUR DE NOMBRES. La
 * grammaire française de JULABA sait déjà lire « mille cinq cents » ; en
 * écrire une seconde ici, ce serait deux règles pour une même idée — et deux
 * chances de diverger sur un montant.
 *
 * ET IL NE DEVINE JAMAIS. Sans nombre clair, `null` : le champ reste vide et
 * elle redit. C'est STK-02, appliqué à la voix — le prix vient d'elle, ou il
 * n'existe pas encore. Un zéro, lui, se laisserait enregistrer et fausserait
 * chaque vente faite avec ce produit : il est refusé comme le reste.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */
import { extraire } from '../voice-offline/extraction';

export function montantDit(cequelleADit: string): number | null {
  const texte = (cequelleADit ?? '').trim();
  if (!texte) return null;

  // `extraire` rend le montant de la phrase, quelle qu'en soit la tournure :
  // « 1500 », « mille cinq cents », « c'est 1500 francs », « à 1500 le tas ».
  const { montant } = extraire(texte);
  return typeof montant === 'number' && Number.isFinite(montant) && montant > 0
    ? Math.round(montant)
    : null;
}
