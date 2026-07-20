import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Wallet, ChevronRight, Eye, EyeOff, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import { RechargeWalletModal } from '../wallet/RechargeWalletModal';
import { WithdrawWalletModal } from '../wallet/WithdrawWalletModal';

interface ProfilKeiwaSectionProps {
  roleColor: string;
  roleName: string;
  speak: (text: string) => void;
}

/**
 * Section Wallet réutilisable pour TOUS les profils JULABA
 * Accès rapide au solde + bouton vers la page Wallet complète
 */
export function ProfilKeiwaSection({ roleColor, roleName, speak }: ProfilKeiwaSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAvailableBalance, getEscrowBalance } = useWallet();
  const [showBalance, setShowBalance] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showRetrait, setShowRetrait] = useState(false);

  const available = getAvailableBalance();
  const escrow = getEscrowBalance();

  // Déduire le chemin keiwa depuis le pathname actuel (ex: /marchand/profil → /marchand/keiwa)
  const segments = location.pathname.split('/').filter(Boolean);
  const roleSegment = segments[0] || 'marchand';
  const keiwaPath = `/${roleSegment}/keiwa`;

  const handleToggle = () => {
    setShowBalance(prev => !prev);
    speak(showBalance ? 'Solde masqué' : `Solde disponible : ${(available || 0).toLocaleString()} francs`);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        {/* Carte keiwa compacte */}
        <div
          className="rounded-3xl border-2 shadow-md overflow-hidden"
          style={{ borderColor: `${roleColor}30` }}
        >
          {/* Header solde */}
          <div
            className="p-5 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}CC 100%)` }}
          >
            <div>
              <p className="text-white/70 text-sm mb-1">Solde disponible</p>
              <motion.button
                onClick={handleToggle}
                className="flex items-center gap-3"
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-3xl font-bold text-white">
                  {showBalance ? (available || 0).toLocaleString('fr-FR') : '••••••'}
                </span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {showBalance
                    ? <Eye className="w-4 h-4 text-white" />
                    : <EyeOff className="w-4 h-4 text-white" />
                  }
                </div>
              </motion.button>
              <p className="text-white/70 text-sm mt-0.5">FCFA</p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white p-4 flex gap-3">
            <motion.button
              onClick={() => { setShowRecharge(true); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white"
              style={{ backgroundColor: roleColor }}
              whileTap={{ scale: 0.96 }}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Recharger
            </motion.button>

            <motion.button
              onClick={() => { setShowRetrait(true); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm border-2"
              style={{ borderColor: roleColor, color: roleColor }}
              whileTap={{ scale: 0.96 }}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Retirer
            </motion.button>

            <motion.button
              onClick={() => { navigate(keiwaPath); }}
              className="w-12 flex items-center justify-center rounded-2xl border-2 border-gray-200"
              whileTap={{ scale: 0.96 }}
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          </div>

          {/* Argent bloqué si > 0 */}
          {escrow > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700">En attente de livraison</p>
                <p className="text-sm font-bold text-amber-700">
                  {showBalance ? `${(escrow || 0).toLocaleString('fr-FR')} FCFA` : '•••'}
                </p>
              </div>
            </div>
          )}

          {/* Lien vers page complète */}
          <motion.button
            onClick={() => { navigate(keiwaPath); }}
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-100 text-sm font-semibold"
            style={{ color: roleColor }}
            whileTap={{ scale: 0.99 }}
          >
            Voir mon historique complet
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      <RechargeWalletModal
        isOpen={showRecharge}
        onClose={() => setShowRecharge(false)}
        roleColor={roleColor}
      />
      <WithdrawWalletModal
        isOpen={showRetrait}
        onClose={() => setShowRetrait(false)}
        roleColor={roleColor}
      />
    </>
  );
}