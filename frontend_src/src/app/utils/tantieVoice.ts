// tantieVoice.ts - Tata Nanti Lou via ElevenLabs
import { speakChunked, stopSpeaking, stopChunkedSpeaking } from '../services/elevenlabs';

// Utilitaire non utilise actuellement
export const speakTantie = (text: string, onStart?: () => void, onEnd?: () => void) => {
  if (onStart) onStart();
  stopChunkedSpeaking();
  speakChunked(text)
    .then(() => { if (onEnd) onEnd(); })
    .catch(() => { if (onEnd) onEnd(); });
};

const stopTantie = () => stopSpeaking();
export { speakChunked as speakWithFallback };
