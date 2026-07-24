/**
 * Client API Caisse - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CaisseTransaction {
  id: string;
  marchand_id: string;
  type: 'vente' | 'depense' | 'approvisionnement';
  montant: number;
  produits?: any;
  mode_paiement?: string;
  notes?: string;
  created_at: string;
}

export interface EnregistrerVenteData {
  details?: any[];
  montant: number;
  produits?: any;
  mode_paiement?: string;
  notes?: string;
  prix_achat?: number;
  prix_vente?: number;
  /** Clé d'idempotence : le backend ne compte pas deux fois la même vente. */
  idempotency_key?: string;
}

export interface EnregistrerDepenseData {
  montant: number;
  notes?: string;
  /** Clé d'idempotence : le backend ne compte pas deux fois la même dépense. */
  idempotency_key?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer l'historique des transactions caisse
 */
export async function fetchCaisseTransactions(): Promise<{ transactions: CaisseTransaction[] }> {
  const data = await apiRequest<any>('/caisse/transactions');
  const txArray = Array.isArray(data) ? data : (data.transactions || []);
  return { transactions: txArray };
}

/**
 * Enregistrer une vente
 */
export async function enregistrerVente(data: EnregistrerVenteData): Promise<{ transaction: CaisseTransaction }> {
  return apiRequest<{ transaction: CaisseTransaction }>('/caisse/vente', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Enregistrer une dépense
 */
export async function enregistrerDepense(data: EnregistrerDepenseData): Promise<{ transaction: CaisseTransaction }> {
  return apiRequest<{ transaction: CaisseTransaction }>('/caisse/depense', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// ─────────────────────────────────────────────────────────────────────────────
// TYPES CREDITS & CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface Credit {
  id: string;
  marchand_id: string;
  client_nom: string;
  client_phone: string;
  montant_total: number;
  acompte: number;
  montant_restant: number;
  echeance: string;
  statut: 'en_attente' | 'en_retard' | 'bientot' | 'paye';
  statut_calcule: 'en_attente' | 'en_retard' | 'bientot' | 'paye';
  jours_restants: number;
  articles: any[];
  notes: string;
  paye_le: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientMarchand {
  id: string;
  marchand_id: string;
  nom: string;
  phone: string;
  nb_achats: number;
  nb_credits: number;
  montant_du: number;
  derniere_visite: string;
}

export interface CreerCreditData {
  client_nom: string;
  client_phone?: string;
  montant_total: number;
  acompte?: number;
  echeance: string;
  articles?: any[];
  notes?: string;
  transaction_id?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS CREDITS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCredits(): Promise<{ credits: Credit[]; total_du: number }> {
  return apiRequest<{ credits: Credit[]; total_du: number }>('/caisse/credits');
}

export async function creerCredit(data: CreerCreditData): Promise<{ credit: Credit }> {
  return apiRequest<{ credit: Credit }>('/caisse/credits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function marquerCreditPaye(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/caisse/credits/${id}/payer`, {
    method: 'PATCH',
  });
}

export async function ajouterAcompte(id: string, montant: number): Promise<{ success: boolean; solde: boolean }> {
  if (!id?.trim()) throw new Error('ID crédit requis');
  if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant acompte invalide');
  return apiRequest<{ success: boolean; solde: boolean }>(`/caisse/credits/${id}/acompte`, {
    method: 'PATCH',
    body: JSON.stringify({ montant }),
  });
}

export async function fetchClientsRecents(): Promise<{ clients: ClientMarchand[] }> {
  return apiRequest<{ clients: ClientMarchand[] }>('/caisse/credits/clients');
}

export async function rechercherClient(nom: string): Promise<{ client: ClientMarchand | null; credits: Credit[] }> {
  return apiRequest<{ client: ClientMarchand | null; credits: Credit[] }>(
    `/caisse/credits/clients/${encodeURIComponent(nom)}`
  );
}
