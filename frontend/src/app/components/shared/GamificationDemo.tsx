/**
 * 🎮 GAMIFICATION DEMO - Démonstration du système de gamification
 * 
 * Page complète montrant :
 * - Quiz interactifs
 * - Badges et récompenses
 * - Classements
 * - Progression
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Star,
  Award,
  Target,
  Zap,
  TrendingUp,
  Users,
  Play,
  Gift,
  Crown,
  Flame,
} from 'lucide-react';
import { UniversalQuiz } from './UniversalQuiz';
import { BadgeCollection, defaultBadges } from './BadgeCollection';
import { ScoreBreakdown } from './ScoreBreakdown';
import { getRoleColor } from '../../config/roleConfig';
import { getRandomQuiz, type UserRole } from '../../data/quizData';
import type { QuizQuestion } from '../../data/quizData';

interface GamificationDemoProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
}

export function GamificationDemo({ role }: GamificationDemoProps) {
  const activeColor = getRoleColor(role);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([]);

  const handleStartQuiz = () => {
    const quiz = getRandomQuiz(role as UserRole, 5);
    setCurrentQuiz(quiz);
    setShowQuiz(true);
  };

  const handleQuizComplete = (_result: any) => {
    setShowQuiz(false);
    // Ici on pourrait sauvegarder le résultat, mettre à jour le score, débloquer des badges, etc.
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-black mb-3" style={{ color: activeColor }}>
            🎮 Système de Gamification
          </h1>
          <p className="text-gray-600 font-semibold text-lg">
            Apprends, joue et gagne des points !
          </p>
        </motion.div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Trophy} label="Score Total" value="1,450" color={activeColor} />
          <StatCard icon={Star} label="Badges" value="12 / 20" color="#F59E0B" />
          <StatCard icon={Flame} label="Série" value="7 jours" color="#EF4444" />
          <StatCard icon={Crown} label="Classement" value="3ème" color="#8B5CF6" />
        </div>

        {/* Actions principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz du jour */}
          <ActionCard
            icon={Play}
            title="Quiz du Jour"
            description="Réponds à 5 questions et gagne des points !"
            badge="+100 pts"
            color={activeColor}
            onClick={handleStartQuiz}
          />

          {/* Mes badges */}
          <ActionCard
            icon={Award}
            title="Mes Badges"
            description="Débloque de nouveaux badges !"
            badge="12 / 20"
            color="#F59E0B"
            onClick={() => setShowBadges(!showBadges)}
          />

          {/* Mon score */}
          <ActionCard
            icon={Target}
            title="Mon Score"
            description="Vois ta progression détaillée"
            badge="Niveau Expert"
            color="#8B5CF6"
            onClick={() => setShowScore(!showScore)}
          />
        </div>

        {/* Défis quotidiens */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2" style={{ borderColor: `${activeColor}30` }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${activeColor}20` }}>
              <Target className="w-6 h-6" style={{ color: activeColor }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Défis du Jour</h2>
              <p className="text-sm text-gray-600">Complète-les pour gagner des bonus !</p>
            </div>
          </div>

          <div className="space-y-3">
            <ChallengeItem
              title="Complète 1 quiz"
              progress={100}
              reward="+50 pts"
              completed={true}
              color={activeColor}
            />
            <ChallengeItem
              title="Enregistre 3 ventes"
              progress={66}
              reward="+30 pts"
              completed={false}
              color={activeColor}
            />
            <ChallengeItem
              title="Mets à jour ton inventaire"
              progress={0}
              reward="+20 pts"
              completed={false}
              color={activeColor}
            />
          </div>
        </div>

        {/* Classement */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Top 5 de la Semaine</h2>
              <p className="text-sm text-gray-600">Tu es 3ème ! Continue comme ça !</p>
            </div>
          </div>

          <div className="space-y-2">
            <LeaderboardItem rank={1} name="Aminata KOUASSI" points={2450} isYou={true} />
            <LeaderboardItem rank={2} name="Ibrahim TRAORÉ" points={2380} isYou={false} />
            <LeaderboardItem rank={3} name="Fatou KONÉ" points={2150} isYou={false} />
            <LeaderboardItem rank={4} name="Yao KOUADIO" points={1980} isYou={false} />
            <LeaderboardItem rank={5} name="Aya DIALLO" points={1850} isYou={false} />
          </div>
        </div>

        {/* Collection de badges */}
        {showBadges && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <BadgeCollection role={role} badges={defaultBadges} />
          </motion.div>
        )}

        {/* Décomposition du score */}
        {showScore && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ScoreBreakdown role={role} scoreTotal={785} showDetails={true} />
          </motion.div>
        )}
      </div>

      {/* Modal Quiz */}
      {showQuiz && currentQuiz.length > 0 && (
        <UniversalQuiz
          role={role}
          questions={currentQuiz}
          onComplete={handleQuizComplete}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
}

// Composant StatCard
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      className="p-4 bg-white rounded-2xl shadow-md border-2"
      style={{ borderColor: `${color}30` }}
      whileHover={{ scale: 1.05, y: -4 }}
    >
      <Icon className="w-6 h-6 mb-2" style={{ color }} />
      <p className="text-sm font-semibold text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </motion.div>
  );
}

// Composant ActionCard
function ActionCard({
  icon: Icon,
  title,
  description,
  badge,
  color,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  badge: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="p-6 bg-white rounded-2xl shadow-lg border-2 text-left transition-all hover:shadow-xl"
      style={{ borderColor: `${color}30` }}
      whileHover={{ scale: 1.03, y: -8 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white" style={{ backgroundColor: color }}>
        <Gift className="w-4 h-4" />
        {badge}
      </div>
    </motion.button>
  );
}

// Composant ChallengeItem
function ChallengeItem({
  title,
  progress,
  reward,
  completed,
  color,
}: {
  title: string;
  progress: number;
  reward: string;
  completed: boolean;
  color: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${completed ? 'bg-green-500' : 'bg-gray-300'}`}>
            {completed && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>✓</motion.div>}
          </div>
          <span className="font-bold text-gray-900">{title}</span>
        </div>
        <span className="text-sm font-bold" style={{ color }}>
          {reward}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: completed ? '#10B981' : color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  );
}

// Composant LeaderboardItem
function LeaderboardItem({ rank, name, points, isYou }: { rank: number; name: string; points: number; isYou: boolean }) {
  const medals = ['🥇', '🥈', '🥉'];
  const medal = rank <= 3 ? medals[rank - 1] : '🌟';

  return (
    <motion.div
      className={`p-4 rounded-xl flex items-center justify-between ${
        isYou ? 'bg-purple-500 text-white' : 'bg-white border border-purple-200'
      }`}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{medal}</span>
        <div>
          <p className={`font-bold ${isYou ? 'text-white' : 'text-gray-900'}`}>
            {name} {isYou && '(Toi)'}
          </p>
          <p className={`text-sm ${isYou ? 'text-purple-100' : 'text-gray-600'}`}>Rang #{rank}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-2xl font-black ${isYou ? 'text-white' : 'text-purple-600'}`}>{(points || 0).toLocaleString()}</p>
        <p className={`text-xs ${isYou ? 'text-purple-100' : 'text-gray-600'}`}>points</p>
      </div>
    </motion.div>
  );
}