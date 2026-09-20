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

/** Une langue n'est activable que lorsque TOUS les textes actifs disposent de
 * leur audio humain validé et embarqué. Les parseurs et traductions de travail
 * ne constituent pas une langue produit disponible. */
export const LANGUE_PRETE: Record<AppLang, boolean> = {
  french: true,
  dioula: false,
  bambara: false,
};

export function langueDisponible(lang: AppLang): boolean {
  return LANGUE_PRETE[lang] === true;
}

export function getLangPref(): AppLang {
  const memorisee = localStorage.getItem('julaba_lang') as AppLang | null;
  return memorisee && langueDisponible(memorisee) ? memorisee : 'french';
}

export function setLangPref(lang: AppLang) {
  if (!langueDisponible(lang)) return false;
  localStorage.setItem('julaba_lang', lang);
  window.dispatchEvent(new CustomEvent('julaba:lang-change', { detail: lang }));
  return true;
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
    if (setLangPref(newLang)) setLangState(newLang);
  }, []);

  return { lang, setLang };
}
