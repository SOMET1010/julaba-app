/**
 * JULABA — Composant Montant Universel v1
 *
 * - Chiffre animé (CountUp depuis 0)
 * - "FCFA" affiché en plus petit que le chiffre
 * - Unité (kg / litre / régime / Tas…) à la même taille que FCFA
 * - MontantCard : effet shimmer continu + reflet au hover + gloss
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

// ─── useCountUp hook ────────────────────────────────────────────

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (isNaN(target)) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      const animate = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const elapsed = ts - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setDisplay(target);
        }
      };
      startRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      timeoutId = setTimeout(run, delay);
    } else {
      run();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [target, duration, delay]);

  return display;
}

// ─── Montant ────────────────────────────────────────────────────

export type MontantSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const NUMBER_CLASSES: Record<MontantSize, string> = {
  xs:  'text-xs',
  sm:  'text-sm',
  md:  'text-base',
  lg:  'text-xl',
  xl:  'text-3xl',
  '2xl': 'text-4xl',
};

// FCFA / unité = environ 55% de la taille du chiffre
const UNIT_CLASSES: Record<MontantSize, string> = {
  xs:  'text-[8px]',
  sm:  'text-[9px]',
  md:  'text-[10px]',
  lg:  'text-xs',
  xl:  'text-sm',
  '2xl': 'text-base',
};

interface MontantProps {
  /** Valeur numérique */
  value: number;
  /** Unité après FCFA : kg, litre, régime, Tas, etc. */
  unit?: string;
  /** Taille globale du composant */
  size?: MontantSize;
  /** Couleur du texte */
  color?: string;
  /** Classes CSS additionnelles sur le conteneur */
  className?: string;
  /** Afficher un signe + pour les positifs */
  showPlus?: boolean;
  /** Durée animation CountUp (ms) */
  animDuration?: number;
  /** Délai avant animation (ms) */
  animDelay?: number;
  /** Préfixe (ex: "-") */
  prefix?: string;
}

export function Montant({
  value,
  unit,
  size = 'md',
  color,
  className = '',
  showPlus = false,
  animDuration = 1200,
  animDelay = 0,
  prefix,
}: MontantProps) {
  const displayed = useCountUp(Math.abs(value), animDuration, animDelay);
  const sign = value < 0 ? '-' : showPlus && value > 0 ? '+' : '';
  const manualPrefix = prefix ?? '';

  return (
    <span
      className={`inline-flex items-baseline gap-[3px] font-black leading-none ${NUMBER_CLASSES[size]} ${className}`}
      style={color ? { color } : undefined}
    >
      {/* Signe / préfixe */}
      {(sign || manualPrefix) && (
        <span>{sign || manualPrefix}</span>
      )}

      {/* Chiffre animé */}
      <span>{(displayed || 0).toLocaleString('fr-FR')}</span>

      {/* FCFA petit */}
      <span className={`font-bold opacity-80 ${UNIT_CLASSES[size]}`}>
        FCFA
        {unit && <span className="ml-[2px]">/{unit}</span>}
      </span>
    </span>
  );
}

// ─── MontantCard ─────────────────────────────────────────────────
// Wrapper qui ajoute : shimmer animé + reflet au hover + glow subtil

interface MontantCardProps {
  children: React.ReactNode;
  /** Couleur d'accent pour le glow/shimmer */
  accentColor?: string;
  className?: string;
  /** Désactiver l'effet shimmer */
  noShimmer?: boolean;
}

export function MontantCard({
  children,
  accentColor = '#C46210',
  className = '',
  noShimmer = false,
}: MontantCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 200, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 30 });

  const rotateX = useTransform(springY, [-50, 50], [4, -4]);
  const rotateY = useTransform(springX, [-50, 50], [-4, 4]);

  const reflectX = useTransform(springX, [-50, 50], ['0%', '100%']);
  const reflectY = useTransform(springY, [-50, 50], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 800,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Shimmer continu */}
      {!noShimmer && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `linear-gradient(105deg,
              transparent 20%,
              ${accentColor}18 40%,
              rgba(255,255,255,0.35) 50%,
              ${accentColor}10 60%,
              transparent 80%)`,
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 1.5,
          }}
        />
      )}

      {/* Reflet de la souris */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          background: useTransform(
            [reflectX, reflectY],
            ([rx, ry]) =>
              `radial-gradient(circle at ${rx} ${ry}, rgba(255,255,255,0.18) 0%, transparent 60%)`
          ),
        }}
      />
    </motion.div>
  );
}