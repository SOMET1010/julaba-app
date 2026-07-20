/**
 * Client API Keiwas - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  user_id: string;
  solde: number;
  solde_bloque: number;
  created_at: string;
  updated_at: string;
}

export interface KeiwaTransaction {
  id: string;
  keiwa_id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'blocage' | 'deblocage' | 'remboursement';
  montant: number;
  description?: string;
  reference?: string;
  statut: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer le keiwa de l'utilisateur
 */
export async function fetchKeiwa(): Promise<{ keiwa: Wallet }> {
  return apiRequest<{ keiwa: Wallet }>('/wallets/me');
}

/**
 * Récupérer l'historique des transactions keiwa
 */
export async function fetchKeiwaTransactions(): Promise<{ transactions: KeiwaTransaction[] }> {
  return apiRequest<{ transactions: KeiwaTransaction[] }>('/wallets/me/transactions');
}

export async function rechargerViaBpay(data: {
  provider: string;
  montant: number;
  telephone: string;
}): Promise<{ payToken: string; paymentUrl: string; status: string; merchantTransactionId: string }> {
  if (!data.montant || data.montant < 200) throw new Error('Montant minimum 200 FCFA');
  if (!data.telephone || data.telephone.length !== 10) throw new Error('Numéro téléphone invalide');
  if (!data.provider) throw new Error('Provider requis');
  return apiRequest('/wallets/me/recharge-mobile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function retraitViaBpay(data: {
  provider: string;
  montant: number;
  telephone: string;
}): Promise<{ partnerTransactionId: string; status: string }> {
  if (!data.montant || data.montant < 200) throw new Error('Montant minimum 200 FCFA');
  if (!data.telephone || data.telephone.length !== 10) throw new Error('Numéro téléphone invalide');
  if (!data.provider) throw new Error('Provider requis');
  return apiRequest('/wallets/me/retrait-mobile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function verifierStatutBpay(payToken: string): Promise<{ statut: string; message: string }> {
  return apiRequest('/wallets/me/statut-paiement', {
    method: 'POST',
    body: JSON.stringify({ payToken }),
  });
}

export async function verifierStatutBpayPublic(payToken: string): Promise<{ statut: string; message: string }> {
  return apiRequest('/wallets/public/statut-paiement', {
    method: 'POST',
    body: JSON.stringify({ payToken }),
  });
}