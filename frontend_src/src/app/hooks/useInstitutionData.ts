/**
 * Hook centralisé pour les données Institution
 * Source unique : GET /api/v1/institution/dashboard
 */
import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { apiRequest } from '../services/api/api-client';
import { enAttente, indisponible, type EtatLecture } from '../services/etatLectureBO';
import { lectureDashboardInstitution, type DashboardInstitution } from '../services/accueilInstitution';

export const DEFAULT_MACRO_KPIs = {
  acteursActifs: 0, totalActeurs: 0, acteursSuspendus: 0,
  volumeTransactions: 0, valeurMonetaire: 0, valeurMonetaireFormatted: 0,
  pctDigitalisation: 0, pctInclusionCNPS: 0, pctInclusionCNAM: 0,
  croissanceMensuelle: 0, tauxActivite: 0, nouveauxCeMois: 0, valeurMoyenne: 0,
};

export const DEFAULT_RESUME_JOUR = {
  nouveauxInscrits: 0, dossiersValides: 0, dossiersRejetes: 0,
  transactionsDuJour: 0, alertesCritiquesActives: 0,
};

export const DATA_REPARTITION_DEFAULT = [
  { name: 'Marchands',       value: 0, color: '#C66A2C' },
  { name: 'Producteurs',     value: 0, color: '#2E8B57' },
  { name: 'Coopératives',    value: 0, color: '#2072AF' },
  { name: 'Identificateurs', value: 0, color: '#9F8170' },
];

export function useInstitutionData() {
  const [macroKPIs, setMacroKPIs]             = useState(DEFAULT_MACRO_KPIs);
  const [resumeJour, setResumeJour]           = useState(DEFAULT_RESUME_JOUR);
  const [dataRepartition, setDataRepartition] = useState(DATA_REPARTITION_DEFAULT);
  const [byRole, setByRole]                   = useState<any[]>([]);
  const [acteurs, setActeurs]                 = useState<any[]>([]);
  const [transactions, setTransactions]       = useState<any[]>([]);
  const [error, setError]                     = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);
  // Ce que l'accueil a le droit d'affirmer : sans réponse lue, pas de chiffre.
  const [lectureDashboard, setLectureDashboard] = useState<EtatLecture<DashboardInstitution>>(enAttente());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashboard, acteursRes, txRes] = await Promise.all([
          apiRequest<any>(API_URL, '/institution/dashboard', { method: 'GET' }),
          apiRequest<any>(API_URL, '/institution/acteurs', { method: 'GET' }).catch(() => ({ data: [] })),
          apiRequest<any>(API_URL, '/institution/transactions', { method: 'GET' }).catch(() => ({ data: [] })),
        ]);

        setLectureDashboard(lectureDashboardInstitution(dashboard));
        if (dashboard.macroKPIs) setMacroKPIs(dashboard.macroKPIs);
        if (dashboard.resumeJour) setResumeJour(dashboard.resumeJour);
        if (dashboard.dataRepartition?.length) setDataRepartition(dashboard.dataRepartition);
        if (dashboard.byRole?.length) setByRole(dashboard.byRole);
        if (Array.isArray(acteursRes?.data)) setActeurs(acteursRes.data);
        if (Array.isArray(txRes?.data)) setTransactions(txRes.data);
      } catch (e) {
        setLectureDashboard(indisponible(e));
        setError('Impossible de charger les données institution');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return {
    macroKPIs, resumeJour, loading, error, lectureDashboard,
    dataRepartition,
    byRole,
    acteurs, transactions,
    dataRegions: [], alertes: [], alertesHigh: [],
  };
}
