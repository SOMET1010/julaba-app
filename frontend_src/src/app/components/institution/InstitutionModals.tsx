import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, TrendingUp, Award, FileText, BarChart3, DollarSign, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router';
import { useInstitution } from '../../contexts/InstitutionContext';

const INSTITUTION_COLOR = '#712864';

// ✨ ==== COMPOSANTS DE BASE ==== ✨

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function BaseModal({ isOpen, onClose, children }: BaseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop avec blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          
          {/* Contenu du modal */}
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

interface StyledButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'success';
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

function StyledButton({ onClick, variant = 'primary', disabled, children, className = '', fullWidth }: StyledButtonProps) {
  const baseStyle = 'px-6 py-3.5 rounded-2xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'text-white shadow-lg hover:shadow-xl',
    outline: 'bg-white border text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-xl',
    success: 'text-white shadow-lg hover:shadow-xl',
  };

  let bgColor = INSTITUTION_COLOR;
  if (variant === 'danger') bgColor = '#DC2626';
  if (variant === 'success') bgColor = '#16A34A';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={variant === 'primary' || variant === 'success' ? { backgroundColor: bgColor } : variant === 'outline' ? { borderWidth: '2px', borderColor: '#E5E7EB' } : undefined}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {children}
    </motion.button>
  );
}

// ✨ ==== MODALS INSTITUTION ==== ✨

// Modal Utilisateurs actifs (KPI1)
interface UtilisateursModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
}

export function UtilisateursModal({ isOpen, onClose, count }: UtilisateursModalProps) {
  const navigate = useNavigate();
  const { getStatistiquesParRole } = useInstitution();
  const statsRoles = getStatistiquesParRole();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ backgroundColor: INSTITUTION_COLOR }}
        >
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}
          />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Utilisateurs actifs</h2>
                <p className="text-sm opacity-90">Acteurs JULABA</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Nombre total */}
          <div 
            className="mb-6 p-6 rounded-2xl text-center"
            style={{ backgroundColor: `${INSTITUTION_COLOR}10` }}
          >
            <p className="text-sm font-semibold text-gray-600 mb-2">Total acteurs</p>
            <p className="text-5xl font-black mb-1" style={{ color: INSTITUTION_COLOR }}>
              {(count || 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-500">utilisateurs actifs</p>
          </div>

          {/* Répartition par rôle */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Répartition par rôle</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-orange-50 border-2 border-orange-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Marchands</p>
                <p className="text-2xl font-black text-orange-600">{statsRoles.marchands.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50 border-2 border-green-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Producteurs</p>
                <p className="text-2xl font-black text-green-600">{statsRoles.producteurs.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Coopératives</p>
                <p className="text-2xl font-black text-blue-600">{statsRoles.cooperatives.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border-2 border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Identificateurs</p>
                <p className="text-2xl font-black text-gray-600">{statsRoles.identificateurs.total}</p>
              </div>
            </div>
          </div>

          {/* Bouton action */}
          <StyledButton 
            onClick={() => {
              onClose();
              navigate('/institution/acteurs');
            }}
            variant="primary"
            fullWidth
          >
            Voir tous les acteurs
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

// Modal Volume total (KPI2)
interface VolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  montant: number;
}

export function VolumeModal({ isOpen, onClose, montant }: VolumeModalProps) {
  const navigate = useNavigate();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ backgroundColor: '#2563EB' }}
        >
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{ 
              rotate: [0, 360],
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)',
              backgroundSize: '40px 40px'
            }}
          />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Volume total</h2>
                <p className="text-sm opacity-90">Transactions JULABA</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Montant total */}
          <div className="mb-6 p-6 rounded-2xl text-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <p className="text-sm font-semibold text-gray-600 mb-2">Volume cumulé</p>
            <p className="text-5xl font-black text-blue-600 mb-1">
              {(montant || 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-500">Francs CFA</p>
          </div>

          {/* Info */}
          <div className="mb-6 p-4 rounded-xl bg-green-50 border-2 border-green-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-green-900 mb-1">Impact économique</p>
                <p className="text-sm text-green-700">Ce volume représente l'ensemble des transactions sur la plateforme JULABA.</p>
              </div>
            </div>
          </div>

          {/* Boutons actions */}
          <div className="space-y-3">
            <StyledButton 
              onClick={() => {
                onClose();
                navigate('/institution/analytics');
              }}
              variant="primary"
              fullWidth
            >
              Voir les analytics
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

// Modal Score
interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScoreModal({ isOpen, onClose }: ScoreModalProps) {
  const { user } = useApp();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ backgroundColor: INSTITUTION_COLOR }}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Score JULABA</h2>
                <p className="text-sm opacity-90">Performance plateforme</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-6xl font-black mb-2" style={{ color: INSTITUTION_COLOR }}>
              {user?.scoreJulaba || 990}
            </p>
            <p className="text-sm font-medium text-gray-500">points JULABA</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
              <p className="font-bold text-green-900 mb-1">🎯 Excellente gestion !</p>
              <p className="text-sm text-green-700">La plateforme est performante et en croissance.</p>
            </div>
          </div>

          <StyledButton onClick={onClose} variant="primary" fullWidth>
            Compris
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

// Modal Résumé
interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    utilisateurs: number;
    volume: number;
  };
}

