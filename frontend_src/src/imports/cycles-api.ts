/**
 * Client API Cycles de Production - JÙLABA
 * Migré vers backend NestJS (PostgreSQL)
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

export interface Cycle {
  id: string;
  user_id: string;
  culture: string;
  surface: number;
  parcelle?: string;
  date_plantation: string;
  date_recolte_estimee: string;
  date_recolte_reelle?: string;
  quantite_estimee: number;
  quantite_reelle?: number;
  status: 'preparation' | 'active' | 'completed' | 'archived';
  notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCycleData {
  culture: string;
  surface: number;
  parcelle?: string;
  date_plantation: string;
  date_recolte_estimee: string;
  quantite_estimee: number;
  notes?: string;
  photo_url?: string;
  status?: 'preparation' | 'active';
}

export interface UpdateCycleData {
  culture?: string;
  surface?: number;
  parcelle?: string;
  date_recolte_estimee?: string;
  quantite_estimee?: number;
  notes?: string;
  photo_url?: string;
  status?: 'preparation' | 'active' | 'completed' | 'archived';
}

export interface CompleteCycleData {
  quantite_reelle: number;
  date_recolte_reelle: string;
  notes?: string;
}

export async function fetchCycles(): Promise<{ cycles: Cycle[] }> {
  const data = await apiRequest<any>('/cycles');
  const arr = Array.isArray(data) ? data : (data.cycles || []);
  return { cycles: arr };
}

export async function fetchCycle(id: string): Promise<{ cycle: Cycle }> {
  const data = await apiRequest<any>(`/cycles/${id}`);
  return { cycle: data.cycle || data };
}

export async function createCycle(data: CreateCycleData): Promise<{ cycle: Cycle }> {
  return apiRequest<{ cycle: Cycle }>('/cycles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCycle(id: string, data: UpdateCycleData): Promise<{ cycle: Cycle }> {
  return apiRequest<{ cycle: Cycle }>(`/cycles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCycle(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/cycles/${id}`, {
    method: 'DELETE',
  });
}

export async function completeCycle(id: string, data: CompleteCycleData): Promise<{ cycle: Cycle }> {
  return apiRequest<{ cycle: Cycle }>(`/cycles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'completed',
      quantite_reelle: data.quantite_reelle,
      date_recolte_reelle: data.date_recolte_reelle,
      notes: data.notes,
    }),
  });
}
