// ──────────────────────────────────────────────────────────────────────────
// code-recuperation.ts — LA FORME DU CODE : lisible, dictable, sans piège.
//
// Un code de récupération est lu À voix haute ou recopié d'un écran à un autre
// par un identificateur souvent debout, au soleil, sur un téléphone modeste.
// Sa forme n'est pas un détail : chaque caractère ambigu (0/O, 1/I/L, 5/S,
// 2/Z, 8/B) est une récupération qui échoue au marché. Alphabet : base32
// Crockford (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`) — il EXCLUT DÉJÀ I, L, O, U
// de l'écriture ; ici, aucun alias de plus (Crockford accepte de lire I comme
// 1, L comme 1, O comme 0) : le serveur refuse la variante au lieu de deviner —
// moins de bienveillance, moins d'ambiguïté.
//
// L'espace : 32 symboles, formatés 4+4 (8 caractères) → 32⁸ = 2⁴⁰ ≈ 1,1 × 10¹²
// combinaisons (~40 bits).
// Avec le verrou serveur (échelle d'attente) et le throttler global, la force
// brute en ligne est hors d'atteinte ; le hash bcrypt ferme la brute hors-ligne.
//
// GENERATION : uniquement node:crypto (SEC-07 — tout générateur cryptographique
// dans les modules sensibles, aucune exception à arbitrer). Jamais Math.random.
// ──────────────────────────────────────────────────────────────────────────

import { randomInt } from 'crypto';

/**
 * Alphabet du code : chiffres sans ambiguïté + lettres Crockford privées de
 * I/L/O/U. Affiché en MAJUSCULES, accepté en minuscules.
 */
export const ALPHABET_CODE_RECUPERATION = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Longueur utile du code : 8 caractères, présentés 4 + 4. */
export const LONGUEUR_CODE_RECUPERATION = 8;

/** Le séparateur n'est PAS tapé : il ne sert qu'à la lecture. */
export const SEPARATEUR_CODE_RECUPERATION = '-';

/** Tire un caractère de l'alphabet par le générateur cryptographique du système. */
function caractereAuHasard(): string {
  return ALPHABET_CODE_RECUPERATION[randomInt(ALPHABET_CODE_RECUPERATION.length)];
}

/** Un NOUVEAU code, formaté pour l'écran : « 7K3M-9XQW ». */
export function genererCodeRecuperation(): string {
  const brut = Array.from({ length: LONGUEUR_CODE_RECUPERATION }, caractereAuHasard).join('');
  const moitie = LONGUEUR_CODE_RECUPERATION / 2;
  return `${brut.slice(0, moitie)}${SEPARATEUR_CODE_RECUPERATION}${brut.slice(moitie)}`;
}

/**
 * Ce que le serveur accepte, hachera, et comparera : la forme CANONIQUE.
 * Minuscules → majuscules ; séparateur, espaces et tirets saisis volent ;
 * tout caractère hors alphabet (O, I, L, U inclus) rend le code REFUSÉ —
 * la bienveillance serait une seconde vérité, on n'en veut pas.
 * Rend null pour ce qui ne peut pas être un code.
 */
export function normaliserCodeRecuperation(saisi: unknown): string | null {
  if (typeof saisi !== 'string') return null;
  const brut = saisi.toUpperCase().replace(/[\s\-.]/g, '');
  if (brut.length !== LONGUEUR_CODE_RECUPERATION) return null;
  for (const caractere of brut) {
    if (!ALPHABET_CODE_RECUPERATION.includes(caractere)) return null;
  }
  return brut;
}
