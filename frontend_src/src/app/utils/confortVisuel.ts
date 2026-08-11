/**
 * CONFORT VISUEL — mode SOLEIL (inclusion, docs/INCLUSION.md §2.4).
 *
 * Les marchés sont dehors : en plein soleil, sur un écran d'entrée de gamme,
 * les petits textes et les gris pâles disparaissent. La presbytie (clientèle
 * vieillissante) aggrave tout. Le mode soleil rend TOUT plus grand et plus
 * franc d'un seul geste — proposé là où on en a besoin (accueil), pas caché.
 *
 * Mécanique : une classe `soleil` sur <html>, stylée par styles/soleil.css
 * (zoom global — cibles tactiles comprises — graisse et gris relevés).
 * Le cœur est pur (racine et stockage injectés) pour être testé au tsx.
 */

export type ConfortVisuel = 'normal' | 'soleil';

export const CLE_CONFORT = 'julaba_confort_visuel';
export const CONFORT_EVENT = 'julaba:confort-visuel';
const CLASSE = 'soleil';

export interface RacineHtml { classList: { add(c: string): void; remove(c: string): void } }
export interface StoreKV { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Cœur PUR : lit le mode depuis un stockage (valeur inconnue → 'normal'). */
export function lireConfort(store: StoreKV | null): ConfortVisuel {
  try { return store?.getItem(CLE_CONFORT) === 'soleil' ? 'soleil' : 'normal'; }
  catch { return 'normal'; }
}

/** Cœur PUR : applique (ou retire) la classe sur la racine. */
export function appliquerClasse(racine: RacineHtml, mode: ConfortVisuel): void {
  if (mode === 'soleil') racine.classList.add(CLASSE);
  else racine.classList.remove(CLASSE);
}

/** Cœur PUR : mémorise + applique. Renvoie false si le stockage a échoué. */
export function ecrireConfort(store: StoreKV | null, racine: RacineHtml, mode: ConfortVisuel): boolean {
  appliquerClasse(racine, mode); // l'écran change même si le stockage échoue
  try { store?.setItem(CLE_CONFORT, mode); return true; }
  catch { return false; }
}

// ── Enrobage navigateur (les écrans n'utilisent que ces trois fonctions) ──

export function getConfortVisuel(): ConfortVisuel {
  return lireConfort(typeof window !== 'undefined' ? window.localStorage : null);
}

export function setConfortVisuel(mode: ConfortVisuel): void {
  ecrireConfort(window.localStorage, document.documentElement, mode);
  try { window.dispatchEvent(new CustomEvent(CONFORT_EVENT, { detail: mode })); } catch { /* ignore */ }
}

/** À appeler au démarrage : ré-applique le mode mémorisé. */
export function appliquerConfortAuDemarrage(): void {
  try { appliquerClasse(document.documentElement, getConfortVisuel()); } catch { /* ignore */ }
}
