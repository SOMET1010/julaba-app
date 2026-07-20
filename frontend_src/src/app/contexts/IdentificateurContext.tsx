import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApp } from './AppContext';
import * as identificationsApi from '../../imports/identifications-api';
import * as missionsApi from '../../imports/missions-api';
import { fetchMutations, createMutation, type Mutation as ApiMutation } from '../../imports/mutations-api';
import { NOT_AUTHENTICATED, apiRequest } from '../../imports/api-client';
import { API_URL } from '../utils/api';

export type DemandeMutationRow = ApiMutation & {
  zoneActuelle?: string;
  zoneDemandee?: string;
  dateDemande?: string;
  date?: string;
  commentaireInstitution?: string | null;
  dateTraitement?: string | null;
};

function mapMutationForUi(row: Record<string, unknown>): DemandeMutationRow {
  const createdAt = (row.created_at ?? row.createdAt) as string | undefined;
  const motif = (row.motif_decision ?? row.motifDecision) as string | null | undefined;
  const dateDecision = (row.date_decision ?? row.dateDecision) as string | null | undefined;

  return {
    id: String(row.id ?? ''),
    identificateur_id: String(row.identificateur_id ?? row.identificateurId ?? ''),
    identificateur_nom: (row.identificateur_nom ?? row.identificateurNom ?? null) as string | null,
    zone_actuelle_id: (row.zone_actuelle_id ?? row.zoneActuelleId ?? null) as string | null,
    zone_actuelle_nom: (row.zone_actuelle_nom ?? row.zoneActuelleNom ?? null) as string | null,
    zone_demandee_id: String(row.zone_demandee_id ?? row.zoneDemandeeId ?? ''),
    zone_demandee_nom: String(row.zone_demandee_nom ?? row.zoneDemandeeNom ?? ''),
    raison: String(row.raison ?? ''),
    statut: (row.statut ?? 'en_attente') as ApiMutation['statut'],
    decideur_id: (row.decideur_id ?? row.decideurId ?? null) as string | null,
    motif_decision: motif ?? null,
    date_decision: dateDecision ?? null,
    created_at: createdAt ?? '',
    updated_at: String(row.updated_at ?? row.updatedAt ?? ''),
    zoneActuelle: String(row.zone_actuelle_nom ?? row.zoneActuelleNom ?? row.zoneActuelle ?? ''),
    zoneDemandee: String(row.zone_demandee_nom ?? row.zoneDemandeeNom ?? row.zoneDemandee ?? ''),
    dateDemande: createdAt,
    date: createdAt,
    commentaireInstitution: motif ?? null,
    dateTraitement: dateDecision ?? null,
  };
}

export interface Identification {
  id: string;
  acteurId: string;
  typeActeur: 'marchand' | 'producteur' | 'cooperative' | 'institution';
  statut: 'brouillon' | 'soumis' | 'en_attente' | 'complement' | 'validee' | 'valide' | 'approuve' | 'rejetee' | 'rejete';
  documents?: any;
  zoneId?: string;
  commission?: number;
  commissionPayee: boolean;
  dateIdentification: string;
  acteurNom?: string;
  telephone?: string;
  activite?: string;
  commune?: string;
  identificateurId?: string;
}

export interface Mission {
  id: string;
  titre: string;
  description?: string;
  zoneId?: string;
  objectif?: number;
  progres: number;
  statut: 'en_cours' | 'terminee' | 'annulee';
  dateDebut?: string;
  dateFin?: string;
  recompense?: number;
}

interface IdentificateurContextType {
  identifications: any[];
  missions: any[];
  loading: boolean;
  stats: {
    total: number;
    enAttente: number;
    validees: number;
    rejetees: number;
    tauxValidation: number;
    /** Objectif mensuel affiché (ex. graphiques) ; 0 si aucune donnée */
    objectifMois: number;
    primeObjectif: number;
  };
  
  addIdentification: (data: Omit<Identification, 'id' | 'statut' | 'commissionPayee'>) => Promise<void>;
  updateMissionProgress: (id: string, progres: number) => Promise<void>;
  
  getIdentificationsByStatut: (statut: Identification['statut']) => any[];
  getMesIdentifications: () => any[];
  getStatsIdentificateur: (userId: string) => {
    total: number;
    enAttente: number;
    validees: number;
    rejetees: number;
    tauxValidation: number;
    commissionsTotal: number;
  };
  getTotalCommissions: () => number;
  getMissionsActives: () => any[];
  rechercherParNumero: (numero: string) => Identification | undefined;
  loadIdentifications: () => Promise<void>;
  peutConsulterActeur: (acteurId: string) => boolean;
  demanderMutation: (data: {
    identificateurId?: string;
    identificateurNom?: string;
    zoneActuelle?: string;
    zoneActuelleId?: string;
    zoneDemandee: string;
    zoneDemandeeId: string;
    raison: string;
  }) => Promise<void>;
  getMesDemandes: () => DemandeMutationRow[];
  
