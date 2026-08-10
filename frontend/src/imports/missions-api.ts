/**
 * Client API Missions - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Mission {
  id: string;
  identificateur_id: string;
  titre: string;
  description?: string;
  zone_id?: string;
  objectif?: number;
  progres: number;
  statut: 'en_cours' | 'terminee' | 'annulee';
  date_debut?: string;
  date_fin?: string;
  recompense?: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer toutes les missions de l'identificateur
 */
export async function fetchMissions(): Promise<{ missions: Mission[] }> {
  return apiRequest<{ missions: Mission[] }>('/missions');
}

/**
 * Mettre à jour le progrès d'une mission
 */
export async function updateMissionProgres(id: string, progres: number): Promise<{ mission: Mission }> {
  return apiRequest<{ mission: Mission }>(`/missions/${id}/progres`, {
    method: 'PATCH',
    body: JSON.stringify({ progres }),
  });
}