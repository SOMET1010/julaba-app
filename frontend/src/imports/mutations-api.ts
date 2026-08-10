/**
 * Client API Mutations - JULABA
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

export type MutationStatut = 'en_attente' | 'approuvee' | 'rejetee';

export interface Mutation {
  id: string;
  identificateur_id: string;
  identificateur_nom: string | null;
  zone_actuelle_id: string | null;
  zone_actuelle_nom: string | null;
  zone_demandee_id: string;
  zone_demandee_nom: string;
  raison: string;
  statut: MutationStatut;
  decideur_id: string | null;
  motif_decision: string | null;
  date_decision: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMutationData {
  zoneActuelleId?: string;
  zoneActuelle?: string;
  zoneDemandeeId: string;
  zoneDemandee: string;
  raison: string;
}

export async function fetchMutations(): Promise<{ mutations: Mutation[] }> {
  const res: any = await apiRequest<any>('/mutations');
  return { mutations: res.data || [] };
}

export async function createMutation(
  data: CreateMutationData,
): Promise<{ mutation: Mutation }> {
  const res: any = await apiRequest<any>('/mutations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return { mutation: res.data };
}
