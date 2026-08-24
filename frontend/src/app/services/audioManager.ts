/**
 * audioManager.ts — CHEF D'ORCHESTRE de la voix (une seule source à la fois).
 *
 * Problème résolu : l'appli parlait « tous azimuts » — plusieurs composants
 * déclenchaient chacun leur voix, sur DEUX canaux (voix navigateur + clips
 * enregistrés) sans se couper mutuellement.
 *
 * Politique (voulue, PAS une file FIFO naïve qui rejouerait un backlog) :
 *  1. une seule source audio à la fois ;
 *  2. une action utilisateur ('user') interrompt toute annonce automatique ('auto') ;
 *  3. une 'auto' ne s'empile pas : abandonnée si quelque chose est en cours ;
 *  4. dédup + délai anti-répétition (dedupeKey / minRepeatMs) ;
 *  5. TTS et clips s'arrêtent mutuellement ;
 *  6. arrêt + nettoyage complets (navigation, démontage, mute).
 *
 * CONCURRENCE — points durs traités :
 *  - ANNULATION QUI RÉSOUT TOUJOURS. Chaque lecture expose un handle { promise, stop }.
 *    `stop()` arrête l'audio ET résout la promesse ('cancelled') immédiatement — même
 *    si l'élément HTMLAudio ne réémet ni `ended` ni `error` après `pause()`. La chaîne
 *    de sérialisation n'attend donc jamais une promesse pendante (pas de blocage).
 *  - PAS DE DRAPEAU PARTAGÉ. Chaque lecture TTS possède son propre état d'annulation
 *    (closure), donc une nouvelle lecture ne peut pas « réveiller » l'ancienne boucle.
 *  - « LA PLUS RÉCENTE GAGNE ». Si N requêtes s'empilent, chaque maillon vérifie sa
 *    génération et seules la dernière joue (les intermédiaires sont sautées).
 *
 * Les lectures réelles (voix navigateur / HTMLAudio) sont chargées PARESSEUSEMENT
 * (import dynamique) et sont INJECTABLES (__setPlayers) → le cœur est testable en
 * Node sans DOM ni speechSynthesis.
 */

export type VoicePriority = "user" | "auto";
export type PlayResult = "ended" | "failed" | "cancelled";

/** Une lecture en cours : sa promesse résout TOUJOURS ; stop() la force à résoudre. */
export interface Playback {
  promise: Promise<PlayResult>;
  stop: () => void;
}

export interface VoiceOptions {
  priority?: VoicePriority;
  dedupeKey?: string;
  minRepeatMs?: number;
}

const DEFAULT_MIN_REPEAT_MS = 8000;

// ── État global (un seul pipeline pour toute l'appli) ─────────────────────────
let _generation = 0; // bump à chaque coupure → « la plus récente gagne »
let _inFlight = false; // une requête est réservée ou en cours
let _muted = false;
let _chain: Promise<void> = Promise.resolve(); // sérialise les lectures
let _current: Playback | null = null; // lecture active (pour la couper)
const _lastSpokenAt = new Map<string, number>();

// ── Lecteurs bas-niveau (réels), INJECTABLES pour les tests ───────────────────

// Bas-niveau TTS (import paresseux d'elevenlabs), INJECTABLE pour les tests.
const defaultTtsSplit = async (text: string): Promise<string[]> => {
  const { splitIntoChunks } = await import("./elevenlabs");
  return splitIntoChunks(text);
};
const defaultTtsSpeakChunk = async (chunk: string): Promise<void> => {
  const { speakBrowser } = await import("./elevenlabs");
  await speakBrowser(chunk); // résout sur end/error ; stop() coupe le synthé
};
let _ttsSplit = defaultTtsSplit;
let _ttsSpeakChunk = defaultTtsSpeakChunk;

/** Voix navigateur, en chunks, avec état d'annulation PROPRE (pas de drapeau partagé). */
function realStartTts(text: string): Playback {
  let settled = false;
  let cancelled = false;
  let settle!: (r: PlayResult) => void;
  const promise = new Promise<PlayResult>((res) => (settle = res));
  // done() est IDEMPOTENT : la promesse résout TOUJOURS, une seule fois.
  const done = (r: PlayResult) => {
    if (settled) return;
    settled = true;
    settle(r);
  };
  (async () => {
    try {
      const chunks = await _ttsSplit(text);
      if (cancelled) return;
      for (const chunk of chunks) {
        if (cancelled) return;
        await _ttsSpeakChunk(chunk);
        if (cancelled) return;
      }
      done("ended");
    } catch {
      // Toute erreur (import dynamique, split, synthé) résout la promesse au lieu
      // de la laisser pendante (sinon la chaîne resterait occupée).
      done("failed");
    }
  })();
  const stop = () => {
    if (settled) return;
    cancelled = true;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    done("cancelled");
  };
  return { promise, stop };
}

