import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InstitutionPermissions } from './BackOfficeContext';
import { API_URL } from '../utils/api';
import { apiRequest } from '../../imports/api-client';

export interface Institution {
  id: string;
  nom: string;
  type: string;
  modules: string[];
  permissions?: InstitutionPermissions; // ✅ Ajout des permissions granulaires
  statut: string;
}

export interface KPINational {
  totalActeurs: number;
  acteursActifs: number;
  volumeTransactions: number;
  tauxCroissance: number;
  tauxInclusion: number;
}

export interface StatRole {
  role: string;
  total: number;
  actifs: number;
  nouveauxMois: number;
  pourcentage: number;
}

export interface TopProduit {
  nom: string;
  volume: number;
  valeur: number;
  tendance: 'hausse' | 'baisse' | 'stable';
}

export interface AlerteInstitution {
  id: string;
  type: 'anomalie' | 'seuil' | 'securite' | 'performance';
  titre: string;
  message: string;
  urgence: 'info' | 'warning' | 'critical';
  date: string;
  lue: boolean;
}

export interface DonneesGraphique {
  label: string;
  transactions: number;
  acteurs: number;
}

export interface HistoriqueEntry {
  id: string;
  action: string;
  acteur: string;
  role: string;
  date: string;
  details?: string;
}

// ── Configuration Dashboard Institution ──────────────────────────────────────
export interface DashboardConfig {
  kpis: {
    acteursActifs: boolean;
    totalActeurs: boolean;
    acteursSuspendus: boolean;
    volumeTransactions: boolean;
    valeurMonetaire: boolean;
    digitalisation: boolean;
    inclusionCNPS: boolean;
    inclusionCNAM: boolean;
    croissanceMensuelle: boolean;
  };
  resumeJour: {
    nouveauxInscrits: boolean;
    dossiersValides: boolean;
    dossiersRejetes: boolean;
    transactionsDuJour: boolean;
    alertesActives: boolean;
  };
  graphiques: {
    evolutionTransactions: boolean;
    repartitionType: boolean;
    activiteRegion: boolean;
    courbeAdoption: boolean;
  };
  alertes: {
    afficherBanniere: boolean;
    afficherDetail: boolean;
  };
}

interface InstitutionContextType {
  institution: Institution | null;
  setInstitution: (institution: Institution | null) => void;

  // KPI & Analytics
  getKPINationaux: () => Promise<KPINational>;
  getStatistiquesParRole: () => Promise<StatRole[]>;
  getTopProduits: (limit?: number) => Promise<TopProduit[]>;
  getDonneesGraphique: (jours: number) => Promise<DonneesGraphique[]>;
  getAlertes: () => Promise<AlerteInstitution[]>;
  getHistoriqueComplet: () => Promise<HistoriqueEntry[]>;

  // Configuration Dashboard
  dashboardConfig: DashboardConfig | null;
  getDashboardConfig: () => Promise<DashboardConfig>;
  updateDashboardConfig: (config: DashboardConfig) => Promise<void>;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);

  const getKPINationaux = async (): Promise<KPINational> => {
    try {
      const data = await apiRequest<any>(API_URL, '/admin/analytics', { method: 'GET' });
      return {
        totalActeurs: data.total_users || 0,
        acteursActifs: data.validated_users || 0,
        volumeTransactions: 0,
        tauxCroissance: 0,
        tauxInclusion: data.conversion_rate || 0,
      };
    } catch { return { totalActeurs: 0, acteursActifs: 0, volumeTransactions: 0, tauxCroissance: 0, tauxInclusion: 0 }; }
  };

  const getStatistiquesParRole = async (): Promise<StatRole[]> => {
    try {
      const data = await apiRequest<any>(API_URL, '/admin/analytics/roles', { method: 'GET' });
      return data.roles || [];
    } catch { return []; }
  };

  const getTopProduits = async (limit: number = 5): Promise<TopProduit[]> => {
    try {
      const data = await apiRequest<any>(API_URL, `/admin/analytics/produits?limit=${limit}`, { method: 'GET' });
      return data.produits || [];
    } catch { return []; }
  };

  const getDonneesGraphique = async (jours: number): Promise<DonneesGraphique[]> => {
    try {
      const data = await apiRequest<any>(API_URL, `/admin/analytics/graphique?jours=${jours}`, { method: 'GET' });
      return data.graphique || [];
    } catch { return []; }
  };

  const getAlertes = async (): Promise<AlerteInstitution[]> => {
    try {
      const data = await apiRequest<any>(API_URL, '/admin/analytics/alertes', { method: 'GET' });
      return data.alertes || [];
    } catch { return []; }
  };

  const getHistoriqueComplet = async (): Promise<HistoriqueEntry[]> => {
    try {
      const data = await apiRequest<any>(API_URL, '/audit', { method: 'GET' });
      return data.logs || [];
    } catch { return []; }
  };

  const getDashboardConfig = async (): Promise<DashboardConfig> => {
    try {
      const data = await apiRequest<any>(API_URL, '/admin/config', { method: 'GET' });
      setDashboardConfig(data);
      return data;
    } catch {
      const config: DashboardConfig = { kpis: { acteursActifs: true, totalActeurs: true, acteursSuspendus: true, volumeTransactions: true, valeurMonetaire: true, digitalisation: true, inclusionCNPS: true, inclusionCNAM: true, croissanceMensuelle: true }, resumeJour: { nouveauxInscrits: true, dossiersValides: true, dossiersRejetes: true, transactionsDuJour: true, alertesActives: true }, graphiques: { evolutionTransactions: true, repartitionType: true, activiteRegion: true, courbeAdoption: true }, alertes: { afficherBanniere: true, afficherDetail: true } };
      setDashboardConfig(config);
      return config;
    }
  };

  const updateDashboardConfig = async (config: DashboardConfig): Promise<void> => {
    try {
      await apiRequest(API_URL, '/admin/config', { method: 'PATCH', body: JSON.stringify(config) });
      setDashboardConfig(config);
    } catch { setDashboardConfig(config); }
  };

  const value: InstitutionContextType = {
    institution,
    setInstitution,
    getKPINationaux,
    getStatistiquesParRole,
    getTopProduits,
    getDonneesGraphique,
    getAlertes,
    getHistoriqueComplet,

    // Configuration Dashboard
    dashboardConfig,
    getDashboardConfig,
    updateDashboardConfig,
  };

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const context = useContext(InstitutionContext);
  if (!context) {
    throw new Error('useInstitution must be used within InstitutionProvider');
  }
  return context;
}