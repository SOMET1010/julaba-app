/**
 * DEUX FORMES, UNE SEULE SOURCE — l'écran et l'oreille cessent de partager
 * la même chaîne. Module PUR, sans React ni DOM, testable au tsx.
 *
 *   forme écran  ← `3 000 F`            (U+202F entre 3 et 000 : l'œil lit vite)
 *   forme parlée ← « trois mille francs » (le moteur n'a plus rien à épeler)
 *
 * Les deux sont DÉRIVÉES du même `MoneyUtterance`. Ni l'une ni l'autre n'est
 * calculée à partir de l'autre : c'est précisément ce qu'on arrête de faire.
 * L'affichage ne change pas d'un pixel — `formeEcran` reproduit exactement
 * `toLocaleString(formatNombre)` + le symbole, ce que le runtime faisait déjà.
 *
 * ── POURQUOI ÉCRIRE LES NOMBRES EN LETTRES ────────────────────────────────
 *
 * Parce qu'aucun moteur de synthèse embarqué ne garantit la lecture d'un
 * groupe de chiffres, et qu'on ne peut pas tester un moteur qu'on ne contrôle
 * pas sur un téléphone qu'on n'a pas. « trois mille » ne peut se lire que
 * d'une façon. C'est déterministe, c'est testable ici, et ça ne dépend plus
 * de la locale ICU ni de l'appareil.
 *
 * ── LES PIÈGES DU FRANÇAIS, TOUS TESTÉS ───────────────────────────────────
 *
 *   80    → « quatre-vingts »        (s final quand rien ne suit)
 *   81    → « quatre-vingt-un »      (pas de s, pas de « et »)
 *   71    → « soixante et onze »     (le seul « et » au-dessus de 70)
 *   100   → « cent »                 (jamais « un cent »)
 *   200   → « deux cents »           (s quand rien ne suit)
 *   201   → « deux cent un »         (pas de s quand quelque chose suit)
 *   1000  → « mille »                (jamais « un mille », et invariable)
 *   80000 → « quatre-vingt mille »   (ni s à vingt, ni s à cent devant mille)
 *
 * ── LE DƆRƆMƐ ────────────────────────────────────────────────────────────
 *
 * Un énoncé en dɔrɔmɛ se dit en dɔrɔmɛ ET donne son équivalent en francs.
 * Au marché le mot est le plus souvent omis, donc « mugan » vaut 20 F ou
 * 100 F ; une voix qui dirait seulement « vingt » laisserait l'aval deviner.
 * Ici l'unité est toujours prononcée, parce qu'elle est toujours dans le type.
 */
import { enFrancs, type MoneyUtterance } from './enonceArgent';

// ── Nombres français en toutes lettres ──────────────────────────────────────

const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
] as const;

const DIZAINES: Readonly<Record<number, string>> = {
  2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante', 8: 'quatre-vingt',
};

