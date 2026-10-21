/**
 * 🪟 JULABA SHARED MODAL
 * 
 * Composant modal unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { MOTION, Z_INDEX } from '../../styles/design-tokens';
import { cn } from '../ui/utils';
import { ModalPortal } from './ModalPortal';

export interface SharedModalProps {
  /** État d'ouverture */
  isOpen: boolean;
  
  /** Callback de fermeture */
  onClose: () => void;
  
  /** Titre du modal */
  title?: string;
  
  /** Description */
  description?: string;
  
  /** Contenu du modal */
  children: React.ReactNode;
  
  /** Footer (actions) */
  footer?: React.ReactNode;
  
  /** Taille du modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /** Désactiver la fermeture au clic backdrop */
  disableBackdropClick?: boolean;
  
  /** Désactiver le bouton close */
  hideCloseButton?: boolean;
  
  /** Classes additionnelles */
  className?: string;

  /** Style inline pour la carte du modal */
  cardStyle?: React.CSSProperties;

  /**
   * Mode plein-écran : la carte s'étire jusqu'au bord, le body n'a
   * plus de padding ni de max-height propre — le contenu gère lui-même.
   */
  fullHeight?: boolean;
}

export function SharedModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  disableBackdropClick = false,
  hideCloseButton = false,
  className,
  cardStyle,
  fullHeight = false,
}: SharedModalProps) {
  // ModalPortal gère le scroll lock et l'enregistrement dans ModalContext
  // Plus besoin de manipuler le DOM manuellement ici

  // Classes de taille
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }[size];
  
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              style={{ zIndex: Z_INDEX.modalBackdrop }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !disableBackdropClick && onClose()}
            />
            
            {/* Modal Container */}
            <div
              className={cn(
                'fixed inset-0 flex items-center justify-center overflow-y-auto',
                fullHeight ? 'p-2' : 'p-4'
              )}
              style={{ zIndex: Z_INDEX.modal }}
            >
              <motion.div
                className={cn(
                  'bg-white rounded-3xl shadow-2xl',
                  'w-full',
                  sizeClasses,
                  fullHeight && 'flex flex-col',
                  className
                )}
                style={{
                  ...(fullHeight ? { height: 'calc(100dvh - 192px)' } : {}),
                  ...cardStyle,
                }}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={MOTION.spring}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                {(title || !hideCloseButton) && (
                  <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex-1">
                      {title && (
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p className="text-sm text-gray-600">
                          {description}
                        </p>
                      )}
                    </div>
                    
                    {!hideCloseButton && (
                      <motion.button
                        onClick={onClose}
                        className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="w-6 h-6 text-gray-500" />
                      </motion.button>
                    )}
                  </div>
                )}
                
                {/* Body */}
                <div className={cn(
                  fullHeight ? 'flex-1 overflow-hidden' : 'p-6 max-h-[60vh] overflow-y-auto'
                )}>
                  {children}
                </div>
                
                {/* Footer */}
                {footer && (
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl flex-shrink-0">
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}