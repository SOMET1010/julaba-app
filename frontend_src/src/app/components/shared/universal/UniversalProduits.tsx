/**
 * 📦 COMPOSANT UNIVERSEL - PAGE PRODUITS/COMMANDES/SUIVI/ANALYTICS
 * 
 * Clone adaptatif de GestionStock qui s'adapte selon le rôle :
 * 
 * - MARCHAND → "PRODUITS" : Gestion des Marchandises
 * - PRODUCTEUR → "COMMANDES" : Commandes reçues
 * - COOPÉRATIVE → "COMMANDES" : Commandes groupées (alias STOCKS selon config initiale)
 * - IDENTIFICATEUR → "SUIVI" : Dossiers d'identification (Nouveau/Brouillons/Soumissions)
 * - INSTITUTION → "ANALYTICS" : Rapports et statistiques
 * 
 * UI IDENTIQUE : Onglets + Recherche + Cartes/Liste
 * CONTENU DIFFÉRENT : Données contextuelles selon le rôle
 */

import React, { useState } from 'react';
import { isCooperatif } from '../../../types/constants';
import { motion } from 'motion/react';
import { 
  Package,
  ShoppingBag,
  FileText,
  BarChart3,
  Search,
  Filter,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useUser } from '../../../contexts/UserContext';
import { getRoleConfig } from '../../../config/roleConfig';
import { UniversalProduitsProps } from './types';
import { NotificationButton } from '../../marchand/NotificationButton';

export function UniversalProduits({ role }: UniversalProduitsProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const roleConfig = getRoleConfig(role);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tous');

  // Configuration selon le rôle
  const pageConfig = {
    marchand: {
      title: 'Mes Produits',
      description: 'Gère ton stock',
      icon: Package,
      tabs: ['Tous', 'En stock', 'Rupture'],
      emptyTitle: 'Aucun produit en stock',
      emptyDescription: 'Ajoute tes premiers produits pour commencer à vendre.',
      ctaLabel: 'Ajouter un produit',
    },
    producteur: {
      title: 'Mes Commandes',
      description: 'Commandes de tes récoltes',
      icon: ShoppingBag,
      tabs: ['Toutes', 'En attente', 'Livrées'],
      emptyTitle: 'Aucune commande',
      emptyDescription: 'Tu recevras ici les commandes de tes produits.',
      ctaLabel: 'Voir le marché',
    },
    cooperative: {
      title: 'Commandes Groupées',
      description: 'Gère les commandes communes',
      icon: ShoppingBag,
      tabs: ['Toutes', 'En cours', 'Livrées'],
      emptyTitle: 'Aucune commande groupée',
      emptyDescription: 'Crée des commandes groupées pour optimiser les achats.',
      ctaLabel: 'Nouvelle commande',
    },
    identificateur: {
      title: 'Suivi des Dossiers',
      description: 'Tes identifications en cours',
      icon: FileText,
      tabs: ['Nouveau', 'Brouillons', 'Soumissions'],
      emptyTitle: 'Aucun dossier',
      emptyDescription: 'Commence à identifier des acteurs pour suivre tes dossiers ici.',
      ctaLabel: 'Nouvelle identification',
    },
    institution: {
      title: 'Analytics',
      description: 'Rapports et statistiques',
      icon: BarChart3,
      tabs: ['Vue d\'ensemble', 'Transactions', 'Acteurs'],
      emptyTitle: 'Tableau de bord en construction',
      emptyDescription: 'Les analytics et rapports détaillés seront bientôt disponibles.',
      ctaLabel: 'Retour à l\'accueil',
    },
    administrateur: {
      title: 'Analytics',
      description: 'Rapports et statistiques',
      icon: BarChart3,
      tabs: ['Vue d\'ensemble', 'Transactions', 'Acteurs'],
      emptyTitle: 'Tableau de bord en construction',
      emptyDescription: 'Les analytics et rapports détaillés seront bientôt disponibles.',
      ctaLabel: 'Retour à l\'accueil',
    },
  };

  const config = pageConfig[role];
  const IconComponent = config.icon || Package;

  const handleCTA = () => {
    if (role === 'marchand') {
      // FUTURE: setShowAddModal(true)
      alert('Fonctionnalité à venir : Ajouter un produit');
    } else if (role === 'producteur') {
      navigate(`/${role}/production`);
    } else if (isCooperatif(role)) {
      // FUTURE: setShowCommandeModal(true)
      alert('Fonctionnalité à venir : Nouvelle commande groupée');
    } else if (role === 'identificateur') {
      navigate(`/${role}/identification`);
    } else {
      navigate(`/${role}`);
    }
  };

  return (
    <>
      {/* Header fixe */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="px-4 pt-10 pb-3 lg:pt-4 lg:pb-3 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Titre */}
            <div className="flex-1">
              <h1 className="font-bold text-gray-900 text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: roleConfig.primaryColor }} />
                {config.title}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">{config.description}</p>
            </div>

            {/* Boutons actions */}
            <div className="flex items-center gap-2">
              <NotificationButton />
              
              {/* Bouton Ajouter selon le rôle */}
              {(role === 'marchand' || isCooperatif(role)) && (
                <motion.button
                  onClick={handleCTA}
                  className="w-11 h-11 rounded-full flex items-center justify-center shadow-md text-white"
                  style={{ backgroundColor: roleConfig.primaryColor }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Onglets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {config.tabs.map((tab: string) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
                style={{
                  backgroundColor: activeTab === tab.toLowerCase() ? roleConfig.primaryColor : '#F3F4F6',
                  color: activeTab === tab.toLowerCase() ? '#FFFFFF' : '#6B7280',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Contenu principal */}
      <div className="pt-40 pb-32 lg:pb-8 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gray-50">
        
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
              placeholder={`Rechercher ${role === 'marchand' ? 'un produit' : role === 'identificateur' ? 'un dossier' : 'une commande'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:outline-none text-base placeholder:text-gray-400 shadow-sm"
              style={{
                borderColor: searchQuery ? roleConfig.primaryColor : '#E5E7EB',
              }}
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
              <Filter className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </motion.div>

        {/* État vide */}
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
            {config.emptyTitle}
          </h3>
          
          <p className="text-gray-600 text-center max-w-md mb-6">
            {config.emptyDescription}
          </p>

          <motion.button
            onClick={handleCTA}
            className="px-6 py-3 rounded-xl font-semibold text-white shadow-md"
            style={{ backgroundColor: roleConfig.primaryColor }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {config.ctaLabel}
          </motion.button>
        </motion.div>
      </div>

      {/* Navigation */}
    </>
  );
}