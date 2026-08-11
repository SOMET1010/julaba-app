/**
 * Retour HAPTIQUE (inclusion — docs/INCLUSION.md §2.3). Module minuscule et pur.
 *
 * Règle : toute confirmation ou erreur importante a un équivalent que l'on
 * SENT, en plus de ce qui se voit et s'entend. Une marchande qui n'entend pas
 * (ou qui est dans le bruit du marché, très fréquent) sait quand même que sa
 * vente est passée — ou qu'il y a un souci.
 *
 * Silencieux partout où l'API vibrate n'existe pas (iOS Safari, desktop).
 */

function vibrer(motif: number | number[]): void {
  try { navigator.vibrate?.(motif); } catch { /* jamais bloquant */ }
}

/** Double impulsion brève : « c'est bon, c'est passé ». */
export function vibrerSucces(): void {
  vibrer([35, 60, 35]);
}

/** Impulsion longue unique : « attention, regarde l'écran ». */
export function vibrerErreur(): void {
  vibrer(180);
}

/** Petit tic de saisie (toucher d'un billet, d'une touche importante). */
export function vibrerTic(): void {
  vibrer(15);
}
