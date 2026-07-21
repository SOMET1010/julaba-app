/**
 * elevenlabs.ts - TTS via ElevenLabs
 * Interface publique conservée pour compatibilité avec les imports existants
 * Tous les appels TTS passent par ElevenLabs via l'endpoint /tts/openai (nom historique)
 */

import { API_URL } from "../utils/api";

// ─────────────────────────────────────────────────────────────────
// CACHE TTS
// ─────────────────────────────────────────────────────────────────

const CACHE_MAX = 60;
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry { base64: string; ts: number; }
const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<string | null>>();

function normalizeKey(text: string): string {
  return text.toLowerCase().trim().replace(/[!?.,;:]+/g, "").replace(/\s+/g, " ").slice(0, 200);
}

function cacheGet(key: string): string | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
  _cache.delete(key);
  _cache.set(key, entry);
  return entry.base64;
}

function cacheSet(key: string, base64: string): void {
  if (_cache.size >= CACHE_MAX) {
    const oldest = _cache.keys().next().value;
    if (oldest !== undefined) _cache.delete(oldest);
  }
  _cache.set(key, { base64, ts: Date.now() });
}

// ─────────────────────────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────────────────────────

let _currentAudio: HTMLAudioElement | null = null;
let _chunkAborted = false;
let _sharedAudioContext: AudioContext | null = null;

export type TTSLang = "french" | "dioula" | "bambara";

export function getSharedAudioContext(): AudioContext {
  if (!_sharedAudioContext || _sharedAudioContext.state === "closed") {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    _sharedAudioContext = new AC();
  }
  return _sharedAudioContext;
}

function base64ToBlob(base64: string, mime?: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // Détection du format si non imposé : WAV (Piper, en-tête "RIFF") vs MP3 (ElevenLabs).
  if (!mime) {
    const isWav = bytes.length > 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    mime = isWav ? "audio/wav" : "audio/mpeg";
  }
  return new Blob([bytes], { type: mime });
}

export function stopAllAudio(): void {
  _chunkAborted = true;
  if (_currentAudio) {
    _currentAudio.pause();
    try { _currentAudio.src = ""; } catch (e) { console.warn('[voice]', e); }
    _currentAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

// Voix de SECOURS GRATUITE : la voix intégrée du navigateur (aucun coût, tourne
// sur l'appareil, marche hors-ligne). Utilisée quand le serveur ne renvoie pas
// d'audio (Piper pas encore déployé + cloud coupé, ou hors-ligne) : garantit que
// l'assistante n'est JAMAIS muette. Qualité moindre que Piper, mais gratuite.
export function speakBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !text?.trim()) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 0.98;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.cancel();
      synth.speak(u);
    } catch { resolve(); }
  });
}

export function stopSpeaking(): void {
  stopAllAudio();
}

export function stopChunkedSpeaking(): void {
  _chunkAborted = true;
  stopAllAudio();
}

export function preloadAudioContext(): void {
  try {
    const ctx = getSharedAudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch (e) { console.warn('[voice]', e); }
}

export async function playBase64Audio(base64: string, onDone?: () => void): Promise<void> {
  stopAllAudio();
  _chunkAborted = false;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(base64ToBlob(base64));
    const audio = new Audio(url);
    _currentAudio = audio;
    const finish = () => {
      URL.revokeObjectURL(url);
      _currentAudio = null;
      onDone?.();
      resolve();
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  });
}

// ─────────────────────────────────────────────────────────────────
// FETCH TTS - ElevenLabs via /tts/openai
// ─────────────────────────────────────────────────────────────────

