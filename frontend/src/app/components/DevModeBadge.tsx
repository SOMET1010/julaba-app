/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Badge Mode Développement
 * ═══════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { DEV_MODE, DEV_CONFIG } from '../config/devMode';
import { Code2, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export function DevModeBadge() {
  if (!DEV_MODE || !DEV_CONFIG.showDevBadge) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
    >
      <div className="hidden bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2.5 rounded-full shadow-xl border-2 border-white flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Code2 className="w-5 h-5" />
        </motion.div>
        <span className="font-bold text-sm tracking-wider">MODE DÉVELOPPEMENT</span>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Zap className="w-4 h-4" />
        </motion.div>
      </div>
      <div className="hidden mt-2 bg-black/80 text-yellow-300 text-xs px-4 py-1.5 rounded-full text-center">
        Navigation sans données - Aucun appel API
      </div>
    </motion.div>
  );
}