/**
 * 🛒 COMPOSANT UNIVERSEL - PAGE MARCHÉ/PRODUCTION/MEMBRES/ACTEURS
 * 
 * Clone adaptatif de MarcheVirtuel qui s'adapte selon le rôle :
 * 
 * - MARCHAND → "MARCHÉ" : Acheter/vendre des produits
 * - PRODUCTEUR → "PRODUCTION" : Gérer les cultures et cycles agricoles
 * - COOPÉRATIVE → "MEMBRES" : Liste et gestion des membres
 * - IDENTIFICATEUR → "ACTEURS" : Base de données acteurs JULABA
 * - INSTITUTION → "ACTEURS" : Vue globale de l'écosystème
 * 
 * UI IDENTIQUE : Barre de recherche + Filtres + Grille de cartes
 * CONTENU DIFFÉRENT : Données contextuelles selon le rôle
 */

import React, { useState } from 'react';
import { isCooperatif } from '../../../types/constants';
import { useLangPref } from '../../../hooks/useLangPref';
import { useVoiceCore } from '../../../hooks/useVoiceCore';
import { motion } from 'motion/react';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  Mic,
  MicOff,
  Package,
  Leaf,
  Users,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useUser } from '../../../contexts/UserContext';
import { getRoleConfig } from '../../../config/roleConfig';
import { UniversalMarcheProps } from './types';
import { NotificationButton } from '../../marchand/NotificationButton';

export function UniversalMarche({ role }: UniversalMarcheProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const roleConfig = getRoleConfig(role);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [isListening, setIsListening] = useState(false);

  // Titre et description selon le rôle
  const pageConfig = {
    marchand: {
      title: 'Marché Virtuel',
      description: 'Achète et vends des produits',
      icon: ShoppingCart,
    },
    producteur: {
      title: 'Ma Production',
      description: 'Gère tes cultures et cycles agricoles',
      icon: Leaf,
    },
    cooperative: {
      title: 'Mes Membres',
      description: 'Gère les membres de ta coopérative',
      icon: Users,
    },
    identificateur: {
      title: 'Base Acteurs JULABA',
      description: 'Recherche et consulte les acteurs',
      icon: UserCheck,
    },
    institution: {
      title: 'Écosystème JULABA',
      description: 'Vue globale de tous les acteurs',
      icon: Users,
    },
    administrateur: {
      title: 'Écosystème JULABA',
      description: 'Vue globale de tous les acteurs',
      icon: Users,
    },
  };

  const config = pageConfig[role];
  const IconComponent = config.icon || Package;

  // Recherche vocale
  // STT via Groq Whisper
  const { lang: voiceLang } = useLangPref();
  const { startRecording: _groqStart_startVoiceSearch, stopRecording: _groqStop_startVoiceSearch } = useVoiceCore({
    onTranscript: (text) => { setSearchQuery(text); setIsListening(false); },
    context: { module: 'marche', lang: voiceLang },
    onError: () => setIsListening(false),
  });

  const startVoiceSearch = () => {
    if (isListening) { _groqStop_startVoiceSearch(); setIsListening(false); }
    else { setIsListening(true); _groqStart_startVoiceSearch(); }
  };

  return (
    <>
      {/* Header fixe */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b"
        style={{
          background: `linear-gradient(to bottom, ${roleConfig.primaryColor}10, ${roleConfig.primaryColor}05)`,
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="px-4 pt-10 pb-3 lg:pt-4 lg:pb-3 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            {/* Titre */}
            <div className="flex-1">
              <h1 className="font-bold text-gray-900 text-xl sm:text-2xl md:text-3xl flex items-center gap-2">
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: roleConfig.primaryColor }} />
                {config.title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{config.description}</p>
            </div>

            {/* Boutons actions */}
            <div className="flex items-center gap-2">
              <NotificationButton />
              
              {/* Panier ou actions selon le rôle */}
              {role === 'marchand' && (
                <motion.button
                  className="relative w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Contenu principal */}
      <div className="pt-32 pb-32 lg:pb-8 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-gray-50 to-white">
        
        {/* Barre de recherche */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Rechercher ${role === 'marchand' ? 'un produit' : role === 'producteur' ? 'une culture' : isCooperatif(role) ? 'un membre' : 'un acteur'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:outline-none text-base placeholder:text-gray-400 shadow-sm"
              style={{
                borderColor: searchQuery ? roleConfig.primaryColor : '#E5E7EB',
              }}
            />
            <motion.button
              onClick={startVoiceSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" style={{ color: roleConfig.primaryColor }} />
              ) : (
                <Mic className="w-5 h-5 text-gray-400" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* État vide avec message adapté */}
        <motion.div
          className="flex flex-col items-center justify-center py-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${roleConfig.primaryColor}15` }}
          >
            <IconComponent className="w-12 h-12" style={{ color: roleConfig.primaryColor }} />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {role === 'marchand' && 'Marché bientôt disponible'}
            {role === 'producteur' && 'Ajoute tes premières cultures'}
            {isCooperatif(role) && 'Ajoute tes premiers membres'}
            {role === 'identificateur' && 'Base acteurs en construction'}
            {role === 'institution' && 'Dashboard en cours de développement'}
          </h3>
          
          <p className="text-gray-600 text-center max-w-md mb-6">
            {role === 'marchand' && 'Le marché virtuel te permettra d\'acheter et vendre des produits directement depuis JULABA.'}
            {role === 'producteur' && 'Commence par créer une plantation agricole pour suivre ta production.'}
            {isCooperatif(role) && 'Enregistre les membres de ta coopérative pour mieux gérer les activités communes.'}
            {role === 'identificateur' && 'La base de données centralisée de tous les acteurs JULABA sera bientôt accessible.'}
          </p>

          <motion.button
            onClick={() => navigate(`/${role}`)}
            className="px-6 py-3 rounded-xl font-semibold text-white shadow-md"
            style={{ backgroundColor: roleConfig.primaryColor }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Retour à l'accueil
          </motion.button>
        </motion.div>
      </div>

      {/* Navigation */}
    </>
  );
}