  refreshIdentifications: () => Promise<void>;
  refreshMissions: () => Promise<void>;
}

const IdentificateurContext = createContext<IdentificateurContextType | undefined>(undefined);

export function IdentificateurProvider({ children }: { children: ReactNode }) {
  const { user: appUser } = useApp();
  const [identifications, setIdentifications] = useState<Identification[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [demandes, setDemandes] = useState<DemandeMutationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadIdentifications = async () => {
    try {
      const { identifications: data = [] } = await identificationsApi.fetchIdentifications();
      
      const mapped = data.map((i: any) => ({
        id: i.id,
        acteurId: i.acteur_id || '',
        identificateurId: i.identificateur_id,
        typeActeur: i.type_acteur,
        statut: i.statut || 'soumis',
        documents: i.documents,
        zoneId: i.zone_id,
        commission: i.commission,
        commissionPayee: i.commission_payee,
        dateIdentification: i.date_identification,
        acteurNom: i.acteur_nom,
        commune: i.commune,
        telephone: '',
        photo: null,
        activite: '',
        marche: '',
      }));

      setIdentifications(mapped);

      // Enrichir avec les details acteur

      const toEnrich = mapped.filter((i: any) => i.acteurId && i.acteurId !== '');
      const enriched = await Promise.all(toEnrich.map(async (i: any) => {
        try {
          const d = await apiRequest<any>(API_URL, `/users/${i.acteurId}`, { method: 'GET' });
          return { ...i, telephone: d.phone || '', photo: d.photoUrl || null, activite: d.activity || '', marche: d.market || '', acteurNom: `${d.firstName || ''} ${d.lastName || ''}`.trim() || i.acteurNom };
        } catch { return i; }
      }));

      const enrichedMap: Record<string, any> = {};
      enriched.forEach((i: any) => { enrichedMap[i.id] = i; });
      setIdentifications(mapped.map((i: any) => enrichedMap[i.id] || i));

    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
    }
  };

  const loadMissions = async () => {
    try {
      const { missions: data } = await missionsApi.fetchMissions();
      
      setMissions(data.map((m: any) => ({
        id: m.id,
        titre: m.titre,
        description: m.description,
        zoneId: m.zone_id,
        objectif: m.objectif,
        progres: m.progres,
        statut: m.statut,
        dateDebut: m.date_debut,
        dateFin: m.date_fin,
        recompense: m.recompense,
      })));
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
    }
  };

  const loadMutations = async () => {
    try {
      const { mutations: data } = await fetchMutations();
      setDemandes(data.map((row) => mapMutationForUi(row as unknown as Record<string, unknown>)));
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
    }
  };

  useEffect(() => {
    let loaded = false;
    let inFlight = false;
    const abortController = new AbortController();

    const doLoad = async () => {
      if (inFlight) return;
      if (loaded) return;
      setIsLoading(true);
      inFlight = true;
      loaded = true;
      try {
        await Promise.all([
          loadIdentifications(),
          loadMissions(),
          loadMutations(),
        ]);
      } finally {
        inFlight = false;
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Tentative immédiate
    void doLoad();

    // Si le token n'était pas prêt, retry sur événement
    const handleReady = () => {
      loaded = false;
      void doLoad();
    };
    window.addEventListener('julaba:token-ready', handleReady);
    window.addEventListener('storage', handleReady);

    // Retry à 300ms, 800ms, 2000ms au cas où
    const t1 = setTimeout(() => { loaded = false; void doLoad(); }, 300);
    const t2 = setTimeout(() => { loaded = false; void doLoad(); }, 800);
    const t3 = setTimeout(() => { loaded = false; void doLoad(); }, 2000);

    // Polling toutes les 30s
    const pollingInterval = setInterval(() => {
      loadIdentifications();
    }, 30000);

    return () => {
      abortController.abort();
      window.removeEventListener('julaba:token-ready', handleReady);
      window.removeEventListener('storage', handleReady);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(pollingInterval);
    };
  }, []);

  const addIdentification = async (
    data: Omit<Identification, 'id' | 'statut' | 'commissionPayee'>
  ) => {
    try {
      await identificationsApi.createIdentification({
        acteur_id: data.acteurId,
        type_acteur: data.typeActeur,
        documents: data.documents,
        zone_id: data.zoneId,
        commission: data.commission,
        date_identification: data.dateIdentification,
      });
      await loadIdentifications();
    } catch (error) {
      throw error;
    }
  };

  const updateMissionProgress = async (id: string, progres: number) => {
    try {
      await missionsApi.updateMissionProgres(id, progres);
      await loadMissions();
    } catch (error) {
      throw error;
    }
  };

  const getIdentificationsByStatut = (statut: Identification['statut']) => {
    return identifications.filter(i => i.statut === statut);
  };

  const getMesIdentifications = () => {
    return identifications;
  };

  const getStatsIdentificateur = (userId: string) => {
    const mesIdentifications = identifications;
    const total = mesIdentifications.length;
    const brouillons = mesIdentifications.filter(i => i.statut === 'brouillon').length;
    const enAttente = mesIdentifications.filter(i => ['soumis', 'en_attente', 'complement'].includes(i.statut)).length;
    const validees = mesIdentifications.filter(i => ['validee', 'valide', 'approuve'].includes(i.statut)).length;
    const rejetees = mesIdentifications.filter(i => ['rejetee', 'rejete'].includes(i.statut)).length;
    const tauxValidation = total > 0 ? Math.round((validees / total) * 100) : 0;
    // Remuneration gelee: somme des commissions des identifications validees.
    const commissionsTotal = mesIdentifications
      .filter(i => ['validee', 'valide', 'approuve'].includes(i.statut))
      .reduce((sum, i) => sum + (i.commission || 0), 0);
    return { total, totalIdentifications: total, brouillons, enAttente, validees, identificationsValidees: validees, rejetees, tauxValidation, commissionsTotal, identificationsEnCours: enAttente };
  };

  const getTotalCommissions = () => {
    // Remuneration gelee: somme des commissions des identifications validees.
    return identifications
      .filter(i => ['validee', 'valide', 'approuve'].includes(i.statut))
      .reduce((sum, i) => sum + (i.commission || 0), 0);
  };

  const getMissionsActives = () => {
    return missions.filter(m => m.statut === 'en_cours');
  };

  const rechercherParNumero = (numero: string) => {
    const numeroNormalise = numero.replace(/\D/g, '');
    if (!numeroNormalise) return undefined;
    return identifications.find(i =>
      i.telephone?.replace(/\D/g, '') === numeroNormalise
    );
  };

  const peutConsulterActeur = (acteurId: string) => {
    return identifications.some(i => i.acteurId === acteurId);
  };

  const demanderMutation = async (data: {
    identificateurId?: string;
    identificateurNom?: string;
    zoneActuelle?: string;
    zoneActuelleId?: string;
    zoneDemandee: string;
    zoneDemandeeId: string;
    raison: string;
  }) => {
    const { mutation } = await createMutation({
      zoneActuelleId: data.zoneActuelleId,
      zoneActuelle: data.zoneActuelle,
      zoneDemandeeId: data.zoneDemandeeId,
      zoneDemandee: data.zoneDemandee,
      raison: data.raison,
    });
    setDemandes((prev) => [
      mapMutationForUi(mutation as unknown as Record<string, unknown>),
      ...prev,
    ]);
  };

  const getMesDemandes = () => {
    return demandes;
  };

  const computedStats = {
    total: identifications.length,
    enAttente: identifications.filter(i => ['soumis', 'en_attente', 'complement'].includes(i.statut)).length,
    validees: identifications.filter(i => ['validee', 'valide', 'approuve'].includes(i.statut)).length,
    rejetees: identifications.filter(i => ['rejetee', 'rejete'].includes(i.statut)).length,
    tauxValidation: identifications.length > 0 ? Math.round((identifications.filter(i => ['validee', 'valide', 'approuve'].includes(i.statut)).length / identifications.length) * 100) : 0,
    objectifMois: appUser?.objectifMensuel ?? 0,
    primeObjectif: appUser?.primeObjectif ?? 0,
  };

  const refreshIdentifications = async () => {
    await loadIdentifications();
  };

  const refreshMissions = async () => {
    await loadMissions();
  };

  const value: IdentificateurContextType = {
    identifications,
    missions,
    loading,
    stats: computedStats,
    addIdentification,
    updateMissionProgress,
    getIdentificationsByStatut,
    getMesIdentifications,
    getStatsIdentificateur,
    getTotalCommissions,
    getMissionsActives,
    rechercherParNumero,
    loadIdentifications,
    peutConsulterActeur,
    demanderMutation,
    getMesDemandes,
    refreshIdentifications,
    refreshMissions,
  };

  return <IdentificateurContext.Provider value={value}>{children}</IdentificateurContext.Provider>;
}

export function useIdentificateur() {
  const context = useContext(IdentificateurContext);
  if (!context) {
    throw new Error('useIdentificateur must be used within IdentificateurProvider');
  }
  return context;
}