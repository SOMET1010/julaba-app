/**
 * CE QU'UN APPUI REND À LA MAIN — NUM-03.
 *
 * LE DÉFAUT. L'étape NUMÉRO vibrait à chaque chiffre ; l'étape CODE ne rendait
 * RIEN — ni vibration, ni son. Quatre chiffres à chaque connexion, le geste le
 * plus répété de l'application, et aucun signe que l'appui a compté. Une
 * marchande qui ne lit pas appuie, ne sent rien, et recommence — ou abandonne.
 *
 * POURQUOI LA RÈGLE SORT DE L'ÉCRAN. Les deux étapes vivent dans la même
 * fonction (`handleKeyPress`) et se comportaient différemment, sans que
 * personne l'ait décidé : l'une avait reçu son correctif, l'autre pas. Une
 * règle écrite deux fois finit par diverger — ici elle avait déjà divergé.
 *
 * ET CE QU'ON NE DIT JAMAIS : LE CHIFFRE. C'est NUM-02, et ce module en est le
 * gardien. Au marché elle est entourée ; son numéro comme son code sont à elle.
 * Un retour qui prononcerait le chiffre le donnerait aux voisins. La main sait,
 * l'oreille ne saura pas.
 *
 * EFFACER EST UN AUTRE GESTE. Motif de vibration distinct — elle le distingue
 * sans regarder — et un mot, « Effacé », qui ne révèle rien.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */

/** Les deux endroits où elle tape des chiffres. */
export type EtapeSaisie = 'numero' | 'code';

/** Ce qu'elle vient de faire. */
export type GesteSaisie = 'chiffre' | 'effacement';

export interface RetourFrappe {
  /** Motif de vibration, en millisecondes (format `navigator.vibrate`). */
  readonly vibration: readonly number[];
  /** Ce qui est dit à voix haute. `null` = RIEN, et c'est le cas d'un chiffre. */
  readonly ditVoixHaute: string | null;
}

/** Court : un appui, pas une alarme. */
const APPUI = [12] as const;
/** Deux secousses séparées : la main lit « j'ai retiré », pas « j'ai ajouté ». */
const RETRAIT = [10, 30, 10] as const;

export function retourFrappe(_etape: EtapeSaisie, geste: GesteSaisie): RetourFrappe {
  // L'ÉTAPE NE CHANGE RIEN, ET C'EST LE CORRECTIF. Le paramètre reste au
  // contrat pour que l'appelant dise toujours d'où il parle — et pour que le
  // jour où une étape mériterait un autre retour, ce soit une DÉCISION écrite
  // ici, pas un oubli dans un écran.
  return geste === 'effacement'
    ? { vibration: RETRAIT, ditVoixHaute: 'Effacé.' }
    : { vibration: APPUI, ditVoixHaute: null };
}
