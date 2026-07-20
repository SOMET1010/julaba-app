/**
 * 🏷️ JULABA SHARED BADGE
 * 
 * Composant badge unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React from 'react';
import { motion } from 'motion/react';
import { getRoleColor, UserRole } from '../../styles/design-tokens';
import { cn } from '../ui/utils';

export interface SharedBadgeProps {
  /** Contenu du badge */
  children: React.ReactNode;
  
  /** Variant du badge */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'soumis' | 'valide' | 'rejete' | 'complement' | 'en_attente';
  
  /** Taille du badge */
  size?: 'sm' | 'md' | 'lg';
  
  /** Rôle pour la couleur primaire */
  role?: UserRole;
  
  /** Icône à gauche */
  icon?: React.ReactNode;
  
  /** Dot indicator */
  dot?: boolean;
  
  /** Classes additionnelles */
  className?: string;
}

export function SharedBadge({
  children,
  variant = 'primary',
  size = 'md',
  role = 'marchand',
  icon,
  dot = false,
  className,
}: SharedBadgeProps) {
  const roleColor = getRoleColor(role);
  
  // Classes de base
  const baseClasses = cn(
    'inline-flex items-center gap-1.5',
    'rounded-full font-semibold',
    'transition-all duration-200'
  );
  
  // Classes de taille
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size];
  
  // Classes de variant
  const variantClasses = {
    primary: 'bg-[var(--role-color)]/10 text-[var(--role-color)]',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-700',
    soumis: 'bg-blue-100 text-blue-700',
    valide: 'bg-green-100 text-green-700',
    rejete: 'bg-red-100 text-red-700',
    complement: 'bg-purple-100 text-purple-700',
    en_attente: 'bg-orange-100 text-orange-700',
  }[variant as string] || 'bg-gray-100 text-gray-700';
  
  return (
    <motion.span
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      style={{
        // @ts-ignore
        '--role-color': roleColor,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {/* Dot indicator */}
      {dot && (
        <motion.span
          className="w-2 h-2 rounded-full bg-current"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Icône */}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      
      {/* Texte */}
      {children}
    </motion.span>
  );
}