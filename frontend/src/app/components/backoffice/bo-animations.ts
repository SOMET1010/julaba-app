// ─── Animations partagees Back-Office JULABA ──────────────────────────────────
// Presets Motion pour une UI premium et coherente.
// AUCUNE logique metier ici — uniquement des constantes d'animation.

import type { Transition, Variant } from 'motion/react';

// ── Transitions ─────────────────────────────────────────────────────────────
export const springSnappy: Transition = { type: 'spring', stiffness: 400, damping: 28 };
export const springGentle: Transition = { type: 'spring', stiffness: 260, damping: 24 };
export const springBouncy: Transition = { type: 'spring', stiffness: 300, damping: 18 };
export const easeSlow: Transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] };

// ── Entrees staggerees ──────────────────────────────────────────────────────
export const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { ...springGentle, delay },
});

export const fadeInLeft = (delay = 0) => ({
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { ...springGentle, delay },
});

export const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { ...springSnappy, delay },
});

// ── Hover presets ───────────────────────────────────────────────────────────
export const hoverLift = {
  whileHover: { y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } },
  whileTap: { scale: 0.97 },
};

export const hoverGlow = (color: string) => ({
  whileHover: { y: -3, boxShadow: `0 12px 32px ${color}25, 0 0 0 1px ${color}15`, transition: springSnappy },
  whileTap: { scale: 0.97 },
});

export const hoverScale = {
  whileHover: { scale: 1.02, transition: springSnappy },
  whileTap: { scale: 0.97 },
};

export const hoverButton = {
  whileHover: { scale: 1.04, y: -2, transition: springSnappy },
  whileTap: { scale: 0.95 },
};

// ── Micro-animations icones ─────────────────────────────────────────────────
export const iconPulse = {
  animate: { scale: [1, 1.12, 1] },
  transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
};

export const iconFloat = {
  animate: { y: [0, -3, 0] },
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
};

export const iconSpin = {
  animate: { rotate: [0, 8, -8, 0] },
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
};

// ── Compteur anime (counting effect) ────────────────────────────────────────
export const COUNTER_DURATION = 1200; // ms

// ── Glass effect classes ────────────────────────────────────────────────────
export const glassCard = 'backdrop-blur-xl bg-white/70 border-white/40';
export const glassDark = 'backdrop-blur-xl bg-black/30 border-white/10';

// ── Row highlight ───────────────────────────────────────────────────────────
export const rowHover = {
  whileHover: { backgroundColor: 'rgba(159, 129, 112, 0.04)', y: -1, transition: { duration: 0.2 } },
};
