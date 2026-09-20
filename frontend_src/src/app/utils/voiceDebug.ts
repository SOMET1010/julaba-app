// ── Journal de diagnostic de la dictée vocale (phase de test) ────────────────
// But : Patrick teste sur son téléphone, appuie sur « Rapport de test », et nous
// envoie le journal. On voit alors EXACTEMENT ce que la reconnaissance a renvoyé
// (transcriptions, chiffres extraits, relances, erreurs) pour déboguer sans
// deviner. Aucune donnée sensible : uniquement des événements techniques.

//
// DEUX JOURNAUX, ET POURQUOI. Celui-ci (« dictée ») est remis à zéro par
// vlogStart à chaque arrivée sur l'écran de connexion et à chaque dictée : il
// raconte UNE session d'écran. Le journal de VOIX en anneau (voiceTrace.ts)
// n'est jamais remis à zéro et survit dans localStorage : il raconte ce que
// l'appli a DIT et ENTENDU (moteurs, voix, transcripts bruts, intentions) sur
// tous les écrans, y compris connectée. Le rapport ci-dessous réunit les deux.

import { voixSecoursNom } from '../services/elevenlabs';
import * as vtrace from './voiceTrace';

interface LogEntry { t: number; ev: string; data?: unknown }

const MAX = 400;
let buffer: LogEntry[] = [];
let t0 = 0;

function now(): number {
  try { return Date.now(); } catch { return 0; }
}

/** Démarre une nouvelle session de journal (remet le compteur de temps à zéro). */
export function vlogStart(label: string): void {
  t0 = now();
  buffer = [];
  vlog('SESSION', label);
  // Repère dans le journal de voix (jamais vidé) : « ici commence l'écran de
  // connexion / une dictée » — utile pour situer les voix du démarrage.
  vtrace.info('SESSION_VLOG', { label });
  vlog('DEVICE', {
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    lang: typeof navigator !== 'undefined' ? navigator.language : '',
    online: typeof navigator !== 'undefined' ? navigator.onLine : null,
    SR: typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    synth: typeof window !== 'undefined' && !!window.speechSynthesis,
  });
  journaliserVoix('VOICES');
  // getVoices() renvoie souvent une liste VIDE au tout premier appel : le
  // catalogue du téléphone se charge de manière asynchrone. Sans ce second
  // relevé, un rapport ouvert dès l'arrivée sur l'écran ferait croire que
  // l'appareil n'a AUCUNE voix française — et nous enverrait chercher une
  // panne de moteur vocal inexistante. On réécoute donc une fois.
  try {
    const synth = window.speechSynthesis;
    if (synth && !(synth.getVoices?.() || []).length) {
      synth.addEventListener?.('voiceschanged', () => journaliserVoix('VOICES_TARDIVES'), { once: true });
    }
  } catch { /* ignore */ }
}

/** Relève le catalogue de voix du téléphone (pour voir « Manuela » & Cie). */
function journaliserVoix(ev: string): void {
  try {
    const vs = window.speechSynthesis?.getVoices?.() || [];
    vlog(ev, {
      total: vs.length,
      fr: vs.filter((v) => /^fr/i.test(v.lang)).map((v) => `${v.name}(${v.lang})`),
      defaut: vs.find((v) => v.default)?.name || null,
    });
  } catch { /* ignore */ }
}

/** Ajoute un événement au journal. */
export function vlog(ev: string, data?: unknown): void {
  try {
    if (t0 === 0) t0 = now();
    buffer.push({ t: now() - t0, ev, data });
    if (buffer.length > MAX) buffer.shift();
  } catch { /* ignore */ }
}

