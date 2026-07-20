/**
 * 🃏 JULABA SHARED CARD
 * 
 * Composant card unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { MOTION, SHADOWS } from '../../styles/design-tokens';
import { cn } from '../ui/utils';

export interface SharedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Contenu de la card */
  children: React.ReactNode;
  
  /** Variant de la card */
  variant?: 'default' | 'elevated' | 'flat';
  
  /** Activer l'effet hover */
  hoverable?: boolean;
  
  /** Clickable (ajoute un curseur pointer) */
  clickable?: boolean;
  
  /** Padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function SharedCard({
  children,
  variant = 'default',
  hoverable = false,
  clickable = false,
  padding = 'md',
  className,
  ...props
}: SharedCardProps) {
  // Classes de base
  const baseClasses = cn(
    'bg-white rounded-2xl',
    'transition-all duration-200',
    clickable && 'cursor-pointer',
  );
  
  // Classes de variant
  const variantClasses = {
    default: 'shadow-md',
    elevated: 'shadow-lg',
    flat: 'border-2 border-gray-200',
  }[variant];
  
  // Classes de padding
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];
  
  return (
    <motion.div
      className={cn(baseClasses, variantClasses, paddingClasses, className)}
      whileHover={hoverable ? { y: -4, boxShadow: SHADOWS.cardHover } : undefined}
      whileTap={clickable ? MOTION.tap : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
