/**
 * 🍞 JULABA SHARED TOAST
 * 
 * Composant toast/notification unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X, XCircle } from 'lucide-react';
import { getRoleColor, UserRole, Z_INDEX } from '../../styles/design-tokens';
import { cn } from '../ui/utils';

export interface ToastProps {
  /** Message */
  message: string;
  
  /** Type de toast */
  type?: 'success' | 'error' | 'warning' | 'info';
  
  /** État visible */
  isVisible: boolean;
  
  /** Callback de fermeture */
  onClose: () => void;
  
  /** Durée d'affichage (ms) */
  duration?: number;
  
  /** Rôle pour la couleur (info uniquement) */
  role?: UserRole;
}

export function Toast({
  message,
  type = 'info',
  isVisible,
  onClose,
  duration = 3000,
  role = 'marchand',
}: ToastProps) {
  const roleColor = getRoleColor(role);
  
  // Auto-close après duration
  React.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);
  
  // Configuration selon le type
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      iconColor: 'text-green-500',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      iconColor: 'text-orange-500',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-500',
    },
  }[type];
  
  const Icon = config.icon || Zap;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-4 right-4 z-[var(--z-toast)]"
          style={{ 
            // @ts-ignore
            '--z-toast': Z_INDEX.toast 
          }}
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <div
            className={cn(
              'flex items-center gap-3 p-4 rounded-2xl shadow-lg border-2',
              'max-w-md min-w-[300px]',
              config.bg,
              config.border
            )}
          >
            {/* Icône */}
            <Icon className={cn('w-6 h-6 flex-shrink-0', config.iconColor)} />
            
            {/* Message */}
            <p className={cn('flex-1 font-semibold', config.text)}>
              {message}
            </p>
            
            {/* Bouton close */}
            <motion.button
              onClick={onClose}
              className={cn('p-1 rounded-lg hover:bg-black/5', config.text)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook pour gérer les toasts facilement
 */
export function useToast() {
  const [toasts, setToasts] = React.useState<Array<{
    id: string;
    message: string;
    type: ToastProps['type'];
  }>>([]);
  
  const showToast = React.useCallback((message: string, type: ToastProps['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  
  const hideToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return {
    toasts,
    showToast,
    hideToast,
  };
}