/**
 * 🎴 COMPACT PROFILE CARD - Carte Profil Compacte
 * 
 * Composant pour afficher une carte de profil compacte en haut des pages
 * avec photo, nom, numéro d'identification et badge de niveau
 */

import React from 'react';
import { motion } from 'motion/react';
import { User, Shield, Star, ChevronRight } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { getRoleColor } from '../../config/roleConfig';
import { useNavigate } from 'react-router';

interface CompactProfileCardProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  showScore?: boolean;
}

const ROLE_LABELS: Record<CompactProfileCardProps['role'], string> = {
  marchand: 'Marchand',
  producteur: 'Producteur',
  cooperative: 'Coopérative',
  institution: 'Institution',
  identificateur: 'Identificateur',
};

export function CompactProfileCard({ role, showScore = true }: CompactProfileCardProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const activeColor = getRoleColor(role);

  if (!user) return null;

  const handleCardClick = () => {
    navigate(`/${role}/profil`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <motion.button
        onClick={handleCardClick}
        className="w-full p-4 rounded-2xl bg-white shadow-md border-2 text-left group"
        style={{ borderColor: `${activeColor}30` }}
        whileHover={{ scale: 1.01, y: -2, boxShadow: `0 8px 20px ${activeColor}20` }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          {/* Photo */}
          <div
            className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ borderColor: activeColor, backgroundColor: `${activeColor}10` }}
          >
            {user.photo ? (
              <img src={user.photo} alt={`${user.prenoms} ${user.nom}`} className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7" style={{ color: activeColor }} strokeWidth={2.5} />
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold text-gray-500 uppercase">{ROLE_LABELS[role]}</p>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-300">
                <span className="text-[10px] font-bold text-green-700">{user.statut}</span>
              </div>
            </div>
            
            <h3 className="font-black text-gray-900 text-base truncate">
              {user.prenoms} {user.nom}
            </h3>
            
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-3 h-3" style={{ color: activeColor }} />
              <p className="text-xs font-semibold text-gray-600 truncate">{user.numeroMarchand}</p>
            </div>
          </div>

          {/* Score & Flèche */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showScore && (
              <div className="text-right">
                <div className="flex items-center gap-1 mb-0.5">
                  <Star className="w-3 h-3" style={{ color: activeColor }} fill={activeColor} />
                  <p className="text-xs font-semibold text-gray-500">Score</p>
                </div>
                <p className="text-lg font-black" style={{ color: activeColor }}>
                  {user.scoreCredit}
                </p>
              </div>
            )}
            
            <ChevronRight
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
              style={{ color: activeColor }}
            />
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}