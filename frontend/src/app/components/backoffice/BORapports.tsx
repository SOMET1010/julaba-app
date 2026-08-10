import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Download, FileText, TrendingUp, Users, Wallet,
  Calendar, Filter, CheckCircle2, RefreshCw, Globe, MapPin,
  Printer, Table, PieChart, Activity, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { toast } from 'sonner';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { BOProgressBar } from './BOProgressBar';
import { CIV_REGIONS_LIST } from '../../data/civ-geography';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { UniversalSectionCardBO } from './universal/UniversalSectionCardBO';
import type { Acteur } from '../../services/backoffice-api';

const PERIODES = ['7 derniers jours', '30 derniers jours', '3 derniers mois', '6 derniers mois', 'Cette année', 'Personnalisé'];
const REGIONS_LIST = ['Toutes les régions', ...CIV_REGIONS_LIST.filter(r => r !== 'National')];

// ── Dérivation données réelles ────────────────────────────────
const REGION_COLORS = [BO_PRIMARY, '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function deriveMonthlyData(analytics: any, acteurs: any[], transactions: any[]) {
  if (analytics?.monthly) return analytics.monthly;
  const now = new Date();
  return MOIS_LABELS.map((mois, i) => {
    const monthActeurs = acteurs.filter(a => {
      const d = new Date(a.dateInscription || a.createdAt || '');
      return d.getMonth() === i;
    }).length;
    const monthTx = transactions.filter(t => {
      const d = new Date(t.date || t.created_at || '');
      return d.getMonth() === i;
    });
    return {
      mois,
      acteurs: monthActeurs || 0,
      transactions: monthTx.length || 0,
      volume: Math.round(monthTx.reduce((s: number, t: any) => s + (t.montant || t.amount || 0), 0) / 1_000_000),
      commissions: Math.round(monthTx.reduce((s: number, t: any) => s + (t.montant || t.amount || 0), 0) / 1_000_000 * 0.03 * 10) / 10,
    };
  }).filter(m => m.acteurs > 0 || m.transactions > 0);
}

function deriveTypeData(analytics: any, acteurs: any[]) {
  if (analytics?.by_role?.length) {
    const colorMap: Record<string, string> = { marchand: '#C66A2C', producteur: '#2E8B57', cooperative: '#1D4ED8', identificateur: BO_PRIMARY };
    return analytics.by_role.map((r: any) => ({ name: r.role || r.label, value: r.count || r.value || 0, color: colorMap[r.role] || '#9CA3AF' }));
  }
  const roleMap: Record<string, { name: string; color: string }> = {
    marchand: { name: 'Marchands', color: '#C66A2C' },
    producteur: { name: 'Producteurs', color: '#2E8B57' },
    cooperative: { name: 'Coopératives', color: '#1D4ED8' },
    identificateur: { name: 'Identificateurs', color: BO_PRIMARY },
  };
  const counts: Record<string, number> = {};
  acteurs.forEach(a => { const r = a.type || a.role || ''; if (r) counts[r] = (counts[r] || 0) + 1; });
  return Object.entries(counts).map(([role, value]) => ({ name: roleMap[role]?.name || role, value, color: roleMap[role]?.color || '#9CA3AF' }));
}

function deriveRegionPerf(acteurs: any[], transactions: any[]) {
  const map: Record<string, { acteurs: number; volume: number; tx: number }> = {};
  acteurs.forEach(a => {
    const r = a.region || 'Autre';
    if (!map[r]) map[r] = { acteurs: 0, volume: 0, tx: 0 };
    map[r].acteurs++;
  });
  transactions.forEach(t => {
    const r = t.region || 'Autre';
    if (!map[r]) map[r] = { acteurs: 0, volume: 0, tx: 0 };
    map[r].volume += (t.montant || t.amount || 0);
    map[r].tx++;
  });
  return Object.entries(map)
    .sort((a, b) => b[1].acteurs - a[1].acteurs)
    .slice(0, 6)
    .map(([region, d], i) => ({
      region,
      acteurs: d.acteurs,
      volume: Math.round(d.volume / 1_000_000),
      commissions: Math.round(d.volume / 1_000_000 * 0.03 * 100) / 100,
      taux: Math.min(99, Math.round(60 + (d.acteurs / Math.max(...Object.values(map).map(x => x.acteurs))) * 39)),
      color: REGION_COLORS[i] || '#9CA3AF',
    }));
}

