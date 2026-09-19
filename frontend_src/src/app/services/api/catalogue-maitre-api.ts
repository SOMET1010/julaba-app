/**
 * Client API Catalogue maître — JÙLABA
 *
 * HYGIÈNE-1 axe 2 (convergence API). Le catalogue maître est le référentiel de
 * produits qui alimente la caisse : c'est lui qui donne le nom, l'unité et le
 * prix que Tata dira à voix haute. Ses trois appels partaient en `fetch()`
 * direct, sans rafraîchissement du jeton ni délai maximal.
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../../utils/api';
import type { ProduitServeur } from '../../types/vente';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

/** Une référence du catalogue maître : ce que la marchande peut adopter. */
export interface ReferenceMaitreServeur {
  default_code?: string;
  nom?: string;
  categorie?: string | null;
}

export async function fetchCatalogueMaitre(limit = 200): Promise<{ references?: ReferenceMaitreServeur[] }> {
  return apiRequest<{ references?: ReferenceMaitreServeur[] }>(`/catalogue-maitre?limit=${limit}`);
}

export async function fetchProduitsAdoptes(): Promise<{ codes?: string[] }> {
  return apiRequest<{ codes?: string[] }>('/catalogue-maitre/adoptees');
}

export async function adopterProduits(payload: Record<string, unknown>): Promise<{ produit?: ProduitServeur }> {
  return apiRequest<{ produit?: ProduitServeur }>('/catalogue-maitre/adopter', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
