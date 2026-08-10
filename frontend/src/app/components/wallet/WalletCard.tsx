import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Eye, 
  EyeOff, 
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import { useApp } from '../../contexts/AppContext';
import { Card } from '../ui/card';
import { RechargeWalletModal } from './RechargeWalletModal';
import { WithdrawWalletModal } from './WithdrawWalletModal';
import { Montant } from '../shared/Montant';

interface WalletCardProps {
  roleColor?: string;
  onNavigate?: () => void;
}

export function WalletCard({ roleColor = '#2E8B57', onNavigate }: WalletCardProps) {
  const { keiwa, getBalance, getEscrowBalance, getAvailableBalance } = useWallet();
  const { speak } = useApp();
  
  const [showBalance, setShowBalance] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const balance = getBalance();
  const escrowBalance = getEscrowBalance();
  const available = getAvailableBalance();

  const handleToggleBalance = () => {
    setShowBalance(!showBalance);
    speak(showBalance ? 'Solde masqué' : 'Solde affiché');
  };

  const handleToggleExpand = () => {
    if (onNavigate) {
      speak('Ouverture du Wallet Jùlaba');
      onNavigate();
      return;
    }
    setIsExpanded(!isExpanded);
    speak(isExpanded ? 'Mon argent fermé' : 'Mon argent ouvert');
  };

  const handleRecharger = () => {
    setShowRechargeModal(true);
    speak('Ouvre le formulaire de rechargement Mobile Money');
  };

  const handleRetirer = () => {
    setShowWithdrawModal(true);
    speak('Ouvre le formulaire de retrait Mobile Money');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        <Card 
          className="rounded-3xl shadow-md overflow-hidden border-2 bg-white"
          style={{ borderColor: `${roleColor}40` }}
        >
          {/* HEADER COMPACT - Toujours visible */}
          <motion.div
            onClick={handleToggleExpand}
            className="w-full p-5 flex items-center justify-between text-left cursor-pointer"
            whileTap={{ scale: 0.99 }}
            style={{ backgroundColor: '#ffffff' }}
            whileHover={onNavigate ? { backgroundColor: `${roleColor}08` } : {}}
          >
            <div className="flex items-center gap-3 flex-1">
              <motion.div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${roleColor}20` }}
                animate={onNavigate ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wallet className="w-6 h-6" style={{ color: roleColor }} />
              </motion.div>
              
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 mb-1">Keiwa</h3>
                <p 
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: roleColor }}
                >
                  {showBalance ? (available || 0).toLocaleString() : '••••••'}
                  <span className="text-xs ml-1 opacity-60 font-bold">FCFA</span>
                </p>
                {escrowBalance > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {showBalance ? (escrowBalance || 0).toLocaleString() : '•••'} <span className="text-[10px]">FCFA</span> en attente
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Bouton Oeil */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleBalance();
                }}
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-100 active:bg-gray-200"
                whileTap={{ scale: 0.95 }}
                aria-label={showBalance ? "Masquer le solde" : "Afficher le solde"}
              >
                <AnimatePresence mode="wait">
                  {showBalance ? (
                    <motion.div
                      key="eye"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Eye className="w-5 h-5 text-gray-700" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="eyeoff"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <EyeOff className="w-5 h-5 text-gray-700" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Chevron : droite si navigation, bas si expansion */}
              {onNavigate ? (
                <motion.div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${roleColor}15` }}
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronRight className="w-5 h-5" style={{ color: roleColor }} />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${roleColor}15` }}
                >
                  <ChevronDown className="w-5 h-5" style={{ color: roleColor }} />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* CONTENU EXTENSIBLE - Seulement si pas de navigation */}
          {!onNavigate && (
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                    {/* Argent bloqué - Seulement si > 0 */}
                    {escrowBalance > 0 && (
                      <div 
                        className="flex items-center gap-3 p-4 rounded-2xl border-2"
                        style={{ 
                          backgroundColor: `${roleColor}10`,
                          borderColor: `${roleColor}30`
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${roleColor}30` }}
                        >
                          <Clock className="w-5 h-5" style={{ color: roleColor }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 font-medium mb-1">
                            En attente de livraison
                          </p>
                          <p className="text-xl font-bold" style={{ color: roleColor }}>
                            {showBalance ? (escrowBalance || 0).toLocaleString() : '••••••'} <span className="text-xs opacity-70 font-bold">FCFA</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* DEUX GROS BOUTONS */}
                    <div className="space-y-3">
                      {/* Bouton Ajouter */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecharger();
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-lg shadow-md active:shadow-sm"
                        style={{ 
                          backgroundColor: roleColor,
                        }}
                      >
                        <ArrowDownCircle className="w-6 h-6" />
                        <span>Ajouter de l'argent</span>
                      </motion.button>
                      
                      {/* Bouton Retirer */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetirer();
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg border-2 bg-white active:bg-gray-50"
                        style={{ 
                          borderColor: roleColor,
                          color: roleColor
                        }}
                      >
                        <ArrowUpCircle className="w-6 h-6" />
                        <span>Retirer de l'argent</span>
                      </motion.button>
                    </div>

                    {/* Footer Mobile Money */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-center text-gray-500">
                        Orange Money • MTN • Moov • Wave
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </Card>
      </motion.div>

      {/* Modal Recharge */}
      <RechargeWalletModal 
        isOpen={showRechargeModal} 
        onClose={() => setShowRechargeModal(false)}
        roleColor={roleColor}
      />

      {/* Modal Retrait */}
      <WithdrawWalletModal 
        isOpen={showWithdrawModal} 
        onClose={() => setShowWithdrawModal(false)}
        roleColor={roleColor}
      />
    </>
  );
}