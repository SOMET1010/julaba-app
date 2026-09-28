/**
 * JÙLABA — Client API Users (INIT-019).
 *
 * Centralise tous les appels vers `/users/*` qui vivaient encore en `fetch()`
 * direct dans les composants (ProfilUnifieModal, FicheActeurDetailModal,
 * FicheIdentificationDynamique, etc.). On passe désormais par `apiRequest` :
 * timeout 30s, mutex de rafraîchissement 401, erreur typée `HttpError`,
 * credentials `include` et jeton auto via cookie ou en-tête.
 */
import { apiRequest as _apiRequest, HttpError } from './api-client';
import { API_URL } from '../../utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface EntreeHistoriqueActeur {
  id: string;
  date: string;
  type: string;
  description?: string;
  acteurNom?: string;
  [k: string]: unknown;
}

export interface UserInfo {
  id: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  telephone2?: string;
  numeroMarchand?: string;
  role?: string;
  [k: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// MÉTHODES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère l'historique d'un acteur (utilisée par FicheActeurDetailModal).
 */
export async function getUserHistorique(userId: string): Promise<{ historique: EntreeHistoriqueActeur[] }> {
  return apiRequest<{ historique: EntreeHistoriqueActeur[] }>(`/users/${userId}/historique`);
}

/**
 * Récupère un utilisateur par numéro de téléphone (utilisé par
 * FicheIdentificationDynamique pour vérifier si un compte existe déjà).
 *
 * Renvoie `null` si l'utilisateur n'existe pas (statut 404) au lieu de lever,
 * car l'appelant distingue « existe » / « disponible » selon ce code.
 *
 * `options` est transmis tel quel à `apiRequest` — utile pour passer un
 * `AbortSignal` et annuler la requête quand l'utilisateur tape un nouveau
 * numéro avant que la précédente vérification ne réponde.
 */
export async function getUserByPhone(
  phone: string,
  options: RequestInit = {},
): Promise<UserInfo | null> {
  try {
    return await apiRequest<UserInfo>(`/users/by-phone/${encodeURIComponent(phone)}`, options);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Met à jour un utilisateur (PATCH /users/:id). Utilisé par ProfilUnifieModal
 * pour sauvegarder l'identité et le contact.
 */
export async function updateUser(userId: string, data: Partial<UserInfo>): Promise<UserInfo> {
  return apiRequest<UserInfo>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Supprime un utilisateur (DELETE /users/:id). Utilisé par ProfilUnifieModal.
 */
export async function deleteUser(userId: string): Promise<{ success?: boolean }> {
  return apiRequest<{ success?: boolean }>(`/users/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Upload la photo de profil d'un utilisateur (POST /users/:id/photo avec
 * multipart/form-data). Conservé ici pour rassembler tous les appels
 * `/users/*`. Le corps `FormData` est transmis tel quel : `apiRequest` omet
 * l'en-tête Content-Type pour laisser le navigateur poser la boundary.
 */
export async function uploadUserPhoto(userId: string, file: File): Promise<{ success?: boolean; url?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<{ success?: boolean; url?: string }>(`/users/${userId}/photo`, {
    method: 'POST',
    body: formData,
  });
}
