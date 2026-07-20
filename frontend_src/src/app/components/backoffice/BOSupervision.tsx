import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  List,
  Loader2,
  Receipt,
  Snowflake,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { BO_PRIMARY } from './bo-theme';
import { UniversalActionWithReasonModalBO } from './universal/UniversalActionWithReasonModalBO';
import { UniversalDropdownMenuBO } from './universal/UniversalDropdownMenuBO';
import type { DropdownEntry } from './universal/UniversalDropdownMenuBO';
import { UniversalFiltreBO } from './universal/UniversalFiltreBO';
import type { FilterGroup, FilterValue } from './universal/UniversalFiltreBO';
import { UniversalModalBO } from './universal/UniversalModalBO';
import { UniversalPaginationBO } from './universal/UniversalPaginationBO';
import { UniversalRechercheBO } from './universal/UniversalRechercheBO';
import { UniversalSectionCardBO } from './universal/UniversalSectionCardBO';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import {
  boExportTransactions,
  boGetTransactions,
  boUpdateTransactionStatus,
  type Transaction,
  type TransactionStatusValue,
} from '../../services/backoffice-api';

const BOSupervisionMap = lazy(() => import('./BOSupervisionMap'));

type ViewMode = 'liste' | 'carte';
type PeriodPreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
type ReasonAction = 'geler' | 'annuler' | 'litige';

type SupervisionTransaction = Transaction & {
  statut?: string;
  status?: string;
  acteur_nom?: string | null;
  acteur_region?: string | null;
  acteur_commune?: string | null;
  acteur_role?: string | null;
  acteur_phone?: string | null;
  acteurNom?: string | null;
  acteurType?: string | null;
  produit?: string | null;
  libelle?: string | null;
  description?: string | null;
  categorie?: string | null;
  montant?: number | string | null;
  amount?: number | string | null;
  commission?: number | string | null;
  created_at?: string;
  updated_at?: string;
  date?: string;
  region?: string | null;
  commune?: string | null;
  motif?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  canal?: string | null;
};

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string; icon: LucideIcon }> = {
  validee: { label: 'Validée', bg: '#EAF3DE', text: '#3B6D11', icon: CheckCircle2 },
  en_cours: { label: 'En attente', bg: '#FAEEDA', text: '#854F0B', icon: Clock },
  gelee: { label: 'Gelée', bg: '#E6F1FB', text: '#185FA5', icon: Snowflake },
  annulee: { label: 'Annulée', bg: '#F3F4F6', text: '#4B5563', icon: XCircle },
  litige: { label: 'En litige', bg: '#FCEBEB', text: '#A32D2D', icon: AlertTriangle },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'validee', label: 'Validée' },
  { value: 'en_cours', label: 'En attente' },
  { value: 'gelee', label: 'Gelée' },
  { value: 'annulee', label: 'Annulée' },
  { value: 'litige', label: 'En litige' },
];

function normalizeStatut(raw: string | null | undefined): string {
  if (!raw) return 'validee';
  if (raw === 'en_attente') return 'en_cours';
  return raw;
}

