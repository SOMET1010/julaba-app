import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface BottomModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  isOpen?: boolean;
}

/**
 * 📱 BOTTOM MODAL - Composant universel
 * 
 * Modal qui apparaît depuis le bas de l'écran (pattern mobile-first)
 * Utilisé pour les paramètres, formulaires, détails, etc.
 * 
 * @example
 * ```tsx
 * <BottomModal 
 *   title="Paramètres" 
 *   isOpen={showSettings} 
 *   onClose={() => setShowSettings(false)}
 * >
 *   <div>Contenu du modal</div>
 * </BottomModal>
 * ```
 */
export function BottomModal({ title, onClose, children, isOpen = true }: BottomModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-xl">{title}</h2>
          <motion.button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5 text-gray-600" />
          </motion.button>
        </div>

        {/* Content */}
        {children}
      </motion.div>
    </motion.div>
  );
}
