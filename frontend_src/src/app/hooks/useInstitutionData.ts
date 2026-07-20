/**
 * Hook centralisé pour les données Institution
 * Source unique : GET /api/v1/institution/dashboard
 */
import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { apiRequest } from '../../imports/api-client';

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

export const DATA_EVOLUTION = [
  { mois: 'Sep', transactions: 5200, valeur: 2.1 },
  { mois: 'Oct', transactions: 6100, valeur: 2.6 },
  { mois: 'Nov', transactions: 7800, valeur: 3.2 },
  { mois: 'Dec', transactions: 6900, valeur: 2.9 },
  { mois: 'Jan', transactions: 8400, valeur: 3.8 },
  { mois: 'Fev', transactions: 9100, valeur: 4.3 },
  { mois: 'Mar', transactions: 9287, valeur: 4.86 },
];

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

        if (dashboard.macroKPIs) setMacroKPIs(dashboard.macroKPIs);
        if (dashboard.resumeJour) setResumeJour(dashboard.resumeJour);
        if (dashboard.dataRepartition?.length) setDataRepartition(dashboard.dataRepartition);
        if (dashboard.byRole?.length) setByRole(dashboard.byRole);
        if (Array.isArray(acteursRes?.data)) setActeurs(acteursRes.data);
        if (Array.isArray(txRes?.data)) setTransactions(txRes.data);
      } catch {
        setError('Impossible de charger les données institution');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return {
    macroKPIs, resumeJour, loading, error,
    dataEvolution: DATA_EVOLUTION,
    dataRepartition,
    byRole,
    acteurs, transactions,
    dataRegions: [], alertes: [], alertesHigh: [],
  };
}
