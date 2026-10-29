/**
 * CE QU'UN APPUI SUR LE MICRO DOIT FAIRE — VOX-02.
 *
 * LE DÉFAUT, vu sur le téléphone de Patrick le 23/09. `VoiceState` a SEPT
 * valeurs ; `handleMicClick` en traitait SIX. `confirming` n'apparaissait dans
 * aucune branche — et il est posé quatre fois, toutes sur le chemin d'une
 * confirmation FINANCIÈRE ou d'une question. Dès qu'une confirmation était en
 * cours, l'appui ne faisait RIEN : pas d'erreur, pas de son, pas de retour.
 * Et vendre EST une intention financière : le piège se refermait sur le geste
 * le plus courant.
 *
 * POURQUOI UNE RÈGLE PLUTÔT QU'UNE BRANCHE DE PLUS. Le trou ne vient pas d'une
 * inattention mais de la FORME : une suite de `if/else if` sur un type à sept
 * valeurs ne se plaint jamais quand il en manque une. Ici le `switch` est
 * exhaustif et le compilateur refuse un état oublié (`assertJamais`). Le
 * prochain état ajouté ne pourra pas passer en silence.
 *
 * `useVoiceCore.ts` EST FIGÉ PAR VOICE-01 : ce module n'y touche pas. L'écran
 * décide AVANT d'appeler le hook, avec les primitives qu'il expose déjà.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */

/** Les sept états du moteur de voix, au complet. */
export const ETATS_VOIX = [
  'idle', 'listening', 'processing', 'thinking', 'speaking', 'confirming', 'error',
] as const;

export type EtatVoix = typeof ETATS_VOIX[number];

/**
 * Ce que l'appui déclenche.
 *
 *   ecouter     — ouvrir l'oreille
 *   arreter     — fermer l'oreille (elle a fini de parler)
 *   interrompre — couper ce qui tourne et revenir au repos
 *   reprendre   — abandonner ce qui est en cours ET rouvrir l'oreille
 */
export type GesteMicro = 'ecouter' | 'arreter' | 'interrompre' | 'reprendre';

/** Le compilateur refuse un état non traité. C'est tout l'objet de ce module. */
function assertJamais(x: never): never {
  throw new Error(`état de voix non traité : ${String(x)}`);
}

export function gesteDuMicro(etat: EtatVoix): GesteMicro {
  switch (etat) {
    case 'idle':
    case 'error':
      return 'ecouter';
    case 'listening':
      return 'arreter';
    case 'thinking':
    case 'processing':
      return 'interrompre';
    case 'speaking':
      // Tantie parle : l'appui la coupe pour laisser la marchande parler.
      // C'est déjà le comportement du hook, on le nomme.
      return 'ecouter';
    case 'confirming':
      // LE TROU. Une question attend une réponse, et elle appuie sur le micro :
      // elle veut PARLER. Un geste qui annulerait sans rouvrir l'oreille la
      // laisserait devant un écran muet — le défaut d'à côté. On abandonne la
      // question ET on réécoute, en un seul appui.
      return 'reprendre';
    default:
      return assertJamais(etat);
  }
}

/**
 * L'écran doit-il montrer une sortie — le geste qui remet tout à zéro ?
 *
 * LE SECOND TROU. Le bouton « Parler encore à Tantie » ne s'affichait que si
 * `isDone || isError` : DEUX états sur sept. Partout ailleurs, aucun geste ne
 * remettait l'écran à zéro. Micro inerte plus aucune sortie, c'est un écran
 * mort — et pour une marchande qui ne lit pas, il n'existe pas de « sortir et
 * revenir » : elle repose le téléphone.
 *
 * AU REPOS SANS RIEN, PAS DE BOUTON : le micro est lui-même la sortie, et un
 * bouton de plus sur un écran vide est un choix de plus à faire.
 */
export function sortieVisible(etat: EtatVoix, aUneReponse: boolean): boolean {
  return etat !== 'idle' || aUneReponse;
}
