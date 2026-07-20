/**
* JÙLABA — Client API (100% PostgreSQL via NestJS)
* Auth via cookie httpOnly — aucun token en localStorage.
*/

export const NOT_AUTHENTICATED = 'NOT_AUTHENTICATED';

// Mutex pour éviter les refreshs simultanés
let _refreshPromise: Promise<boolean> | null = null;
let _sessionExpiredDispatched = false;
// Quand true, silentRefresh est désactivé : évite de consommer le refresh token
// pendant l'écran change-password (sinon rotation concurrente => cookies effacés).
let _suspendRefresh =
  typeof window !== 'undefined' &&
  window.location?.pathname?.includes('change-password');

export function setSuspendRefresh(value: boolean): void {
  _suspendRefresh = value;
}

async function silentRefresh(baseUrl: string): Promise<boolean> {
  if (_suspendRefresh) return false;
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
  })
    .then(r => r.ok)
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
    const refreshOk = await silentRefresh(baseUrl);
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
        throw new Error(body.message || `Erreur HTTP ${retry.status}`);
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
    throw new Error(body.message || `Erreur HTTP ${response.status}`);
  }

  return response.json().catch(() => { throw new Error('Réponse serveur invalide (non-JSON)'); }) as Promise<T>;
}