/** Contexte appareil / version / réseau (en tête du rapport). */
function contexteRapport(): string[] {
  const l: string[] = ['=== CONTEXTE ==='];
  try { l.push(`version: ${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}`); } catch { l.push('version: ?'); }
  try { l.push(`build: ${typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '?'}`); } catch { l.push('build: ?'); }
  try { l.push(`date: ${new Date().toISOString()}`); } catch { /* ignore */ }
  try {
    l.push(`appareil (UA): ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`);
    l.push(`langue: ${typeof navigator !== 'undefined' ? navigator.language : ''}`);
    l.push(`en ligne: ${typeof navigator !== 'undefined' ? String(navigator.onLine) : '?'}`);
  } catch { /* ignore */ }
  try {
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    l.push(`plateforme: ${cap?.getPlatform ? cap.getPlatform() : 'web'}`);
    l.push(`plugins natifs: SherpaStt=${!!(cap as { Plugins?: Record<string, unknown> } | undefined)?.Plugins?.SherpaStt} SherpaTts=${!!(cap as { Plugins?: Record<string, unknown> } | undefined)?.Plugins?.SherpaTts}`);
  } catch { l.push('plateforme: web'); }
  try {
    l.push(`speechSynthesis: ${typeof window !== 'undefined' && !!window.speechSynthesis}`);
    l.push(`voix désactivée (julaba_voice_disabled): ${typeof localStorage !== 'undefined' ? localStorage.getItem('julaba_voice_disabled') === 'true' : '?'}`);
  } catch { /* ignore */ }
  return l;
}

/** Voix retenue et moteurs (ce que le téléphone a RÉELLEMENT utilisé). */
function voixRetenueRapport(): string[] {
  const l: string[] = ['=== VOIX RETENUE ==='];
  try { l.push(`voix de secours (speakBrowser, choisie par elevenlabs.ts): ${voixSecoursNom()}`); } catch { l.push('voix de secours: ?'); }
  try {
    const nav = vtrace.derniereVoixNavigateur();
    l.push(`dernière voix du téléphone entendue: ${nav ? JSON.stringify(nav) : 'aucune (speakBrowser jamais appelé)'}`);
    const dv = vtrace.derniereVoix();
    l.push(`dernier moteur TTS utilisé: ${dv ? JSON.stringify(dv) : 'aucun'}`);
    const moteurs = new Map<string, number>();
    for (const e of vtrace.entrees()) if (e.ev === 'TTS_MOTEUR') moteurs.set(String(e.d?.moteur), (moteurs.get(String(e.d?.moteur)) || 0) + 1);
    l.push(`moteurs TTS vus dans le journal: ${moteurs.size ? Array.from(moteurs).map(([k, v]) => `${k}×${v}`).join(', ') : 'aucun'}`);
    const stt = new Set<string>();
    for (const e of vtrace.entrees()) if (e.ev === 'STT_FIN' && e.d?.moteur) stt.add(String(e.d.moteur));
    l.push(`moteurs STT vus dans le journal: ${stt.size ? Array.from(stt).join(', ') : 'aucun (pas de dictée)'}`);
  } catch { /* ignore */ }
  return l;
}

/** Construit le texte du rapport (à copier / partager). */
export function vlogDump(): string {
  const lignes = buffer.map((e) => {
    const ms = String(e.t).padStart(6, ' ');
    let d = '';
    if (e.data !== undefined) {
      try { d = ' ' + (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)); } catch { d = ' [?]'; }
    }
    return `+${ms}ms  ${e.ev}${d}`;
  });
  // Le DERNIER transcript brut en tête : c'est la première chose qu'on cherche
  // (« qu'a entendu le STT quand elle a dit cinq tomates ? »).
  const dernier = vtrace.dernierTranscript();
  const derniereIntention = vtrace.entrees().filter((e) => e.ev === 'INTENTION').pop();
  const anneau = vtrace.rendu();
  return [
    ...contexteRapport(),
    '',
    '=== DERNIER TRANSCRIPT BRUT ===',
    dernier ? `« ${dernier} »` : '(aucune dictée dans le journal)',
    derniereIntention ? `dernière intention: ${JSON.stringify(derniereIntention.d)}` : 'dernière intention: (aucune)',
    '',
    ...voixRetenueRapport(),
    '',
    `=== JOURNAL VOIX (anneau, ${vtrace.entrees().length} événements, du plus ancien au plus récent) ===`,
    anneau || '(vide)',
    '',
    '=== JOURNAL DICTÉE JULABA ===',
    ...lignes,
    '=== FIN ===',
  ].join('\n');
}

/** Copie le rapport dans le presse-papier ; sinon le partage ; renvoie le texte. */
export async function vlogPartager(): Promise<{ methode: 'partage' | 'copie' | 'aucune'; texte: string }> {
  const texte = vlogDump();
  try {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) { await nav.share({ title: 'Journal Julaba', text: texte }); return { methode: 'partage', texte }; }
  } catch { /* annulé → on tente la copie */ }
  try { await navigator.clipboard.writeText(texte); return { methode: 'copie', texte }; }
  catch { return { methode: 'aucune', texte }; }
}
