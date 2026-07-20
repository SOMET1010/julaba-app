/**
 * JULABA - Carte Fiche d'Identification
 * Design harmonisé avec les autres cartes du profil (Academy, Wallet…)
 * Titre bold visible, sous-titre numéro de fiche, chevron à droite
 * Pas de badge statut BO (l'accès au compte implique déjà la validation)
 */

import React from 'react';
import { motion } from 'motion/react';
import { FileText, ChevronRight } from 'lucide-react';

const PRIMARY = '#C46210';

interface IdentificationInfoBadgeProps {
  numeroFiche: string;
  nomAgent?: string;
  prenomAgent?: string;
  dateIdentification?: string;
  statut?: string;
  raisonsRejet?: string[];
  accentColor?: string;
  onVoirFiche?: () => void;
}

export function IdentificationInfoBadge({
  numeroFiche,
  accentColor = PRIMARY,
  onVoirFiche,
}: IdentificationInfoBadgeProps) {
  return (
    <motion.button
      onClick={onVoirFiche}
      className="w-full flex items-center gap-4 p-4 rounded-3xl border-2 bg-white"
      style={{ borderColor: `${accentColor}30`, backgroundColor: '#ffffff' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: `${accentColor}06`, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icône */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accentColor}18` }}
      >
        <FileText className="w-6 h-6" style={{ color: accentColor }} />
      </div>

      {/* Textes */}
      <div className="flex-1 text-left min-w-0">
        <p className="font-black text-gray-900 text-base leading-tight">
          Ma fiche d'identification
        </p>
        <p className="text-sm text-gray-500 mt-0.5 truncate">
          {numeroFiche}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
    </motion.button>
  );
}
