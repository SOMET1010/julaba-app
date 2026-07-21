/**
 * 📊 HOOK USE SCORE JULABA
 * 
 * Hook universel pour gérer la logique du Score JULABA
 * Calcul, niveaux, actions recommandées, et bénéfices
 */

import { useState, useEffect } from 'react';
import { RoleType } from '../config/roleConfig';

export interface ScoreBenefit {
  icon: string;
  label: string;
  unlocked: boolean;
}

export interface ScoreLevel {
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  benefits: string[];
}

export interface ScoreAction {
  id: string;
  label: string;
  description: string;
  points: number;
  completed: boolean;
  route?: string;
  onClick?: () => void;
}

export interface ScoreData {
  current: number;
  max: number;
  percentage: number;
  level: ScoreLevel;
  nextLevel?: ScoreLevel;
  pointsToNextLevel: number;
  benefits: ScoreBenefit[];
  actions: ScoreAction[];
}

// Niveaux du Score JULABA
export const SCORE_LEVELS: ScoreLevel[] = [
  {
    name: 'Débutant',
    minScore: 0,
    maxScore: 39,
    color: '#9CA3AF',
    benefits: [
      'Accès à la plateforme JULABA',
      'Formations de base',
      'Support Tata Nanti Lou',
    ],
  },
  {
    name: 'Actif',
    minScore: 40,
    maxScore: 69,
    color: '#F59E0B',
    benefits: [
      'Microcrédits jusqu\'à 100 000 FCFA',
      'Formations avancées',
      'Tarifs préférentiels marchés',
    ],
  },
  {
    name: 'Expert',
    minScore: 70,
    maxScore: 89,
    color: '#2E8B57',
    benefits: [
      'Microcrédits jusqu\'à 250 000 FCFA',
      'Formations Expert débloquées',
      'Accès prioritaire nouveaux marchés',
      'Badge Expert visible',
    ],
  },
  {
    name: 'Leader',
    minScore: 90,
    maxScore: 100,
    color: '#7C3AED',
    benefits: [
      'Microcrédits jusqu\'à 500 000 FCFA',
      'Formations Leadership',
      'Mentor certifié JULABA',
      'Participation aux décisions plateforme',
    ],
  },
];

/**
 * Détermine le niveau actuel basé sur le score
 */
export function getCurrentLevel(score: number): ScoreLevel {
  return SCORE_LEVELS.find(
    (level) => score >= level.minScore && score <= level.maxScore
  ) || SCORE_LEVELS[0];
}

/**
 * Détermine le prochain niveau
 */
export function getNextLevel(score: number): ScoreLevel | undefined {
  const currentLevel = getCurrentLevel(score);
  const currentIndex = SCORE_LEVELS.indexOf(currentLevel);
  return SCORE_LEVELS[currentIndex + 1];
}

/**
 * Calcule les points nécessaires pour le prochain niveau
 */
export function getPointsToNextLevel(score: number): number {
  const nextLevel = getNextLevel(score);
  if (!nextLevel) return 0;
  return nextLevel.minScore - score;
}

/**
 * Génère les actions recommandées selon le rôle
 */
