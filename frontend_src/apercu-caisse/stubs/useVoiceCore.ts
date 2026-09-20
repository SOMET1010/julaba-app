/**
 * STUB de useVoiceCore pour l'APERÇU VISUEL de la caisse (F2, temps 2).
 *
 * Il n'y a ni micro ni reconnaissance dans un Chromium headless. Pour VOIR
 * l'encart de relecture financière en situation (« encaisse » dit, reçu
 * 5 000), le banc de capture INJECTE une intention déjà reconnue, exactement
 * sous la forme que le vrai moteur passe à `onAction` : `{ action: { type },
 * transcript }`. Rien d'autre n'est simulé — la machine d'encaissement, la
 * phrase relue et son affichage sont ceux de POSCaisse. On le dit dans le
 * rapport : l'intention est injectée, pas reconnue depuis l'audio.
 */
import { useCallback, useEffect, useState } from 'react';

type Donnees = { action?: { type: string; [k: string]: unknown }; transcript?: string; intent?: string };

export function useVoiceCore({ onAction }: { onAction?: (d: Donnees) => unknown; [k: string]: unknown } = {}) {
  const [transcript, setTranscript] = useState('');
  useEffect(() => {
    (window as unknown as { __apercuVoix?: unknown }).__apercuVoix = {
      injecter: async (d: Donnees) => { setTranscript(d.transcript || ''); await onAction?.(d); },
    };
  }, [onAction]);
  const rien = useCallback(() => {}, []);
  return {
    state: 'idle' as const, response: null, pendingResponse: null, transcript, liveTranscript: '', error: '',
    recordingTime: 0, history: [], volume: 0, recentIntents: [],
    startRecording: rien, stopRecording: rien, handleMicClick: rien, sendText: async () => {},
    speak: rien, stopSpeaking: rien, isSpeaking: false,
    confirmAction: rien, cancelAction: rien, reset: () => setTranscript(''), resetHistory: rien,
    pendingCount: 0, isReplaying: false, isListening: false, isProcessing: false, isSupported: false,
  };
}
