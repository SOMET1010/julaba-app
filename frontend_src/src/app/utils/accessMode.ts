// ──────────────────────────────────────────────────────────────────────────
// MODE D'ACCÈS — Julaba s'adapte à l'utilisatrice, pas l'inverse.
//
// Trois profils, choisis à l'onboarding (et modifiables ensuite) :
//   • 'lecture' 🟢 — sait lire/écrire : clavier par défaut, peu de voix, va vite.
//   • 'mixte'   🟡 — lit un peu : texte + voix, passe facilement clavier ↔ micro.
//   • 'voix'    🟠 — ne lit pas : Tata guide, le micro au centre, très peu de texte.
//
// Stocké en localStorage (source avant connexion). Pourra être synchronisé au
// profil serveur (users.preferences) plus tard.
// ──────────────────────────────────────────────────────────────────────────

export type AccessMode = 'lecture' | 'mixte' | 'voix';

const KEY = 'julaba_access_mode';
export const ACCESS_MODE_EVENT = 'julaba:access-mode';

/** Mode courant. Défaut 'mixte' (équilibré) tant qu'aucun choix n'a été fait. */
export function getAccessMode(): AccessMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'lecture' || v === 'mixte' || v === 'voix') return v;
  } catch { /* ignore */ }
  return 'mixte';
}

/** Vrai si l'utilisatrice a déjà choisi son mode (sinon on le lui demande). */
export function accessModeChoisi(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

/** Enregistre le mode + notifie l'appli (les écrans se ré-adaptent en direct). */
export function setAccessMode(m: AccessMode): void {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(ACCESS_MODE_EVENT, { detail: m })); } catch { /* ignore */ }
}

/** La voix est-elle au premier plan pour ce mode ? (micro central, Tata guide) */
export function voixDAbord(m: AccessMode = getAccessMode()): boolean {
  return m === 'voix';
}

/** Le clavier doit-il être ouvert par défaut ? (mode lecture) */
export function clavierParDefaut(m: AccessMode = getAccessMode()): boolean {
  return m === 'lecture';
}

/** Doit-on parler automatiquement les consignes/erreurs ? (voix + mixte) */
export function guidageVocal(m: AccessMode = getAccessMode()): boolean {
  return m !== 'lecture';
}
