/**
 * RUNTIME I18N VOCAL — générique, pur, sans React ni DOM.
 *
 *   t('TATA_MANQUE', { montant: 500 })          → « Il manque 500 francs. »
 *   resoudreMessage('TATA_MANQUE', { montant })  → { id, locale, texte, variables, fallback }
 *   variantesIntention('INT_OUI_VALIDE')          → les variantes STT de la langue active
 *   lexique()                                     → produits, unités, nombres, monnaie
 *
 * LA LANGUE ACTIVE est un réglage fourni de l'extérieur (`definirFournisseurLocale`)
 * — jamais lue ici dans `localStorage` : ce module tourne aussi dans les tests
 * tsx et dans les modules purs de la caisse. Sans fournisseur, ou si le
 * fournisseur rend un code inconnu : `fr-ci`.
 *
 * LE REPLI EST EXPLICITE ET TRACÉ. Un message absent dans la langue demandée,
 * ou présent mais non validé pour l'argent quand il est critique, est servi
 * depuis la locale de repli (chaîne `fallback`, qui finit toujours sur
 * `fr-ci`) et CHAQUE repli passe par `surFallback` — branché sur le journal
 * d'observabilité par speakMessage.ts. Rien n'est silencieux.
 *
 * LES NOMBRES sont formatés avec `formatNombre` du manifest (fr-ci : « fr-FR »,
 * espaces insécables). L'appelant arrondit s'il arrondissait avant : ce
 * module ne change pas une valeur. Deux variables implicites viennent du
 * lexique : `{devise}` (« francs ») et `{symboleDevise}` (« F ») — la devise
 * reste dite à un seul endroit (config/devise.ts, ADR-0003).
 */
import { entreeTts, entreeIntent } from './catalog';
import { manifest, estLocaleConnue } from './registry';
import type { IntentId, Lexique, LocaleCode, ManifestLocale, MessageId, TraceFallback, VariantesIntention } from './types';
import { LOCALE_REFERENCE } from './types';

export type ValeurVariable = string | number;
export type Variables = Readonly<Record<string, ValeurVariable>>;

/** Un message résolu : ce que le rendu vocal reçoit (voir contrat-audio.ts). */
export interface MessageVocal {
  id: MessageId;
  /** Locale RÉELLEMENT servie (celle du repli, le cas échéant). */
  locale: LocaleCode;
  /** Locale demandée. */
  localeDemandee: LocaleCode;
  texte: string;
  variables: Variables;
  fallback: boolean;
}

// ── Langue active ───────────────────────────────────────────────────────────

let fournisseurLocale: (() => LocaleCode | null | undefined) | null = null;

/** Injecte la source de la langue active (préférence utilisatrice). `null` = fr-ci. */
export function definirFournisseurLocale(f: (() => LocaleCode | null | undefined) | null): void {
  fournisseurLocale = f;
}

export function localeActive(): LocaleCode {
  let code: LocaleCode | null | undefined = null;
  try { code = fournisseurLocale?.(); } catch { code = null; }
  if (!code) return LOCALE_REFERENCE;
  if (!estLocaleConnue(code)) {
    tracer({ type: 'message', id: '*', localeDemandee: code, localeServie: LOCALE_REFERENCE, raison: 'locale_inconnue' });
    return LOCALE_REFERENCE;
  }
  return code;
}

// ── Traçage des replis ──────────────────────────────────────────────────────

const abonnes = new Set<(t: TraceFallback) => void>();
/** Les derniers replis, pour les tests et le diagnostic (bornés). */
const journal: TraceFallback[] = [];
const JOURNAL_MAX = 200;

function tracer(t: TraceFallback): void {
  journal.push(t);
  if (journal.length > JOURNAL_MAX) journal.shift();
  for (const cb of abonnes) { try { cb(t); } catch { /* un observateur ne casse jamais la voix */ } }
}

/** S'abonne aux replis ; rend la fonction de désabonnement. */
export function surFallback(cb: (t: TraceFallback) => void): () => void {
  abonnes.add(cb);
  return () => { abonnes.delete(cb); };
}

export function journalFallbacks(): readonly TraceFallback[] { return journal; }
export function viderJournalFallbacks(): void { journal.length = 0; }

