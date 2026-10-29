import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, TrendingUp, Award, FileText, ShoppingCart, Users, X, DollarSign } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router';
import { useCooperative } from '../../contexts/CooperativeContext';
import { ModalPortal } from '../shared/ModalPortal';

const COOPERATIVE_COLOR = '#2072AF';

// ==== COMPOSANTS DE BASE ====

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function BaseModal({ isOpen, onClose, children }: BaseModalProps) {
  return (
    <ModalPortal isOpen={isOpen}>
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
    </ModalPortal>
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

  let bgColor = COOPERATIVE_COLOR;
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

// ==== MODALS COOPERATIVE ====

// Modal Volume groupé (KPI1)
interface VolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  volume: number;
}

export function VolumeModal({ isOpen, onClose, volume }: VolumeModalProps) {
  const navigate = useNavigate();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-5 text-white relative overflow-hidden"
          style={{ backgroundColor: COOPERATIVE_COLOR }}
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
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Volume groupé</h2>
                <p className="text-sm opacity-90">Stock collectif</p>
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
          {/* Volume total */}
          <div 
            className="mb-6 p-6 rounded-2xl text-center"
            style={{ backgroundColor: `${COOPERATIVE_COLOR}10` }}
          >
            <p className="text-sm font-semibold text-gray-600 mb-2">Volume total groupé</p>
            <p className="text-5xl font-black mb-1" style={{ color: COOPERATIVE_COLOR }}>
              {(volume || 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-500">kilogrammes</p>
          </div>

          {/* Info */}
          <div className="mb-6 p-4 rounded-xl bg-green-50 border-2 border-green-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-green-900 mb-1">Pouvoir de négociation</p>
                <p className="text-sm text-green-700">Plus vous groupez, meilleures sont vos conditions d'achat et de vente.</p>
              </div>
            </div>
          </div>

          {/* Boutons actions */}
          <div className="space-y-3">
            <StyledButton 
              onClick={() => {
                onClose();
                navigate('/cooperative/stock');
              }}
              variant="primary"
              fullWidth
            >
              Voir détails des stocks
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

// Modal Transactions (KPI2)
interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  montant: number;
}

export function TransactionsModal({ isOpen, onClose, montant }: TransactionsModalProps) {
  const navigate = useNavigate();
  const { getRecentTransactions } = useCooperative();
  const recentTransactions = getRecentTransactions(5);

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
                <h2 className="text-xl font-black">Transactions</h2>
                <p className="text-sm opacity-90">Volume d'affaires</p>
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
            <p className="text-sm font-semibold text-gray-600 mb-2">Total des transactions</p>
            <p className="text-5xl font-black text-blue-600 mb-1">
              {(montant || 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-500">Francs CFA</p>
          </div>

          {/* Transactions récentes */}
          {recentTransactions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Transactions récentes</h3>
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className="p-3 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{transaction.type}</p>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">
                          {(transaction.montant || 0).toLocaleString()} <span className="text-[10px] opacity-60">FCFA</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boutons actions */}
          <div className="space-y-3">
            <StyledButton 
              onClick={() => {
                onClose();
                navigate('/cooperative/tresorerie');
              }}
              variant="primary"
              fullWidth
            >
              Voir la trésorerie
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
          style={{ backgroundColor: COOPERATIVE_COLOR }}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Score JULABA</h2>
                <p className="text-sm opacity-90">Niveau coopérative</p>
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
            <p className="text-3xl font-black mb-2" style={{ color: COOPERATIVE_COLOR }}>
              Indisponible
            </p>
            <p className="text-sm font-medium text-gray-500">Score coopérative bientôt disponible</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
              <p className="font-bold text-green-900 mb-1">Score en préparation</p>
              <p className="text-sm text-green-700">Le score de la coopérative sera calculé à partir de son activité.</p>
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
    volume: number;
    transactions: number;
    membres: number;
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
          style={{ backgroundColor: COOPERATIVE_COLOR }}
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
              <Package className="w-8 h-8 mb-2" style={{ color: COOPERATIVE_COLOR }} />
              <p className="text-2xl font-black text-gray-900 mb-1">{(stats.volume || 0).toLocaleString()}</p>
              <p className="text-xs font-medium text-gray-600">kg groupés</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-2xl font-black text-blue-600 mb-1">{(stats.transactions || 0).toLocaleString()}</p>
              <p className="text-xs font-medium text-blue-700">FCFA</p>
            </div>
            <div className="col-span-2 p-4 rounded-xl bg-green-50 border-2 border-green-200">
              <Users className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-2xl font-black text-green-600 mb-1">{stats.membres}</p>
              <p className="text-xs font-medium text-green-700">membres actifs</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <StyledButton 
              onClick={() => {
                onClose();
                navigate('/cooperative/tresorerie');
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

// Modal Achats groupés (Action1)
interface AchatsGroupesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AchatsGroupesModal({ isOpen, onClose }: AchatsGroupesModalProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    onClose();
    navigate('/cooperative/marche', { state: { vue: 'achats' } });
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
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Achats groupés</h2>
                <p className="text-sm opacity-90">Économie collective</p>
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
              <ShoppingCart className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Acheter ensemble, économiser ensemble</h3>
            <p className="text-sm text-gray-600">
              Regroupez vos besoins pour négocier de meilleurs prix
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
              <p className="font-bold text-blue-900 mb-1">Avantages</p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4">
                <li>• Prix réduits grâce au volume</li>
                <li>• Meilleure qualité garantie</li>
                <li>• Livraison groupée</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <StyledButton onClick={handleStart} variant="primary" fullWidth>
              Voir les offres
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

// Modal Ventes groupées (Action2)
interface VentesGroupeesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VentesGroupeesModal({ isOpen, onClose }: VentesGroupeesModalProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    onClose();
    navigate('/cooperative/marche', { state: { vue: 'ventes' } });
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
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Ventes groupées</h2>
                <p className="text-sm opacity-90">Force collective</p>
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
              <TrendingUp className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Vendre ensemble, gagner plus</h3>
            <p className="text-sm text-gray-600">
              Regroupez vos productions pour accéder à de meilleurs marchés
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
              <p className="font-bold text-green-900 mb-1">Avantages</p>
              <ul className="text-sm text-green-700 space-y-1 ml-4">
                <li>• Accès aux gros acheteurs</li>
                <li>• Prix plus élevés</li>
                <li>• Régularité des ventes</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <StyledButton onClick={handleStart} variant="primary" fullWidth>
              Voir les opportunités
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