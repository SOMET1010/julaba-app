/**
 * useVoiceCore v5 - Pipeline vocal UNIQUE Julaba
 * - TTS via ElevenLabs
 * - Memoire adaptative des intents (3 derniers)
 * - Prosodie + chunking via ElevenLabs
 * - TTS ElevenLabs uniquement
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { API_URL } from "../utils/api";
// Offline-first : STT sur l'appareil + compréhension locale (sans réseau ni LLM).
import { transcribeWav, offlineModelReady, ensureOfflineModel } from "../voice-offline/offlineStt";
import { intentLocal } from "../voice-offline/localIntent";
import { preloadEarlyAudios } from "../services/earlyAudioCache";
import {
  speakChunked,
  stopChunkedSpeaking,
  stopAllAudio,
  stopSpeaking as elStop,
  playBase64Audio,
  playAudioUrl,
  preloadAudioContext,
  getSharedAudioContext,
  type TTSLang,
} from "../services/elevenlabs";
import { tataClipUrl } from "../services/tataVoice";
import { useOfflineVoiceQueue } from "./useOfflineVoiceQueue";

// ─── TYPES ───────────────────────────────────────────────────────

export type VoiceState = "idle" | "listening" | "processing" | "thinking" | "speaking" | "confirming" | "error";
export type VoiceLang = "french" | "dioula" | "bambara";

export interface VoiceAction {
  type: string;
  montant?: number;
  produit?: string;
  quantite?: number;
  description?: string;
  declencheur?: string;
  [key: string]: unknown;
}

export interface VoiceProcessResponse {
  transcript: string;
  normalizedText: string;
  intent: string;
  action: VoiceAction;
  response: string;
  needsConfirmation: boolean;
  audioBase64: string | null;
  navigate?: string | null;
  resume_action?: string;
  transcription?: string;
  reponse?: string;
  confirmation_requise?: boolean;
}

export interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceCoreContext {
  caisse?: number;
  ventes?: number;
  depenses?: number;
  sessionOpen?: boolean;
  prenom?: string;
  lang?: VoiceLang;
  module?: string;
  genre?: string;
  userId?: string;
  nombreVentes?: number;
  topStocks?: string;
  [key: string]: unknown;
}

export interface VoiceCoreOptions {
  context?: VoiceCoreContext;
  maxRecordingSeconds?: number;
  onAction?: (response: VoiceProcessResponse) => Promise<void> | void;
  onNavigate?: (path: string) => void;
  onError?: (message: string) => void;
  onTranscript?: (text: string) => void;
}

export interface VoiceCoreResult {
  state: VoiceState;
  transcript: string;
  liveTranscript: string;
  response: VoiceProcessResponse | null;
  pendingResponse: VoiceProcessResponse | null;
  error: string;
  recordingTime: number;
  history: VoiceMessage[];
  volume: number;
  recentIntents: string[];
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  handleMicClick: () => void;
  sendText: (text: string) => Promise<void>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  confirmAction: () => Promise<void>;
  cancelAction: () => void;
  reset: () => void;
  resetHistory: () => void;
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  pendingCount: number;
  isReplaying: boolean;
}

// Aliases legacy
export type VoiceStep = VoiceState;
const useVoiceAssistant = null as any;
const useAnsutSTT = null as any;
export type AnsutLang = VoiceLang;

// ─── CONSTANTES ──────────────────────────────────────────────────

const MAX_RECORD_SECONDS = 20; // 20s max — assez pour une phrase
const MAX_INTENTS_MEMORY = 5;

const THINKING_PHRASES = [
  "Je réfléchis...",
  "Un instant...",
  "Je vois ça...",
  "Je m'en occupe...",
  "Laisse-moi voir...",
  "Je traite ça...",
  "Attends un moment...",
];

const THINKING_PHRASES_VENTE = [
  "Je calcule ça...",
  "Je note ta vente...",
  "Un instant, j'enregistre...",
  "Je m'en occupe...",
];

const THINKING_PHRASES_ERROR = [
  "Excuse-moi, je recommence...",
  "Un instant, je réessaie...",
  "Je réfléchis encore...",
  "Laisse-moi réessayer...",
];

const ACK_PHRASES = [
  "C'est fait !",
  "Bien reçu !",
  "D'accord !",
  "Je note ça !",
  "C'est noté !",
  "Voilà !",
  "Ça marche !",
  "Top !",
  "C'est enregistré !",
];

const ACK_PHRASES_ENCOURAGEMENT = [
  "Bravo, continue comme ça !",
  "Super, tu travailles bien !",
  "Excellent !",
  "Tu gères bien !",
  "C'est du bon travail !",
];

function randomPick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Choisir phrases selon memoire intents
function getThinkingPhrases(recentIntents: string[]): string[] {
  const last = recentIntents[recentIntents.length - 1];
  if (last === "vendre" || last === "depense") return THINKING_PHRASES_VENTE;
  if (last === "inconnu" || last === "error") return THINKING_PHRASES_ERROR;
  return THINKING_PHRASES;
}

function getAckPhrase(recentIntents: string[]): string {
  // Apres 3 ventes consecutives : encouragement
  const lastThree = recentIntents.slice(-3);
  if (lastThree.length === 3 && lastThree.every((i) => i === "vendre")) {
    return randomPick(ACK_PHRASES_ENCOURAGEMENT);
  }
  return randomPick(ACK_PHRASES);
}

// ─── UTILITAIRES ─────────────────────────────────────────────────

async function convertToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const numSamples = audioBuffer.length;
  const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(wavBuffer);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF"); view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE"); writeStr(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(36, "data"); view.setUint32(40, numSamples * 2, true);
  const ch = audioBuffer.getChannelData(0);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, ch[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  await audioCtx.close();
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function normalizeResponse(raw: Partial<VoiceProcessResponse>): VoiceProcessResponse {
  return {
    transcript: raw.transcript || raw.transcription || "",
    normalizedText: raw.normalizedText || raw.transcript || raw.transcription || "",
    intent: raw.intent || "inconnu",
    action: raw.action || { type: "none" },
    response: raw.response || raw.reponse || "",
    needsConfirmation: raw.needsConfirmation ?? raw.confirmation_requise ?? false,
    audioBase64: raw.audioBase64 ?? null,
    navigate: raw.navigate ?? null,
    resume_action: raw.resume_action,
  };
}

function startTypewriter(
  text: string,
  setter: (v: string) => void,
  speedMs = 28
): ReturnType<typeof setInterval> {
  let i = 0;
  setter("");
  return setInterval(() => {
    if (i <= text.length) { setter(text.slice(0, i)); i++; }
  }, speedMs);
}

// TTS unifié. `clip` (optionnel) = clé d'un clip pré-enregistré « Tata Nanti Lou » :
// pour une phrase FIXE, on joue la vraie voix ivoirienne (sur l'appareil, zéro
// cloud) au lieu de la voix de synthèse. Sinon on retombe sur le flux normal.
async function ttsSpeak(text: string, lang: TTSLang = "french", clip?: string): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem('julaba_voice_disabled') === 'true') return;
  if (clip) {
    const url = tataClipUrl(clip);
    if (url) {
      try { await playAudioUrl(url); return; }
      catch { /* clip indisponible → on continue vers la voix de secours */ }
    }
  }
  if (lang === "french") {
    await speakChunked(text);
    return;
  }
  // Dioula/Bambara : passer par fetchTTSLocal (ANSUT)
  const { fetchTTSLocal } = await import("../services/elevenlabs");
  const base64 = await fetchTTSLocal(text, lang);
  if (base64) await playBase64Audio(base64);
}

