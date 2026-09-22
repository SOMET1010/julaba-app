/**
 * ÉNONCÉ D'ARGENT — la couche STRUCTURÉE de la parole financière.
 * Module PUR, sans React ni DOM, testable au tsx.
 *
 * ── LE DÉFAUT QUI A FAIT NAÎTRE CE FICHIER (22/09/2026, sur un vrai APK) ───
 *
 *   Patrick, à la caisse : « 3000, elle dit *trois zéro zéro zéro francs* ».
 *
 * La cause tenait en une ligne : le runtime i18n formatait TOUT nombre avec
 * `toLocaleString('fr-FR')`, ce qui produit `3 000` — avec une ESPACE FINE
 * INSÉCABLE (U+202F, code 8239) entre le 3 et les zéros. Parfait pour l'œil.
 * Pour le moteur de synthèse, c'est « 3 » puis « 000 » : il épelle.
 *
 * LA MÊME CHAÎNE SERVAIT À L'ŒIL ET À L'OREILLE. Ce n'était pas un problème
 * dioula : c'était en français, sur l'APK livré, sur TOUS les montants. Une
 * marchande qui ne lit pas ne pouvait donc pas vérifier son total à l'oreille
 * — la fonction même du produit.
 *
 * ── LA DÉCISION (Patrick, mot pour mot) ───────────────────────────────────
 *
 *   « Pour l'argent, on doit arrêter de raisonner en *phrase traduite*.
 *     Construis une couche structurée dédiée : `MoneyUtterance`, avec au
 *     minimum `amount`, `currency`, `semanticUnit`, `locale`, `source`.
 *     La synthèse doit partir de cette représentation structurée et non d'un
 *     nombre nu. »
 *
 *   « Un nombre mandingue nu ne doit jamais obliger l'aval à deviner franc vs
 *     dɔrɔmɛ. »
 *
 * D'où la règle d'API de ce module, et c'est TOUTE sa raison d'être :
 *
 *   { amount: 5000, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'dyu' }
 *       → une forme parlée déterministe
 *   { amount: 5000 }
 *       → REFUSÉ pour une sortie vocale d'argent
 *
 * Le refus n'est pas une convention qu'il faut se rappeler : la forme parlée
 * n'accepte QUE `MoneyUtterance`, et le seul chemin qui mène d'un nombre nu à
 * un `MoneyUtterance` est `resoudreMontant`, qui rend un `Parsed` — donc une
 * union discriminée dont la branche non résolue N'A PAS de `.value`.
 *
 * ── RÉUTILISATION, PAS UN SECOND JEU DE TYPES ─────────────────────────────
 *
 * `SemanticLoss` et `Parsed<T>` existent déjà (`voice-offline/perteSemantique`)
 * et portent exactement cette sémantique — dont `UNIT_MISSING`, écrit le
 * 21/09/2026 pour « le nombre qui ne disait pas s'il était en francs ou en
 * dɔrɔmɛ ». `ResolvedMoney` n'est donc pas un type neuf : c'est
 * `Parsed<MoneyUtterance>`, et l'invariant adopté s'y lit tel quel :
 *
 *   type ResolvedMoney =
 *     | { resolved: true;  value: MoneyUtterance }
 *     | { resolved: false; loss: SemanticLoss; candidates: readonly MoneyUtterance[] };
 *
 * ── CE QUE CE MODULE NE FAIT PAS ──────────────────────────────────────────
 *
 * Il ne traduit rien. Il ne connaît aucune des 124 clés d'argent manquantes en
 * dioula et n'en remplit aucune : la décision est précisément d'arrêter de
 * boucher les trous un par un. Il produit, à partir d'UNE source, DEUX formes
 * distinctes — l'écran ne bouge pas d'un pixel, c'est la voix qui cesse
 * d'emprunter la forme écrite.
 */
import { type Parsed, type SemanticLoss, perdu, resolu } from '../../../voice-offline/perteSemantique';

// ── La représentation structurée ────────────────────────────────────────────

/** Code ISO 4217. Le pilote ne connaît que le franc CFA d'Afrique de l'Ouest. */
export type Devise = 'XOF';

