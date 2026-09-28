/**
 * i18n/config.ts — Configuration i18next pour JULABA.
 *
 * Trois langues sont exposées par `useLangPref` (`french` / `dioula` /
 * `bambara`). Jusqu'à INIT-020, les chaînes UI étaient hardcodées en
 * français ; ce module initialise i18next avec :
 *
 * - `fr` (alias `french`) : source de vérité, extraite des écrans existants.
 * - `dioula` : PLACEHOLDER — à traduire par un locuteur natif.
 * - `bambara` : PLACEHOLDER — à traduire par un locuteur natif.
 *
 * Le fallback est `fr` : tant que les traductions bambara/dioula ne sont pas
 * finalisées, l'interface reste lisible pour la marchande (en français).
 *
 * Bridge avec `useLangPref` : `appliquerLangueI18n(lang)` synchronise i18next
 * avec la préférence utilisateur (et met à jour `<html lang="…">`).
 *
 * TS strict : aucun `any`. Les types `AppLang` et `Resource` sont explicites.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { AppLang } from '../hooks/useLangPref';

import fr from './locales/fr.json';
import dioula from './locales/dioula.json';
import bambara from './locales/bambara.json';

// Alias nommés pour le shorthand `RESSOURCES_I18N` ci-dessous : on aligne
// les noms sur les valeurs `AppLang` (`french` / `dioula` / `bambara`) pour
// que `i18n.changeLanguage('french')` resolve bien les ressources.
const french = fr;

/** Code langue i18next (= valeurs de `AppLang` : `french`/`dioula`/`bambara`). */
export type I18nLang = AppLang;

/** Langue source = fallback si une clé manque dans la langue active. */
export const LANG_SOURCE: I18nLang = 'french';

/** Langues supportées par l'interface. */
export const LANGUES_SUPPORTÉES: readonly I18nLang[] = ['french', 'dioula', 'bambara'] as const;

/** Map AppLang → code ISO 639 pour l'attribut `<html lang="…">`. */
export const LANG_VERS_HTML: Record<I18nLang, string> = {
  french: 'fr',
  dioula: 'dyu',
  bambara: 'bm',
};

/** Ressources embarquées (3 fichiers JSON). */
export const RESSOURCES_I18N = {
  french,
  dioula,
  bambara,
} as const;

/**
 * Initialise i18next. Appelé une seule fois au boot de l'app (voir `App.tsx`
 * qui consomme `i18nPromise`).
 */
export function initI18n(): typeof i18n {
  // Langue initiale = préférence persistée dans `localStorage` par `useLangPref`.
  const langInitiale = (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('julaba_lang') as I18nLang | null)
    : null) ?? LANG_SOURCE;

  // Garde-fou : si la valeur persistée est corrompue, on retombe sur `fr`.
  const langSûre: I18nLang = LANGUES_SUPPORTÉES.includes(langInitiale) ? langInitiale : LANG_SOURCE;

  void i18n.use(initReactI18next).init({
    resources: RESSOURCES_I18N,
    lng: langSûre,
    fallbackLng: LANG_SOURCE,
    supportedLngs: LANGUES_SUPPORTÉES as unknown as string[],
    // React échappe déjà les valeurs interpolées → pas de double échappement.
    interpolation: { escapeValue: false },
    // Clé manquante → on log en dev uniquement (pas de bruit en prod).
    saveMissing: false,
    returnNull: false,
    returnEmptyString: false,
  });

  // Synchronise `<html lang="…">` dès le boot (a11y — screen readers).
  appliquerHtmlLang(langSûre);

  return i18n;
}

/** Instance i18next initialisée (lazy — évite un side-effect au simple import). */
let i18nInstance: typeof i18n | null = null;

/**
 * Retourne l'instance i18next initialisée. L'init est SYNCHRONE (pas de
 * backend HTTP — les 3 locales sont embarquées en statique), on peut donc
 * appeler cette fonction au module-load et passer le résultat à
 * `I18nextProvider` dès le premier render.
 */
export function getI18nInstance(): typeof i18n {
  if (i18nInstance) return i18nInstance;
  i18nInstance = initI18n();
  return i18nInstance;
}

/** Alias — conservé pour la symétrie avec un éventuel backend async futur. */
export function i18nPromise(): Promise<typeof i18n> {
  return Promise.resolve(getI18nInstance());
}

/**
 * Synchronise la langue active d'i18next avec `useLangPref`.
 *
 * À appeler dans `useLangPref.setLang` (bridge).
 *
 * - Met à jour `i18n.changeLanguage(lang)`.
 * - Met à jour `<html lang="…">` (codes ISO 639-3 pour dioula/bambara).
 */
export function appliquerLangueI18n(lang: AppLang): void {
  try {
    void i18n.changeLanguage(lang);
  } catch {
    /* ignore — i18n non initialisé (boot asynchrone) */
  }
  appliquerHtmlLang(lang);
}

/** Met à jour `<html lang="…">` selon la langue active. */
function appliquerHtmlLang(lang: AppLang): void {
  if (typeof document === 'undefined') return;
  const code = LANG_VERS_HTML[lang] ?? 'fr';
  document.documentElement.lang = code;
}

export default i18n;
