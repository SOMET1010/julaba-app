/**
 * CONFORT VISUEL — arbitre UNIQUE des modes d'affichage (inclusion §2.4).
 *
 * Trois modes, UN seul réglage, jamais deux à la fois :
 * - 'normal' : la palette historique.
 * - 'soleil' : marchés en plein jour — tout plus grand et plus franc
 *   (classe `soleil` sur <html>, stylée par styles/soleil.css + tokens.css).
 * - 'sombre' : le soir (18h-6h en mode auto) — fonds éteints, encres claires
 *   (classe `dark` sur <html>, stylée par styles/index.css + tokens.css).
 *
 * Avant v5.0.0.14, le mode sombre (ThemeContext) et le mode soleil vivaient
 * chacun leur vie : les deux classes pouvaient se poser EN MÊME TEMPS (fond
 * sombre + zoom soleil = illisible). Ce module est désormais le SEUL à poser
 * ou retirer ces classes — ThemeContext lui délègue. Le cœur est pur (racine
 * et stockage injectés) pour être testé au tsx.
 */

export type ConfortVisuel = 'normal' | 'soleil' | 'sombre';

export const CLE_CONFORT = 'julaba_confort_visuel';
export const CONFORT_EVENT = 'julaba:confort-visuel';
/** Ancienne mémoire du mode sombre (ThemeContext historique) — lue une fois
 *  pour la migration, plus jamais écrite. */
export const ANCIENNE_CLE_SOMBRE = 'julaba_dark_mode';
const CLASSE_SOLEIL = 'soleil';
const CLASSE_SOMBRE = 'dark';

export interface RacineHtml { classList: { add(c: string): void; remove(c: string): void } }
export interface StoreKV { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** Cœur PUR : lit le mode depuis un stockage (valeur inconnue → 'normal').
 *  Migration : rien de mémorisé ici mais l'ancien mode sombre était actif
 *  → 'sombre' (elle retrouve son écran tel qu'elle l'avait laissé). */
export function lireConfort(store: StoreKV | null): ConfortVisuel {
  try {
    const brut = store?.getItem(CLE_CONFORT);
    if (brut === 'soleil' || brut === 'sombre') return brut;
    if (brut === null || brut === undefined) {
      if (store?.getItem(ANCIENNE_CLE_SOMBRE) === 'true') return 'sombre';
    }
    return 'normal';
  } catch { return 'normal'; }
}

/** Cœur PUR : applique LA classe du mode — et retire l'autre, toujours. */
export function appliquerClasse(racine: RacineHtml, mode: ConfortVisuel): void {
  if (mode === 'soleil') racine.classList.add(CLASSE_SOLEIL);
  else racine.classList.remove(CLASSE_SOLEIL);
  if (mode === 'sombre') racine.classList.add(CLASSE_SOMBRE);
  else racine.classList.remove(CLASSE_SOMBRE);
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

/** À appeler au démarrage : ré-applique le mode mémorisé (migration comprise). */
export function appliquerConfortAuDemarrage(): void {
  try { appliquerClasse(document.documentElement, getConfortVisuel()); } catch { /* ignore */ }
}