/**
 * L'UNITÉ SÉMANTIQUE — ce que le nombre COMPTE, et c'est elle qui manquait.
 *  - `franc_cfa` : le nombre est en francs CFA ;
 *  - `dorome`    : le nombre est en dɔrɔmɛ, l'unité orale du marché (1 dɔrɔmɛ
 *                  = 5 FCFA). « dɔrɔmɛ kɛmɛ » = 100 dɔrɔmɛ = 500 F, et au
 *                  marché le mot est le plus souvent OMIS.
 * Il n'y a pas de troisième valeur, et surtout pas de valeur « par défaut » :
 * l'absence d'unité n'est pas une unité, c'est une PERTE (`UNIT_MISSING`).
 */
export type UniteSemantique = 'franc_cfa' | 'dorome';

/** Combien vaut une unité sémantique en francs CFA. */
export const FACTEUR_EN_FRANCS: Readonly<Record<UniteSemantique, number>> = {
  franc_cfa: 1,
  dorome: 5,
};

/** D'où vient ce montant — tracé dans le journal, jamais deviné. */
export type SourceMontant =
  | 'catalogue-i18n'   // une variable d'un message TTS critiqueArgent
  | 'dictee'           // un montant entendu
  | 'saisie'           // un montant touché ou tapé
  | 'reference';       // un cas de référence (tests, documentation)

/**
 * L'ÉNONCÉ D'ARGENT. Cinq champs, tous obligatoires : c'est le contrat.
 * Le nom anglais est celui que Patrick a posé — on ne le renomme pas.
 */
export interface MoneyUtterance {
  /** La valeur, EXPRIMÉE DANS `semanticUnit` (pas toujours en francs). */
  readonly amount: number;
  readonly currency: Devise;
  readonly semanticUnit: UniteSemantique;
  /** La langue dans laquelle cet énoncé sera dit. */
  readonly locale: string;
  readonly source: SourceMontant;
}

/**
 * L'invariant déjà adopté, écrit avec les types qui existent :
 * `Parsed<MoneyUtterance>` EST exactement l'union demandée.
 */
export type ResolvedMoney = Parsed<MoneyUtterance>;

/** Ce qu'on sait d'un montant avant de savoir s'il est dicible. */
export interface MontantBrut {
  readonly amount: number;
  readonly currency?: Devise;
  /** ABSENTE = perte. On ne met pas `'franc_cfa'` par défaut : ce serait deviner. */
  readonly semanticUnit?: UniteSemantique;
  readonly locale?: string;
  readonly source?: SourceMontant;
}

/**
 * LE SEUL PASSAGE d'un nombre vers un énoncé dicible.
 *
 * Sans `semanticUnit`, il ne rend PAS un énoncé : il rend une perte
 * `UNIT_MISSING` et les DEUX lectures possibles du même nombre — francs et
 * dɔrɔmɛ — pour que l'aval puisse POSER LA QUESTION plutôt que choisir.
 * C'est la même discipline que les nombres mandingues : la grammaire tranche,
 * sinon on demande.
 */
export function resoudreMontant(brut: MontantBrut): ResolvedMoney {
  const currency: Devise = brut.currency ?? 'XOF';
  const locale = brut.locale ?? 'fr-ci';
  const source: SourceMontant = brut.source ?? 'catalogue-i18n';
  if (!Number.isFinite(brut.amount)) {
    return perdu<MoneyUtterance>({ kind: 'UNIT_MISSING' }, []);
  }
  if (brut.semanticUnit === undefined) {
    return perdu<MoneyUtterance>({ kind: 'UNIT_MISSING' }, [
      { amount: brut.amount, currency, semanticUnit: 'franc_cfa', locale, source },
      { amount: brut.amount, currency, semanticUnit: 'dorome', locale, source },
    ]);
  }
  return resolu<MoneyUtterance>({ amount: brut.amount, currency, semanticUnit: brut.semanticUnit, locale, source });
}

/** La valeur en FRANCS d'un énoncé, quelle que soit son unité orale. */
export function enFrancs(m: MoneyUtterance): number {
  return Math.round(m.amount * FACTEUR_EN_FRANCS[m.semanticUnit]);
}

/** Vrai quand la perte est celle qui nous occupe : l'unité absente. */
export function estUniteAbsente(loss: SemanticLoss): boolean {
  return loss.kind === 'UNIT_MISSING';
}
