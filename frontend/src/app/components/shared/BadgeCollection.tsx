/**
 * 🏅 BADGE COLLECTION - Collection de badges gamifiés
 * 
 * Affiche tous les badges obtenus et à débloquer
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Star,
  Award,
  Target,
  Zap,
  Crown,
  Sparkles,
  Lock,
  Check,
  TrendingUp,
  Users,
  Calendar,
  Shield,
  Flame,
} from 'lucide-react';
import { getRoleColor } from '../../config/roleConfig';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'general' | 'role' | 'seasonal';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedDate?: string;
  progress?: number; // 0-100
  requirement: string;
}

interface BadgeCollectionProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  badges: Badge[];
}

export function BadgeCollection({ role, badges }: BadgeCollectionProps) {
  const activeColor = getRoleColor(role);

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const lockedBadges = badges.filter((b) => !b.unlocked);

  const rarityColors = {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Mes Badges</h2>
          <p className="text-sm text-gray-600">
            {unlockedBadges.length} / {badges.length} débloqués
          </p>
        </div>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${activeColor}20` }}
        >
          <Trophy className="w-8 h-8" style={{ color: activeColor }} />
        </div>
      </div>

      {/* Progression globale */}
      <div className="p-4 bg-white rounded-2xl shadow-md border-2" style={{ borderColor: `${activeColor}30` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-600">Progression</span>
          <span className="text-sm font-bold" style={{ color: activeColor }}>
            {Math.round((unlockedBadges.length / badges.length) * 100)}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: activeColor }}
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedBadges.length / badges.length) * 100}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>

      {/* Badges débloqués */}
      {unlockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Débloqués ({unlockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {unlockedBadges.map((badge, index) => (
              <BadgeCard key={badge.id} badge={badge} color={activeColor} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Badges à débloquer */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-400" />
            À débloquer ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {lockedBadges.map((badge, index) => (
              <BadgeCard key={badge.id} badge={badge} color={activeColor} index={index} locked />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Carte de badge
function BadgeCard({
  badge,
  color,
  index,
  locked = false,
}: {
  badge: Badge;
  color: string;
  index: number;
  locked?: boolean;
}) {
  const rarityColors = {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
  };

  const rarityGradients = {
    common: 'from-gray-100 to-gray-200',
    rare: 'from-blue-100 to-blue-200',
    epic: 'from-purple-100 to-purple-200',
    legendary: 'from-yellow-100 to-yellow-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: locked ? 1 : 1.05, y: locked ? 0 : -8 }}
      className={`p-4 rounded-2xl border-2 shadow-lg ${
        locked ? 'bg-gray-50 border-gray-200' : `bg-gradient-to-br ${rarityGradients[badge.rarity]}`
      }`}
      style={locked ? {} : { borderColor: rarityColors[badge.rarity] }}
    >
      {/* Badge Icon */}
      <div className="relative mb-3">
        <motion.div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-4xl ${
            locked ? 'bg-gray-200' : 'bg-white shadow-lg'
          }`}
          animate={
            locked
              ? {}
              : {
                  rotate: [0, 5, -5, 0],
                }
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          {locked ? <Lock className="w-8 h-8 text-gray-400" /> : badge.icon}
        </motion.div>

        {/* Rarity indicator */}
        {!locked && (
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
            style={{ backgroundColor: rarityColors[badge.rarity] }}
          >
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Badge Info */}
      <div className="text-center">
        <h4 className={`font-bold mb-1 ${locked ? 'text-gray-400' : 'text-gray-900'}`}>{badge.name}</h4>
        <p className={`text-xs mb-2 ${locked ? 'text-gray-400' : 'text-gray-600'}`}>{badge.description}</p>

        {/* Points */}
        <div
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            locked ? 'bg-gray-200 text-gray-500' : 'bg-white'
          }`}
          style={locked ? {} : { color: rarityColors[badge.rarity] }}
        >
          <Star className="w-3 h-3" />
          +{badge.points}
        </div>

        {/* Progress bar for locked badges */}
        {locked && badge.progress !== undefined && (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${badge.progress}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{badge.progress}%</p>
          </div>
        )}

        {/* Unlock date */}
        {!locked && badge.unlockedDate && (
          <p className="text-xs text-gray-500 mt-2">Obtenu le {badge.unlockedDate}</p>
        )}
      </div>
    </motion.div>
  );
}

// Exemple de badges par défaut
export const defaultBadges: Badge[] = [
  {
    id: 'badge-001',
    name: 'Apprenti',
    description: 'Réponds à ton premier quiz',
    icon: '🎓',
    category: 'general',
    points: 10,
    rarity: 'common',
    unlocked: true,
    unlockedDate: '15 Fév 2026',
    requirement: 'Compléter 1 quiz',
  },
  {
    id: 'badge-002',
    name: 'Étudiant',
    description: 'Réponds à 10 quiz',
    icon: '📚',
    category: 'general',
    points: 100,
    rarity: 'rare',
    unlocked: true,
    unlockedDate: '20 Fév 2026',
    requirement: 'Compléter 10 quiz',
  },
  {
    id: 'badge-003',
    name: 'Expert',
    description: 'Réponds à 50 quiz',
    icon: '🏆',
    category: 'general',
    points: 500,
    rarity: 'epic',
    unlocked: false,
    progress: 60,
    requirement: 'Compléter 50 quiz (30/50)',
  },
  {
    id: 'badge-004',
    name: 'Maître',
    description: 'Score parfait sur 10 quiz consécutifs',
    icon: '👑',
    category: 'general',
    points: 1000,
    rarity: 'legendary',
    unlocked: false,
    progress: 30,
    requirement: '10 quiz parfaits consécutifs (3/10)',
  },
  {
    id: 'badge-005',
    name: 'Vendeur Actif',
    description: '5 ventes par jour pendant 1 semaine',
    icon: '🛒',
    category: 'role',
    points: 200,
    rarity: 'rare',
    unlocked: false,
    progress: 45,
    requirement: '7 jours d\'affilée (3/7)',
  },
  {
    id: 'badge-006',
    name: 'Organisé',
    description: 'Inventaire complet chaque semaine pendant 1 mois',
    icon: '📦',
    category: 'role',
    points: 300,
    rarity: 'epic',
    unlocked: false,
    progress: 25,
    requirement: '4 semaines consécutives (1/4)',
  },
  {
    id: 'badge-007',
    name: 'Champion du Mois',
    description: 'Meilleur score du mois',
    icon: '🥇',
    category: 'seasonal',
    points: 500,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    requirement: 'Top 1 du classement mensuel',
  },
  {
    id: 'badge-008',
    name: 'Série Parfaite',
    description: '30 jours consécutifs d\'activité',
    icon: '🔥',
    category: 'general',
    points: 400,
    rarity: 'epic',
    unlocked: false,
    progress: 73,
    requirement: '30 jours d\'affilée (22/30)',
  },
];