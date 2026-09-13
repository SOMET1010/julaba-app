/**
 * Une commande vocale qui déclencherait une écriture ne doit jamais appeler un
 * backend lorsque l’appareil est hors ligne. Elle est gardée dans la file locale
 * puis rejouée lorsque la connectivité revient.
 *
 * Exception explicite, PAR INTENTION (Lot 2, convergence voix/tactile POS) :
 * une intention listée dans `offlineLocalIntents` n'agit que sur le PANIER
 * local (aucune écriture serveur) — elle doit donc s'exécuter immédiatement,
 * même hors ligne, plutôt que d'attendre une reconnexion qui n'a plus de
 * raison d'être pour elle. `isOnline` n'est jamais falsifié par cette
 * exception : seule la décision de mise en file change, l'état réseau réel
 * reste celui affiché ailleurs (ex. bannière « Hors-ligne »).
 */
export function shouldQueueVoiceAction(
  isOnline: boolean,
  hasAction: boolean,
  intent?: string,
  offlineLocalIntents?: string[],
): boolean {
  if (intent && offlineLocalIntents?.includes(intent)) return false;
  return !isOnline && hasAction;
}
