/**
 * Client API Notifications - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  role?: string;
  type: string;
  titre: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  category?: string;
  icon?: string;
  metadata?: any;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer toutes les notifications de l'utilisateur
 */
export async function fetchNotifications(): Promise<{ notifications: Notification[] }> {
  return apiRequest<{ notifications: Notification[] }>('/notifications');
}

export async function fetchTrashNotifications(): Promise<{ notifications: Notification[] }> {
  return apiRequest<{ notifications: Notification[] }>('/notifications/trash');
}

/**
 * Marquer une notification comme lue
 */
export async function markNotificationAsRead(id: string): Promise<{ notification: Notification }> {
  return apiRequest<{ notification: Notification }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/notifications/read-all', {
    method: 'PATCH',
  });
}

/**
 * Supprimer une notification
 */
export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/notifications/${id}`, {
    method: 'DELETE',
  });
}

export async function restoreNotification(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/notifications/${id}/restore`, {
    method: 'PATCH',
  });
}
export async function createNotification(data: {
  type: string;
  titre: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  icon?: string;
  metadata?: any;
}): Promise<{ notification: Notification }> {
  return apiRequest<{ notification: Notification }>('/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Envoi depuis le BackOffice vers un userId spécifique
export async function sendNotificationToUser(data: {
  userId: string;
  type: string;
  titre: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  icon?: string;
  metadata?: any;
}): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Notifier validation dossier
export async function notifyDossierValide(data: {
  identificateurId: string; acteurNom: string; dossierRef: string;
}): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/notifications/dossier-valide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Notifier rejet dossier
export async function notifyDossierRejete(data: {
  identificateurId: string; acteurNom: string; motif: string;
}): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/notifications/dossier-rejete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// Notifier changement statut
export async function notifyStatutChange(data: {
  userId: string; nouveauStatut: string; motif?: string;
}): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/notifications/statut-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
