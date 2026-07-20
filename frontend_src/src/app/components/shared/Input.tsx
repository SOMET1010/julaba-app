/**
 * 📝 JULABA SHARED INPUT
 * 
 * Composant input unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { getRoleColor, UserRole } from '../../styles/design-tokens';
import { cn } from '../ui/utils';

export interface SharedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label du champ */
  label?: string;
  
  /** Message d'erreur */
  error?: string;
  
  /** Message d'aide */
  helperText?: string;
  
  /** Icône à gauche */
  leftIcon?: React.ReactNode;
  
  /** Icône à droite */
  rightIcon?: React.ReactNode;
  
  /** Rôle pour la couleur du focus */
  role?: UserRole;
  
  /** Taille */
  size?: 'sm' | 'md' | 'lg';
  
  /** Largeur complète */
  fullWidth?: boolean;
}

export const SharedInput = forwardRef<HTMLInputElement, SharedInputProps>(
  ({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    role = 'marchand',
    size = 'md',
    fullWidth = true,
    type = 'text',
    className,
    disabled,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const roleColor = getRoleColor(role);
    
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    
    // Classes de base
    const baseClasses = cn(
      'w-full rounded-xl border-2 transition-all duration-200',
      'bg-white text-gray-900 placeholder-gray-400',
      'focus:outline-none',
      disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
      error && 'border-red-500',
      !error && !disabled && 'border-gray-300 focus:border-[var(--role-color)]',
      leftIcon && 'pl-12',
      (rightIcon || isPassword) && 'pr-12'
    );
    
    // Classes de taille
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg',
    }[size];
    
    return (
      <div className={cn(fullWidth && 'w-full', 'relative')}>
        {/* Label */}
        {label && (
          <motion.label
            className={cn(
              'block mb-2 font-semibold transition-colors',
              error ? 'text-red-600' : isFocused ? 'text-[var(--role-color)]' : 'text-gray-700'
            )}
            style={{
              // @ts-ignore
              '--role-color': roleColor,
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {label}
          </motion.label>
        )}
        
        {/* Input Container */}
        <div className="relative">
          {/* Icône gauche */}
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={cn(baseClasses, sizeClasses, className)}
            style={{
              // @ts-ignore
              '--role-color': roleColor,
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            {...props}
          />
          
          {/* Icône droite / Password toggle */}
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          ) : null}
        </div>
        
        {/* Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              className="flex items-center gap-2 mt-2 text-sm text-red-600"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          
          {!error && helperText && (
            <motion.p
              className="mt-2 text-sm text-gray-600"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SharedInput.displayName = 'SharedInput';