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

/**
 * Une langue n'est ANNONCÉE DISPONIBLE que lorsque son audio humain est validé
 * et embarqué. Un parseur, une traduction de travail ou un corpus en brouillon
 * ne font pas une langue de produit : la marchande qui la choisirait entendrait
 * du français avec un accent de repli, ou rien.
 *
 * LOT A6 — ce drapeau ne sert aujourd'hui QU'À L'AFFICHAGE : les Réglages
 * grisent la langue et disent « Audio humain en préparation ». Il ne touche ni
 * `getLangPref` ni `setLangPref` : une préférence déjà mémorisée reste active
 * telle quelle. Faire retomber une préférence non prête sur le français est un
 * changement de comportement, donc un lot à part (catégorie B de
 * docs/manus/RECUPERATION-MANUS.md).
 */
export const LANGUE_PRETE: Record<AppLang, boolean> = {
  french: true,
  dioula: false,
  bambara: false,
};

export function langueDisponible(lang: AppLang): boolean {
  return LANGUE_PRETE[lang] === true;
}

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
