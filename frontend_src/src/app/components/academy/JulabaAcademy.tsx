/**
 * JÙLABA ACADEMY - Page principale
 * 
 * Page dédiée avec toutes les sections Academy
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap,
  Flame,
  Star,
  Trophy,
  Target,
  ChevronRight,
  Shield,
  TrendingUp,
  Award,
} from 'lucide-react';
import { UserRole } from './types';
import { ROLE_COLORS } from './academyConfig';
import { useAcademy } from '../../hooks/useAcademy';
import { useAcademyModules } from '../../hooks/useAcademyModules';
import { FormationDuJour } from './FormationDuJour';
import { StreakShieldModal } from './StreakShieldModal';
import { useApp } from '../../contexts/AppContext';

interface JulabaAcademyProps {
  role: UserRole;
  userId: string;
  onBack: () => void;
}

export function JulabaAcademy({ role, userId, onBack }: JulabaAcademyProps) {
  const { speak } = useApp();
  const roleColor = ROLE_COLORS[role];
  const {
    academyData,
    loading,
    refresh,
    finishFormation,
    getStreakStatus,
    activateShield,
    getLevelProgress,
  } = useAcademy(userId, role);
  const { formations: apiFormations, loading: formationsLoading } = useAcademyModules(role);

  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showShieldModal, setShowShieldModal] = useState(false);
  const [currentFormation, setCurrentFormation] = useState<any>(null);

  // V��rifier le statut du streak au chargement
  useEffect(() => {
    if (academyData) {
      const status = getStreakStatus();
      if (status.needsShield && academyData.shieldAvailable) {
        setShowShieldModal(true);
      }
    }
  }, [academyData]);

  if (loading || formationsLoading || !academyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 animate-pulse" style={{ color: roleColor }} />
          <p className="text-sm font-bold text-gray-600">Chargement Academy...</p>
        </div>
      </div>
    );
  }

  const levelProgress = getLevelProgress();

  // Obtenir la formation du jour (première non complétée) - depuis API
  const formationDuJour = apiFormations.find(
    (f) => !academyData.completedFormations.includes(f.id)
  ) || apiFormations[0];

  const handleStartFormation = (formation: any) => {
    setCurrentFormation(formation);
    setShowFormationModal(true);
    speak('Début de la formation');
  };

  const handleCompleteFormation = async (score: number, xpGained: number, scoreJulabaBonus: number) => {
    if (currentFormation) {
      await finishFormation(currentFormation.id, score, xpGained);
      speak(`Bravo ! Tu as gagné ${xpGained} XP et ${scoreJulabaBonus} points Score JÙLABA`);
      setShowFormationModal(false);
      setCurrentFormation(null);
      refresh();
    }
  };

  const handleUseShield = () => {
    activateShield();
    speak('Ton streak est sauvé grâce au bouclier !');
  };

  const handleDeclineShield = () => {
    speak('Ton streak a été réinitialisé');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header avec bouton retour */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 rotate-180" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${roleColor}20` }}
            >
              <GraduationCap className="w-6 h-6" style={{ color: roleColor }} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900">
                <span style={{ fontFamily: 'Calisga, serif', fontWeight: 700 }}>Jùlaba</span> Academy
              </h1>
              <p className="text-xs text-gray-500 font-semibold">Formation continue</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* En-tête de progression */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div
                className="inline-block px-4 py-2 rounded-full text-sm font-bold text-white mb-3"
                style={{ backgroundColor: roleColor }}
              >
                Niveau {levelProgress?.currentLevel}
              </div>
              <p className="text-2xl font-black text-gray-900 mb-1">{academyData.academyPoints} XP</p>
              <p className="text-sm text-gray-600">
                {levelProgress?.nextLevel
                  ? `Plus que ${levelProgress.pointsToNext} XP pour ${levelProgress.nextLevel}`
                  : 'Niveau maximum atteint !'}
              </p>
            </div>

            {/* Streak */}
            <div className="text-center">
              <motion.div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: '#FF6B35' }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="w-8 h-8 text-white" />
              </motion.div>
              <p className="text-xl font-black text-gray-900">{academyData.currentStreak}</p>
              <p className="text-xs text-gray-600">jours</p>
              {academyData.shieldAvailable && (
                <div className="mt-1">
                  <Shield className="w-4 h-4 text-blue-500 mx-auto" />
                </div>
              )}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: roleColor }}
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress?.percentage || 0}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Formation du jour */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: roleColor }} />
            Formation du jour
          </h2>

          <motion.div
            className="bg-white rounded-3xl border-2 p-6 shadow-sm"
            style={{ borderColor: roleColor }}
            whileHover={formationDuJour ? { scale: 1.02 } : {}}
            whileTap={formationDuJour ? { scale: 0.98 } : {}}
            onClick={() => formationDuJour && handleStartFormation(formationDuJour)}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${roleColor}20` }}
              >
                <Target className="w-7 h-7" style={{ color: roleColor }} />
              </div>
              <div className="flex-1">
                {formationDuJour ? (
                  <>
                    <h3 className="text-lg font-black text-gray-900 mb-2">{formationDuJour.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{formationDuJour.description}</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                      <span>{formationDuJour.duration} min</span>
                      <span>•</span>
                      <span style={{ color: roleColor }}>+{formationDuJour.points} XP</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-black text-gray-900 mb-2">Aucune formation publiée</h3>
                    <p className="text-sm text-gray-600">Aucune formation Academy n'est disponible pour ce profil pour le moment.</p>
                  </>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </motion.div>
        </div>

        {/* Statistiques */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: roleColor }} />
            Mes statistiques
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: roleColor }} />
              <p className="text-2xl font-black text-gray-900">{academyData.stats.totalFormationsCompleted}</p>
              <p className="text-xs text-gray-600 font-semibold">Formations</p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 text-center">
              <Award className="w-8 h-8 mx-auto mb-2" style={{ color: roleColor }} />
              <p className="text-2xl font-black text-gray-900">{academyData.stats.averageScore}%</p>
              <p className="text-xs text-gray-600 font-semibold">Score moyen</p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-black text-gray-900">{academyData.stats.perfectScores}</p>
              <p className="text-xs text-gray-600 font-semibold">Scores parfaits</p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 text-center">
              <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-black text-gray-900">{academyData.longestStreak}</p>
              <p className="text-xs text-gray-600 font-semibold">Record streak</p>
            </div>
          </div>
        </div>

        {/* Mes badges */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: roleColor }} />
            Mes badges ({academyData.badges.length})
          </h2>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {academyData.badges.map((badgeId: string, index: number) => (
              <motion.div
                key={badgeId}
                className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>
            ))}
            {academyData.badges.length === 0 && (
              <p className="text-sm text-gray-500 italic">Aucun badge débloqué pour le moment</p>
            )}
          </div>
        </div>

        {/* Toutes les formations */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4">Toutes les formations</h2>

          <div className="space-y-3">
            {apiFormations.map((formation) => {
              const isCompleted = academyData.completedFormations.includes(formation.id);

              return (
                <motion.div
                  key={formation.id}
                  className={`bg-white rounded-2xl border-2 p-4 ${
                    isCompleted ? 'opacity-60' : 'cursor-pointer'
                  }`}
                  style={{ borderColor: isCompleted ? '#E5E7EB' : `${roleColor}40` }}
                  whileHover={!isCompleted ? { scale: 1.02 } : {}}
                  whileTap={!isCompleted ? { scale: 0.98 } : {}}
                  onClick={() => !isCompleted && handleStartFormation(formation)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-gray-900 mb-1">{formation.title}</h3>
                      <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                        <span>{formation.duration} min</span>
                        <span>•</span>
                        <span style={{ color: roleColor }}>+{formation.points} XP</span>
                      </div>
                    </div>
                    {isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Formation */}
      {currentFormation && (
        <FormationDuJour
          isOpen={showFormationModal}
          onClose={() => setShowFormationModal(false)}
          role={role}
          formation={currentFormation}
          onComplete={handleCompleteFormation}
        />
      )}

      {/* Modal Bouclier */}
      <StreakShieldModal
        isOpen={showShieldModal}
        onClose={() => setShowShieldModal(false)}
        currentStreak={academyData.currentStreak}
        daysMissed={getStreakStatus().daysMissed}
        primaryColor={roleColor}
        onUseShield={handleUseShield}
        onDecline={handleDeclineShield}
      />
    </div>
  );
}