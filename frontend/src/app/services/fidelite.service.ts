// ── Programme de fidélité paramétrable (écart CDC 8.1.2) ─────────────────────
// Barème réglable par le marchand + points par client (suivi par téléphone).
import { apiRequest } from '../../imports/api-client';
import { API_URL } from '../utils/api';

export interface FideliteConfig {
  actif: boolean;
  points_par_cent: number;   // points gagnés par tranche de 100 FCFA
  seuil_points: number;      // points nécessaires pour la récompense
  recompense_fcfa: number;   // valeur de la remise en FCFA
}

export interface FideliteClient {
  id: string;
  telephone: string;
  nom: string | null;
  points: number;
  total_achats: number;
}

const DEFAUT: FideliteConfig = { actif: false, points_par_cent: 1, seuil_points: 100, recompense_fcfa: 1000 };

export async function getConfig(): Promise<FideliteConfig> {
  try {
    const r = await apiRequest<{ config: FideliteConfig }>(API_URL, '/fidelite/config', { method: 'GET' });
    return r.config || DEFAUT;
  } catch { return DEFAUT; }
}

export async function setConfig(config: FideliteConfig): Promise<FideliteConfig> {
  const r = await apiRequest<{ config: FideliteConfig }>(API_URL, '/fidelite/config', {
    method: 'PUT', body: JSON.stringify(config),
  });
  return r.config;
}

export async function getClient(tel: string): Promise<{ client: FideliteClient | null; config: FideliteConfig }> {
  return apiRequest(API_URL, `/fidelite/client?tel=${encodeURIComponent(tel)}`, { method: 'GET' });
}

export async function gagnerPoints(telephone: string, montant: number, nom?: string): Promise<{
  success: boolean; pointsGagnes: number; client: FideliteClient; recompenseDisponible: boolean; config: FideliteConfig;
}> {
  return apiRequest(API_URL, '/fidelite/gagner', {
    method: 'POST', body: JSON.stringify({ telephone, montant, nom: nom || '' }),
  });
}

export async function utiliserRecompense(telephone: string): Promise<{ success: boolean; remise: number; client: FideliteClient }> {
  return apiRequest(API_URL, '/fidelite/utiliser', {
    method: 'POST', body: JSON.stringify({ telephone }),
  });
}
