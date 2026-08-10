import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as cyclesApiAdapterMod from '../services/api/producteur-api-adapter';
import { API_URL } from '../utils/api';
const cyclesApi = cyclesApiAdapterMod.cyclesApiAdapter;
const recoltesApi = cyclesApiAdapterMod.recoltesApiAdapter;
const publicationsApi = cyclesApiAdapterMod.publicationsApiAdapter;

// Alias pour les types
type CreateCycleData = cyclesApiAdapterMod.CreateCycleData;
type UpdateCycleData = cyclesApiAdapterMod.UpdateCycleData;
type CompleteCycleData = cyclesApiAdapterMod.CompleteCycleData;
type CreateRecolteData = cyclesApiAdapterMod.CreateRecolteData;
type UpdateRecolteData = cyclesApiAdapterMod.UpdateRecolteData;
type CreatePublicationData = cyclesApiAdapterMod.CreatePublicationData;
type UpdatePublicationData = cyclesApiAdapterMod.UpdatePublicationData;
import { DEV_MODE, devLog } from '../config/devMode';
import { useApp } from './AppContext';
import { NOT_AUTHENTICATED, apiRequest } from '../../imports/api-client';

/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — ProducteurContext
 * ═══════════════════════════════════════════════════════════════════
 * Gestion complète des cycles de production, récoltes et publications
 */

export interface ProducteurStats {
  recoltesTotales: number;
  recoltesVendues: number;
  revenusTotal: number;
  commandesEnCours: number;
  cyclesActifs: number;
  publicationsActives: number;
}

export interface Cycle {
  id: string;
  culture: string;
  surface: number;
  parcelle?: string;
  datePlantation: Date;
  dateRecolteEstimee: Date;
  dateRecolteReelle?: Date;
  quantiteEstimee: number;
  quantiteReelle?: number;
  status: 'preparation' | 'active' | 'completed' | 'archived';
  notes?: string;
  photoUrl?: string;
}

export interface Recolte {
  id: string;
  cycleId?: string;
  produit: string;
  quantite: number;
  unite: string;
  qualite: 'standard' | 'premium' | 'bio';
  dateRecolte: string;
  statut: 'declaree' | 'validee' | 'vendue';
  prixUnitaire: number;
  parcelle?: string;
  notes?: string;
  photoUrl?: string;
  stockDisponible: number;
  stockVendu: number;
  createdAt?: string;
}

export interface Publication {
  id: string;
  cycleId?: string;
  recolteId?: string;
  produit: string;
  culture: string;
  quantiteDisponible: number;
  quantiteInitiale: number;
  unite: string;
  prixUnitaire: number;
  qualite: 'standard' | 'premium' | 'bio';
  localisation?: string;
  active: boolean;
  statut: 'disponible' | 'epuise' | 'suspendu' | 'archive';
  datePublication: string;
  dateExpiration?: string;
  dateRecolte?: string;
  description?: string;
  photoUrl?: string;
  conditionsVente?: string;
}

export interface CommandeProducteur {
  id: string;
  acheteurId: string;
  acheteurNom: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  statut: 'en_attente' | 'confirmee' | 'en_cours' | 'livree' | 'annulee';
  dateCommande: string;
  recolteId?: string;
  recolte_id?: string;
}

export interface AlerteProducteur {
  id: string;
  type: 'meteo' | 'prix' | 'stock' | 'commande' | 'recolte' | 'cycle';
  titre: string;
  message: string;
  urgence: 'info' | 'warning' | 'critical';
  date: string;
  lue: boolean;
}

interface ProducteurContextType {
  stats: ProducteurStats | null;
  loading: boolean;
  cycles: Cycle[];
  recoltes: Recolte[];
  commandes: CommandeProducteur[];
  alertes: AlerteProducteur[];
  publications: Publication[];

  getStats: () => Promise<ProducteurStats>;
  refreshStats: () => Promise<void>;
  refreshAllData: () => Promise<void>;