// ── Chaîne de repli ─────────────────────────────────────────────────────────

/** La locale demandée puis ses replis, sans boucle, jusqu'à fr-ci inclus. */
function chaine(code: LocaleCode): ManifestLocale[] {
  const out: ManifestLocale[] = [];
  const vus = new Set<LocaleCode>();
  let courant: LocaleCode | null = code;
  while (courant && !vus.has(courant)) {
    vus.add(courant);
    const m = manifest(courant);
    if (!m) break;
    out.push(m);
    courant = m.fallback;
  }
  const ref = manifest(LOCALE_REFERENCE);
  if (ref && !vus.has(LOCALE_REFERENCE)) out.push(ref);
  return out;
}

// ── Messages (TTS_OUTPUT) ───────────────────────────────────────────────────

function formaterValeur(v: ValeurVariable, m: ManifestLocale): string {
  if (typeof v === 'number') return v.toLocaleString(m.formatNombre);
  return String(v);
}

/** Remplace `{variable}` par sa valeur formatée ; une variable absente reste visible (`{x}`), jamais une exception. */
export function interpoler(template: string, vars: Variables, m: ManifestLocale): string {
  const lex = m.lexique ?? manifest(LOCALE_REFERENCE)?.lexique ?? null;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (tout, nom: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, nom)) return formaterValeur(vars[nom], m);
    if (nom === 'devise' && lex) return lex.monnaie.parlee;
    if (nom === 'symboleDevise' && lex) return lex.monnaie.symbole;
    return tout;
  });
}

/**
 * Résout un message dans une locale. Règles, dans l'ordre :
 *  1. la locale demandée a le message ET il est servable (voir `servable`) ;
 *  2. sinon chaque repli de la chaîne, tracé ;
 *  3. sinon (clé inconnue partout) : `[ID]` visible, tracé — le gate
 *     « clé orpheline » attrape ce cas avant qu'il n'atteigne un téléphone.
 */
export function resoudreMessage(id: MessageId, vars: Variables = {}, locale: LocaleCode = localeActive()): MessageVocal {
  const critique = entreeTts(id)?.critiqueArgent ?? false;
  const m0 = manifest(locale) ?? manifest(LOCALE_REFERENCE);
  const localeDemandee = m0 ? locale : LOCALE_REFERENCE;
  // Les raisons de chaque repli sont gardées jusqu'à ce qu'on sache QUI sert :
  // une trace doit nommer la locale servie, pas un « ? ».
  const replis: Array<TraceFallback['raison']> = [];
  for (const m of chaine(localeDemandee)) {
    const msg = m.messages[id];
    if (!msg) { replis.push('absent'); continue; }
    // Un message d'argent en brouillon ne sort JAMAIS : on repasse au repli, tracé.
    if (critique && (msg.validation.linguistique === 'draft' || !msg.validation.finance)) { replis.push('non_valide_finance'); continue; }
    const fallback = m.code !== localeDemandee;
    if (fallback) for (const raison of replis) tracer({ type: 'message', id, localeDemandee, localeServie: m.code, raison });
    return { id, locale: m.code, localeDemandee, texte: interpoler(msg.template, vars, m), variables: vars, fallback };
  }
  // Clé inconnue partout : visible à l'écran plutôt qu'une exception dans la caisse.
  tracer({ type: 'message', id, localeDemandee, localeServie: LOCALE_REFERENCE, raison: 'absent' });
  return { id, locale: LOCALE_REFERENCE, localeDemandee, texte: `[${id}]`, variables: vars, fallback: true };
}

/** Le texte, tout simplement. */
export function t(id: MessageId, vars: Variables = {}, locale: LocaleCode = localeActive()): string {
  return resoudreMessage(id, vars, locale).texte;
}

// ── Intentions (STT_INPUT) ──────────────────────────────────────────────────

/**
 * Les variantes STT d'une intention dans une locale. Mêmes règles de repli
 * que les messages ; en plus, une intention CRITIQUE ARGENT n'est servie
 * depuis une locale que si `validation.finance === true` — sinon on repasse au
 * repli, tracé. C'est la règle « aucune variante STT financière activée sans
 * validation explicite » (étape 6), appliquée au runtime et non seulement
 * dans un gate.
 */