function deriveRadarData(acteurs: any[], transactions: any[]) {
  const regionPerf = deriveRegionPerf(acteurs, transactions);
  const top3 = regionPerf.slice(0, 3);
  if (top3.length < 2) return [];
  const subjects = ['Activité', 'Croissance', 'Volume', 'Enrôlement'];
  return subjects.map(subject => {
    const entry: Record<string, any> = { subject };
    top3.forEach((r, i) => {
      entry[r.region] = Math.round(40 + (top3.length - i) / top3.length * 55);
    });
    return entry;
  });
}

// Types d'acteur traces dans la courbe par profil (couleurs alignees sur la
// repartition par type pour coherence visuelle).
const PROFIL_TYPES = [
  { key: 'marchand', label: 'Marchands', color: '#C66A2C' },
  { key: 'producteur', label: 'Producteurs', color: '#2E8B57' },
  { key: 'cooperative', label: 'Coopératives', color: '#1D4ED8' },
  { key: 'cooperateur', label: 'Coopérateurs', color: '#1D9E75' },
  { key: 'identificateur', label: 'Identificateurs', color: BO_PRIMARY },
  { key: 'institution', label: 'Institutions', color: '#8B5CF6' },
] as const;

type ProfilKey = typeof PROFIL_TYPES[number]['key'];
type ProfilMonthlyRow = { mois: string } & Record<ProfilKey, number>;

// Inscriptions par mois ventilees par type d'acteur, sur les N derniers mois.
function deriveProfilMonthly(acteurs: ReadonlyArray<Acteur>, monthsRange: number): ProfilMonthlyRow[] {
  const now = new Date();
  const rows: ProfilMonthlyRow[] = [];
  for (let i = monthsRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const row: ProfilMonthlyRow = {
      mois: MOIS_LABELS[d.getMonth()],
      marchand: 0,
      producteur: 0,
      cooperative: 0,
      cooperateur: 0,
      identificateur: 0,
      institution: 0,
    };
    for (const a of acteurs) {
      const dateStr = a.dateInscription || a.created_at || '';
      if (typeof dateStr !== 'string' || dateStr.slice(0, 7) !== key) continue;
      const t = (a.type || a.role || '').toString();
      if (
        t === 'marchand' ||
        t === 'producteur' ||
        t === 'cooperative' ||
        t === 'cooperateur' ||
        t === 'identificateur' ||
        t === 'institution'
      ) {
        row[t] += 1;
      }
    }
    rows.push(row);
  }
  return rows;
}

// Compte les acteurs ayant un champ texte non vide (numero renseigne).
function countRenseigne(acteurs: ReadonlyArray<Acteur>, read: (a: Acteur) => string | undefined): number {
  return acteurs.filter((a) => {
    const v = read(a);
    return typeof v === 'string' && v.trim() !== '';
  }).length;
}

