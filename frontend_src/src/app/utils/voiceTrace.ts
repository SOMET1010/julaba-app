// ── Journal de VOIX en anneau (VOICE-01 — instrumentation de recette) ─────────
//
// POURQUOI. Deux observations terrain n'ont jamais pu être diagnostiquées :
// « deux voix différentes au démarrage » et « cinq tomates » compris autrement.
// Personne n'a vu le transcript BRUT, le moteur STT qui a tourné, la voix TTS
// réellement retenue, ni l'intention sortie de `intentLocal`. Ce journal note
// tout cela, horodaté, en amont des écrans (audioManager, useVoiceCore,
// AppContext.speak, offlineStt) — sans changer UNE SEULE phrase ni UNE règle
// de choix de voix (garde-fou : scripts/test-voix-trace-source.mjs).
//
// CE QU'IL EST. Une file bornée (200 entrées) en mémoire, recopiée dans
// localStorage à chaque événement : le « Rapport de test » peut donc être envoyé
// APRÈS un redémarrage de l'appli — c'est justement au démarrage qu'on entend
// « deux voix ». Il n'est JAMAIS vidé par l'écran de connexion (au contraire
// du journal de dictée de voiceDebug.ts, remis à zéro par vlogStart).
//
// CE QU'IL N'EST PAS. Pas une fonction métier, pas une télémétrie : rien ne
// part sur le réseau. Aucune donnée d'argent au-delà de ce qu'une phrase dite
// ou dictée contient déjà. Aucun appel ici ne peut jeter : une trace qui casse
// la voix serait pire que pas de trace.
//
// LECTURE. `rendu()` = une ligne par événement : heure, +écart depuis
// l'événement précédent, nom de l'événement, détail JSON. Le « Rapport de
// test » (voiceDebug.vlogDump) l'inclut et met en évidence le dernier
// transcript brut. Le journal n'est pas consommé par l'application elle-même.

export interface TraceEntree {
  /** Horodatage absolu (ms epoch). */
  t: number;
  /** Nom d'événement, MAJUSCULES_SOULIGNÉES (voir la liste ci-dessous). */
  ev: string;
  /** Détail : uniquement des valeurs sérialisables. */
  d?: Record<string, unknown>;
}

// Événements émis :
//   SESSION_JS        : chargement du bundle (un démarrage d'appli)
//   ECRAN             : arrivée sur un chemin (AppLayout)
//   TTS_APPEL         : un appelant demande à parler (AppContext.speak, useVoiceCore.ttsSpeak…)
//   TTS_CHOIX         : useVoiceCore a retenu « clip » ou « text_only » (= rien n'est dit)
//   TTS_DEMANDE       : entrée dans l'audioManager (api, priorité, pile courte de l'appelant)
//   TTS_IGNOREE       : demande refusée (muet, anti-répétition, auto en cours, rôle, voix désactivée…)
//   TTS_COUPEE        : une lecture en cours a été interrompue par une nouvelle demande / un stop
//   TTS_DEBUT/TTS_FIN : lecture effective d'un handle (durée, résultat ended/failed/cancelled)
//   TTS_MOTEUR        : moteur retenu pour un morceau : native-sherpa | navigateur | clip
//   TTS_VOIX_NAVIGATEUR : voix du téléphone retenue par speakBrowser (nom, langue, débit, hauteur)
//   TTS_NATIF_SONDE   : résultat de la sonde SherpaTts
//   TTS_MORCEAU_FIN   : fin d'un morceau (durée, moteur)
//   STT_SONDE         : résultat de la sonde SherpaStt
//   ECOUTE_DEBUT/FIN  : micro ouvert / fermé
//   STT_DEBUT/STT_FIN : transcription (moteur, transcript BRUT, durée, taille)
//   INTENTION         : ce que intentLocal / la confirmation / la question ont retenu (ou null → pas_compris)
//   EXECUTION         : l'action qui va s'exécuter (intent, type, bypass, confirmé)
//   ERREUR / INFO