/** 0 → 99. */
function moinsDeCent(n: number): string {
  if (n < 17) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  // 70–79 et 90–99 se composent sur 60 et 80, avec la dizaine suivante.
  if (d === 7 || d === 9) {
    if (d === 7 && u === 1) return 'soixante et onze';
    return `${d === 7 ? 'soixante' : 'quatre-vingt'}-${moinsDeCent(10 + u)}`;
  }
  if (u === 0) return d === 8 ? 'quatre-vingts' : DIZAINES[d];
  // « quatre-vingt-un », jamais « quatre-vingt et un » : 80 est le seul palier
  // sans « et ».
  if (u === 1 && d !== 8) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

/** 0 → 999. */
function moinsDeMille(n: number): string {
  if (n < 100) return moinsDeCent(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (r === 0) return c === 1 ? 'cent' : `${UNITES[c]} cents`;
  return `${c === 1 ? 'cent' : `${UNITES[c]} cent`} ${moinsDeCent(r)}`;
}

/**
 * « cents » et « quatre-vingts » perdent leur s devant `mille`, qui n'est pas
 * un nom : « deux cent mille », « quatre-vingt mille ». La règle ne touche que
 * ces deux mots — `trois` garde son s.
 */
function devantMille(s: string): string {
  return s.replace(/(cent|quatre-vingt)s$/, '$1');
}

/**
 * Un entier en toutes lettres, en français. Déterministe, sans ICU, sans
 * dépendance à l'appareil. Arrondi comme le fait déjà le chemin d'argent
 * (les montants XOF sont entiers).
 */
export function nombreEnMotsFr(valeur: number): string {
  if (!Number.isFinite(valeur)) return String(valeur);
  const n = Math.round(valeur);
  if (n < 0) return `moins ${nombreEnMotsFr(-n)}`;
  if (n < 1000) return moinsDeMille(n);
  if (n < 1_000_000) {
    const m = Math.floor(n / 1000);
    const r = n % 1000;
    const tete = m === 1 ? 'mille' : `${devantMille(moinsDeMille(m))} mille`;
    return r === 0 ? tete : `${tete} ${moinsDeMille(r)}`;
  }
  const millions = Math.floor(n / 1_000_000);
  const reste = n % 1_000_000;
  const tete = millions === 1 ? 'un million' : `${moinsDeMille(millions)} millions`;
  return reste === 0 ? tete : `${tete} ${nombreEnMotsFr(reste)}`;
}

// ── Les deux formes ─────────────────────────────────────────────────────────

/** Comment la langue nomme sa monnaie — fourni par le lexique de la locale. */
export interface MotsMonnaie {
  /** Forme DITE (« francs »). */
  parlee: string;
  /** Symbole AFFICHÉ (« F »). */
  symbole: string;
  /** Étiquette BCP-47 du formatage écrit (« fr-FR »). */
  formatNombre: string;
  /** Formes DITES de l'unité orale locale (« dɔrɔmɛ »), s'il y en a une. */
  uniteOraleParlee?: string;
}

/** Le singulier quand il n'y en a qu'un : « un franc », pas « un francs ». */
function accorder(mot: string, quantite: number): string {
  return Math.abs(quantite) === 1 ? mot.replace(/s$/, '') : mot;
}

/**
 * LA FORME ÉCRAN — inchangée, au caractère près, y compris l'espace fine
 * insécable U+202F. C'est elle qu'on garde : elle est bonne pour l'œil.
 */
export function formeEcran(m: MoneyUtterance, mots: MotsMonnaie): string {
  const symbole = m.semanticUnit === 'dorome' ? (mots.uniteOraleParlee ?? 'dɔrɔmɛ') : mots.symbole;
  return `${m.amount.toLocaleString(mots.formatNombre)} ${symbole}`;
}

/**
 * LA FORME PARLÉE — bâtie sur l'énoncé structuré, jamais sur la forme écran.
 *
 * `avecUnite: false` quand le gabarit du message dit déjà la devise juste
 * après la variable (« Elle doit {total} {devise} ») : on ne la répète pas.
 * L'unité reste néanmoins DANS le type — c'est elle qui a choisi les mots.
 */
export function formeParlee(m: MoneyUtterance, mots: MotsMonnaie, options?: { avecUnite?: boolean }): string {
  const avecUnite = options?.avecUnite ?? true;
  const chiffres = nombreEnMotsFr(m.amount);
  if (m.semanticUnit === 'dorome') {
    // Le dɔrɔmɛ se dit TOUJOURS avec son équivalent en francs : c'est le seul
    // moyen qu'une marchande et une cliente parlent du même montant.
    const francs = nombreEnMotsFr(enFrancs(m));
    const unite = mots.uniteOraleParlee ?? 'dɔrɔmɛ';
    return `${chiffres} ${unite}, c'est-à-dire ${francs} ${accorder(mots.parlee, enFrancs(m))}`;
  }
  return avecUnite ? `${chiffres} ${accorder(mots.parlee, m.amount)}` : chiffres;
}