export async function fetchTTS(text: string, signal?: AbortSignal, timeoutMs = 8000): Promise<string | null> {
  if (!text?.trim()) return null;
  const key = normalizeKey(text);

  const cached = cacheGet(key);
  if (cached) return cached;

  if (!signal) {
    const existing = _inflight.get(key);
    if (existing) return existing;
  }

  const promise = (async (): Promise<string | null> => {
    let externalAbortHandler: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      if (signal) {
        if (signal.aborted) controller.abort();
        externalAbortHandler = () => controller.abort();
        signal.addEventListener("abort", externalAbortHandler);
      }
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${API_URL}/tts/openai`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const json = await res.json();
      const base64 = (json.success && json.audio) ? json.audio : null;
      if (base64) cacheSet(key, base64);
      return base64;
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
      if (signal && externalAbortHandler) {
        signal.removeEventListener("abort", externalAbortHandler);
      }
      if (!signal) _inflight.delete(key);
    }
  })();

  if (!signal) _inflight.set(key, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────
// SPEAK — point d'entrée principal
// ─────────────────────────────────────────────────────────────────

export async function speak(text: string): Promise<void> {
  const base64 = await fetchTTS(text);
  if (base64) await playBase64Audio(base64);
  else await speakBrowser(text); // repli gratuit : jamais muet
}

export async function speakWithFallback(text: string, _isOnline?: boolean, onDone?: () => void): Promise<void> {
  const base64 = await fetchTTS(text);
  if (base64) await playBase64Audio(base64, onDone);
  else { await speakBrowser(text); onDone?.(); }
}

// Alias conservés pour compatibilité imports existants (migré vers OpenAI)
async function speakPiper(text: string): Promise<void> {
  return speak(text);
}

async function speakStreaming(text: string): Promise<void> {
  return speak(text);
}

// ─────────────────────────────────────────────────────────────────
// CHUNKED — prosodie simple via OpenAI
// ─────────────────────────────────────────────────────────────────

const CHUNK_MAX_CHARS = 110;
const CHUNK_MIN_CHARS = 20;
const CHUNK_PREFETCH = 2;

export function splitIntoChunks(text: string): string[] {
  if (!text?.trim()) return [];
  const raw = text
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => {
      if (sentence.length <= CHUNK_MAX_CHARS) return [sentence];
      const sub = sentence.split(/(?<=[,;])\s+/);
      const result: string[] = [];
      let current = "";
      for (const part of sub) {
        if ((current + " " + part).trim().length <= CHUNK_MAX_CHARS) {
          current = (current + " " + part).trim();
        } else {
          if (current) result.push(current);
          current = part;
        }
      }
      if (current) result.push(current);
      return result.length > 0 ? result : [sentence];
    })
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const merged: string[] = [];
  let buffer = "";
  for (const chunk of raw) {
    const combined = buffer ? buffer + " " + chunk : chunk;
    if (buffer && chunk.length < CHUNK_MIN_CHARS && combined.length <= CHUNK_MAX_CHARS) {
      buffer = combined;
    } else {
      if (buffer) merged.push(buffer);
      buffer = chunk;
    }
  }
  if (buffer) merged.push(buffer);
  return merged;
}

export async function speakChunked(
  text: string,
  onChunkStart?: (chunk: string, index: number, total: number) => void,
  onDone?: () => void
): Promise<void> {
  _chunkAborted = false;
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) { onDone?.(); return; }

  if (chunks.length === 1) {
    const b64 = await fetchTTS(chunks[0]);
    if (!_chunkAborted) {
      if (b64) await playBase64Audio(b64);
      else await speakBrowser(chunks[0]); // repli gratuit
    }
    onDone?.();
    return;
  }

  for (let i = 0; i < chunks.length; i++) {
    if (_chunkAborted) break;
    onChunkStart?.(chunks[i], i, chunks.length);
    const base64 = await fetchTTS(chunks[i]);
    if (_chunkAborted) break;
    if (base64) await playBase64Audio(base64);
    else await speakBrowser(chunks[i]); // repli gratuit : jamais muet
  }

  if (!_chunkAborted) onDone?.();
}

// ─────────────────────────────────────────────────────────────────
// MULTILINGUE — Dioula/Bambara via ANSUT
// ─────────────────────────────────────────────────────────────────

export async function fetchTTSLocal(text: string, lang: TTSLang = "french", timeoutMs = 10000): Promise<string | null> {
  if (!text?.trim()) return null;
  if (lang === "french") {
    stopAllAudio();
    return fetchTTS(text, undefined, timeoutMs);
  }
  const key = `${lang}:${normalizeKey(text)}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const existing = _inflight.get(key);
  if (existing) return existing;
  const promise = (async (): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${API_URL}/tts/speak-local`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return fetchTTS(text);
      const json = await res.json();
      const base64 = (json.success && json.audio) ? json.audio : null;
      if (base64) cacheSet(key, base64);
      return base64 ?? fetchTTS(text);
    } catch {
      return fetchTTS(text);
    } finally {
      _inflight.delete(key);
    }
  })();
  _inflight.set(key, promise);
  return promise;
}

async function speakWithLang(text: string, lang: TTSLang = "french"): Promise<void> {
  const base64 = await fetchTTSLocal(text, lang);
  if (base64) await playBase64Audio(base64);
}

// ─────────────────────────────────────────────────────────────────
// WARMUP — précharge phrases fréquentes
// ─────────────────────────────────────────────────────────────────

const WARMUP_PHRASES = [
  "Je t ecoute...", "Un instant...", "Je reflechis...",
  "C est fait ma chere !", "D accord !", "Bien recu !",
  "Je note ca !", "OK, j enregistre !", "D accord, j annule !",
];

let _warmupDone = false;

export async function warmupTTSCache(): Promise<void> {
  if (_warmupDone) return;
  _warmupDone = true;
  await Promise.allSettled(WARMUP_PHRASES.map((p) => fetchTTS(p)));
}

// ─────────────────────────────────────────────────────────────────
// STATS DEBUG
// ─────────────────────────────────────────────────────────────────

function getCacheStats(): { size: number; inflight: number; keys: string[] } {
  return { size: _cache.size, inflight: _inflight.size, keys: Array.from(_cache.keys()) };
}
