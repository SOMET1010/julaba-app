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
import { doitTaire, importanceDeLaCle, NIVEAU_VOIX_PAR_DEFAUT, type NiveauVoix } from './niveauVoix';
import type { MessageId } from './types';

// La langue active suit la préférence existante ; hors navigateur (tests),
// `getLangPref` jette et on reste sur fr-ci.
definirFournisseurLocale(() => {
  try { return LOCALE_PAR_PREFERENCE[getLangPref()] ?? null; } catch { return null; }
});

// Chaque repli va au journal de voix (« Rapport de test » de Patrick).
surFallback((trace) => tracerVoix('I18N_FALLBACK', { ...trace }));

export type SpeakMessage = (id: MessageId, vars?: Variables) => MessageVocal;

/**
 * Réglages du niveau de voix (B5). Injectés, jamais lus dans un global :
 * ce module reste testable sans navigateur, et le runtime reste pur.
 */
export interface OptionsNiveau {
  /** Le niveau courant, relu à CHAQUE phrase (il peut changer en cours de session). */
  niveau: () => NiveauVoix;
  /** Appelé quand une phrase est tue — pour le journal de voix. */
  surSilence?: (id: MessageId, raison: string) => void;
}

/**
 * Construit un `speakMessage` au-dessus d'une fonction qui dit un texte.
 * Rend le message résolu (utile pour « réécouter »).
 *
 * LE NIVEAU DE VOIX SE DÉCIDE ICI, ET SEULEMENT ICI — B5. C'est le dernier
 * endroit où l'on connaît encore la CLÉ ; une fois le texte produit, il ne
 * reste plus qu'à le deviner, et deviner l'importance d'une phrase d'argent
 * par ses mots français est précisément ce que nous refusons (voir
 * `niveauVoix.ts`). Un message tu est quand même RÉSOLU et rendu à
 * l'appelante : « réécouter » doit toujours avoir de quoi parler.
 */
export function creerSpeakMessage(direTexte: DireTexte, options?: OptionsNiveau): SpeakMessage {
  return (id, vars = {}) => {
    const message = resoudreMessage(id, vars);
    const niveau = options?.niveau?.() ?? NIVEAU_VOIX_PAR_DEFAUT;
    if (doitTaire(niveau, importanceDeLaCle(id))) {
      // TOUT SILENCE EST ÉCRIT (limite L4 de GARDE-02) : un silence qu'on ne
      // peut pas relire dans le « Rapport de test » ne s'explique pas au terrain.
      tracerVoix('TTS_IGNOREE', { source: 'speakMessage', id, raison: 'niveau-voix', niveau });
      options?.surSilence?.(id, 'niveau-voix');
      return message;
    }
    void rendreMessage(message, direTexte);
    return message;
  };
}

/** Le `speakMessage` des écrans : branché sur le `speak` d'AppContext. */
export function useSpeakMessage(): SpeakMessage {
  const { speak, niveauVoix } = useApp();
  return useMemo(
    () => creerSpeakMessage(speak, { niveau: () => niveauVoix }),
    [speak, niveauVoix],
  );
}
