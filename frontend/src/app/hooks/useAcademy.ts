/**
 * HOOK useAcademy - Gestion état Academy
 * 
 * Hook personnalisé pour gérer toutes les opérations Academy
 */

import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { UserRole } from '../components/academy/types';
import {
  AcademyUserData,
  getAcademyData,
  saveAcademyData,
  addPoints,
  completeFormation,
  updateStreak,
  useShield,
  checkStreakStatus,
  resetShieldIfNeeded,
  unlockBadge,
  getProgressToNextLevel,
  getJulabaScoreBonus,
} from '../services/academyService';

export function useAcademy(userId: string, role: UserRole) {
  const [academyData, setAcademyData] = useState<AcademyUserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger les données au montage
  useEffect(() => {
    const data = getAcademyData(userId, role);
    resetShieldIfNeeded(userId);
    setAcademyData(data);
    setLoading(false);
  }, [userId, role]);

  /**
   * Recharger les données
   */
  const refresh = () => {
    const data = getAcademyData(userId, role);
    setAcademyData(data);
  };

  /**
   * Ajouter des points XP
   */
  const earnPoints = (points: number) => {
    const updated = addPoints(userId, points);
    setAcademyData(updated);
    return updated;
  };

  /**
   * Compléter une formation
   */
  const finishFormation = async (formationId: string, score: number, xpEarned: number) => {
    const updated = completeFormation(userId, formationId, score, xpEarned);
    setAcademyData(updated);

    // Calculer le bonus Mes Points Jùlaba
    const scoreBonus = getJulabaScoreBonus(xpEarned);

    // Persister en BD : enroll si pas déjà fait, puis PATCH progress
    try {
      await fetch(`${API_URL}/academy/modules/${formationId}/enroll`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});

      await fetch(`${API_URL}/academy/modules/${formationId}/progress`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: Math.min(100, Math.max(0, Math.round(score))),
          completed: true,
          taux_completion: 100,
        }),
      }).catch(() => {});
    } catch {
      // Erreur silencieuse — le localStorage a déjà été mis à jour
    }

    return { updated, scoreBonus };
  };

  /**
   * Utiliser le bouclier de streak
   */
  const activateShield = () => {
    const updated = useShield(userId);
    setAcademyData(updated);
    return updated;
  };

  /**
   * Vérifier le statut du streak
   */
  const getStreakStatus = () => {
    if (!academyData) return { needsShield: false, daysMissed: 0 };
    return checkStreakStatus(userId, role);
  };

  /**
   * Débloquer un badge
   */
  const earnBadge = (badgeId: string) => {
    const updated = unlockBadge(userId, badgeId);
    setAcademyData(updated);
    return updated;
  };

  /**
   * Obtenir la progression vers le niveau suivant
   */
  const getLevelProgress = () => {
    if (!academyData) return null;
    return getProgressToNextLevel(academyData.academyPoints);
  };

  return {
    academyData,
    loading,
    refresh,
    earnPoints,
    finishFormation,
    activateShield,
    getStreakStatus,
    earnBadge,
    getLevelProgress,
  };
}