export function getRecommendedActions(
  role: RoleType,
  currentScore: number,
  completedActions: string[]
): ScoreAction[] {
  // 🎯 LISTE COMPLÈTE D'ACTIONS PAR RÔLE (élargie et dynamique)
  const allActions: Record<RoleType, ScoreAction[]> = {
    marchand: [
      // Actions quotidiennes récurrentes (toujours disponibles)
      {
        id: 'daily_sales',
        label: 'Enregistre tes ventes',
        description: 'Note toutes tes ventes quotidiennes',
        points: 5,
        completed: false, // Toujours proposé (récurrent)
        route: '/marchand/vendre',
      },
      {
        id: 'daily_opening',
        label: 'Ouvre ta journée',
        description: 'Démarre ton activité quotidienne',
        points: 3,
        completed: false, // Toujours proposé (récurrent)
        route: '/marchand',
      },
      {
        id: 'academy_training',
        label: 'Formation Jùlaba Academy',
        description: 'Complète la formation du jour',
        points: 20,
        completed: false, // Toujours proposé (récurrent)
        route: '/marchand/academy',
      },
      
      // Actions ponctuelles (à faire une fois)
      {
        id: 'complete_profile',
        label: 'Complète ton profil',
        description: 'Atteins 100% de profil complété',
        points: 15,
        completed: completedActions.includes('complete_profile'),
        route: '/marchand/profil',
      },
      {
        id: 'add_products',
        label: 'Ajoute 5 produits minimum',
        description: 'Renseigne ton stock de produits',
        points: 10,
        completed: completedActions.includes('add_products'),
        route: '/marchand/stock',
      },
      {
        id: 'add_photos',
        label: 'Ajoute des photos produits',
        description: 'Illustre ton catalogue',
        points: 8,
        completed: completedActions.includes('add_photos'),
        route: '/marchand/stock',
      },
      {
        id: 'first_sale',
        label: 'Enregistre ta première vente',
        description: 'Démarre ton historique',
        points: 10,
        completed: completedActions.includes('first_sale'),
        route: '/marchand/vendre',
      },
      {
        id: 'enable_voice',
        label: 'Active Tata Nanti Lou',
        description: 'Utilise l\'assistant vocal',
        points: 5,
        completed: completedActions.includes('enable_voice'),
        route: '/marchand/profil',
      },
      {
        id: 'set_prices',
        label: 'Définis tes prix',
        description: 'Configure ton tarif pour 5 produits',
        points: 7,
        completed: completedActions.includes('set_prices'),
        route: '/marchand/stock',
      },
      {
        id: 'complete_10_sales',
        label: 'Enregistre 10 ventes',
        description: 'Atteins 10 transactions',
        points: 15,
        completed: completedActions.includes('complete_10_sales'),
        route: '/marchand/vendre',
      },
      {
        id: 'add_supplier',
        label: 'Ajoute un fournisseur',
        description: 'Référence tes sources d\'approvisionnement',
        points: 8,
        completed: completedActions.includes('add_supplier'),
        route: '/marchand/stock',
      },
    ],
    producteur: [
      // Actions quotidiennes récurrentes
      {
        id: 'daily_harvest',
        label: 'Déclare tes récoltes',
        description: 'Enregistre tes récoltes quotidiennes',
        points: 5,
        completed: false,
        route: '/producteur/production',
      },
      {
        id: 'daily_opening',
        label: 'Ouvre ta journée',
        description: 'Démarre ton activité quotidienne',
        points: 3,
        completed: false,
        route: '/producteur',
      },
      {
        id: 'academy_training',
        label: 'Formation Jùlaba Academy',
        description: 'Complète la formation du jour',
        points: 20,
        completed: false,
        route: '/producteur/academy',
      },
      
      // Actions ponctuelles
      {
        id: 'complete_profile',
        label: 'Complète ton profil',
        description: 'Atteins 100% de profil complété',
        points: 15,
        completed: completedActions.includes('complete_profile'),
        route: '/producteur/profil',
      },
      {
        id: 'add_crops',
        label: 'Crée 3 cycles agricoles',
        description: 'Démarre tes cultures',
        points: 10,
        completed: completedActions.includes('add_crops'),
        route: '/producteur/production',
      },
      {
        id: 'add_field_photos',
        label: 'Ajoute des photos de parcelles',
        description: 'Documente tes terres',
        points: 8,
        completed: completedActions.includes('add_field_photos'),
        route: '/producteur/production',
      },
      {
        id: 'first_harvest',
        label: 'Enregistre ta première récolte',
        description: 'Démarre ton historique',
        points: 10,
        completed: completedActions.includes('first_harvest'),
        route: '/producteur/production',
      },
      {
        id: 'enable_voice',
        label: 'Active Tata Nanti Lou',
        description: 'Utilise l\'assistant vocal',
        points: 5,
        completed: completedActions.includes('enable_voice'),
        route: '/producteur/profil',
      },
      {
        id: 'add_cooperative',
        label: 'Rejoins une coopérative',
        description: 'Connecte-toi à une structure',
        points: 12,
        completed: completedActions.includes('add_cooperative'),
        route: '/producteur/profil',
      },
      {
        id: 'track_expenses',
        label: 'Enregistre tes cahier',
        description: 'Suis tes coûts de production',
        points: 8,
        completed: completedActions.includes('track_expenses'),
        route: '/producteur/production',
      },
    ],
    cooperative: [
      // Actions quotidiennes récurrentes
      {
        id: 'daily_collections',
        label: 'Enregistre tes collectes',
        description: 'Note toutes les collectes quotidiennes',
        points: 5,
        completed: false,
        route: '/cooperative/achats',
      },
      {
        id: 'daily_opening',
        label: 'Ouvre ta journée',
        description: 'Démarre ton activité quotidienne',
        points: 3,
        completed: false,
        route: '/cooperative',
      },
      {
        id: 'academy_training',
        label: 'Formation Jùlaba Academy',
        description: 'Complète la formation du jour',
        points: 20,
        completed: false,
        route: '/cooperative/academy',
      },
      
      // Actions ponctuelles
      {
        id: 'complete_profile',
        label: 'Complète ton profil',
        description: 'Atteins 100% de profil complété',
        points: 15,
        completed: completedActions.includes('complete_profile'),
        route: '/cooperative/profil',
      },
      {
        id: 'add_members',
        label: 'Ajoute 10 membres minimum',
        description: 'Enregistre tes producteurs',
        points: 10,
        completed: completedActions.includes('add_members'),
        route: '/cooperative/membres',
      },
      {
        id: 'first_collection',
        label: 'Enregistre ta première collecte',
        description: 'Démarre ton activité',
        points: 10,
        completed: completedActions.includes('first_collection'),
        route: '/cooperative/achats',
      },
      {
        id: 'enable_voice',
        label: 'Active Tata Nanti Lou',
        description: 'Utilise l\'assistant vocal',
        points: 5,
        completed: completedActions.includes('enable_voice'),
        route: '/cooperative/profil',
      },
      {
        id: 'organize_training',
        label: 'Organise une formation',
        description: 'Forme tes membres',
        points: 15,
        completed: completedActions.includes('organize_training'),
        route: '/cooperative/academy',
      },
      {
        id: 'set_collection_points',
        label: 'Définis des points de collecte',
        description: 'Structure ton réseau',
        points: 8,
        completed: completedActions.includes('set_collection_points'),
        route: '/cooperative/profil',
      },
    ],
    cooperateur: [
      // Actions quotidiennes récurrentes
      {
        id: 'daily_collections',
        label: 'Enregistre tes collectes',
        description: 'Note toutes les collectes quotidiennes',
        points: 5,
        completed: false,
        route: '/cooperative/achats',
      },
      {
        id: 'daily_opening',
        label: 'Ouvre ta journée',
        description: 'Démarre ton activité quotidienne',
        points: 3,
        completed: false,
        route: '/cooperative',
      },
      {
        id: 'academy_training',
        label: 'Formation Jùlaba Academy',
        description: 'Complète la formation du jour',
        points: 20,
        completed: false,
        route: '/cooperative/academy',
      },

      // Actions ponctuelles
      {
        id: 'complete_profile',
        label: 'Complète ton profil',
        description: 'Atteins 100% de profil complété',
        points: 15,
        completed: completedActions.includes('complete_profile'),
        route: '/cooperative/profil',
      },
      {
        id: 'add_members',
        label: 'Ajoute 10 membres minimum',
        description: 'Enregistre tes producteurs',
        points: 10,
        completed: completedActions.includes('add_members'),
        route: '/cooperative/membres',
      },
      {
        id: 'first_collection',
        label: 'Enregistre ta première collecte',
        description: 'Démarre ton activité',
        points: 10,
        completed: completedActions.includes('first_collection'),
        route: '/cooperative/achats',
      },
      {
        id: 'enable_voice',
        label: 'Active Tata Nanti Lou',
        description: 'Utilise l\'assistant vocal',
        points: 5,
        completed: completedActions.includes('enable_voice'),
        route: '/cooperative/profil',
      },
      {
        id: 'organize_training',
        label: 'Organise une formation',
        description: 'Forme tes membres',
        points: 15,
        completed: completedActions.includes('organize_training'),
        route: '/cooperative/academy',
      },
      {
        id: 'set_collection_points',
        label: 'Définis des points de collecte',
        description: 'Structure ton réseau',
        points: 8,
        completed: completedActions.includes('set_collection_points'),
        route: '/cooperative/profil',
      },
    ],
    identificateur: [
      // Actions quotidiennes récurrentes
      {
        id: 'daily_identifications',
        label: 'Identifie des acteurs',
        description: 'Enregistre de nouveaux acteurs quotidiennement',
        points: 5,
        completed: false,
        route: '/identificateur/fiche-identification',
      },
      {
        id: 'daily_opening',
        label: 'Ouvre ta journée',
        description: 'Démarre ton activité quotidienne',
        points: 3,
        completed: false,
        route: '/identificateur',
      },
      {
        id: 'academy_training',
        label: 'Formation Jùlaba Academy',
        description: 'Complète la formation du jour',
        points: 20,
        completed: false,
        route: '/identificateur/academy',
      },
      
      // Actions ponctuelles
      {
        id: 'complete_profile',
        label: 'Complète ton profil',
        description: 'Atteins 100% de profil complété',
        points: 15,
        completed: completedActions.includes('complete_profile'),
        route: '/identificateur/profil',
      },
      {
        id: 'validate_dossiers',
        label: 'Valide 20 dossiers',
        description: 'Complète l\'identification',
        points: 10,
        completed: completedActions.includes('validate_dossiers'),
        route: '/identificateur/suivi',
      },
      {
        id: 'first_identification',
        label: 'Première identification',
        description: 'Enregistre ton premier acteur',
        points: 10,
        completed: completedActions.includes('first_identification'),
        route: '/identificateur/identification',
      },
      {
        id: 'enable_voice',
        label: 'Active Tata Nanti Lou',
        description: 'Utilise l\'assistant vocal',
        points: 5,
        completed: completedActions.includes('enable_voice'),
        route: '/identificateur/profil',
      },
      {
        id: 'add_zone',
        label: 'Définis ta zone d\'intervention',
        description: 'Configure ton territoire',
        points: 8,
        completed: completedActions.includes('add_zone'),
        route: '/identificateur/profil',
      },
    ],
    institution: [
      // Actions quotidiennes récurrentes
      {
        id: 'daily_monitoring',
        label: 'Consulte le dashboard',
        description: 'Supervise les activités quotidiennes',
        points: 5,
        completed: false,
        route: '/institution/analytics',
      },
      {
        id: 'daily_opening',
        label: 'Ouvre ta journée',
        description: 'Démarre ton activité quotidienne',
        points: 3,
        completed: false,
        route: '/institution',
      },
      {
        id: 'academy_training',
        label: 'Formation Jùlaba Academy',
        description: 'Complète la formation du jour',
        points: 20,
        completed: false,
        route: '/institution/academy',
      },
      
      // Actions ponctuelles
      {
        id: 'complete_profile',
        label: 'Complète ton profil',
        description: 'Atteins 100% de profil complété',
        points: 15,
        completed: completedActions.includes('complete_profile'),
        route: '/institution/profil',
      },
      {
        id: 'review_actors',
        label: 'Valide 50 acteurs',
        description: 'Approuve les nouveaux acteurs',
        points: 10,
        completed: completedActions.includes('review_actors'),
        route: '/institution/acteurs',
      },
      {
        id: 'export_reports',
        label: 'Exporte des rapports',
        description: 'Génère des analyses',
        points: 8,
        completed: completedActions.includes('export_reports'),
        route: '/institution/analytics',
      },
      {
        id: 'enable_voice',
        label: 'Active Tata Nanti Lou',
        description: 'Utilise l\'assistant vocal',
        points: 5,
        completed: completedActions.includes('enable_voice'),
        route: '/institution/profil',
      },
    ],
    administrateur: [
      // Actions quotidiennes récurrentes
      {
        id: 'daily_monitoring',
        label: 'Consulte le dashboard',
        description: 'Supervise les activités quotidiennes',
        points: 5,
        completed: false,
        route: '/institution/analytics',
      },
      {
        id: 'daily_opening',
        label: 'Ouvre ta journée',
        description: 'Démarre ton activité quotidienne',
        points: 3,
        completed: false,
        route: '/institution',
      },
      {
        id: 'academy_training',
        label: 'Formation Jùlaba Academy',
        description: 'Complète la formation du jour',
        points: 20,
        completed: false,
        route: '/institution/academy',
      },
      
      // Actions ponctuelles
      {
        id: 'complete_profile',
        label: 'Complète ton profil',
        description: 'Atteins 100% de profil complété',
        points: 15,
        completed: completedActions.includes('complete_profile'),
        route: '/institution/profil',
      },
      {
        id: 'review_actors',
        label: 'Valide 50 acteurs',
        description: 'Approuve les nouveaux acteurs',
        points: 10,
        completed: completedActions.includes('review_actors'),
        route: '/institution/acteurs',
      },
      {
        id: 'export_reports',
        label: 'Exporte des rapports',
        description: 'Génère des analyses',
        points: 8,
        completed: completedActions.includes('export_reports'),
        route: '/institution/analytics',
      },
      {
        id: 'enable_voice',
        label: 'Active Tata Nanti Lou',
        description: 'Utilise l\'assistant vocal',
        points: 5,
        completed: completedActions.includes('enable_voice'),
        route: '/institution/profil',
      },
    ],
  };

  const roleSpecific = allActions[role];
  if (!roleSpecific && import.meta.env.DEV) {
    console.warn(`[useScoreJULABA/getRecommendedActions] Rôle sans liste d'actions: "${role}", fallback marchand.`);
  }
  const roleActions = roleSpecific ?? allActions.marchand;

  // 🎯 LOGIQUE INTELLIGENTE DE SÉLECTION
  // 1. Séparer les actions récurrentes (toujours non complétées) et ponctuelles
  const recurringActions = roleActions.filter(a => !a.completed && 
    ['daily_sales', 'daily_harvest', 'daily_collections', 'daily_identifications', 'daily_monitoring', 'daily_opening', 'academy_training'].includes(a.id)
  );
  const oneTimeActions = roleActions.filter(a => 
    !['daily_sales', 'daily_harvest', 'daily_collections', 'daily_identifications', 'daily_monitoring', 'daily_opening', 'academy_training'].includes(a.id)
  );
  
  // 2. Prioriser les actions NON complétées
  const incompleteOneTimeActions = oneTimeActions.filter(a => !a.completed);
  const completedOneTimeActions = oneTimeActions.filter(a => a.completed);
  
  // 3. Construire la liste finale (max 3 actions)
  let finalActions: ScoreAction[] = [];
  
  // Stratégie : Mélange intelligent
  // - 1 action récurrente quotidienne (si disponible)
  // - 2 actions ponctuelles non complétées (si disponible)
  // - Si toutes ponctuelles complétées → afficher actions récurrentes
  
  if (incompleteOneTimeActions.length > 0) {
    // Il y a encore des actions ponctuelles à faire
    finalActions.push(...incompleteOneTimeActions.slice(0, 2));
    if (recurringActions.length > 0) {
      finalActions.push(recurringActions[0]); // Ajouter 1 action quotidienne
    }
  } else {
    // Toutes les actions ponctuelles sont complétées → proposer des actions récurrentes
    finalActions = recurringActions.slice(0, 3);
  }
  
  // 4. S'assurer qu'on a exactement 3 actions
  return finalActions.slice(0, 3);
}

