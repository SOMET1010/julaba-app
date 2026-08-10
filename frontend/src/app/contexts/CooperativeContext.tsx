import { useUser } from './UserContext';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isCooperatif } from '../types/constants';
import * as cooperativesApi from '../../imports/cooperatives-api';
import { NOT_AUTHENTICATED, apiRequest } from '../../imports/api-client';
import { API_URL } from '../utils/api';

// ── Types CoopératifMembre — champs réellement utilisés ──────
interface CoopMembre {
  id: unknown;
  membreId: unknown;
  nom?: string;
  prenom?: string;
  role?: string;
  dateAdhesion?: string;
  cotisationPayee?: boolean;
  montantCotisation?: number;
  actif?: boolean;
  statut?: string;
}

// ── Types CoopTresorerie — champs réellement utilisés ─────────
interface CoopTransaction {
  id: unknown;
  type: string;
  categorie?: string;
  montant: number;
  membre_id?: unknown;
  description?: string;
  created_at?: string;
  statut?: string;
}

// ── Commande coopérative — non implémenté côté API ────────────
interface CoopCommande {
  id: string;
  [key: string]: unknown;
}


export interface Cooperative {
  id: string;
  nom: string;
  presidentId?: string;
  treorierId?: string;
  secretaireId?: string;
  soldeTresorerie: number;
  dateCreation?: string;
}

export interface CooperativeMembre {
  id: string;
  membreId: string;
  marchandId: string;
  role: 'president' | 'tresorier' | 'secretaire' | 'membre';
  dateAdhesion: string;
  cotisationPayee: boolean;
  actif: boolean;
  statut?: 'actif' | 'inactif' | 'suspendu' | 'en_attente';
  // Champs marchand joints
  nom: string;
  prenom: string;
  telephone: string;
  localisation: string;
  specialite: string;
  totalVentes: number;
  productionsActives: number;
  montantCotisation: number;
}

// Alias pour compatibilité avec ancien code
export type MembreCooperative = CooperativeMembre;

export interface TresorerieTransaction {
  id: string;
  type: 'entree' | 'sortie';
  categorie: 'cotisation' | 'vente' | 'achat' | 'subvention' | 'depense' | 'retrait' | 'autre';
  statut: 'en_attente' | 'validee' | 'annulee';
  montant: number;
  membreId?: string;
  membreNom?: string;
  description?: string;
  date: string;
}

// Alias pour compatibilité
export type TransactionTresorerie = TresorerieTransaction;

interface CooperativeStats {
  volumeGroupe: number;
  tresorerieActuelle: number;
  totalMembres: number;
  membresActifs: number;
  totalCotisations: number;
  totalVentes: number;
}

interface CooperativeContextType {
  cooperative: Cooperative | null;
  membres: CooperativeMembre[];
  tresorerie: TresorerieTransaction[];
  loading: boolean;
  stats: CooperativeStats;
  soldeActuel: number;

  addMembre: (membreId: string, role?: string, dateAdhesion?: string) => Promise<void>;
  addTransaction: (tx: Omit<TransactionTresorerie, 'id'>) => Promise<void>;
  supprimerMembre: (membreId: string) => Promise<void>;

  // Alias francais pour compatibilite composants
  ajouterMembre: (membreId: string, role?: string, dateAdhesion?: string) => Promise<void>;
  modifierMembre: (membreId: string, updates: Partial<CooperativeMembre>) => void;
  ajouterTransaction: (tx: Omit<TransactionTresorerie, 'id'>) => Promise<void>;
  validerTransaction: (id: string) => Promise<void>;
  annulerTransaction: (id: string) => Promise<void>;

  getMembresActifs: () => CooperativeMembre[];
  getCommandesEnCours: () => any[];
  getRecentTransactions: (n: number) => TresorerieTransaction[];
  getTotalCotisations: () => number;
  getTotalVentesGroupees: () => number;

  refreshCooperative: () => Promise<void>;
  refreshMembres: () => Promise<void>;
  refreshTresorerie: () => Promise<void>;
}

const CooperativeContext = createContext<CooperativeContextType | undefined>(undefined);

