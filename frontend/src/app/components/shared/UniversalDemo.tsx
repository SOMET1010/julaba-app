/**
 * 🎨 DÉMONSTRATION DES COMPOSANTS UNIVERSELS
 * 
 * Ce fichier montre comment les composants universels s'adaptent automatiquement
 * à tous les profils utilisateurs de JULABA.
 * 
 * Pour tester : 
 * - Changez la prop `role` ci-dessous
 * - Observez comment tous les composants s'adaptent automatiquement !
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { getRoleColor, getRoleConfig } from '../../config/roleConfig';
import { Palette, Users, Eye } from 'lucide-react';

type UserRole = 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';

export function UniversalDemo() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('marchand');
  
  const roles: UserRole[] = ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'];
  
  const roleColors = {
    marchand: '#C66A2C',
    producteur: '#2E8B57',
    cooperative: '#2072AF',
    institution: '#712864',
    identificateur: '#9F8170',
  };
  
  const roleLabels = {
    marchand: 'Marchand',
    producteur: 'Producteur',
    cooperative: 'Coopérative',
    institution: 'Institution',
    identificateur: 'Identificateur',
  };

  const activeColor = getRoleColor(selectedRole);
  const config = getRoleConfig(selectedRole);

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-black mb-3" style={{ color: activeColor }}>
            🌐 Composants Universels
          </h1>
          <p className="text-gray-600 font-semibold">
            Une seule codebase, tous les profils JULABA
          </p>
        </motion.div>

        {/* Sélecteur de rôle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-8 border-2"
          style={{ borderColor: `${activeColor}30` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6" style={{ color: activeColor }} />
            <h2 className="text-xl font-bold text-gray-900">
              Sélectionne un profil
            </h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {roles.map((role) => (
              <motion.button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`p-4 rounded-xl font-bold text-sm transition-all border-2 ${
                  selectedRole === role
                    ? 'shadow-lg'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                style={
                  selectedRole === role
                    ? {
                        backgroundColor: roleColors[role],
                        borderColor: roleColors[role],
                        color: 'white',
                      }
                    : {}
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {roleLabels[role]}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Démonstration des couleurs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-6 h-6" style={{ color: activeColor }} />
            <h2 className="text-xl font-bold text-gray-900">
              Adaptation automatique des couleurs
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Palette primaire */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600 mb-2">Palette primaire</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl shadow-md"
                  style={{ backgroundColor: activeColor }}
                />
                <div>
                  <p className="text-xs font-semibold text-gray-500">Couleur principale</p>
                  <p className="text-sm font-bold text-gray-900">{activeColor}</p>
                </div>
              </div>
            </div>

            {/* Exemples d'utilisation */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600 mb-2">Exemples</p>
              
              {/* Bouton */}
              <motion.button
                className="w-full py-3 px-4 rounded-xl text-white font-bold shadow-md"
                style={{ backgroundColor: activeColor }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Bouton Primaire
              </motion.button>

              {/* Badge */}
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: activeColor }}
                >
                  Badge
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold border-2"
                  style={{ borderColor: activeColor, color: activeColor }}
                >
                  Badge Outline
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6" style={{ color: activeColor }} />
            <h2 className="text-xl font-bold text-gray-900">
              Navigation adaptée
            </h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Les items de navigation s'adaptent automatiquement selon le profil :
          </p>

          <div className="space-y-2">
            {config.bottomBar.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border-2"
                style={{ borderColor: `${activeColor}20` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${activeColor}20` }}
                >
                  <span className="text-lg">{item.icon === 'Home' ? '🏠' : item.icon === 'Store' ? '🛒' : item.icon === 'Package' ? '📦' : '👤'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.path}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-xl p-8 text-white"
        >
          <h2 className="text-2xl font-black mb-6">✨ Avantages</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FeatureCard
              emoji="🎨"
              title="Cohérence UI"
              description="100% d'harmonisation entre tous les profils"
            />
            <FeatureCard
              emoji="⚡"
              title="Développement rapide"
              description="Une modification = tous les profils mis à jour"
            />
            <FeatureCard
              emoji="🔧"
              title="Maintenance facile"
              description="Moins de code, moins de bugs"
            />
            <FeatureCard
              emoji="🚀"
              title="Performance"
              description="Code optimisé et réutilisable"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <motion.div
      className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
    >
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-white/80">{description}</p>
    </motion.div>
  );
}