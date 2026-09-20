/**
 * speakMessage — le point d'entrée des ÉCRANS vers la voix par clé.
 *
 *   const speakMessage = useSpeakMessage();
 *   speakMessage('TATA_MANQUE', { montant: 500 });
 *
 * Il fait UNE chose : résoudre la clé dans la langue active (repli tracé vers
 * fr-ci), puis remettre `{ id, locale, texte, variables }` au rendu vocal
 * enregistré (contrat-audio.ts), dont le défaut est le `speak` existant
 * d'AppContext — que ce module APPELLE sans le modifier (il appartient à
 * l'agent E, qui l'instrumente en amont).
 *
 * C'est aussi ici, et seulement ici, que la couche i18n apprend deux choses
 * de l'application : la préférence de langue (hooks/useLangPref.ts, via
 * `LOCALE_PAR_PREFERENCE`) et le journal de VOIX du lot E (utils/voiceTrace.ts,
 * en anneau, survit au redémarrage, inclus dans le « Rapport de test ») où
 * chaque repli est écrit sous `I18N_FALLBACK`. Le runtime, lui, reste pur.
 */
import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getLangPref } from '../../hooks/useLangPref';
import { info as tracerVoix } from '../../utils/voiceTrace';
import { rendreMessage, type DireTexte } from './contrat-audio';
import { LOCALE_PAR_PREFERENCE } from './registry';
import { definirFournisseurLocale, resoudreMessage, surFallback, type MessageVocal, type Variables } from './runtime';
import type { MessageId } from './types';

// La langue active suit la préférence existante ; hors navigateur (tests),
// `getLangPref` jette et on reste sur fr-ci.
definirFournisseurLocale(() => {
  try { return LOCALE_PAR_PREFERENCE[getLangPref()] ?? null; } catch { return null; }
});

// Chaque repli va au journal de voix (« Rapport de test » de Patrick).
surFallback((trace) => tracerVoix('I18N_FALLBACK', { ...trace }));

export type SpeakMessage = (id: MessageId, vars?: Variables) => MessageVocal;

/** Construit un `speakMessage` au-dessus d'une fonction qui dit un texte. Rend le message résolu (utile pour « réécouter »). */
export function creerSpeakMessage(direTexte: DireTexte): SpeakMessage {
  return (id, vars = {}) => {
    const message = resoudreMessage(id, vars);
    void rendreMessage(message, direTexte);
    return message;
  };
}

/** Le `speakMessage` des écrans : branché sur le `speak` d'AppContext. */
export function useSpeakMessage(): SpeakMessage {
  const { speak } = useApp();
  return useMemo(() => creerSpeakMessage(speak), [speak]);
}