export function variantesIntention(id: IntentId, locale: LocaleCode = localeActive()): { variantes: VariantesIntention; locale: LocaleCode; normaliser: (texte: string) => string } | null {
  const critique = entreeIntent(id)?.critiqueArgent ?? true;
  const m0 = manifest(locale) ?? manifest(LOCALE_REFERENCE);
  const localeDemandee = m0 ? locale : LOCALE_REFERENCE;
  const replis: Array<TraceFallback['raison']> = [];
  for (const m of chaine(localeDemandee)) {
    const it = m.intents[id];
    if (!it) { replis.push('absent'); continue; }
    if (critique && (!it.validation.finance || it.validation.linguistique === 'draft')) { replis.push('non_valide_finance'); continue; }
    if (m.code !== localeDemandee) for (const raison of replis) tracer({ type: 'intent', id, localeDemandee, localeServie: m.code, raison });
    // I18N-01 : la normalisation va AVEC les variantes. Des variantes héritées
    // de fr-ci se comparent avec la normalisation de fr-ci — jamais avec celle
    // de la locale demandée, qui n'a pas encore d'intentions validées et dont
    // la normalisation (ɛ→e, apostrophes cassées…) casserait la liste blanche.
    return { variantes: it.variantes, locale: m.code, normaliser: normaliserPour(m.code) };
  }
  tracer({ type: 'intent', id, localeDemandee, localeServie: LOCALE_REFERENCE, raison: 'absent' });
  return null;
}

/**
 * La normalisation à appliquer AVANT de comparer une phrase aux variantes
 * d'une intention : celle de la locale qui SERT les variantes. Sans variantes
 * nulle part : celle de fr-ci (rien ne sera reconnu de toute façon).
 */
export function normaliserPourIntention(id: IntentId, locale: LocaleCode = localeActive()): { locale: LocaleCode; normaliser: (texte: string) => string } {
  const v = variantesIntention(id, locale);
  if (v) return { locale: v.locale, normaliser: v.normaliser };
  return { locale: LOCALE_REFERENCE, normaliser: normaliserPour(LOCALE_REFERENCE) };
}

/**
 * Normalisation STT PROPRE à une locale (celle de fr-ci par défaut). Pour
 * comparer une phrase aux variantes d'une intention, ne pas l'appeler avec la
 * locale demandée : passer par `normaliserPourIntention`, qui rend celle de la
 * locale servie (I18N-01). Ici, on ne remonte PAS la chaîne de repli : une
 * locale sans `normaliser` propre utilise la référence, pas celle d'un repli
 * intermédiaire.
 */
export function normaliserPour(locale: LocaleCode = localeActive()): (texte: string) => string {
  return manifest(locale)?.normaliser ?? normaliserReference;
}

/**
 * Normalisation de référence : minuscules, sans accents, apostrophes
 * unifiées, ponctuation aplatie, bordée d'espaces. Identique à celle de
 * grammaireEncaissement.ts sur 576fd62 — la détection ne dépend jamais des
 * accents, irréguliers en reconnaissance vocale.
 */
export function normaliserReference(texte: string): string {
  return ` ${texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, "'")
    .replace(/[.,!;:?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/** Compile des variantes `motif` en une expression régulière — même forme que les regex historiques. */
export function compilerMotif(v: Extract<VariantesIntention, { mode: 'motif' }>): RegExp {
  const parts: string[] = [];
  if (v.mots && v.mots.length) parts.push(`\\b(${v.mots.join('|')})\\b`);
  if (v.motifs) parts.push(...v.motifs);
  return new RegExp(parts.length ? parts.join('|') : '(?!)');
}

// ── Lexique ─────────────────────────────────────────────────────────────────

export function lexique(locale: LocaleCode = localeActive()): Lexique {
  for (const m of chaine(locale)) {
    if (m.lexique) {
      if (m.code !== locale) tracer({ type: 'lexique', id: '*', localeDemandee: locale, localeServie: m.code, raison: 'absent' });
      return m.lexique;
    }
  }
  throw new Error('i18n: la locale de référence doit porter un lexique');
}
