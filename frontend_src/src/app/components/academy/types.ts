// Types pour JÙLABA Academy

export type AcademyLevel = 'debutant' | 'actif' | 'expert' | 'leader';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type FormationDifficulty = 'debutant' | 'intermediaire' | 'avance';

export type UserRole = 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';

export interface UserAcademy {
  userId: string;
  
  // Progression
  academyPoints: number;        // Points Academy cumulés
  academyLevel: AcademyLevel;   // Niveau actuel
  
  // Streaks
  currentStreak: number;        // Série actuelle
  longestStreak: number;        // Meilleur série
  lastActivityDate: string;     // Dernière activité (pour calcul streak)
  
  // Badges
  badges: Badge[];              // Liste des badges débloqués
  
  // Formations
  completedFormations: string[]; // IDs des formations complétées
  inProgressFormation: {
    formationId: string;
    currentSlide: number;
    startedAt: string;
  } | null;
  
  // Défis
  dailyChallenges: DailyChallenge[];
  completedChallenges: string[]; // IDs des défis complétés
  
  // Leaderboard
  regionalRank: number;
  nationalRank: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: string;
  rarity: BadgeRarity;
  role?: UserRole | 'all'; // Si spécifique à un rôle
}

export interface DailyChallenge {
  id: string;
  date: string;           // Date du défi (YYYY-MM-DD)
  role: UserRole;
  title: string;
  description: string;
  target: number;         // Objectif (ex: 5 ventes)
  current: number;        // Progression actuelle
  reward: number;         // Points à gagner
  expiresAt: string;      // ISO datetime
  completed: boolean;
  badge?: string;         // Badge optionnel à débloquer
}

export interface Formation {
  id: string;
  role: UserRole | 'all'; // 'all' = universel
  category: string;
  title: string;
  description: string;
  duration: number;       // en minutes
  difficulty: FormationDifficulty;
  points: number;         // Points à gagner
  badge?: string;         // Badge optionnel
  slides: FormationSlide[];
  quiz: QuizQuestion[];
  prerequisites?: string[]; // IDs de formations requises
  thumbnail?: string;     // Image de preview
}

export interface FormationSlide {
  slideNumber: number;
  title: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;      // Pour Tata Lou
  bulletPoints?: string[]; // Points clés
}

export interface QuizQuestion {
  question: string;
  options: string[];      // 4 options
  correctAnswer: number;  // Index de la bonne réponse (0-3)
  explanation?: string;   // Explication après réponse
  points: number;         // Points pour bonne réponse
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: UserRole;
  academyPoints: number;
  level: AcademyLevel;
  badgeCount: number;
  currentStreak: number;
  rank: number;
  isCurrentUser?: boolean;
}

// Configuration des niveaux
export interface LevelConfig {
  level: AcademyLevel;
  minPoints: number;
  maxPoints: number;
  badge: string;
  color: string;
  benefits: string[];
}

// Récompenses
export interface Reward {
  type: 'points' | 'badge' | 'level_up' | 'streak_bonus';
  value: number | string;
  message: string;
  icon: string;
}