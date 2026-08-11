/**
 * TAILLE DU TEXTE (Paramètres) — un curseur qui fait VRAIMENT quelque chose.
 *
 * Avant v5.0.0.15, le curseur écrivait `--font-size`, consommé par UN seul
 * style (les textes en rem) alors que l'appli écrit ses tailles en px inline :
 * il était quasi cosmétique. Pire : la valeur inline écrasait la base relevée
 * du mode soleil.
 *
 * Désormais il pilote un ZOOM réel sur <body> (même mécanique éprouvée que le
 * mode soleil sur <html> : les deux se MULTIPLIENT proprement) : tout grandit,
 * cibles tactiles comprises. Plage prudente 85 % → 130 % — le mode soleil
 * reste le grand geste, le curseur est le réglage fin.
 * Le cœur est pur (style injecté) pour être testé au tsx.
 */

/** Un cran par valeur du curseur historique (0..6, 3 = normal). */
export const ZOOMS_TEXTE = [0.85, 0.9, 0.95, 1, 1.1, 1.2, 1.3] as const;
export const TAILLE_TEXTE_DEFAUT = 3;
export const VAR_ZOOM_TEXTE = '--zoom-texte';

export interface StyleRacine { setProperty(nom: string, valeur: string): void }

/** Cœur PUR : zoom pour un cran du curseur (hors bornes/invalide → 100 %). */
export function zoomPourTaille(index: number): number {
  if (!Number.isFinite(index)) return ZOOMS_TEXTE[TAILLE_TEXTE_DEFAUT];
  const i = Math.round(index);
  if (i < 0 || i >= ZOOMS_TEXTE.length) return ZOOMS_TEXTE[TAILLE_TEXTE_DEFAUT];
  return ZOOMS_TEXTE[i];
}

/** Cœur PUR : applique le zoom du cran sur la racine. Renvoie le zoom posé. */
export function appliquerTailleTexte(style: StyleRacine, index: number): number {
  const z = zoomPourTaille(index);
  style.setProperty(VAR_ZOOM_TEXTE, String(z));
  return z;
}

// ── Enrobage navigateur ──

export function appliquerTailleTexteAuDocument(index: number): number {
  try { return appliquerTailleTexte(document.documentElement.style, index); }
  catch { return ZOOMS_TEXTE[TAILLE_TEXTE_DEFAUT]; }
}