const MAX = 200;
const CLE = 'julaba_journal_voix';

let tampon: TraceEntree[] = [];
let compteurLecture = 0;
// Lecture(s) TTS ouvertes (id → début) : sert à mesurer durée et interruption.
const lecturesOuvertes = new Map<number, number>();
let derniereFinTts = 0;

function maintenant(): number {
  try { return Date.now(); } catch { return 0; }
}

function persister(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CLE, JSON.stringify(tampon));
  } catch { /* quota, mode privé, WebView sans stockage : on garde la mémoire */ }
}

function charger(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const brut = localStorage.getItem(CLE);
    if (!brut) return;
    const arr = JSON.parse(brut);
    if (!Array.isArray(arr)) return;
    tampon = arr
      .filter((e) => e && typeof e.t === 'number' && typeof e.ev === 'string')
      .slice(-MAX);
  } catch { tampon = []; }
}

/** Tronque un texte pour le journal (les phrases de l'appli sont courtes ; on garde le sens). */
function court(texte: unknown, max = 160): string {
  const s = typeof texte === 'string' ? texte : texte == null ? '' : String(texte);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/** Pile COURTE : les 2 premiers cadres hors de ce module et de l'audioManager. */
function pile(): string {
  try {
    const st = (new Error().stack || '').split('\n').slice(1);
    const utiles = st
      .map((l) => l.trim().replace(/^at\s+/, ''))
      .filter((l) => l && !/voiceTrace|audioManager/.test(l))
      .slice(0, 2)
      .map((l) => l.replace(/\(?(https?:\/\/[^/]+|file:\/\/)[^\s)]*\/([^/\s)]+)\)?/, '$2').slice(0, 90));
    return utiles.join(' < ');
  } catch { return ''; }
}

/** Ajoute un événement au journal. Ne jette jamais. */
export function tracer(ev: string, d?: Record<string, unknown>): void {
  try {
    tampon.push(d ? { t: maintenant(), ev, d } : { t: maintenant(), ev });
    while (tampon.length > MAX) tampon.shift();
    persister();
  } catch { /* ignore */ }
}

/** Repère de temps (ms) pour mesurer une durée. */
export function top(): number {
  return maintenant();
}

// ── Aides typées (une ligne à l'appel : c'est ce que le garde-fou de source exige) ──

/** Un appelant demande à parler (source lisible + texte). */
export function ttsAppel(source: string, texte: string, detail?: Record<string, unknown>): void {
  tracer('TTS_APPEL', { source, texte: court(texte), ...(detail || {}) });
}

/** useVoiceCore : mode retenu pour un texte français (`clip` = voix réelle de Tata ; `text_only` = RIEN n'est dit). */
export function ttsChoix(source: string, texte: string, mode: string, clipUrl?: string | null): void {
  tracer('TTS_CHOIX', { source, texte: court(texte), mode, clip: clipUrl || null, dit: mode === 'clip' });
}

/** Entrée dans l'audioManager (api publique), avec une pile courte de l'appelant. */
export function ttsDemande(api: string, texte: string, opts?: { priority?: string; dedupeKey?: string } | Record<string, unknown>): void {
  const o = (opts || {}) as { priority?: string; dedupeKey?: string };
  tracer('TTS_DEMANDE', { api, texte: court(texte), priorite: o.priority ?? 'user', cle: o.dedupeKey ?? null, pile: pile() });
}

/** Demande refusée et pourquoi. */
export function ttsIgnoree(source: string, texte: string, raison: string): void {
  tracer('TTS_IGNOREE', { source, texte: court(texte), raison });
}

/** Une lecture active est coupée (nouvelle demande, navigation, stop, mute). */
export function ttsCoupee(): void {
  let depuisMs: number | null = null;
  try {
    const debuts = Array.from(lecturesOuvertes.values());
    if (debuts.length) depuisMs = maintenant() - Math.min(...debuts);
  } catch { /* ignore */ }
  tracer('TTS_COUPEE', { lecturesOuvertes: lecturesOuvertes.size, depuisMs, pile: pile() });
}

