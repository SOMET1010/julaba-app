/**
 * 🔘 JULABA SHARED BUTTON
 * 
 * Composant bouton unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { getRoleColor, MOTION, UserRole } from '../../styles/design-tokens';
import { cn } from '../ui/utils';

export interface SharedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Contenu du bouton */
  children: React.ReactNode;
  
  /** Variant du bouton */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  
  /** Taille du bouton */
  size?: 'sm' | 'md' | 'lg';
  
  /** Rôle pour la couleur primaire */
  role?: UserRole;
  
  /** État de chargement */
  loading?: boolean;
  
  /** Largeur complète */
  fullWidth?: boolean;
  
  /** Icône à gauche */
  leftIcon?: React.ReactNode;
  
  /** Icône à droite */
  rightIcon?: React.ReactNode;
  
  /** Désactivé */
  disabled?: boolean;
}

export function SharedButton({
  children,
  variant = 'primary',
  size = 'md',
  role = 'marchand',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled = false,
  className,
  ...props
}: SharedButtonProps) {
  const roleColor = getRoleColor(role);
  
  // Classes de base
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-2xl',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    fullWidth && 'w-full'
  );
  
  // Classes de taille
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }[size];
  
  // Classes de variant
  const variantClasses = {
    primary: 'bg-[var(--role-color)] text-white hover:opacity-90 focus:ring-[var(--role-color)]',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400',
    ghost: 'bg-transparent text-[var(--role-color)] hover:bg-[var(--role-color)]/10 focus:ring-[var(--role-color)]',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  }[variant];
  
  return (
    <motion.button
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      style={{
        // @ts-ignore
        '--role-color': roleColor,
      }}
      whileTap={!disabled && !loading ? MOTION.tap : undefined}
      disabled={disabled || loading}
      {...props}
    >
      {/* Icône gauche */}
      {leftIcon && !loading && <span className="flex-shrink-0">{leftIcon}</span>}
      
      {/* Loader */}
      {loading && (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-5 h-5" />
        </motion.span>
      )}
      
      {/* Texte */}
      <span>{children}</span>
      
      {/* Icône droite */}
      {rightIcon && !loading && <span className="flex-shrink-0">{rightIcon}</span>}
    </motion.button>
  );
}