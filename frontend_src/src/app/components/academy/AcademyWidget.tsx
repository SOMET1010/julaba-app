import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Flame, Star, Clock, ChevronRight } from 'lucide-react';
import { UserRole } from './types';
import { ROLE_COLORS } from './academyConfig';

interface AcademyWidgetProps {
  role: UserRole;
  currentStreak: number;
  currentLevel: string;
  formationDuJour: {
    title: string;
    duration: number;
    points: number;
  };
  onClick: () => void;
}

export function AcademyWidget({
  role,
  currentStreak,
  currentLevel,
  formationDuJour,
  onClick,
}: AcademyWidgetProps) {
  const roleColor = ROLE_COLORS[role];

  return (
    <motion.div
      className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg cursor-pointer"
      style={{
        borderLeft: `4px solid ${roleColor}`,
      }}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Background Pattern */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-5"
        style={{
          background: `radial-gradient(circle, ${roleColor} 0%, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-[16px] flex items-center justify-center"
            style={{ backgroundColor: `${roleColor}20` }}
            animate={{
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.1, 1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut',
            }}
          >
            <motion.div
              animate={{
                y: [0, -3, 0, -3, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 3.5,
                ease: 'easeInOut',
              }}
            >
              <GraduationCap className="w-6 h-6" style={{ color: roleColor }} strokeWidth={2.5} />
            </motion.div>
          </motion.div>
          <div>
            <h3 className="font-black text-lg text-gray-900">JÙLABA Academy</h3>
            <p className="text-xs text-gray-500 font-medium">Formation du jour</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Streak */}
        <div className="flex items-center gap-2 bg-white rounded-[12px] p-3 shadow-sm">
          <motion.div
            animate={{
              scale: [1, 1.2, 1, 1.2, 1],
              rotate: [0, -5, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
          >
            <Flame className="w-5 h-5 text-orange-500" />
          </motion.div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Streak</p>
            <p className="text-lg font-black text-gray-900">{currentStreak} jours</p>
          </div>
        </div>

        {/* Niveau */}
        <div className="flex items-center gap-2 bg-white rounded-[12px] p-3 shadow-sm">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 4,
              ease: 'easeInOut',
            }}
          >
            <Star className="w-5 h-5" style={{ color: roleColor }} />
          </motion.div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Niveau</p>
            <p className="text-lg font-black text-gray-900">{currentLevel}</p>
          </div>
        </div>
      </div>

      {/* Formation du jour */}
      <div className="bg-white rounded-[16px] p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-800 mb-2 leading-snug">
          {formationDuJour.title}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formationDuJour.duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" style={{ color: roleColor }} />
            <span className="font-bold" style={{ color: roleColor }}>
              +{formationDuJour.points} XP
            </span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <motion.button
        className="w-full mt-4 py-3 rounded-[16px] font-bold text-sm text-white shadow-md"
        style={{ backgroundColor: roleColor }}
        whileHover={{ scale: 1.03, boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}
        whileTap={{ scale: 0.97 }}
      >
        Commencer
      </motion.button>
    </motion.div>
  );
}