/**
 * STREAK SHIELD MODAL - Modal de confirmation bouclier
 * 
 * Modal pour demander à l'utilisateur s'il veut utiliser son bouclier
 * pour sauver son streak lorsqu'il a raté 1 jour
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Flame, X, AlertCircle } from 'lucide-react';

interface StreakShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  daysMissed: number;
  primaryColor: string;
  onUseShield: () => void;
  onDecline: () => void;
}

export function StreakShieldModal({
  isOpen,
  onClose,
  currentStreak,
  daysMissed,
  primaryColor,
  onUseShield,
  onDecline,
}: StreakShieldModalProps) {
  
  const handleUseShield = () => {
    onUseShield();
    onClose();
  };

  const handleDecline = () => {
    onDecline();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[210] flex items-center justify-center p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
              {/* Bouton fermer */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Icône principale animée */}
              <motion.div
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Shield className="w-12 h-12 text-white" />
                
                {/* Flamme en overlay */}
                <motion.div
                  className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                >
                  <Flame className="w-6 h-6 text-white" />
                </motion.div>
              </motion.div>

              {/* Alerte */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-orange-900">
                  Tu as rate {daysMissed} jour{daysMissed > 1 ? 's' : ''} ! Ton streak de {currentStreak} jours est en danger.
                </p>
              </div>

              {/* Titre */}
              <h2 className="text-2xl font-black text-gray-900 mb-4 text-center">
                Utiliser ton bouclier ?
              </h2>

              {/* Description */}
              <p className="text-base text-gray-700 mb-6 text-center leading-relaxed">
                Tu as <span className="font-black" style={{ color: primaryColor }}>1 bouclier de protection</span> disponible cette semaine.
              </p>

              <p className="text-sm text-gray-600 mb-8 text-center">
                Il te permet de sauver ton streak meme si tu as rate un jour. Utilise-le maintenant ou perds ton streak de <span className="font-bold text-orange-600">{currentStreak} jours</span>.
              </p>

              {/* Info bouclier */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-blue-900">LE BOUCLIER</p>
                </div>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>• Se recharge chaque lundi</li>
                  <li>• Protege ton streak une fois par semaine</li>
                  <li>• Une fois utilise, il faut attendre lundi prochain</li>
                </ul>
              </div>

              {/* Boutons */}
              <div className="flex flex-col gap-3">
                {/* Bouton Utiliser le bouclier */}
                <motion.button
                  onClick={handleUseShield}
                  className="w-full py-4 rounded-2xl text-white font-bold shadow-lg bg-gradient-to-r from-blue-500 to-purple-600"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5" />
                    Utiliser mon bouclier
                  </div>
                </motion.button>

                {/* Bouton Refuser */}
                <motion.button
                  onClick={handleDecline}
                  className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Non, recommencer mon streak
                </motion.button>
              </div>

              {/* Warning si refus */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Si tu refuses, ton streak sera reinitialise a 0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}