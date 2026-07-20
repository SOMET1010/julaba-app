import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet, Users, TrendingUp, RefreshCw, Search, Plus, Minus,
  X, Check, AlertTriangle, CreditCard, ArrowUpRight, Settings,
  Download, Filter, Shield, Lock, Unlock, RotateCcw, Bell,
  BarChart3, PieChart, ChevronDown, Eye, EyeOff, Upload,
  ToggleLeft, ToggleRight, Star, Trash2, Edit3,
} from 'lucide-react';
import { BO_DARK } from './bo-theme';
import {
  boGetWalletStats, boGetAllWallets, boGetAllWalletTransactions,
  boCreditWallet, boDebitWallet,
  BOWallet, BOWalletStats, BOWalletTransaction,
} from '../../services/backoffice-api';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { API_URL } from '../../utils/api';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

const C = '#C66A2C';

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface ConfigItem {
  id?: string;
  type: 'service' | 'banque' | 'mobile_money';
  item_id: string;
  name: string;
  logo_text: string;
  logo_url?: string;
  color: string;
  description?: string;
  categorie?: string;
  actif: boolean;
  est_favori: boolean;
  ordre: number;
  frais_transaction?: number;
}

interface Parametre { [key: string]: string; }

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entite: string;
  entite_id: string;
  details: Record<string, unknown>;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface ChartData {
  volume30j: { jour: string; nb_transactions: number; credits: string; debits: string }[];
  top10: { first_name: string; last_name: string; phone: string; volume_total: string; nb_transactions: number }[];
}

type Tab = 'dashboard' | 'wallets' | 'transactions' | 'services' | 'banques' | 'mobile_money' | 'parametres';

// ── DEFAULTS ──────────────────────────────────────────────────────────────────
const DEFAULT_SERVICES: ConfigItem[] = [
  { type: 'service', item_id: 'cnps',     name: 'RSTI',        logo_text: 'RSTI', color: '#004a99', actif: true,  est_favori: true,  ordre: 0, categorie: 'factures'  },
  { type: 'service', item_id: 'cmu',      name: 'CMU',         logo_text: 'CMU',  color: '#00874a', actif: true,  est_favori: true,  ordre: 1, categorie: 'factures'  },
  { type: 'service', item_id: 'mairie',   name: 'Mairie',      logo_text: 'MR',   color: '#C66A2C', actif: true,  est_favori: true,  ordre: 2, categorie: 'factures'  },
  { type: 'service', item_id: 'cie',      name: 'CIE',         logo_text: 'CIE',  color: '#1a7abf', actif: true,  est_favori: false, ordre: 3, categorie: 'factures'  },
  { type: 'service', item_id: 'sodeci',   name: 'SODECI',      logo_text: 'SDC',  color: '#1a8c5a', actif: true,  est_favori: false, ordre: 4, categorie: 'factures'  },
  { type: 'service', item_id: 'lonase',   name: 'LONASE',      logo_text: 'LNS',  color: '#7c3aed', actif: true,  est_favori: false, ordre: 5, categorie: 'factures'  },
  { type: 'service', item_id: 'pharmacie',name: 'Pharmacie',   logo_text: 'PHM',  color: '#10b981', actif: true,  est_favori: false, ordre: 6, categorie: 'sante'     },
  { type: 'service', item_id: 'chu',      name: 'CHU Abidjan', logo_text: 'CHU',  color: '#3b82f6', actif: true,  est_favori: false, ordre: 7, categorie: 'sante'     },
  { type: 'service', item_id: 'uni',      name: 'Universités', logo_text: 'UNI',  color: '#7c3aed', actif: true,  est_favori: false, ordre: 8, categorie: 'education' },
  { type: 'service', item_id: 'lyc',      name: 'Lycées',      logo_text: 'LYC',  color: '#3b82f6', actif: true,  est_favori: false, ordre: 9, categorie: 'education' },
];

const DEFAULT_BANQUES: ConfigItem[] = [
  { type: 'banque', item_id: 'bicici', name: 'BICICI',           logo_text: 'BICICI', color: '#004a99', actif: true, est_favori: false, ordre: 0 },
  { type: 'banque', item_id: 'sib',    name: 'SIB',              logo_text: 'SIB',    color: '#e8000d', actif: true, est_favori: false, ordre: 1 },
  { type: 'banque', item_id: 'eco',    name: 'Ecobank',          logo_text: 'ECO',    color: '#003087', actif: true, est_favori: false, ordre: 2 },
  { type: 'banque', item_id: 'uba',    name: 'UBA',              logo_text: 'UBA',    color: '#e2001a', actif: true, est_favori: false, ordre: 3 },
  { type: 'banque', item_id: 'sg',     name: 'Société Générale', logo_text: 'SG',     color: '#e60028', actif: true, est_favori: false, ordre: 4 },
  { type: 'banque', item_id: 'biao',   name: 'BIAO-CI',          logo_text: 'BIAO',   color: '#00447c', actif: true, est_favori: false, ordre: 5 },
  { type: 'banque', item_id: 'bni',    name: 'BNI',              logo_text: 'BNI',    color: '#006633', actif: true, est_favori: false, ordre: 6 },
  { type: 'banque', item_id: 'nsia',   name: 'NSIA Banque',      logo_text: 'NSIA',   color: '#f77f00', actif: true, est_favori: false, ordre: 7 },
];

