/**
 * Client API Stock — JÙLABA
 *
 * HYGIÈNE-1 axe 2 (convergence API). Les quatre appels du stock vivaient en
 * `fetch()` direct dans `StockContext`. Ils ne passaient donc par AUCUNE des
 * garanties du client commun : pas de rafraîchissement silencieux du jeton sur
 * 401, pas de délai maximal, pas d'erreur typée portant le statut.
 *
 * Ils passent désormais par `apiRequest`, comme la vente. L'erreur levée est
 * une `HttpError` qui porte `.status` — exactement ce que `doitEnfilerStock`
 * lit déjà pour décider d'enfiler une opération hors-ligne.
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../../utils/api';
import type { StockServeur } from '../../types/vente';
import type { MouvementApi } from '../../services/mouvementsStock';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

/** Lecture du stock. Le serveur a renvoyé plusieurs formes selon les versions ;
 *  on les réduit ici à UNE seule liste, au lieu de refaire ce tri à l'appel. */
export async function fetchStocks(): Promise<StockServeur[]> {
  const data = await apiRequest<{ stocks?: StockServeur[]; data?: StockServeur[] } | StockServeur[]>('/stocks');
  if (Array.isArray(data)) return data;
  return data?.stocks || data?.data || [];
}

export async function creerStock(payload: Record<string, unknown>): Promise<unknown> {
  return apiRequest('/stocks', { method: 'POST', body: JSON.stringify(payload) });
}

export async function modifierStock(id: string, payload: Record<string, unknown>): Promise<unknown> {
  if (!id?.trim()) throw new Error('ID stock requis');
  return apiRequest(`/stocks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function supprimerStock(id: string): Promise<unknown> {
  if (!id?.trim()) throw new Error('ID stock requis');
  return apiRequest(`/stocks/${id}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOUVEMENTS DE STOCK (INIT-019)
//
// Vit auparavant en `fetch()` direct dans `GestionStock.tsx` (marchand). Le
// rafraîchissement silencieux du jeton sur 401 ne s'appliquait pas : une
// session expirée faisait silencieusement disparaître l'historique des
// mouvements au lieu de se renouveler.
// ─────────────────────────────────────────────────────────────────────────────

export interface MouvementStockApi extends MouvementApi {}

/**
 * Récupère la liste des mouvements de stock du marchand connecté.
 * Si `produitId` est fourni, ne renvoie que les mouvements du produit
 * correspondant (filtre backend). Le serveur renvoie `{ mouvements: [...] }`.
 */
export async function fetchMouvementsStock(
  produitId?: string,
  options: RequestInit = {},
): Promise<{ mouvements: MouvementStockApi[] }> {
  const endpoint = produitId
    ? `/stocks/${encodeURIComponent(produitId)}/mouvements`
    : '/stocks/mouvements';
  return apiRequest<{ mouvements: MouvementStockApi[] }>(endpoint, options);
}
