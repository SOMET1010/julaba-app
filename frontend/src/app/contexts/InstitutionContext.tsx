import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InstitutionPermissions } from './BackOfficeContext';
import { API_URL } from '../utils/api';
import { apiRequest } from '../services/api/api-client';

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

interface InstitutionContextType {
  institution: Institution | null;
  setInstitution: (institution: Institution | null) => void;

  // KPI & Analytics
  getKPINationaux: () => Promise<KPINational>;
  getStatistiquesParRole: () => Promise<StatRole[]>;
  getTopProduits: (limit?: number) => Promise<TopProduit[]>;
  getDonneesGraphique: (jours: number) => Promise<DonneesGraphique[]>;
  getInscriptionsParJour: () => Promise<Array<{ jour: string; inscriptions: number }>>;
  getAlertes: () => Promise<AlerteInstitution[]>;
  getHistoriqueComplet: () => Promise<HistoriqueEntry[]>;

}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [institution, setInstitution] = useState<Institution | null>(null);

  const getKPINationaux = async (): Promise<KPINational> => {
    // DGE-03 — l'espace institution lit SES routes scopées (/institution/*),
    // plus les routes /admin/* inexistantes ou interdites qui rendaient des
    // zéros silencieux.
    try {
      const data = await apiRequest<any>(API_URL, '/institution/dashboard', { method: 'GET' });
      return {
        totalActeurs: data?.macroKPIs?.totalActeurs ?? 0,
        acteursActifs: data?.macroKPIs?.acteursActifs ?? 0,
        volumeTransactions: data?.macroKPIs?.volumeTransactions ?? 0,
        tauxCroissance: data?.macroKPIs?.croissanceMensuelle ?? 0,
        tauxInclusion: data?.macroKPIs?.pctInclusionCNPS ?? 0,
      };
    } catch {
      return { totalActeurs: 0, acteursActifs: 0, volumeTransactions: 0, tauxCroissance: 0, tauxInclusion: 0 };
    }
  };

  // DGE-03 — UNE route pour les 4 séries : GET /institution/analytics (scopé
  // périmètre, données réelles). Les 4 anciennes URLs /admin/analytics/* ou
  // 404 ou 403.
  let cacheAnalytics: { at: number; data: any } | null = null;
  const getInstitutionAnalytics = async (): Promise<any> => {
    if (cacheAnalytics && Date.now() - cacheAnalytics.at < 30_000) return cacheAnalytics.data;
    const data = await apiRequest<any>(API_URL, '/institution/analytics', { method: 'GET' });
    cacheAnalytics = { at: Date.now(), data };
    return data;
  };

  const getStatistiquesParRole = async (): Promise<StatRole[]> => {
    try {
      const data = await getInstitutionAnalytics();
      const total = (data?.roles || []).reduce((s: number, r: any) => s + Number(r.count || 0), 0);
      return (data?.roles || []).map((r: any) => ({
        role: r.role,
        total: Number(r.count) || 0,
        actifs: Number(r.actifs) || 0,
        nouveauxMois: Number(r.nouveauxCeMois) || 0,
        pourcentage: total > 0 ? Math.round((Number(r.count || 0) / total) * 100) : 0,
      }));
    } catch { return []; }
  };

  const getTopProduits = async (limit: number = 5): Promise<TopProduit[]> => {
    try {
      const data = await getInstitutionAnalytics();
      // tendance : non calculé côté serveur (il faudrait comparer deux
      // périodes) — 'stable' assumé, jamais une hausse inventée.
      return (data?.produits || []).slice(0, limit).map((p: any) => ({
        nom: p.nom,
        volume: Number(p.commandes) || 0,
        valeur: Number(p.volume) || 0,
        tendance: 'stable' as const,
      }));
    } catch { return []; }
  };

  const getDonneesGraphique = async (jours: number = 7): Promise<DonneesGraphique[]> => {
    try {
      const data = await getInstitutionAnalytics();
      const series: any[] = data?.graphique || [];
      const borne = Math.max(1, Math.min(30, jours));
      // Le serveur fournit 7 jours ; le client coupe selon la demande.
      return series.slice(-borne).map((g: any) => ({
        label: String(g.jour || ''),
        transactions: Number(g.transactions) || 0,
        acteurs: 0, // non calculé par série temporelle côté serveur
      }));
    } catch { return []; }
  };

  const getInscriptionsParJour = async (): Promise<Array<{ jour: string; inscriptions: number }>> => {
    try {
      const data = await getInstitutionAnalytics();
      return (data?.inscriptionsParJour || []).map((i: any) => ({
        jour: String(i.jour || ''),
        inscriptions: Number(i.inscriptions) || 0,
      }));
    } catch { return []; }
  };

  const getAlertes = async (): Promise<AlerteInstitution[]> => {
    try {
      const data = await getInstitutionAnalytics();
      return (data?.alertes || []).map((a: any, i: number) => ({
        id: `alerte-${i}-${a.message}`,
        type: 'seuil' as const,
        titre: 'Périmètre',
        message: String(a.message || ''),
        urgence: 'info' as const,
        date: new Date().toISOString(),
        lue: false,
      }));
    } catch { return []; }
  };

  const getHistoriqueComplet = async (): Promise<HistoriqueEntry[]> => {
    try {
      const data = await apiRequest<any>(API_URL, '/audit', { method: 'GET' });
      return data.logs || [];
    } catch { return []; }
  };

  const value: InstitutionContextType = {
    institution,
    setInstitution,
    getKPINationaux,
    getStatistiquesParRole,
    getTopProduits,
    getDonneesGraphique,
    getInscriptionsParJour,
    getAlertes,
    getHistoriqueComplet,
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