async function ttsPlayBase64(base64: string, fallback: string): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem('julaba_voice_disabled') === 'true') return;
  try { await playBase64Audio(base64); } catch { await ttsSpeak(fallback); }
}

function ttsStop(): void {
  stopAllAudio();
  stopChunkedSpeaking();
  elStop();
}

// Interprète une réponse de confirmation dictée : « oui » / « non » / incertain.
// On teste le NON d'abord (« non », « pas ça », « annule »…), sinon le OUI.
function interpretYesNo(texte: string): "oui" | "non" | null {
  const t = " " + (texte || "").toLowerCase().replace(/['']/g, "'").replace(/[.,!?;:]/g, " ").replace(/\s+/g, " ") + " ";
  const NON = [" non ", " pas ", " faux ", " annule", " efface", " recommence"];
  const OUI = [" oui ", " ouais ", " voila ", " voilà ", " exact ", " accord ", " ok ", " okay ", " c'est bon ", " c'est ca ", " c'est ça ", " bon ", " ca ", " ça "];
  if (NON.some((w) => t.includes(w))) return "non";
  if (OUI.some((w) => t.includes(w))) return "oui";
  return null;
}

// ─── BIP AUDIO ────────────────────────────────────────────────────
// Priorité voix : bip uniquement si aucun audio principal en cours
// iOS Safari : AudioContext.resume() obligatoire après interaction user
function playBip(type: 'start' | 'stop'): void {
  try {
    const ctx = getSharedAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    if (type === 'start') {
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } else {
      oscillator.frequency.value = 660;
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    }
  } catch (e) {}
}