const DEFAULT_MM: ConfigItem[] = [
  { type: 'mobile_money', item_id: 'wave',   name: 'Wave',         logo_text: 'WV',  color: '#00b9f5', actif: true, est_favori: false, ordre: 0, frais_transaction: 0 },
  { type: 'mobile_money', item_id: 'orange', name: 'Orange Money', logo_text: 'OM',  color: '#FF6600', actif: true, est_favori: false, ordre: 1, frais_transaction: 1 },
  { type: 'mobile_money', item_id: 'mtn',    name: 'MTN MoMo',     logo_text: 'MTN', color: '#FFCC00', actif: true, est_favori: false, ordre: 2, frais_transaction: 1 },
  { type: 'mobile_money', item_id: 'moov',   name: 'Moov Money',   logo_text: 'MV',  color: '#0057A8', actif: true, est_favori: false, ordre: 3, frais_transaction: 1 },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function apiPost(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function apiPut(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function apiDelete(path: string): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export function BOKeiwa() {
  const { isAuthLoading } = useBackOffice();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<BOWalletStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [wallets, setWallets] = useState<BOWallet[]>([]);
  const [walletsTotal, setWalletsTotal] = useState(0);
  const [transactions, setTransactions] = useState<BOWalletTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txType, setTxType] = useState('');
  const [txDateDebut, setTxDateDebut] = useState('');
  const [txDateFin, setTxDateFin] = useState('');
  const [txMontantMin, setTxMontantMin] = useState('');
  const [txMontantMax, setTxMontantMax] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [soldeMinFilter, setSoldeMinFilter] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<BOWallet | null>(null);
  const [selectedTx, setSelectedTx] = useState<BOWalletTransaction | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'credit' | 'debit' | 'bloquer' | 'reinit'; wallet: BOWallet } | null>(null);
  const [actionMontant, setActionMontant] = useState('');
  const [actionDesc, setActionDesc] = useState('');
  const [actionConfirm, setActionConfirm] = useState('');
  const [services, setServices] = useState<ConfigItem[]>(DEFAULT_SERVICES);
  const [banques, setBanques] = useState<ConfigItem[]>(DEFAULT_BANQUES);
  const [mobileMoneys, setMobileMoneys] = useState<ConfigItem[]>(DEFAULT_MM);
  const [editItem, setEditItem] = useState<ConfigItem | null>(null);
  const [addItem, setAddItem] = useState<Partial<ConfigItem> | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ConfigItem | null>(null);
  const [parametres, setParametres] = useState<Parametre>({});
  const [parametresEdited, setParametresEdited] = useState<Parametre>({});
  const [banquesAttente, setBanquesAttente] = useState<{ banque_id: string; nb_attente: number }[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  // ── LOADERS ────────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        apiGet('/admin/wallets/stats') as Promise<BOWalletStats>,
        apiGet('/admin/wallets/stats/chart') as Promise<ChartData>,
      ]);
      setStats(s);
      setChartData(c);
    } catch { toast.error('Erreur chargement stats'); }
  }, []);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statutFilter) params.set('statut', statutFilter);
      if (soldeMinFilter) params.set('solde_min', soldeMinFilter);
      const data = await apiGet(`/admin/wallets?${params}`) as { wallets: BOWallet[]; total: number };
      setWallets(data.wallets);
      setWalletsTotal(data.total);
    } catch { toast.error('Erreur chargement wallets'); }
    finally { setLoading(false); }
  }, [search, roleFilter, statutFilter, soldeMinFilter]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (txType) params.set('type', txType);
      if (txSearch) params.set('search', txSearch);
      if (txDateDebut) params.set('date_debut', txDateDebut);
      if (txDateFin) params.set('date_fin', txDateFin);
      if (txMontantMin) params.set('montant_min', txMontantMin);
      if (txMontantMax) params.set('montant_max', txMontantMax);
      const data = await apiGet(`/admin/wallets/transactions?${params}`) as { transactions: BOWalletTransaction[]; total: number };
      setTransactions(data.transactions);
      setTxTotal(data.total);
    } catch { toast.error('Erreur chargement transactions'); }
    finally { setLoading(false); }
  }, [txType, txSearch, txDateDebut, txDateFin, txMontantMin, txMontantMax]);

  const loadConfig = useCallback(async () => {
    try {
      const [s, b, m, p, a] = await Promise.all([
        apiGet('/admin/wallets/config/items?type=service') as Promise<ConfigItem[]>,
        apiGet('/admin/wallets/config/items?type=banque') as Promise<ConfigItem[]>,
        apiGet('/admin/wallets/config/items?type=mobile_money') as Promise<ConfigItem[]>,
        apiGet('/admin/wallets/config/parametres') as Promise<Parametre>,
        apiGet('/admin/wallets/config/banques/attente') as Promise<{ banque_id: string; nb_attente: number }[]>,
      ]);
      if (s.length) setServices(s);
      if (b.length) setBanques(b);
      if (m.length) setMobileMoneys(m);
      setParametres(p); setParametresEdited(p);
      setBanquesAttente(a);
    } catch { /* garder defaults */ }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const logs = await apiGet('/admin/wallets/audit/logs?limit=50') as AuditLog[];
      setAuditLogs(logs);
    } catch { toast.error('Erreur audit'); }
  }, []);

  useEffect(() => { if (!isAuthLoading) { loadStats(); loadConfig(); } }, [isAuthLoading]);
  useEffect(() => { if (!isAuthLoading && tab === 'wallets') loadWallets(); }, [tab, search, roleFilter, statutFilter, soldeMinFilter, isAuthLoading]);
  useEffect(() => { if (!isAuthLoading && tab === 'transactions') loadTransactions(); }, [tab, txType, txSearch, txDateDebut, txDateFin, txMontantMin, txMontantMax, isAuthLoading]);

  if (isAuthLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <motion.div style={{ width: 40, height: 40, borderRadius: '50%', border: `4px solid ${C}`, borderTopColor: 'transparent' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
    </div>
  );

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  const handleAction = async () => {
    if (!actionModal) return;
    try {
      if (actionModal.type === 'credit') {
        const m = parseInt(actionMontant);
        if (isNaN(m) || m <= 0) { toast.error('Montant invalide'); return; }
        await boCreditWallet(actionModal.wallet.user_id, m, actionDesc || 'Credit manuel admin');
        toast.success(`${m.toLocaleString('fr-FR')} FCFA crédités`);
      } else if (actionModal.type === 'debit') {
        const m = parseInt(actionMontant);
        if (isNaN(m) || m <= 0) { toast.error('Montant invalide'); return; }
        await boDebitWallet(actionModal.wallet.user_id, m, actionDesc || 'Debit manuel admin');
        toast.success(`${m.toLocaleString('fr-FR')} FCFA débités`);
      } else if (actionModal.type === 'bloquer') {
        await apiPost(`/admin/wallets/${actionModal.wallet.user_id}/bloquer`, { raison: actionDesc });
        toast.success('Portefeuille bloqué');
      } else if (actionModal.type === 'reinit') {
        if (actionConfirm !== 'CONFIRMER') { toast.error('Tapez CONFIRMER pour valider'); return; }
        await apiPost(`/admin/wallets/${actionModal.wallet.user_id}/reinitialiser`, { confirmation: 'CONFIRMER' });
        toast.success('Solde réinitialisé');
      }
      setActionModal(null); setActionMontant(''); setActionDesc(''); setActionConfirm('');
      loadWallets(); loadStats();
    } catch (e: unknown) { toast.error('Erreur: ' + (e instanceof Error ? e.message : 'inconnue')); }
  };

  const handleExportWallets = async () => {
    try {
      const data = await apiGet('/admin/wallets/export/csv') as { csv: string };
      downloadCSV(data.csv, `wallets-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch { toast.error('Erreur export'); }
  };

  const handleExportTx = async () => {
    try {
      const data = await apiGet('/admin/wallets/transactions/export/csv') as { csv: string };
      downloadCSV(data.csv, `transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch { toast.error('Erreur export'); }
  };

  const handleSaveItem = async () => {
    if (!editItem) return;
    const update = (list: ConfigItem[]) =>
      list.map(i => i.item_id === editItem.item_id ? { ...editItem } : i);
    try {
      if (editItem.id) {
        await apiPut(`/admin/wallets/config/items/${editItem.id}`, editItem);
      } else {
        await apiPost('/admin/wallets/config/items', editItem);
      }
      if (editItem.type === 'service') setServices(update);
      else if (editItem.type === 'banque') setBanques(update);
      else setMobileMoneys(update);
      toast.success('Modifié');
      setEditItem(null);
    } catch {
      toast.error('Impossible de sauvegarder. Réessaie.');
    }
  };

  const handleAddItem = () => {
    if (!addItem?.name || !addItem?.type) { toast.error('Nom et type requis'); return; }
    const newItem: ConfigItem = {
      type: addItem.type as ConfigItem['type'],
      item_id: addItem.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      name: addItem.name,
      logo_text: addItem.logo_text || addItem.name.slice(0, 4).toUpperCase(),
      logo_url: addItem.logo_url,
      color: addItem.color || '#C66A2C',
      description: addItem.description,
      categorie: addItem.categorie,
      actif: true,
      est_favori: false,
      ordre: addItem.ordre ?? 99,
      frais_transaction: addItem.frais_transaction,
    };
    if (newItem.type === 'service') setServices(prev => [...prev, newItem]);
    else if (newItem.type === 'banque') setBanques(prev => [...prev, newItem]);
    else setMobileMoneys(prev => [...prev, newItem]);
    toast.success('Ajouté');
    setAddItem(null);
    apiPost('/admin/wallets/config/items', newItem).catch(() => {});
  };

  const handleDeleteItem = (item: ConfigItem) => {
    setConfirmDeleteItem(item);
    return;
  };

  const handleToggleItem = (item: ConfigItem) => {
    const updated = { ...item, actif: !item.actif };
    const update = (list: ConfigItem[]) =>
      list.map(i => i.item_id === item.item_id ? updated : i);
    if (item.type === 'service') setServices(update);
    else if (item.type === 'banque') setBanques(update);
    else setMobileMoneys(update);
    toast.success(updated.actif ? 'Activé' : 'Désactivé');
    if (item.id) {
      apiPut(`/admin/wallets/config/items/${item.id}`, updated).catch(() => {});
    }
  };

  const handleToggleFavori = (item: ConfigItem) => {
    const updated = { ...item, est_favori: !item.est_favori };
    const update = (list: ConfigItem[]) =>
      list.map(i => i.item_id === item.item_id ? updated : i);
    if (item.type === 'service') setServices(update);
    else if (item.type === 'banque') setBanques(update);
    else setMobileMoneys(update);
    if (item.id) {
      apiPut(`/admin/wallets/config/items/${item.id}`, updated).catch(() => {});
    }
  };

  const handleUploadLogo = async (file: File, itemId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/admin/wallets/config/items/upload-logo`, { method: 'POST', credentials: 'include', body: formData });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { url: string };
      const item = [...services, ...banques, ...mobileMoneys].find(i => i.item_id === itemId);
      if (item?.id) {
        await apiPut(`/admin/wallets/config/items/${item.id}`, { ...item, logo_url: data.url });
        toast.success('Logo téléversé');
        loadConfig();
      }
    } catch { toast.error('Erreur upload'); }
  };

  const handleSaveParametres = async () => {
    try {
      await apiPut('/admin/wallets/config/parametres', parametresEdited);
      setParametres(parametresEdited);
      toast.success('Paramètres sauvegardés');
    } catch { toast.error('Erreur sauvegarde'); }
  };

  const handleNotifierBanque = async (banqueId: string) => {
    try {
      await apiPost(`/admin/wallets/config/banques/notifier/${banqueId}`);
      toast.success('Utilisatrices notifiées');
      loadConfig();
    } catch { toast.error('Erreur notification'); }
  };

  // ── TABS ───────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',    label: 'Tableau de bord', icon: <BarChart3 size={14}/> },
    { id: 'wallets',      label: 'Wallets',         icon: <Users size={14}/> },
    { id: 'transactions', label: 'Transactions',    icon: <TrendingUp size={14}/> },
    { id: 'services',     label: 'Services',        icon: <CreditCard size={14}/> },
    { id: 'banques',      label: 'Banques',         icon: <Shield size={14}/> },
    { id: 'mobile_money', label: 'Mobile Money',    icon: <ArrowUpRight size={14}/> },
    { id: 'parametres',   label: 'Paramètres',      icon: <Settings size={14}/> },
  ];

  const S = { card: { background: 'white', borderRadius: 16, border: '1px solid rgba(198,106,44,0.1)', padding: '16px 20px' } };
  const PIECOLORS = [C, '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <div style={{ padding: 24, background: '#F9F5F0', minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: BO_DARK }}>Keiwa Wallet</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 3 }}>Gestion complète du portefeuille électronique</p>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <motion.button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${tab === t.id ? C : 'rgba(198,106,44,0.2)'}`, background: tab === t.id ? C : 'white', color: tab === t.id ? 'white' : '#7a5a3a', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            whileTap={{ scale: 0.97 }}
          >{t.icon}{t.label}</motion.button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div>
          {/* KPIs */}
          <KPIGrid className="mb-6">
            <UniversalKPI label="Total wallets" value={stats?.total_wallets?.toLocaleString('fr-FR') ?? '-'} icon={Users} color={C} />
            <UniversalKPI label="Wallets actifs" value={stats?.wallets_actifs?.toLocaleString('fr-FR') ?? '-'} icon={Check} color="#10b981" />
            <UniversalKPI label="Wallets à zéro" value={((stats as unknown as Record<string, unknown>)?.wallets_zero as number)?.toLocaleString('fr-FR') ?? '-'} icon={AlertTriangle} color="#f59e0b" />
            <UniversalKPI label="Volume total" value={`${Math.round(Number(stats?.volume_total ?? 0)).toLocaleString('fr-FR')} FCFA`} icon={TrendingUp} color="#3b82f6" />
            <UniversalKPI label="Transactions 24h" value={stats?.transactions_today?.toLocaleString('fr-FR') ?? '-'} icon={ArrowUpRight} color="#8b5cf6" />
            <UniversalKPI label="Transactions 7j" value={((stats as unknown as Record<string, unknown>)?.transactions_7j as number)?.toLocaleString('fr-FR') ?? '-'} icon={Filter} color="#ec4899" />
            <UniversalKPI label="Transactions 30j" value={((stats as unknown as Record<string, unknown>)?.transactions_30j as number)?.toLocaleString('fr-FR') ?? '-'} icon={BarChart3} color="#14b8a6" />
            <UniversalKPI label="Recharge moyenne" value={`${Math.round(Number((stats as unknown as Record<string, unknown>)?.taux_recharge_moyen ?? 0)).toLocaleString('fr-FR')} FCFA`} icon={Wallet} color={C} />
          </KPIGrid>

          {/* GRAPHIQUES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Courbe 30j */}
            <div style={{ ...S.card, gridColumn: '1 / -1' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: BO_DARK, marginBottom: 16 }}>Volume journalier - 30 derniers jours</p>
              {chartData?.volume30j?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.volume30j.map(d => ({ jour: new Date(d.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), credits: Number(d.credits), debits: Number(d.debits) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(198,106,44,0.1)"/>
                    <XAxis dataKey="jour" tick={{ fontSize: 10 }}/>
                    <YAxis tick={{ fontSize: 10 }} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
                    <Tooltip/>
                    <Legend/>
                    <Area type="monotone" dataKey="credits" stroke="#10b981" fill="rgba(16,185,129,0.15)" name="Crédits"/>
                    <Area type="monotone" dataKey="debits" stroke="#ef4444" fill="rgba(239,68,68,0.1)" name="Débits"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#b8956a', fontSize: 13, textAlign: 'center', padding: 32 }}>Aucune donnée sur 30 jours</p>}
            </div>

            {/* Camembert */}
            <div style={S.card}>
              <p style={{ fontSize: 13, fontWeight: 700, color: BO_DARK, marginBottom: 16 }}>Répartition crédit / débit</p>
              {stats && (Number(stats.total_credits) + Number(stats.total_debits)) > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie data={[{ name: 'Crédits', value: Number(stats.total_credits) }, { name: 'Débits', value: Number(stats.total_debits) }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                      <Cell fill="#10b981"/><Cell fill="#ef4444"/>
                    </Pie>
                    <Tooltip/><Legend/>
                  </RechartsPie>
                </ResponsiveContainer>
              ) : <p style={{ color: '#b8956a', fontSize: 13, textAlign: 'center', padding: 32 }}>Aucune donnée</p>}
            </div>

            {/* Top 10 */}
            <div style={S.card}>
              <p style={{ fontSize: 13, fontWeight: 700, color: BO_DARK, marginBottom: 16 }}>Top 10 - volume transactions</p>
              {chartData?.top10?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData.top10.map(u => ({ name: `${u.first_name} ${u.last_name}`.slice(0, 12), volume: Number(u.volume_total) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(198,106,44,0.1)"/>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }}/>
                    <YAxis tick={{ fontSize: 9 }} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
                    <Tooltip/>
                    <Bar dataKey="volume" fill={C} name="Volume FCFA"/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#b8956a', fontSize: 13, textAlign: 'center', padding: 32 }}>Aucune donnée</p>}
            </div>
          </div>

          <motion.button onClick={() => { loadStats(); loadConfig(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: `1px solid ${C}`, background: 'white', color: C, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>
            <RefreshCw size={14}/>Actualiser
          </motion.button>
        </div>
      )}

      {/* ── WALLETS ── */}
      {tab === 'wallets' && (
        <div>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 12, padding: '9px 14px', border: '1px solid rgba(198,106,44,0.2)' }}>
              <Search size={15} color="#b8956a"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, téléphone..." style={{ border: 'none', outline: 'none', fontSize: 13, color: '#2a1a0a', background: 'transparent', flex: 1 }}/>
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white', cursor: 'pointer' }}>
              <option value="">Tous les rôles</option>
              {['marchand','producteur','cooperative','institution','identificateur'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white', cursor: 'pointer' }}>
              <option value="">Tous statuts</option>
              <option value="actif">Actifs (solde &gt; 0)</option>
              <option value="zero">À zéro</option>
            </select>
            <input value={soldeMinFilter} onChange={e => setSoldeMinFilter(e.target.value)} placeholder="Solde min (FCFA)" type="number" style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white', width: 160 }}/>
            <motion.button onClick={handleExportWallets} style={{ padding: '9px 14px', borderRadius: 12, border: `1px solid ${C}`, background: 'white', color: C, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} whileTap={{ scale: 0.97 }}>
              <Download size={14}/>Export CSV
            </motion.button>
            <motion.button onClick={() => { setShowAudit(true); loadAudit(); }} style={{ padding: '9px 14px', borderRadius: 12, border: '1px solid #8b5cf6', background: 'white', color: '#8b5cf6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} whileTap={{ scale: 0.97 }}>
              <Eye size={14}/>Audit
            </motion.button>
          </div>
          <p style={{ fontSize: 12, color: '#b8956a', marginBottom: 10 }}>{walletsTotal} wallet{walletsTotal > 1 ? 's' : ''} trouvé{walletsTotal > 1 ? 's' : ''}</p>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#b8956a' }}>Chargement...</div> : (
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(198,106,44,0.1)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'rgba(198,106,44,0.05)' }}>
                    {['Utilisateur','Téléphone','Rôle','Solde (FCFA)','Bloqué','Statut','Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#b8956a', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w, i) => (
                    <tr key={w.id} style={{ borderTop: '1px solid rgba(198,106,44,0.07)', background: i % 2 === 0 ? 'white' : 'rgba(198,106,44,0.015)', cursor: 'pointer' }}
                      onClick={() => setSelectedWallet(w)}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#2a1a0a' }}>{w.prenoms} {w.nom}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#7a5a3a' }}>{w.telephone}</td>
                      <td style={{ padding: '11px 14px' }}><span style={{ fontSize: 10, fontWeight: 600, color: C, background: 'rgba(198,106,44,0.1)', padding: '2px 7px', borderRadius: 8 }}>{w.role}</span></td>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#10b981' }}>{Math.round(Number(w.solde)).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#ef4444' }}>{Math.round(Number(w.solde_bloque)).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '11px 14px' }}><span style={{ fontSize: 10, fontWeight: 600, color: (w as unknown as Record<string,unknown>).status === 'actif' ? '#10b981' : '#ef4444', background: (w as unknown as Record<string,unknown>).status === 'actif' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', padding: '2px 7px', borderRadius: 8 }}>{String((w as unknown as Record<string,unknown>).status || 'actif')}</span></td>
                      <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { type: 'credit' as const, label: '+', color: '#047857', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
                            { type: 'debit' as const, label: '-', color: '#dc2626', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
                            { type: 'bloquer' as const, label: '🔒', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
                            { type: 'reinit' as const, label: '↺', color: '#dc2626', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.2)' },
                          ].map(btn => (
                            <motion.button key={btn.type} onClick={() => setActionModal({ type: btn.type, wallet: w })}
                              style={{ width: 28, height: 28, borderRadius: 8, background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              whileTap={{ scale: 0.9 }}
                            >{btn.label}</motion.button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {wallets.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: '#b8956a' }}>Aucun wallet</p>}
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {tab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 12, padding: '9px 14px', border: '1px solid rgba(198,106,44,0.2)', flex: 2, minWidth: 200 }}>
              <Search size={15} color="#b8956a"/>
              <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Utilisateur, description..." style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'transparent' }}/>
            </div>
            <select value={txType} onChange={e => setTxType(e.target.value)} style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white', cursor: 'pointer' }}>
              <option value="">Tous types</option>
              <option value="credit">Crédit</option>
              <option value="debit">Débit</option>
            </select>
            <input type="date" value={txDateDebut} onChange={e => setTxDateDebut(e.target.value)} style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white' }}/>
            <input type="date" value={txDateFin} onChange={e => setTxDateFin(e.target.value)} style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white' }}/>
            <input type="number" value={txMontantMin} onChange={e => setTxMontantMin(e.target.value)} placeholder="Min FCFA" style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white', width: 120 }}/>
            <input type="number" value={txMontantMax} onChange={e => setTxMontantMax(e.target.value)} placeholder="Max FCFA" style={{ padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', fontSize: 13, color: '#7a5a3a', background: 'white', width: 120 }}/>
            <motion.button onClick={handleExportTx} style={{ padding: '9px 14px', borderRadius: 12, border: `1px solid ${C}`, background: 'white', color: C, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} whileTap={{ scale: 0.97 }}>
              <Download size={14}/>Export CSV
            </motion.button>
          </div>
          <p style={{ fontSize: 12, color: '#b8956a', marginBottom: 10 }}>{txTotal} transaction{txTotal > 1 ? 's' : ''}</p>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#b8956a' }}>Chargement...</div> : (
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(198,106,44,0.1)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'rgba(198,106,44,0.05)' }}>
                    {['Date','Utilisateur','Type','Montant (FCFA)','Description','Statut'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#b8956a', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <tr key={tx.id} style={{ borderTop: '1px solid rgba(198,106,44,0.07)', background: i % 2 === 0 ? 'white' : 'rgba(198,106,44,0.015)', cursor: 'pointer' }}
                        onClick={() => setSelectedTx(tx)}
                      >
                        <td style={{ padding: '11px 14px', fontSize: 11, color: '#7a5a3a', whiteSpace: 'nowrap' }}>{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#2a1a0a' }}>{tx.prenoms} {tx.nom}</td>
                        <td style={{ padding: '11px 14px' }}><span style={{ fontSize: 10, fontWeight: 700, color: isCredit ? '#047857' : '#dc2626', background: isCredit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', padding: '2px 7px', borderRadius: 8 }}>{isCredit ? '↑ CRÉDIT' : '↓ DÉBIT'}</span></td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: isCredit ? '#10b981' : '#ef4444' }}>{isCredit ? '+' : '-'}{Math.round(Number(tx.montant)).toLocaleString('fr-FR')}</td>
                        <td style={{ padding: '11px 14px', fontSize: 11, color: '#7a5a3a', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || '-'}</td>
                        <td style={{ padding: '11px 14px' }}><span style={{ fontSize: 10, fontWeight: 600, color: tx.statut === 'completed' ? '#047857' : '#dc2626' }}>{tx.statut === 'completed' ? '✓ Effectué' : tx.statut}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {transactions.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: '#b8956a' }}>Aucune transaction</p>}
            </div>
          )}
        </div>
      )}

      {/* ── SERVICES / BANQUES / MM ── */}
      {(['services', 'banques', 'mobile_money'] as Tab[]).includes(tab) && (() => {
        const isServices = tab === 'services';
        const isBanques = tab === 'banques';
        const isMM = tab === 'mobile_money';
        const list = isServices ? services : isBanques ? banques : mobileMoneys;
        const type: ConfigItem['type'] = isServices ? 'service' : isBanques ? 'banque' : 'mobile_money';
        const title = isServices ? 'Services de paiement' : isBanques ? 'Banques partenaires' : 'Mobile Money';

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: BO_DARK }}>{title}</p>
                <p style={{ fontSize: 12, color: '#b8956a', marginTop: 2 }}>Configurez noms, logos et couleurs affichés dans Keiwa</p>
              </div>
              <motion.button onClick={() => setAddItem({ type, actif: true, est_favori: false, ordre: list.length, color: '#C66A2C', frais_transaction: 0 })}
                style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: C, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                whileTap={{ scale: 0.97 }}
              ><Plus size={14}/>Ajouter</motion.button>
            </div>

            {isBanques && banquesAttente.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 8 }}>Liste d'attente</p>
                {banquesAttente.map(b => (
                  <div key={b.banque_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#7a5a3a' }}>{b.banque_id} - <strong>{b.nb_attente}</strong> utilisatrice{b.nb_attente > 1 ? 's' : ''} en attente</span>
                    <motion.button onClick={() => handleNotifierBanque(b.banque_id)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#f59e0b', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} whileTap={{ scale: 0.95 }}>
                      <Bell size={11}/>Notifier
                    </motion.button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {list.map(item => (
                <div key={item.item_id} style={{ background: 'white', borderRadius: 14, padding: '12px 14px', border: `1.5px solid ${item.actif ? 'rgba(198,106,44,0.15)' : 'rgba(0,0,0,0.07)'}`, opacity: item.actif ? 1 : 0.55, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Logo */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: item.logo_url ? 'white' : item.color, border: item.logo_url ? '1px solid rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                      onClick={() => { setUploadTarget(item.item_id); fileInputRef.current?.click(); }}
                    >
                      {item.logo_url ? <img src={item.logo_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}/> : <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{item.logo_text}</span>}
                    </div>
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: C, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      onClick={() => { setUploadTarget(item.item_id); fileInputRef.current?.click(); }}
                    >
                      <Upload size={9} color="white"/>
                    </div>
                  </div>
                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#2a1a0a', truncate: true } as React.CSSProperties}>{item.name}</p>
                      {item.est_favori && <Star size={11} color="#f59e0b" fill="#f59e0b"/>}
                    </div>
                    {item.description && <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{item.description}</p>}
                    {isMM && item.frais_transaction !== undefined && <p style={{ fontSize: 10, color: '#10b981', marginTop: 1 }}>Frais: {item.frais_transaction}%</p>}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <motion.button onClick={() => handleToggleFavori(item)} style={{ width: 28, height: 28, borderRadius: 8, background: item.est_favori ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.04)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                      <Star size={12} color={item.est_favori ? '#f59e0b' : '#ccc'} fill={item.est_favori ? '#f59e0b' : 'none'}/>
                    </motion.button>
                    <motion.button onClick={() => setEditItem({ ...item })} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(198,106,44,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                      <Edit3 size={12} color={C}/>
                    </motion.button>
                    <motion.button onClick={() => handleToggleItem(item)} style={{ width: 28, height: 28, borderRadius: 8, background: item.actif ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                      {item.actif ? <ToggleRight size={14} color="#047857"/> : <ToggleLeft size={14} color="#dc2626"/>}
                    </motion.button>
                    <motion.button onClick={() => handleDeleteItem(item)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                      <Trash2 size={12} color="#dc2626"/>
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>

            {/* Input upload caché */}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file && uploadTarget) { handleUploadLogo(file, uploadTarget); e.target.value = ''; setUploadTarget(null); }
              }}
            />
          </div>
        );
      })()}

      {/* ── PARAMÈTRES ── */}
      {tab === 'parametres' && (
        <div style={{ maxWidth: 600 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: BO_DARK, marginBottom: 16 }}>Paramètres globaux Keiwa</p>
          {[
            { cle: 'plafond_mensuel',      label: 'Plafond mensuel (FCFA)',          type: 'number' },
            { cle: 'plafond_transaction',  label: 'Plafond par transaction (FCFA)',   type: 'number' },
            { cle: 'montant_min_recharge', label: 'Montant minimum recharge (FCFA)',  type: 'number' },
            { cle: 'montant_min_retrait',  label: 'Montant minimum retrait (FCFA)',   type: 'number' },
            { cle: 'transferts_actifs',    label: 'Transferts entre utilisateurs',    type: 'toggle' },
            { cle: 'paiements_qr_actifs',  label: 'Paiements QR',                    type: 'toggle' },
            { cle: 'message_maintenance',  label: 'Message de maintenance',           type: 'text'   },
          ].map(({ cle, label, type }) => (
            <div key={cle} style={{ ...S.card, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#2a1a0a' }}>{label}</p>
                <p style={{ fontSize: 11, color: '#b8956a', marginTop: 2 }}>{cle}</p>
              </div>
              {type === 'toggle' ? (
                <motion.button onClick={() => setParametresEdited(p => ({ ...p, [cle]: p[cle] === 'true' ? 'false' : 'true' }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {parametresEdited[cle] === 'true' ? <ToggleRight size={32} color="#10b981"/> : <ToggleLeft size={32} color="#ccc"/>}
                </motion.button>
              ) : (
                <input
                  type={type}
                  value={parametresEdited[cle] || ''}
                  onChange={e => setParametresEdited(p => ({ ...p, [cle]: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(198,106,44,0.2)', fontSize: 14, color: '#2a1a0a', background: 'white', outline: 'none', width: type === 'text' ? 200 : 120, textAlign: type === 'number' ? 'right' : 'left' }}
                />
              )}
            </div>
          ))}
          <motion.button onClick={handleSaveParametres} style={{ marginTop: 8, padding: '12px 24px', borderRadius: 14, border: 'none', background: C, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} whileTap={{ scale: 0.97 }}>
            <Check size={16}/>Enregistrer les paramètres
          </motion.button>
        </div>
      )}

      {/* ── MODAL WALLET DÉTAIL ── */}
      <AnimatePresence>
        {selectedWallet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setSelectedWallet(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflow: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a' }}>{selectedWallet.prenoms} {selectedWallet.nom}</p>
                  <p style={{ fontSize: 12, color: '#b8956a' }}>{selectedWallet.telephone} · {selectedWallet.role}</p>
                </div>
                <motion.button onClick={() => setSelectedWallet(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} whileTap={{ scale: 0.9 }}><X size={16}/></motion.button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, color: '#b8956a', fontWeight: 600 }}>SOLDE DISPONIBLE</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{Math.round(Number(selectedWallet.solde)).toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, color: '#b8956a', fontWeight: 600 }}>SOLDE BLOQUÉ</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{Math.round(Number(selectedWallet.solde_bloque)).toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { type: 'credit' as const, label: 'Créditer', color: '#10b981' },
                  { type: 'debit' as const, label: 'Débiter', color: '#ef4444' },
                  { type: 'bloquer' as const, label: 'Bloquer', color: '#8b5cf6' },
                  { type: 'reinit' as const, label: 'Réinit.', color: '#dc2626' },
                ].map(btn => (
                  <motion.button key={btn.type} onClick={() => { setSelectedWallet(null); setActionModal({ type: btn.type, wallet: selectedWallet }); }}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${btn.color}20`, background: `${btn.color}10`, color: btn.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    whileTap={{ scale: 0.97 }}
                  >{btn.label}</motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL TRANSACTION DÉTAIL ── */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setSelectedTx(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a' }}>Détail transaction</p>
                <motion.button onClick={() => setSelectedTx(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} whileTap={{ scale: 0.9 }}><X size={16}/></motion.button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: selectedTx.type === 'credit' ? '#10b981' : '#ef4444' }}>
                  {selectedTx.type === 'credit' ? '+' : '-'}{Math.round(Number(selectedTx.montant)).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div style={{ borderRadius: 12, border: '1px solid rgba(198,106,44,0.1)', overflow: 'hidden' }}>
                {[
                  { label: 'Utilisateur', value: `${selectedTx.prenoms} ${selectedTx.nom}` },
                  { label: 'Téléphone', value: selectedTx.telephone },
                  { label: 'Type', value: selectedTx.type },
                  { label: 'Statut', value: selectedTx.statut },
                  { label: 'Date', value: new Date(selectedTx.created_at).toLocaleString('fr-FR') },
                  { label: 'Description', value: selectedTx.description || '-' },
                  { label: 'Référence', value: selectedTx.id?.slice(0, 16) },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(198,106,44,0.07)' : 'none' }}>
                    <span style={{ fontSize: 12, color: '#b8956a' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#2a1a0a', maxWidth: '60%', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL ACTION WALLET ── */}
      <AnimatePresence>
        {actionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setActionModal(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a', marginBottom: 4 }}>
                {actionModal.type === 'credit' ? 'Créditer' : actionModal.type === 'debit' ? 'Débiter' : actionModal.type === 'bloquer' ? 'Bloquer' : 'Réinitialiser'} le wallet
              </p>
              <p style={{ fontSize: 12, color: '#b8956a', marginBottom: 20 }}>{actionModal.wallet.prenoms} {actionModal.wallet.nom}</p>

              {(actionModal.type === 'credit' || actionModal.type === 'debit') && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>Montant (FCFA)</p>
                  <input type="number" value={actionMontant} onChange={e => setActionMontant(e.target.value)} placeholder="Ex: 5000" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(198,106,44,0.2)', fontSize: 16, outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' }}/>
                </div>
              )}
              {actionModal.type === 'reinit' && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>Action irréversible - solde actuel : {Math.round(Number(actionModal.wallet.solde)).toLocaleString('fr-FR')} FCFA</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>Tapez CONFIRMER pour valider</p>
                  <input type="text" value={actionConfirm} onChange={e => setActionConfirm(e.target.value)} placeholder="CONFIRMER" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.3)', fontSize: 14, outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' }}/>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>{actionModal.type === 'bloquer' ? 'Raison du blocage' : 'Description (optionnel)'}</p>
                <input type="text" value={actionDesc} onChange={e => setActionDesc(e.target.value)} placeholder={actionModal.type === 'bloquer' ? 'Ex: Activité suspecte' : 'Raison...'} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(198,106,44,0.2)', fontSize: 14, outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' }}/>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button onClick={() => setActionModal(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', background: 'white', color: '#7a5a3a', fontSize: 14, fontWeight: 600, cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>Annuler</motion.button>
                <motion.button onClick={handleAction} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: actionModal.type === 'credit' ? '#10b981' : actionModal.type === 'debit' ? '#ef4444' : actionModal.type === 'bloquer' ? '#8b5cf6' : '#dc2626', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>Confirmer</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL ÉDITION ITEM ── */}
      <AnimatePresence>
        {editItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setEditItem(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, maxHeight: '85vh', overflow: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a', marginBottom: 20 }}>Modifier - {editItem.name}</p>
              {[
                { label: 'Nom affiché', key: 'name', type: 'text' },
                { label: 'Logo (texte court max 5 car.)', key: 'logo_text', type: 'text' },
                { label: 'Description', key: 'description', type: 'text' },
                { label: 'Couleur (hex)', key: 'color', type: 'color' },
                ...(editItem.type === 'mobile_money' ? [{ label: 'Frais transaction (%)', key: 'frais_transaction', type: 'number' }] : []),
                ...(editItem.type === 'service' ? [{ label: 'Catégorie', key: 'categorie', type: 'text' }] : []),
              ].map(({ label, key, type }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>{label}</p>
                  <input type={type} value={(editItem as unknown as Record<string,unknown>)[key] as string || ''}
                    onChange={e => setEditItem(prev => prev ? { ...prev, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value } : null)}
                    style={{ width: '100%', padding: type === 'color' ? '4px' : '10px 12px', borderRadius: 10, border: '1.5px solid rgba(198,106,44,0.2)', fontSize: 14, outline: 'none', fontFamily: 'system-ui', height: type === 'color' ? 44 : 'auto', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              {/* Upload logo */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>Logo image (JPG/PNG/SVG/WEBP)</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, border: '1.5px dashed rgba(198,106,44,0.3)', cursor: 'pointer', background: 'rgba(198,106,44,0.04)' }}>
                  <Upload size={16} color={C}/>
                  <span style={{ fontSize: 13, color: C, fontWeight: 600 }}>Choisir un fichier</span>
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch(`${API_URL}/admin/wallets/config/items/upload-logo`, { method: 'POST', credentials: 'include', body: formData });
                        const data = await res.json() as { url: string };
                        setEditItem(prev => prev ? { ...prev, logo_url: data.url } : null);
                        toast.success('Logo téléversé');
                      } catch { toast.error('Erreur upload'); }
                    }}
                  />
                </label>
                {editItem.logo_url && <img src={editItem.logo_url} alt="" style={{ marginTop: 8, height: 40, objectFit: 'contain', borderRadius: 8 }}/>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button onClick={() => setEditItem(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', background: 'white', color: '#7a5a3a', fontSize: 14, fontWeight: 600, cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>Annuler</motion.button>
                <motion.button onClick={handleSaveItem} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: C, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>Enregistrer</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL AJOUT ITEM ── */}
      <AnimatePresence>
        {addItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setAddItem(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, maxHeight: '85vh', overflow: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a', marginBottom: 20 }}>
                Ajouter - {addItem.type === 'service' ? 'Service' : addItem.type === 'banque' ? 'Banque' : 'Opérateur MM'}
              </p>
              {[
                { label: 'Nom', key: 'name', type: 'text', required: true },
                { label: 'Logo (texte court max 5 car.)', key: 'logo_text', type: 'text' },
                { label: 'Description', key: 'description', type: 'text' },
                { label: 'Couleur (hex)', key: 'color', type: 'color' },
                ...(addItem.type === 'mobile_money' ? [{ label: 'Frais transaction (%)', key: 'frais_transaction', type: 'number', required: false }] : []),
                ...(addItem.type === 'service' ? [{ label: 'Catégorie (factures/sante/education)', key: 'categorie', type: 'text', required: false }] : []),
              ].map(({ label, key, type }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>{label}</p>
                  <input type={type} value={(addItem as unknown as Record<string,unknown>)[key] as string || ''}
                    onChange={e => setAddItem(prev => prev ? { ...prev, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value } : null)}
                    style={{ width: '100%', padding: type === 'color' ? '4px' : '10px 12px', borderRadius: 10, border: '1.5px solid rgba(198,106,44,0.2)', fontSize: 14, outline: 'none', fontFamily: 'system-ui', height: type === 'color' ? 44 : 'auto', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              {/* Upload logo */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>Logo image (optionnel)</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, border: '1.5px dashed rgba(198,106,44,0.3)', cursor: 'pointer', background: 'rgba(198,106,44,0.04)' }}>
                  <Upload size={16} color={C}/>
                  <span style={{ fontSize: 13, color: C, fontWeight: 600 }}>Choisir un fichier</span>
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch(`${API_URL}/admin/wallets/config/items/upload-logo`, { method: 'POST', credentials: 'include', body: formData });
                        const data = await res.json() as { url: string };
                        setAddItem(prev => prev ? { ...prev, logo_url: data.url } : null);
                        toast.success('Logo téléversé');
                      } catch { toast.error('Erreur upload'); }
                    }}
                  />
                </label>
                {addItem.logo_url && <img src={addItem.logo_url} alt="" style={{ marginTop: 8, height: 40, objectFit: 'contain', borderRadius: 8 }}/>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button onClick={() => setAddItem(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid rgba(198,106,44,0.2)', background: 'white', color: '#7a5a3a', fontSize: 14, fontWeight: 600, cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>Annuler</motion.button>
                <motion.button onClick={handleAddItem} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: C, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>Ajouter</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL AUDIT ── */}
      <AnimatePresence>
        {showAudit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setShowAudit(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a' }}>Journal d'audit - Actions admin</p>
                <motion.button onClick={() => setShowAudit(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} whileTap={{ scale: 0.9 }}><X size={16}/></motion.button>
              </div>
              {auditLogs.length === 0 ? <p style={{ textAlign: 'center', color: '#b8956a', padding: 32 }}>Aucune action admin enregistrée</p> : (
                <div style={{ borderRadius: 12, border: '1px solid rgba(198,106,44,0.1)', overflow: 'hidden' }}>
                  {auditLogs.map((log, i) => (
                    <div key={log.id} style={{ padding: '12px 16px', borderBottom: i < auditLogs.length - 1 ? '1px solid rgba(198,106,44,0.07)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C }}>{log.action}</span>
                        <span style={{ fontSize: 11, color: '#b8956a' }}>{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#7a5a3a' }}>Par: {log.first_name} {log.last_name} ({log.phone})</p>
                      <p style={{ fontSize: 11, color: '#b8956a', marginTop: 2 }}>{JSON.stringify(log.details)}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmDeleteItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50" onClick={() => setConfirmDeleteItem(null)}>
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <p className="text-lg font-semibold">Supprimer {confirmDeleteItem.name} ?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const item = confirmDeleteItem;
                  setConfirmDeleteItem(null);
                  if (!item) return;
                  const filter = (list: ConfigItem[]) => list.filter(i => i.item_id !== item.item_id);
                  if (item.type === 'service') setServices(filter);
                  else if (item.type === 'banque') setBanques(filter);
                  else setMobileMoneys(filter);
                  toast.success('Supprimé');
                  if (item.id) {
                    apiDelete(`/admin/wallets/config/items/${item.id}`).catch(() => {});
                  }
                }}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold"
              >
                Supprimer
              </button>
              <button type="button" onClick={() => setConfirmDeleteItem(null)} className="flex-1 bg-gray-100 py-2 rounded-xl font-bold">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}