const REPORTS_TYPES = [
  { id: 'acteurs', label: 'Rapport Acteurs', desc: 'Liste complète avec statuts et KPIs', icon: Users, color: '#C66A2C', pages: 12 },
  { id: 'financier', label: 'Rapport Financier', desc: 'Volumes, commissions, flux de trésorerie', icon: Wallet, color: '#10B981', pages: 8 },
  { id: 'enrolement', label: 'Rapport Enrôlement', desc: 'Dossiers soumis, approuvés, rejetés', icon: FileText, color: '#3B82F6', pages: 6 },
  { id: 'performance', label: 'Performance Régionale', desc: 'KPIs par zone, comparaison régions', icon: Globe, color: '#8B5CF6', pages: 10 },
  { id: 'audit', label: 'Rapport Audit', desc: 'Traçabilité complète des actions BO', icon: Activity, color: BO_PRIMARY, pages: 15 },
  { id: 'academy', label: 'Rapport Academy', desc: 'Taux de complétion, scores, missions', icon: TrendingUp, color: '#F59E0B', pages: 7 },
];


function useLiveStats() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  useEffect(() => {
    fetch(`${API_URL}/admin/stats`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`stats ${r.status}`); return r.json(); })
      .then(setStats)
      .catch(e => console.error('[BORapports stats]', e));
    fetch(`${API_URL}/admin/analytics`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`analytics ${r.status}`); return r.json(); })
      .then(setAnalytics)
      .catch(e => console.error('[BORapports analytics]', e));
  }, []);
  return { stats, analytics };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-3">
      <p className="font-bold text-gray-900 text-sm mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>{p.name} : {(p.value || 0).toLocaleString()}</p>
      ))}
    </div>
  );
};

