/**
 * Client API Zones - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  nom: string;
  type: 'region' | 'departement' | 'commune' | 'village';
  parent_id?: string;
  gestionnaire_id?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ──────���──────────────────────────────────────────────────────────────────────

/**
 * Récupérer toutes les zones actives
 */
export async function fetchZones(): Promise<{ zones: Zone[] }> {
  const data = await apiRequest<Zone[] | { zones: Zone[] }>('/zones');
  return Array.isArray(data) ? { zones: data } : data;
}

/**
 * Récupérer une zone par ID
 */
export async function fetchZoneById(id: string): Promise<{ zone: Zone }> {
  return apiRequest<{ zone: Zone }>(`/zones/${id}`);
}