// ─── HOOK PRINCIPAL ──────────────────────────────────────────────

export function useVoiceCore({
  context = {},
  maxRecordingSeconds = MAX_RECORD_SECONDS,
  onAction,
  onNavigate,
  onError,
}: VoiceCoreOptions = {}): VoiceCoreResult {

  const [state, setState] = useState<VoiceState>("idle");

  // Pré-charger les sons early audio au montage
  useEffect(() => {
    preloadEarlyAudios().catch(() => {});
  }, []);
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [response, setResponse] = useState<VoiceProcessResponse | null>(null);
  const [pendingResponse, setPendingResponse] = useState<VoiceProcessResponse | null>(null);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  // Récupérer l'historique depuis localStorage pour persistance
  const [history, setHistory] = useState<VoiceMessage[]>(() => {
    try {
      const saved = localStorage.getItem('julaba_voice_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [recentIntents, setRecentIntents] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const _initHistory = (): VoiceMessage[] => {
    try {
      const saved = localStorage.getItem('julaba_voice_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };
  const historyRef = useRef<VoiceMessage[]>(_initHistory());
  const recentIntentsRef = useRef<string[]>([]);
  const animFrameRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const interruptRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sendTextRef = useRef<((text: string) => Promise<void>) | null>(null);
  // Confirmation vocale (« c'est bien ça ? » → oui/non). Refs pour appeler ces
  // fonctions depuis processAudio sans dépendances circulaires.
  const pendingResponseRef = useRef<VoiceProcessResponse | null>(null);
  const confirmActionRef = useRef<(() => Promise<void>) | null>(null);
  const cancelActionRef = useRef<(() => Promise<void>) | null>(null);
  const startRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const confirmAttemptsRef = useRef(0);

  const trackTimeout = useCallback((cb: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      timeoutRefs.current = timeoutRefs.current.filter((t) => t !== timeout);
      cb();
    }, delay);
    timeoutRefs.current.push(timeout);
    return timeout;
  }, []);

  // #2 : UNE seule instance de la file hors-ligne (ici). Avant, le modal en
  // créait une seconde -> les deux rejouaient la même file à la reconnexion ->
  // ventes offline dupliquées. On expose pendingCount/isReplaying à la place.
  const { enqueue, pendingCount: offlinePending, isReplaying: offlineReplaying } = useOfflineVoiceQueue(async (cmd) => {
    try {
      if (!sendTextRef.current) return false;
      await sendTextRef.current(cmd.text);
      return true;
    } catch {
      return false;
    }
  });

  // ── Memoire adaptative intents ───────────────────────────────
  const addIntent = useCallback((intent: string) => {
    recentIntentsRef.current = [...recentIntentsRef.current, intent].slice(-MAX_INTENTS_MEMORY);
    setRecentIntents([...recentIntentsRef.current]);
  }, []);

  // ── Timers ───────────────────────────────────────────────────
  const clearTypewriter = useCallback(() => {
    if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
  }, []);

  const clearThinkingTimer = useCallback(() => {
    if (thinkingTimerRef.current) { clearInterval(thinkingTimerRef.current); thinkingTimerRef.current = null; }
  }, []);

  const startThinkingPhrases = useCallback(() => {
    clearThinkingTimer();
    const phrases = getThinkingPhrases(recentIntentsRef.current);
    setLiveTranscript(randomPick(phrases));
    thinkingTimerRef.current = setInterval(() => {
      setLiveTranscript(randomPick(getThinkingPhrases(recentIntentsRef.current)));
    }, 1800);
  }, [clearThinkingTimer]);

  // ── Volume analyser ──────────────────────────────────────────
  const startVolumeAnalysis = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolume(Math.min(100, Math.round(avg * 2.5)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (e) { console.warn('[voice]', e); }
  }, []);

  const stopVolumeAnalysis = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    setVolume(0);
  }, []);

  // ── Silence detection ────────────────────────────────────────
  const stopSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopVolumeAnalysis();
    stopSilenceDetection();
    playBip('stop'); // Bip arrêt
    setLiveTranscript("Analyse en cours...");
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
      setState("processing");
    }
  }, [stopVolumeAnalysis, stopSilenceDetection]);

  const startSilenceDetection = useCallback(() => {
    stopSilenceDetection();
    // Push-to-talk uniquement — pas de détection silence automatique
  }, [stopSilenceDetection]);

  // ── Historique ───────────────────────────────────────────────
  const addToHistory = useCallback((userText: string, assistantText: string) => {
    const entries: VoiceMessage[] = [
      { role: "user", content: userText },
      { role: "assistant", content: assistantText },
    ];
    historyRef.current = [...historyRef.current, ...entries].slice(-20);
    setHistory([...historyRef.current]);
    // Persister dans localStorage pour mémoire cross-navigation
    try { localStorage.setItem('julaba_voice_history', JSON.stringify(historyRef.current)); } catch (e) { console.warn('[voice]', e); }
  }, []);

  // ── TTS public ───────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try { await ttsSpeak(text); } finally { setIsSpeaking(false); }
  }, []);

  const stopSpeaking = useCallback(() => {
    interruptRef.current = true;
    ttsStop();
    setIsSpeaking(false);
  }, []);

  // ── Reset ────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") {
      try { mediaRecorderRef.current?.stop(); } catch (e) { console.warn('[voice]', e); }
    }
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    stopVolumeAnalysis();
    stopSilenceDetection();
    clearTypewriter();
    clearThinkingTimer();
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    ttsStop();
  }, [stopVolumeAnalysis, stopSilenceDetection, clearTypewriter, clearThinkingTimer]);

  const reset = useCallback(() => {
    stopAll();
    interruptRef.current = false;
    setState("idle"); setResponse(null); setPendingResponse(null);
    setError(""); setTranscript(""); setLiveTranscript("");
    setRecordingTime(0); setIsSpeaking(false);
  }, [stopAll]);

  const resetHistory = useCallback(() => {
    historyRef.current = []; setHistory([]);
    recentIntentsRef.current = []; setRecentIntents([]);
    try { localStorage.removeItem('julaba_voice_history'); } catch (e) { console.warn('[voice]', e); }
    reset();
  }, [reset]);

  // ── Execute action ───────────────────────────────────────────
  const executeAction = useCallback(async (data: VoiceProcessResponse, userText: string, confirmed = false) => {
    if (interruptRef.current) {
      return;
    }
    clearThinkingTimer();

    // Silence ou hallucination rejetée — ne rien faire
    if (data.intent === "silence") {
      setState("idle");
      setLiveTranscript("");
      return;
    }

    // Memoriser l intent
    addIntent(data.intent);

    setResponse(data); setTranscript(data.transcript || userText);
    clearTypewriter();
    typewriterRef.current = startTypewriter(data.response || "", setLiveTranscript, 25);
    setState("speaking"); addToHistory(userText, data.response); setIsSpeaking(true);

    // Délai minimal réduit à 80ms pour TTS plus réactif
    ttsStop();
    await new Promise((r) => {
      trackTimeout(() => r(undefined), 80);
    });

    try {
      const wasInterrupted = interruptRef.current;
      if (!wasInterrupted) {
        const ack = getAckPhrase(recentIntentsRef.current);
        // Utiliser audioBase64 du backend si disponible
        if (data.audioBase64) {
          await ttsPlayBase64(data.audioBase64, data.response || ack);
          if (interruptRef.current) return;
        } else {
          await ttsSpeak(data.response || ack, buildContext().lang as TTSLang);
          if (interruptRef.current) return;
        }
      }
    } finally { clearTypewriter(); setIsSpeaking(false); }

    const FINANCIAL_INTENTS = ['vendre', 'depense', 'ouvrir_journee', 'fermer_journee', 'utiliser_raccourci'];
    // `confirmed` = appel venant de confirmAction (l'utilisateur a déjà dit Oui) :
    // sans ce court-circuit, on re-demandait confirmation à l'infini et la vente
    // n'était jamais enregistrée quand le backend renvoyait needsConfirmation=false.
    const requiresLocalConfirm = !confirmed && FINANCIAL_INTENTS.includes(data.intent) && !data.needsConfirmation;
    if (requiresLocalConfirm) {
      setPendingResponse(data);
      setState("confirming");
      return;
    }
    if (!interruptRef.current && onAction && data.action?.type !== "none") {
      // #4 : ne plus avaler une erreur d'enregistrement en silence -> la montrer
      // et la dire (ex. « ouvre ta journée d'abord »), au lieu d'un faux succès.
      try {
        await onAction(data);
      } catch (e) {
        const m = e instanceof Error ? e.message : "Enregistrement impossible.";
        console.warn('[voice]', e);
        setError(m);
        await ttsSpeak(m);
        if (onError) onError(m);
      }
    } else {
      // TRACE
    }
    if (!interruptRef.current && data.navigate && onNavigate) {
      trackTimeout(() => onNavigate(data.navigate!), 800);
    }
    if (!interruptRef.current) {
      trackTimeout(() => { setState("idle"); setLiveTranscript(""); }, 1000);
    }
  }, [addToHistory, addIntent, onAction, onNavigate, clearTypewriter, clearThinkingTimer, trackTimeout]);

  // ── Handle response ──────────────────────────────────────────
  const handleResponse = useCallback(async (raw: Partial<VoiceProcessResponse>, userText: string) => {
    if (interruptRef.current) {
      return;
    }
    clearThinkingTimer();
    const data = normalizeResponse(raw);
    setTranscript(data.transcript || userText);

    if (data.needsConfirmation && data.action?.type !== "none") {
      clearTypewriter();
      typewriterRef.current = startTypewriter(data.response || "", setLiveTranscript, 25);
      setPendingResponse(data); setResponse(data); setState("confirming"); setIsSpeaking(true);
      pendingResponseRef.current = data; // dispo tout de suite pour la réponse vocale
      confirmAttemptsRef.current = 0;
      ttsStop();
      await new Promise((r) => {
        trackTimeout(() => r(undefined), 250);
      });
      const wasInterrupted = interruptRef.current;
      try {
        // Utiliser audioBase64 du backend si disponible
        if (!wasInterrupted && data.audioBase64) {
          await ttsPlayBase64(data.audioBase64, data.response);
          if (interruptRef.current) return;
        } else {
          if (!wasInterrupted) {
            await ttsSpeak(data.response, buildContext().lang as TTSLang);
            if (interruptRef.current) return;
          }
        }
      } finally { clearTypewriter(); setIsSpeaking(false); }
      // AUTO-ÉCOUTE : juste après la question, on écoute la réponse (oui/non) pour
      // que la vendeuse n'ait rien à toucher. Les boutons Oui/Non restent dispo.
      if (!interruptRef.current) { setState("confirming"); void startRecordingRef.current?.(); }
      return;
    }
    await executeAction(data, userText);
  }, [executeAction, clearTypewriter, clearThinkingTimer, trackTimeout]);

  // ── Confirmation ─────────────────────────────────────────────
  // Garde synchrone anti double-clic : sans elle, deux appuis rapides sur "Oui"
  // voient tous deux pendingResponse != null (setState async) et enregistrent la
  // vente DEUX fois. Le ref bascule immediatement, avant tout await.
  const confirmingRef = useRef(false);
  const confirmAction = useCallback(async () => {
    if (confirmingRef.current || !pendingResponse) return;
    confirmingRef.current = true;
    try {
      const data = pendingResponse; setPendingResponse(null);
      // Voix réelle de Tata Nanti Lou pour l'accusé de réception (phrase fixe).
      await ttsSpeak("C'est noté, ta vente est bien enregistrée.", "french", "vente_enregistree");
      await executeAction(data, data.transcript || "", true); // déjà confirmé -> enregistrer
    } finally {
      confirmingRef.current = false;
    }
  }, [pendingResponse, executeAction]);

  const cancelAction = useCallback(async () => {
    if (!pendingResponse) return;
    setPendingResponse(null); setState("idle"); setLiveTranscript("");
    // Voix réelle de Tata Nanti Lou pour l'annulation (phrase fixe).
    await ttsSpeak("D'accord, j'annule. Pas de souci.", "french", "annule");
  }, [pendingResponse]);

  // ── Context ──────────────────────────────────────────────────
  const buildContext = useCallback(() => ({
    caisse: context.caisse || 0,
    ventes: context.ventes || 0,
    depenses: context.depenses || 0,
    sessionOpen: context.sessionOpen ?? false,
    prenom: context.prenom || "ma chère",
    genre: context.genre || "femme",
    userId: context.userId || "",
    lang: context.lang || "french",
    module: context.module || "general",
  }), [context]);

  // ── Process audio ────────────────────────────────────────────
  const processAudio = useCallback(async (mimeType: string) => {
    setState("processing");
    interruptRef.current = false;
    stopSilenceDetection();

    // ÉTAPE 1 : FEEDBACK VISUEL IMMÉDIAT (0ms)
    const feedbacks = ["OK...", "J'écoute...", "Mmh...", "Oui..."];
    setLiveTranscript(feedbacks[Math.floor(Math.random() * feedbacks.length)]);

    // ÉTAPE 2 : EARLY AUDIO IMMÉDIAT depuis cache (<10ms) — avant tout réseau
    // ÉTAPE 2 : FEEDBACK VISUEL immédiat
    try { playBip("start"); } catch (e) { console.warn('[voice]', e); }

    let audioBlob: Blob;
    let audioFilename = "audio.webm";
    try {
      // A1 (audit latence) : envoyer l'Opus NATIF du MediaRecorder tel quel.
      // Whisper accepte webm/opus et mp4 ; on supprime la conversion en WAV qui
      // multipliait le poids par 10-40 (2-6 s d'upload en trop sur mobile). Le
      // chemin offline decode ce meme blob (decodeAudioData gere webm/opus/mp4).
      // VIGILANCE iOS : le repli mp4 du MediaRecorder est a tester sur appareils reels.
      audioBlob = new Blob(chunksRef.current, { type: mimeType });
      audioFilename = mimeType.includes("mp4") ? "audio.mp4" : mimeType.includes("webm") ? "audio.webm" : "audio.wav";
      if (audioBlob.size < 800) {
        // Rien capté : si une confirmation est en attente, on y reste (les boutons
        // Oui/Non restent visibles) au lieu de retomber en veille et bloquer.
        setState(pendingResponseRef.current ? "confirming" : "idle"); setLiveTranscript(""); return;
      }
    } catch { setState(pendingResponseRef.current ? "confirming" : "idle"); return; }

    // ── RECONNAISSANCE 100 % SUR L'APPAREIL (souverain, zéro cloud) ─────────
    // On transcrit TOUJOURS sur le téléphone et on comprend la vente sans LLM.
    // Le chemin serveur pour la voix est ABANDONNÉ : il n'a pas de clé (par choix
    // — zéro coût, zéro dépendance cloud), donc il ne faisait que produire des
    // « souci technique ». Désormais : soit on comprend, soit on guide gentiment,
    // jamais d'erreur réseau.
    // À la toute première utilisation (ou après vidage du cache), le modèle
    // (~40 Mo) se télécharge tout seul une fois, puis reste en cache.
    setState("thinking");
    startThinkingPhrases();
    try {
      if (!offlineModelReady()) {
        // Pas encore prêt : première fois, ou après un rechargement de page.
        setLiveTranscript("Je prépare ta voix…");
        void ttsSpeak("Je prépare ta voix, un petit instant.");
        await ensureOfflineModel(); // télécharge si besoin, sinon ré-active depuis le cache
      }
      const texte = await transcribeWav(audioBlob);
      if (texte) setTranscript(texte); // affiche « tu as dit … »

      // ── RÉPONSE À UNE CONFIRMATION EN COURS (« c'est bien ça ? ») ──────────
      // Si l'assistante attend un oui/non, on interprète la réponse dictée au
      // lieu de la traiter comme une nouvelle vente.
      if (pendingResponseRef.current) {
        const rep = interpretYesNo(texte || "");
        clearThinkingTimer();
        if (rep === "oui") { confirmAttemptsRef.current = 0; await confirmActionRef.current?.(); return; }
        if (rep === "non") { confirmAttemptsRef.current = 0; await cancelActionRef.current?.(); return; }
        // Pas clair : on redemande, puis on ré-écoute (max 2 fois), sinon on
        // laisse la vendeuse toucher les boutons Oui / Non.
        confirmAttemptsRef.current += 1;
        setState("confirming");
        if (confirmAttemptsRef.current <= 2) {
          await ttsSpeak("Dis oui pour valider, ou non pour annuler.");
          if (!interruptRef.current) void startRecordingRef.current?.();
        } else {
          await ttsSpeak("Touche Oui ou Non à l'écran, s'il te plaît.");
        }
        return;
      }

      const local = texte ? intentLocal(texte) : null;
      if (local) {
        clearThinkingTimer();
        await handleResponse(local as Partial<VoiceProcessResponse>, texte);
        return;
      }
      // Entendu mais pas compris (ou rien entendu) : voix réelle de Tata Nanti Lou.
      clearThinkingTimer(); setState("idle"); setLiveTranscript("");
      if (texte) await ttsSpeak("Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît.", "french", "pas_compris");
      else await ttsSpeak("Je n'ai rien entendu. Réessaie, parle un peu plus fort.", "french", "rien_entendu");
      return;
    } catch {
      clearThinkingTimer(); setState("idle"); setLiveTranscript("");
      await ttsSpeak(navigator.onLine
        ? "Je n'ai pas réussi à préparer ta voix. Vérifie le réseau et réessaie."
        : "Je n'ai pas réussi à t'écouter, réessaie.");
      return;
    }
  }, [handleResponse, stopSilenceDetection, startThinkingPhrases, clearThinkingTimer]);

  // ── sendText ─────────────────────────────────────────────────
  const sendText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    interruptRef.current = false;
    setState("thinking"); setTranscript(text);
    startThinkingPhrases();
    try {
      // Compréhension SUR L'APPAREIL — même moteur que la voix, aucun serveur.
      // C'est ce chemin qu'empruntent les exemples « ce que tu peux dire » et le
      // mot-réveil : avant, il passait par le serveur (mort) et donnait « souci
      // technique » au tout début. Désormais, tout est compris localement.
      const local = intentLocal(text);
      if (local) {
        clearThinkingTimer();
        await handleResponse(local as Partial<VoiceProcessResponse>, text);
        return;
      }
      // Pas une opération financière reconnue : voix réelle de Tata Nanti Lou.
      clearThinkingTimer(); setState("idle"); setLiveTranscript("");
      await ttsSpeak("Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît.", "french", "pas_compris");
    } catch {
      clearThinkingTimer(); setState("idle"); setLiveTranscript("");
      await ttsSpeak("Je n'ai pas réussi, réessaie.");
    }
  }, [handleResponse, startThinkingPhrases, clearThinkingTimer]);

  // ── startRecording ───────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (state === "listening") return;
    preloadAudioContext(); // Précharger pour iOS Safari
