/**
 * Client API Récoltes - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Recolte {
  id: string;
  producteur_id: string;
  cycle_id?: string;
  produit: string;
  quantite: number;
  unite: string;
  qualite: 'standard' | 'premium' | 'bio';
  prix_unitaire: number;
  statut: 'declaree' | 'validee' | 'vendue';
  date_recolte: string;
  parcelle?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRecolteData {
  cycle_id?: string;
  produit: string;
  quantite: number;
  unite: string;
  qualite?: 'standard' | 'premium' | 'bio';
  prix_unitaire: number;
  date_recolte: string;
  parcelle?: string;
  notes?: string;
}

export interface UpdateRecolteData {
  statut?: Recolte['statut'];
  quantite?: number;
  prix_unitaire?: number;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer toutes les récoltes du producteur
 */
export async function fetchRecoltes(): Promise<{ recoltes: Recolte[] }> {
  return apiRequest<{ recoltes: Recolte[] }>('/recoltes');
}

/**
 * Déclarer une nouvelle récolte
 */
export async function createRecolte(data: CreateRecolteData): Promise<{ recolte: Recolte }> {
  return apiRequest<{ recolte: Recolte }>('/recoltes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Modifier une récolte
 */
export async function updateRecolte(id: string, data: UpdateRecolteData): Promise<{ recolte: Recolte }> {
  return apiRequest<{ recolte: Recolte }>(`/recoltes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Supprimer une récolte
 */
export async function deleteRecolte(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/recoltes/${id}`, {
    method: 'DELETE',
  });
}