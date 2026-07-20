import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Lock,
  Percent,
  RotateCcw,
  Search,
  ShoppingBag,
  Unlock,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import type { KeiwaTransaction, KeiwaTransactionType } from '../../types/julaba.types';

const PAGE_BG = '#FFF8F3';
const HEADER_COLOR = '#C46210';
const CREDIT_COLOR = '#1a8c5a';
const DEBIT_COLOR = '#e53e3e';

type FilterTab = 'all' | 'credits' | 'debits' | 'recharges';

const TYPE_META: Record<
  KeiwaTransactionType,
  { label: string; isCredit: boolean; Icon: LucideIcon }
> = {
  RECHARGE: { label: 'Rechargement', isCredit: true, Icon: Wallet },
  RETRAIT: { label: 'Retrait', isCredit: false, Icon: ArrowUpCircle },
  PAIEMENT_ENVOYE: { label: 'Paiement envoyé', isCredit: false, Icon: ShoppingBag },
  PAIEMENT_RECU: { label: 'Paiement reçu', isCredit: true, Icon: ArrowDownCircle },
  ESCROW_BLOQUE: { label: 'En attente (escrow)', isCredit: false, Icon: Lock },
  ESCROW_LIBERE: { label: 'Libéré', isCredit: true, Icon: Unlock },
  ESCROW_REMBOURSE: { label: 'Remboursé', isCredit: true, Icon: RotateCcw },
  COMMISSION_COOP: { label: 'Commission coopérative', isCredit: false, Icon: Percent },
  PART_SOCIALE: { label: 'Part sociale', isCredit: false, Icon: Users },
};

function getTxMeta(type: string): { label: string; isCredit: boolean; Icon: LucideIcon } {
  return (
    TYPE_META[type as KeiwaTransactionType] ?? {
      label: type,
      isCredit: false,
      Icon: ArrowUpCircle,
    }
  );
}

