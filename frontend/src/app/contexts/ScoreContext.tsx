import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  ScoreJulaba, 
  ScoringCriteria, 
  BadgeLevel, 
  SCORING_WEIGHTS,
  getBadgeLevel 
} from '../types/julaba.types';
import * as scoresApi from '../../imports/scores-api';
import { DEV_MODE, devLog } from '../config/devMode';
import { NOT_AUTHENTICATED } from '../../imports/api-client';

interface ScoreContextType {
  scores: Map<string, ScoreJulaba>;
  
  // Calcul score
  calculerScore: (userId: string) => Promise<ScoreJulaba>;
  recalculerScore: (userId: string) => Promise<void>;
  
  // Getters
  getScoreByUser: (userId: string) => ScoreJulaba | undefined;
  getBadge: (userId: string) => BadgeLevel;
  
  // Impact scoring
  getVisibiliteMarketplace: (userId: string) => 'NORMALE' | 'AUGMENTEE' | 'PREMIUM';
  hasAccessCredit: (userId: string) => boolean;
  
  // Charger depuis Supabase
  loadScore: (userId: string) => Promise<void>;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] = useState<Map<string, ScoreJulaba>>(new Map());

  // Charger le score d'un utilisateur depuis Supabase
  const loadScore = async (userId: string) => {
    if (DEV_MODE) {
      devLog('ScoreContext', 'Mode dev - skip loadScore');
      return;
    }
    try {
      const { score } = await scoresApi.fetchScore(userId);
      const raw = score as Record<string, unknown>;
      const scoreTotal = Number(raw?.score_total ?? raw?.scoreTotal ?? 0);
      const scoreFiabilite = Number(raw?.score_fiabilite ?? raw?.scoreFiabilite ?? 0);
      const scoreQualite = Number(raw?.score_qualite ?? raw?.scoreQualite ?? 0);
      const scorePonctualite = Number(raw?.score_ponctualite ?? raw?.scorePonctualite ?? 0);
      const nbAvis = Number(raw?.nb_avis ?? raw?.nbAvis ?? 0);
      const joursActifsRaw = raw?.jours_actifs_30j ?? raw?.joursActifsDerniers30j;
      const joursActifs =
        typeof joursActifsRaw === 'number'
          ? joursActifsRaw
          : Math.round((scorePonctualite / 100) * 30);
      const volumeTotal = Number(raw?.volume_total ?? raw?.volumeTotal ?? 0);
      const updatedAt = String(raw?.updated_at ?? raw?.updatedAt ?? new Date().toISOString());

      // Convertir la réponse API en ScoreJulaba (contrat Score ou champs camelCase hérités)
      const scoreJulaba: ScoreJulaba = {
        userId: String(raw?.user_id ?? raw?.userId ?? userId),
        scoreTotal,
        niveau: getBadgeLevel(scoreTotal),

        criteres: {
          regularite: scorePonctualite || 0,
          documents: scoreQualite || 0,
          volume: scoreFiabilite || 0,
          feedback: scoreQualite || 0,
        },

        joursActifsDerniers30j: joursActifs,
        documentsValidesRatio: scoreQualite / 100,
        volumeDerniers30j: volumeTotal,
        volumeMoyenZone: 0,
        feedbackPositifsRatio: nbAvis > 0 ? scoreQualite / 100 : 0,

        visibiliteMarketplace:
          scoreTotal >= 90 ? 'PREMIUM' : scoreTotal >= 75 ? 'AUGMENTEE' : 'NORMALE',
        accessCredit: scoreTotal >= 70,

        evolutionScore: [],

        lastCalculatedAt: updatedAt,
      };
      
      setScores(new Map(scores.set(userId, scoreJulaba)));
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
    }
  };

  // Calculer le critère "Régularité" (35%)
  const calculerRegularite = (userId: string): number => {
    // FUTURE: GET /api/v1/scores/transactions
    return 75;
  };

  // Calculer le critère "Documents" (15%)
  const calculerDocuments = (userId: string): number => {
    // FUTURE: GET /api/v1/scores/documents
    return 80;
  };

  // Calculer le critère "Volume" (35%)
  const calculerVolume = (userId: string, region: string): number => {
    // FUTURE: GET /api/v1/scores/historique
    return 70;
  };

  // Calculer le critère "Feedback" (15%)
  const calculerFeedback = (userId: string): number => {
    // FUTURE: GET /api/v1/scores/avis
    return 85;
  };

  // Calculer le score total
  const calculerScore = async (userId: string): Promise<ScoreJulaba> => {
    // Calculer chaque critère
    const regularite = calculerRegularite(userId);
    const documents = calculerDocuments(userId);
    const volume = calculerVolume(userId, 'Abidjan');
    const feedback = calculerFeedback(userId);
    
    // Appliquer les poids
    const pointsRegularite = regularite * SCORING_WEIGHTS.REGULARITE;
    const pointsDocuments = documents * SCORING_WEIGHTS.DOCUMENTS;
    const pointsVolume = volume * SCORING_WEIGHTS.VOLUME;
    const pointsFeedback = feedback * SCORING_WEIGHTS.FEEDBACK;
    
    // Score total
    const scoreTotal = Math.round(pointsRegularite + pointsDocuments + pointsVolume + pointsFeedback);
    
    // Niveau badge
    const niveau = getBadgeLevel(scoreTotal);
    
    // Déterminer impact
    let visibiliteMarketplace: 'NORMALE' | 'AUGMENTEE' | 'PREMIUM' = 'NORMALE';
    if (scoreTotal >= 90) visibiliteMarketplace = 'PREMIUM';
    else if (scoreTotal >= 75) visibiliteMarketplace = 'AUGMENTEE';
    
    const accessCredit = scoreTotal >= 70;
    
    // Récupérer historique existant
    const existingScore = scores.get(userId);
    const evolutionScore = existingScore?.evolutionScore || [];
    
    // Ajouter point dans l'évolution
    evolutionScore.push({
      date: new Date().toISOString(),
      score: scoreTotal,
    });
    
    // Garder seulement les 30 derniers points
    if (evolutionScore.length > 30) {
      evolutionScore.shift();
    }
    
    // Construire l'objet score
    const scoreJulaba: ScoreJulaba = {
      userId,
      scoreTotal,
      niveau,
      
      criteres: {
        regularite,
        documents,
        volume,
        feedback,
      },
      
      joursActifsDerniers30j: Math.round((regularite / 100) * 30),
      documentsValidesRatio: documents / 100,
      volumeDerniers30j: 0,
      volumeMoyenZone: 0,
      feedbackPositifsRatio: feedback / 100,
      
      visibiliteMarketplace,
      accessCredit,
      
      evolutionScore,
      
      lastCalculatedAt: new Date().toISOString(),
    };
    
    // Sauvegarder localement
    setScores(new Map(scores.set(userId, scoreJulaba)));
    
    // Sauvegarder dans Supabase
    try {
      await scoresApi.updateScore(userId, {
        score_total: scoreTotal,
        score_fiabilite: volume,
        score_qualite: documents,
        score_ponctualite: regularite,
        nb_avis: 0,
      });
    } catch (error) {
    }
    
    return scoreJulaba;
  };

  // Recalculer score (appelé après chaque transaction)
  const recalculerScore = async (userId: string) => {
    await calculerScore(userId);
  };

  // Getters
  const getScoreByUser = (userId: string) => {
    return scores.get(userId);
  };

  const getBadge = (userId: string): BadgeLevel => {
    const score = scores.get(userId);
    return score?.niveau || 'BRONZE';
  };

  const getVisibiliteMarketplace = (userId: string) => {
    const score = scores.get(userId);
    return score?.visibiliteMarketplace || 'NORMALE';
  };

  const hasAccessCredit = (userId: string): boolean => {
    const score = scores.get(userId);
    return score?.accessCredit || false;
  };

  const value: ScoreContextType = {
    scores,
    calculerScore,
    recalculerScore,
    getScoreByUser,
    getBadge,
    getVisibiliteMarketplace,
    hasAccessCredit,
    loadScore,
  };

  return <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>;
}

export function useScore() {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error('useScore doit être utilisé dans un ScoreProvider');
  }
  return context;
}