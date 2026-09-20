/**
 * REGISTRE DES LANGUES — la seule table qui connaît les codes de locale.
 *
 * Aucun composant métier n'importe ce fichier pour lire un code : il passe
 * par `runtime.ts` (`t`, `localeActive`, `variantesIntention`), qui interroge
 * le registre. Ajouter une langue = ajouter un manifest ici (voir
 * docs/langues/AJOUTER-UNE-LANGUE.md), rien d'autre dans le code métier.
 *
 * CODES PROVISOIRES. `LOCALES_PROVISOIRES` dit, pour chaque code, ce qu'on
 * sait : un ISO 639-3 quand la langue en a un et qu'aucune variété n'est à
 * trancher ; sinon un marqueur de travail, explicitement `provisoire: true`.
 * On ne fige rien de faux : la décision appartient à Patrick et Manus.
 */
import type { LocaleCode, ManifestLocale } from './types';
import { LOCALE_REFERENCE } from './types';
import { FR_CI } from './locales/fr-ci';
import { DYU_CI } from './locales/dyu-ci';
import { BCI } from './locales/bci';
import { ANY } from './locales/any';

const REGISTRE = new Map<LocaleCode, ManifestLocale>();

/** Enregistre (ou remplace) un manifest. Le code doit être non vide ; `fr-ci` doit rester sans repli. */
export function enregistrerLocale(manifest: ManifestLocale): void {
  if (!manifest.code || !manifest.code.trim()) throw new Error('i18n: un manifest de langue doit porter un code');
  if (manifest.code === LOCALE_REFERENCE && manifest.fallback) throw new Error('i18n: la locale de référence ne peut pas avoir de repli');
  REGISTRE.set(manifest.code, manifest);
}

export function manifest(code: LocaleCode): ManifestLocale | undefined {
  return REGISTRE.get(code);
}

export function codesLocales(): LocaleCode[] {
  return [...REGISTRE.keys()];
}

export function estLocaleConnue(code: LocaleCode): boolean {
  return REGISTRE.has(code);
}

/**
 * Codes de travail des langues visées (Patrick, 20/09/2026), avec ce qu'on en
 * sait. `iso639_3: null` = plusieurs variétés, non tranché. Tous sont
 * PROVISOIRES tant que Patrick et Manus n'ont pas confirmé : aucun code n'est
 * lu par la logique métier, changer un code est une opération de données.
 */
export const LOCALES_PROVISOIRES: ReadonlyArray<{ code: LocaleCode; nom: string; iso639_3: string | null; note: string }> = [
  { code: 'fr-ci', nom: 'Français (marché ivoirien)', iso639_3: 'fra', note: 'Référence et repli. Le texte servi est celui du code aujourd\'hui (frActuel).' },
  { code: 'dyu-ci', nom: 'Dioula', iso639_3: 'dyu', note: 'Le parseur de nombres bambara existant (voice-offline/nombresBambara.ts) est déclaré comme base, non validé.' },
  { code: 'bci', nom: 'Baoulé', iso639_3: 'bci', note: '' },
  { code: 'any', nom: 'Agni', iso639_3: 'any', note: '' },
  { code: 'bete', nom: 'Bété', iso639_3: null, note: 'Variétés de Gagnoa (btg), Daloa (bev), Guibéroua (bet) : à trancher.' },
  { code: 'adj', nom: 'Adioukrou', iso639_3: 'adj', note: '' },
  { code: 'ebr', nom: 'Ébrié', iso639_3: 'ebr', note: '' },
  { code: 'ati', nom: 'Attié / Akyé', iso639_3: 'ati', note: '' },
  { code: 'abu', nom: 'Abouré', iso639_3: 'abu', note: 'Code à confirmer.' },
  { code: 'senoufo', nom: 'Sénoufo', iso639_3: null, note: 'Variétés cebaara (sef), nyarafolo (sev), tagwana (tgw)… : une locale PAR variété retenue, codes à trancher.' },
  { code: 'we', nom: 'Wê / Guéré', iso639_3: null, note: 'Guéré (gxx) / wobé (wob) : à trancher.' },
  { code: 'dan', nom: 'Dan / Yacouba', iso639_3: null, note: 'Dan (dnj) et variétés : à trancher.' },
  { code: 'abr', nom: 'Abron', iso639_3: 'abr', note: '' },
  { code: 'kou', nom: 'Koulango', iso639_3: null, note: 'Koulango de Bouna (nku) / Bondoukou (kzc) : à trancher.' },
  { code: 'lobi', nom: 'Lobi', iso639_3: null, note: 'Lobi (lob) et parlers voisins : à trancher.' },
  { code: 'dida', nom: 'Dida', iso639_3: null, note: 'Dida de Lakota (dic) / Yocoboué (gud) : à trancher.' },
  { code: 'goa', nom: 'Gouro', iso639_3: 'goa', note: '' },
  { code: 'avi', nom: 'Avikam', iso639_3: 'avi', note: '' },
  { code: 'abi', nom: 'Abidji', iso639_3: 'abi', note: '' },
  { code: 'ald', nom: 'Alladian', iso639_3: 'ald', note: '' },
  { code: 'bm', nom: 'Bambara', iso639_3: 'bam', note: 'Déjà proposé dans l\'application (useLangPref) ; pas dans la liste ivoirienne de Patrick.' },
];

/**
 * Préférence de langue existante (hooks/useLangPref.ts : 'french' | 'dioula' |
 * 'bambara') → code de locale. C'est la seule passerelle entre l'ancien
 * réglage et le registre ; elle vit ici pour que le runtime n'apprenne rien
 * sur `localStorage`.
 */
export const LOCALE_PAR_PREFERENCE: Readonly<Record<string, LocaleCode>> = {
  french: 'fr-ci',
  dioula: 'dyu-ci',
  bambara: 'bm',
};

// Manifests livrés : la référence, puis les squelettes vides (tout retombe sur
// fr-ci, tracé). Les autres langues visées n'ont pas encore de manifest —
// c'est volontaire : un squelette de plus n'apporte rien tant que Manus n'a
// rien à y mettre, et le registre accepte un manifest à tout moment.
enregistrerLocale(FR_CI);
enregistrerLocale(DYU_CI);
enregistrerLocale(BCI);
enregistrerLocale(ANY);
