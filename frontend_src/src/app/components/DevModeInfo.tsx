/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Info Mode Dev (Composant réutilisable)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Affiche un message d'information sur une page en mode dev
 * Usage : <DevModeInfo message="Cette page fonctionne sans données réelles" />
 */

import React from 'react';
import { DEV_MODE } from '../config/devMode';
import { Info } from 'lucide-react';
import { motion } from 'motion/react';

interface DevModeInfoProps {
  message?: string;
  className?: string;
}

export function DevModeInfo({ 
  message = "Mode dev : cette page fonctionne sans données backend",
  className = ""
}: DevModeInfoProps) {
  if (!DEV_MODE) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-3 flex items-start gap-3 ${className}`}
    >
      <Info className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-yellow-800 font-medium">
          {message}
        </p>
      </div>
    </motion.div>
  );
}
