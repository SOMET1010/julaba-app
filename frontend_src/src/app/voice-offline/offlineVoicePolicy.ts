/**
 * Une commande vocale qui déclencherait une écriture ne doit jamais appeler un
 * backend lorsque l’appareil est hors ligne. Elle est gardée dans la file locale
 * puis rejouée lorsque la connectivité revient.
 */
export function shouldQueueVoiceAction(isOnline: boolean, hasAction: boolean): boolean {
  return !isOnline && hasAction;
}
