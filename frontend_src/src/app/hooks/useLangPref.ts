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