export function CooperativeProvider({ children }: { children: ReactNode }) {
  const [cooperative, setCooperative] = useState<Cooperative | null>(null);
  const [membres, setMembres] = useState<CooperativeMembre[]>([]);
  const [tresorerie, setTresorerie] = useState<TresorerieTransaction[]>([]);
  const [soldeApi, setSoldeApi] = useState<number>(0);
  const [commandesEnCours, setCommandesEnCours] = useState<CoopCommande[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCooperative = async () => {
    try {
      const { cooperative: data } = await cooperativesApi.fetchCooperative();
      setCooperative({
        id: data.id,
        nom: data.nom,
        presidentId: data.president_id,
        treorierId: data.tresorier_id,
        secretaireId: data.secretaire_id,
        soldeTresorerie: data.solde_tresorerie,
        dateCreation: data.created_at || null,
      });
    } catch (error: unknown) {
      if ((error as Error)?.message === NOT_AUTHENTICATED) return;
      console.warn('[CooperativeContext] loadCooperative failed:', (error as Error)?.message);
    }
  };

  const loadMembres = async () => {
    try {
      const { membres: data } = await cooperativesApi.fetchCooperativeMembres();
      setMembres(data.map((m: any) => ({
        id: String(m.id || ''),
        membreId: String(m.marchand_id || m.membre_id || ''),
        marchandId: String(m.marchand_id || ''),
        role: (m.role_membre || m.role || 'membre') as CooperativeMembre['role'],
        dateAdhesion: m.date_adhesion || m.created_at || new Date().toISOString(),
        cotisationPayee: m.cotisation_payee || false,
        actif: m.statut === 'actif',
        statut: (m.statut || 'actif') as CooperativeMembre['statut'],
        nom: m.marchand?.last_name || m.nom || '',
        prenom: m.marchand?.first_name || m.prenom || '',
        telephone: m.marchand?.phone || m.telephone || '',
        localisation: m.marchand?.market || m.marchand?.commune || m.localisation || '',
        specialite: m.marchand?.activity || m.specialite || 'Autre',
        totalVentes: 0,
        productionsActives: 0,
        montantCotisation: 25000,
      })));
    } catch (error: unknown) {
      if ((error as Error)?.message === NOT_AUTHENTICATED) return;
      console.warn('[CooperativeContext] loadMembres failed:', (error as Error)?.message);
    }
  };

  const loadTresorerie = async () => {
    try {
      const { transactions: data, solde } = await cooperativesApi.fetchCooperativeTresorerie();
      setSoldeApi(Number(solde) || 0);
      setTresorerie(data.map((t: CoopTransaction): TresorerieTransaction => ({
        id: String(t.id ?? ''),
        type: (t.type === 'sortie' ? 'sortie' : 'entree'),
        categorie: (t.categorie || 'autre') as TresorerieTransaction['categorie'],
        statut: (t.statut || 'en_attente') as TresorerieTransaction['statut'],
        montant: Number(t.montant) || 0,
        membreId: t.membre_id != null ? String(t.membre_id) : undefined,
        description: t.description,
        date: t.created_at || new Date().toISOString(),
      })));
    } catch (error: unknown) {
      if ((error as Error)?.message === NOT_AUTHENTICATED) return;
      console.warn('[CooperativeContext] loadTresorerie failed:', (error as Error)?.message);
    }
  };

  const loadCommandesEnCours = async () => {
    try {
      const data = await apiRequest<any>(API_URL, '/cooperatives/commandes-groupees?statut=en_cours', { method: 'GET' });
      if (data) {
        setCommandesEnCours(data.data || (Array.isArray(data) ? data : []));
      }
    } catch (e: any) { console.warn('[CooperativeContext] loadCommandesEnCours failed:', e?.message); }
  };

  const { user } = useUser();

  useEffect(() => {
    // Charger uniquement si l'utilisateur est une coopérative — depuis contexte auth
    if (user && isCooperatif(user?.role)) {
      setLoading(true);
      Promise.all([loadCooperative(), loadMembres(), loadTresorerie(), loadCommandesEnCours()])
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  // ── Fonctions calculées ──────────────────────────────────────────────────────
  const getMembresActifs = () => membres.filter(m => m.actif);

  const getCommandesEnCours = (): CoopCommande[] => commandesEnCours;

  const getRecentTransactions = (n: number) =>
    [...tresorerie].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, n);

  const getTotalCotisations = () =>
    tresorerie.filter(t => t.categorie === 'cotisation').reduce((sum, t) => sum + t.montant, 0);

  const getTotalVentesGroupees = () =>
    tresorerie.filter(t => t.categorie === 'vente').reduce((sum, t) => sum + t.montant, 0);

  const soldeActuel = soldeApi;

  const stats: CooperativeStats = {
    volumeGroupe: tresorerie.filter(t => t.categorie === 'vente').reduce((s, t) => s + t.montant, 0),
    tresorerieActuelle: soldeActuel,
    totalMembres: membres.length,
    membresActifs: membres.filter(m => m.actif).length,
    totalCotisations: getTotalCotisations(),
    totalVentes: getTotalVentesGroupees(),
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const addMembre = async (marchandId: string, role?: string, dateAdhesion?: string) => {
    if (!marchandId?.trim()) throw new Error('marchandId requis');
    try {
      await cooperativesApi.addCooperativeMembre({
        marchand_id: marchandId,
        role_membre: role || 'membre',
        date_adhesion: dateAdhesion || new Date().toISOString(),
      } as any);
      await loadMembres();
    } catch (error: any) {
      console.warn('[CooperativeContext] addMembre failed:', error?.message);
      throw error;
    }
  };

  const supprimerMembre = async (membreId: string) => {
    await apiRequest(API_URL, `/cooperatives/membres/${membreId}`, { method: 'DELETE' });
    await loadMembres();
  };

  const addTransaction = async (tx: Omit<TransactionTresorerie, 'id'>) => {
    if (!tx.montant || isNaN(tx.montant) || tx.montant <= 0) throw new Error('Montant invalide');
    if (!tx.type?.trim()) throw new Error('Type de transaction requis');
    try {
      await cooperativesApi.addTresorerieTransaction({
        type: tx.type,
        montant: tx.montant,
        description: tx.description,
        membre_id: tx.membreId,
        categorie: tx.categorie,
      });
      await Promise.all([loadCooperative(), loadTresorerie()]);
    } catch (error: any) {
      console.warn('[CooperativeContext] addTransaction failed:', error?.message);
      throw error;
    }
  };

  // ── Alias francais ──────────────────────────────────────────────────────────
  const ajouterMembre = addMembre;
  const ajouterTransaction = addTransaction;

  const modifierMembre = (membreId: string, updates: Partial<CooperativeMembre>) => {
    setMembres(prev => prev.map(m => m.membreId === membreId ? { ...m, ...updates } : m));
    // FUTURE: sync via /api/v1/cooperatives
  };

  const validerTransaction = async (id: string) => {
    const snapshot = tresorerie;
    setTresorerie(prev => prev.map(t => t.id === id ? { ...t, statut: 'validee' } : t));
    try {
      await apiRequest(API_URL, `/cooperatives/tresorerie/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'validee' }),
      });
      await loadTresorerie();
    } catch (error: unknown) {
      setTresorerie(snapshot);
      throw error;
    }
  };

  const annulerTransaction = async (id: string) => {
    const snapshot = tresorerie;
    setTresorerie(prev => prev.map(t => t.id === id ? { ...t, statut: 'annulee' } : t));
    try {
      await apiRequest(API_URL, `/cooperatives/tresorerie/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'annulee' }),
      });
      await loadTresorerie();
    } catch (error: unknown) {
      setTresorerie(snapshot);
      throw error;
    }
  };

  const refreshCooperative = async () => { await loadCooperative(); };
  const refreshMembres = async () => { await loadMembres(); };
  const refreshTresorerie = async () => { await loadTresorerie(); };

  const value: CooperativeContextType = {
    cooperative, membres, tresorerie, loading,
    stats, soldeActuel,
    addMembre, addTransaction, supprimerMembre,
    ajouterMembre, modifierMembre, ajouterTransaction, validerTransaction, annulerTransaction,
    getMembresActifs, getCommandesEnCours, getRecentTransactions,
    getTotalCotisations, getTotalVentesGroupees,
    refreshCooperative, refreshMembres, refreshTresorerie,
  };

  return <CooperativeContext.Provider value={value}>{children}</CooperativeContext.Provider>;
}

export function useCooperative() {
  const context = useContext(CooperativeContext);
  if (!context) {
    throw new Error('useCooperative must be used within CooperativeProvider');
  }
  return context;
}