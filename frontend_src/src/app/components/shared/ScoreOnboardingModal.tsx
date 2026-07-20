/**
 * SCORE ONBOARDING MODAL - Multi-étapes animé
 * 
 * Modal pédagogique en 5 étapes pour découvrir le Score JULABA
 * - Texte ultra simplifié
 * - Animations riches
 * - UI 100% harmonisée
 * - Aucun émoji
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  TrendingUp, 
  Gift, 
  Zap, 
  Target,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SharedModal } from './Modal';
import { RoleType } from '../../config/roleConfig';
import { useScoreJULABA, SCORE_LEVELS } from '../../hooks/useScoreJULABA';

// ─── TEXTES PAR RÔLE ──────────────────────────────────────────────────────────
type RoleOnboardingTexts = {
  step1Sub1: string;
  step1Sub2: string;
  step3Title: string;
  step3Encouragement: string;
  step4Title: string;
  step4Tip: string;
  step5Title: string;
  step5Sub: string;
};

const ROLE_TEXTS: Partial<Record<RoleType, RoleOnboardingTexts>> = {
  marchand: {
    step1Sub1: "C'est ta note de confiance en tant que marchand dans Jùlaba",
    step1Sub2: "Plus tu enregistres tes ventes, plus ton score monte",
    step3Title: "Ce que tu gagnes",
    step3Encouragement: "Vend plus pour débloquer des avantages",
    step4Title: "Comment monter ton score",
    step4Tip: "Enregistre tes ventes tous les jours pour monter vite",
    step5Title: "Prêt à vendre plus ?",
    step5Sub: "Commence par ces 3 actions simples",
  },
  producteur: {
    step1Sub1: "C'est ta note de fiabilité en tant que producteur dans Jùlaba",
    step1Sub2: "Plus tu déclares tes récoltes, plus ton score monte",
    step3Title: "Ce que tu débloques",
    step3Encouragement: "Déclare tes récoltes pour gagner des avantages",
    step4Title: "Comment améliorer ton score",
    step4Tip: "Déclare chaque récolte dans Jùlaba pour monter vite",
    step5Title: "Prêt à déclarer tes récoltes ?",
    step5Sub: "Commence par ces 3 actions simples",
  },
  cooperative: {
    step1Sub1: "C'est la note de fiabilité de ta coopérative dans Jùlaba",
    step1Sub2: "Plus tu gères bien tes membres, plus le score monte",
    step3Title: "Les avantages de ta coopérative",
    step3Encouragement: "Gérez plus pour débloquer des avantages collectifs",
    step4Title: "Comment monter le score",
    step4Tip: "Gérez vos membres régulièrement pour monter vite",
    step5Title: "Prêt à gérer ta coopérative ?",
    step5Sub: "Commence par ces 3 actions simples",
  },
  cooperateur: {
    step1Sub1: "C'est ta note de fiabilité en tant que membre coopératif dans Jùlaba",
    step1Sub2: "Plus tu participes à la vie de ta coopérative, plus ton score monte",
    step3Title: "Ce que tu débloques avec ta coopérative",
    step3Encouragement: "Contribue aux activités du groupe pour gagner des avantages",
    step4Title: "Comment améliorer ton score",
    step4Tip: "Enregistre tes apports régulièrement pour monter vite",
    step5Title: "Prêt à t'impliquer davantage ?",
    step5Sub: "Commence par ces 3 actions simples",
  },
  identificateur: {
    step1Sub1: "C'est ta note de fiabilité en tant qu'identificateur dans Jùlaba",
    step1Sub2: "Plus tu identifies d'acteurs sur le terrain, plus ton score monte",
    step3Title: "Ce que tu débloques",
    step3Encouragement: "Identifie des acteurs pour débloquer tes avantages",
    step4Title: "Comment monter ton score",
    step4Tip: "Enregistre chaque identification dans Jùlaba pour monter vite",
    step5Title: "Prêt à identifier plus d'acteurs ?",
    step5Sub: "Commence par ces 3 actions simples",
  },
};

const DEFAULT_TEXTS = ROLE_TEXTS.marchand!;

function getRoleTexts(role: string): RoleOnboardingTexts {
  const entry = ROLE_TEXTS[role as RoleType];
  if (!entry) {
    if (import.meta.env.DEV) {
      console.warn(`[ScoreOnboardingModal] Rôle non géré: "${role}", textes marchand utilisés.`);
    }
    return DEFAULT_TEXTS;
  }
  return entry;
}
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  role: RoleType;
  primaryColor: string;
  onStartActions?: () => void;
}

export function ScoreOnboardingModal({
  isOpen,
  onClose,
  score,
  role,
  primaryColor,
  onStartActions,
}: ScoreOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const scoreData = useScoreJULABA(score, role);

  const totalSteps = 5;

  // Reset step au premier lancement
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    onClose();
    onStartActions?.();
  };

  const handleDotClick = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  // Animations variants pour slide
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.8,
    }),
  };

  return (
    <>
      <SharedModal 
        isOpen={isOpen} 
        onClose={onClose}
        size="lg"
        hideCloseButton={true}
        disableBackdropClick={false}
        fullHeight={true}
        className="border-2 overflow-hidden"
        cardStyle={{
          borderColor: primaryColor,
          background: 'white',
        }}
      >
        {/* Container flex qui remplit toute la hauteur disponible */}
        <div className="flex flex-col px-6 py-6 h-full">
          {/* Indicateurs de progression (dots) - TOUJOURS VISIBLES */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-shrink-0">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isPast = stepNumber < currentStep;
              
              return (
                <motion.button
                  key={stepNumber}
                  onClick={() => handleDotClick(stepNumber)}
                  className="relative"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <motion.div
                    className="rounded-full transition-all"
                    style={{
                      width: isActive ? 32 : 8,
                      height: 8,
                      backgroundColor: isActive || isPast ? primaryColor : '#D1D5DB',
                    }}
                    animate={isActive ? {
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Contenu - PREND L'ESPACE DISPONIBLE SANS SCROLL */}
          <div className="flex-1 overflow-hidden px-2 -mx-2 mb-6">
            <div className="h-full flex items-center justify-center">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="w-full py-4"
                >
                  {/* Étape 1 : Introduction */}
                  {currentStep === 1 && (
                    <Step1 primaryColor={primaryColor} role={role} />
                  )}

                  {/* Étape 2 : Niveau actuel */}
                  {currentStep === 2 && (
                    <Step2 
                      score={score} 
                      scoreData={scoreData} 
                      primaryColor={primaryColor} 
                    />
                  )}

                  {/* Étape 3 : Bénéfices */}
                  {currentStep === 3 && (
                    <Step3 
                      scoreData={scoreData} 
                      primaryColor={primaryColor}
                      role={role}
                    />
                  )}

                  {/* Étape 4 : Comment améliorer */}
                  {currentStep === 4 && (
                    <Step4 
                      scoreData={scoreData}
                      primaryColor={primaryColor}
                      role={role}
                    />
                  )}

                  {/* Étape 5 : Actions */}
                  {currentStep === 5 && (
                    <Step5 
                      scoreData={scoreData} 
                      primaryColor={primaryColor}
                      role={role}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Boutons navigation - TOUJOURS VISIBLES */}
          <div className="flex flex-col gap-3 pt-4 border-t-2 border-gray-100 flex-shrink-0">
            {/* Bouton principal Continuer / Compris */}
            {currentStep < totalSteps ? (
              <motion.button
                onClick={handleNext}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-5 rounded-3xl text-white font-black shadow-2xl border-4 border-white/30 overflow-hidden relative flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="relative z-10">Continuer</span>
                <ChevronRight className="w-5 h-5 relative z-10" />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleFinish}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-5 rounded-3xl text-white font-black shadow-2xl border-4 border-white/30 overflow-hidden relative flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #16A34A, #15803d)' }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <CheckCircle2 className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Compris !</span>
              </motion.button>
            )}

            {/* Bouton Retour secondaire */}
            {currentStep > 1 && (
              <motion.button
                onClick={handlePrev}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-3xl font-bold text-gray-600 bg-white shadow-md border-2 border-gray-200 flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Retour
              </motion.button>
            )}
          </div>
        </div>
      </SharedModal>
    </>
  );
}

/* ========================================
   ÉTAPE 1 : INTRODUCTION
======================================== */
function Step1({ primaryColor, role }: { primaryColor: string; role: RoleType }) {
  const texts = getRoleTexts(role);
  return (
    <div className="space-y-8 text-center">
      {/* Icône animée */}
      <motion.div
        className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}20` }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: {
            duration: 6,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        <Award className="w-12 h-12" style={{ color: primaryColor }} />
      </motion.div>

      {/* Titre */}
      <motion.h2
        className="text-2xl font-black text-gray-900"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Ton Score <span style={{ fontFamily: 'Calisga, serif', fontWeight: 700 }}>Jùlaba</span>
      </motion.h2>

      {/* Description */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-base text-gray-700 leading-relaxed">
          {texts.step1Sub1}
        </p>
        <p className="text-base text-gray-700 leading-relaxed">
          {texts.step1Sub2}
        </p>
      </motion.div>
    </div>
  );
}

/* ========================================
   ÉTAPE 2 : NIVEAU ACTUEL
======================================== */
function Step2({ 
  score, 
  scoreData, 
  primaryColor 
}: { 
  score: number; 
  scoreData: any; 
  primaryColor: string;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animation counter
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="space-y-6 w-full text-center">
      {/* Badge score animé */}
      <motion.div
        className="w-32 h-32 mx-auto rounded-full flex flex-col items-center justify-center border-4"
        style={{ borderColor: primaryColor }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
      >
        <motion.p
          className="text-5xl font-black"
          style={{ color: primaryColor }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          {animatedScore}
        </motion.p>
        <p className="text-sm text-gray-600 font-bold">/ 100</p>
      </motion.div>

      {/* Badge niveau */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div
          className="inline-block px-6 py-3 rounded-full text-white font-bold text-lg"
          style={{ backgroundColor: scoreData.level.color }}
        >
          Niveau {scoreData.level.name}
        </div>
      </motion.div>

      {/* Barre de progression */}
      <motion.div
        className="w-full space-y-3 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: primaryColor }}
            initial={{ width: 0 }}
            animate={{ width: `${scoreData.percentage}%` }}
            transition={{
              duration: 1.5,
              ease: 'easeOut',
            }}
          />
        </div>
        
        {/* Message progression */}
        {scoreData.nextLevel && (
          <motion.p
            className="text-sm text-gray-700 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Plus que <span className="font-black text-lg" style={{ color: primaryColor }}>{scoreData.pointsToNextLevel}</span> points pour devenir <span className="font-bold">{scoreData.nextLevel.name}</span>
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

/* ========================================
   ÉTAPE 3 : BÉNÉFICES
======================================== */
function Step3({ 
  scoreData, 
  primaryColor,
  role,
}: { 
  scoreData: any; 
  primaryColor: string;
  role: RoleType;
}) {
  const texts = getRoleTexts(role);
  return (
    <div className="space-y-6 w-full">
      {/* Icône */}
      <motion.div
        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}20` }}
        animate={{
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <Gift className="w-10 h-10" style={{ color: primaryColor }} />
      </motion.div>

      {/* Titre */}
      <h2 className="text-2xl font-black text-gray-900 text-center">
        {texts.step3Title}
      </h2>

      {/* Liste des bénéfices */}
      <div className="space-y-3">
        {scoreData.benefits.map((benefit: any, index: number) => (
          <motion.div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-2xl ${
              benefit.unlocked ? 'bg-green-50' : 'bg-gray-50'
            }`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={benefit.unlocked ? { scale: 1.02, x: 5 } : {}}
          >
            {benefit.unlocked ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  delay: index * 0.1 + 0.2,
                }}
              >
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              </motion.div>
            ) : (
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
            <div className="flex-1 text-left">
              <p className={`text-sm font-bold ${
                benefit.unlocked ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {benefit.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Message d'encouragement */}
      <motion.p
        className="text-sm text-gray-600 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: scoreData.benefits.length * 0.1 + 0.3 }}
      >
        {texts.step3Encouragement}
      </motion.p>
    </div>
  );
}

/* ========================================
   ÉTAPE 4 : COMMENT AMÉLIORER
======================================== */
function Step4({ 
  scoreData,
  primaryColor,
  role,
}: { 
  scoreData: any;
  primaryColor: string;
  role: RoleType;
}) {
  const texts = getRoleTexts(role);
  // Prendre les 5 premières actions dynamiques
  const topActions = scoreData.actions.slice(0, 5);
  
  // Map pour les icônes selon le type d'action
  const getIconForAction = (label: string) => {
    if (label.toLowerCase().includes('vent') || label.toLowerCase().includes('transaction')) return TrendingUp;
    if (label.toLowerCase().includes('journee') || label.toLowerCase().includes('ouvrir')) return Target;
    if (label.toLowerCase().includes('profil') || label.toLowerCase().includes('information')) return Award;
    if (label.toLowerCase().includes('academy') || label.toLowerCase().includes('formation')) return Zap;
    if (label.toLowerCase().includes('photo') || label.toLowerCase().includes('image')) return Gift;
    if (label.toLowerCase().includes('stock') || label.toLowerCase().includes('produit')) return TrendingUp;
    return Target; // Icône par défaut
  };

  return (
    <div className="space-y-4 w-full">
      {/* Icône */}
      <motion.div
        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}20` }}
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        <Zap className="w-8 h-8" style={{ color: primaryColor }} />
      </motion.div>

      {/* Titre */}
      <h2 className="text-xl font-black text-gray-900 text-center">
        {texts.step4Title}
      </h2>

      {/* Liste des actions dynamiques */}
      <div className="space-y-2">
        {topActions.map((action: any, index: number) => {
          const Icon = getIconForAction(action.label);
          return (
            <motion.div
              key={index}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.06,
                type: 'spring',
                stiffness: 200,
              }}
              whileHover={{
                scale: 1.02,
                borderColor: primaryColor,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: primaryColor }} />
                </div>
                <p className="text-sm font-bold text-gray-900">{action.label}</p>
              </div>
              <motion.div
                className="px-2.5 py-1 rounded-full text-white font-bold text-xs"
                style={{ backgroundColor: primaryColor }}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
              >
                +{action.points}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Astuce */}
      <motion.div
        className="p-2.5 rounded-2xl bg-amber-50 border-2 border-amber-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs text-amber-900 font-bold text-center">
          {texts.step4Tip}
        </p>
      </motion.div>
    </div>
  );
}

/* ========================================
   ÉTAPE 5 : ACTIONS
======================================== */
function Step5({ 
  scoreData, 
  primaryColor,
  role,
}: { 
  scoreData: any; 
  primaryColor: string;
  role: RoleType;
}) {
  const texts = getRoleTexts(role);
  const topActions = scoreData.actions.slice(0, 3);

  return (
    <div className="space-y-6 w-full">
      {/* Icône */}
      <motion.div
        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}20` }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <Target className="w-10 h-10" style={{ color: primaryColor }} />
      </motion.div>

      {/* Titre */}
      <h2 className="text-2xl font-black text-gray-900 text-center">
        {texts.step5Title}
      </h2>

      <p className="text-base text-gray-700 text-center">
        {texts.step5Sub}
      </p>

      {/* Top 3 actions */}
      <div className="space-y-3">
        {topActions.map((action: any, index: number) => (
          <motion.button
            key={index}
            className="w-full p-4 rounded-2xl border-2 transition-all text-left"
            style={{
              borderColor: primaryColor,
              backgroundColor: `${primaryColor}05`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.12,
              type: 'spring',
            }}
            whileHover={{
              scale: 1.02,
              backgroundColor: `${primaryColor}15`,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </div>
              </div>
              <motion.div
                className="px-3 py-1 rounded-full text-white font-bold text-sm"
                style={{ backgroundColor: primaryColor }}
                animate={{
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.3,
                }}
              >
                +{action.points}
              </motion.div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}