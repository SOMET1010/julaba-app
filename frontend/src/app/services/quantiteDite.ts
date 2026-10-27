/**
 * LA QUANTITÉ QU'ELLE VIENT DE DIRE — VOIX-06, 26/10/2026.
 *
 * LE DÉFAUT QU'ON FERME. « Tu en as combien ? Si tu ne sais pas, passe. »
 * était DITE (STK-04) et n'écoutait PAS : un pavé de chiffres, et un bouton
 * « Je ne sais pas ». La phrase elle-même disait qu'on pouvait passer — et
 * rien n'écoutait le mot « passe ». Pour une non-lectrice, répondre à voix
 * haute à cette question ne servait strictement à rien.
 *
 * CE MODULE NE FAIT QU'UNE CHOSE : lire une quantité dans ce qu'elle a dit —
 * ou reconnaître qu'elle PASSE. Ni le prix, ni le nom, ni l'unité : les
 * mélanger recréerait les confusions qu'ARG-12 a fermées ; c'est pour ça que
 * `montantDit` n'est pas réutilisé (son contrat dit « ni la quantité »).
 *
 * LA GRAMMAIRE EST CELLE DE L'APPLICATION. `extraire` sait déjà lire « dix »,
 * « mille cinq cents », l'ellipse du marché (« deux mille cinq »). On n'écrit
 * pas un second parseur de nombres : deux règles pour une même idée, et deux
 * chances de diverger.
 *
 * SON ZÉRO EST UNE RÉPONSE (STK-04) : « zéro » vaut zéro — elle a dit qu'elle
 * n'en avait plus. C'est « passer » qui laisse le stock INCONNU, jamais le
 * zéro.
 *
 * CE QUI PASSE : les mots qui répondent à la question posée — « passe »,
 * « je ne sais pas », « plus tard ». Liste ÉTROITE et sans ambiguïté : un
 * « passe » mal compté écrirait un stock à sa place. Le doute rend `null` —
 * on relance à la voix, elle peut aussi toucher le pavé ou le bouton.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */
import { extraire, normalise } from '../voice-offline/extraction';

export type QuantiteEntendue =
  | { genre: 'nombre'; nombre: number }
  | { genre: 'passe' };

/** Les phrases qui répondent à « combien ? » par un refus de répondre. La
 *  liste est volontairement étroite : ce sont des PHRASES entières (ou le
 *  groupe sans ambiguïté « je ne sais pas »), pas des mots isolés qui
 *  traîneraient dans autre chose. */
const PHRASES_PASSE = ['passe', 'je passe', 'plus tard', "j'en sais rien", 'pas maintenant'];

/**
 * Lit la quantité dans ce qu'elle vient de dire.
 *
 * `null` quand on n'a rien lu de lisible : on relance à la voix, on n'invente
 * pas un stock. Le pavé et « Je ne sais pas » restent là — la voix est le
 * geste par défaut, pas le seul.
 */
export function quantiteDite(cequelleADit: string): QuantiteEntendue | null {
  const texte = normalise(cequelleADit ?? '');
  if (!texte) return null;

  // CE QUI PASSE — la phrase entière, ou le groupe non ambigu. « ça passe
  // pas » ne passe PAS : le doute profite à la relance, comme sur l'argent.
  if (texte === 'je ne sais pas' || texte.includes('je ne sais pas')) return { genre: 'passe' };
  if (PHRASES_PASSE.includes(texte)) return { genre: 'passe' };

  // LA GRAMMAIRE EXISTANTE — un seul parseur de nombres dans l'application.
  // Pour une phrase sans produit ni marqueur, le nombre tombe dans `montant`
  // (règle du dernier recours d'`extraire`) : c'est LE nombre de la phrase.
  const lu = extraire(texte);
  const nombre = lu.montant ?? lu.quantite;
  if (typeof nombre === 'number' && Number.isFinite(nombre) && nombre >= 0) {
    return { genre: 'nombre', nombre };
  }
  return null;
}
