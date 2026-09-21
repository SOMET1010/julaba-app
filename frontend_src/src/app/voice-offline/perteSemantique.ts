/**
 * PERTE SÉMANTIQUE — règle d'architecture de JÙLABA.
 * Module PUR, sans React ni DOM, testable au tsx.
 *
 * ── LA RÈGLE (Patrick, 21/09/2026) ────────────────────────────────────────
 *
 *   « Toute information qui a une incidence sur l'argent doit être soit
 *     CONSERVÉE, soit EXPLICITEMENT MARQUÉE COMME PERDUE ; jamais
 *     reconstruite implicitement en aval. »
 *
 * Ce n'est pas une règle abstraite : c'est la formulation générale de QUATRE
 * défauts constatés le même jour, qui étaient quatre fois la MÊME faute — une
 * transformation perd du sens et cache la perte :
 *
 *   1. l'unité de vente qui ne voyageait pas avec la ligne ;
 *   2. le montant qui ne disait pas s'il était unitaire ou total ;
 *   3. le nombre qui ne disait pas s'il était en francs ou en dɔrɔmɛ ;
 *   4. la normalisation qui efface les tons (`tà` → `ta`, et `ta` vaut 10).
 *
 * ── CE QUE LE CONTRAT IMPOSE ──────────────────────────────────────────────
 *
 *   « La perte de sens doit devenir impossible à ignorer dans les types et
 *     dans le build. Une fonction de normalisation qui supprime un ton, une
 *     unité ou une relation ne devrait JAMAIS pouvoir retourner le même type
 *     qu'une transformation sans perte. »
 *
 * D'où `Parsed<T>`, et le choix — délibéré — d'une UNION DISCRIMINÉE plutôt
 * que d'un `{ value, loss }` à deux champs. Avec deux champs côte à côte, on
 * peut lire `.value` en ignorant `.loss` : c'est exactement le
 * `default: return value` refusé pour la monnaie, sous un autre visage.
 * Ici, sur la branche non résolue, **`.value` N'EXISTE PAS**. Le compilateur
 * oblige à traiter la perte avant d'atteindre la valeur. Ce n'est plus une
 * discipline qu'il faut se rappeler, c'est une impossibilité.
 *
 * ── LA RÈGLE D'APPEL, QUI EST LE CŒUR ─────────────────────────────────────
 *
 *   « AUCUNE FONCTION FINANCIÈRE NE DEVRAIT ACCEPTER DIRECTEMENT UN TYPE
 *     PORTEUR DE PERTE ; elle devrait exiger un type DÉJÀ RÉSOLU. »
 *
 * Les signatures du chemin d'argent prennent `T`, jamais `Parsed<T>`. Le
 * passage de l'un à l'autre est un ACTE EXPLICITE — une résolution, ou une
 * question posée à la marchande. Jamais un accès de champ.
 *
 * Si vous cherchez à « simplifier » ce fichier : relisez les quatre défauts
 * ci-dessus. Chacun a coûté de l'argent faux, et chacun avait l'air inoffensif.
 */

/** Ce qu'une transformation a détruit. `NONE` = elle n'a rien détruit. */
export type SemanticLoss =
  | { readonly kind: 'NONE' }
  /** Un ton a été rabattu ; `candidates` dit sur quoi, et ce que ça pouvait être. */
  | { readonly kind: 'TONE_DROPPED'; readonly candidates: readonly string[] }
  /** Un nombre sans unité : francs ou dɔrɔmɛ, on ne sait pas. */
  | { readonly kind: 'UNIT_MISSING' }
  /** Un montant dont on ignore s'il est unitaire ou total. */
  | { readonly kind: 'ROLE_AMBIGUOUS' };

/**
 * Le porteur. Sur `resolved: false`, il n'y a PAS de `.value` — seulement la
 * perte et les lectures possibles. C'est toute la garantie.
 */
export type Parsed<T> =
  | { readonly resolved: true; readonly value: T }
  | { readonly resolved: false; readonly loss: SemanticLoss; readonly candidates: readonly T[] };

/** Rien n'a été perdu. */
export function resolu<T>(value: T): Parsed<T> {
  return { resolved: true, value };
}

/** Quelque chose a été perdu, et on le dit. */
export function perdu<T>(loss: SemanticLoss, candidates: readonly T[]): Parsed<T> {
  return { resolved: false, loss, candidates };
}

/**
 * Le SEUL passage de `Parsed<T>` à `T`, et il est explicite.
 * Rend `null` quand la perte n'a pas été traitée : pas de repli, pas de
 * « premier candidat par défaut ». Choisir un candidat est une décision, et
 * une décision se prend en demandant — pas en lisant un champ.
 */
export function valeurResolue<T>(p: Parsed<T>): T | null {
  return p.resolved ? p.value : null;
}

/**
 * Résout en NOMMANT le candidat retenu — après une question posée, jamais
 * d'office. Rend `null` si le candidat proposé n'est pas l'un de ceux que la
 * transformation avait listés : on ne résout pas vers une valeur inventée.
 */
export function resoudreAvecCandidat<T>(p: Parsed<T>, choisi: T, egal: (a: T, b: T) => boolean = Object.is): T | null {
  if (p.resolved) return p.value;
  return p.candidates.some(c => egal(c, choisi)) ? choisi : null;
}

/** Vrai si la valeur est utilisable telle quelle par une fonction financière. */
export function estResolu<T>(p: Parsed<T>): p is { resolved: true; value: T } {
  return p.resolved;
}
