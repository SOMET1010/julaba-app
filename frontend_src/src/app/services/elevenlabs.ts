/**
 * elevenlabs.ts — LE NOM MENT, ET C'EST ASSUMÉ : plus une seule ligne d'ici ne
 * parle à ElevenLabs, ni à OpenAI, ni à quoi que ce soit sur Internet.
 *
 * CE QUI RESTE, ET POURQUOI. Ce fichier ne fait plus que trois choses, toutes
 * hors-ligne et toutes utilisées :
 *   1. la lecture audio partagée (`_currentAudio`, `stopAllAudio`) — un seul son
 *      à la fois dans l'application, donc un seul endroit pour le couper ;
 *   2. la voix intégrée du navigateur (`speakBrowser`), filet de dernier recours
 *      quand ni un clip de Tata ni la synthèse native ne peuvent répondre ;
 *   3. le découpage en phrases (`splitIntoChunks`), dont se sert l'audioManager.
 *
 * CE QUI A ÉTÉ RETIRÉ le 18/09/2026, et pourquoi c'était dangereux de le
 * garder : 192 lignes INATTEIGNABLES. `fetchTTS` renvoyait `null` sans
 * condition depuis la coupure de la voix Internet ; tout ce qui vivait derrière
 * — le cache et ses deux Map, `playBase64Audio`, `speak`, `speakWithFallback`,
 * `speakChunked`, le préchauffage — ne pouvait plus s'exécuter. Du code mort
 * qui a l'air vivant se relit comme une architecture : on croit qu'une voix
 * cloud existe, on raisonne dessus, on la débogue. C'est exactement ce qui nous
 * est arrivé avec Whisper.
 *
 * `stopChunkedSpeaking` est parti avec : il levait un drapeau que plus personne
 * ne lisait. Les trois écrans qui l'appelaient appellent `stopAllAudio`, qui
 * fait le travail réel. `stopSpeaking` reste : c'est un alias honnête, il ne
 * promet rien qu'il ne tienne.
 *
 * Le nom du fichier n'est pas corrigé ici : le renommer toucherait dix imports
 * pour zéro effet sur une marchande. Ce commentaire fait le travail.
 */

// ─────────────────────────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────────────────────────

let _currentAudio: HTMLAudioElement | null = null;
let _sharedAudioContext: AudioContext | null = null;

export type TTSLang = "french" | "dioula" | "bambara";

export function getSharedAudioContext(): AudioContext {
  if (!_sharedAudioContext || _sharedAudioContext.state === "closed") {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    _sharedAudioContext = new AC();
  }
  return _sharedAudioContext;
}

export function base64ToBlob(base64: string, mime?: string): Blob {
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
  if (_currentAudio) {
    _currentAudio.pause();
    try { _currentAudio.src = ""; } catch (e) { console.warn('[voice]', e); }
    _currentAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

// Choix d'une voix FRANÇAISE FÉMININE pour la voix de secours : Tantie Nanti Lou
// est une femme. Par défaut le navigateur choisit souvent une voix masculine —
// on force donc une voix de femme quand l'appareil en propose une.
let _voicesCache: SpeechSynthesisVoice[] = [];
function refreshVoices(): void {
  try { _voicesCache = window.speechSynthesis?.getVoices?.() || []; } catch { _voicesCache = []; }
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  try { window.speechSynthesis.addEventListener("voiceschanged", refreshVoices); } catch { /* ignore */ }
}
// Voix de secours CHOISIE UNE FOIS puis mémorisée : toute l'appli parle avec LA
// MÊME voix (sinon on entend « un mélange de voix »). On ne retombe JAMAIS sur une
// voix non-française (ex. « Manuela », portugaise) : plutôt fr-CI, sinon fr-FR,
// sinon n'importe quelle fr-*, en préférant une voix de femme (Tata est une femme).
let _chosenVoice: SpeechSynthesisVoice | null = null;
function pickFrenchFemaleVoice(): SpeechSynthesisVoice | null {
  if (_chosenVoice) return _chosenVoice; // stable : jamais deux voix différentes
  if (_voicesCache.length === 0) refreshVoices();
  // UNIQUEMENT des voix françaises (exclut Manuela/pt, es, en…).
  const fr = _voicesCache.filter((v) => /^fr(-|_|$)/i.test(v.lang));
  if (fr.length === 0) return null; // aucune voix FR sur l'appareil → on ne force rien de faux
  const FEMME = ["amelie", "amélie", "audrey", "aurelie", "aurélie", "virginie", "julie",
    "marie", "celine", "céline", "lea", "léa", "manon", "chloe", "chloé", "sandrine",
    "female", "femme", "google français", "google france"];
  const HOMME = ["thomas", "nicolas", "paul", "daniel", "male", "homme", "guillaume", "mathieu"];
  // Priorité au dialecte : fr-CI (Côte d'Ivoire) > fr-FR > autre fr.
  const parLangue = (pred: (v: SpeechSynthesisVoice) => boolean) =>
    fr.find((v) => /fr[-_]ci/i.test(v.lang) && pred(v))
    || fr.find((v) => /fr[-_]fr/i.test(v.lang) && pred(v))
    || fr.find((v) => pred(v));
  const femme = parLangue((v) => FEMME.some((h) => v.name.toLowerCase().includes(h)));
  const nonHomme = parLangue((v) => !HOMME.some((h) => v.name.toLowerCase().includes(h)));
  _chosenVoice = femme || nonHomme || fr[0];
  return _chosenVoice;
}

/** Nom de la voix de secours retenue (diagnostic « Rapport de test »). */
export function voixSecoursNom(): string {
  try { return pickFrenchFemaleVoice()?.name || 'aucune-fr'; } catch { return 'err'; }
}
// Si les voix arrivent après coup (Android), on réévalue le choix une fois.
if (typeof window !== "undefined" && window.speechSynthesis) {
  try {
    window.speechSynthesis.addEventListener("voiceschanged", () => { _chosenVoice = null; refreshVoices(); });
  } catch { /* ignore */ }
}

// Voix de SECOURS GRATUITE : la voix intégrée du navigateur (aucun coût, tourne
// sur l'appareil, marche hors-ligne). Utilisée quand un clip pré-enregistré n'est
// pas disponible ou pour les phrases dynamiques (montants). On force une voix de
// FEMME pour rester cohérent avec Tantie Nanti Lou. Jamais muette.
export function speakBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !text?.trim()) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const voix = pickFrenchFemaleVoice();
      if (voix) u.voice = voix;
      u.lang = voix?.lang || "fr-FR";
      u.rate = 0.98;
      u.pitch = 1.1; // léger + aigu → timbre plus féminin (discret, sans déformer)
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

export function preloadAudioContext(): void {
  try {
    const ctx = getSharedAudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch (e) { console.warn('[voice]', e); }
}

// ─────────────────────────────────────────────────────────────────
// CHUNKED — prosodie simple via OpenAI
// ─────────────────────────────────────────────────────────────────

const CHUNK_MAX_CHARS = 110;
const CHUNK_MIN_CHARS = 20;

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

// ─────────────────────────────────────────────────────────────────
// MULTILINGUE — Dioula/Bambara via ANSUT
// ─────────────────────────────────────────────────────────────────

export async function fetchTTSLocal(text: string, lang: TTSLang = "french", timeoutMs = 10000): Promise<string | null> {
  // La synthèse distante est interdite pendant les parcours marchands.
  // Les futurs packs Dioula/Bambara devront fournir des clips Tata embarqués.
  void text;
  void lang;
  void timeoutMs;
  return null;
}