  // Cycles
  fetchCycles: () => Promise<void>;
  createCycle: (data: CreateCycleData) => Promise<void>;
  updateCycle: (id: string, data: UpdateCycleData) => Promise<void>;
  deleteCycle: (id: string) => Promise<void>;
  completeCycle: (id: string, data: CompleteCycleData) => Promise<void>;

  // Recoltes
  fetchRecoltes: () => Promise<void>;
  createRecolte: (data: CreateRecolteData) => Promise<any>;
  updateRecolte: (id: string, data: UpdateRecolteData) => Promise<void>;
  deleteRecolte: (id: string) => Promise<void>;

  // Publications
  fetchPublications: () => Promise<void>;
  createPublication: (data: CreatePublicationData) => Promise<void>;
  updatePublication: (id: string, data: UpdatePublicationData) => Promise<void>;
  deletePublication: (id: string) => Promise<void>;
  togglePublication: (id: string) => Promise<void>;
}

const ProducteurContext = createContext<ProducteurContextType | undefined>(undefined);

export function ProducteurProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<ProducteurStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [recoltes, setRecoltes] = useState<Recolte[]>([]);
  const [commandes, setCommandes] = useState<CommandeProducteur[]>([]);
  const [alertes, setAlertes] = useState<AlerteProducteur[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CYCLES DE PRODUCTION
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchCycles = async () => {
    try {
      const data = await apiRequest<any>(API_URL, '/cycles', { method: 'GET' });
      if (!data) return;
      const raw: any[] = data.cycles || data.data || (Array.isArray(data) ? data : []);
      const mappedCycles: Cycle[] = raw.map((c: any) => ({
        id: c.id,
        culture: c.culture,
        surface: Number(c.surface),
        parcelle: c.parcelle,
        datePlantation: new Date(c.datePlantation || c.date_plantation),
        dateRecolteEstimee: new Date(c.dateRecolteEstimee || c.date_recolte_estimee),
        dateRecolteReelle: (c.dateRecolteReelle || c.date_recolte_reelle) ? new Date(c.dateRecolteReelle || c.date_recolte_reelle) : undefined,
        quantiteEstimee: Number(c.quantiteEstimee || c.quantite_estimee),
        quantiteReelle: (c.quantiteReelle || c.quantite_reelle) ? Number(c.quantiteReelle || c.quantite_reelle) : undefined,
        status: c.status,
        notes: c.notes,
        photoUrl: c.photoUrl || c.photo_url,
      }));
      setCycles(mappedCycles);
    } catch (e: any) { if (e?.message !== NOT_AUTHENTICATED) console.warn('[ProducteurContext] fetchCycles failed:', e?.message); }
  };


  const createCycle = async (data: CreateCycleData) => {
    if (!data.culture?.trim()) throw new Error('Culture requise');
    if (!data.quantite_estimee || Number(data.quantite_estimee) <= 0) throw new Error('Quantité estimée invalide');
    let res: any;
    try {
      res = await apiRequest<any>(API_URL, '/cycles', {
        method: 'POST',
        body: JSON.stringify({
          culture: data.culture,
          surface: Number(data.surface),
          parcelle: data.parcelle || undefined,
          date_plantation: data.date_plantation,
          date_recolte_estimee: data.date_recolte_estimee,
          quantite_estimee: Number(data.quantite_estimee),
          notes: data.notes || undefined,
          photo_url: data.photo_url || undefined,
        }),
      });
    } catch (e: any) {
      if (e?.message === NOT_AUTHENTICATED) throw new Error('Tu dois te connecter pour créer une plantation');
      throw e;
    }
    const cycle = res;
    const newCycle: Cycle = {
      id: cycle.id,
      culture: cycle.culture,
      surface: Number(cycle.surface),
      parcelle: cycle.parcelle,
      datePlantation: new Date(cycle.datePlantation),
      dateRecolteEstimee: new Date(cycle.dateRecolteEstimee),
      dateRecolteReelle: cycle.dateRecolteReelle ? new Date(cycle.dateRecolteReelle) : undefined,
      quantiteEstimee: Number(cycle.quantiteEstimee),
      quantiteReelle: cycle.quantiteReelle ? Number(cycle.quantiteReelle) : undefined,
      status: cycle.status,
      notes: cycle.notes,
      photoUrl: cycle.photoUrl,
    };
    setCycles(prev => [newCycle, ...prev]);
    refreshStats().catch(() => {});
  };


  const updateCycle = async (id: string, data: UpdateCycleData) => {
    try {
      const { cycle } = await cyclesApi.updateCycle(id, data);
      setCycles(prev => prev.map(c => c.id === id ? {
        id: cycle.id,
        culture: cycle.culture,
        surface: cycle.surface,
        parcelle: cycle.parcelle,
        datePlantation: new Date(cycle.date_plantation),
        dateRecolteEstimee: new Date(cycle.date_recolte_estimee),
        dateRecolteReelle: cycle.date_recolte_reelle ? new Date(cycle.date_recolte_reelle) : undefined,
        quantiteEstimee: cycle.quantite_estimee,
        quantiteReelle: cycle.quantite_reelle,
        status: cycle.status,
        notes: cycle.notes,
        photoUrl: cycle.photo_url,
      } : c));
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] updateCycle failed:', error?.message);
      throw error;
    }
  };

  const deleteCycle = async (id: string) => {
    try {
      await cyclesApi.deleteCycle(id);
      setCycles(prev => prev.filter(c => c.id !== id));
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] deleteCycle failed:', error?.message);
      throw error;
    }
  };

  const completeCycle = async (id: string, data: CompleteCycleData) => {
    try {
      // Optimistic update — migration immédiate avant réponse backend
      setCycles(prev => prev.map(c => c.id === id ? {
        ...c,
        status: 'completed' as const,
        dateRecolteReelle: data.date_recolte_reelle ? new Date(data.date_recolte_reelle) : new Date(),
        quantiteReelle: data.quantite_reelle ? Number(data.quantite_reelle) : c.quantiteReelle,
      } : c));
      // Appel backend en arrière-plan
      cyclesApi.completeCycle(id, data).then(({ cycle }) => {
        setCycles(prev => prev.map(c => c.id === id ? {
          ...c,
          status: cycle.status,
          dateRecolteReelle: cycle.date_recolte_reelle ? new Date(cycle.date_recolte_reelle) : undefined,
          quantiteReelle: cycle.quantite_reelle ? Number(cycle.quantite_reelle) : undefined,
        } : c));
        refreshStats();
      }).catch((e: any) => {
        console.warn('[ProducteurContext] completeCycle backend failed, rollback:', e?.message);
        // Rollback si erreur
        setCycles(prev => prev.map(c => c.id === id ? { ...c, status: 'active' as const } : c));
      });
    } catch (error: any) {
      console.warn('[ProducteurContext] completeCycle failed:', error?.message);
      throw error;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RÉCOLTES
  // ═══════════════════════════════════════════════════════════════════════════

    const fetchRecoltes = async () => {
    try {
      const data = await apiRequest<any>(API_URL, '/recoltes?limit=100', { method: 'GET' });
      if (!data) return;
      const rows: any[] = Array.isArray(data) ? data : (data.recoltes || []);
      setRecoltes(rows.map((r: any) => ({
        id: r.id,
        cycleId: r.cycleId || r.cycle_id,
        produit: r.produit || '',
        quantite: Number(r.quantite) || 0,
        unite: r.unite || 'kg',
        qualite: r.qualite || 'standard',
        dateRecolte: r.dateRecolte || r.date_recolte,
        statut: r.statut || 'declaree',
        prixUnitaire: Number(r.prixUnitaire || r.prix_unitaire) || 0,
        photoUrl: r.photoUrl || r.photo_url || undefined,
        parcelle: r.parcelle,
        notes: r.notes,
        createdAt: r.createdAt || r.created_at,
        stockDisponible: Number(r.stockDisponible || r.stock_disponible) || Number(r.quantite) || 0,
        stockVendu: Number(r.stockVendu || r.stock_vendu) || 0,
      })));
    } catch (e: any) { if (e?.message !== NOT_AUTHENTICATED) console.warn('[ProducteurContext] fetchRecoltes failed:', e?.message); }
  };

  const createRecolte = async (data: CreateRecolteData) => {
    if (!data.produit?.trim()) throw new Error('Produit requis');
    if (!data.quantite || Number(data.quantite) <= 0) throw new Error('Quantité invalide');
    let res: any;
    try {
      res = await apiRequest<any>(API_URL, '/recoltes', {
        method: 'POST',
        body: JSON.stringify({
          produit: data.produit,
          quantite: Number(data.quantite),
          unite: data.unite || 'kg',
          qualite: data.qualite || 'standard',
          date_recolte: data.date_recolte || new Date().toISOString().split('T')[0],
          prix_unitaire: Number(data.prix_unitaire) || 0,
          statut: 'declaree',
          cycle_id: data.cycle_id || null,
          parcelle: data.parcelle || null,
          notes: data.notes || null,
          photo_url: (data as any).photo_url || null,
        }),
      });
    } catch (e: any) {
      if (e?.message === NOT_AUTHENTICATED) throw new Error('Tu dois te connecter pour créer une récolte');
      throw e;
    }
    const saved = res;
    if (saved?.id) {
      const nouvelleRecolte: Recolte = {
        id: saved.id,
        cycleId: saved.cycle_id || saved.cycleId || data.cycle_id,
        produit: saved.produit || data.produit,
        quantite: Number(saved.quantite || data.quantite || 0),
        unite: saved.unite || data.unite || 'kg',
        qualite: saved.qualite || data.qualite || 'standard',
        dateRecolte: saved.date_recolte || data.date_recolte || new Date().toISOString(),
        statut: saved.statut || 'declaree',
        prixUnitaire: Number(saved.prix_unitaire || data.prix_unitaire || 0),
        parcelle: saved.parcelle || data.parcelle,
        notes: saved.notes || data.notes,
        photoUrl: saved.photo_url || (data as any).photo_url,
        stockDisponible: Number(saved.stock_disponible || saved.quantite || data.quantite || 0),
        stockVendu: 0,
        createdAt: saved.created_at || new Date().toISOString(),
      };
      setRecoltes(prev => [...prev, nouvelleRecolte]);
    } else {
      await fetchRecoltes();
    }
    await refreshStats();
    return saved;
  };


  const updateRecolte = async (id: string, data: UpdateRecolteData) => {
    try {
      const { recolte } = await recoltesApi.updateRecolte(id, data);
      setRecoltes(prev => prev.map(r => r.id === id ? {
        ...r,
        id: recolte.id,
        cycleId: recolte.cycle_id,
        produit: recolte.produit,
        quantite: recolte.quantite,
        unite: recolte.unite,
        qualite: recolte.qualite,
        dateRecolte: recolte.date_recolte,
        statut: recolte.statut,
        prixUnitaire: recolte.prix_unitaire,
        parcelle: recolte.parcelle,
        notes: recolte.notes,
        stockDisponible: Number(recolte.stock_disponible ?? recolte.stockDisponible ?? recolte.quantite) || r.stockDisponible,
        stockVendu: Number(recolte.stock_vendu ?? recolte.stockVendu) || r.stockVendu,
      } : r));
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] updateRecolte failed:', error?.message);
      throw error;
    }
  };

  const deleteRecolte = async (id: string) => {
    try {
      await recoltesApi.deleteRecolte(id);
      setRecoltes(prev => prev.filter(r => r.id !== id));
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] deleteRecolte failed:', error?.message);
      throw error;
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchPublications = async () => {
    if (DEV_MODE) {
      devLog('ProducteurContext', 'Mode dev - skip fetchPublications');
      return;
    }
    try {
      const { publications: apiPublications } = await publicationsApi.fetchPublications(true, false);
      const mappedPublications: Publication[] = apiPublications.map(p => ({
        id: p.id,
        cycleId: p.cycle_id,
        recolteId: p.recolte_id,
        produit: p.produit,
        culture: p.culture,
        quantiteDisponible: p.quantite_disponible,
        quantiteInitiale: p.quantite_initiale,
        unite: p.unite,
        prixUnitaire: p.prix_unitaire,
        qualite: p.qualite,
        localisation: p.localisation,
        active: p.active,
        statut: p.statut,
        datePublication: p.date_publication,
        dateExpiration: p.date_expiration,
        dateRecolte: p.date_recolte,
        description: p.description,
        photoUrl: p.photo_url,
        conditionsVente: p.conditions_vente,
      }));
      setPublications(mappedPublications);
    } catch (error: any) {
      if (error?.message !== NOT_AUTHENTICATED) {
        console.warn('[ProducteurContext] fetchPublications failed:', error?.message);
      }
    }
  };

  const createPublication = async (data: publicationsApi.CreatePublicationData) => {
    if (!data.produit?.trim()) throw new Error('Produit requis');
    if (!data.prix_unitaire || Number(data.prix_unitaire) <= 0) throw new Error('Prix unitaire invalide');
    try {
      const { publication } = await publicationsApi.createPublication(data);
      const newPublication: Publication = {
        id: publication.id,
        cycleId: publication.cycle_id,
        recolteId: publication.recolte_id,
        produit: publication.produit,
        culture: publication.culture,
        quantiteDisponible: publication.quantite_disponible,
        quantiteInitiale: publication.quantite_initiale,
        unite: publication.unite,
        prixUnitaire: publication.prix_unitaire,
        qualite: publication.qualite,
        localisation: publication.localisation,
        active: publication.active,
        statut: publication.statut,
        datePublication: publication.date_publication,
        dateExpiration: publication.date_expiration,
        dateRecolte: publication.date_recolte,
        description: publication.description,
        photoUrl: publication.photo_url,
        conditionsVente: publication.conditions_vente,
      };
      setPublications(prev => [newPublication, ...prev]);
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] createPublication failed:', error?.message);
      throw error;
    }
  };

  const updatePublication = async (id: string, data: publicationsApi.UpdatePublicationData) => {
    try {
      const { publication } = await publicationsApi.updatePublication(id, data);
      setPublications(prev => prev.map(p => p.id === id ? {
        id: publication.id,
        cycleId: publication.cycle_id,
        recolteId: publication.recolte_id,
        produit: publication.produit,
        culture: publication.culture,
        quantiteDisponible: publication.quantite_disponible,
        quantiteInitiale: publication.quantite_initiale,
        unite: publication.unite,
        prixUnitaire: publication.prix_unitaire,
        qualite: publication.qualite,
        localisation: publication.localisation,
        active: publication.active,
        statut: publication.statut,
        datePublication: publication.date_publication,
        dateExpiration: publication.date_expiration,
        dateRecolte: publication.date_recolte,
        description: publication.description,
        photoUrl: publication.photo_url,
        conditionsVente: publication.conditions_vente,
      } : p));
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] updatePublication failed:', error?.message);
      throw error;
    }
  };

  const deletePublication = async (id: string) => {
    try {
      await publicationsApi.deletePublication(id);
      setPublications(prev => prev.filter(p => p.id !== id));
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] deletePublication failed:', error?.message);
      throw error;
    }
  };

  const togglePublication = async (id: string) => {
    try {
      const { publication } = await publicationsApi.togglePublication(id);
      setPublications(prev => prev.map(p => p.id === id ? {
        ...p,
        active: publication.active,
        statut: publication.statut,
      } : p));
      await refreshStats();
    } catch (error: any) {
      console.warn('[ProducteurContext] togglePublication failed:', error?.message);
      throw error;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════

  const getStats = async (): Promise<ProducteurStats> => {
    try {
      setLoading(true);
      const cyclesActifs = cycles.filter(c => c.status === 'active').length;
      const recoltesVendues = recoltes.filter(r => r.statut === 'vendue').length;
      const revenusTotal = recoltes
        .filter(r => r.statut === 'vendue')
        .reduce((s, r) => s + (r.quantite || 0) * (r.prixUnitaire || 0), 0);
      const publicationsActives = publications.filter(p => p.statut === 'disponible' && p.active === true).length;

      const newStats: ProducteurStats = {
        recoltesTotales: recoltes.length,
        recoltesVendues,
        revenusTotal,
        commandesEnCours: 0,
        cyclesActifs,
        publicationsActives,
      };

      setStats(newStats);
      return newStats;
    } catch {
      return { recoltesTotales: 0, recoltesVendues: 0, revenusTotal: 0, commandesEnCours: 0, cyclesActifs: 0, publicationsActives: 0 };
    } finally {
      setLoading(false);
    }
  };


  const refreshStats = async () => {
    await getStats();
  };

  const fetchCommandesProducteurData = async () => {
    try {
      const data = await apiRequest<any>(API_URL, '/commandes?role=producteur', { method: 'GET' });
      if (data) {
        const items = data.data || (Array.isArray(data) ? data : []);
        setCommandes(items.map((c: any) => ({
          id: c.id,
          acheteurId: c.acheteur_id || c.acheteurId || '',
          acheteurNom: c.acheteur_nom || c.acheteurNom || 'Acheteur',
          produit: c.produit || c.product || '',
          quantite: Number(c.quantite || c.quantity || 0),
          prixUnitaire: Number(c.prix_unitaire || c.prixUnitaire || 0),
          total: Number(c.total || c.montant || 0),
          statut: (c.statut || c.status || 'en_attente') as CommandeProducteur['statut'],
          dateCommande: c.created_at || c.dateCommande || new Date().toISOString(),
          recolteId: c.recolte_id || c.recolteId || undefined,
          recolte_id: c.recolte_id || undefined,
        })));
      }
    } catch (e: any) {
      console.warn('[ProducteurContext] fetchCommandesProducteurData failed:', e?.message);
    }
  };

  const refreshAllData = async () => {
    await Promise.allSettled([
      fetchCycles(),
      fetchRecoltes(),
      fetchPublications(),
    ]);
    await fetchCommandesProducteurData();
    await getStats();
  };

  // Chargement initial + re-fetch quand user change
  const { user: appUser } = useApp();
  useEffect(() => {
    if (!appUser?.id) return;
    const rolesProducteur = ['producteur', 'cooperateur'];
    if (!rolesProducteur.includes(appUser.role as string)) return;
    refreshAllData();
  }, [appUser?.id, appUser?.role]);

  const value: ProducteurContextType = {
    stats,
    loading,
    cycles,
    recoltes,
    commandes,
    alertes,
    publications,
    getStats,
    refreshStats,
    refreshAllData,
    
    // Cycles
    fetchCycles,
    createCycle,
    updateCycle,
    deleteCycle,
    completeCycle,
    
    // Récoltes
    fetchRecoltes,
    createRecolte,
    updateRecolte,
    deleteRecolte,
    
    // Publications
    fetchPublications,
    createPublication,
    updatePublication,
    deletePublication,
    togglePublication,
  };

  return <ProducteurContext.Provider value={value}>{children}</ProducteurContext.Provider>;
}

export function useProducteur() {
  const context = useContext(ProducteurContext);
  if (!context) {
    throw new Error('useProducteur must be used within ProducteurProvider');
  }
  return context;
}