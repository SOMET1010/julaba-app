import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  EyeOff,
  ArrowDownCircle,
  ArrowUpCircle,
  Send,
  QrCode,
  X,
  Check,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  Wallet,
  Smartphone,
  Copy,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { RechargeWalletModal } from './RechargeWalletModal';
import { WithdrawWalletModal } from './WithdrawWalletModal';

// ── Types ────────────────────────────────────────────────────

type FiltreType = 'tout' | 'recharge' | 'retrait' | 'paiement' | 'escrow';
type FiltrePeriode = 'tout' | '7j' | '30j';

const TYPE_LABELS: Record<string, { label: string; color: string; isCredit: boolean }> = {
  RECHARGE:         { label: 'Rechargement',    color: '#16A34A', isCredit: true  },
  RETRAIT:          { label: 'Retrait',          color: '#DC2626', isCredit: false },
  PAIEMENT_ENVOYE:  { label: 'Paiement envoyé', color: '#DC2626', isCredit: false },
  PAIEMENT_RECU:    { label: 'Paiement reçu',   color: '#16A34A', isCredit: true  },
  ESCROW_BLOQUE:    { label: 'En attente',       color: '#D97706', isCredit: false },
  ESCROW_LIBERE:    { label: 'Libéré',           color: '#16A34A', isCredit: true  },
  ESCROW_REMBOURSE: { label: 'Remboursé',        color: '#16A34A', isCredit: true  },
  COMMISSION:       { label: 'Commission',       color: '#7C3AED', isCredit: true  },
};

const PROVIDERS = [
  { id: 'ORANGE', name: 'Orange Money', color: '#FF6600', bg: '#FFF3E0' },
  { id: 'MTN',    name: 'MTN Money',    color: '#FFCC00', bg: '#FFFDE7' },
  { id: 'MOOV',   name: 'Moov Money',   color: '#0057A8', bg: '#E3F2FD' },
  { id: 'WAVE',   name: 'Wave',         color: '#1EAEE4', bg: '#E1F5FE' },
] as const;

// ── QR Code SVG simplifié ─────────────────────────────────────

function QRCodeDisplay({ value, color }: { value: string; color: string }) {
  const grid = useMemo(() => {
    const seed = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => {
        if ((r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2)) return true;
        return ((seed * (r + 1) * (c + 2)) % 3) !== 0;
      })
    );
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 rounded-2xl bg-white border-2 shadow-lg" style={{ borderColor: `${color}40` }}>
        <svg width="140" height="140" viewBox="0 0 7 7" style={{ imageRendering: 'pixelated' }}>
          {grid.map((row, r) =>
            row.map((cell, c) =>
              cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} /> : null
            )
          )}
        </svg>
      </div>
      <p className="text-xs text-gray-500 text-center">Scanner pour me payer</p>
    </div>
  );
}

// ── Mini graphique 7 jours ────────────────────────────────────

