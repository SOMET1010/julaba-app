// ──────────────────────────────────────────────────────────────────────────
// Règle des numéros ivoiriens — SOURCE UNIQUE.
//
// Depuis la migration à 10 chiffres (ARTCI, 2021), un numéro CI a EXACTEMENT
// 10 chiffres et commence par 0. Les préfixes mobiles sont attribués par trios :
//   • 01 / 02 / 03 → Moov Africa
//   • 04 / 05 / 06 → MTN
//   • 07 / 08 / 09 → Orange
// Les fixes commencent par 2 (Abidjan/régions : 21, 25, 27…).
//
// C'est LA règle sur laquelle la dictée doit se caler : on s'arrête quand on a
// 10 chiffres formant un numéro valide — pas sur un minuteur.
// ──────────────────────────────────────────────────────────────────────────

export type Operateur = 'Orange' | 'MTN' | 'Moov';

const OP_PREFIXES: Record<string, Operateur> = {
  '01': 'Moov', '02': 'Moov', '03': 'Moov',
  '04': 'MTN',  '05': 'MTN',  '06': 'MTN',
  '07': 'Orange', '08': 'Orange', '09': 'Orange',
};

/** Couleur de marque de l'opérateur (pour un repère visuel discret). */
export const OP_COULEUR: Record<Operateur, string> = {
  Orange: '#FF7900',
  MTN: '#FFCB05',
  Moov: '#004F9F',
};

/** Numéro MOBILE ivoirien complet et valide (10 chiffres, préfixe opérateur connu). */
export function estMobileCI(n: string): boolean {
  return /^0[1-9]\d{8}$/.test(n) && OP_PREFIXES[n.slice(0, 2)] !== undefined;
}

/** Numéro FIXE ivoirien (10 chiffres commençant par 2). */
export function estFixeCI(n: string): boolean {
  return /^2\d{9}$/.test(n);
}

/** Opérateur déduit du préfixe, ou null si inconnu/incomplet. */
export function operateurDe(n: string): Operateur | null {
  if (!/^\d{2}/.test(n)) return null;
  return OP_PREFIXES[n.slice(0, 2)] ?? null;
}

/**
 * Vrai dès que `n` est un numéro CI COMPLET et plausible (mobile ou fixe).
 * `extra` = numéros de test/institutionnels autorisés hors règle (bypass).
 */
export function numeroCIComplet(n: string, extra?: Set<string>): boolean {
  if (extra?.has(n)) return true;
  return estMobileCI(n) || estFixeCI(n);
}

/** Préfixe (2 chiffres) accepté à la saisie — mobile 0[1-9] ou fixe 2x. */
export function prefixePlausible(deuxChiffres: string): boolean {
  return /^0[1-9]$/.test(deuxChiffres) || /^2[0-9]$/.test(deuxChiffres);
}