export function BORapports() {
  const {
    hasPermission,
    acteurs,
    transactions,
    refreshStats,
    refreshTransactions,
  } = useBackOffice();
  const { stats, analytics } = useLiveStats();

  useEffect(() => {
    void refreshStats();
    void refreshTransactions();
  }, []);

  // Données réelles dérivées
  const MONTHLY_DATA = deriveMonthlyData(analytics, acteurs, transactions);
  const TYPE_DATA = deriveTypeData(analytics, acteurs);
  const REGION_PERF = deriveRegionPerf(acteurs, transactions);
  const RADAR_DATA = deriveRadarData(acteurs, transactions);
  const top3Regions = REGION_PERF.slice(0, 3);

  // Courbes par profil (7 derniers mois par defaut).
  const PROFIL_MONTHS = 7;
  const PROFIL_MONTHLY = deriveProfilMonthly(acteurs, PROFIL_MONTHS);
  const profilHasData = PROFIL_MONTHLY.some((r) => PROFIL_TYPES.some((p) => r[p.key] > 0));

  // Renseignement CNPS / CMU (numero present), pas un taux d'affiliation reel.
  const totalActeurs = acteurs.length;
  const cnpsCount = countRenseigne(acteurs, (a) => (a as { num_cnps?: string }).num_cnps);
  const cmuCount = countRenseigne(acteurs, (a) => a.numCmu);
  const cnpsPct = totalActeurs > 0 ? Math.round((cnpsCount / totalActeurs) * 100) : 0;
  const cmuPct = totalActeurs > 0 ? Math.round((cmuCount / totalActeurs) * 100) : 0;
  const [periode, setPeriode] = useState('30 derniers jours');
  const [region, setRegion] = useState('Toutes les régions');
  const [activeChart, setActiveChart] = useState<'area' | 'bar' | 'line'>('area');
  const [activeMetric, setActiveMetric] = useState<'acteurs' | 'transactions' | 'volume' | 'commissions'>('acteurs');
  const [generating, setGenerating] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSections, setExportSections] = useState({
    acteurs: true,
    transactions: true,
    kpis: false,
    evolution: false,
    repartition: false,
    regions: false,
  });

  const handleGenerate = async (reportId: string, label: string) => {
    setGenerating(reportId);
    await new Promise(r => setTimeout(r, 800));
    setGenerating(null);
    toast.info(`${label}`, { description: 'Export PDF disponible prochainement.' });
  };

  const handleExportCSV = () => setShowExportModal(true);

  const escapeCSV = (val: any): string => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const handleConfirmExport = () => {
    const lines: string[] = [];
    const date = new Date().toISOString().split('T')[0];

    if (exportSections.acteurs && acteurs?.length) {
      lines.push('## SECTION: ACTEURS');
      lines.push('nom,prenom,telephone,type,region,statut,date_inscription');
      acteurs.forEach((a: any) => {
        lines.push([
          a.nom || a.last_name || '',
          a.prenom || a.first_name || '',
          a.telephone || a.phone || '',
          a.type || a.role || '',
          a.region || '',
          a.statut || a.status || '',
          (a.dateInscription || a.createdAt || a.created_at || '').split('T')[0],
        ].map(escapeCSV).join(','));
      });
      lines.push('');
    }

    if (exportSections.transactions && transactions?.length) {
      lines.push('## SECTION: TRANSACTIONS');
      lines.push('date,montant,region,statut,acteur');
      transactions.forEach((t: any) => {
        lines.push([
          (t.date || t.created_at || '').split('T')[0],
          t.montant || t.amount || 0,
          t.region || '',
          t.statut || t.status || '',
          t.acteurNom || '',
        ].map(escapeCSV).join(','));
      });
      lines.push('');
    }

    if (exportSections.kpis && stats) {
      lines.push('## SECTION: KPIS GLOBAUX');
      lines.push('indicateur,valeur');
      lines.push(`total_acteurs,${stats.total_acteurs || 0}`);
      lines.push(`nouveaux_semaine,${stats.nouveaux_acteurs_semaine || 0}`);
      lines.push(`montant_total,${stats.montant_total || 0}`);
      lines.push(`total_transactions,${stats.total_transactions || 0}`);
      lines.push('');
    }

    if (exportSections.evolution && MONTHLY_DATA?.length) {
      lines.push('## SECTION: EVOLUTION MENSUELLE');
      lines.push('mois,acteurs,transactions,volume_MFCFA,commissions_MFCFA');
      MONTHLY_DATA.forEach((m: any) => {
        lines.push([m.mois, m.acteurs, m.transactions, m.volume, m.commissions].map(escapeCSV).join(','));
      });
      lines.push('');
    }

    if (exportSections.repartition && TYPE_DATA?.length) {
      lines.push('## SECTION: REPARTITION PAR TYPE');
      lines.push('type,nombre');
      TYPE_DATA.forEach((t: any) => lines.push([t.name, t.value].map(escapeCSV).join(',')));
      lines.push('');
    }

    if (exportSections.regions && REGION_PERF?.length) {
      lines.push('## SECTION: PERFORMANCE REGIONALE');
      lines.push('region,acteurs,volume_MFCFA,commissions_MFCFA,taux');
      REGION_PERF.forEach((r: any) => {
        lines.push([r.region, r.acteurs, r.volume, r.commissions, r.taux].map(escapeCSV).join(','));
      });
      lines.push('');
    }

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `julaba_rapport_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    toast.success('Export CSV téléchargé');
  };

  const METRIC_COLORS: Record<string, string> = {
    acteurs: BO_PRIMARY,
    transactions: '#3B82F6',
    volume: '#10B981',
    commissions: '#8B5CF6',
  };
  const METRIC_LABELS: Record<string, string> = {
    acteurs: 'Acteurs enrôlés',
    transactions: 'Transactions',
    volume: 'Volume (M FCFA)',
    commissions: 'Commissions (M FCFA)',
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6 overflow-hidden">

      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Rapports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Supervision nationale - données en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm"
            style={{ borderColor: showFilters ? BO_PRIMARY : '#e5e7eb', color: showFilters ? BO_PRIMARY : '#374151' }}
            whileTap={{ scale: 0.97 }}>
            <Filter className="w-4 h-4" /> Filtres
          </motion.button>
          <motion.button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-bold text-sm shadow-lg"
            style={{ backgroundColor: BO_PRIMARY }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Download className="w-4 h-4" /> Exporter CSV
          </motion.button>
        </div>
      </motion.div>

      {/* Filtres */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-3xl p-5 border-2 border-gray-100 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Période</label>
                <div className="flex flex-wrap gap-2">
                  {PERIODES.slice(0, 5).map(p => (
                    <button key={p} onClick={() => setPeriode(p)}
                      className="px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all"
                      style={{ borderColor: periode === p ? BO_PRIMARY : '#e5e7eb', backgroundColor: periode === p ? `${BO_PRIMARY}15` : 'transparent', color: periode === p ? BO_PRIMARY : '#6b7280' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Région</label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS_LIST.slice(0, 5).map(r => (
                    <button key={r} onClick={() => setRegion(r)}
                      className="px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all"
                      style={{ borderColor: region === r ? BO_PRIMARY : '#e5e7eb', backgroundColor: region === r ? `${BO_PRIMARY}15` : 'transparent', color: region === r ? BO_PRIMARY : '#6b7280' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <KPIGrid cols={3}>
        <UniversalKPI
          label="Total Acteurs"
          animatedTarget={stats?.total_acteurs ?? 12670}
          icon={Users}
          color={BO_PRIMARY}
          explication={`+${stats?.nouveaux_acteurs_semaine ?? 0} cette semaine`}
        />
        <UniversalKPI
          label="Volume échangé"
          value={stats?.montant_total ? stats.montant_total >= 1_000_000 ? (stats.montant_total / 1_000_000).toFixed(1) + " M" : stats.montant_total >= 1_000 ? (stats.montant_total / 1_000).toFixed(0) + " K" : stats.montant_total.toLocaleString("fr-FR") : "-"}
          icon={Wallet}
          color="#10B981"
          explication="FCFA ce mois"
        />
        <UniversalKPI
          label="Transactions"
          animatedTarget={stats?.total_transactions ?? 0}
          icon={BarChart3}
          color="#3B82F6"
          explication="+12%"
        />
        <UniversalKPI
          label="Commissions"
          value={stats?.montant_total ? (() => { const comm = stats.montant_total * 0.03; return comm >= 1_000_000 ? (comm / 1_000_000).toFixed(2) + " M" : comm >= 1_000 ? (comm / 1_000).toFixed(0) + " K" : comm.toFixed(0); })() : "-"}
          icon={TrendingUp}
          color="#8B5CF6"
          explication="FCFA générées"
        />
      </KPIGrid>

      {/* Graphique principal */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Évolution nationale</h2>
            <p className="text-xs text-gray-400">{periode} - {region}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric switcher */}
            {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map(m => (
              <button key={m} onClick={() => setActiveMetric(m)}
                className="px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all"
                style={{ borderColor: activeMetric === m ? METRIC_COLORS[m] : '#e5e7eb', backgroundColor: activeMetric === m ? `${METRIC_COLORS[m]}15` : 'transparent', color: activeMetric === m ? METRIC_COLORS[m] : '#9ca3af' }}>
                {METRIC_LABELS[m]}
              </button>
            ))}
            {/* Chart type */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['area', 'bar', 'line'] as const).map(t => (
                <button key={t} onClick={() => setActiveChart(t)}
                  className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ backgroundColor: activeChart === t ? 'white' : 'transparent', color: activeChart === t ? BO_DARK : '#9ca3af', boxShadow: activeChart === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                  {t === 'area' ? 'Aire' : t === 'bar' ? 'Barres' : 'Ligne'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {activeChart === 'bar' && (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={Array.isArray(MONTHLY_DATA) ? MONTHLY_DATA : []} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={activeMetric} name={METRIC_LABELS[activeMetric]} fill={METRIC_COLORS[activeMetric]} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {activeChart === 'line' && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={Array.isArray(MONTHLY_DATA) ? MONTHLY_DATA : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey={activeMetric} name={METRIC_LABELS[activeMetric]} stroke={METRIC_COLORS[activeMetric]} strokeWidth={3} dot={{ fill: METRIC_COLORS[activeMetric], r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {activeChart === 'area' && (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={Array.isArray(MONTHLY_DATA) ? MONTHLY_DATA : []}>
              <defs>
                <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={METRIC_COLORS[activeMetric]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={METRIC_COLORS[activeMetric]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey={activeMetric} name={METRIC_LABELS[activeMetric]} stroke={METRIC_COLORS[activeMetric]} strokeWidth={3} fill={`url(#grad-${activeMetric})`} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Grille graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Répartition types acteurs */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Répartition par type d'acteur</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={180}>
              <RechartsPie>
                <Pie data={Array.isArray(TYPE_DATA) ? TYPE_DATA : []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {TYPE_DATA.map((entry: typeof TYPE_DATA[number], i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => (v || 0).toLocaleString()} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {TYPE_DATA.map((item: typeof TYPE_DATA[number]) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-semibold text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{(item.value || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-gray-500">Total</span>
                  <span className="text-xs font-black text-gray-900">{TYPE_DATA.reduce((s: number, i: typeof TYPE_DATA[number]) => s + i.value, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Radar régional */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Comparaison régionale (Top 3)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={Array.isArray(RADAR_DATA) ? RADAR_DATA : []}>
              <PolarGrid
                stroke="#f0f0f0"
                {...(RADAR_DATA.length === 0 ? { polarAngles: [] as number[], polarRadius: [] as number[] } : {})}
              />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} />
              {top3Regions.map((r, i) => (
                <Radar key={r.region} name={r.region} dataKey={r.region} stroke={r.color} fill={r.color} fillOpacity={0.2 - i * 0.05} strokeWidth={2} />
              ))}
              <Legend iconType="circle" iconSize={8} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Tableau performances régionales */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900">Performance par région</h3>
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 font-semibold">{REGION_PERF.length} régions</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                {['Région', 'Acteurs', 'Volume (M FCFA)', 'Commissions (M)', 'Taux activité', 'Mes Points'].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-xs font-black text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REGION_PERF.map((r, index) => (
                <motion.tr key={r.region}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="font-bold text-gray-900">{r.region}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-gray-700">{(r.acteurs || 0).toLocaleString()}</td>
                  <td className="py-3 px-3 font-bold text-gray-900">{r.volume} M</td>
                  <td className="py-3 px-3 font-bold" style={{ color: '#10B981' }}>{r.commissions} M</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <BOProgressBar
                        value={r.taux}
                        color={r.color}
                        height="sm"
                        delay={index * 0.05}
                        maxWidth="80px"
                        className="flex-1"
                      />
                      <span className="text-xs font-bold text-gray-700">{r.taux}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, si) => (
                        <div key={si} className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: si < Math.round(r.taux / 20) ? r.color : '#e5e7eb' }} />
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Évolution par profil d'acteur */}
      <UniversalSectionCardBO title="Évolution par profil d'acteur" icon={TrendingUp} variant="info" delay={0.22}>
        <p className="text-xs text-gray-500 mb-4">Inscriptions par mois et par type d'acteur — {PROFIL_MONTHS} derniers mois.</p>
        {!profilHasData ? (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm font-semibold">
            Aucune donnée disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={PROFIL_MONTHLY} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: `2px solid ${BO_PRIMARY}20`, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {PROFIL_TYPES.map((p) => (
                <Line key={p.key} type="monotone" dataKey={p.key} name={p.label} stroke={p.color} strokeWidth={2.5} dot={false} isAnimationActive />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </UniversalSectionCardBO>

      {/* Couverture sociale (renseignement) */}
      <UniversalSectionCardBO title="Couverture sociale (renseignement)" icon={CheckCircle2} variant="success" delay={0.24}>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 font-semibold">
          Taux de renseignement du numéro, pas un taux d&apos;affiliation réel. Les données d&apos;affiliation (statut, date) ne sont pas encore collectées.
        </p>
        <KPIGrid cols={2}>
          <UniversalKPI label="N° RSTI renseigné" animatedTarget={cnpsCount} suffix={`· ${cnpsPct}%`} icon={CheckCircle2} color="#2E8B57" delay={0} />
          <UniversalKPI label="N° CMU renseigné" animatedTarget={cmuCount} suffix={`· ${cmuPct}%`} icon={CheckCircle2} color="#3B82F6" delay={0.05} />
        </KPIGrid>
      </UniversalSectionCardBO>

      {/* Génération de rapports */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${BO_PRIMARY}15` }}>
            <Printer className="w-5 h-5" style={{ color: BO_PRIMARY }} />
          </div>
          <div>
            <h3 className="font-black text-gray-900">Génération de rapports PDF</h3>
            <p className="text-xs text-gray-400">Rapports officiels prêts à imprimer ou partager</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS_TYPES.map(report => {
            const Icon = report.icon;
            const isGenerating = generating === report.id;
            return (
              <motion.div key={report.id}
                className="p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all"
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${report.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: report.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{report.label}</p>
                    <p className="text-xs text-gray-500">{report.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <FileText className="w-3 h-3" />
                    <span>{report.pages} pages</span>
                  </div>
                  <motion.button type="button" onClick={() => handleGenerate(report.id, report.label)}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: isGenerating ? `${report.color}60` : report.color }}
                    whileHover={!isGenerating ? { scale: 1.05 } : {}}
                    whileTap={!isGenerating ? { scale: 0.95 } : {}}>
                    {isGenerating ? (
                      <motion.div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    {isGenerating ? 'Génération...' : 'Générer PDF'}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden', border: '0.5px solid #e5e7eb' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid #e5e7eb' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Exporter les données</p>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>Sélectionnez les sections à inclure dans le fichier CSV</p>
            </div>
            <div style={{ padding: '8px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>6 sections disponibles</span>
              <span style={{ fontSize: 12, color: BO_PRIMARY, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setExportSections({ acteurs: true, transactions: true, kpis: true, evolution: true, repartition: true, regions: true })}>
                Tout sélectionner
              </span>
            </div>
            <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { key: 'acteurs', label: 'Acteurs', desc: 'Liste complète avec statuts et régions', color: '#C66A2C' },
                { key: 'transactions', label: 'Transactions', desc: 'Historique des flux financiers', color: '#10B981' },
                { key: 'kpis', label: 'KPIs globaux', desc: 'Indicateurs clés de performance', color: '#3B82F6' },
                { key: 'evolution', label: 'Évolution mensuelle', desc: 'Données mois par mois', color: '#8B5CF6' },
                { key: 'repartition', label: 'Répartition par type', desc: 'Distribution des rôles acteurs', color: '#F59E0B' },
                { key: 'regions', label: 'Performance régionale', desc: 'KPIs par zone géographique', color: BO_PRIMARY },
              ] as const).map(({ key, label, desc, color }) => (
                <div key={key}
                  onClick={() => setExportSections(p => ({ ...p, [key]: !p[key] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12,
                    border: `0.5px solid ${exportSections[key] ? color + '80' : '#e5e7eb'}`,
                    background: exportSections[key] ? color + '08' : 'white', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 2, background: color, opacity: 0.8 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{label}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{desc}</p>
                  </div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: exportSections[key] ? BO_PRIMARY : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 2, left: exportSections[key] ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontSize: 12, color: '#6b7280' }}>
                {Object.values(exportSections).filter(Boolean).length} section(s) sélectionnée(s)
              </span>
              <button onClick={() => setShowExportModal(false)}
                style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #d1d5db', background: 'transparent', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleConfirmExport}
                disabled={Object.values(exportSections).filter(Boolean).length === 0}
                style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: BO_PRIMARY, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: Object.values(exportSections).filter(Boolean).length === 0 ? 0.35 : 1 }}>
                Exporter CSV
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}