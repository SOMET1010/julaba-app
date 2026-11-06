/**
 * Une commande vocale qui déclencherait une écriture ne doit jamais appeler un
 * backend lorsque l’appareil est hors ligne. Elle est gardée dans la file locale
 * puis rejouée lorsque la connectivité revient.
 *
 * Exception explicite, PAR INTENTION (Lot 2, convergence voix/tactile POS) :
 * une intention listée dans `offlineLocalIntents` passe par SON chemin local
 * offline-first — qui sait lui-même se débrouiller sans réseau. Le cas
 * d'origine : « vendre », ajout au PANIER local (aucune écriture serveur).
 * Étendu le 06/11 : « depense » appelle LE MÊME `enregistrerDepense` que la
 * voie tactile — lequel est offline-first (file locale avec clé d'idempotence,
 * rejeu à la reconnexion). Sans cette exception, la dépense dite au marché
 * sans réseau partait dans la file de rejeu vocal au lieu du chemin du doigt :
 * l'écran restait sur une commande « gardée » qui ne se voyait pas dans la
 * liste des dépenses. `isOnline` n'est jamais falsifié par cette exception :
 * seule la décision de mise en file change, l'état réseau réel reste celui
 * affiché ailleurs (ex. bannière « Hors-ligne »).
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
