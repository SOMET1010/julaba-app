// useLangPref.ts — Langue préférée de l'utilisateur (french/dioula/bambara)
import { useState, useCallback, useEffect } from 'react';

export type AppLang = 'french' | 'dioula' | 'bambara';

export const LANG_LABELS: Record<AppLang, string> = {
  french: 'Français',
  dioula: 'Dioula',
  bambara: 'Bambara',
};

export const LANG_FLAGS: Record<AppLang, string> = {
  french: '🇫🇷',
  dioula: '🇨🇮',
  bambara: '🌍',
};

export function getLangPref(): AppLang {
  return (localStorage.getItem('julaba_lang') as AppLang) || 'french';
}

export function setLangPref(lang: AppLang) {
  localStorage.setItem('julaba_lang', lang);
  // Bridge i18next (INIT-020) : synchronise l'instance i18next + `<html lang>`.
  // Import dynamique pour casser la dépendance circulaire potentielle
  // (i18n/config.ts importe useLangPref pour le type AppLang ; on évite
  // l'import statique croisé).
  import('../i18n/config')
    .then(({ appliquerLangueI18n }) => appliquerLangueI18n(lang))
    .catch(() => { /* i18n non initialisé (boot asynchrone) — ignore */ });
  window.dispatchEvent(new CustomEvent('julaba:lang-change', { detail: lang }));
}

export function useLangPref() {
  const [lang, setLangState] = useState<AppLang>(getLangPref);

  // Sync temps réel entre tous les composants
  useEffect(() => {
    const handler = (e: Event) => {
      setLangState((e as CustomEvent<AppLang>).detail);
    };
    window.addEventListener('julaba:lang-change', handler);
    return () => window.removeEventListener('julaba:lang-change', handler);
  }, []);

  const setLang = useCallback((newLang: AppLang) => {
    setLangPref(newLang);
    setLangState(newLang);
  }, []);

  return { lang, setLang };
}