// Débloquer AudioContext iOS Safari + Android Chrome
try {
  if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
    audioCtxRef.current.resume().catch(() => {});
  }
} catch (e) { console.warn('[voice]', e); }
    if (isSpeaking) { ttsStop(); setIsSpeaking(false); }
    interruptRef.current = false;
    setError(""); setTranscript(""); setLiveTranscript("");
    // Micro indisponible dans ce contexte (WebView embarquee, contexte non securise) :
    // inutile de tenter getUserMedia, on guide l'utilisateur vers un vrai navigateur.
    if (!navigator.mediaDevices?.getUserMedia || window.isSecureContext === false) {
      const msg = "Micro non accessible dans cette application. Ouvre Jùlaba dans Safari ou Chrome pour utiliser la voix.";
      setError(msg);
      setState("error"); setLiveTranscript("");
      if (onError) onError(msg);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, sampleRate: 16000,
          echoCancellation: true, noiseSuppression: true, autoGainControl: true,
        },
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); processAudio(mimeType); };
      mr.start(100);
      mediaRecorderRef.current = mr;
      playBip('start'); // Bip démarrage
      startVolumeAnalysis(stream);
      startSilenceDetection();
      setState("listening"); setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= maxRecordingSeconds) { stopRecording(); return t; }
          return t + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      // Message adapte a la cause reelle du refus getUserMedia.
      let msg = "Microphone inaccessible. Vérifie les permissions.";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          msg = "Accès au micro refusé. Autorise le micro pour Jùlaba dans les réglages de ton téléphone.";
        } else if (err.name === "NotFoundError" || err.name === "NotReadableError") {
          msg = "Micro introuvable ou déjà utilisé par une autre application. Vérifie ton micro et réessaie.";
        }
      }
      setError(msg);
      setState("error"); setLiveTranscript("");
      if (onError) onError(err instanceof Error ? err.message : msg);
    }
  }, [state, isSpeaking, processAudio, maxRecordingSeconds, onError, stopRecording, startVolumeAnalysis, startSilenceDetection]);

  // ── handleMicClick ───────────────────────────────────────────
  const micDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micLockedRef = useRef(false);

  const handleMicClick = useCallback(() => {
    // Debounce 300ms anti-spam
    if (micLockedRef.current) {
      return;
    }
    micLockedRef.current = true;
    if (micDebounceRef.current) clearTimeout(micDebounceRef.current);
    micDebounceRef.current = trackTimeout(() => { micLockedRef.current = false; }, 300);

    if (state === "speaking" || isSpeaking) {
      ttsStop(); setIsSpeaking(false);
      trackTimeout(() => {
        if (state !== "listening") startRecording();
      }, 120);
      return;
    }
    if (state === "idle" || state === "error") startRecording();
    else if (state === "listening") stopRecording();
    else if (state === "thinking" || state === "processing") {
      interruptRef.current = true;
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      clearThinkingTimer();
      setState("idle"); setLiveTranscript("");
    }
  }, [state, isSpeaking, startRecording, stopRecording, clearThinkingTimer, trackTimeout]);

  useEffect(() => {
    sendTextRef.current = sendText;
  }, [sendText]);

  // Garde les refs de confirmation vocale à jour (appelées depuis processAudio).
  useEffect(() => { pendingResponseRef.current = pendingResponse; }, [pendingResponse]);
  useEffect(() => { confirmActionRef.current = confirmAction; }, [confirmAction]);
  useEffect(() => { cancelActionRef.current = cancelAction; }, [cancelAction]);
  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);

  useEffect(() => { return () => { stopAll(); }; }, [stopAll]);

  return {
    state, transcript, liveTranscript, response, pendingResponse,
    error, recordingTime, history, volume, recentIntents,
    startRecording, stopRecording, handleMicClick, sendText,
    speak, stopSpeaking, isSpeaking,
    confirmAction, cancelAction, reset, resetHistory,
    pendingCount: offlinePending, isReplaying: offlineReplaying,
    isListening: state === "listening",
    isProcessing: state === "processing" || state === "thinking",
    isSupported: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
  };
}
