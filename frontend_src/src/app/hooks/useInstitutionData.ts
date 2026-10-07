/**
 * Hook centralisé pour les données Institution
 * Sources : GET /api/v1/institution/{dashboard,acteurs,transactions}
 */
import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { apiRequest } from '../services/api/api-client';

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

/** Aucune route `/institution/*` ne fournit encore d'historique mensuel :
 *  la courbe reste vide et l'écran affiche « indisponible ». */
export type PointEvolution = { mois: string; transactions: number; valeur: number };
const EVOLUTION_INDISPONIBLE: PointEvolution[] = [];

const messageErreur = (e: unknown) =>
  e instanceof Error && e.message ? e.message : 'Données indisponibles pour le moment.';

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
  const [erreurActeurs, setErreurActeurs]     = useState<string | null>(null);
  const [erreurTransactions, setErreurTransactions] = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      // Trois lectures indépendantes : un module refusé (403) n'efface pas
      // les deux autres, et chacun dit sa propre erreur.
      const lireOuNoter = (route: string, noter: (m: string) => void) =>
        apiRequest<any>(API_URL, route, { method: 'GET' })
          .catch((e: unknown) => { noter(messageErreur(e)); return null; });
      try {
        const [dashboard, acteursRes, txRes] = await Promise.all([
          // 403 = compte non rattaché à une institution, ou périmètre incomplet :
          // le message du serveur le dit, on le montre au lieu de zéros.
          lireOuNoter('/institution/dashboard', setError),
          lireOuNoter('/institution/acteurs', setErreurActeurs),
          lireOuNoter('/institution/transactions', setErreurTransactions),
        ]);
        if (dashboard?.macroKPIs) setMacroKPIs(dashboard.macroKPIs);
        if (dashboard?.resumeJour) setResumeJour(dashboard.resumeJour);
        if (dashboard?.dataRepartition?.length) setDataRepartition(dashboard.dataRepartition);
        if (dashboard?.byRole?.length) setByRole(dashboard.byRole);
        if (Array.isArray(acteursRes?.data)) setActeurs(acteursRes.data);
        if (Array.isArray(txRes?.data)) setTransactions(txRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return {
    macroKPIs, resumeJour, loading, error, erreurActeurs, erreurTransactions,
    dataEvolution: EVOLUTION_INDISPONIBLE,
    dataRepartition,
    byRole,
    acteurs, transactions,
    dataRegions: [], alertes: [], alertesHigh: [],
  };
}
