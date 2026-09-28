/**
 * LA PORTE UNIQUE DES APPELS AUTH — API-01.
 *
 * LE DÉFAUT, mesuré le 19/09/2026, pas supposé. 37 appels `fetch()` directs
 * vers `/auth` vivaient hors de cette couche. Le patch global de `main.tsx`
 * leur ajoute bien le jeton, mais NE GÈRE PAS le 401 : un jeton expiré — il
 * vit 15 minutes — ne se rafraîchit donc jamais sur ces appels-là.
 *
 * CE QUE ÇA DONNAIT, relevé sur un vrai serveur :
 *
 *     bon PIN, jeton valide  → 200 {"valid":true}
 *     bon PIN, jeton EXPIRÉ  → 401 {"message":"Unauthorized"}
 *     mauvais PIN            → 200 {"valid":false,…}
 *
 * et, dans `WalletPage` : `if (data.valid) … else setPinError('Code PIN
 * incorrect')`. Sur un 401, `data.valid` vaut `undefined`, donc faux. La
 * marchande tapait le BON code de son portefeuille et l'application lui
 * répondait qu'il était faux. Elle ne lit pas : rien ne lui permettait de
 * distinguer « session expirée » de « mauvais code ». Son portefeuille avait
 * l'air de s'être fermé sur son argent.
 *
 * LA RÈGLE, posée par Patrick à partir de ce cas :
 *
 *     Aucun appel authentifié ne décide lui-même quoi faire d'un 401. Le
 *     traitement de session expirée est centralisé, et le composant ne reçoit
 *     que trois choses : succès métier, erreur métier, reconnexion requise.
 *
 * D'où le type `Resultat` ci-dessous. Il n'est pas là pour faire joli : tant
 * qu'un composant reçoit une réponse brute, il RÉINVENTE une interprétation du
 * 401 — et c'est comme ça qu'on en arrive à annoncer un mauvais code à
 * quelqu'un qui a tapé le bon.
 *
 * Le rafraîchissement, son verrou et le rejeu sont déjà dans `apiRequest` :
 * ce fichier ne les réécrit pas, il les rend atteignables.
 */
import { apiRequest, HttpError, NOT_AUTHENTICATED } from './api-client.js';
import { API_URL } from '../../utils/api';

/** Les trois seuls états qu'un écran a le droit de connaître. */
export type Resultat<T> =
  | { etat: 'ok'; valeur: T }
  | { etat: 'erreur_metier'; message: string; status: number }
  | { etat: 'session_expiree' };

/**
 * `apiRequest` a déjà tenté le rafraîchissement et rejoué la requête. S'il
 * lève `NOT_AUTHENTICATED`, c'est que la session est réellement finie — pas
 * qu'un jeton était simplement périmé.
 */
export async function appelerAuth<T>(chemin: string, options: RequestInit = {}): Promise<Resultat<T>> {
  return appeler<T>(chemin, options);
}

async function appeler<T>(chemin: string, options: RequestInit = {}): Promise<Resultat<T>> {
  try {
    return { etat: 'ok', valeur: await apiRequest<T>(API_URL, chemin, options) };
  } catch (e) {
    if (e instanceof Error && e.message === NOT_AUTHENTICATED) {
      return { etat: 'session_expiree' };
    }
    if (e instanceof HttpError) {
      const corps = e.body as { message?: string } | null;
      return { etat: 'erreur_metier', message: corps?.message || e.message, status: e.status };
    }
    // Réseau coupé, réponse illisible, délai dépassé : une erreur métier du
    // point de vue de l'écran, avec le statut 0 qui dit « on n'a pas eu de
    // réponse ». Ce n'est PAS une session expirée : ne jamais déconnecter
    // quelqu'un parce que le réseau a toussé.
    return { etat: 'erreur_metier', message: 'Erreur réseau', status: 0 };
  }
}

const poster = <T>(chemin: string, corps: unknown) =>
  appeler<T>(chemin, { method: 'POST', body: JSON.stringify(corps) });

interface ReponseSucces { success?: boolean; message?: string }

/**
 * Vérifie le code PIN. `valeur` est `true`/`false` — le VERDICT du serveur, et
 * lui seul. Une session expirée ne peut plus se déguiser en « code faux ».
 */
export async function verifierPin(pin: string): Promise<Resultat<boolean>> {
  const r = await poster<{ valid?: boolean; locked?: boolean; attenteMs?: number }>(
    '/auth/pin/verify', { pin });
  if (r.etat !== 'ok') return r;
  return { etat: 'ok', valeur: r.valeur?.valid === true };
}

export async function definirPin(pin: string, currentPin?: string): Promise<Resultat<true>> {
  const r = await poster<ReponseSucces>('/auth/pin/set',
    currentPin === undefined ? { pin } : { pin, currentPin });
  if (r.etat !== 'ok') return r;
  if (!r.valeur?.success) {
    return { etat: 'erreur_metier', message: r.valeur?.message || 'Erreur PIN', status: 200 };
  }
  return { etat: 'ok', valeur: true };
}

export async function desactiverPin(currentPin: string): Promise<Resultat<true>> {
  const r = await poster<ReponseSucces>('/auth/pin/disable', { currentPin });
  if (r.etat !== 'ok') return r;
  if (!r.valeur?.success) {
    return { etat: 'erreur_metier', message: r.valeur?.message || 'PIN incorrect', status: 200 };
  }
  return { etat: 'ok', valeur: true };
}

