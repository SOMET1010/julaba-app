import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, ChevronRight, ChevronLeft, Trophy, Star } from 'lucide-react';
import { UserRole } from './types';
import { ROLE_COLORS } from './academyConfig';
import { useApp } from '../../contexts/AppContext';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface FormationContent {
  title: string;
  content: string;
  example?: string;
  bulletPoints?: string[];
}

interface FormationDuJourProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  formation: {
    id: string;
    title: string;
    duration: number;
    points: number;
    content: FormationContent;
    questions: Question[];
  };
  onComplete: (score: number, xpGained: number, scoreJulabaBonus: number) => void;
}

export function FormationDuJour({
  isOpen,
  onClose,
  role,
  formation,
  onComplete,
}: FormationDuJourProps) {
  const { speak } = useApp();
  const roleColor = ROLE_COLORS[role];

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const totalSteps = 1 + formation.questions.length + 1; // Contenu + Questions + Résultat

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
  };

  const handleValidateAnswer = () => {
    if (selectedAnswer === null) return;

    const currentQuestion = formation.questions[currentStep - 1];
    const correct = selectedAnswer === currentQuestion.correctAnswer;

    setIsCorrect(correct);
    setShowFeedback(true);
    setAnswers([...answers, selectedAnswer]);

    if (correct) {
      speak('Bonne réponse !');
    } else {
      speak('Pas tout à fait. Voici l\'explication.');
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // Passer du contenu à la première question
      setCurrentStep(1);
    } else if (currentStep <= formation.questions.length) {
      // Passer à la question suivante ou au résultat
      setShowFeedback(false);
      setSelectedAnswer(null);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setShowFeedback(false);
      setSelectedAnswer(null);
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateResults = () => {
    const correctAnswers = answers.filter(
      (answer, index) => answer === formation.questions[index].correctAnswer
    ).length;
    const score = Math.round((correctAnswers / formation.questions.length) * 100);
    const baseXP = correctAnswers * 10;
    const bonusXP = score === 100 ? 20 : 0;
    const totalXP = baseXP + bonusXP;

    return { correctAnswers, score, totalXP };
  };

  const handleFinish = () => {
    const { score, totalXP } = calculateResults();
    const julabaBonus = Math.floor(totalXP / 10);
    onComplete(score, totalXP, julabaBonus);
    onClose();
  };

  const handleListenContent = () => {
    if (currentStep === 0) {
      speak(formation.content.content);
    } else if (currentStep <= formation.questions.length) {
      const question = formation.questions[currentStep - 1];
      speak(question.question);
    }
  };

  const renderContent = () => {
    // Étape 1 : Contenu pédagogique
    if (currentStep === 0) {
      return (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-4">{formation.title}</h2>

            <div className="bg-white rounded-[20px] p-6 shadow-sm mb-4">
              <p className="text-base text-gray-700 leading-relaxed mb-4">
                {formation.content.content}
              </p>

              {formation.content.example && (
                <div
                  className="p-4 rounded-[16px] mb-4"
                  style={{ backgroundColor: `${roleColor}10` }}
                >
                  <p className="text-sm font-bold text-gray-700 mb-2">Exemple concret :</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {formation.content.example}
                  </p>
                </div>
              )}

              {formation.content.bulletPoints && formation.content.bulletPoints.length > 0 && (
                <div className="space-y-2">
                  {formation.content.bulletPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                        style={{ backgroundColor: roleColor }}
                      />
                      <p className="text-sm text-gray-700">{point}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleListenContent}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-[12px]"
              style={{ color: roleColor, backgroundColor: `${roleColor}10` }}
            >
              <Volume2 className="w-4 h-4" />
              Écouter avec Tata Lou
            </button>
          </div>
        </div>
      );
    }

    // Étapes 2-4 : Questions
    if (currentStep <= formation.questions.length) {
      const questionIndex = currentStep - 1;
      const question = formation.questions[questionIndex];

      return (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <p className="text-sm font-bold text-gray-500 mb-2">
                Question {currentStep}/{formation.questions.length}
              </p>
              <h2 className="text-xl font-black text-gray-900">{question.question}</h2>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === question.correctAnswer;
                const showCorrect = showFeedback && isCorrectAnswer;
                const showIncorrect = showFeedback && isSelected && !isCorrectAnswer;

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className="w-full text-left p-4 rounded-[16px] border-2 transition-all"
                    style={{
                      borderColor: showCorrect
                        ? '#10B981'
                        : showIncorrect
                        ? '#EF4444'
                        : isSelected
                        ? roleColor
                        : '#E5E7EB',
                      backgroundColor: showCorrect
                        ? '#D1FAE5'
                        : showIncorrect
                        ? '#FEE2E2'
                        : isSelected
                        ? `${roleColor}10`
                        : '#FFFFFF',
                    }}
                    whileHover={{ scale: showFeedback ? 1 : 1.02 }}
                    whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{
                          borderColor: showCorrect
                            ? '#10B981'
                            : showIncorrect
                            ? '#EF4444'
                            : isSelected
                            ? roleColor
                            : '#D1D5DB',
                          backgroundColor: isSelected ? roleColor : 'transparent',
                        }}
                      >
                        {isSelected && !showFeedback && (
                          <div className="w-3 h-3 rounded-full bg-white" />
                        )}
                        {showCorrect && <span className="text-green-600 text-sm">✓</span>}
                        {showIncorrect && <span className="text-red-600 text-sm">✗</span>}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{option}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-[16px] mb-4"
                style={{
                  backgroundColor: isCorrect ? '#D1FAE5' : '#FEF3C7',
                  borderLeft: `4px solid ${isCorrect ? '#10B981' : '#F59E0B'}`,
                }}
              >
                <p className="font-bold text-sm mb-2" style={{ color: isCorrect ? '#10B981' : '#F59E0B' }}>
                  {isCorrect ? 'Bonne réponse ! +10 XP' : 'Pas tout à fait...'}
                </p>
                <p className="text-sm text-gray-700">{question.explanation}</p>
              </motion.div>
            )}

            {/* Validate Button */}
            {!showFeedback && (
              <button
                onClick={handleValidateAnswer}
                disabled={selectedAnswer === null}
                className="w-full py-3 rounded-[16px] font-bold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: roleColor }}
              >
                Valider
              </button>
            )}
          </div>
        </div>
      );
    }

    // Étape 5 : Résultat
    const { correctAnswers, score, totalXP } = calculateResults();
    const julabaBonus = Math.floor(totalXP / 10);

    return (
      <div className="flex-1 overflow-y-auto px-6 py-4 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            <Trophy className="w-20 h-20 mx-auto mb-4" style={{ color: roleColor }} />
          </motion.div>

          <h2 className="text-3xl font-black text-gray-900 mb-2">Module complété !</h2>

          <div className="bg-white rounded-[20px] p-6 shadow-lg mb-6">
            <p className="text-lg font-bold text-gray-700 mb-4">
              Score : {score}% ({correctAnswers}/{formation.questions.length})
            </p>

            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-[12px]">
                <span className="text-sm font-semibold text-gray-700">Bonnes réponses</span>
                <span className="text-sm font-black" style={{ color: roleColor }}>
                  +{correctAnswers * 10} XP
                </span>
              </div>

              {score === 100 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-[12px]">
                  <span className="text-sm font-semibold text-gray-700">Bonus perfection</span>
                  <span className="text-sm font-black" style={{ color: roleColor }}>
                    +20 XP
                  </span>
                </div>
              )}

              <div
                className="flex items-center justify-between p-3 rounded-[12px] border-2"
                style={{ borderColor: roleColor, backgroundColor: `${roleColor}10` }}
              >
                <span className="text-sm font-bold text-gray-900">Total XP</span>
                <span className="text-xl font-black" style={{ color: roleColor }}>
                  +{totalXP} XP
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-[12px]">
                <span className="text-sm font-semibold text-gray-700">Score JÙLABA</span>
                <span className="text-sm font-black text-gray-900">+{julabaBonus} points</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-4 rounded-[16px] font-bold text-white shadow-lg"
            style={{ backgroundColor: roleColor }}
          >
            Continuer
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full h-full max-w-4xl bg-white flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: `${roleColor}20` }}
            >
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="p-2 rounded-[12px] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500">
                    Étape {currentStep + 1}/{totalSteps}
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: roleColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="ml-4 p-2 rounded-[12px] hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Content */}
            {renderContent()}

            {/* Footer Navigation */}
            {currentStep < totalSteps - 1 && (
              <div className="px-6 py-4 border-t" style={{ borderColor: `${roleColor}20` }}>
                <button
                  onClick={handleNext}
                  disabled={currentStep > 0 && currentStep <= formation.questions.length && !showFeedback}
                  className="w-full py-3 rounded-[16px] font-bold text-white shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: roleColor }}
                >
                  {currentStep === 0 ? 'Commencer le quiz' : 'Question suivante'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}