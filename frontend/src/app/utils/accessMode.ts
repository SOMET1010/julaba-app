// ──────────────────────────────────────────────────────────────────────────
// MODE D'ACCÈS — Julaba s'adapte à l'utilisatrice, pas l'inverse.
//
// Source de vérité APP-WIDE : n'importe quel écran (connexion, caisse, crédit,
// stock…) lit `getEffectiveMode()` pour présenter la BONNE interface. Cohérence
// garantie partout à partir d'un seul profil.
//
// Profils :
//   • 'auto'    🔵 — RECOMMANDÉ : Julaba OBSERVE (clavier vs micro) et s'adapte
//                    toute seule ; Tata demande avant de changer.
//   • 'lecture' 🟢 — sait lire/écrire : clavier d'office, peu de voix, va vite.
//   • 'mixte'   🟡 — lit un peu : texte + voix, clavier ↔ micro facile.
//   • 'voix'    🟠 — ne lit pas : Tata guide, micro au centre, très peu de texte.
//
// En mode 'auto', le mode EFFECTIF (lecture/mixte/voix) est déduit de l'usage réel.
// ──────────────────────────────────────────────────────────────────────────

export type AccessMode = 'auto' | 'lecture' | 'mixte' | 'voix';
export type EffectiveMode = 'lecture' | 'mixte' | 'voix';

const KEY = 'julaba_access_mode';
const STATS_KEY = 'julaba_access_stats';
export const ACCESS_MODE_EVENT = 'julaba:access-mode';

// Seuils d'apprentissage (réglés pour être VISIBLES vite en test, pas « quelques
// jours » de calendrier : on compte les connexions, pas les jours).
const MIN_ACTIONS = 3;      // en dessous : pas assez de recul → 'mixte'
const LEAN = 0.7;           // ≥70 % d'un canal → penche vers ce mode
const ASK_AFTER = 4;        // propose l'adaptation après 4 connexions marquées
const ASK_STRONG = 0.75;    // …si la préférence est franche (≥75 %)
const ASK_SNOOZE = 4;       // re-propose au plus tôt 4 connexions après un refus

interface Stats { clavier: number; voix: number; logins: number; lastAsk: number }
function readStats(): Stats {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    return { clavier: s.clavier | 0, voix: s.voix | 0, logins: s.logins | 0, lastAsk: s.lastAsk | 0 };
  } catch { return { clavier: 0, voix: 0, logins: 0, lastAsk: 0 }; }
}
function writeStats(s: Stats): void {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Mode CHOISI (peut être 'auto'). Défaut 'auto' (recommandé) tant que non choisi. */
export function getAccessMode(): AccessMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'auto' || v === 'lecture' || v === 'mixte' || v === 'voix') return v;
  } catch { /* ignore */ }
  return 'auto';
}

/** Vrai si l'utilisatrice a déjà répondu au choix (sinon on le lui demande). */
export function accessModeChoisi(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

/** Enregistre le mode + notifie l'appli (les écrans se ré-adaptent en direct). */
export function setAccessMode(m: AccessMode): void {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(ACCESS_MODE_EVENT, { detail: m })); } catch { /* ignore */ }
}

/** Note comment l'utilisatrice vient de s'identifier (clavier ou voix). 1×/connexion. */
export function noterCanal(canal: 'clavier' | 'voix'): void {
  const s = readStats();
  s[canal] += 1;
  s.logins += 1;
  writeStats(s);
}

/** Mode EFFECTIF (jamais 'auto') : ce que l'interface doit réellement appliquer. */
export function getEffectiveMode(): EffectiveMode {
  const m = getAccessMode();
  if (m !== 'auto') return m;
  const s = readStats();
  const total = s.clavier + s.voix;
  if (total < MIN_ACTIONS) return 'mixte';
  const rClavier = s.clavier / total;
  if (rClavier >= LEAN) return 'lecture';
  if (rClavier <= 1 - LEAN) return 'voix';
  return 'mixte';
}

/**
 * En mode 'auto' : si l'usage penche FRANCHEMENT d'un côté et qu'on n'a pas
 * demandé récemment, renvoie une proposition à confirmer par Tata. Sinon null.
 */
export function suggestionAuto(): { mode: EffectiveMode; texte: string } | null {
  if (getAccessMode() !== 'auto') return null;
  const s = readStats();
  const total = s.clavier + s.voix;
  if (total < MIN_ACTIONS || s.logins < ASK_AFTER) return null;
  if (s.logins - s.lastAsk < ASK_SNOOZE) return null; // on ne harcèle pas
  const rClavier = s.clavier / total;
  if (rClavier >= ASK_STRONG) {
    return { mode: 'lecture', texte: "J'ai remarqué que tu préfères le clavier. Veux-tu que Julaba s'adapte ?" };
  }
  if (rClavier <= 1 - ASK_STRONG) {
    return { mode: 'voix', texte: "J'ai remarqué que tu préfères me parler. Veux-tu que Julaba s'adapte ?" };
  }
  return null;
}

/** Mémorise qu'on vient de proposer l'adaptation (met en pause les relances). */
export function marquerDemande(): void {
  const s = readStats();
  s.lastAsk = s.logins;
  writeStats(s);
}

// Helpers d'adaptation — prennent le mode EFFECTIF par défaut.
export function voixDAbord(m: EffectiveMode = getEffectiveMode()): boolean { return m === 'voix'; }
export function clavierParDefaut(m: EffectiveMode = getEffectiveMode()): boolean { return m === 'lecture'; }
/**
 * Décision PURE du guidage vocal (testable sans localStorage).
 * Le guidage n'est COUPÉ que si l'utilisatrice a EXPLICITEMENT choisi « lecture »
 * (« Je lis et j'écris »). En 'auto', 'mixte' et 'voix' : on guide.
 * → « Automatique » ne devient JAMAIS muet (même si l'usage penche clavier),
 *   ce qui était le défaut relevé : auto se résolvait parfois en 'lecture'.
 * Si un mode EFFECTIF est explicitement fourni (écran l'ayant déjà résolu, ex.
 * l'auth), on le respecte tel quel — rétro-compatibilité.
 */
export function guidageActif(chosen: AccessMode, effectif?: EffectiveMode): boolean {
  if (effectif !== undefined) return effectif !== 'lecture';
  return chosen !== 'lecture';
}

export function guidageVocal(m?: EffectiveMode): boolean {
  return guidageActif(getAccessMode(), m);
}