function MiniChart({ transactions, color }: { transactions: any[]; color: string }) {
  const jours = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const maintenant = Date.now();
  const data = jours.map((_, i) => {
    const debut = maintenant - (6 - i) * 86400000;
    const fin   = debut + 86400000;
    return transactions
      .filter(t => {
        const ts = new Date(t.createdAt).getTime();
        const cfg = TYPE_LABELS[t.type];
        return ts >= debut && ts < fin && cfg?.isCredit && t.status === 'COMPLETED';
      })
      .reduce((s, t) => s + t.amount, 0);
  });
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end justify-between gap-1 h-16 px-1">
      {data.map((val, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <motion.div
            className="w-full rounded-t-lg"
            style={{ backgroundColor: val > 0 ? color : '#E5E7EB' }}
            initial={{ height: 0 }}
            animate={{ height: `${(val / max) * 48}px` }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
          />
          <span className="text-xs text-gray-400">{jours[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Modal Recevoir (QR) ───────────────────────────────────────

function ModalRecevoir({ isOpen, onClose, color, userName, userId }: {
  isOpen: boolean; onClose: () => void; color: string; userName: string; userId: string;
}) {
  const [copied, setCopied] = useState(false);
  const code = `JULABA-${userId.toUpperCase().slice(0, 8)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recevoir de l'argent</h2>
                <p className="text-sm text-gray-500 mt-0.5">{userName}</p>
              </div>
              <motion.button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileTap={{ scale: 0.9 }}>
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                <QRCodeDisplay value={userId} color={color} />
              </motion.div>
              <div className="w-full flex items-center justify-between p-4 rounded-2xl border-2" style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Mon code Jùlaba</p>
                  <p className="font-bold text-gray-900 tracking-wider">{code}</p>
                </div>
                <motion.button
                  onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: copied ? '#16A34A' : color, color: 'white' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié' : 'Copier'}
                </motion.button>
              </div>
              <div className="w-full">
                <p className="text-xs text-gray-500 text-center mb-3">Compatible avec</p>
                <div className="flex justify-center gap-3">
                  {PROVIDERS.map(p => (
                    <div key={p.id} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ backgroundColor: p.bg, color: p.color }}>
                      {p.name.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Modal Envoyer ─────────────────────────────────────────────

function ModalEnvoyer({ isOpen, onClose, color, canAfford, onSend }: {
  isOpen: boolean; onClose: () => void; color: string;
  canAfford: (n: number) => boolean; onSend: (montant: number, dest: string) => void;
}) {
  const [montant, setMontant] = useState('');
  const [destinataire, setDestinataire] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const montantNum = parseInt(montant.replace(/\D/g, ''), 10) || 0;

  const handleSend = () => {
    setError('');
    if (montantNum < 100) { setError('Montant minimum : 100 FCFA'); return; }
    if (!destinataire.trim()) { setError('Entrez le code ou numéro du destinataire'); return; }
    if (!canAfford(montantNum)) { setError('Solde insuffisant'); return; }
    onSend(montantNum, destinataire);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setMontant(''); setDestinataire(''); onClose(); }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Envoyer de l'argent</h2>
              <motion.button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileTap={{ scale: 0.9 }}>
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#16A34A' }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.6 }}>
                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                  </motion.div>
                  <p className="text-lg font-bold text-gray-900">Envoi confirmé</p>
                  <p className="text-sm text-gray-500">{(montantNum || 0).toLocaleString('fr-FR')} FCFA envoyés</p>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Destinataire</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text" value={destinataire} onChange={e => setDestinataire(e.target.value)}
                        placeholder="Code Jùlaba ou numéro Mobile Money"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-base"
                        onFocus={e => (e.target.style.borderColor = color)}
                        onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Montant (FCFA)</label>
                    <input
                      type="number" inputMode="numeric" value={montant} onChange={e => setMontant(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-2xl font-bold text-center"
                      onFocus={e => (e.target.style.borderColor = color)}
                      onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                    <div className="flex gap-2 mt-2">
                      {[500, 1000, 5000, 10000].map(m => (
                        <motion.button key={m} onClick={() => setMontant(String(m))}
                          className="flex-1 py-2 rounded-xl border-2 text-sm font-semibold"
                          style={{ borderColor: `${color}40`, color }} whileTap={{ scale: 0.95 }}>
                          {m >= 1000 ? `${m / 1000}k` : m}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </motion.div>
                  )}
                  <motion.button onClick={handleSend}
                    className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: color }} whileTap={{ scale: 0.98 }}>
                    Envoyer {montantNum > 0 ? `${(montantNum || 0).toLocaleString('fr-FR')} FCFA` : ''}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Composant principal WalletInline ─────────────────────────
// Version embarquée dans le menu MOI — sans header de page

interface WalletInlineProps {
  roleColor: string;
}

export function WalletInline({ roleColor }: WalletInlineProps) {
  const { speak } = useApp();
  const { user } = useUser();
  const {
    transactions,
    getAvailableBalance,
    getEscrowBalance,
    canAfford,
    getPendingEscrows,
  } = useWallet();

  const color = roleColor;
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Utilisateur';

  const [showBalance, setShowBalance]   = useState(false);
  const [filtre, setFiltre]             = useState<FiltreType>('tout');
  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>('tout');
  const [showRecharge, setShowRecharge] = useState(false);
  const [showRetrait, setShowRetrait]   = useState(false);
  const [showRecevoir, setShowRecevoir] = useState(false);
  const [showEnvoyer, setShowEnvoyer]   = useState(false);

  const available = getAvailableBalance();
  const escrow    = getEscrowBalance();
  const pendingEscrows = getPendingEscrows();

  const txFiltrees = useMemo(() => {
    let result = [...transactions];
    if (filtre !== 'tout') {
      result = result.filter(t => {
        if (filtre === 'recharge') return t.type === 'RECHARGE';
        if (filtre === 'retrait')  return t.type === 'RETRAIT';
        if (filtre === 'paiement') return t.type === 'PAIEMENT_ENVOYE' || t.type === 'PAIEMENT_RECU';
        if (filtre === 'escrow')   return t.type.startsWith('ESCROW');
        return true;
      });
    }
    if (filtrePeriode !== 'tout') {
      const jours = filtrePeriode === '7j' ? 7 : 30;
      const limite = Date.now() - jours * 86400000;
      result = result.filter(t => new Date(t.createdAt).getTime() >= limite);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, filtre, filtrePeriode]);

  const stats30j = useMemo(() => {
    const limite = Date.now() - 30 * 86400000;
    const recent = transactions.filter(t => new Date(t.createdAt).getTime() >= limite && t.status === 'COMPLETED');
    const entrees = recent.filter(t =>  TYPE_LABELS[t.type]?.isCredit).reduce((s, t) => s + t.amount, 0);
    const sorties = recent.filter(t => !TYPE_LABELS[t.type]?.isCredit).reduce((s, t) => s + t.amount, 0);
    return { entrees, sorties };
  }, [transactions]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleEnvoyer = (montant: number, dest: string) => {
    speak(`Envoi de ${(montant || 0).toLocaleString()} francs CFA en cours`);
  };

  return (
    <div className="mb-4 space-y-4">

      {/* ── CARTE SOLDE ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="rounded-3xl border-2 overflow-hidden shadow-xl"
        style={{ borderColor: color }}
      >
        {/* Gradient header solde */}
        <div
          className="relative p-6 pb-10"
          style={{ background: `linear-gradient(145deg, ${color} 0%, ${color}CC 60%, ${color}88 100%)` }}
        >
          {/* Déco */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/10 translate-y-6 -translate-x-6" />

          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">Keiwa</span>
            </div>
            {/* Bouton QR Recevoir */}
            <motion.button
              onClick={() => { setShowRecevoir(true); speak('Recevoir de l\'argent'); }}
              className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <QrCode className="w-5 h-5 text-white" />
            </motion.button>
          </div>

          <div className="relative text-center">
            <p className="text-white/70 text-sm mb-2">Solde disponible</p>
            <motion.button
              onClick={() => {
                setShowBalance(prev => !prev);
                speak(showBalance ? 'Solde masqué' : `Votre solde est ${(available || 0).toLocaleString()} francs CFA`);
              }}
              className="flex items-center justify-center gap-3 mx-auto mb-1"
              whileTap={{ scale: 0.97 }}
            >
              <motion.p
                key={showBalance ? 'shown' : 'hidden'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-white tracking-tight"
              >
                {showBalance ? (available || 0).toLocaleString('fr-FR') : '••••••'}
              </motion.p>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                {showBalance ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white" />}
              </div>
            </motion.button>
            <p className="text-white/70 text-lg">FCFA</p>

            {escrow > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm"
              >
                <Clock className="w-4 h-4 text-white/80" />
                <span className="text-sm text-white/90">
                  {showBalance ? `${(escrow || 0).toLocaleString('fr-FR')} FCFA` : '•••'} en attente
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── ACTIONS (flottantes sur le gradient) ───────────── */}
        <div className="-mt-6 px-4 pb-5 bg-white">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="bg-white rounded-3xl border-2 border-gray-100 shadow-lg p-4 -mt-2"
          >
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: ArrowDownCircle, label: 'Recharger', action: () => { setShowRecharge(true); speak('Recharger votre keiwa'); }, primary: true },
                { icon: ArrowUpCircle,   label: 'Retirer',   action: () => { setShowRetrait(true); speak('Retirer de l\'argent'); },   primary: false },
                { icon: Send,            label: 'Envoyer',   action: () => { setShowEnvoyer(true); speak('Envoyer de l\'argent'); },   primary: false },
                { icon: QrCode,          label: 'Recevoir',  action: () => { setShowRecevoir(true); speak('Recevoir de l\'argent'); }, primary: false },
              ].map(({ icon: Icon, label, action, primary }) => (
                <motion.button key={label} onClick={action} className="flex flex-col items-center gap-2" whileTap={{ scale: 0.92 }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: primary ? color : `${color}15` }}>
                    <Icon className="w-6 h-6" style={{ color: primary ? 'white' : color }} />
                  </div>
                  <span className="text-xs text-gray-600 font-semibold">{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── STATS 30 JOURS ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl border-2 border-gray-100 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Ce mois-ci</h3>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100">
            <RefreshCw className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">30 jours</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-green-50 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-semibold">Entrées</span>
            </div>
            <p className="font-bold text-gray-900 truncate">
              {showBalance ? `${(stats30j.entrees || 0).toLocaleString('fr-FR')} FCFA` : '••••'}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-500 font-semibold">Sorties</span>
            </div>
            <p className="font-bold text-gray-900">
              {showBalance ? `${(stats30j.sorties || 0).toLocaleString('fr-FR')} FCFA` : '••••'}
            </p>
          </div>
        </div>
        <MiniChart transactions={transactions} color={color} />
      </motion.div>

      {/* ── ARGENT BLOQUÉ (Escrow) ───────────────────────────── */}
      {pendingEscrows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-amber-50 rounded-3xl border-2 border-amber-200 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Argent en attente</h3>
              <p className="text-xs text-amber-600">{pendingEscrows.length} paiement(s) bloqué(s)</p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingEscrows.slice(0, 3).map(esc => (
              <div key={esc.id} className="flex items-center justify-between py-2 border-t border-amber-200">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Commande #{esc.commandeId.slice(-6)}</p>
                  <p className="text-xs text-amber-600">En attente de livraison</p>
                </div>
                <p className="font-bold text-amber-700">{(esc.amount || 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── MOBILE MONEY ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border-2 border-gray-100 p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5" style={{ color }} />
          <h3 className="font-bold text-gray-900">Mobile Money connecté</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PROVIDERS.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl border-2"
              style={{ borderColor: `${p.color}30`, backgroundColor: p.bg }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}20` }}>
                <Zap className="w-4 h-4" style={{ color: p.color }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: p.color }}>{p.name.split(' ')[0]}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-xs text-gray-500">Actif</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── SÉCURITÉ ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border-2 border-green-100"
      >
        <ShieldCheck className="w-8 h-8 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-900">Paiements sécurisés</p>
          <p className="text-xs text-green-600">Votre argent est protégé par le système Jùlaba.</p>
        </div>
      </motion.div>

      {/* ── HISTORIQUE TRANSACTIONS ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Historique</h3>
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">{txFiltrees.length} opération(s)</span>
          </div>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-none">
          {([
            { id: 'tout',     label: 'Tout' },
            { id: 'recharge', label: 'Rechargements' },
            { id: 'retrait',  label: 'Retraits' },
            { id: 'paiement', label: 'Paiements' },
            { id: 'escrow',   label: 'En attente' },
          ] as { id: FiltreType; label: string }[]).map(f => (
            <motion.button key={f.id} onClick={() => setFiltre(f.id)}
              className="px-4 py-2 rounded-full border-2 text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={filtre === f.id
                ? { backgroundColor: color, borderColor: color, color: 'white' }
                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
              }
              whileTap={{ scale: 0.95 }}>
              {f.label}
            </motion.button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {([
            { id: 'tout', label: 'Toujours' },
            { id: '30j',  label: '30 jours' },
            { id: '7j',   label: '7 jours' },
          ] as { id: FiltrePeriode; label: string }[]).map(p => (
            <motion.button key={p.id} onClick={() => setFiltrePeriode(p.id)}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={filtrePeriode === p.id
                ? { backgroundColor: `${color}15`, borderColor: color, color }
                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#9CA3AF' }
              }
              whileTap={{ scale: 0.95 }}>
              {p.label}
            </motion.button>
          ))}
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {txFiltrees.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm text-center">Aucune transaction pour cette période.</p>
                <motion.button onClick={() => setShowRecharge(true)}
                  className="px-6 py-3 rounded-2xl font-bold text-white"
                  style={{ backgroundColor: color }} whileTap={{ scale: 0.97 }}>
                  Recharger maintenant
                </motion.button>
              </motion.div>
            ) : (
              txFiltrees.map((tx, i) => {
                const cfg = TYPE_LABELS[tx.type] || { label: tx.type, color: '#6B7280', isCredit: false };
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                    transition={{ delay: i * 0.03, type: 'spring', stiffness: 250 }}
                    className="bg-white rounded-2xl border-2 border-gray-100 p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cfg.color}15` }}>
                      {cfg.isCredit
                        ? <ArrowDownCircle className="w-6 h-6" style={{ color: cfg.color }} />
                        : <ArrowUpCircle className="w-6 h-6" style={{ color: cfg.color }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{cfg.label}</p>
                      <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base" style={{ color: cfg.color }}>
                        {cfg.isCredit ? '+' : '-'}{(tx.amount || 0).toLocaleString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-400">FCFA</p>
                      {tx.status === 'PENDING' && (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-500">En cours</span>
                        </div>
                      )}
                      {tx.status === 'COMPLETED' && (
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Check className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-500">OK</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <RechargeWalletModal isOpen={showRecharge} onClose={() => setShowRecharge(false)} roleColor={color} />
      <WithdrawWalletModal isOpen={showRetrait}  onClose={() => setShowRetrait(false)}  roleColor={color} />
      <ModalRecevoir
        isOpen={showRecevoir} onClose={() => setShowRecevoir(false)}
        color={color} userName={userName} userId={user?.id || 'JULABA'}
      />
      <ModalEnvoyer
        isOpen={showEnvoyer} onClose={() => setShowEnvoyer(false)}
        color={color} canAfford={canAfford} onSend={handleEnvoyer}
      />
    </div>
  );
}
