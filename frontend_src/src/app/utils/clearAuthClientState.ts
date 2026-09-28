import { API_URL } from './api';

/** Clés locales liées à l’auth (évite de réutiliser un refresh révoqué côté client). */
const AUTH_STORAGE_KEYS = [
  'julaba_access_token',
  'julaba_token',
  'julaba_refresh_token',
  'julaba_user_id',
  'julaba_user',
  'julaba_bo_user',
  'julaba_app_user',
  'julaba_user_data',
];

function removeJulabaSessionStorageKeys(): void {
  const toRemove: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('julaba_')) toRemove.push(k);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Après un refresh JWT refusé (ex. détection « token réutilisé ») : purge stockage client
 * et demande au serveur d’effacer les cookies httpOnly via /auth/logout.
 * @param baseUrl — même origine que l’appel /auth/refresh (défaut : API_URL).
 */
export function clearAuthClientState(baseUrl: string = API_URL): void {
  try {
    AUTH_STORAGE_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* */
      }
      try {
        sessionStorage.removeItem(k);
      } catch {
        /* */
      }
    });
    removeJulabaSessionStorageKeys();
  } catch {
    /* */
  }

  // INIT-019 — fetch() légitime : fire-and-forget vers /auth/logout pendant la
  // purge de l'état client après révocation JWT. On NE passe PAS par le client
  // centralisé `apiRequest` car (1) la session est déjà cassée — toute tentative
  // de refresh serait une récursion mortelle, (2) on veut délibérément ignorer
  // les erreurs (l'utilisateur se deconnecte, pas la peine de lever), (3) aucun
  // besoin de parser le corps de réponse.
  void fetch(`${baseUrl.replace(/\/$/, '')}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {});
}
