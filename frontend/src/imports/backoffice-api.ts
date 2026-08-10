/**
* API Client Back-Office JÙLABA
* Auth via cookie httpOnly — aucun token en localStorage.
*/

import { API_URL } from '../app/utils/api';

let _boRefreshPromise: Promise<boolean> | null = null;

async function boSilentRefresh(): Promise<boolean> {
  if (_boRefreshPromise) return _boRefreshPromise;
  _boRefreshPromise = fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => { _boRefreshPromise = null; });
  return _boRefreshPromise;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 401) {
    const refreshOk = await boSilentRefresh();
    if (refreshOk) {
      const retry = await fetch(`${API_URL}${endpoint}`, {
        ...options, credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      if (!retry.ok) {
        window.dispatchEvent(new CustomEvent('julaba:session-expired'));
        throw new Error('NOT_AUTHENTICATED');
      }
      return retry.json();
    }
    window.dispatchEvent(new CustomEvent('julaba:session-expired'));
    throw new Error('NOT_AUTHENTICATED');
  }
  // 304 Not Modified — réponse valide du cache, on relit depuis le cache
  if (res.status === 304) return res.json().catch(() => ({} as T));
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
  return res.json();
}

export async function fetchActeurs() { return apiRequest<{ acteurs: any[] }>('/acteurs'); }
export async function updateActeurStatut(id: string, statut: string, logAction?: string) {
  return apiRequest(`/acteurs/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut, logAction }) });
}
export async function fetchDossiers() { return apiRequest<{ dossiers: any[] }>('/dossiers'); }
export async function updateDossierStatut(id: string, statut: string, motif?: string) {
  return apiRequest(`/dossiers/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut, motif }) });
}
export async function fetchTransactions() { return apiRequest<{ transactions: any[] }>('/transactions'); }
export const boGetZones = fetchZones;
export async function fetchZones() { return apiRequest<{ zones: any[] }>('/zones'); }
export async function createZone(data: { nom: string; region: string; gestionnaire?: string }) {
  return apiRequest<{ success: boolean; zone: any }>('/zones', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateZone(id: string, data: any) {
  return apiRequest<{ success: boolean; zone: any }>(`/zones/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function updateZoneStatut(id: string, statut: string) {
  return apiRequest(`/zones/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) });
}
export async function fetchAuditLogs() { return apiRequest<{ logs: any[] }>('/audit'); }
export async function fetchBOUsers() { return apiRequest<{ users: any[] }>('/users'); }
export async function boGetBOUsers() { return fetchBOUsers(); }
export async function createBOUser(data: any) {
  return apiRequest<{ success: boolean; user: any }>('/users', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateBOUserActif(id: string, actif: boolean) {
  return apiRequest<{ success: boolean; actif: boolean }>(`/users/${id}/actif`, { method: 'PATCH', body: JSON.stringify({ actif }) });
}
export async function fetchInstitutions() { return apiRequest<{ institutions: any[] }>('/institutions'); }
export async function createInstitution(data: any) {
  return apiRequest('/institutions', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateInstitutionModules(id: string, modules: any) {
  return apiRequest(`/institutions/${id}/modules`, { method: 'PATCH', body: JSON.stringify({ modules }) });
}
export async function updateInstitutionPermissions(id: string, permissions: any) {
  return apiRequest(`/institutions/${id}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissions }) });
}
export async function updateInstitutionStatut(id: string, statut: string) {
  return apiRequest(`/institutions/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) });
}
export async function deleteInstitution(id: string) {
  return apiRequest(`/institutions/${id}`, { method: 'DELETE' });
}
export async function fetchMissions() { return apiRequest<{ missions: any[] }>('/missions'); }
export async function createMission(data: any) {
  return apiRequest<{ success: boolean; mission: any }>('/missions', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateMissionStatut(id: string, statut: string) {
  return apiRequest<{ success: boolean; mission: any }>(`/missions/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) });
}
export async function createIdentificateur(data: any) {
  return apiRequest<{ success: boolean; user: any }>('/enrolement/identificateur', { method: 'POST', body: JSON.stringify(data) });
}
