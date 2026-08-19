/**
 * Client API Keiwas - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../../utils/api';

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

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFERT COMPTE-À-COMPTE (Jùlaba vers Jùlaba)
// ─────────────────────────────────────────────────────────────────────────────

export interface DestinataireTransfert {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
}

export interface ResultatTransfert {
  success: boolean;
  dejaTraite: boolean;
  reference: string;
  solde: number;
}

/**
 * Recherche un destinataire Jùlaba par numéro de téléphone, avant de lancer
 * un transfert. Lève une erreur (404) si aucun compte ne correspond.
 */
export async function rechercherDestinataire(telephone: string): Promise<DestinataireTransfert> {
  return apiRequest('/wallets/me/rechercher-destinataire', {
    method: 'POST',
    body: JSON.stringify({ telephone }),
  });
}

/**
 * Transfert compte-à-compte réel. `idempotencyKey` doit être stable pour une
 * même tentative d'envoi (retry réseau, double-clic) afin d'éviter tout
 * double mouvement — cf. WalletsService.transfererVersUtilisateur.
 */
export async function transfererVersCompte(data: {
  destinataireUserId: string;
  montant: number;
  note?: string;
  idempotencyKey: string;
}): Promise<ResultatTransfert> {
  if (!data.montant || data.montant <= 0) throw new Error('Montant invalide');
  if (!data.destinataireUserId) throw new Error('Destinataire requis');
  return apiRequest('/wallets/me/transfert', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}