export async function enregistrerPreferences(prefs: unknown): Promise<Resultat<true>> {
  const r = await appeler<ReponseSucces>('/auth/preferences',
    { method: 'PATCH', body: JSON.stringify(prefs) });
  if (r.etat !== 'ok') return r;
  if (!r.valeur?.success) {
    return { etat: 'erreur_metier', message: r.valeur?.message || 'Erreur', status: 200 };
  }
  return { etat: 'ok', valeur: true };
}

export async function supprimerCompte(password: string): Promise<Resultat<true>> {
  const r = await appeler<ReponseSucces>('/auth/account',
    { method: 'DELETE', body: JSON.stringify({ password }) });
  if (r.etat !== 'ok') return r;
  if (!r.valeur?.success) {
    return { etat: 'erreur_metier', message: r.valeur?.message || 'Erreur', status: 200 };
  }
  return { etat: 'ok', valeur: true };
}

export interface SessionActive { id: string; [k: string]: unknown }

export async function listerSessions(): Promise<Resultat<SessionActive[]>> {
  const r = await appeler<{ sessions?: SessionActive[] }>('/auth/sessions');
  if (r.etat !== 'ok') return r;
  return { etat: 'ok', valeur: r.valeur?.sessions || [] };
}

export async function revoquerSession(id: string): Promise<Resultat<true>> {
  const r = await appeler<unknown>(`/auth/sessions/${id}`, { method: 'DELETE' });
  if (r.etat !== 'ok') return r;
  return { etat: 'ok', valeur: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// VÉRIFICATION PIN IDENTIFICATEUR (INIT-019)
//
// `FicheActeurDetailModal` vérifiait le PIN d'identification d'un acteur en
// `fetch()` direct, sans rafraîchissement de session sur 401 — donc un jeton
// expiré faisait échouer l'ouverture d'une fiche au lieu de se renouveler
// silencieusement. On passe par la même porte que `verifierPin` : la réponse
// devient un `Resultat<boolean>` (ok / erreur_metier / session_expiree), le
// composant ne décide plus lui-même quoi faire d'un 401.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie le code PIN d'identification de l'acteur actuellement connecté en
 * tant qu'identificateur. `valeur` est `true`/`false` — le VERDICT du serveur.
 */
export async function verifyIdentificateurPin(pin: string): Promise<Resultat<boolean>> {
  const r = await poster<{ valid?: boolean; locked?: boolean; attenteMs?: number }>(
    '/auth/identificateur/me/verify-pin', { pin });
  if (r.etat !== 'ok') return r;
  return { etat: 'ok', valeur: r.valeur?.valid === true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGEMENT PIN IDENTIFICATEUR (INIT-019)
//
// Vit auparavant en `fetch()` direct dans `IdentificateurPinChangeSection`.
// L'AbortSignal est transmis à `apiRequest` pour préserver le mécanisme de
// timeout local (15 s) et l'annulation au unmount. Sur 401, `apiRequest`
// tente d'abord le rafraîchissement silencieux puis rejoue — ce qui manquait
// au flux original.
// ─────────────────────────────────────────────────────────────────────────────

export async function changerPinIdentificateur(data: {
  oldPin: string;
  newPin: string;
}, options: RequestInit = {}): Promise<Resultat<{ success: boolean; message?: string }>> {
  const r = await appeler<{ success?: boolean; message?: string }>(
    '/auth/identificateur/me/change-pin',
    { method: 'POST', body: JSON.stringify(data), ...options },
  );
  if (r.etat !== 'ok') return r;
  return { etat: 'ok', valeur: { success: r.valeur?.success === true, message: r.valeur?.message } };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGEMENT MOT DE PASSE (INIT-019)
//
// Vit auparavant en `fetch()` direct dans `BOProfil.tsx`. Le BO hérite du
// cookie de session BO via `apiRequest` (qui active l'envoi des identifiants
// de session cross-origin).
// L'en-tête Authorization BO est injectée par le caller via `options.headers`
// si nécessaire (le cookie suffit en première intention).
// ─────────────────────────────────────────────────────────────────────────────

export async function changePassword(data: {
  oldPassword: string;
  newPassword: string;
}, options: RequestInit = {}): Promise<Resultat<{ success: boolean; message?: string }>> {
  const r = await appeler<{ success?: boolean; message?: string }>(
    '/auth/change-password',
    { method: 'POST', body: JSON.stringify(data), ...options },
  );
  if (r.etat !== 'ok') return r;
  return { etat: 'ok', valeur: { success: r.valeur?.success !== false, message: r.valeur?.message } };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET MOT DE PASSE UTILISATEUR (INIT-019)
//
// Vit auparavant en `fetch()` direct dans `BOActeurDetail.tsx` (admin BO
// réinitialise le mot de passe d'un acteur).
// ─────────────────────────────────────────────────────────────────────────────

export async function resetUserPassword(data: {
  userId: string;
  newPassword: string;
}, options: RequestInit = {}): Promise<Resultat<{ success?: boolean; newPassword?: string; message?: string }>> {
  const r = await appeler<{ success?: boolean; newPassword?: string; message?: string }>(
    '/auth/reset-user-password',
    { method: 'POST', body: JSON.stringify(data), ...options },
  );
  return r;
}
