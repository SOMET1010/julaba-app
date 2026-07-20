/**
 * Client API Publications Marché - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Publication {
  id: string;
  producteur_id: string;
  cycle_id?: string;
  recolte_id?: string;
  produit: string;
  culture: string;
  quantite_disponible: number;
  quantite_initiale: number;
  unite: string;
  prix_unitaire: number;
  qualite: 'standard' | 'premium' | 'bio';
  localisation?: string;
  zone_livraison: string[];
  active: boolean;
  statut: 'disponible' | 'epuise' | 'suspendu' | 'archive';
  date_publication: string;
  date_expiration?: string;
  date_recolte?: string;
  description?: string;
  photo_url?: string;
  conditions_vente?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Relations
  producteur?: {
    id: string;
    prenoms: string;
    nom: string;
    telephone: string;
  };
  cycle?: {
    id: string;
    culture: string;
    surface: number;
    parcelle?: string;
  };
  recolte?: {
    id: string;
    quantite: number;
    date_recolte: string;
  };
}

export interface CreatePublicationData {
  cycle_id?: string;
  recolte_id?: string;
  produit: string;
  culture: string;
  quantite_disponible: number;
  quantite_initiale?: number;
  unite?: string;
  prix_unitaire: number;
  qualite?: 'standard' | 'premium' | 'bio';
  localisation?: string;
  zone_livraison?: string[];
  date_expiration?: string;
  date_recolte?: string;
  description?: string;
  photo_url?: string;
  conditions_vente?: string;
}

export interface UpdatePublicationData {
  quantite_disponible?: number;
  prix_unitaire?: number;
  description?: string;
  active?: boolean;
  statut?: 'disponible' | 'epuise' | 'suspendu' | 'archive';
  date_expiration?: string;
  conditions_vente?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer toutes les publications
 * @param own - true pour récupérer seulement ses propres publications
 * @param active - true pour récupérer seulement les publications actives
 */
export async function fetchPublications(
  own = false,
  active = false,
  limit = 50,
  offset = 0,
  filtre?: string
): Promise<{ publications: Publication[] }> {
  const params = new URLSearchParams();
  if (own) params.append('own', 'true');
  if (active) params.append('active', 'true');
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));
  if (filtre) params.append('filtre', filtre);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/publications?${queryString}` : '/publications';
  
  return apiRequest<{ publications: Publication[] }>(endpoint);
}

/**
 * Récupérer une publication par ID
 */
export async function fetchPublication(id: string): Promise<{ publication: Publication }> {
  return apiRequest<{ publication: Publication }>(`/publications/${id}`);
}

/**
 * Créer une nouvelle publication
 */
export async function createPublication(data: CreatePublicationData): Promise<{ publication: Publication }> {
  const normalizedPayload: CreatePublicationData = {
    ...data,
    quantite_initiale: data.quantite_initiale ?? data.quantite_disponible,
    unite: data.unite ?? 'kg',
  };
  return apiRequest<{ publication: Publication }>('/publications', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  });
}

/**
 * Modifier une publication
 */
export async function updatePublication(id: string, data: UpdatePublicationData): Promise<{ publication: Publication }> {
  return apiRequest<{ publication: Publication }>(`/publications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Supprimer une publication
 */
export async function deletePublication(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/publications/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Activer/Désactiver une publication
 */
export async function togglePublication(id: string): Promise<{ publication: Publication }> {
  return apiRequest<{ publication: Publication }>(`/publications/${id}/toggle`, {
    method: 'PATCH',
  });
}

/**
 * Réduire le stock d'une publication (après vente)
 */
export async function reducePublicationStock(id: string, quantite_vendue: number): Promise<{ publication: Publication }> {
  return apiRequest<{ publication: Publication }>(`/publications/${id}/reduce-stock`, {
    method: 'POST',
    body: JSON.stringify({ quantite_vendue }),
  });
}

/**
 * Récupérer le marché complet (toutes les publications actives)
 */
export async function fetchMarketplace(
  limit = 50,
  offset = 0,
  filtre?: string
): Promise<{ publications: Publication[] }> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));
  if (filtre) params.append('filtre', filtre);
  const queryString = params.toString();
  const endpoint = queryString ? `/publications/marche?${queryString}` : '/publications/marche';
  return apiRequest<{ publications: Publication[] }>(endpoint);
}
