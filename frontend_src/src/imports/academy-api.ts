/**
 * Client API Academy - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AcademyProgress {
  id: string;
  user_id: string;
  module_id: string;
  progres: number;
  complete: boolean;
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateModuleProgressData {
  progres?: number;
  complete?: boolean;
  score?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer la progression academy de l'utilisateur
 */
export async function fetchAcademyProgress(): Promise<{ progress: AcademyProgress[] }> {
  return apiRequest<{ progress: AcademyProgress[] }>('/academy/progress');
}

/**
 * Mettre à jour la progression d'un module
 */
export async function updateModuleProgress(moduleId: string, data: UpdateModuleProgressData): Promise<{ progress: AcademyProgress }> {
  return apiRequest<{ progress: AcademyProgress }>(`/academy/${moduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}