function txDate(tx: KeiwaTransaction & { created_at?: string }): Date {
  const raw = tx.createdAt || tx.created_at;
  const d = raw ? new Date(raw) : new Date(0);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function txAmount(tx: KeiwaTransaction & { montant?: number }): number {
  const n = Number(tx.amount ?? tx.montant ?? 0);
  return isNaN(n) ? 0 : n;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daySectionLabel(d: Date): string {
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daySortKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMontantFCFA(amount: number, isCredit: boolean): string {
  const abs = Math.round(Math.abs(amount));
  const formatted = abs.toLocaleString('fr-FR');
  return `${isCredit ? '+' : '-'}${formatted} FCFA`;
}

export function HistoriquePage() {
  const navigate = useNavigate();
  const { transactions } = useWallet();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedTx, setSelectedTx] = useState<KeiwaTransaction | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      const desc = (tx.description || '').toLowerCase();
      const meta = getTxMeta(tx.type);
      if (q && !desc.includes(q) && !meta.label.toLowerCase().includes(q)) return false;
      if (filter === 'credits' && !meta.isCredit) return false;
      if (filter === 'debits' && meta.isCredit) return false;
      if (filter === 'recharges' && tx.type !== 'RECHARGE') return false;
      return true;
    });
  }, [transactions, query, filter]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => txDate(b as KeiwaTransaction & { created_at?: string }).getTime() - txDate(a as KeiwaTransaction & { created_at?: string }).getTime()
    );
    const map = new Map<string, { label: string; items: KeiwaTransaction[] }>();
    for (const tx of sorted) {
      const d = txDate(tx as KeiwaTransaction & { created_at?: string });
      const key = daySortKey(d);
      if (!map.has(key)) {
        map.set(key, { label: daySectionLabel(d), items: [] });
      }
      map.get(key)!.items.push(tx);
    }
    const keys = [...map.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    return keys.map((k) => ({ key: k, ...map.get(k)! }));
  }, [filtered]);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'credits', label: 'Crédits' },
    { id: 'debits', label: 'Débits' },
    { id: 'recharges', label: 'Recharges' },
  ];

  return (
    <div className="min-h-screen pb-safe" style={{ backgroundColor: PAGE_BG }}>
      <header style={{ backgroundColor: HEADER_COLOR }} className="pt-safe pb-4">
        <div className="flex items-center gap-3 px-4 pt-4">
          <motion.button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}
            whileTap={{ scale: 0.9 }}
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </motion.button>
          <h1 className="text-lg font-bold text-white flex-1">Transactions</h1>
        </div>

        <div className="px-4 mt-3">
          <div
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            <Search className="w-4 h-4 text-white/90 flex-shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans la description…"
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
            />
          </div>
        </div>

        <div className="mt-3 pl-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(({ id, label }) => {
            const active = filter === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: active ? 'white' : 'rgba(255,255,255,0.15)',
                  color: active ? HEADER_COLOR : 'rgba(255,255,255,0.95)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.25)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                {label}
              </motion.button>
            );
          })}
        </div>
      </header>

      <main className="px-4 pt-4 pb-8">
        {grouped.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-base text-gray-500">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ key, label, items }) => (
              <section key={key}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: '#9a6b4a' }}>
                  {label}
                </p>
                <div
                  className="rounded-2xl overflow-hidden bg-white shadow-sm"
                  style={{ border: '1px solid rgba(196, 98, 16, 0.12)' }}
                >
                  {items.map((tx, idx) => {
                    const meta = getTxMeta(tx.type);
                    const { Icon } = meta;
                    const amount = txAmount(tx as KeiwaTransaction & { montant?: number });
                    const isCredit = meta.isCredit;
                    const color = isCredit ? CREDIT_COLOR : DEBIT_COLOR;
                    const bgIcon = isCredit ? 'rgba(26, 140, 90, 0.12)' : 'rgba(229, 62, 62, 0.1)';
                    const d = txDate(tx as KeiwaTransaction & { created_at?: string });
                    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const primaryLine = (tx.description || '').trim() || meta.label;

                    return (
                      <motion.div
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                        style={{ borderBottom: idx < items.length - 1 ? '1px solid rgba(196, 98, 16, 0.08)' : undefined }}
                        whileTap={{ scale: 0.99, backgroundColor: 'rgba(198,106,44,0.04)' }}
                      >
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: bgIcon }}
                        >
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-[15px] leading-snug truncate">{primaryLine}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>
                            {timeStr}
                          </p>
                        </div>
                        <p className="text-[15px] font-bold flex-shrink-0 tabular-nums" style={{ color }}>
                          {formatMontantFCFA(amount, isCredit)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <AnimatePresence>
          {selectedTx && (() => {
            const meta = getTxMeta(selectedTx.type);
            const amount = txAmount(selectedTx as KeiwaTransaction & { montant?: number });
            const color = meta.isCredit ? CREDIT_COLOR : DEBIT_COLOR;
            const d = txDate(selectedTx as KeiwaTransaction & { created_at?: string });
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-end justify-center"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                onClick={() => setSelectedTx(null)}
              >
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: '24px 24px 0 0', paddingBottom: 32 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: meta.isCredit ? 'rgba(26,140,90,0.12)' : 'rgba(229,62,62,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <meta.Icon className="w-8 h-8" style={{ color }} />
                    </div>
                    <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>
                      {meta.isCredit ? '+' : '-'}{Math.round(amount).toLocaleString('fr-FR')} FCFA
                    </p>
                    <p style={{ fontSize: 14, color: '#b8956a', marginTop: 4 }}>{meta.label}</p>
                  </div>
                  <div style={{ margin: '0 16px', borderRadius: 16, border: '1px solid rgba(198,106,44,0.15)', overflow: 'hidden' }}>
                    {[
                      { label: 'Date',        value: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                      { label: 'Statut',      value: (selectedTx as any).status || (selectedTx as any).statut || 'completed' },
                      { label: 'Référence',   value: selectedTx.id?.slice(0, 16) || '—' },
                      { label: 'Description', value: selectedTx.description || '—' },
                    ].map(({ label, value }, i, arr) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(198,106,44,0.08)' : 'none' }}>
                        <span style={{ fontSize: 14, color: '#888' }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: label === 'Statut' ? ((value === 'completed' || value === 'COMPLETED') ? '#1a8c5a' : '#e53e3e') : '#111', maxWidth: '55%', textAlign: 'right' }}>
                          {label === 'Statut' ? ((value === 'completed' || value === 'COMPLETED') ? '✓ Effectué' : '✗ Rejeté') : value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '16px 16px 0' }}>
                    <motion.button onClick={() => setSelectedTx(null)}
                      style={{ width: '100%', padding: 14, borderRadius: 16, background: HEADER_COLOR, color: 'white', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Fermer
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </main>
    </div>
  );
}
