/**
 * 📊 SCORE BREAKDOWN - Décomposition du Score JULABA
 * 
 * Composant universel pour afficher les détails du score utilisateur
 * avec décomposition par critères et conseils d'amélioration
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Activity, 
  Award, 
  Calendar, 
  Shield,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  Star,
  ArrowUp,
  Zap,
} from 'lucide-react';
import { getRoleColor } from '../../config/roleConfig';

interface ScoreBreakdownProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  scoreTotal: number;
  showDetails?: boolean;
}

interface ScoreCriteria {
  label: string;
  icon: any;
  value: number;
  max: number;
  description: string;
}

export function ScoreBreakdown({ role, scoreTotal, showDetails = true }: ScoreBreakdownProps) {
  const activeColor = getRoleColor(role);

  // Calculer le niveau
  const scoreBase = scoreTotal / 10; // Convertir de 1000 à 100
  const niveau = scoreBase >= 90 ? 'Platinum' : 
                 scoreBase >= 80 ? 'Gold' : 
                 scoreBase >= 70 ? 'Silver' : 'Bronze';

  // Simuler une décomposition du score (à remplacer par des vraies données)
  const criteria: ScoreCriteria[] = [
    {
      label: 'Activité Transactionnelle',
      icon: Activity,
      value: Math.round((scoreBase * 0.4) * 10) / 10, // 40% du score
      max: 40,
      description: 'Nombre et volume de transactions',
    },
    {
      label: 'Fiabilité et Ponctualité',
      icon: CheckCircle,
      value: Math.round((scoreBase * 0.3) * 10) / 10, // 30% du score
      max: 30,
      description: 'Taux de réussite et respect des délais',
    },
    {
      label: 'Ancienneté et Engagement',
      icon: Calendar,
      value: Math.round((scoreBase * 0.2) * 10) / 10, // 20% du score
      max: 20,
      description: 'Durée d\'inscription et fréquence d\'utilisation',
    },
    {
      label: 'Vérification et Conformité',
      icon: Shield,
      value: Math.round((scoreBase * 0.1) * 10) / 10, // 10% du score
      max: 10,
      description: 'Documents validés et informations complètes',
    },
  ];

  // Calculer les conseils d'amélioration
  const improvements = criteria
    .filter(c => (c.value / c.max) < 0.9) // Critères < 90%
    .map(c => ({
      critere: c.label,
      gain: Math.round((c.max - c.value) * 10),
      action: getActionSuggestion(c.label, role),
    }));

  return (
    <div className="space-y-6">
      {/* Score Principal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 rounded-3xl border-2 shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${activeColor}15, white)`,
          borderColor: activeColor,
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Star className="w-16 h-16 mx-auto mb-4" style={{ color: activeColor }} fill={activeColor} />
        </motion.div>
        <h3 className="text-6xl font-black mb-2" style={{ color: activeColor }}>
          {scoreTotal}
        </h3>
        <p className="text-lg font-bold text-gray-600 mb-3">Score JULABA</p>
        <div
          className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-white font-bold shadow-lg"
          style={{ backgroundColor: activeColor }}
        >
          <Award className="w-5 h-5" />
          Niveau {niveau}
        </div>
      </motion.div>

      {showDetails && (
        <>
          {/* Décomposition par critères */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6" style={{ color: activeColor }} />
              <h3 className="text-xl font-black text-gray-900">Décomposition du score</h3>
            </div>

            <div className="space-y-4">
              {criteria.map((criterion, index) => (
                <CriteriaCard
                  key={index}
                  criterion={criterion}
                  color={activeColor}
                  delay={index * 0.1}
                />
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${activeColor}20` }}
                  >
                    <TrendingUp className="w-6 h-6" style={{ color: activeColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Score Total</p>
                    <p className="text-2xl font-black text-gray-900">{scoreBase} / 100</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Sur 1000</p>
                  <p className="text-3xl font-black" style={{ color: activeColor }}>
                    {scoreTotal}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Conseils d'amélioration */}
          {improvements.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-yellow-200">
              <div className="flex items-center gap-3 mb-6">
                <Lightbulb className="w-6 h-6 text-yellow-600" />
                <h3 className="text-xl font-black text-gray-900">Comment améliorer ton score</h3>
              </div>

              <div className="space-y-3">
                {improvements.slice(0, 3).map((improvement, index) => (
                  <ImprovementTip
                    key={index}
                    improvement={improvement}
                    color={activeColor}
                    delay={index * 0.1}
                  />
                ))}
              </div>

              <div className="mt-6 p-4 bg-white rounded-xl border border-yellow-300">
                <p className="text-sm text-gray-700">
                  <strong className="text-yellow-600">Objectif :</strong> Atteins un score de{' '}
                  <strong>{Math.ceil((scoreBase + 10) / 10) * 100}</strong> pour passer au niveau supérieur !
                </p>
              </div>
            </div>
          )}

          {/* Progression vers le niveau supérieur */}
          <ProgressToNextLevel scoreBase={scoreBase} niveau={niveau} color={activeColor} />
        </>
      )}
    </div>
  );
}

// Composant pour chaque critère
function CriteriaCard({
  criterion,
  color,
  delay,
}: {
  criterion: ScoreCriteria;
  color: string;
  delay: number;
}) {
  const percentage = (criterion.value / criterion.max) * 100;
  const Icon = criterion.icon || Zap;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="p-4 rounded-xl bg-gray-50 border border-gray-200"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-gray-900">{criterion.label}</h4>
            <span className="font-black text-gray-900">
              {criterion.value} / {criterion.max}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">{criterion.description}</p>

          {/* Barre de progression */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, delay: delay + 0.2 }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Composant pour les conseils d'amélioration
function ImprovementTip({
  improvement,
  color,
  delay,
}: {
  improvement: { critere: string; gain: number; action: string };
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-yellow-200"
    >
      <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
        <ArrowUp className="w-5 h-5 text-yellow-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900 mb-1">{improvement.action}</p>
        <p className="text-xs text-gray-600">
          <strong style={{ color }}>+{improvement.gain} points</strong> potentiels
        </p>
      </div>
    </motion.div>
  );
}

// Progression vers le niveau supérieur
function ProgressToNextLevel({
  scoreBase,
  niveau,
  color,
}: {
  scoreBase: number;
  niveau: string;
  color: string;
}) {
  const nextThreshold = niveau === 'Bronze' ? 70 : niveau === 'Silver' ? 80 : niveau === 'Gold' ? 90 : 100;
  const currentThreshold = niveau === 'Bronze' ? 0 : niveau === 'Silver' ? 70 : niveau === 'Gold' ? 80 : 90;
  const progress = ((scoreBase - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  if (niveau === 'Platinum') {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200 text-center">
        <Award className="w-12 h-12 mx-auto mb-3 text-purple-600" />
        <h3 className="text-xl font-black text-gray-900 mb-2">Niveau Maximum Atteint ! 🎉</h3>
        <p className="text-gray-700">Tu es au sommet ! Continue comme ça pour maintenir ton niveau Platinum.</p>
      </div>
    );
  }

  const nextLevel = niveau === 'Bronze' ? 'Silver' : niveau === 'Silver' ? 'Gold' : 'Platinum';
  const pointsNeeded = nextThreshold - scoreBase;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2" style={{ borderColor: `${color}30` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-1">Prochain niveau</p>
          <p className="text-2xl font-black" style={{ color }}>
            {nextLevel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 mb-1">Plus que</p>
          <p className="text-3xl font-black text-gray-900">{Math.ceil(pointsNeeded * 10)} pts</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{niveau}</span>
        <span>{Math.round(progress)}%</span>
        <span>{nextLevel}</span>
      </div>
    </div>
  );
}

// Suggestions d'actions par critère et rôle
function getActionSuggestion(critere: string, role: string): string {
  const suggestions: Record<string, Record<string, string>> = {
    'Activité Transactionnelle': {
      marchand: 'Effectue 10 transactions de plus ce mois',
      producteur: 'Enregistre 5 nouvelles récoltes',
      cooperative: 'Augmente le volume de transactions de 20%',
      institution: 'Valide 15 nouveaux acteurs',
      identificateur: 'Identifie 20 nouveaux marchands',
    },
    'Fiabilité et Ponctualité': {
      marchand: 'Maintiens un taux de réussite de 100% sur tes ventes',
      producteur: 'Livre toutes tes commandes à temps',
      cooperative: 'Réduis les délais de traitement de 30%',
      institution: 'Traite les validations en moins de 48h',
      identificateur: 'Vérifie toutes les informations avant validation',
    },
    'Ancienneté et Engagement': {
      marchand: 'Connecte-toi chaque jour pendant 1 mois',
      producteur: 'Utilise toutes les fonctionnalités de la plateforme',
      cooperative: 'Participe aux formations et événements',
      institution: 'Active toutes les notifications importantes',
      identificateur: 'Complète ton profil à 100%',
    },
    'Vérification et Conformité': {
      marchand: 'Complète tous tes documents (CNI, CMU, RSTI)',
      producteur: 'Valide ton certificat d\'exploitation',
      cooperative: 'Mets à jour le registre des membres',
      institution: 'Vérifie toutes les informations légales',
      identificateur: 'Obtiens ta certification officielle',
    },
  };

  return suggestions[critere]?.[role] || 'Améliore ce critère pour gagner des points';
}