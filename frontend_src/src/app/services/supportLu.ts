/**
 * « Réponses du support non lues » — mémoire LOCALE de lecture. Module PUR
 * (stockage injecté, testable au tsx comme cartStorage/comptesMemorises).
 *
 * Le backend ne sait marquer « lu » que côté back-office (lu_par_bo) : il n'y
 * a AUCUN endpoint pour que l'utilisatrice marque une réponse comme lue. Un
 * compteur branché sur reponses[].lu ne se viderait donc jamais. À la place,
 * on mémorise SUR L'APPAREIL la date du dernier message vu par ticket :
 * - compteur = messages du support plus récents que le dernier vu ;
 * - ouvrir l'écran Support marque tout comme vu.
 * Honnête et local (comme le panier) ; un vrai « lu » serveur reste possible
 * plus tard sans rien casser.
 */

export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MessageSupport {
  auteur: string; // 'user' ou 'bo' — seul 'bo' compte comme réponse du support
  date: string;
}

export interface TicketSupport {
  id: string;
  messages?: MessageSupport[];
}

export const CLE_SUPPORT_VU = 'julaba_support_vu';
const MAX_TICKETS = 100;

function lireVus(store: KVStore | null): Record<string, string> {
  try {
    const brut = JSON.parse(store?.getItem(CLE_SUPPORT_VU) || '{}');
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {};
    const vus: Record<string, string> = {};
    for (const [k, v] of Object.entries(brut)) {
      if (typeof v === 'string') vus[k] = v;
    }
    return vus;
  } catch { return {}; }
}

/** Nombre de réponses du SUPPORT plus récentes que le dernier vu (par ticket). */
export function compterReponsesNonVues(store: KVStore | null, tickets: TicketSupport[]): number {
  const vus = lireVus(store);
  let n = 0;
  for (const t of tickets) {
    const dernierVu = vus[t.id] ?? '';
    for (const m of t.messages ?? []) {
      if (m.auteur === 'bo' && m.date > dernierVu) n++;
    }
  }
  return n;
}

/** Marque TOUS les tickets fournis comme vus (à l'ouverture de l'écran Support). */
export function marquerToutVu(store: KVStore | null, tickets: TicketSupport[], nowIso: string): boolean {
  const vus = lireVus(store);
  for (const t of tickets) vus[t.id] = nowIso;
  // Borne la mémoire : on garde les entrées les plus récentes.
  const bornes = Object.entries(vus)
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .slice(0, MAX_TICKETS);
  try {
    store?.setItem(CLE_SUPPORT_VU, JSON.stringify(Object.fromEntries(bornes)));
    return true;
  } catch { return false; }
}