/**
 * Hook principal useScoreJULABA
 */
export function useScoreJULABA(
  score: number = 85,
  role: RoleType = 'marchand'
): ScoreData {
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  const currentLevel = getCurrentLevel(score);
  const nextLevel = getNextLevel(score);
  const pointsToNextLevel = getPointsToNextLevel(score);
  const percentage = (score / 100) * 100;

  // Génère les bénéfices débloqués
  const benefits: ScoreBenefit[] = [
    {
      icon: 'Keiwa',
      label: `Microcrédits jusqu'à ${score >= 90 ? '500 000' : score >= 70 ? '250 000' : score >= 40 ? '100 000' : '0'} FCFA`,
      unlocked: score >= 40,
    },
    {
      icon: 'GraduationCap',
      label: `Formations ${currentLevel.name} débloquées`,
      unlocked: true,
    },
    {
      icon: 'Store',
      label: 'Tarifs préférentiels marchés',
      unlocked: score >= 40,
    },
    {
      icon: 'Award',
      label: `Badge ${currentLevel.name} visible`,
      unlocked: score >= 70,
    },
  ];

  // Génère les actions recommandées
  const actions = getRecommendedActions(role, score, completedActions);

  // Actions complétées gérées en mémoire (session)
  useEffect(() => {
    setCompletedActions([]);
  }, [role]);

  return {
    current: score,
    max: 100,
    percentage,
    level: currentLevel,
    nextLevel,
    pointsToNextLevel,
    benefits,
    actions,
  };
}

/**
 * Marque une action comme complétée
 */
export function completeAction(
  role: RoleType,
  actionId: string,
  onComplete?: () => void
) {
  // Actions suivies en mémoire uniquement (pas de persistance côté client)
  onComplete?.();
}