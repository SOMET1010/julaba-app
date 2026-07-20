/**
 * Client API Commandes - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Commande {
  id: string;
  user_id: string;
  acheteur_id?: string;
  vendeur_id?: string;
  type: 'achat' | 'vente' | 'vente_directe';
  statut: 'en_attente' | 'confirmee' | 'en_cours' | 'en_livraison' | 'livree' | 'annulee' | 'litige';
  statut_paiement?: 'non_paye' | 'paye';
  paye_at?: string;
  produit: string;
  quantite: string;
  prix: number;
  total: number;
  imageUrl?: string;
  acheteurTelephone?: string;
  localite?: string;
  mode_paiement?: string;
  date_creation: string;
  date_livraison?: string;
  adresse_livraison?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type CreateCommandeStatut = Commande['statut'];

export interface CreateCommandeData {
  type: 'achat' | 'vente' | 'vente_directe';
  produit: string;
  quantite: string;
  prix_unitaire?: number;
  total?: number;
  statut?: CreateCommandeStatut;
  date_commande?: string;
  acheteur_id?: string;
  acheteur_nom?: string;
  vendeur_id?: string;
  publication_id?: string;
  mode_paiement?: string;
  operateur_mobile?: string;
  adresse_livraison?: string;
  notes?: string;
  image_url?: string;
  acheteur_telephone?: string;
  localite?: string;
  date_livraison?: string;
}

export interface UpdateCommandeData {
  statut?: Commande['statut'];
  dateLivraison?: string;
  date_livraison?: string;
  notes?: string;
}

export interface NegociationApi {
  id: string;
  statut: string;
  marchandId?: string;
  marchand_id?: string;
  vendeurId?: string;
  vendeur_id?: string;
  produit: string;
  quantite: number;
  prixOriginal?: number;
  prix_original?: number;
  prixPropose?: number;
  prix_propose?: number;
  unite: string;
  message?: string;
  prixContreOffre?: number;
  prix_contre_offre?: number;
  messageReponse?: string;
  message_reponse?: string;
  createdAt?: string;
  created_at?: string;
}

export interface ProposerNegociationData {
  vendeurId: string;
  produit: string;
  quantite: number;
  prixOriginal: number;
  prixPropose: number;
  unite: string;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer toutes les commandes de l'utilisateur
 */
export async function fetchCommandes(): Promise<{ commandes: Commande[] }> {
  return apiRequest<{ commandes: Commande[] }>('/commandes');
}

/**
 * Créer une nouvelle commande
 */
export async function createCommande(data: CreateCommandeData): Promise<{ commande: Commande }> {
  return apiRequest<{ commande: Commande }>('/commandes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Modifier une commande
 */
export async function updateCommande(id: string, data: UpdateCommandeData): Promise<{ commande: Commande }> {
  if (!id?.trim()) throw new Error('ID commande requis');
  return apiRequest<{ commande: Commande }>(`/commandes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Annuler une commande
 */
export async function cancelCommande(id: string): Promise<{ success: boolean }> {
  if (!id?.trim()) throw new Error('ID commande requis');
  await apiRequest(`/commandes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ statut: 'annulee' }),
  });
  return { success: true };
  // Note: apiRequest lève une exception si !res.ok — success:true
  // n'est atteint que si l'appel a réussi
}

export async function livrerCommande(id: string): Promise<void> {
  await apiRequest(`/commandes/${id}/livrer`, { method: 'PATCH' });
}

export async function recupererPaiementCommande(id: string): Promise<{ success: boolean }> {
  return apiRequest(`/commandes/${id}/paiement`, { method: 'POST' });
}
/**
 * Récupérer les négociations
 */
export async function fetchNegociations(): Promise<{ negociations: NegociationApi[] }> {
  return apiRequest<{ negociations: NegociationApi[] }>('/commandes/negociations');
}

/**
 * Proposer une négociation
 */
export async function proposerNegociation(data: ProposerNegociationData): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/commandes/negociation', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function marchandRepondreNegociation(id: string, data: { statut: 'accepte' | 'refuse' }): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/commandes/negociation/${id}/marchand-repondre`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function repondreNegociation(
  id: string,
  data: { statut: 'accepte' | 'refuse' | 'contre_propose'; prixContreOffre?: number; messageReponse?: string }
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/commandes/negociation/${id}/repondre`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
