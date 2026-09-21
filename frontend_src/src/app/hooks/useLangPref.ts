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
 * LOT A6 — ce drapeau ne servait QU'À L'AFFICHAGE : les Réglages grisent la
 * langue et disent « Audio humain en préparation ». A6 s'interdisait de toucher
 * `getLangPref` / `setLangPref`, en disant que faire retomber une préférence
 * non prête est un changement de comportement, donc un lot à part.
 *
 * LOT B7 — c'est ce lot-là. Le drapeau vaut maintenant AUSSI pour le moteur :
 * une langue grisée à l'écran ne peut plus être servie au runtime vocal. Sans
 * ça les deux se contredisaient — la marchande lit « en préparation » et
 * entend autre chose — et une préférence posée avant A6 dormait encore dans le
 * `localStorage` des téléphones installés.
 *
 * CE QUE CE REPLI FAIT, ET CE QU'IL NE FAIT PAS. Il porte sur la PRÉFÉRENCE :
 * on cesse de servir une langue non prête. Il ne touche à AUCUNE donnée de
 * langue. Aucune locale n'hérite automatiquement d'une règle française, rien
 * n'est recopié dans un squelette vide : quand une langue n'a pas de
 * couverture déclarée, on le dit, on ne comble pas.
 */
export const LANGUE_PRETE: Record<AppLang, boolean> = {
  french: true,
  dioula: false,
  bambara: false,
};

export function langueDisponible(lang: AppLang): boolean {
  return LANGUE_PRETE[lang] === true;
}

/** La langue de repli : la seule déclarée prête, et la référence du catalogue. */
const LANGUE_DE_REPLI: AppLang = 'french';

/**
 * La langue RÉELLEMENT SERVIE au moteur.
 *
 * Une préférence non prête — mémorisée avant A6, ou par un chemin futur — ne
 * remonte plus : le moteur reçoit le français. Une valeur inconnue (stockage
 * corrompu, version antérieure ou postérieure) retombe au même endroit, jamais
 * sur un code de langue inventé.
 */
export function getLangPref(): AppLang {
  let brut: string | null = null;
  try { brut = localStorage.getItem('julaba_lang'); } catch { return LANGUE_DE_REPLI; }
  const lang = brut as AppLang | null;
  if (!lang || !(lang in LANGUE_PRETE)) return LANGUE_DE_REPLI;
  return langueDisponible(lang) ? lang : LANGUE_DE_REPLI;
}

/**
 * Choisir une langue. Une langue non prête n'est ni mémorisée ni activée :
 * l'écran la grise déjà (A6), le moteur dit désormais la même chose. Mémoriser
 * un choix qui n'a aucun effet serait promettre qu'il en aura un.
 */
export function setLangPref(lang: AppLang) {
  if (!langueDisponible(lang)) return;
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