function StatutBadge({ statut }: { statut: string }) {
  const config = STATUT_CONFIG[normalizeStatut(statut)] || STATUT_CONFIG.validee;
  const Icon = config.icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        background: config.bg,
        color: config.text,
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function parseAmount(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function optionalString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function getActorName(tx: SupervisionTransaction): string {
  return tx.acteur_nom || tx.acteurNom || `${optionalString(tx.first_name)} ${optionalString(tx.last_name)}`.trim() || optionalString(tx.phone) || 'Acteur inconnu';
}

function getProductLabel(tx: SupervisionTransaction): string {
  return tx.produit || tx.libelle || tx.description || tx.type || 'Transaction';
}

function normalizeOperationType(value: string | null | undefined): string | null {
  const normalized = (value || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    vente: 'Vente',
    depense: 'Dépense',
    dépense: 'Dépense',
    transport: 'Transport',
    autre: 'Autre',
  };
  return labels[normalized] || null;
}

function deriveType(libelle: string | null | undefined, tx?: SupervisionTransaction): { type: string; produit: string } {
  const produit = libelle || '-';
  const backendType = normalizeOperationType(tx?.categorie || tx?.type);
  if (backendType) return { type: backendType, produit };

  const lib = (libelle || '').toLowerCase();
  if (lib.includes('transport')) return { type: 'Dépense', produit };
  if (['poisson', 'pain', 'tomate', 'gombo', 'mangue', 'riz', 'manioc', 'viande'].some(p => lib.includes(p))) {
    return { type: 'Vente', produit };
  }
  return { type: 'Autre', produit };
}

function getRegion(tx: SupervisionTransaction): string {
  return tx.acteur_region || tx.region || tx.commune || tx.acteur_commune || 'Non renseignée';
}

function getTransactionDate(tx: SupervisionTransaction): string {
  return tx.created_at || tx.date || '';
}

function getInitials(name: string): string {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return initials || '?';
}

function formatMoney(value: unknown): string {
  return `${parseAmount(value).toLocaleString('fr-FR')} FCFA`;
}

function formatNumber(value: unknown): string {
  return parseAmount(value).toLocaleString('fr-FR');
}

function formatDate(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeRole(role: string | null | undefined): string {
  if (!role) return '-';
  const labels: Record<string, string> = {
    marchand: 'Marchand',
    producteur: 'Producteur',
    cooperative: 'Coopérative',
    identificateur: 'Identificateur',
    super_admin: 'Super administrateur',
    admin_general: 'Administrateur général',
    admin_national: 'Administrateur national',
    gestionnaire_zone: 'Gestionnaire de zone',
    operateur_terrain: 'Analyste',
  };
  return labels[role] || role;
}

function canalLabel(canal: string | null | undefined): string {
  if (!canal) return 'Non renseigné';
  const labels: Record<string, string> = {
    mobile: 'Application mobile',
    web: 'Site web',
    api: 'Intégration externe',
    bo: 'Espace administrateur',
  };
  return labels[canal] || canal;
}

function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Non renseigné';
  const lowerUa = ua.toLowerCase();
  if (lowerUa.includes('android')) return 'Téléphone Android';
  if (lowerUa.includes('ipad')) return 'iPad';
  if (lowerUa.includes('iphone') || lowerUa.includes('ios')) return 'iPhone';
  if (lowerUa.includes('windows')) return 'Ordinateur Windows';
  if (lowerUa.includes('mac')) return 'Ordinateur Mac';
  return 'Appareil non identifié';
}

const Section: React.FC<{ title: string; warning?: boolean; children: React.ReactNode }> = ({ title, warning, children }) => (
  <div className={warning ? 'border-2 border-amber-200 bg-amber-50 rounded-xl p-4' : ''}>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B5248] mb-3">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="grid grid-cols-3 gap-3 items-start">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <span className={`col-span-2 text-sm ${highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{value}</span>
  </div>
);

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BOSupervision() {
  const navigate = useNavigate();
  const boCtx = useBackOffice();
  const currentUser = boCtx.boUser || boCtx.user;
  const [viewMode, setViewMode] = useState<ViewMode>('liste');
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [transactions, setTransactions] = useState<SupervisionTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [detailModal, setDetailModal] = useState<{ open: boolean; txId: string | null }>({ open: false, txId: null });
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<SupervisionTransaction | null>(null);
  const [reasonModal, setReasonModal] = useState<{ open: boolean; action: ReasonAction | null; txId: string | null } | null>(null);
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

  const computeDateRange = useCallback((): { date_from?: string; date_to?: string } => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    if (periodPreset === 'today') return { date_from: todayStart, date_to: todayEnd };
    if (periodPreset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        date_from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString(),
        date_to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString(),
      };
    }
    if (periodPreset === '7d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { date_from: from.toISOString(), date_to: todayEnd };
    }
    if (periodPreset === '30d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { date_from: from.toISOString(), date_to: todayEnd };
    }
    return {
      date_from: customDateFrom ? new Date(customDateFrom).toISOString() : undefined,
      date_to: customDateTo ? new Date(customDateTo).toISOString() : undefined,
    };
  }, [customDateFrom, customDateTo, periodPreset]);

  const computeDateRangeRef = useRef(computeDateRange);
  computeDateRangeRef.current = computeDateRange;

  useEffect(() => {
    const controller = new AbortController();

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const dateRange = computeDateRangeRef.current();
        const res = await boGetTransactions({
          page: currentPage,
          limit: itemsPerPage,
          statut: filterStatut !== 'all' ? filterStatut : undefined,
          region: filterRegion !== 'all' ? filterRegion : undefined,
          ...dateRange,
        });

        if (controller.signal.aborted) return;
        setTransactions(res.data as SupervisionTransaction[]);
        setTotalItems(res.total);
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          toast.error('Erreur chargement transactions');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchTransactions();
    return () => controller.abort();
  }, [currentPage, filterRegion, filterStatut, itemsPerPage, reloadTick]);

  useEffect(() => {
    if (!detailModal.open || !detailModal.txId) {
      setDetailData(null);
      setDetailLoading(false);
      return;
    }

    const controller = new AbortController();
    setDetailLoading(true);
    const localTx = transactions.find(tx => tx.id === detailModal.txId) || null;

    if (!controller.signal.aborted) {
      setDetailData(localTx);
      setDetailLoading(false);
    }

    return () => controller.abort();
  }, [detailModal.open, detailModal.txId, transactions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRegion, filterStatut, itemsPerPage, periodPreset, customDateFrom, customDateTo]);

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const query = search.trim().toLowerCase();
    return transactions.filter(tx => {
      const actor = getActorName(tx).toLowerCase();
      const product = getProductLabel(tx).toLowerCase();
      const operationType = deriveType(product, tx).type.toLowerCase();
      return actor.includes(query) || product.includes(query) || operationType.includes(query);
    });
  }, [search, transactions]);

  const filterGroups = useMemo<FilterGroup[]>(() => {
    const regions = Array.from(new Set(transactions.map(getRegion).filter(Boolean))).sort();
    return [
      { id: 'statut', label: 'Statut', type: 'options', options: STATUS_OPTIONS },
      {
        id: 'region',
        label: 'Région',
        type: 'options',
        options: [
          { value: 'all', label: 'Toutes régions' },
          ...regions.map(region => ({ value: region, label: region })),
        ],
      },
    ];
  }, [transactions]);

  const visibleVolume = useMemo(
    () => filteredTransactions.reduce((sum, tx) => sum + parseAmount(tx.montant ?? tx.amount), 0),
    [filteredTransactions],
  );
  const visibleCommissions = useMemo(
    () => filteredTransactions.reduce((sum, tx) => sum + parseAmount(tx.commission), 0),
    [filteredTransactions],
  );
  const visibleLitigesGelees = useMemo(
    () => filteredTransactions.filter(tx => ['litige', 'gelee'].includes(normalizeStatut(tx.statut || tx.status))).length,
    [filteredTransactions],
  );

  const periodLabel = useMemo(() => {
    if (periodPreset === 'today') return 'Aujourd’hui';
    if (periodPreset === 'yesterday') return 'Hier';
    if (periodPreset === '7d') return '7 derniers jours';
    if (periodPreset === '30d') return '30 derniers jours';
    if (customDateFrom && customDateTo) return `${customDateFrom} - ${customDateTo}`;
    return 'Personnalisé';
  }, [customDateFrom, customDateTo, periodPreset]);

  const handleFilterChange = (value: FilterValue) => {
    setFilterStatut(typeof value.statut === 'string' ? value.statut : 'all');
    setFilterRegion(typeof value.region === 'string' ? value.region : 'all');
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(true);
    try {
      const dateRange = computeDateRange();
      const blob = await boExportTransactions(format, {
        ...dateRange,
        statut: filterStatut !== 'all' ? filterStatut : undefined,
        region: filterRegion !== 'all' ? filterRegion : undefined,
      });
      downloadBlob(blob, `transactions-${new Date().toISOString().slice(0, 19)}.${format}`);
      toast.success(`Export ${format.toUpperCase()} réussi`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Erreur export ${format}`);
    } finally {
      setExporting(false);
    }
  };

  const handleActionClick = (action: ReasonAction, txId: string) => {
    setReasonModal({ open: true, action, txId });
  };

  const handleReasonConfirm = async (reason: string) => {
    if (!reasonModal?.action || !reasonModal.txId) return;
    setReasonSubmitting(true);
    try {
      const statutMap: Record<ReasonAction, TransactionStatusValue> = {
        geler: 'gelee',
        annuler: 'annulee',
        litige: 'litige',
      };
      const nextStatut = statutMap[reasonModal.action];
      await boUpdateTransactionStatus(reasonModal.txId, nextStatut, reason);
      toast.success(`Transaction ${STATUT_CONFIG[nextStatut].label.toLowerCase()} avec succès`);
      setReasonModal(null);
      setReloadTick(tick => tick + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur action transaction');
    } finally {
      setReasonSubmitting(false);
    }
  };

  const periodItems: DropdownEntry[] = [
    { id: 'today', label: 'Aujourd’hui', onClick: () => setPeriodPreset('today') },
    { id: 'yesterday', label: 'Hier', onClick: () => setPeriodPreset('yesterday') },
    { id: '7d', label: '7 derniers jours', onClick: () => setPeriodPreset('7d') },
    { id: '30d', label: '30 derniers jours', onClick: () => setPeriodPreset('30d') },
    { id: 'custom', label: 'Personnalisé...', onClick: () => setPeriodPreset('custom') },
  ];

  const exportItems: DropdownEntry[] = [
    { id: 'csv', label: 'Exporter CSV', icon: FileText, disabled: exporting, onClick: () => void handleExport('csv') },
    { id: 'xlsx', label: 'Exporter Excel', icon: FileSpreadsheet, disabled: exporting, onClick: () => void handleExport('xlsx') },
    { id: 'pdf', label: 'Exporter PDF', icon: FileText, disabled: exporting, onClick: () => void handleExport('pdf') },
  ];

  const selectedAction = reasonModal?.action;
  const currentRole = typeof currentUser?.role === 'string' ? currentUser.role : undefined;
  const canUseAdminActions = ['super_admin', 'admin_general', 'admin_national'].includes(currentRole || '');
  const mapDateRange = useMemo(() => computeDateRange(), [computeDateRange]);

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Supervision</h1>
          <p className="text-sm text-gray-500 mt-1">Transactions nationales en temps réel</p>
        </div>
        <div className="flex flex-nowrap items-center justify-end gap-2">
          <div
            style={{
              display: 'inline-flex',
              padding: 3,
              background: '#F5F3EF',
              border: '1px solid #E5E1D8',
              borderRadius: 12,
            }}
          >
            <button
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: viewMode === 'liste' ? '#5B5248' : 'transparent',
                color: viewMode === 'liste' ? '#FFFFFF' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => setViewMode('liste')}
            >
              <List size={14} /> Liste
            </button>
            <button
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: viewMode === 'carte' ? '#5B5248' : 'transparent',
                color: viewMode === 'carte' ? '#FFFFFF' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => setViewMode('carte')}
            >
              <Globe size={14} /> Carte
            </button>
          </div>
          <UniversalDropdownMenuBO
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 bg-white text-sm font-bold"
                style={{ borderColor: `${BO_PRIMARY}35`, color: BO_PRIMARY }}
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Export...' : 'Exporter'}
                <ChevronDown className="w-3 h-3" />
              </button>
            }
            triggerAriaLabel="Menu exporter transactions"
            items={exportItems}
            align="right"
            minWidth={220}
          />
        </div>
      </div>

      <KPIGrid cols={4} className="mb-4">
        <UniversalKPI label="Transactions" animatedTarget={totalItems} icon={Activity} color="#185FA5" bgColor="#E6F1FB" borderColor="#B5D4F4" iconAnimation="float" active={viewMode === 'liste'} />
        <UniversalKPI label="Volume total" animatedTarget={visibleVolume} suffix="FCFA" icon={TrendingUp} color="#5B5248" bgColor="#F5F3EF" borderColor="#D7CFC0" iconAnimation="float" />
        <UniversalKPI label="Commissions" animatedTarget={visibleCommissions} suffix="FCFA" icon={Coins} color="#3B6D11" bgColor="#EAF3DE" borderColor="#C0DD97" iconAnimation="bounce" />
        <UniversalKPI label="Litiges / Gelées" animatedTarget={visibleLitigesGelees} icon={AlertTriangle} color="#A32D2D" bgColor="#FCEBEB" borderColor="#F7C1C1" iconAnimation="pulse" />
      </KPIGrid>

      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex gap-2 items-center flex-nowrap overflow-hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <UniversalRechercheBO
              onChange={setSearch}
              placeholder="Rechercher acteur ou produit..."
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <UniversalFiltreBO
              groups={filterGroups}
              value={{
                statut: filterStatut !== 'all' ? filterStatut : undefined,
                region: filterRegion !== 'all' ? filterRegion : undefined,
              }}
              onChange={handleFilterChange}
              onReset={() => {
                setFilterStatut('all');
                setFilterRegion('all');
              }}
              triggerLabel="Filtres"
            />
          </div>
        </div>
        <UniversalDropdownMenuBO
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl border-2 bg-white text-sm font-bold min-w-0"
              style={{ borderColor: `${BO_PRIMARY}35`, color: BO_PRIMARY }}
            >
              <Calendar className="w-4 h-4" />
              <span className="truncate">{periodLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          }
          triggerAriaLabel="Sélectionner la période"
          items={periodItems}
          align="right"
          minWidth={220}
        />
      </div>

      {periodPreset === 'custom' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={customDateFrom}
            onChange={(event) => setCustomDateFrom(event.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
            aria-label="Date de début"
          />
          <span className="text-sm text-gray-500 font-semibold">au</span>
          <input
            type="date"
            value={customDateTo}
            onChange={(event) => setCustomDateTo(event.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
            aria-label="Date de fin"
          />
        </div>
      )}

      {viewMode === 'liste' ? (
        <>
          <UniversalSectionCardBO title="Transactions" icon={Activity} variant="default" noPadding>
            <div className="border-b border-gray-100" />
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 && periodPreset === 'today' ? (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium mb-2">Aucune transaction aujourd’hui</p>
                <p className="text-sm text-gray-400 mb-4">Essayez d’élargir la période pour voir l’historique récent.</p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button type="button" onClick={() => setPeriodPreset('7d')} className="px-4 py-2 bg-[#5B5248] text-white rounded-lg text-sm font-medium">
                    Voir 7 derniers jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodPreset('30d')}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                    style={{ margin: '0 auto' }}
                  >
                    Voir 30 derniers jours
                  </button>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucune transaction trouvée pour cette période.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: '#F5F3EF', borderBottom: '1.5px solid #D7CFC0' }}>
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: BO_PRIMARY }}>Acteur</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: BO_PRIMARY }}>TYPE OPERATION</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: BO_PRIMARY }}>Montant</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: BO_PRIMARY }}>Commission</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: BO_PRIMARY }}>Statut</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: BO_PRIMARY }}>Région</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: BO_PRIMARY }}>Date</th>
                      <th className="p-3 text-xs font-semibold text-[#5B5248] uppercase tracking-wider text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, index) => {
                      const actorName = getActorName(tx);
                      const statut = normalizeStatut(tx.statut || tx.status);
                      const isLitige = statut === 'litige';
                      const operation = deriveType(getProductLabel(tx), tx);

                      return (
                        <tr
                          key={tx.id}
                          className="border-b border-gray-100"
                          style={{ background: isLitige ? '#FEF7F7' : index % 2 ? '#FAFAF8' : '#FFFFFF' }}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-semibold" style={{ background: '#C66A2C' }}>
                                {getInitials(actorName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{actorName}</p>
                                <p className="text-[11px] text-gray-400 truncate">{tx.acteur_role || tx.acteurType || tx.type || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-gray-900">{operation.type}</div>
                            <div className="text-xs text-gray-500">{operation.produit}</div>
                          </td>
                          <td className="p-3 text-right font-medium text-gray-900">{formatMoney(tx.montant ?? tx.amount)}</td>
                          <td className="p-3 text-right font-medium" style={{ color: '#3B6D11' }}>{formatMoney(tx.commission)}</td>
                          <td className="p-3"><StatutBadge statut={statut} /></td>
                          <td className="p-3 text-gray-600 text-xs">{getRegion(tx)}</td>
                          <td className="p-3 text-gray-500 text-xs">{formatDate(getTransactionDate(tx))}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setDetailModal({ open: true, txId: tx.id })}
                              aria-label="Voir détails"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#5B5248] transition hover:bg-[#F5F3EF]"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </UniversalSectionCardBO>

          <div className="mt-3">
            <UniversalPaginationBO
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showFirstLast
              showItemsPerPage
              showCounter={false}
              showPageJump
            />
            <div className="mt-2 text-xs text-gray-500">
              {totalItems === 0 ? (
                '0 élément'
              ) : (
                <>
                  Affichage de <strong style={{ color: BO_PRIMARY }}>{(currentPage - 1) * itemsPerPage + 1}</strong> à{' '}
                  <strong style={{ color: BO_PRIMARY }}>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> sur{' '}
                  <strong style={{ color: BO_PRIMARY }}>{totalItems}</strong> éléments
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="text-gray-500 text-sm">Chargement de la carte...</div>
            </div>
          }
        >
          <BOSupervisionMap
            dateFrom={mapDateRange.date_from}
            dateTo={mapDateRange.date_to}
            periodLabel={periodLabel}
          />
        </Suspense>
      )}

      <UniversalModalBO
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, txId: null })}
        title="Détail de la transaction"
        subtitle={detailData ? `Référence : ${detailData.id.substring(0, 8).toUpperCase()}` : ''}
        icon={Receipt}
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12 text-[#5B5248]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : detailData ? (
          <div className="space-y-5">
            <Section title="Acteur">
              <Field label="Nom complet" value={getActorName(detailData)} />
              <Field label="Profession" value={normalizeRole(detailData.acteur_role || detailData.acteurType || String(detailData.type || ''))} />
              {detailData.user_id && <Field label="Identifiant acteur" value={detailData.user_id} />}
              <Field label="Téléphone" value={detailData.acteur_phone || String(detailData.phone || '') || 'Non communiqué'} />
              <Field label="Région" value={detailData.acteur_region || detailData.region || 'Non renseignée'} />
              <Field label="Commune" value={detailData.acteur_commune || detailData.commune || 'Non renseignée'} />
            </Section>

            <Section title="Opération">
              <Field label="Type d’opération" value={deriveType(getProductLabel(detailData), detailData).type} />
              <Field label="Description" value={getProductLabel(detailData)} />
              <Field label="Quantité" value={detailData.quantite ? `${detailData.quantite}` : '-'} />
              <Field label="Montant" value={`${formatNumber(detailData.montant ?? detailData.amount)} FCFA`} highlight />
              <Field label="Commission" value={parseAmount(detailData.commission) > 0 ? `${formatNumber(detailData.commission)} FCFA` : 'Aucune'} />
            </Section>

            <Section title="Statut et suivi">
              <Field label="Statut actuel" value={<StatutBadge statut={normalizeStatut(detailData.statut || detailData.status)} />} />
              {detailData.motif && <Field label="Motif" value={detailData.motif} />}
              <Field label="Date de création" value={formatDateTime(detailData.created_at || detailData.date)} />
              {detailData.updated_at && detailData.updated_at !== detailData.created_at && (
                <Field label="Dernière modification" value={formatDateTime(detailData.updated_at)} />
              )}
            </Section>

            <Section title="Traçabilité">
              <Field label="Canal de saisie" value={canalLabel(detailData.canal)} />
              <Field label="Connexion depuis" value={detailData.ip || 'Non renseignée'} />
              <Field label="Appareil utilisé" value={parseUserAgent(detailData.user_agent)} />
            </Section>

            {canUseAdminActions && (
              <Section title="Actions administrateur" warning>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModal({ open: false, txId: null });
                      handleActionClick('geler', detailData.id);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                  >
                    <Snowflake size={14} /> Geler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModal({ open: false, txId: null });
                      handleActionClick('litige', detailData.id);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    <AlertTriangle size={14} /> Marquer en litige
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModal({ open: false, txId: null });
                      handleActionClick('annuler', detailData.id);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    <XCircle size={14} /> Annuler
                  </button>
                  {detailData.user_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModal({ open: false, txId: null });
                        navigate(`/backoffice/acteurs/${detailData.user_id}`);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
                    >
                      <User size={14} /> Voir profil acteur
                    </button>
                  )}
                </div>
              </Section>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Détail non disponible</div>
        )}
      </UniversalModalBO>

      {reasonModal && (
        <UniversalActionWithReasonModalBO
          open={reasonModal.open}
          onClose={() => setReasonModal(null)}
          onConfirm={handleReasonConfirm}
          title={
            selectedAction === 'geler'
              ? 'Geler la transaction'
              : selectedAction === 'annuler'
                ? 'Annuler la transaction'
                : 'Marquer en litige'
          }
          message={
            selectedAction === 'geler'
              ? 'Cette transaction sera gelée et inaccessible. Indiquez le motif précis.'
              : selectedAction === 'annuler'
                ? 'Cette transaction sera annulée de façon irréversible. Indiquez le motif précis.'
                : 'Cette transaction sera marquée en litige. Indiquez le motif précis du différend.'
          }
          severity={selectedAction === 'annuler' ? 'danger' : 'warning'}
          icon={selectedAction === 'geler' ? Snowflake : selectedAction === 'annuler' ? XCircle : AlertTriangle}
          confirmLabel={
            selectedAction === 'geler'
              ? 'Geler'
              : selectedAction === 'annuler'
                ? 'Annuler la transaction'
                : 'Confirmer le litige'
          }
          loading={reasonSubmitting}
        />
      )}
    </div>
  );
}
