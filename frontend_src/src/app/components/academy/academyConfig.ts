// Configuration JÙLABA Academy

import { LevelConfig, UserRole } from './types';

// Configuration des niveaux (4 niveaux selon proposition utilisateur)
export const LEVEL_CONFIG: LevelConfig[] = [
  {
    level: 'debutant',
    minPoints: 0,
    maxPoints: 199,
    badge: 'Débutant',
    color: '#9CA3AF',
    benefits: ['Accès formations de base'],
  },
  {
    level: 'actif',
    minPoints: 200,
    maxPoints: 499,
    badge: 'Actif',
    color: '#3B82F6',
    benefits: ['Accès formations de base', 'Badge visible profil', 'Priorité mise en avant'],
  },
  {
    level: 'expert',
    minPoints: 500,
    maxPoints: 999,
    badge: 'Expert',
    color: '#8B5CF6',
    benefits: ['Tous les avantages Actif', 'Boost visibilité offre', 'Badge certifié'],
  },
  {
    level: 'leader',
    minPoints: 1000,
    maxPoints: Infinity,
    badge: 'Leader',
    color: '#F59E0B',
    benefits: [
      'Tous les avantages Expert',
      'Statut Leader reconnu',
      'Priorité maximale',
      'Accès événements exclusifs',
    ],
  },
];

// Couleurs des profils (cohérent avec roleConfig.ts)
export const ROLE_COLORS: Record<UserRole, string> = {
  marchand: '#C66A2C',
  producteur: '#2E8B57',
  cooperative: '#2072AF',
  institution: '#712864',
  identificateur: '#9F8170',
};

// Labels des profils
export const ROLE_LABELS: Record<UserRole, string> = {
  marchand: 'Marchand',
  producteur: 'Producteur',
  cooperative: 'Coopérative',
  institution: 'Institution',
  identificateur: 'Identificateur',
};

// Configuration des badges universels
export const UNIVERSAL_BADGES = [
  {
    id: 'enflamme',
    name: 'Enflammé',
    icon: '🔥',
    description: '7 jours de streak consécutifs',
    rarity: 'common' as const,
    requirement: { type: 'streak', value: 7 },
  },
  {
    id: 'fusee',
    name: 'Fusée',
    icon: '🚀',
    description: 'Compléter 10 formations',
    rarity: 'rare' as const,
    requirement: { type: 'formations_completed', value: 10 },
  },
  {
    id: 'precis',
    name: 'Précis',
    icon: '🎯',
    description: '100% de bonnes réponses sur 5 quiz',
    rarity: 'rare' as const,
    requirement: { type: 'perfect_quizzes', value: 5 },
  },
  {
    id: 'etoile_montante',
    name: 'Étoile Montante',
    icon: '🌟',
    description: 'Atteindre le niveau Argent',
    rarity: 'epic' as const,
    requirement: { type: 'level', value: 'argent' },
  },
  {
    id: 'bibliophile',
    name: 'Bibliophile',
    icon: '📚',
    description: 'Compléter toutes les formations d\'une catégorie',
    rarity: 'epic' as const,
    requirement: { type: 'category_complete', value: 1 },
  },
  {
    id: 'champion',
    name: 'Champion',
    icon: '🏆',
    description: 'Top 3 du leaderboard régional',
    rarity: 'legendary' as const,
    requirement: { type: 'leaderboard_rank', value: 3 },
  },
  {
    id: 'marathonien',
    name: 'Marathonien',
    icon: '🏃',
    description: '30 jours de streak consécutifs',
    rarity: 'epic' as const,
    requirement: { type: 'streak', value: 30 },
  },
  {
    id: 'expert',
    name: 'Expert',
    icon: '🎓',
    description: 'Compléter 50 formations',
    rarity: 'legendary' as const,
    requirement: { type: 'formations_completed', value: 50 },
  },
];

