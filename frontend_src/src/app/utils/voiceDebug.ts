// ── Journal de diagnostic de la dictée vocale (phase de test) ────────────────
// But : Patrick teste sur son téléphone, appuie sur « Rapport de test », et nous
// envoie le journal. On voit alors EXACTEMENT ce que la reconnaissance a renvoyé
// (transcriptions, chiffres extraits, relances, erreurs) pour déboguer sans
// deviner. Aucune donnée sensible : uniquement des événements techniques.

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
  return ['=== JOURNAL DICTÉE JULABA ===', ...lignes, '=== FIN ==='].join('\n');
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