/** Clip enregistré (base64 ou URL) via HTMLAudio ; résout ended/failed, stop()→cancelled. */
function realStartClip(source: { base64?: string; url?: string }): Playback {
  let settled = false;
  let settle!: (r: PlayResult) => void;
  const promise = new Promise<PlayResult>((res) => (settle = res));
  let audio: HTMLAudioElement | null = null;
  let revoke = () => {};
  const done = (r: PlayResult) => {
    if (settled) return;
    settled = true;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
    }
    revoke();
    settle(r);
  };
  (async () => {
    try {
      let url = source.url ?? "";
      if (source.base64) {
        const { base64ToBlob } = await import("./elevenlabs");
        if (settled) return;
        const objUrl = URL.createObjectURL(base64ToBlob(source.base64));
        url = objUrl;
        revoke = () => {
          try {
            URL.revokeObjectURL(objUrl);
          } catch {
            /* ignore */
          }
        };
      }
      if (settled) return;
      audio = new Audio(url);
      audio.onended = () => done("ended");
      audio.onerror = () => done("failed");
      audio.play().catch(() => done("failed"));
    } catch {
      done("failed");
    }
  })();
  const stop = () => done("cancelled");
  return { promise, stop };
}

let _ttsPlayer: (text: string) => Playback = realStartTts;
let _clipPlayer: (source: { base64?: string; url?: string }) => Playback = realStartClip;

// ── Contrôles d'arrêt ─────────────────────────────────────────────────────────

/**
 * Coupe la lecture active (audio + résolution immédiate de sa promesse) et bump la
 * génération. Ne laisse JAMAIS une promesse pendante bloquer la chaîne.
 */
function hardStop(): void {
  _generation++;
  _inFlight = false;
  const cur = _current;
  _current = null;
  if (cur) cur.stop();
}

/** Arrêt + nettoyage complets (démontage, mute). */
export function stopAllVoice(): void {
  hardStop();
}

/** Navigation / changement d'écran : les annonces de l'écran quitté sont obsolètes. */
export function cancelObsoleteVoice(): void {
  hardStop();
}

/** Mute global : coupe et empêche toute voix tant qu'il est actif. */
export function setVoiceMuted(muted: boolean): void {
  _muted = muted;
  if (muted) hardStop();
}

function isThrottled(opts?: VoiceOptions): boolean {
  if (!opts?.dedupeKey) return false;
  const last = _lastSpokenAt.get(opts.dedupeKey) ?? 0;
  const windowMs = opts.minRepeatMs ?? DEFAULT_MIN_REPEAT_MS;
  return Date.now() - last < windowMs;
}

// ── Cœur : exclusivité + sérialisation ────────────────────────────────────────

/** Joue un handle en l'enregistrant comme lecture active ; renvoie son résultat. */
async function playHandle(pb: Playback, myGen: number): Promise<PlayResult> {
  if (_generation !== myGen || _muted) {
    pb.stop();
    return "cancelled";
  }
  _current = pb;
  try {
    return await pb.promise; // résout toujours (ended/failed/cancelled)
  } finally {
    if (_current === pb) _current = null;
  }
}

/**
 * Lance UN « job » en exclusivité selon la politique. `job(myGen)` orchestre une ou
 * plusieurs lectures via playHandle ; il n'est appelé que si la requête n'a pas été
 * supplantée entre-temps.
 */
function runExclusive(job: (myGen: number) => Promise<void>, opts?: VoiceOptions): Promise<void> {
  if (_muted) return Promise.resolve();
  const priority: VoicePriority = opts?.priority ?? "auto";

  if (isThrottled(opts)) return Promise.resolve(); // règle 4
  if (priority === "auto" && _inFlight) return Promise.resolve(); // règle 3

  hardStop(); // règles 1,2,5 : coupe l'actif (et résout sa promesse)
  const myGen = _generation;
  _inFlight = true; // synchrone : réserve le pipeline
  if (opts?.dedupeKey) _lastSpokenAt.set(opts.dedupeKey, Date.now());

  _chain = _chain.then(async () => {
    if (_generation !== myGen || _muted) {
      if (_generation === myGen) _inFlight = false;
      return; // supplanté (« la plus récente gagne ») ou mute
    }
    try {
      await job(myGen);
    } catch {
      /* ignore */
    } finally {
      if (_generation === myGen) _inFlight = false;
    }
  });

  return _chain;
}

// ── API publique ──────────────────────────────────────────────────────────────

