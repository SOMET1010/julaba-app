import React from 'react';
import { motion } from 'motion/react';
import { BO_PRIMARY } from './bo-theme';

interface BOProgressBarProps {
  /** Pourcentage de remplissage (0–100) */
  value: number;
  /** Couleur de la barre remplie */
  color?: string;
  /** Hauteur de la barre */
  height?: 'xs' | 'sm' | 'md' | 'lg';
  /** Délai avant le démarrage de l'animation (secondes) */
  delay?: number;
  /** Largeur max du conteneur */
  maxWidth?: string;
  /** Afficher le shimmer animé */
  shimmer?: boolean;
  /** Afficher le glow pulsant */
  glow?: boolean;
  /** Classes supplémentaires pour le conteneur */
  className?: string;
}

const HEIGHT_MAP = {
  xs: 'h-1.5',
  sm: 'h-2.5',
  md: 'h-3',
  lg: 'h-4',
};

export function BOProgressBar({
  value,
  color = BO_PRIMARY,
  height = 'md',
  delay = 0,
  maxWidth,
  shimmer = true,
  glow = true,
  className = '',
}: BOProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.md;

  return (
    <div
      className={`${heightClass} bg-gray-200 rounded-full overflow-hidden border border-gray-300 relative ${className}`}
      style={maxWidth ? { maxWidth } : undefined}
    >
      {/* Barre remplie animée */}
      <motion.div
        className="h-full rounded-full relative overflow-hidden"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${clampedValue}%` }}
        transition={{
          duration: 1.2,
          ease: [0.25, 0.46, 0.45, 0.94],
          delay,
        }}
      >
        {/* Shimmer overlay animé */}
        {shimmer && clampedValue > 5 && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut',
              delay: delay + 1.2,
            }}
          />
        )}

        {/* Gradient subtil pour la profondeur */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 60%, rgba(0,0,0,0.08) 100%)',
          }}
        />
      </motion.div>

      {/* Glow pulsant sur la barre */}
      {glow && clampedValue > 10 && (
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
          style={{
            boxShadow: `0 0 8px ${color}60, inset 0 0 4px ${color}30`,
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={{
            width: `${clampedValue}%`,
            opacity: [0, 0.6, 0.3, 0.6],
          }}
          transition={{
            width: { duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay },
            opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: delay + 1.2 },
          }}
        />
      )}
    </div>
  );
}