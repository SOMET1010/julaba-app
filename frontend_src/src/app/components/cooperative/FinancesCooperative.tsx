import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  PlusCircle,
  Filter,
  ChevronRight,
  X,
  Check,
  Clock,
  AlertCircle,
  Users,
  ShoppingCart,
  BarChart3,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  PieChart,
  RefreshCw,
  Download,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCooperative, TransactionTresorerie } from '../../contexts/CooperativeContext';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useUser } from '../../contexts/UserContext';
import { Montant, MontantCard } from '../shared/Montant';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { toast } from 'sonner';

const COLOR = '#2072AF';

type FiltrePeriode = 'tout' | '7j' | '30j' | '3m';
type FiltreType = 'tout' | 'entree' | 'sortie';

const CAT_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  cotisation:     { label: 'Cotisation',         icon: Users },
  vente_groupee:  { label: 'Vente groupée',       icon: ShoppingCart },
  achat_groupe:   { label: 'Achat groupé',        icon: ShoppingCart },
  commission:     { label: 'Commission',          icon: Coins },
  frais:          { label: 'Frais',               icon: ArrowDownRight },
  subvention:     { label: 'Subvention',          icon: ArrowUpRight },
  autre:          { label: 'Autre',               icon: Zap },
};

// ── Modal ajout transaction ──────────────────────────────────