/** Début d'une lecture effective ; renvoie un id à passer à ttsFin. */
export function ttsDebut(): number {
  const id = ++compteurLecture;
  const t = maintenant();
  lecturesOuvertes.set(id, t);
  // Écart avec la fin de la voix précédente : « deux voix qui se suivent ».
  tracer('TTS_DEBUT', { id, ecartDepuisFinPrecedenteMs: derniereFinTts ? t - derniereFinTts : null, lecturesEnParallele: lecturesOuvertes.size });
  return id;
}

/** Fin d'une lecture (ended / failed / cancelled) avec sa durée. */
export function ttsFin(id: number, resultat: string): void {
  const debut = lecturesOuvertes.get(id);
  lecturesOuvertes.delete(id);
  const t = maintenant();
  derniereFinTts = t;
  tracer('TTS_FIN', { id, resultat, dureeMs: debut ? t - debut : null });
}

/** Moteur retenu pour un morceau : 'native-sherpa' (WAV Piper/SIWIS), 'navigateur' (speechSynthesis), 'clip' (mp3 Tata). */
export function ttsMoteur(moteur: 'native-sherpa' | 'navigateur' | 'clip', detail?: Record<string, unknown>): void {
  const d = { ...(detail || {}) } as Record<string, unknown>;
  if (typeof d.chunk === 'string') d.chunk = court(d.chunk);
  tracer('TTS_MOTEUR', { moteur, ...d });
}

/** Fin d'un morceau (durée réelle par moteur). */
export function ttsMorceauFin(moteur: string, chunk: string, depuis: number, resultat?: string): void {
  tracer('TTS_MORCEAU_FIN', { moteur, chunk: court(chunk), dureeMs: maintenant() - depuis, resultat: resultat ?? null });
}

/** Voix du téléphone retenue par speakBrowser. */
export function ttsVoixNavigateur(voix: { name?: string; lang?: string } | string | null | undefined, lang: string, rate?: number, pitch?: number): void {
  const nom = typeof voix === 'string' ? voix : voix?.name ?? null;
  tracer('TTS_VOIX_NAVIGATEUR', { nom, lang, voixLang: typeof voix === 'object' && voix ? voix.lang ?? null : null, rate: rate ?? null, pitch: pitch ?? null });
}

/** Micro ouvert / fermé. */
export function ecoute(phase: 'debut' | 'fin', source: string, detail?: Record<string, unknown>): void {
  tracer(phase === 'debut' ? 'ECOUTE_DEBUT' : 'ECOUTE_FIN', { source, ...(detail || {}) });
}

/** Début de transcription ; renvoie un repère de temps pour sttFin. */
export function sttDebut(source: string, detail?: Record<string, unknown>): number {
  tracer('STT_DEBUT', { source, ...(detail || {}) });
  return maintenant();
}

/** Fin de transcription : moteur, transcript BRUT (non tronqué au sens, 300 car.), durée. */
export function sttFin(source: string, moteur: string, transcript: string, depuis: number, detail?: Record<string, unknown>): void {
  tracer('STT_FIN', { source, moteur, transcript: court(transcript, 300), vide: !transcript, dureeMs: maintenant() - depuis, ...(detail || {}) });
}

/** Intention retenue pour un transcript, ou null → « pas_compris ». */
export function intention(
  source: string,
  transcript: string,
  resultat: { intent?: string; action?: { type?: string; produit?: string; quantite?: number; montant?: number; description?: string }; response?: string; needsConfirmation?: boolean } | null | undefined,
): void {
  if (!resultat) {
    tracer('INTENTION', { source, transcript: court(transcript, 300), compris: false, intent: 'pas_compris' });
    return;
  }
  const a = resultat.action || {};
  tracer('INTENTION', {
    source,
    transcript: court(transcript, 300),
    compris: true,
    intent: resultat.intent ?? null,
    action: a.type ?? null,
    produit: a.produit ?? null,
    quantite: a.quantite ?? null,
    montant: a.montant ?? null,
    reponse: court(resultat.response ?? '', 120),
    confirmation: resultat.needsConfirmation ?? null,
  });
}

