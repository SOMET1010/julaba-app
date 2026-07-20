/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Toggle Mode Développement (Optionnel)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Composant optionnel pour basculer le mode dev depuis l'interface
 * 
 * ⚠️ À SUPPRIMER EN PRODUCTION
 */

import React from 'react';
import { DEV_MODE } from '../config/devMode';
import { Code2, AlertCircle } from 'lucide-react';

export function DevModeToggle() {
  // Ce composant affiche juste l'état actuel
  // Pour changer le mode, il faut modifier /src/app/config/devMode.ts
  
  if (!DEV_MODE) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-auto">
      <div className="hidden bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
        <Code2 className="w-4 h-4" />
        <span className="font-bold">MODE DEV ACTIF</span>
      </div>
      
      <div className="hidden mt-2 bg-black/90 text-yellow-300 text-xs px-3 py-2 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold mb-1">Pour désactiver :</div>
            <div className="text-yellow-200/80">
              /src/app/config/devMode.ts
            </div>
            <div className="text-yellow-200/80">
              DEV_MODE = false
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}