/** Fait parler (voix navigateur). Priorité 'user' par défaut (interrompt). */
export function speak(text: string, opts?: VoiceOptions): Promise<void> {
  if (!text?.trim()) return Promise.resolve();
  return runExclusive((g) => playHandle(_ttsPlayer(text), g).then(() => {}), {
    priority: "user",
    ...opts,
  });
}

/** Annonce automatique (n'interrompt jamais, ne s'empile pas ; dédup conseillée). */
export function speakAuto(text: string, opts?: Omit<VoiceOptions, "priority">): Promise<void> {
  if (!text?.trim()) return Promise.resolve();
  return runExclusive((g) => playHandle(_ttsPlayer(text), g).then(() => {}), {
    ...opts,
    priority: "auto",
  });
}

/** Joue un clip enregistré (base64 ou URL). Priorité 'user' par défaut. */
export function playClip(
  source: { base64?: string; url?: string },
  opts?: VoiceOptions
): Promise<void> {
  return runExclusive((g) => playHandle(_clipPlayer(source), g).then(() => {}), {
    priority: "user",
    ...opts,
  });
}

/**
 * « Clip sinon voix de secours » — pour la vente vocale : joue le clip enregistré,
 * et SEULEMENT s'il échoue (indisponible) bascule sur la voix de synthèse, le tout
 * dans le MÊME créneau exclusif (pas de chevauchement clip/secours).
 */
export function speakClipOrText(
  args: { clipUrl?: string; base64?: string; text?: string },
  opts?: VoiceOptions
): Promise<void> {
  return runExclusive(async (g) => {
    if (args.clipUrl || args.base64) {
      const res = await playHandle(_clipPlayer({ url: args.clipUrl, base64: args.base64 }), g);
      if (res !== "failed") return; // ended ou cancelled → terminé
      if (_generation !== g || _muted) return; // coupé pendant le clip → ne pas enchaîner
    }
    if (args.text?.trim()) await playHandle(_ttsPlayer(args.text), g);
  }, { priority: "user", ...opts });
}

/**
 * Source RÉSOLUE À CHAUD dans le créneau exclusif (ex. requête réseau TTS distant) :
 * la génération est capturée AVANT le `resolve`, donc un stop()/navigation pendant la
 * requête empêche le démarrage de la lecture (plus de voix qui repart après Stop).
 */
export function speakDynamic(
  resolveSource: () => Promise<{ base64?: string; url?: string; text?: string }>,
  opts?: VoiceOptions
): Promise<void> {
  return runExclusive(async (myGen) => {
    const cancelled = () => _generation !== myGen || _muted;
    let src: { base64?: string; url?: string; text?: string } = {};
    try {
      src = await resolveSource();
    } catch {
      src = {};
    }
    if (cancelled()) return; // stop/navigation pendant la requête → on ne lance rien
    if (src.base64 || src.url) {
      const res = await playHandle(_clipPlayer({ base64: src.base64, url: src.url }), myGen);
      if (res !== "failed") return;
      if (cancelled()) return;
    }
    if (src.text?.trim()) await playHandle(_ttsPlayer(src.text), myGen);
  }, { priority: "user", ...opts });
}

// ── Hooks de test (n'affectent pas la prod) ───────────────────────────────────

/** Injecte des lecteurs factices (tests). */
export function __setPlayers(
  tts: (text: string) => Playback,
  clip: (source: { base64?: string; url?: string }) => Playback
): void {
  _ttsPlayer = tts;
  _clipPlayer = clip;
}

/** Restaure les lecteurs réels. */
export function __resetPlayers(): void {
  _ttsPlayer = realStartTts;
  _clipPlayer = realStartClip;
}

/** Injecte le bas-niveau TTS (découpe + diction d'un chunk) pour tester realStartTts. */
export function __setLowLevel(
  split: (text: string) => Promise<string[]>,
  speakChunk: (chunk: string) => Promise<void>
): void {
  _ttsSplit = split;
  _ttsSpeakChunk = speakChunk;
}

/** Restaure le bas-niveau TTS réel. */
export function __resetLowLevel(): void {
  _ttsSplit = defaultTtsSplit;
  _ttsSpeakChunk = defaultTtsSpeakChunk;
}

/** Réinitialise l'état global (tests). */
export function __reset(): void {
  _generation = 0;
  _inFlight = false;
  _muted = false;
  _chain = Promise.resolve();
  _current = null;
  _lastSpokenAt.clear();
}

/** Introspection pour les tests. */
export function __state(): { inFlight: boolean; muted: boolean; generation: number } {
  return { inFlight: _inFlight, muted: _muted, generation: _generation };
}
