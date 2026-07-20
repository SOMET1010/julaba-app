/**
 * JULABA ACADEMY -- Interface ultra-simple pour acteurs vivriers
 * Cible : femmes du marche, producteurs ages, cooperatives rurales
 * Score Julaba = 0 a 100, jamais plus. Cliquable avec explication.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Flame, Star, CheckCircle, XCircle, Award, Volume2,
  ShoppingBag, Package, Wallet, TrendingUp, Users, Leaf, Sun, Droplets,
  MapPin, FileText, Clock, BarChart2, Target, BookOpen, Store, Send,
  RefreshCw, MessageSquare, Eye, UserCheck, Shield, Globe, Heart,
  CreditCard, AlertTriangle, Database, AlertCircle, Sprout,
  Truck, Phone, Lock, Play, Hand, Calendar, Trash2, Image, EyeOff,
  Mic, TrendingDown, List, Share2, Percent, Edit3, User, Plus, Bug, Wrench,
  ArrowDown, Minus, Building, Printer, Hash, Navigation, Map, Gift,
  UserPlus, PiggyBank, Moon, Shuffle, Mail, Snowflake, Smile, Circle,
  Bell, Zap, ThumbsUp, ThumbsDown, Wind, Utensils, Ban, UserX, Briefcase,
  X, Info, ChevronRight,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { UserRole } from './types';
import {
  AcademyQuestion,
  CHAPTER_THEMES,
} from './academyQuestions';
import { ROLE_COLORS } from './academyConfig';
import tataLouImg from "../../../assets/images/tantie-icon-marchand.png";
import { API_URL } from '../../utils/api';

// ── Icon registry ────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ShoppingBag, Package, Wallet, TrendingUp, Users, Leaf, Sun, Droplets,
  MapPin, FileText, Clock, BarChart2, Target, BookOpen, Store, Send,
  RefreshCw, MessageSquare, Eye, UserCheck, Shield, Globe, Heart,
  CreditCard, AlertTriangle, Database, ThumbsDown, AlertCircle, Sprout,
  Truck, Phone, Lock, Wind, Utensils, Hand, Ban, Calendar, Trash2,
  Image, EyeOff, UserX, Mic, Briefcase, TrendingDown, List, Share2,
  Percent, Edit3, User, Plus, Bug, Wrench, ArrowDown, Minus, Building,
  Printer, Hash, Navigation, Map, Gift, UserPlus, PiggyBank, Moon,
  Shuffle, Mail, Snowflake, Smile, Circle, Bell, CheckCircle, XCircle,
  Award, Zap, Star, ThumbsUp, Flame, ArrowLeft, ChevronRight, Play, Volume2,
};

function DynIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[name] || Target;
  return <Icon className={className} style={style} />;
}

// ── Types ────────────────────────────────────────────────────────────────────
type Screen = 'home' | 'map' | 'playing' | 'victory';
type TantieState = 'idle' | 'speaking' | 'correct' | 'wrong' | 'dancing';

interface Progress {
  completedLessons: string[];
  julabaScore: number; // 0-100 STRICT
  streak: number;
  lastPlayedDate: string;
  totalCorrect: number;
}

interface GameState {
  chapter: number;
  lesson: number;
  questions: AcademyQuestion[];
  questionIndex: number;
  selectedAnswer: number | null;
  answered: boolean;
  correctCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const URL_TO_ROLE: Record<string, UserRole> = {
  marchand: 'marchand', producteur: 'producteur',
  cooperative: 'cooperative', institution: 'institution',
  identificateur: 'identificateur', administrateur: 'institution',
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle les options d'une question et met a jour correctIndex
function shuffleQuestionOptions(q: AcademyQuestion): AcademyQuestion {
  const indices = [0, 1, 2, 3];
  const shuffled = shuffleArray(indices);
  const newOptions = shuffled.map(i => q.options[i]);
  const newCorrectIndex = shuffled.indexOf(q.correctIndex);
  return { ...q, options: newOptions, correctIndex: newCorrectIndex };
}

function getLessonKey(ch: number, le: number) { return `${ch}-${le}`; }

const QUESTIONS_PER_LESSON = 5;
const TOTAL_LESSONS = 15; // 3 chapitres × 5 lecons
const MAX_CORRECT = TOTAL_LESSONS * QUESTIONS_PER_LESSON; // 75

// Calcule le score Julaba (0-100) a partir du total de bonnes reponses
function computeJulabaScore(totalCorrect: number): number {
  return Math.min(100, Math.round((totalCorrect / MAX_CORRECT) * 100));
}

// Messages Tata Lou
const TANTIE_CORRECT = [
  'Bravo ! Tu es trop fort !', 'Waaaah ! Bonne reponse !',
  'C\'est ca ! Tu geres bien !', 'Oui ! Continue comme ca !',
];
const TANTIE_WRONG = [
  'Pas grave, retiens bien !', 'Presque ! Lis l\'explication.',
  'Courage ! La prochaine tu l\'auras !', 'Ce n\'est pas ca, mais tu apprendras !',
];

// ── Confettis ────────────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const items = Array.from({ length: 16 }, (_, i) => i);
  const colors = ['#FFD700', '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {items.map(i => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: colors[i % colors.length], left: `${Math.random() * 100}%`, top: '-10px' }}
          animate={{ y: ['0vh', '110vh'], x: [0, (Math.random() - 0.5) * 200], rotate: [0, Math.random() * 720 - 360], opacity: [1, 1, 0] }}
          transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// ── Modal Score Julaba (explication simple) ──────────────────────────────────
function ScoreExplainModal({ open, onClose, score, color, completedLessons }: {
  open: boolean; onClose: () => void; score: number; color: string; completedLessons: number;
}) {
  if (!open) return null;

  const level = score >= 80 ? 'Champion' : score >= 50 ? 'Bon joueur' : score >= 20 ? 'Apprenti' : 'Debutant';
  const levelColor = score >= 80 ? '#F59E0B' : score >= 50 ? '#10B981' : score >= 20 ? '#3B82F6' : '#9CA3AF';

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t-4 sm:border-2"
        style={{ borderColor: color }}
        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-gray-900 text-xl">Mon Score Julaba</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Score visuel */}
        <div className="text-center mb-5">
          <motion.div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-lg border-4 border-white mb-3"
            style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #e5e7eb 0deg)` }}
            animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-18 h-18 rounded-full bg-white flex items-center justify-center" style={{ width: '72px', height: '72px' }}>
              <span className="font-black text-2xl" style={{ color }}>{score}</span>
            </div>
          </motion.div>
          <p className="font-black text-lg" style={{ color: levelColor }}>Niveau : {level}</p>
        </div>

        {/* Explication simple */}
        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 font-semibold">
              Ton score va de <span className="font-black">0 a 100</span>. Il montre combien tu as appris sur les <span className="font-black">15 lecons</span>.
            </p>
          </div>
          <div className="flex items-start gap-3 bg-green-50 rounded-2xl p-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 font-semibold">
              Plus tu as de <span className="font-black text-green-700">bonnes reponses</span>, plus ton score monte !
            </p>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-3">
            <Award className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 font-semibold">
              Tu as fait <span className="font-black">{completedLessons} lecon{completedLessons > 1 ? 's' : ''}</span> sur 15. Continue pour monter ton score !
            </p>
          </div>
          <div className="flex items-start gap-3 bg-purple-50 rounded-2xl p-3">
            <Star className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 font-semibold">
              Un bon score = plus de <span className="font-black">confiance</span> des partenaires et fournisseurs.
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-200">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <p className="text-center text-sm font-bold mt-2" style={{ color }}>
            {100 - score > 0 ? `Encore ${100 - score} points pour etre au maximum !` : 'Felicitations ! Score maximum atteint !'}
          </p>
        </div>

        <motion.button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-black text-white text-lg"
          style={{ backgroundColor: color }}
          whileTap={{ scale: 0.97 }}
        >
          J'ai compris !
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function UniversalAcademy() {
  const navigate = useNavigate();
  const location = useLocation();
  const { speak } = useApp();
  const { user } = useUser();

  const urlSegment = location.pathname.split('/')[1];
  const role: UserRole = URL_TO_ROLE[urlSegment] ?? 'marchand';
  const primaryColor = ROLE_COLORS[role];
  const theme = CHAPTER_THEMES[role];

  const [screen, setScreen] = useState<Screen>('home');
  const [game, setGame] = useState<GameState | null>(null);
  const [tantieState, setTantieState] = useState<TantieState>('idle');
  const [tantieMsg, setTantieMsg] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [victoryData, setVictoryData] = useState<{ scoreGained: number; lessonKey: string } | null>(null);
  const [micOpen, setMicOpen] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Progress — chargé depuis API, plus de localStorage
  const [progress, setProgress] = useState<Progress>({
    completedLessons: [],
    julabaScore: 0,
    streak: 1,
    lastPlayedDate: '',
    totalCorrect: 0,
  });

  // Charger la progression depuis l'API au montage
  useEffect(() => {
    fetch(`${API_URL}/academy/my-progress`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.progress && Array.isArray(data.progress)) {
          const completedLessons = data.progress
            .filter((p: any) => p.completed)
            .map((p: any) => p.moduleId);
          const totalCorrect = data.progress.reduce((s: number, p: any) => s + (p.score || 0), 0);
          setProgress({
            completedLessons,
            julabaScore: computeJulabaScore(totalCorrect),
            streak: 1,
            lastPlayedDate: '',
            totalCorrect,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Streak check
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (progress.lastPlayedDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (progress.lastPlayedDate !== yesterday && progress.lastPlayedDate !== '') {
        setProgress(p => ({ ...p, streak: 1 }));
      }
    }
  }, []);

  const tantieSpeak = useCallback(async (msg: string, state: TantieState) => {
    setTantieMsg(msg);
    setTantieState(state);
    await speak(msg);
    setTimeout(() => { setTantieState('idle'); setTantieMsg(''); }, 3500);
  }, [speak]);

  // Start lesson - fetch questions from backend
  const startLesson = async (chapter: number, lesson: number) => {
    try {
      const res = await fetch(`${API_URL}/academy/questions?role=${role}&chapter=${chapter}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur chargement questions');
      const data = await res.json();
      const rawQuestions = (data.questions || data.data || []) as any[];

      // Mapper le format backend vers le format AcademyQuestion attendu par le gameplay
      const pool: AcademyQuestion[] = rawQuestions
        .filter(q => q.actif !== false)
        .map((q: any) => ({
          id: q.id,
          role: q.role as UserRole,
          chapter: q.chapter,
          lesson: q.lesson || 1,
          question: q.question,
          options: Array.isArray(q.options)
            ? q.options.map((o: any) => typeof o === 'string' ? { text: o, icon: 'Circle' } : { text: o.text || '', icon: o.icon || 'Circle' })
            : [],
          correctIndex: q.correctIndex ?? q.correct_index ?? 0,
          explanation: q.explication || q.explanation || '',
          active: q.actif !== false,
        }));

      // Garder uniquement les questions actives qui ont au moins 4 options
      const validPool = pool.filter(q => q.options.length >= 4);

      if (validPool.length === 0) {
        tantieSpeak('Pas encore de questions pour ce chapitre. Reviens bientôt !', 'speaking');
        return;
      }

      const questions = shuffleArray(validPool.map(shuffleQuestionOptions)).slice(0, QUESTIONS_PER_LESSON);
      setGame({ chapter, lesson, questions, questionIndex: 0, selectedAnswer: null, answered: false, correctCount: 0 });
      setScreen('playing');
      setTantieState('idle');
      const chapterName = chapter === 1 ? theme.ch1 : chapter === 2 ? theme.ch2 : theme.ch3;
      tantieSpeak(`C'est parti ! ${chapterName}. Ecoute bien !`, 'speaking');
    } catch {
      tantieSpeak('Erreur de chargement. Réessaie dans un instant.', 'wrong');
    }
  };

  // Answer
  const handleAnswer = (index: number) => {
    if (!game || game.answered) return;
    const q = game.questions[game.questionIndex];
    const isCorrect = index === q.correctIndex;
    const newCorrect = game.correctCount + (isCorrect ? 1 : 0);

    setGame(g => g ? { ...g, selectedAnswer: index, answered: true, correctCount: newCorrect } : g);

    if (isCorrect) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      tantieSpeak(TANTIE_CORRECT[Math.floor(Math.random() * TANTIE_CORRECT.length)], 'correct');
    } else {
      tantieSpeak(TANTIE_WRONG[Math.floor(Math.random() * TANTIE_WRONG.length)], 'wrong');
    }
  };

  // Next
  const handleNext = () => {
    if (!game) return;
    if (game.questionIndex + 1 >= game.questions.length) {
      const lessonKey = getLessonKey(game.chapter, game.lesson);
      const newTotalCorrect = progress.totalCorrect + game.correctCount;
      const newScore = computeJulabaScore(newTotalCorrect);
      const scoreGained = newScore - progress.julabaScore;
      setVictoryData({ scoreGained, lessonKey });

      setProgress(p => ({
        ...p,
        completedLessons: p.completedLessons.includes(lessonKey) ? p.completedLessons : [...p.completedLessons, lessonKey],
        totalCorrect: newTotalCorrect,
        julabaScore: newScore,
        lastPlayedDate: new Date().toISOString().split('T')[0],
      }));

      setScreen('victory');
    } else {
      setGame(g => g ? { ...g, questionIndex: g.questionIndex + 1, selectedAnswer: null, answered: false } : g);
      setTantieState('idle');
    }
  };

  // Unlock logic
  const isLessonUnlocked = (ch: number, le: number) => {
    if (ch === 1 && le === 1) return true;
    if (le === 1) {
      const prevChComplete = Array.from({ length: 5 }, (_, i) => i + 1)
        .filter(l => progress.completedLessons.includes(getLessonKey(ch - 1, l))).length;
      return prevChComplete >= 3;
    }
    return progress.completedLessons.includes(getLessonKey(ch, le - 1));
  };

  const handleBack = () => {
    if (screen === 'playing') { setScreen('map'); setGame(null); }
    else if (screen === 'map') setScreen('home');
    else if (screen === 'victory') setScreen('map');
    else navigate(`/${urlSegment}/profil`);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: HOME
  // ═══════════���════════════════════════════════════════════════════════════════
  if (screen === 'home') return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, ${primaryColor}12 0%, white 50%, ${primaryColor}08 100%)` }}>

      {/* Score Modal */}
      <AnimatePresence>
        {showScoreModal && (
          <ScoreExplainModal
            open={showScoreModal}
            onClose={() => setShowScoreModal(false)}
            score={progress.julabaScore}
            color={primaryColor}
            completedLessons={progress.completedLessons.length}
          />
        )}
      </AnimatePresence>

      {/* Header simple */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 gap-3">
        <motion.button
          onClick={handleBack}
          className="w-12 h-12 rounded-full bg-white shadow-md border-2 flex items-center justify-center flex-shrink-0"
          style={{ borderColor: `${primaryColor}40` }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
        </motion.button>

        {/* Score cliquable */}
        <motion.button
          onClick={() => setShowScoreModal(true)}
          className="flex items-center gap-2 px-5 h-12 rounded-full text-white shadow-lg flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
          animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}
          whileTap={{ scale: 0.95 }}
        >
          <Star className="w-5 h-5" />
          <span className="font-black text-lg">{progress.julabaScore}</span>
          <span className="text-sm opacity-80">/100</span>
        </motion.button>
      </div>

      {/* Tata Lou */}
      <div className="flex flex-col items-center px-6 pt-2 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative bg-white rounded-2xl px-6 py-3.5 shadow-lg border-2 text-center"
          style={{ borderColor: primaryColor }}
        >
          <p className="text-sm font-black text-gray-900 leading-snug whitespace-nowrap">
            Salut ! On apprend en s'amusant !
          </p>
          {/* Fleche vers le bas */}
          <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: `10px solid ${primaryColor}` }} />
          <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid white' }} />
        </motion.div>

        <motion.div
          className="mt-2"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <motion.img
            src={tataLouImg} alt="Tata Lou"
            className="w-40 h-auto object-contain"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }} className="text-center mt-3 mb-5"
        >
          <h1 className="text-3xl font-black text-gray-900">
            Julaba <span style={{ color: primaryColor }}>Academy</span>
          </h1>
          <p className="text-gray-500 mt-1 font-bold">Apprends et gagne des points !</p>
        </motion.div>

        {/* Score Julaba — CLIQUABLE */}
        <motion.button
          onClick={() => setShowScoreModal(true)}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full bg-white rounded-3xl p-5 shadow-lg border-2 mb-5 text-left"
          style={{ borderColor: `${primaryColor}30` }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 font-bold">Mon Score <span style={{ fontFamily: 'Calisga Bold, sans-serif' }}>J&#249;laba</span> Academy</p>
              <p className="text-3xl font-black" style={{ color: primaryColor }}>
                {progress.julabaScore}<span className="text-lg text-gray-400">/100</span>
              </p>
            </div>
            <motion.div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white"
              style={{ background: `conic-gradient(${primaryColor} ${progress.julabaScore * 3.6}deg, #e5e7eb 0deg)` }}
              animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <Star className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
            </motion.div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: primaryColor }}
              initial={{ width: 0 }} animate={{ width: `${progress.julabaScore}%` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400 font-bold">
              {100 - progress.julabaScore > 0 ? `Encore ${100 - progress.julabaScore} points` : 'Maximum !'}
            </p>
            <div className="flex items-center gap-1 text-xs font-bold" style={{ color: primaryColor }}>
              <Info className="w-3 h-3" />
              Comprendre
            </div>
          </div>
        </motion.button>

        {/* Stats simples — 2 cartes seulement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-3 w-full mb-6"
        >
          <motion.div
            className="bg-white rounded-2xl px-4 py-3 shadow-md border-2 border-gray-100"
            whileHover={{ y: -3 }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-black text-gray-900 text-2xl">{progress.completedLessons.length}</p>
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Award className="w-7 h-7" style={{ color: '#F59E0B' }} />
              </motion.div>
            </div>
            <p className="text-xs text-gray-500 font-bold">Lecons terminees</p>
          </motion.div>
          <motion.div
            className="bg-white rounded-2xl px-4 py-3 shadow-md border-2 border-gray-100"
            whileHover={{ y: -3 }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-black text-gray-900 text-2xl">{progress.streak}</p>
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>
                <Flame className="w-7 h-7 text-orange-500" />
              </motion.div>
            </div>
            <p className="text-xs text-gray-500 font-bold">{progress.streak > 1 ? 'Jours de suite' : 'Jour de suite'}</p>
          </motion.div>
        </motion.div>

        {/* Bouton JOUER — tres gros, tres visible */}
        <motion.button
          onClick={() => setScreen('map')}
          className="w-full py-7 rounded-3xl text-white shadow-2xl border-4 border-white/30 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}CC 100%)` }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.97 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          />
          <div className="relative z-10 flex items-center justify-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Play className="w-10 h-10" strokeWidth={3} />
            </motion.div>
            <span className="text-3xl font-black tracking-wide">JOUER !</span>
          </div>
        </motion.button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: MAP (Carte du savoir)
  // ════════════════════════════════════════════════════════════════════════════
  if (screen === 'map') {
    const chapters = [
      { num: 1, name: theme.ch1, icon: theme.icons[0], color: primaryColor },
      { num: 2, name: theme.ch2, icon: theme.icons[1], color: '#6366F1' },
      { num: 3, name: theme.ch3, icon: theme.icons[2], color: '#F59E0B' },
    ];

    return (
      <div className="min-h-screen pb-10" style={{ background: `linear-gradient(180deg, ${primaryColor}15 0%, white 30%)` }}>

        {/* Score Modal */}
        <AnimatePresence>
          {showScoreModal && (
            <ScoreExplainModal open={showScoreModal} onClose={() => setShowScoreModal(false)} score={progress.julabaScore} color={primaryColor} completedLessons={progress.completedLessons.length} />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-12 pb-6">
          <motion.button
            onClick={handleBack}
            className="w-12 h-12 rounded-full bg-white shadow-md border-2 flex items-center justify-center"
            style={{ borderColor: `${primaryColor}40` }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: primaryColor }} />
          </motion.button>
          <h1 className="text-xl font-black text-gray-900">Carte du savoir</h1>
          <motion.button
            onClick={() => setShowScoreModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white shadow-md"
            style={{ backgroundColor: primaryColor }}
            whileTap={{ scale: 0.95 }}
          >
            <Star className="w-4 h-4" />
            <span className="font-black text-sm">{progress.julabaScore}</span>
          </motion.button>
        </div>

        {/* Chapitres & Lecons */}
        <div className="px-4 space-y-8">
          {chapters.map((ch, chIdx) => {
            const completedInChapter = Array.from({ length: 5 }, (_, i) => i + 1)
              .filter(l => progress.completedLessons.includes(getLessonKey(ch.num, l))).length;
            const chapterUnlocked = ch.num === 1 || isLessonUnlocked(ch.num, 1);

            return (
              <motion.div
                key={ch.num}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: chIdx * 0.15 }}
              >
                {/* Chapter header */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white flex-shrink-0"
                      style={{ backgroundColor: chapterUnlocked ? ch.color : '#9CA3AF' }}
                      animate={chapterUnlocked ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <DynIcon name={ch.icon} className="w-7 h-7 text-white" />
                    </motion.div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold">Chapitre {ch.num}</p>
                      <h2 className="font-black text-gray-900 text-lg leading-tight">{ch.name}</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: ch.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedInChapter / 5) * 100}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                    <span className="text-sm font-black text-gray-500 flex-shrink-0">{completedInChapter}/5</span>
                  </div>
                </div>

                {/* Lessons — grosses tuiles faciles a toucher */}
                <div className="flex gap-2.5 overflow-x-auto pb-2 px-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((le) => {
                    const unlocked = isLessonUnlocked(ch.num, le);
                    const completed = progress.completedLessons.includes(getLessonKey(ch.num, le));
                    const isCurrent = !completed && unlocked;

                    return (
                      <motion.button
                        key={le}
                        onClick={() => unlocked && startLesson(ch.num, le)}
                        disabled={!unlocked}
                        className="flex flex-col items-center flex-shrink-0"
                        whileTap={unlocked ? { scale: 0.9 } : {}}
                      >
                        <motion.div
                          className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg border-3 relative"
                          style={{
                            backgroundColor: completed ? ch.color : isCurrent ? 'white' : '#F3F4F6',
                            borderColor: completed ? ch.color : isCurrent ? ch.color : '#E5E7EB',
                            borderWidth: '3px',
                          }}
                          animate={isCurrent ? {
                            boxShadow: [`0 0 0 0 ${ch.color}40`, `0 0 0 10px ${ch.color}00`],
                          } : {}}
                          transition={isCurrent ? { duration: 1.5, repeat: Infinity } : {}}
                        >
                          {completed ? (
                            <CheckCircle className="w-8 h-8 text-white" strokeWidth={3} />
                          ) : unlocked ? (
                            <>
                              <Star className="w-7 h-7" style={{ color: ch.color }} />
                              <span className="text-[10px] font-black mt-0.5" style={{ color: ch.color }}>{le}</span>
                            </>
                          ) : (
                            <Lock className="w-7 h-7 text-gray-400" />
                          )}
                          {isCurrent && (
                            <motion.div
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: ch.color }}
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                            >
                              <Play className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </motion.div>
                        <span className="text-xs text-gray-500 font-bold mt-1.5">L{le}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Checkpoint */}
                {chIdx < 2 && (
                  <motion.div className="mt-5 flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <motion.div
                      className="flex items-center gap-3 px-5 py-3 rounded-full border-2 bg-white shadow-md"
                      style={{ borderColor: `${ch.color}60` }}
                      animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Award className="w-5 h-5" style={{ color: ch.color }} />
                      <span className="text-sm font-bold text-gray-700">
                        {completedInChapter >= 3 ? `Chapitre ${ch.num + 1} debloque !` : `Fais 3 lecons pour debloquer le suivant`}
                      </span>
                      {completedInChapter >= 3 && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: PLAYING
  // ════════════════════════════════════════════════════════════════════════════
  if (screen === 'playing' && game) {
    const q = game.questions[game.questionIndex];
    const isCorrect = game.answered && game.selectedAnswer === q.correctIndex;
    const isWrong = game.answered && game.selectedAnswer !== q.correctIndex;
    const letters = ['A', 'B', 'C', 'D'];

    const ICON_COLORS = ['#F97316', '#3B82F6', '#22C55E', '#A855F7'];
    const ICON_GLOW = ['#FED7AA', '#BFDBFE', '#BBF7D0', '#E9D5FF'];

    return (
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${primaryColor}15 0%, white 35%, ${primaryColor}08 100%)` }}>
        <Confetti active={showConfetti} />

        {/* Barre de progression */}
        <div className="px-4 pt-10 pb-3">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white shadow-md border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: `${primaryColor}40` }}
              whileTap={{ scale: 0.9 }}
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </motion.button>
            <div className="flex-1 flex items-center gap-1.5">
              {game.questions.map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 h-3 rounded-full"
                  style={{ backgroundColor: i < game.questionIndex ? primaryColor : i === game.questionIndex ? `${primaryColor}55` : '#E5E7EB' }}
                  animate={i === game.questionIndex ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: '#10B981' }}>
              <CheckCircle className="w-4 h-4" strokeWidth={3} />
              <span className="font-black text-sm">{game.correctCount}</span>
            </div>
          </div>
        </div>

        {/* Tata Lou */}
        <div className="flex flex-col items-center px-6 pt-1 pb-2">
          <AnimatePresence mode="wait">
            {tantieMsg && (
              <motion.div
                key={tantieMsg}
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="px-5 py-3 rounded-3xl rounded-b-none shadow-xl border-2 text-center"
                style={{
                  maxWidth: '72%',
                  backgroundColor: isCorrect ? '#F0FDF4' : isWrong ? '#FEF2F2' : 'white',
                  borderColor: isCorrect ? '#10B981' : isWrong ? '#EF4444' : primaryColor,
                  borderBottomColor: 'transparent',
                }}
              >
                <p className="font-black text-sm leading-snug" style={{ color: isCorrect ? '#059669' : isWrong ? '#DC2626' : primaryColor }}>
                  {tantieMsg}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={
              tantieState === 'correct' ? { y: [0, -18, 0, -10, 0], rotate: [0, -12, 12, -6, 0] } :
              tantieState === 'wrong' ? { x: [-8, 8, -8, 8, 0] } :
              tantieState === 'dancing' ? { y: [0, -14, 0], rotate: [-6, 6, -6, 6, 0], scale: [1, 1.12, 1] } :
              tantieState === 'speaking' ? { scale: [1, 1.06, 1] } :
              { y: [0, -7, 0] }
            }
            transition={tantieState === 'idle' ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.55 }}
          >
            <img src={tataLouImg} alt="Tantie" className="w-28 h-auto object-contain drop-shadow-xl" />
          </motion.div>
        </div>

        {/* Question */}
        <div className="px-4 mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.96 }}
              className="bg-white rounded-3xl border-2 shadow-xl"
              style={{ borderColor: `${primaryColor}40` }}
            >
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-full text-white" style={{ backgroundColor: primaryColor }}>
                  {game.questionIndex + 1} / {game.questions.length}
                </span>
                <motion.button
                  onClick={() => speak(q.question)}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm"
                  style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
                  whileTap={{ scale: 0.88 }}
                >
                  <Volume2 className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="px-5 pb-5">
                <p className="font-black text-gray-900 leading-snug text-lg">{q.question}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Reponses 2x2 */}
        <div className="px-4 grid grid-cols-2 gap-3 pb-4">
          {q.options.map((opt, idx) => {
            const isSelected = game.selectedAnswer === idx;
            const isThisCorrect = idx === q.correctIndex;

            let cardBg = 'white';
            let cardBorder = `${primaryColor}30`;
            let textColor = '#1F2937';
            let iconColor = ICON_COLORS[idx];

            if (game.answered) {
              if (isThisCorrect) {
                cardBg = '#F0FDF4'; cardBorder = '#10B981'; textColor = '#065F46'; iconColor = '#16A34A';
              } else if (isSelected) {
                cardBg = '#FEF2F2'; cardBorder = '#EF4444'; textColor = '#991B1B'; iconColor = '#DC2626';
              } else {
                cardBg = '#F9FAFB'; cardBorder = '#E5E7EB'; textColor = '#9CA3AF'; iconColor = '#D1D5DB';
              }
            }

            return (
              <motion.button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={game.answered}
                className="rounded-3xl border-2 flex flex-col items-center justify-center gap-2 py-4 px-3 relative overflow-hidden"
                style={{ backgroundColor: cardBg, borderColor: cardBorder, minHeight: '140px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.08, type: 'spring', stiffness: 340, damping: 22 }}
                whileHover={!game.answered ? { scale: 1.05, y: -4 } : {}}
                whileTap={!game.answered ? { scale: 0.92 } : {}}
              >
                {/* Badge lettre */}
                <div className="absolute top-2 left-2.5 w-7 h-7 rounded-xl flex items-center justify-center border-2 bg-white"
                  style={{ borderColor: cardBorder }}>
                  {game.answered && isThisCorrect ? (
                    <CheckCircle className="w-4 h-4 text-green-500" strokeWidth={3} />
                  ) : game.answered && isSelected ? (
                    <XCircle className="w-4 h-4 text-red-500" strokeWidth={3} />
                  ) : (
                    <span className="font-black text-xs" style={{ color: primaryColor }}>{letters[idx]}</span>
                  )}
                </div>

                {/* Icone */}
                <motion.div
                  className="mt-2"
                  animate={
                    game.answered && isThisCorrect ? { scale: [1, 1.5, 1.2, 1.4, 1] } :
                    game.answered && isSelected ? { x: [0, -3, 3, -3, 0] } :
                    !game.answered ? { y: [0, -6, 0] } : {}
                  }
                  transition={!game.answered ? { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.3 } : { duration: 0.5 }}
                >
                  <DynIcon name={opt.icon} className="w-12 h-12" style={{ color: iconColor }} />
                </motion.div>

                {/* Texte */}
                <span className="font-black text-center leading-tight px-1 text-sm" style={{ color: textColor }}>
                  {opt.text}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Micro Tantie */}
        {!game.answered && (
          <div className="fixed bottom-6 left-0 right-0 z-40 flex flex-col items-center gap-2">
            <AnimatePresence>
              {micOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 16 }}
                  className="bg-white rounded-3xl shadow-2xl border-2 overflow-hidden"
                  style={{ borderColor: `${primaryColor}40`, width: '220px' }}
                >
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100" style={{ backgroundColor: `${primaryColor}10` }}>
                    <img src={tataLouImg} alt="Tantie" className="w-8 h-8 object-contain rounded-full" />
                    <p className="font-black text-sm" style={{ color: primaryColor }}>Tantie aide</p>
                  </div>
                  {[
                    { icon: Volume2, label: 'Repeter la question', action: () => { tantieSpeak(`Voici la question : ${q.question}`, 'speaking'); setMicOpen(false); } },
                    { icon: RefreshCw, label: 'Expliquer autrement', action: () => { tantieSpeak(`Lis bien chaque reponse. Elimine celles qui semblent fausses !`, 'speaking'); setMicOpen(false); } },
                    { icon: Target, label: 'Un indice', action: () => { tantieSpeak(`Pense bien... La bonne reponse parle de ${q.options[q.correctIndex].text.split(' ')[0]}.`, 'speaking'); setMicOpen(false); } },
                  ].map((item, i) => {
                    const Icon = item.icon || Zap;
                    return (
                      <motion.button key={i} onClick={item.action}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 active:bg-gray-50"
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      >
                        <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                          <Icon className="w-4 h-4" style={{ color: primaryColor }} />
                        </div>
                        <span className="font-bold text-sm text-gray-800">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => setMicOpen(o => !o)}
              className="relative w-14 h-14 rounded-full shadow-2xl border-4 border-white flex items-center justify-center"
              style={{ backgroundColor: micOpen ? '#EF4444' : primaryColor }}
              animate={{ scale: micOpen ? 1 : [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: micOpen ? 0 : Infinity }}
              whileTap={{ scale: 0.92 }}
            >
              {!micOpen && (
                <motion.div className="absolute inset-0 rounded-full" style={{ backgroundColor: primaryColor }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
              )}
              <motion.div animate={micOpen ? { rotate: 45 } : { rotate: 0 }} transition={{ duration: 0.22 }}>
                {micOpen ? <X className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </motion.div>
            </motion.button>
          </div>
        )}

        {/* Explication + Suivant */}
        <AnimatePresence>
          {game.answered && (
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} className="px-4 pt-2 pb-8">
              <motion.div
                className="rounded-2xl px-4 py-3 border-2 mb-3"
                style={{ backgroundColor: isCorrect ? '#F0FDF4' : '#FEF2F2', borderColor: isCorrect ? '#10B981' : '#EF4444' }}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm font-bold leading-snug" style={{ color: isCorrect ? '#065F46' : '#7F1D1D' }}>
                    {q.explanation}
                  </p>
                </div>
              </motion.div>

              <motion.button
                onClick={handleNext}
                className="w-full py-5 rounded-3xl text-white font-black text-xl shadow-2xl border-4 border-white/30 relative overflow-hidden"
                style={{ backgroundColor: isCorrect ? '#10B981' : '#6366F1' }}
                whileTap={{ scale: 0.97 }}
                animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 1, repeat: Infinity }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="relative z-10">
                  {game.questionIndex + 1 >= game.questions.length ? 'Voir mes resultats !' : 'Question suivante'}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: VICTORY
  // ════════════════════════════════════════════════════════════════════════════
  if (screen === 'victory' && game && victoryData) {
    const stars = game.correctCount >= 5 ? 3 : game.correctCount >= 3 ? 2 : 1;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-10 pt-16 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${primaryColor}20 0%, white 50%, ${primaryColor}10 100%)` }}>
        <Confetti active={true} />

        <motion.div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: primaryColor }}
          animate={{ scale: [1, 1.5, 1], rotate: [0, 180] }} transition={{ duration: 8, repeat: Infinity }} />

        {/* Tantie danse */}
        <motion.div animate={{ y: [0, -20, 0], rotate: [-5, 5, -5, 5, 0] }} transition={{ duration: 0.8, repeat: 4 }} className="mb-4 relative z-10">
          <img src={tataLouImg} alt="Tantie" className="w-36 h-auto object-contain" />
        </motion.div>

        {/* Titre */}
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.3 }} className="text-center mb-6 relative z-10">
          <h1 className="text-4xl font-black text-gray-900 mb-1">
            {game.correctCount === game.questions.length ? 'PARFAIT !' : game.correctCount >= 3 ? 'BIEN JOUE !' : 'CONTINUE !'}
          </h1>
          <p className="text-gray-500 font-bold text-lg">
            {game.correctCount}/{game.questions.length} bonnes reponses
          </p>
        </motion.div>

        {/* Etoiles */}
        <div className="flex gap-3 mb-6 relative z-10">
          {[1, 2, 3].map(s => (
            <motion.div key={s} initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: s <= stars ? 1 : 0.6, rotate: 0, opacity: s <= stars ? 1 : 0.3 }}
              transition={{ type: 'spring', delay: 0.5 + s * 0.15 }}>
              <Star className="w-14 h-14" style={{ color: s <= stars ? '#F59E0B' : '#D1D5DB' }} fill={s <= stars ? '#F59E0B' : 'none'} />
            </motion.div>
          ))}
        </div>

        {/* Recompense simple */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="bg-white rounded-3xl p-6 shadow-xl border-4 text-center mb-6 w-full max-w-xs relative z-10"
          style={{ borderColor: `${primaryColor}40` }}>
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: 3 }}>
            <Star className="w-12 h-12 mx-auto mb-2" style={{ color: primaryColor }} />
          </motion.div>
          <p className="text-4xl font-black" style={{ color: primaryColor }}>+{victoryData.scoreGained}</p>
          <p className="font-bold text-gray-500 mt-1">points sur ton Score Julaba</p>
        </motion.div>

        {/* Score actuel */}
        <motion.button
          onClick={() => setShowScoreModal(true)}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}
          className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border-2 mb-6 relative z-10 text-left"
          style={{ borderColor: `${primaryColor}30` }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-gray-700">Score Julaba</p>
            <p className="font-black text-2xl" style={{ color: primaryColor }}>{progress.julabaScore}/100</p>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: primaryColor }}
              initial={{ width: `${Math.max(0, progress.julabaScore - victoryData.scoreGained)}%` }}
              animate={{ width: `${progress.julabaScore}%` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 1.2 }} />
          </div>
          <p className="text-xs text-right mt-1 font-bold" style={{ color: primaryColor }}>
            Appuie pour comprendre ton score
          </p>
        </motion.button>

        {/* Score Modal */}
        <AnimatePresence>
          {showScoreModal && (
            <ScoreExplainModal open={showScoreModal} onClose={() => setShowScoreModal(false)} score={progress.julabaScore} color={primaryColor} completedLessons={progress.completedLessons.length} />
          )}
        </AnimatePresence>

        {/* Boutons */}
        <div className="flex flex-col gap-3 w-full max-w-xs relative z-10">
          <motion.button
            onClick={() => {
              const nextLesson = game.lesson < 5 ? game.lesson + 1 : null;
              const nextChapter = game.lesson >= 5 && game.chapter < 3 ? game.chapter + 1 : null;
              if (nextLesson && isLessonUnlocked(game.chapter, nextLesson)) {
                startLesson(game.chapter, nextLesson);
              } else if (nextChapter && isLessonUnlocked(nextChapter, 1)) {
                startLesson(nextChapter, 1);
              } else {
                setScreen('map');
              }
            }}
            className="py-5 rounded-3xl text-white font-black text-xl shadow-2xl border-4 border-white/30 overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="relative z-10">Continuer</span>
          </motion.button>

          <motion.button
            onClick={() => setScreen('map')}
            className="py-4 rounded-3xl font-bold text-gray-600 bg-white shadow-md border-2 border-gray-200"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
            whileTap={{ scale: 0.97 }}
          >
            Retour a la carte
          </motion.button>
        </div>
      </div>
    );
  }

  return null;
}