export function ResumeModal({ isOpen, onClose, stats }: ResumeModalProps) {
  const navigate = useNavigate();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ backgroundColor: INSTITUTION_COLOR }}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Résumé</h2>
                <p className="text-sm opacity-90">Vue d'ensemble</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-gray-50 border-2 border-gray-200">
              <Users className="w-8 h-8 mb-2" style={{ color: INSTITUTION_COLOR }} />
              <p className="text-2xl font-black text-gray-900 mb-1">{(stats.utilisateurs || 0).toLocaleString()}</p>
              <p className="text-xs font-medium text-gray-600">Utilisateurs</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-2xl font-black text-blue-600 mb-1">{(stats.volume || 0).toLocaleString()}</p>
              <p className="text-xs font-medium text-blue-700">FCFA</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <StyledButton 
              onClick={() => {
                onClose();
                navigate('/institution/dashboard-analytics');
              }}
              variant="primary"
              fullWidth
            >
              Voir le rapport complet
            </StyledButton>
            <StyledButton onClick={onClose} variant="outline" fullWidth>
              Fermer
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

// Modal Gestion utilisateurs (Action1)
interface GestionUtilisateursModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GestionUtilisateursModal({ isOpen, onClose }: GestionUtilisateursModalProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    onClose();
    navigate('/institution/acteurs');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ backgroundColor: '#16A34A' }}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Gestion utilisateurs</h2>
                <p className="text-sm opacity-90">Acteurs JULABA</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Gérer tous les acteurs</h3>
            <p className="text-sm text-gray-600">
              Consulte et administre tous les utilisateurs de la plateforme
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
              <p className="font-bold text-blue-900 mb-1">🔍 Fonctionnalités</p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4">
                <li>• Voir tous les profils</li>
                <li>• Filtrer par rôle et statut</li>
                <li>• Activer/Désactiver des comptes</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <StyledButton onClick={handleStart} variant="primary" fullWidth>
              Accéder à la gestion
            </StyledButton>
            <StyledButton onClick={onClose} variant="outline" fullWidth>
              Annuler
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

// Modal Analytics (Action2)
interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    onClose();
    navigate('/institution/analytics');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ backgroundColor: '#2563EB' }}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Analytics</h2>
                <p className="text-sm opacity-90">Statistiques avancées</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Statistiques détaillées</h3>
            <p className="text-sm text-gray-600">
              Analyse approfondie de l'activité de la plateforme
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
              <p className="font-bold text-green-900 mb-1">📊 Données disponibles</p>
              <ul className="text-sm text-green-700 space-y-1 ml-4">
                <li>• Graphiques interactifs</li>
                <li>• KPIs en temps réel</li>
                <li>• Tendances et prévisions</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <StyledButton onClick={handleStart} variant="primary" fullWidth>
              Voir les analytics
            </StyledButton>
            <StyledButton onClick={onClose} variant="outline" fullWidth>
              Annuler
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}