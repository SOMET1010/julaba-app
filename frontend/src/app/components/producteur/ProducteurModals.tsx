import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, TrendingUp, AlertCircle, DollarSign, Award, FileText, Receipt, Wallet, Package, Sprout, Camera, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useProducteur } from '../../contexts/ProducteurContext';
import { useNavigate } from 'react-router';
import { Montant, MontantCard } from '../shared/Montant';

const PRIMARY_COLOR = '#2E8B57';

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

  let bgColor = PRIMARY_COLOR;
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

interface StyledInputProps {
  id?: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

function StyledInput({ id, type, placeholder, value, onChange, error, autoFocus, disabled }: StyledInputProps) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      disabled={disabled}
      className={`w-full px-4 py-4 rounded-2xl border text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 ${
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
          : 'border-gray-300 focus:ring-green-100'
      } disabled:bg-gray-100 disabled:cursor-not-allowed`}
      style={!error ? { borderWidth: '2px', borderColor: '#D1D5DB' } : undefined}
    />
  );
}

// ✨ ==== MODALS STATISTIQUES ==== ✨

interface RecoltesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecoltesModal({ isOpen, onClose }: RecoltesModalProps) {
  const { stats } = useProducteur();
  const navigate = useNavigate();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b" style={{ backgroundColor: `${PRIMARY_COLOR}10`, borderColor: `${PRIMARY_COLOR}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: PRIMARY_COLOR }}>
              <Sprout className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Production totale</h3>
              <p className="text-sm text-gray-600">Tes récoltes cumulées</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-6 py-6 space-y-4">
          {/* KPI Principal */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-6 border-2" style={{ borderColor: `${PRIMARY_COLOR}30` }}>
            <p className="text-sm font-semibold text-gray-600 mb-2">Total produit</p>
            <p className="text-4xl font-black mb-1" style={{ color: PRIMARY_COLOR }}>
              {(stats?.recoltesTotales ?? 0).toLocaleString()}
            </p>
            <p className="text-lg font-bold text-gray-600">récoltes</p>
          </div>

          {/* Stats détaillées */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-1">Récoltes vendues</p>
              <p className="text-2xl font-black text-gray-900">{stats?.recoltesVendues ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-1">Revenus</p>
              <p className="text-2xl font-black text-gray-900">{((stats?.revenusTotal ?? 0) / 1000).toFixed(0)}K F</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <StyledButton onClick={() => { onClose(); navigate('/producteur/production'); }} fullWidth>
              Voir détails
            </StyledButton>
            <StyledButton onClick={onClose} variant="outline">
              Fermer
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

interface VentesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VentesModal({ isOpen, onClose }: VentesModalProps) {
  const { stats } = useProducteur();
  const navigate = useNavigate();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b" style={{ backgroundColor: `${PRIMARY_COLOR}10`, borderColor: `${PRIMARY_COLOR}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
              <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Revenus totaux</h3>
              <p className="text-sm text-gray-600">Tes ventes cumulées</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-6 py-6 space-y-4">
          {/* KPI Principal */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-200">
            <p className="text-sm font-semibold text-gray-600 mb-2">Total revenus</p>
            <p className="text-4xl font-black text-blue-600">{((stats?.revenusTotal ?? 0) / 1000).toFixed(0)}K</p>
            <p className="text-lg font-bold text-gray-600">FCFA</p>
          </div>

          {/* Stats détaillées */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-1">Récoltes vendues</p>
              <p className="text-2xl font-black text-gray-900">{stats?.recoltesVendues ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-1">Commandes actives</p>
              <p className="text-2xl font-black text-gray-900">{stats?.commandesEnCours ?? 0}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <StyledButton onClick={() => { onClose(); navigate('/producteur/commandes'); }} fullWidth>
              Voir commandes
            </StyledButton>
            <StyledButton onClick={onClose} variant="outline">
              Fermer
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScoreModal({ isOpen, onClose }: ScoreModalProps) {
  const { stats } = useProducteur();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Score Producteur</h3>
              <p className="text-sm text-gray-600">Ta performance globale</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-6 py-6 space-y-4">
          {/* Score principal */}
          <div className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl p-6 border-2 border-yellow-200 text-center">
            <p className="text-sm font-semibold text-gray-600 mb-2">Ton score</p>
            <p className="text-5xl font-black text-yellow-600 mb-1">{stats?.recoltesVendues ?? 0}</p>
            <p className="text-lg font-bold text-gray-600">récoltes vendues</p>
          </div>

          {/* Détails */}
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium text-gray-700">Récoltes totales</span>
              <span className="text-sm font-black text-green-600">{stats?.recoltesTotales ?? 0}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium text-gray-700">Commandes en cours</span>
              <span className="text-sm font-black text-gray-900">{stats?.commandesEnCours ?? 0}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium text-gray-700">Revenus totaux</span>
              <span className="text-sm font-black text-yellow-600">{((stats?.revenusTotal ?? 0) / 1000).toFixed(0)}K FCFA</span>
            </div>
          </div>

          {/* Action */}
          <StyledButton onClick={onClose} fullWidth>
            Fermer
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  const { stats } = useProducteur();
  const navigate = useNavigate();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b" style={{ backgroundColor: `${PRIMARY_COLOR}10`, borderColor: `${PRIMARY_COLOR}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: PRIMARY_COLOR }}>
              <FileText className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Résumé activité</h3>
              <p className="text-sm text-gray-600">Vue d'ensemble</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="px-6 py-6 space-y-4">
          {/* Stats principales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Récoltes totales</p>
              <p className="text-2xl font-black text-green-600">{stats?.recoltesTotales ?? 0}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Revenus</p>
              <p className="text-2xl font-black text-blue-600">{((stats?.revenusTotal ?? 0) / 1000).toFixed(0)}K F</p>
            </div>
          </div>

          {/* Compteurs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium text-gray-700">Récoltes vendues</span>
              <span className="text-sm font-black" style={{ color: PRIMARY_COLOR }}>{stats?.recoltesVendues ?? 0}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium text-gray-700">Commandes en cours</span>
              <span className="text-sm font-black" style={{ color: PRIMARY_COLOR }}>{stats?.commandesEnCours ?? 0}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <StyledButton onClick={() => { onClose(); navigate('/producteur/profil'); }} fullWidth>
              Voir profil
            </StyledButton>
            <StyledButton onClick={onClose} variant="outline">
              Fermer
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

// ✨ ==== MODALS ACTIONS ==== ✨

interface PlantationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlantationModal({ isOpen, onClose }: PlantationModalProps) {
  const navigate = useNavigate();
  const { speak } = useApp();

  const handleAction = () => {
    speak('Création de plantation agricole');
    onClose();
    navigate('/producteur/production');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b" style={{ backgroundColor: `${PRIMARY_COLOR}10`, borderColor: `${PRIMARY_COLOR}30` }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: PRIMARY_COLOR }}>
                  <Sprout className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Nouvelle plantation</h3>
                  <p className="text-sm text-gray-600">Créer une plantation agricole</p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="px-6 py-6 space-y-4">
              <p className="text-gray-700">
                Crée une nouvelle plantation agricole pour suivre ta production de la plantation à la récolte.
              </p>

              {/* CTA */}
              <div className="flex gap-3">
                <StyledButton onClick={handleAction} fullWidth>
                  Créer une plantation
                </StyledButton>
                <StyledButton onClick={onClose} variant="outline">
                  Annuler
                </StyledButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface DeclareRecolteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeclareRecolteModal({ isOpen, onClose }: DeclareRecolteModalProps) {
  const navigate = useNavigate();
  const { speak } = useApp();

  const handleAction = () => {
    speak('Déclaration de récolte');
    onClose();
    navigate('/producteur/declarer-recolte');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Déclarer récolte</h3>
              <p className="text-sm text-gray-600">Enregistrer une récolte</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-gray-700">
            Déclare ta récolte avec photos, quantité et qualité pour la publier sur le marché virtuel.
          </p>

          <div className="flex gap-3">
            <StyledButton onClick={handleAction} fullWidth>
              Déclarer
            </StyledButton>
            <StyledButton onClick={onClose} variant="outline">
              Annuler
            </StyledButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}