/** Arrivée sur un écran (chemin). */
export function ecran(chemin: string): void {
  tracer('ECRAN', { chemin });
}

/** Erreur observée (message court, jamais de pile complète). */
export function erreur(source: string, message: unknown): void {
  tracer('ERREUR', { source, message: court(message instanceof Error ? message.message : message, 200) });
}

/** Information libre (sonde moteur, état prêt, exécution…). */
export function info(ev: string, detail?: Record<string, unknown>): void {
  tracer(ev, detail);
}

// ── Lecture ───────────────────────────────────────────────────────────────

/** Copie des entrées, de la plus ancienne à la plus récente. */
export function entrees(): TraceEntree[] {
  return tampon.slice();
}

/** Dernier transcript brut non vide entendu par un moteur STT (ou null). */
export function dernierTranscript(): string | null {
  for (let i = tampon.length - 1; i >= 0; i--) {
    const e = tampon[i];
    if (e.ev === 'STT_FIN' && typeof e.d?.transcript === 'string' && e.d.transcript) return e.d.transcript;
  }
  return null;
}

/** Dernier moteur/voix effectivement utilisé (TTS_MOTEUR), ou null. */
export function derniereVoix(): Record<string, unknown> | null {
  for (let i = tampon.length - 1; i >= 0; i--) {
    if (tampon[i].ev === 'TTS_MOTEUR') return tampon[i].d ?? null;
  }
  return null;
}

/** Dernière voix du téléphone retenue par speakBrowser (nom + langue), ou null. */
export function derniereVoixNavigateur(): Record<string, unknown> | null {
  for (let i = tampon.length - 1; i >= 0; i--) {
    if (tampon[i].ev === 'TTS_VOIX_NAVIGATEUR') return tampon[i].d ?? null;
  }
  return null;
}

function heure(t: number): string {
  try {
    const d = new Date(t);
    const p = (n: number, l = 2) => String(n).padStart(l, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
  } catch { return String(t); }
}

/** Rendu texte : UNE ligne par événement — heure, +écart, événement, détail JSON. */
export function rendu(): string {
  const lignes: string[] = [];
  let prev: number | null = null;
  for (const e of tampon) {
    const ecart = prev == null ? '' : `+${String(Math.max(0, e.t - prev)).padStart(6, ' ')}ms`;
    let d = '';
    if (e.d !== undefined) { try { d = ' ' + JSON.stringify(e.d); } catch { d = ' [?]'; } }
    lignes.push(`${heure(e.t)} ${ecart.padStart(10, ' ')}  ${e.ev}${d}`);
    prev = e.t;
  }
  return lignes.join('\n');
}

/** Vide le journal (mémoire + stockage). */
export function vider(): void {
  tampon = [];
  lecturesOuvertes.clear();
  derniereFinTts = 0;
  persister();
}

// ── Tests ─────────────────────────────────────────────────────────────────

/** Remet le module à zéro (mémoire ET stockage). Réservé aux tests. */
export function __reinitialiserPourTests(): void {
  vider();
  compteurLecture = 0;
}

/** Recharge depuis localStorage comme au démarrage. Réservé aux tests. */
export function __rechargerDepuisStockagePourTests(): void {
  tampon = [];
  charger();
}

// ── Démarrage : on recharge l'historique, puis on marque ce chargement du bundle ──
charger();
tracer('SESSION_JS', {
  demarrage: true,
  enLigne: typeof navigator !== 'undefined' ? navigator.onLine : null,
});
