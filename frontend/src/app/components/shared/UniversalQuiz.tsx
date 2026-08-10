/**
 * 🎮 UNIVERSAL QUIZ - Système de Quiz Gamifié
 * 
 * Composant universel pour les quiz interactifs avec:
 * - Questions à choix multiples
 * - Feedback animé (bravo, encouragements)
 * - Système de points
 * - Badges et récompenses
 * - Support vocal avec Tata Nanti Lou
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Star,
  CheckCircle,
  XCircle,
  Lightbulb,
  Award,
  Target,
  Zap,
  TrendingUp,
  Gift,
  Crown,
  Sparkles,
  X,
} from 'lucide-react';
import { getRoleColor } from '../../config/roleConfig';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';

// Types
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index de la bonne réponse (0-3)
  explanation: string;
  category: string;
  difficulty: 'facile' | 'moyen' | 'difficile';
  points: number;
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  pointsEarned: number;
  badge?: string;
}

interface UniversalQuizProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  questions: QuizQuestion[];
  onComplete: (result: QuizResult) => void;
  onClose: () => void;
}

export function UniversalQuiz({ role, questions, onComplete, onClose }: UniversalQuizProps) {
  const { speak } = useApp();
  const { user, updateUser } = useUser();
  const activeColor = getRoleColor(role);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Messages de feedback
  const positiveMessages = [
    "Bravo ! Tu maîtrises le sujet ! 🎉",
    "Excellent ! Continue comme ça ! ⭐",
    "Parfait ! +{points} points pour toi ! 🏆",
    "Impressionnant ! Tu es un expert ! 🌟",
    "Super ! Tu progresses à grands pas ! 💪",
    "Formidable ! Encore un point pour toi ! 🎊",
  ];

  const encouragingMessages = [
    "Pas grave ! C'est en apprenant qu'on grandit 🌱",
    "Courage ! Retente ta chance 💪",
    "Bonne tentative ! Continue d'apprendre 📚",
    "Presque ! Tu y es presque ! 🎯",
    "C'est comme ça qu'on devient expert ! 💡",
  ];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return; // Empêcher de changer de réponse pendant le feedback

    setSelectedAnswer(answerIndex);
    setShowFeedback(true);

    const correct = answerIndex === currentQuestion.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
      setCorrectAnswers(correctAnswers + 1);
      setPointsEarned(pointsEarned + currentQuestion.points);
      setShowConfetti(true);

      // Feedback vocal positif
      const message = positiveMessages[Math.floor(Math.random() * positiveMessages.length)].replace(
        '{points}',
        currentQuestion.points.toString()
      );
      speak(message);

      // Arrêter les confettis après 2s
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setWrongAnswers(wrongAnswers + 1);

      // Feedback vocal encourageant
      const message = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
      speak(message);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
    } else {
      // Quiz terminé
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    setQuizCompleted(true);

    const result: QuizResult = {
      score: (score / questions.length) * 100,
      totalQuestions: questions.length,
      correctAnswers,
      wrongAnswers,
      pointsEarned,
      badge: determineBadge(score, questions.length),
    };

    // Mettre à jour le score de l'utilisateur
    if (user) {
      const newScore = user.scoreCredit + pointsEarned;
      updateUser({ scoreCredit: newScore });
    }

    // Feedback vocal final
    speak(
      `Quiz terminé ! Tu as ${correctAnswers} bonnes réponses sur ${questions.length}. Tu gagnes ${pointsEarned} points !`
    );

    onComplete(result);
  };

  const determineBadge = (correctCount: number, total: number): string | undefined => {
    const percentage = (correctCount / total) * 100;
    if (percentage === 100) return '🏆 Parfait !';
    if (percentage >= 80) return '🥇 Excellent !';
    if (percentage >= 60) return '🥈 Très bien !';
    if (percentage >= 40) return '🥉 Bien !';
    return undefined;
  };

  if (quizCompleted) {
    return (
      <QuizCompletionScreen
        score={score}
        totalQuestions={questions.length}
        pointsEarned={pointsEarned}
        badge={determineBadge(score, questions.length)}
        color={activeColor}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Confettis */}
        {showConfetti && <Confetti />}

        {/* Header */}
        <div className="p-6 border-b border-gray-200" style={{ background: `linear-gradient(135deg, ${activeColor}15, white)` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: activeColor }}>
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Quiz JULABA</h2>
                <p className="text-sm text-gray-600">{currentQuestion.category}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">
                Question {currentQuestionIndex + 1} / {questions.length}
              </span>
              <span className="font-bold" style={{ color: activeColor }}>
                {pointsEarned} points
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: activeColor }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <div className="flex items-start gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${activeColor}20` }}
              >
                <Lightbulb className="w-5 h-5" style={{ color: activeColor }} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-relaxed">{currentQuestion.question}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
                  >
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-xs font-semibold text-gray-600">+{currentQuestion.points} points</span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === currentQuestion.correctAnswer;
                const showCorrect = showFeedback && isCorrectAnswer;
                const showWrong = showFeedback && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`w-full p-4 rounded-2xl text-left font-semibold transition-all border-2 ${
                      showCorrect
                        ? 'bg-green-50 border-green-500'
                        : showWrong
                        ? 'bg-red-50 border-red-500'
                        : isSelected
                        ? 'border-gray-400'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    whileHover={{ scale: showFeedback ? 1 : 1.02 }}
                    whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            showCorrect
                              ? 'bg-green-500 text-white'
                              : showWrong
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-gray-900">{option}</span>
                      </div>
                      {showCorrect && <CheckCircle className="w-6 h-6 text-green-500" />}
                      {showWrong && <XCircle className="w-6 h-6 text-red-500" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Feedback */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-2xl mb-6 ${isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-blue-50 border-2 border-blue-300'}`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <Sparkles className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-bold mb-1 ${isCorrect ? 'text-green-900' : 'text-blue-900'}`}>
                      {isCorrect ? positiveMessages[Math.floor(Math.random() * positiveMessages.length)].replace('{points}', currentQuestion.points.toString()) : encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]}
                    </p>
                    <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton Suivant */}
          {showFeedback && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleNextQuestion}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg"
              style={{ backgroundColor: activeColor }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {currentQuestionIndex < questions.length - 1 ? 'Question suivante →' : 'Voir mes résultats 🏆'}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Écran de complétion
function QuizCompletionScreen({
  score,
  totalQuestions,
  pointsEarned,
  badge,
  color,
  onClose,
}: {
  score: number;
  totalQuestions: number;
  pointsEarned: number;
  badge?: string;
  color: string;
  onClose: () => void;
}) {
  const percentage = (score / totalQuestions) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Confettis permanents */}
        <Confetti />

        {/* Header */}
        <div className="text-center p-8" style={{ background: `linear-gradient(135deg, ${color}20, white)` }}>
          <motion.div
            animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: 1 }}
            className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>

          <h2 className="text-3xl font-black text-gray-900 mb-2">Quiz Terminé !</h2>
          {badge && (
            <p className="text-2xl font-bold mb-4" style={{ color }}>
              {badge}
            </p>
          )}
        </div>

        {/* Résultats */}
        <div className="p-6 space-y-4">
          {/* Score */}
          <div className="text-center p-6 rounded-2xl" style={{ backgroundColor: `${color}10` }}>
            <p className="text-sm font-semibold text-gray-600 mb-2">Ton score</p>
            <p className="text-6xl font-black mb-2" style={{ color }}>
              {score}/{totalQuestions}
            </p>
            <p className="text-lg font-bold text-gray-700">{Math.round(percentage)}% de réussite</p>
          </div>

          {/* Points gagnés */}
          <div className="flex items-center justify-center gap-3 p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-300">
            <Star className="w-8 h-8 text-yellow-500" fill="currentColor" />
            <div>
              <p className="text-sm font-semibold text-gray-600">Points gagnés</p>
              <p className="text-3xl font-black text-yellow-600">+{pointsEarned}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-black text-green-700">{score}</p>
              <p className="text-xs font-semibold text-gray-600">Correctes</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-center">
              <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-black text-red-700">{totalQuestions - score}</p>
              <p className="text-xs font-semibold text-gray-600">Incorrectes</p>
            </div>
          </div>

          {/* Bouton */}
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg"
            style={{ backgroundColor: color }}
          >
            Terminer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Composant Confetti
function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][i % 5],
            left: `${Math.random() * 100}%`,
            top: -20,
          }}
          animate={{
            y: ['0vh', '100vh'],
            x: [0, Math.random() * 100 - 50],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}