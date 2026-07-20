/**
 * 🌵 JULABA SHARED EMPTY STATE
 * 
 * Composant empty state unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { getRoleColor, MOTION, UserRole } from '../../styles/design-tokens';
import { SharedButton } from './Button';
import { cn } from '../ui/utils';

export interface EmptyStateProps {
  /** Icône */
  icon: LucideIcon;
  
  /** Titre */
  title: string;
  
  /** Description */
  description?: string;
  
  /** Texte du bouton d'action */
  actionLabel?: string;
  
  /** Action au clic */
  onAction?: () => void;
  
  /** Rôle pour la couleur */
  role?: UserRole;
  
  /** Classes additionnelles */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  role = 'marchand',
  className,
}: EmptyStateProps) {
  const roleColor = getRoleColor(role);
  
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center',
        'text-center py-16 px-4',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MOTION.spring}
    >
      {/* Icône animée */}
      <motion.div
        className="mb-6 p-6 rounded-full"
        style={{ backgroundColor: `${roleColor}15` }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...MOTION.spring, delay: 0.1 }}
      >
        <motion.div
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <Icon className="w-16 h-16" style={{ color: roleColor }} />
        </motion.div>
      </motion.div>
      
      {/* Titre */}
      <motion.h3
        className="text-2xl font-bold text-gray-900 mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>
      
      {/* Description */}
      {description && (
        <motion.p
          className="text-gray-600 mb-8 max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}
      
      {/* Action */}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <SharedButton
            variant="primary"
            role={role}
            onClick={onAction}
          >
            {actionLabel}
          </SharedButton>
        </motion.div>
      )}
    </motion.div>
  );
}