// Badges spécifiques par rôle
export const ROLE_SPECIFIC_BADGES = {
  marchand: [
    {
      id: 'vendeur_or',
      name: 'Vendeur d\'Or',
      icon: '💰',
      description: 'Vendre 100 produits',
      rarity: 'rare' as const,
      requirement: { type: 'sales_count', value: 100 },
    },
    {
      id: 'gestionnaire_pro',
      name: 'Gestionnaire Pro',
      icon: '📊',
      description: 'Utiliser toutes les features de caisse',
      rarity: 'epic' as const,
      requirement: { type: 'features_used', value: 'all' },
    },
  ],
  producteur: [
    {
      id: 'agriculteur_expert',
      name: 'Agriculteur Expert',
      icon: '🌱',
      description: 'Compléter "Rotation des cultures"',
      rarity: 'rare' as const,
      requirement: { type: 'formation_specific', value: 'rotation_cultures' },
    },
    {
      id: 'recolte_abondante',
      name: 'Récolte Abondante',
      icon: '🌾',
      description: 'Enregistrer 50 récoltes',
      rarity: 'rare' as const,
      requirement: { type: 'harvests_count', value: 50 },
    },
  ],
  cooperative: [
    {
      id: 'leader',
      name: 'Leader',
      icon: '👥',
      description: 'Gérer plus de 50 membres',
      rarity: 'epic' as const,
      requirement: { type: 'members_count', value: 50 },
    },
    {
      id: 'croissance',
      name: 'Croissance',
      icon: '📈',
      description: '+20 membres en 1 mois',
      rarity: 'rare' as const,
      requirement: { type: 'member_growth', value: 20 },
    },
  ],
  identificateur: [
    {
      id: 'detective',
      name: 'Détective',
      icon: '🔍',
      description: 'Identifier 100 acteurs',
      rarity: 'rare' as const,
      requirement: { type: 'identifications_count', value: 100 },
    },
    {
      id: 'verificateur',
      name: 'Vérificateur',
      icon: '✅',
      description: '100% de dossiers validés (0 erreur sur 20)',
      rarity: 'epic' as const,
      requirement: { type: 'perfect_validation', value: 20 },
    },
  ],
  institution: [
    {
      id: 'operateur_terrain',
      name: 'Analyste',
      icon: '📊',
      description: 'Générer 50 rapports',
      rarity: 'rare' as const,
      requirement: { type: 'reports_count', value: 50 },
    },
    {
      id: 'stratege',
      name: 'Stratège',
      icon: '🎯',
      description: 'Créer 10 campagnes',
      rarity: 'epic' as const,
      requirement: { type: 'campaigns_count', value: 10 },
    },
  ],
};

// Récompenses par streak
export const STREAK_REWARDS = [
  { days: 3, points: 10, message: 'Super ! 3 jours de suite !' },
  { days: 7, points: 50, message: 'Incroyable ! 1 semaine complète !', badge: 'enflamme' },
  { days: 14, points: 100, message: 'Exceptionnel ! 2 semaines !' },
  { days: 30, points: 200, message: 'Légendaire ! 1 mois complet !', badge: 'marathonien' },
  { days: 100, points: 1000, message: 'Champion absolu ! 100 jours !', badge: 'centenaire' },
];

// Points → Score JÙLABA (conversion)
export const ACADEMY_TO_JULABA_RATIO = 10; // 10 pts Academy = 1 pt Score JÙLABA

// Helper functions
export function getLevelFromPoints(points: number): LevelConfig {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    const level = LEVEL_CONFIG[i];
    if (points >= level.minPoints) {
      return level;
    }
  }
  return LEVEL_CONFIG[0]; // Débutant par défaut
}

export function getProgressToNextLevel(points: number): {
  currentLevel: LevelConfig;
  nextLevel: LevelConfig | null;
  progress: number; // 0-100
  pointsNeeded: number;
} {
  const currentLevel = getLevelFromPoints(points);
  const currentIndex = LEVEL_CONFIG.findIndex((l) => l.level === currentLevel.level);
  const nextLevel = currentIndex < LEVEL_CONFIG.length - 1 ? LEVEL_CONFIG[currentIndex + 1] : null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progress: 100,
      pointsNeeded: 0,
    };
  }

  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
  const progress = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;
  const pointsNeeded = nextLevel.minPoints - points;

  return {
    currentLevel,
    nextLevel,
    progress: Math.min(100, Math.max(0, progress)),
    pointsNeeded: Math.max(0, pointsNeeded),
  };
}

export function getJulabaScoreBonus(academyPoints: number): number {
  return Math.floor(academyPoints / ACADEMY_TO_JULABA_RATIO);
}

export function getRarityColor(rarity: string): string {
  const colors = {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B',
  };
  return colors[rarity as keyof typeof colors] || colors.common;
}

export function getRarityLabel(rarity: string): string {
  const labels = {
    common: 'Commun',
    rare: 'Rare',
    epic: 'Épique',
    legendary: 'Légendaire',
  };
  return labels[rarity as keyof typeof labels] || 'Commun';
}