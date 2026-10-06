// ──────────────────────────────────────────────────────────────────────────
// PARCOURS — « niveau d'autonomie » de l'utilisatrice.
//
// Philosophie (Patrick) : au 1er lancement, Tata ACCOMPAGNE ; à partir du 3e,
// elle s'EFFACE progressivement. Une débutante se sent guidée ; une habituée
// n'est jamais ralentie. On compte les LANCEMENTS de l'app (pas les jours).
//
// Ce module ne parle pas, ne décide pas d'UI : il ne fait que MÉMORISER le
// nombre de fois où l'app a démarré, pour que les écrans adaptent la voix.
// ──────────────────────────────────────────────────────────────────────────

const KEY_LANCEMENTS = 'julaba_nb_lancements';

/** Nombre de fois où l'app a démarré (0 la toute première fois, avant compte). */
export function nbLancements(): number {
  try { return parseInt(localStorage.getItem(KEY_LANCEMENTS) || '0', 10) || 0; }
  catch { return 0; }
}

/** À appeler UNE fois au démarrage de l'app. Incrémente et renvoie le nouveau total. */
export function noterLancement(): number {
  const n = nbLancements() + 1;
  try { localStorage.setItem(KEY_LANCEMENTS, String(n)); } catch { /* ignore */ }
  return n;
}

/** Débutante : Tata accompagne à fond (1er ou 2e lancement). */
export function estDebutante(): boolean { return nbLancements() <= 2; }

/** Habituée : Tata s'efface (3e lancement et au-delà). */
export function estHabituee(): boolean { return nbLancements() >= 3; }
