/**
 * Client API Score Financier Réel — JÙLABA
 *
 * Source unique du VRAI score financier (0-1000), calculé côté backend par
 * FinancialScoreService à partir de données réelles (régularité, volume,
 * équilibre, croissance, wallet, ancienneté, diversification). Ce score est
 * DISTINCT du score de gamification (0-100, GET /scores/me) : ne pas les
 * confondre, ne pas dériver un nouveau calcul côté frontend (Constitution §2 —
 * un concept = une seule source de vérité).
 *
 * GET /financial-score/:userId — accessible en self (JWT) ou par un admin.
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../../utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — miroir exact de backend/src/financial-score/financial-score.service.ts
// ─────────────────────────────────────────────────────────────────────────────

export type FinancialScoreNiveau =
  | 'Excellent'
  | 'Bon'
  | 'Moyen'
  | 'Faible'
  | 'Insuffisant';

export interface FinancialDimension {
  score: number;
  details: string;
}

export interface FinancialScoreResult {
  userId: string;
  scoreTotal: number;
  niveau: FinancialScoreNiveau;
  recommandation: string;
  montantEligible: number;
  dimensions: {
    regularite: FinancialDimension;
    volume: FinancialDimension;
    equilibre: FinancialDimension;
    croissance: FinancialDimension;
    wallet: FinancialDimension;
    anciennete: FinancialDimension;
    diversification: FinancialDimension;
  };
  calculéLe: string;
}

/**
 * Récupère le score financier réel d'un utilisateur.
 * En pratique, `userId` est toujours l'utilisateur courant (self) — la route
 * backend refuse tout autre id (403) sauf pour un admin.
 */
export async function fetchFinancialScore(userId: string): Promise<FinancialScoreResult> {
  return apiRequest<FinancialScoreResult>(`/financial-score/${userId}`);
}
