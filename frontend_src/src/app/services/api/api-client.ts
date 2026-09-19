/**
* JÙLABA — Client API (100% PostgreSQL via NestJS)
* Auth via cookie httpOnly — aucun token en localStorage.
*/

export const NOT_AUTHENTICATED = 'NOT_AUTHENTICATED';

// Erreur HTTP typée portant le STATUT NUMÉRIQUE (prérequis du lot file hors-ligne).
// Permet de classer une erreur par son code (4xx permanent / 5xx transitoire) sans
// analyser le texte du message. Additif : `message` inchangé, `.status` en plus.
export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

// Mutex pour éviter les refreshs simultanés
let _refreshPromise: Promise<boolean> | null = null;
let _sessionExpiredDispatched = false;
// Quand true, rafraichirSession est désactivé : évite de consommer le refresh token
// pendant l'écran change-password (sinon rotation concurrente => cookies effacés).
let _suspendRefresh =
  typeof window !== 'undefined' &&
  window.location?.pathname?.includes('change-password');

export function setSuspendRefresh(value: boolean): void {
  _suspendRefresh = value;
}

// ─────────────────────────────────────────────────────────────────────────────
// L'UNIQUE RAFRAÎCHISSEMENT DE SESSION — HYGIÈNE-1 axe 2.
//
// Il en existait QUATRE, incompatibles entre eux : celui-ci, et trois écrits à
// la main dans AppContext (chargement du profil, vérification au démarrage,
// minuterie de 13 minutes). Trois d'entre eux n'envoyaient AUCUN corps, donc ne
// pouvaient pas fonctionner dans l'APK, où le cookie de rafraîchissement est
// bloqué en cross-domaine ; et trois sur quatre ignoraient le verrou ci-dessous.
//
// Ce n'était pas une redondance inoffensive. Côté serveur, rejouer un jeton
// déjà utilisé est traité comme une compromission et révoque TOUTES les
// sessions de la marchande. Deux rafraîchissements simultanés suffisaient donc
// à la déconnecter de partout, en plein marché.
//
// Une seule porte, un seul verrou, désormais.
//
// Et le succès NE SE LIT PAS sur `response.ok` : `POST /auth/refresh` répond
// 200 même quand il échoue (`@HttpCode(HttpStatus.OK)`, corps `{ error }`).
// L'ancien `.then(r => r.ok)` renvoyait donc TOUJOURS `true` et faisait rejouer
// pour rien une requête condamnée. On lit le corps.
// ─────────────────────────────────────────────────────────────────────────────
const CLE_ACCES = 'julaba_access_token';
const CLE_RAFRAICHISSEMENT = 'julaba_refresh_token';

function lireStockage(cle: string): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}
function ecrireStockage(cle: string, valeur: string): void {
  try { localStorage.setItem(cle, valeur); } catch { /* stockage indisponible */ }
}

export function rafraichirSession(baseUrl: string): Promise<boolean> {
  if (_suspendRefresh) return Promise.resolve(false);
  if (_refreshPromise) return _refreshPromise;
  const stocke = lireStockage(CLE_RAFRAICHISSEMENT);
  _refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    // Le cookie sert quand il passe (web) ; le jeton stocké prend le relais
    // quand il ne passe pas (APK). Le serveur accepte les deux sources.
    body: JSON.stringify(stocke ? { refreshToken: stocke } : {}),
    signal: AbortSignal.timeout(15000),
  })
    .then(async (r) => {
      const corps = (await r.json().catch(() => null)) as
        { success?: boolean; accessToken?: string; refreshToken?: string } | null;
      if (!r.ok || !corps?.accessToken) return false;
      ecrireStockage(CLE_ACCES, corps.accessToken);
      // Le successeur du jeton présenté. Sans lui, le téléphone rejouerait
      // éternellement un jeton « used » — c'est-à-dire la révocation de toutes
      // ses sessions. Cf. le commentaire de auth.controller.ts.
      if (corps.refreshToken) ecrireStockage(CLE_RAFRAICHISSEMENT, corps.refreshToken);
      return true;
    })
    .catch(() => false)
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

export async function apiRequest<T>(
  baseUrl: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(30000);
  const combinedSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
  const isFormData = options.body instanceof FormData;
  const baseHeaders: Record<string, string> = isFormData
    ? { ...(options.headers as Record<string, string>) }
    : { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    credentials: 'include',
    signal: combinedSignal,
    headers: baseHeaders,
  });

  if (response.status === 401) {
    // Tenter refresh silencieux via cookie avec mutex
    const refreshOk = await rafraichirSession(baseUrl);
    const refreshRes = { ok: refreshOk };
    if (refreshRes.ok) {
      // Rejouer la requête originale
      const retryTimeoutSignal = AbortSignal.timeout(30000);
      const retryCombinedSignal = options.signal
        ? AbortSignal.any([options.signal, retryTimeoutSignal])
        : retryTimeoutSignal;
      const retry = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        credentials: 'include',
        signal: retryCombinedSignal,
        headers: baseHeaders,
      });
      if (retry.status === 401) {
        if (!_sessionExpiredDispatched) {
          _sessionExpiredDispatched = true;
          window.dispatchEvent(new CustomEvent('julaba:session-expired'));
          setTimeout(() => { _sessionExpiredDispatched = false; }, 5000);
        }
        throw new Error(NOT_AUTHENTICATED);
      }
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}));
        throw new HttpError(body.message || `Erreur HTTP ${retry.status}`, retry.status, body);
      }
      return retry.json().catch(() => { throw new Error('Réponse serveur invalide (non-JSON)'); }) as Promise<T>;
    }
    if (!_sessionExpiredDispatched) {
      _sessionExpiredDispatched = true;
      window.dispatchEvent(new CustomEvent('julaba:session-expired'));
      setTimeout(() => { _sessionExpiredDispatched = false; }, 5000);
    }
    throw new Error(NOT_AUTHENTICATED);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new HttpError(body.message || `Erreur HTTP ${response.status}`, response.status, body);
  }

  return response.json().catch(() => { throw new Error('Réponse serveur invalide (non-JSON)'); }) as Promise<T>;
}