function ModalAjoutTransaction({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tx: Omit<TransactionTresorerie, 'id'>) => Promise<void>;
}) {
  const [type, setType]       = useState<'entree' | 'sortie'>('entree');
  const [categorie, setCat]   = useState<TransactionTresorerie['categorie']>('cotisation');
  const [montant, setMontant] = useState('');
  const [desc, setDesc]       = useState('');
  const [done, setDone]       = useState(false);

  const handleSubmit = async () => {
    const m = parseInt(montant, 10);
    if (!m || m <= 0 || !desc.trim()) return;
    try {
      await onAdd({
        type,
        categorie,
        montant: m,
        description: desc,
        date: new Date().toISOString(),
        statut: 'en_attente',
      });
      setDone(true);
      setTimeout(() => { setDone(false); setMontant(''); setDesc(''); onClose(); }, 1800);
    } catch {
      toast.error('Erreur lors de l\'enregistrement. Réessaie.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Nouvelle transaction</h2>
              <motion.button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileTap={{ scale: 0.9 }}>
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-10"
                >
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-green-500">
                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                  <p className="text-lg font-bold text-gray-900">Transaction enregistrée</p>
                  <p className="text-sm text-gray-500">En attente de validation</p>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-4">
                  {/* Entree / Sortie */}
                  <div className="grid grid-cols-2 gap-3">
                    {(['entree', 'sortie'] as const).map(t => (
                      <motion.button
                        key={t}
                        onClick={() => setType(t)}
                        className="py-3 rounded-2xl font-semibold border-2 flex items-center justify-center gap-2"
                        style={type === t
                          ? { backgroundColor: t === 'entree' ? '#16A34A' : '#DC2626', borderColor: 'transparent', color: 'white' }
                          : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
                        }
                        whileTap={{ scale: 0.97 }}
                      >
                        {t === 'entree' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        {t === 'entree' ? 'Entrée' : 'Sortie'}
                      </motion.button>
                    ))}
                  </div>

                  {/* Catégorie */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Catégorie</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(CAT_LABELS) as [TransactionTresorerie['categorie'], { label: string; icon: React.ElementType }][]).map(([key, { label }]) => (
                        <motion.button
                          key={key}
                          onClick={() => setCat(key)}
                          className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
                          style={categorie === key
                            ? { backgroundColor: COLOR, borderColor: COLOR, color: 'white' }
                            : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
                          }
                          whileTap={{ scale: 0.95 }}
                        >
                          {label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Montant */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Montant (FCFA)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={montant}
                      onChange={e => setMontant(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-2xl font-bold text-center"
                      onFocus={e => (e.target.style.borderColor = COLOR)}
                      onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                    <div className="flex gap-2 mt-2">
                      {[1000, 5000, 10000, 50000].map(m => (
                        <motion.button
                          key={m}
                          onClick={() => setMontant(String(m))}
                          className="flex-1 py-2 rounded-xl border-2 text-xs font-semibold"
                          style={{ borderColor: `${COLOR}40`, color: COLOR }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {m >= 1000 ? `${m / 1000}k` : m}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Description</label>
                    <input
                      type="text"
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Ex : Cotisation mensuelle de Koffi Jean"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none"
                      onFocus={e => (e.target.style.borderColor = COLOR)}
                      onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                  </div>

                  <motion.button
                    onClick={handleSubmit}
                    className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                    style={{ backgroundColor: parseInt(montant, 10) > 0 && desc.trim() ? COLOR : '#9CA3AF' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Enregistrer la transaction
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

// ── Page principale ──────────────────────────────────────────

export function FinancesCooperative() {
  const navigate = useNavigate();
  const { speak } = useApp();
  const { user } = useUser();
  const {
    tresorerie,
    soldeActuel,
    ajouterTransaction,
    validerTransaction,
    annulerTransaction,
    getTotalCotisations,
    getTotalVentesGroupees,
    membres,
  } = useCooperative();

  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>('tout');
  const [filtreType, setFiltreType]       = useState<FiltreType>('tout');
  const [showModal, setShowModal]         = useState(false);
  const [txSelectionnee, setTxSel]        = useState<TransactionTresorerie | null>(null);

  // Stats calculées
  const totalCotisations   = getTotalCotisations();
  const totalVentesGroupees = getTotalVentesGroupees();

  const txFiltrees = useMemo(() => {
    let result = [...tresorerie];
    if (filtreType !== 'tout') result = result.filter(t => t.type === filtreType);
    if (filtrePeriode !== 'tout') {
      const jours = filtrePeriode === '7j' ? 7 : filtrePeriode === '30j' ? 30 : 90;
      const limite = new Date(Date.now() - jours * 86400000).toISOString();
      result = result.filter(t => t.date > limite);
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tresorerie, filtreType, filtrePeriode]);

  const totaux = useMemo(() => {
    const entrees = txFiltrees.filter(t => t.type === 'entree' && t.statut === 'validee').reduce((s, t) => s + t.montant, 0);
    const sorties = txFiltrees.filter(t => t.type === 'sortie' && t.statut === 'validee').reduce((s, t) => s + t.montant, 0);
    return { entrees, sorties };
  }, [txFiltrees]);

  // Répartition par catégorie
  const repartition = useMemo(() => {
    const map: Record<string, number> = {};
    tresorerie.filter(t => t.statut === 'validee').forEach(t => {
      map[t.categorie] = (map[t.categorie] || 0) + t.montant;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([cat, montant]) => ({
      cat,
      montant,
      pct: Math.round((montant / total) * 100),
      label: CAT_LABELS[cat]?.label || cat,
    })).sort((a, b) => b.montant - a.montant);
  }, [tresorerie]);

  const membresAJour = membres.filter(m => m.cotisationPayee).length;

  return (
    <SubPageLayout role="cooperateur" title="Finances">
      {/* ── HEADER ── */}
      <div
        className="relative pb-20 pt-safe"
        style={{ background: `linear-gradient(145deg, ${COLOR} 0%, ${COLOR}CC 100%)` }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-4 -translate-x-4" />

        {/* Solde */}
        <div className="relative px-5 text-center">
          <p className="text-white/70 text-sm mb-1">Trésorerie actuelle</p>
          <motion.p
            className="text-5xl font-bold text-white mb-1"
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {(soldeActuel || 0).toLocaleString('fr-FR')}
          </motion.p>
          <p className="text-white/50 text-sm font-bold">FCFA</p>
          <div className="mt-3 flex justify-center gap-3">
            <div className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center gap-2">
              <Users className="w-3 h-3 text-white/80" />
              <span className="text-sm text-white/90">{membresAJour}/{membres.length} cotisants</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs trésorerie ── */}
      <div className="px-5 -mt-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-5"
        >
          <KPIGrid cols={2}>
            <UniversalKPI
              label="Entrées"
              animatedTarget={totaux.entrees}
              suffix="FCFA"
              icon={TrendingUp}
              color="#16a34a"
              bgColor="rgba(240,253,244,0.9)"
              borderColor="rgba(34,197,94,0.35)"
              iconAnimation="float"
            />
            <UniversalKPI
              label="Sorties"
              animatedTarget={totaux.sorties}
              suffix="FCFA"
              icon={TrendingDown}
              color="#dc2626"
              bgColor="rgba(254,242,242,0.9)"
              borderColor="rgba(239,68,68,0.35)"
              iconAnimation="pulse"
            />
            <UniversalKPI
              label="Cotisations"
              animatedTarget={totalCotisations}
              suffix="FCFA"
              icon={Users}
              color="#2072AF"
              bgColor="rgba(239,246,255,0.9)"
              borderColor="rgba(59,130,246,0.35)"
              iconAnimation="bounce"
            />
            <UniversalKPI
              label="Solde net"
              animatedTarget={totaux.entrees - totaux.sorties}
              suffix="FCFA"
              icon={Wallet}
              color="#ea580c"
              bgColor="rgba(255,247,237,0.9)"
              borderColor="rgba(249,115,22,0.35)"
              iconAnimation="float"
            />
          </KPIGrid>
        </motion.div>
      </div>

      {/* ── RÉPARTITION ── */}
      {repartition.length > 0 && (
        <div className="px-5 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl border-2 border-gray-100 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5" style={{ color: COLOR }} />
              <h3 className="font-bold text-gray-900">Répartition par catégorie</h3>
            </div>
            <div className="space-y-3">
              {repartition.slice(0, 5).map((item, i) => (
                <motion.div
                  key={item.cat}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-gray-900">{item.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: COLOR }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ delay: 0.25 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── FILTRES + HISTORIQUE ── */}
      <div className="px-5 mt-4 pb-36">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-lg">Transactions</h3>
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">{txFiltrees.length} opération(s)</span>
          </div>
        </div>

        {/* Filtres type */}
        <div className="flex gap-2 mb-3">
          {([
            { id: 'tout',   label: 'Tout' },
            { id: 'entree', label: 'Entrées' },
            { id: 'sortie', label: 'Sorties' },
          ] as { id: FiltreType; label: string }[]).map(f => (
            <motion.button
              key={f.id}
              onClick={() => setFiltreType(f.id)}
              className="px-4 py-2 rounded-full border-2 text-sm font-semibold"
              style={filtreType === f.id
                ? { backgroundColor: COLOR, borderColor: COLOR, color: 'white' }
                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
              }
              whileTap={{ scale: 0.95 }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* Filtres période */}
        <div className="flex gap-2 mb-4">
          {([
            { id: 'tout', label: 'Toujours' },
            { id: '30j',  label: '30 jours' },
            { id: '7j',   label: '7 jours' },
          ] as { id: FiltrePeriode; label: string }[]).map(p => (
            <motion.button
              key={p.id}
              onClick={() => setFiltrePeriode(p.id)}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={filtrePeriode === p.id
                ? { backgroundColor: `${COLOR}15`, borderColor: COLOR, color: COLOR }
                : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#9CA3AF' }
              }
              whileTap={{ scale: 0.95 }}
            >
              {p.label}
            </motion.button>
          ))}
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {txFiltrees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm text-center">Aucune transaction pour cette période.</p>
              <motion.button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 rounded-2xl font-bold text-white"
                style={{ backgroundColor: COLOR }}
                whileTap={{ scale: 0.97 }}
              >
                Ajouter une transaction
              </motion.button>
            </div>
          ) : (
            txFiltrees.map((tx, i) => {
              const isEntree = tx.type === 'entree';
              const CatIcon = CAT_LABELS[tx.categorie]?.icon || Zap;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 250 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: isEntree ? '#DCFCE7' : '#FEE2E2' }}
                    >
                      <CatIcon className="w-5 h-5" style={{ color: isEntree ? '#16A34A' : '#DC2626' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-500">{CAT_LABELS[tx.categorie]?.label || tx.categorie}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base" style={{ color: isEntree ? '#16A34A' : '#DC2626' }}>
                        {isEntree ? '+' : '-'}{(tx.montant || 0).toLocaleString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-400">FCFA</p>
                      <div className="mt-1 flex items-center gap-1 justify-end">
                        {tx.statut === 'validee'    && <Check className="w-3 h-3 text-green-500" />}
                        {tx.statut === 'en_attente' && <Clock className="w-3 h-3 text-amber-500" />}
                        {tx.statut === 'annulee'    && <X    className="w-3 h-3 text-red-400" />}
                        <span className="text-xs" style={{
                          color: tx.statut === 'validee' ? '#16A34A' : tx.statut === 'annulee' ? '#DC2626' : '#D97706'
                        }}>
                          {tx.statut === 'validee' ? 'Validée' : tx.statut === 'en_attente' ? 'En attente' : 'Annulée'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions si en attente */}
                  {tx.statut === 'en_attente' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <motion.button
                        onClick={() => validerTransaction(tx.id)}
                        className="flex-1 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold flex items-center justify-center gap-1"
                        whileTap={{ scale: 0.97 }}
                      >
                        <Check className="w-4 h-4" /> Valider
                      </motion.button>
                      <motion.button
                        onClick={() => annulerTransaction(tx.id)}
                        className="flex-1 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold flex items-center justify-center gap-1"
                        whileTap={{ scale: 0.97 }}
                      >
                        <X className="w-4 h-4" /> Annuler
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── FAB AJOUTER ── */}
      <motion.button
        onClick={() => { setShowModal(true); }}
        className="fixed bottom-28 right-5 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-40"
        style={{ backgroundColor: COLOR }}
        whileTap={{ scale: 0.9 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <PlusCircle className="w-7 h-7 text-white" />
      </motion.button>

      <ModalAjoutTransaction
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdd={ajouterTransaction}
      />
    </SubPageLayout>
  );
}