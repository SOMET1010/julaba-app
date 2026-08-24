/**
 * Client API Coopératives - JÙLABA
 */
import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../../utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

export interface Cooperative {
  id: string;
  user_id?: string;
  nom: string;
  president_id?: string;
  tresorier_id?: string;
  secretaire_id?: string;
  solde_tresorerie?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CooperativeMembre {
  id: string;
  cooperative_id?: string;
  membre_id: string;
  role: 'president' | 'tresorier' | 'secretaire' | 'membre';
  date_adhesion: string;
  cotisation_payee: boolean;
  actif: boolean;
  created_at?: string;
}

export interface TresorerieTransaction {
  id: string;
  cooperative_id?: string;
  type: 'entree' | 'sortie';
  categorie: 'cotisation' | 'vente' | 'achat' | 'subvention' | 'depense' | 'retrait' | 'autre';
  statut: 'en_attente' | 'validee' | 'annulee';
  montant: number;
  membre_id?: string;
  description?: string;
  created_at: string;
}

export interface AddTresorerieData {
  type: 'entree' | 'sortie';
  categorie: string;
  montant: number;
  membre_id?: string;
  description?: string;
}

export interface AddMembreData {
  marchand_id: string;
  role_membre?: string;
  date_adhesion?: string;
}

export async function fetchCooperative(): Promise<{ cooperative: Cooperative }> {
  const data = await apiRequest<any>('/cooperatives');
  const coop = data?.data?.[0] || data?.cooperative || null;
  return { cooperative: coop };
}

export async function fetchCooperativeMembres(): Promise<{ membres: CooperativeMembre[] }> {
  const data = await apiRequest<any>('/cooperatives/membres');
  const membres = data?.membres || data || [];
  return { membres };
}

export async function fetchCooperativeTresorerie(): Promise<{ transactions: TresorerieTransaction[]; solde: number }> {
  const data = await apiRequest<any>('/cooperatives/tresorerie');
  const transactions = data?.transactions || [];
  const solde = Number(data?.solde || 0);
  return { transactions, solde };
}

export async function addTresorerieTransaction(data: AddTresorerieData): Promise<{ transaction: TresorerieTransaction }> {
  return apiRequest<{ transaction: TresorerieTransaction }>('/cooperatives/tresorerie', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addCooperativeMembre(data: AddMembreData): Promise<{ membre: CooperativeMembre }> {
  return apiRequest<{ membre: CooperativeMembre }>('/cooperatives/membres', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Besoins ──────────────────────────────────────────────────

export interface Besoin {
  id: string;
  cooperative_id: string;
  produit: string;
  categorie?: string;
  quantite: number;
  unite: string;
  prix_max?: number;
  priorite: 'normale' | 'urgente';
  statut: 'en_attente' | 'consolide' | 'commande' | 'livre';
  notes?: string;
  date_besoin?: string;
  created_at?: string;
}

export async function fetchBesoins(): Promise<{ besoins: Besoin[] }> {
  const data = await apiRequest<any>('/cooperatives/besoins');
  return { besoins: data?.besoins || data || [] };
}

export async function createBesoin(data: Omit<Besoin, 'id' | 'statut' | 'created_at'>): Promise<{ besoin: Besoin }> {
  return apiRequest<{ besoin: Besoin }>('/cooperatives/besoins', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Stock commun ─────────────────────────────────────────────
// Le pot partagé de la coopérative — PAS le stock personnel (`/stocks`,
// scopé par utilisateur). Alimenté par les apports des membres, décrémenté
// par les distributions, chaque mouvement tracé côté serveur.

export interface CooperativeStockItem {
  id: string;
  produit: string;
  categorie?: string | null;
  quantite: number;
  unite: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApportStockData {
  produit: string;
  quantite: number;
  unite: string;
  categorie?: string;
}

export interface DistributionItem {
  membreId: string;
  quantite: number;
}

export interface DistributionData {
  produit: string;
  distributions: DistributionItem[];
  besoinId?: string;
}

export async function fetchStockCommun(): Promise<{ stocks: CooperativeStockItem[] }> {
  const data = await apiRequest<any>('/cooperatives/stock');
  return { stocks: data?.stocks || [] };
}

export async function apporterStockCommun(data: ApportStockData): Promise<{ success: boolean; stock: CooperativeStockItem }> {
  return apiRequest<{ success: boolean; stock: CooperativeStockItem }>('/cooperatives/stock/apport', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function distribuerStockCommun(
  data: DistributionData,
): Promise<{ success: boolean; persisted: boolean; stockRestant: number }> {
  return apiRequest<{ success: boolean; persisted: boolean; stockRestant: number }>('/cooperatives/distribution', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Historique — lecture seule — des distributions REÇUES par l'utilisateur
// courant en tant que membre (toutes coopératives confondues). Vue nominative
// sur le même journal append-only que `distribuerStockCommun` écrit.
export interface DistributionRecue {
  id: string;
  produit: string;
  quantite: number;
  unite: string | null;
  createdAt: string;
}

export async function fetchMesDistributions(): Promise<{ distributions: DistributionRecue[] }> {
  const data = await apiRequest<any>('/cooperatives/mes-distributions');
  return { distributions: data?.distributions || [] };
}


