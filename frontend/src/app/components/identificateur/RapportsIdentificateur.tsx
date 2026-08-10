import React, { useMemo, useState, useId, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  ArrowLeft,
  FileText,
  TrendingUp,
  Calendar,
  MapPin,
  Target,
  Users,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  Award,
  TrendingDown,
  Download,
  Share2,
  X,
  Mail,
  MessageCircle,
  Printer,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { NotificationButton } from '../marchand/NotificationButton';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { KpiMoisModal, KpiObjectifModal, KpiMoyenneModal } from './KpiModals';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

const PRIMARY_COLOR = '#9F8170';

const WORKING_DAYS_PER_MONTH = 22;

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface RawIdentification {
  id: string;
  acteurId?: string;
  acteur_id?: string;
  typeActeur?: string;
  type_acteur?: string;
  statut?: string;
  dateIdentification?: string;
  date_identification?: string;
  commune?: string;
  commission?: number;
}

interface RapportMoisEntry {
  id: string;
  titre: string;
  periode: string;
  mois: string;
  annee: string;
  monthIdx: number;
  identifications: number;
  validees: number;
  rejetees: number;
  enAttente: number;
  taux: number;
  objectif: number;
  dossiers: RawIdentification[];
}

interface DownloadRapportInput {
  id?: string;
  identifications?: unknown;
  dossiers?: RawIdentification[];
}

function formatMoneyXof(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toLocaleString('fr-FR')}\u00a0FCFA`;
}

function isRawIdentificationList(v: unknown): v is RawIdentification[] {
  return Array.isArray(v);
}

// Données depuis /api/v1/identifications

// Données pour les graphiques de performance

export function RapportsIdentificateur() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { stats, identifications, getTotalCommissions } = useIdentificateur();

  const objectifMois = typeof stats.objectifMois === 'number' && Number.isFinite(stats.objectifMois)
    ? stats.objectifMois
    : 0;

  // Evolution sur 6 mois
  const dynamicPerformanceData = useMemo(() => {
    const now = new Date();
    const moisNoms = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const result: { mois: string; identifications: number; objectif: number; taux: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mois = moisNoms[d.getMonth()];
      const count = identifications.filter((row: RawIdentification) => {
        if (!row.dateIdentification) return false;
        const dd = new Date(row.dateIdentification);
        return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth();
      }).length;
      result.push({
        mois,
        identifications: count,
        objectif: objectifMois,
        taux: count > 0 ? Math.round((count / Math.max(objectifMois, 1)) * 100) : 0,
      });
    }
    return result;
  }, [identifications, objectifMois]);

  const dynamicRepartitionData = useMemo(
    () =>
      [
        { name: 'Marchands', value: identifications.filter((i: RawIdentification) => i.typeActeur === 'marchand').length, color: '#C66A2C' },
        { name: 'Producteurs', value: identifications.filter((i: RawIdentification) => i.typeActeur === 'producteur').length, color: '#16A34A' },
        {
          name: 'Coopératives',
          value: identifications.filter(
            (i: RawIdentification) => i.typeActeur === 'cooperative' || i.typeActeur === 'cooperateur'
          ).length,
          color: '#2072AF',
        },
      ].filter(d => d.value > 0),
    [identifications]
  );

  const dynamicTopZones = useMemo(() => {
    const map: Record<string, number> = {};
    identifications.forEach((i: RawIdentification) => {
      if (i.commune) map[i.commune] = (map[i.commune] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([zone, total]) => ({ zone, total, progression: '+0%' }));
  }, [identifications]);

  const dynamicWeeklyData = useMemo(() => {
    const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const map: Record<string, { marchands: number; producteurs: number }> = {};
    jours.forEach(j => { map[j] = { marchands: 0, producteurs: 0 }; });
    identifications.forEach((i: RawIdentification) => {
      if (!i.dateIdentification) return;
      const d = new Date(i.dateIdentification);
      const jour = jours[d.getDay()];
      if (i.typeActeur === 'marchand') map[jour].marchands++;
      else if (i.typeActeur === 'producteur') map[jour].producteurs++;
    });
    return jours.slice(1).concat(jours[0]).map(j => ({ jour: j, ...map[j] }));
  }, [identifications]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'rapports' | 'performance'>('performance');
  const [selectedRapport, setSelectedRapport] = useState<RapportMoisEntry | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [filterTypeActeur, setFilterTypeActeur] = useState<'all' | 'marchand' | 'producteur' | 'cooperative'>('all');
  const [filterPeriode, setFilterPeriode] = useState<'all' | 'mois' | 'annee'>('all');

  const rapportsParMois = useMemo(() => {
    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const now = new Date();

    let filtered = identifications;
    if (filterTypeActeur !== 'all') {
      if (filterTypeActeur === 'cooperative') {
        filtered = filtered.filter(
          (i: RawIdentification) => i.typeActeur === 'cooperative' || i.typeActeur === 'cooperateur'
        );
      } else {
        filtered = filtered.filter((i: RawIdentification) => i.typeActeur === filterTypeActeur);
      }
    }
    if (filterPeriode === 'mois') {
      filtered = filtered.filter((i: RawIdentification) => {
        if (!i.dateIdentification) return false;
        const d = new Date(i.dateIdentification);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (filterPeriode === 'annee') {
      filtered = filtered.filter((i: RawIdentification) => {
        if (!i.dateIdentification) return false;
        const d = new Date(i.dateIdentification);
        return d.getFullYear() === now.getFullYear();
      });
    }

    const groupes: Record<string, RawIdentification[]> = {};
    filtered.forEach((i: RawIdentification) => {
      if (!i.dateIdentification) return;
      const d = new Date(i.dateIdentification);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groupes[key]) groupes[key] = [];
      groupes[key].push(i);
    });

    return Object.entries(groupes)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, dossiers]) => {
        const [year, month] = key.split('-');
        const monthIndex0 = Math.max(0, parseInt(month, 10) - 1);
        const validees = dossiers.filter((i: RawIdentification) => ['validee', 'valide', 'approuve'].includes(i.statut || '')).length;
        const rejetees = dossiers.filter((i: RawIdentification) => ['rejete', 'rejetee'].includes(i.statut || '')).length;
        const enAttente = dossiers.filter((i: RawIdentification) => ['soumis', 'en_attente', 'complement'].includes(i.statut || '')).length;
        const taux = dossiers.length > 0 ? Math.round((validees / dossiers.length) * 100) : 0;
        const objectif = dossiers.length > 0 ? Math.max(dossiers.length * 2, 10) : 0;
        return {
          id: key,
          titre: `Rapport ${moisNoms[monthIndex0]} ${year}`,
          periode: `${moisNoms[monthIndex0]} ${year}`,
          mois: moisNoms[monthIndex0],
          annee: year,
          monthIdx: monthIndex0,
          identifications: dossiers.length,
          validees,
          rejetees,
          enAttente,
          taux,
          objectif,
          dossiers,
        };
      });
  }, [identifications, filterTypeActeur, filterPeriode]);

  const [showModal, setShowModal] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showRepartitionModal, setShowRepartitionModal] = useState(false);
  const [showTopZonesModal, setShowTopZonesModal] = useState(false);
  const [showBestDayModal, setShowBestDayModal] = useState(false);
  const [showSuccessRateModal, setShowSuccessRateModal] = useState(false);
  const [showKpiMoisModal, setShowKpiMoisModal] = useState(false);
  const [showKpiObjectifModal, setShowKpiObjectifModal] = useState(false);
  const [showKpiMoyenneModal, setShowKpiMoyenneModal] = useState(false);

  const detailModalTitleId = useId();
  const evolutionModalTitleId = useId();
  const weeklyModalTitleId = useId();
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const evolutionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const weeklyTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showModal) {
        setShowModal(false);
        detailTriggerRef.current?.focus();
        return;
      }
      if (showEvolutionModal) {
        setShowEvolutionModal(false);
        evolutionTriggerRef.current?.focus();
        return;
      }
      if (showWeeklyModal) {
        setShowWeeklyModal(false);
        weeklyTriggerRef.current?.focus();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal, showEvolutionModal, showWeeklyModal]);

  const zonesCouvertesCount = useMemo(
    () => [...new Set(identifications.map((i: RawIdentification) => i.commune).filter(Boolean))].length,
    [identifications]
  );

  const handleGenerateRapport = () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const now = new Date();
      const mois = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const nbMarchands = identifications.filter((i: RawIdentification) => i.typeActeur === 'marchand').length;
      const nbProducteurs = identifications.filter((i: RawIdentification) => i.typeActeur === 'producteur').length;
      const nbValides = identifications.filter((i: RawIdentification) =>
        ['validee', 'valide', 'approuve'].includes(i.statut || '')
      ).length;
      const taux = stats.total > 0 ? Math.round((nbValides / stats.total) * 100) : 0;

      doc.setFillColor(159, 129, 112);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT MENSUEL JULABA', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.text(mois.toUpperCase(), 105, 30, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Résumé des identifications', 20, 55);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const rows = [
        ['Total identifications', String(stats.total)],
        ['Marchands', String(nbMarchands)],
        ['Producteurs', String(nbProducteurs)],
        ['Validées', String(nbValides)],
        ['Taux de validation', taux + '%'],
        ['Moyenne/jour', String(stats.total > 0 ? Math.round(stats.total / WORKING_DAYS_PER_MONTH) : 0)],
      ];
      let y = 65;
      rows.forEach(([label, val]) => {
        doc.setFillColor(248, 248, 248);
        doc.rect(20, y - 5, 170, 10, 'F');
        doc.text(label, 25, y);
        doc.setFont('helvetica', 'bold');
        doc.text(val, 170, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 13;
      });

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Généré par JULABA - ' + now.toLocaleDateString('fr-FR'), 105, 285, { align: 'center' });

      doc.save('rapport-julaba-' + now.toISOString().slice(0, 7) + '.pdf');
      toast.success('Rapport PDF généré avec succès\u202f!');
    } catch (err) {
      console.warn('[RapportsIdentificateur] generateRapport failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la génération du PDF. Réessaie.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownload = (rapport: DownloadRapportInput) => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    toast('Génération du PDF en cours\u2026');
    try {
      const list: RawIdentification[] = isRawIdentificationList(rapport?.identifications)
        ? rapport.identifications
        : identifications;
      const totalIds = list.length;
      const valideesIds = list.filter((i: RawIdentification) =>
        ['validee', 'valide', 'approuve'].includes(i.statut || '')
      ).length;
      const enAttenteIds = list.filter((i: RawIdentification) =>
        ['soumis', 'en_attente', 'complement'].includes(i.statut || '')
      ).length;
      const tauxPdf =
        totalIds > 0 ? Math.round((valideesIds / totalIds) * 100) : 0;
      const commissionsSubset = list.reduce(
        (s: number, i: RawIdentification) => s + (Number(i.commission) || 0),
        0
      );

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const H = 297;
      const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      doc.setFillColor(159, 129, 112);
      doc.rect(0, 0, W, 45, 'F');

      doc.setFillColor(179, 148, 133);
      doc.rect(0, 40, W, 5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('JÙLABA', 20, 22);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Plateforme Nationale d\u2019Inclusion Économique', 20, 32);

      doc.setFontSize(10);
      doc.text('RAPPORT D\u2019ACTIVITÉ', W - 20, 18, { align: 'right' });
      doc.text(date, W - 20, 26, { align: 'right' });

      doc.setFillColor(245, 240, 237);
      doc.rect(0, 45, W, 18, 'F');
      doc.setTextColor(80, 60, 50);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`Identificateur : ${user?.prenoms || ''} ${user?.nom || user?.telephone || ''}`, 20, 57);

      doc.setDrawColor(159, 129, 112);
      doc.setLineWidth(0.5);
      doc.line(20, 68, W - 20, 68);

      doc.setTextColor(159, 129, 112);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSUMÉ DES PERFORMANCES', 20, 78);

      const kpis = [
        { label: 'Total Identifications', value: String(totalIds), color: [59, 130, 246] },
        { label: 'Identifications Validées', value: String(valideesIds), color: [22, 163, 74] },
        { label: 'En Attente', value: String(enAttenteIds), color: [217, 119, 6] },
        { label: 'Taux de Validation', value: `${tauxPdf}%`, color: [99, 102, 241] },
      ];

      kpis.forEach((kpi, i) => {
        const x = i % 2 === 0 ? 20 : W / 2 + 5;
        const y = 85 + Math.floor(i / 2) * 32;
        doc.setFillColor(250, 248, 246);
        doc.roundedRect(x, y, W / 2 - 25, 26, 3, 3, 'F');
        doc.setDrawColor(...kpi.color as [number, number, number]);
        doc.setLineWidth(0.8);
        doc.roundedRect(x, y, W / 2 - 25, 26, 3, 3, 'S');
        doc.setTextColor(...kpi.color as [number, number, number]);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.value, x + (W / 2 - 25) / 2, y + 14, { align: 'center' });
        doc.setTextColor(100, 80, 70);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.label, x + (W / 2 - 25) / 2, y + 21, { align: 'center' });
      });

      const detailY = 155;
      doc.setDrawColor(159, 129, 112);
      doc.setLineWidth(0.5);
      doc.line(20, detailY, W - 20, detailY);
      doc.setTextColor(159, 129, 112);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('DÉTAILS PAR TYPE D\u2019ACTEUR', 20, detailY + 10);

      const details = [
        { label: 'Marchands identifiés', value: String(list.filter((i: RawIdentification) => i.typeActeur === 'marchand').length) },
        { label: 'Producteurs identifiés', value: String(list.filter((i: RawIdentification) => i.typeActeur === 'producteur').length) },
        {
          label: 'Coopératives identifiées',
          value: String(
            list.filter(
              (i: RawIdentification) => i.typeActeur === 'cooperative' || i.typeActeur === 'cooperateur'
            ).length
          ),
        },
        { label: 'Zones couvertes', value: String([...new Set(list.map((i: RawIdentification) => i.commune).filter(Boolean))].length) },
        { label: 'Commissions gagnées', value: formatMoneyXof(commissionsSubset || 0) },
      ];

      details.forEach((d, i) => {
        const y = detailY + 18 + i * 12;
        doc.setFillColor(i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 248 : 243, i % 2 === 0 ? 246 : 241);
        doc.rect(20, y - 5, W - 40, 10, 'F');
        doc.setTextColor(80, 60, 50);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(d.label, 25, y + 1);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(159, 129, 112);
        doc.text(d.value, W - 25, y + 1, { align: 'right' });
      });

      doc.setFillColor(159, 129, 112);
      doc.rect(0, H - 20, W, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('JÙLABA © 2026 - Plateforme Nationale d\u2019Inclusion Économique', W / 2, H - 10, { align: 'center' });
      doc.text(`Généré le ${date}`, W / 2, H - 5, { align: 'center' });

      const slug =
        typeof rapport?.id === 'string'
          ? rapport.id
          : new Date().toISOString().slice(0, 10);
      doc.save(`rapport-julaba-${slug}.pdf`);
      toast.success('PDF téléchargé avec succès\u202f!');
    } catch (err) {
      console.warn('[RapportsIdentificateur] download failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors du téléchargement du PDF. Réessaie.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShare = (platform: 'whatsapp' | 'email' | 'print') => {
    const tauxSafe = typeof stats.tauxValidation === 'number' ? stats.tauxValidation : 0;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const rawMessage = `Rapport JULABA - ${dateStr}\nIdentifications: ${stats.total}\nValidées: ${stats.validees}\nTaux: ${tauxSafe}%`;
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(rawMessage)}`, '_blank');
      toast.success('Ouverture de WhatsApp\u2026');
    } else if (platform === 'email') {
      const subject = encodeURIComponent('Rapport JULABA');
      const body = encodeURIComponent(rawMessage);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      toast.success('Ouverture de ton application email\u2026');
    } else if (platform === 'print') {
      window.print();
      toast.success('Impression en cours\u2026');
    }
  };

  const rapportsFiltres = useMemo(
    () =>
      rapportsParMois.filter(
        r =>
          !searchQuery
          || r.titre.toLowerCase().includes(searchQuery.toLowerCase())
          || r.periode.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [rapportsParMois, searchQuery]
  );

  return (
    <SubPageLayout
      role="identificateur"
      title="Rapports"
      noPadding={true}
      rightContent={<NotificationButton />}
    >
      <div className="pt-2 pb-32 lg:pb-8 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-[#F5F0ED] to-white">

        <div
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4"
          role="status"
          aria-live="polite"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-900">
            Écran sensible. Données personnelles identifiées (nom identificateur, stats agrégées). Les PDF téléchargés
            contiennent les mêmes informations. Ne pas partager publiquement.
          </p>
        </div>

        {/* KPIs - Stats de performance */}
        <KPIGrid cols={2} className="mb-4">
          <UniversalKPI
            label="Total"
            animatedTarget={stats.total}
            icon={Users}
            color="#F59E0B"
            onClick={() => { setShowKpiMoisModal(true); }}
          />
          <UniversalKPI
            label="Objectif"
            value={stats.objectifMois > 0 ? `${stats.total}/${stats.objectifMois}` : '-'}
            icon={Target}
            color="#16a34a"
            onClick={() => { setShowKpiObjectifModal(true); }}
          />
          <UniversalKPI
            label="Moyenne / jour"
            animatedTarget={stats.total > 0 ? Math.round(stats.total / WORKING_DAYS_PER_MONTH) : 0}
            icon={TrendingUp}
            color="#2072AF"
            onClick={() => { setShowKpiMoyenneModal(true); }}
          />
          <UniversalKPI
            label="Zones couvertes"
            animatedTarget={zonesCouvertesCount}
            icon={MapPin}
            color="#9F8170"
            explication="Nombre de communes distinctes"
          />
        </KPIGrid>

        {/* Tabs - Rapports / Performance */}
        <motion.div
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            type="button"
            aria-pressed={selectedTab === 'rapports'}
            onClick={() => {
              setSelectedTab('rapports');
            }}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold transition-all ${
              selectedTab === 'rapports'
                ? 'bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white border-2 border-[#9F8170] shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#9F8170]'
            }`}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span>Rapports</span>
          </motion.button>

          <motion.button
            type="button"
            aria-pressed={selectedTab === 'performance'}
            onClick={() => {
              setSelectedTab('performance');
            }}
            className={`flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl font-semibold transition-all whitespace-nowrap ${
              selectedTab === 'performance'
                ? 'bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white border-2 border-[#9F8170] shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#9F8170]'
            }`}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <span>Performance</span>
          </motion.button>
        </motion.div>

        {/* Barre de recherche - visible uniquement si rapports disponibles */}
        {rapportsParMois.length > 0 && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un rapport…"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-base placeholder:text-gray-400 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>
        )}

        {/* Bouton Filtres avancés */}
        <motion.button
          type="button"
          aria-expanded={showFilters}
          onClick={() => {
            setShowFilters(!showFilters);
          }}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#9F8170] transition-colors mb-2 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">Filtres avancés</span>
          </div>
          <motion.div
            animate={{ rotate: showFilters ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm overflow-hidden"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2">{'Type d\u2019acteur'}</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'all', label: 'Tous' },
                      { key: 'marchand', label: 'Marchand' },
                      { key: 'producteur', label: 'Producteur' },
                      { key: 'cooperative', label: 'Coopérative' },
                    ] as const).map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setFilterTypeActeur(t.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${filterTypeActeur === t.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                        style={filterTypeActeur === t.key ? { backgroundColor: PRIMARY_COLOR } : {}}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2">Période</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'all', label: 'Toutes' },
                      { key: 'mois', label: 'Ce mois' },
                      { key: 'annee', label: 'Cette année' },
                    ] as const).map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setFilterPeriode(p.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${filterPeriode === p.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                        style={filterPeriode === p.key ? { backgroundColor: PRIMARY_COLOR } : {}}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {(filterTypeActeur !== 'all' || filterPeriode !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setFilterTypeActeur('all'); setFilterPeriode('all'); }}
                    className="text-xs font-bold text-gray-500 underline"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenu conditionnel selon l'onglet */}
        <AnimatePresence mode="wait">
          {selectedTab === 'rapports' ? (
            <motion.div
              key="rapports"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
        {/* Liste des rapports */}
              <div className="space-y-3">
                {rapportsFiltres.map((rapport, index) => (
                  <motion.div
                    key={rapport.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-200 hover:border-[#9F8170] transition-all"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#9F8170]/10 to-[#B39485]/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-[#9F8170]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-base mb-1">{rapport.titre}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3 flex-wrap">
                          <span><span className="font-bold text-gray-900">{rapport.identifications}</span> dossiers</span>
                          <span className="text-green-600"><span className="font-bold">{rapport.validees}</span> validés</span>
                          {rapport.enAttente > 0 && <span className="text-orange-600"><span className="font-bold">{rapport.enAttente}</span> en attente</span>}
                          {rapport.rejetees > 0 && <span className="text-red-600"><span className="font-bold">{rapport.rejetees}</span> rejetés</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <motion.button
                            type="button"
                            disabled={generatingPdf}
                            aria-busy={generatingPdf}
                            onClick={() => {
                              const moisStats = {
                                ...rapport,
                                identifications: rapport.dossiers,
                              };
                              handleDownload(moisStats);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm shadow-md ${generatingPdf ? 'opacity-60 cursor-not-allowed' : ''}`}
                            style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #B39485)` }}
                            whileHover={generatingPdf ? {} : { scale: 1.03 }}
                            whileTap={generatingPdf ? {} : { scale: 0.97 }}
                          >
                            <Download className="w-4 h-4" />
                            Télécharger PDF
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={(ev) => {
                              detailTriggerRef.current = ev.currentTarget;
                              setSelectedRapport(rapport);
                              setShowModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-700 font-semibold text-sm border-2 border-gray-200"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Détails
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

              </div>

              {/* Bouton génération rapport */}
              {rapportsParMois.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <p className="text-lg font-semibold text-gray-600">Aucun rapport disponible</p>
                  <p className="text-sm text-gray-500 mt-1 mb-6">Génère ton rapport mensuel avec tes données réelles</p>
                  <motion.button
                    type="button"
                    disabled={generatingPdf}
                    aria-busy={generatingPdf}
                    whileHover={generatingPdf ? {} : { scale: 1.05 }}
                    whileTap={generatingPdf ? {} : { scale: 0.95 }}
                    onClick={handleGenerateRapport}
                    className={`px-6 py-3 rounded-2xl text-white font-bold flex items-center gap-2 mx-auto ${generatingPdf ? 'opacity-60 cursor-not-allowed' : ''}`}
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    <FileText className="w-5 h-5" />
                    Générer le rapport du mois
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="performance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Section 1: Évolution mensuelle */}
              <motion.button
                ref={evolutionTriggerRef}
                type="button"
                aria-label={'Voir l\u2019évolution détaillée sur 6 mois'}
                className="bg-white rounded-3xl p-4 shadow-md border-2 border-gray-200 cursor-pointer hover:border-[#9F8170] transition-all text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9F8170]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setShowEvolutionModal(true);
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Évolution sur 6 mois</h3>
                    <p className="text-xs text-gray-600">Identifications vs Objectifs</p>
                  </div>
                </div>
                <div className="min-h-[250px]">
                  <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={dynamicPerformanceData || []}>
                    <defs>
                      <linearGradient id="colorIdentifications" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9F8170" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#9F8170" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorObjectif" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="mois" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '2px solid #E5E7EB', 
                        borderRadius: '12px',
                        fontSize: '12px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="identifications" 
                      stroke="#9F8170" 
                      strokeWidth={3}
                      fill="url(#colorIdentifications)" 
                      name="Identifications"
                    />
                    {objectifMois > 0 && (
                    <Area 
                      type="monotone" 
                      dataKey="objectif" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#colorObjectif)" 
                      name="Objectif"
                    />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </motion.button>

              {/* Section 2: Performance hebdomadaire */}
              <motion.button
                ref={weeklyTriggerRef}
                type="button"
                aria-label="Voir le détail hebdomadaire"
                className="bg-white rounded-3xl p-4 shadow-md border-2 border-gray-200 cursor-pointer hover:border-[#9F8170] transition-all text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9F8170]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setShowWeeklyModal(true);
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Cette semaine</h3>
                    <p className="text-xs text-gray-600">Répartition par jour et par type</p>
                  </div>
                </div>
                <div className="min-h-[250px]">
                  <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dynamicWeeklyData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="jour" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '2px solid #E5E7EB', 
                        borderRadius: '12px',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="marchands" fill="#C66A2C" radius={[8, 8, 0, 0]} name="Marchands" />
                    <Bar dataKey="producteurs" fill="#16A34A" radius={[8, 8, 0, 0]} name="Producteurs" />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </motion.button>

              {/* Section 3: Répartition et Top Zones */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Répartition par type */}
                <motion.div
                  className="bg-white rounded-3xl p-4 shadow-md border-2 border-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Répartition</h3>
                      <p className="text-xs text-gray-600">{'Par type d\u2019acteur'}</p>
                    </div>
                  </div>
                  <div className="min-h-[200px]">
                    <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={dynamicRepartitionData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(dynamicRepartitionData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '2px solid #E5E7EB', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-2">
                    {(dynamicRepartitionData || []).map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-600">{item.name}: <span className="font-bold">{item.value}</span></span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Top 5 Zones */}
                <motion.div
                  className="bg-white rounded-3xl p-4 shadow-md border-2 border-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                      <Award className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Top 5 Zones</h3>
                      <p className="text-xs text-gray-600">Meilleurs territoires</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dynamicTopZones.map((zone, index) => (
                      <motion.div
                        key={zone.zone}
                        className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-200"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{zone.zone}</p>
                            <p className="text-xs text-gray-600">{zone.total} identifications</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          zone.progression.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {zone.progression.startsWith('+') ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{zone.progression}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de détails du rapport */}
      <AnimatePresence>
        {showModal && selectedRapport && (
          <div className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowModal(false);
                detailTriggerRef.current?.focus();
              }}
            />

            {/* Modal Content */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={detailModalTitleId}
              className="relative bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] lg:max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 rounded-t-3xl z-10">
                <div className="flex items-center justify-between">
                  <h2 id={detailModalTitleId} className="font-bold text-gray-900 text-xl">Détails du rapport</h2>
                  <motion.button
                    type="button"
                    aria-label="Fermer la fenêtre"
                    onClick={() => {
                      setShowModal(false);
                      detailTriggerRef.current?.focus();
                    }}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 90 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Section titre et statut */}
                <div className="bg-gradient-to-br from-[#F5F0ED] to-white rounded-3xl p-5 border-2 border-[#9F8170]/20">
                  <div className="flex items-start gap-4">
                    <motion.div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9F8170] to-[#B39485] flex items-center justify-center flex-shrink-0 shadow-lg"
                      animate={prefersReducedMotion ? {} : { rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      aria-hidden="true"
                    >
                      <FileText className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{selectedRapport.titre}</h3>
                      <p className="text-sm text-gray-600 mb-3">{selectedRapport.periode}</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Synthèse mensuelle</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPIs détaillés */}
                <div className="grid grid-cols-3 gap-3">
                  <motion.div
                    className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 border-2 border-blue-200"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <p className="text-xs text-gray-600 font-semibold">Identifications</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{selectedRapport.identifications}</p>
                    <p className="text-xs text-gray-500 mt-1">acteurs enregistrés</p>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-4 border-2 border-green-200"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <p className="text-xs text-gray-600 font-semibold">Objectif</p>
                    </div>
                    <p className="text-3xl font-bold text-green-600">{selectedRapport.objectif}</p>
                    <p className="text-xs text-gray-500 mt-1">acteurs attendus</p>
                  </motion.div>

                  <motion.div
                    className={`bg-gradient-to-br rounded-2xl p-4 border-2 ${
                      selectedRapport.taux >= 100
                        ? 'from-amber-50 to-white border-amber-200'
                        : 'from-orange-50 to-white border-orange-200'
                    }`}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-5 h-5 ${selectedRapport.taux >= 100 ? 'text-amber-600' : 'text-orange-600'}`} />
                      <p className="text-xs text-gray-600 font-semibold">Taux</p>
                    </div>
                    <p className={`text-3xl font-bold ${selectedRapport.taux >= 100 ? 'text-amber-600' : 'text-orange-600'}`}>
                      {selectedRapport.taux}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedRapport.taux >= 100 ? 'Objectif dépassé' : 'En progression'}
                    </p>
                  </motion.div>
                </div>

                {/* Détails supplémentaires */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-5 border-2 border-gray-200 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#9F8170]" />
                    Détails de la période
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Marchands identifiés</p>
                      <p className="text-lg font-bold text-[#C66A2C]">
                        {(selectedRapport.dossiers || []).filter((i: RawIdentification) => i.typeActeur === 'marchand').length}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Producteurs identifiés</p>
                      <p className="text-lg font-bold text-[#16A34A]">
                        {(selectedRapport.dossiers || []).filter((i: RawIdentification) => i.typeActeur === 'producteur').length}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Zones couvertes</p>
                      <p className="text-lg font-bold text-blue-600">
                        {[...new Set((selectedRapport.dossiers || []).map((i: RawIdentification) => i.commune).filter(Boolean))].length}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Taux de validation</p>
                      <p className="text-lg font-bold text-purple-600">
                        {selectedRapport.taux}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Actions disponibles</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Télécharger PDF */}
                    <motion.button
                      type="button"
                      disabled={generatingPdf}
                      aria-busy={generatingPdf}
                      onClick={() =>
                        handleDownload({
                          ...selectedRapport,
                          identifications: selectedRapport.dossiers || [],
                        })
                      }
                      className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white border-2 border-[#9F8170] shadow-lg ${generatingPdf ? 'opacity-60 cursor-not-allowed' : ''}`}
                      whileHover={generatingPdf ? {} : prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={generatingPdf ? {} : prefersReducedMotion ? {} : { scale: 0.98 }}
                    >
                      <Download className="w-5 h-5" />
                      <span>PDF</span>
                    </motion.button>

                    {/* Imprimer */}
                    <motion.button
                      type="button"
                      onClick={() => handleShare('print')}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-white text-gray-700 border-2 border-gray-300 hover:border-[#9F8170]"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    >
                      <Printer className="w-5 h-5" />
                      <span>Imprimer</span>
                    </motion.button>
                  </div>

                  <div className="pt-2 border-t-2 border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-3">Partager via</p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* WhatsApp */}
                      <motion.button
                        type="button"
                        onClick={() => handleShare('whatsapp')}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-[#25D366] text-white border-2 border-[#25D366] shadow-lg"
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>WhatsApp</span>
                      </motion.button>

                      {/* Email */}
                      <motion.button
                        type="button"
                        onClick={() => handleShare('email')}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-blue-600 text-white border-2 border-blue-600 shadow-lg"
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <Mail className="w-5 h-5" />
                        <span>Email</span>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Note de bas de page */}
                <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">{`Note\u202f:`}</span>
                    {` Ce rapport sera automatiquement soumis au superviseur pour validation dans les 48h.`}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal d'évolution mensuelle */}
      <AnimatePresence>
        {showEvolutionModal && (
          <div className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEvolutionModal(false);
                evolutionTriggerRef.current?.focus();
              }}
            />

            {/* Modal Content */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={evolutionModalTitleId}
              className="relative bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] lg:max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 rounded-t-3xl z-10">
                <div className="flex items-center justify-between">
                  <h2 id={evolutionModalTitleId} className="font-bold text-gray-900 text-xl">Évolution mensuelle</h2>
                  <motion.button
                    type="button"
                    aria-label="Fermer la fenêtre"
                    onClick={() => {
                      setShowEvolutionModal(false);
                      evolutionTriggerRef.current?.focus();
                    }}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 90 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Section titre et statut */}
                <div className="bg-gradient-to-br from-[#F5F0ED] to-white rounded-3xl p-5 border-2 border-[#9F8170]/20">
                  <div className="flex items-start gap-4">
                    <motion.div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9F8170] to-[#B39485] flex items-center justify-center flex-shrink-0 shadow-lg"
                      animate={prefersReducedMotion ? {} : { rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      aria-hidden="true"
                    >
                      <FileText className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">Évolution sur 6 mois</h3>
                      <p className="text-sm text-gray-600 mb-3">Identifications vs Objectifs</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Données agrégées</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPIs détaillés */}
                <div className="grid grid-cols-3 gap-3">
                  <motion.div
                    className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 border-2 border-blue-200"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <p className="text-xs text-gray-600 font-semibold">Identifications</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">acteurs enregistrés</p>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-4 border-2 border-green-200"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <p className="text-xs text-gray-600 font-semibold">Objectif</p>
                    </div>
                    <p className="text-3xl font-bold text-green-600">{stats.objectifMois || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">acteurs attendus</p>
                  </motion.div>

                  <motion.div
                    className={`bg-gradient-to-br rounded-2xl p-4 border-2 ${
                      stats.tauxValidation >= 75
                        ? 'from-amber-50 to-white border-amber-200'
                        : 'from-orange-50 to-white border-orange-200'
                    }`}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-5 h-5 ${stats.tauxValidation >= 75 ? 'text-amber-600' : 'text-orange-600'}`} />
                      <p className="text-xs text-gray-600 font-semibold">Taux</p>
                    </div>
                    <p className={`text-3xl font-bold ${stats.tauxValidation >= 75 ? 'text-amber-600' : 'text-orange-600'}`}>
                      {stats.tauxValidation}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.tauxValidation >= 75 ? 'Objectif dépassé' : 'En progression'}
                    </p>
                  </motion.div>
                </div>

                {/* Détails supplémentaires */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-5 border-2 border-gray-200 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#9F8170]" />
                    Détails de la période
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Marchands identifiés</p>
                      <p className="text-lg font-bold text-[#C66A2C]">
                        {identifications.filter((i: RawIdentification) => i.typeActeur === 'marchand').length}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Producteurs identifiés</p>
                      <p className="text-lg font-bold text-[#16A34A]">
                        {identifications.filter((i: RawIdentification) => i.typeActeur === 'producteur').length}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Zones couvertes</p>
                      <p className="text-lg font-bold text-blue-600">
                        {zonesCouvertesCount}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Commissions gagnées</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatMoneyXof(getTotalCommissions())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Actions disponibles</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Télécharger PDF */}
                    <motion.button
                      type="button"
                      disabled={generatingPdf}
                      aria-busy={generatingPdf}
                      onClick={() =>
                        handleDownload(
                          selectedRapport?.dossiers?.length
                            ? { ...selectedRapport, identifications: selectedRapport.dossiers }
                            : {}
                        )
                      }
                      className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white border-2 border-[#9F8170] shadow-lg ${generatingPdf ? 'opacity-60 cursor-not-allowed' : ''}`}
                      whileHover={generatingPdf ? {} : prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={generatingPdf ? {} : prefersReducedMotion ? {} : { scale: 0.98 }}
                    >
                      <Download className="w-5 h-5" />
                      <span>PDF</span>
                    </motion.button>

                    {/* Imprimer */}
                    <motion.button
                      type="button"
                      onClick={() => handleShare('print')}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-white text-gray-700 border-2 border-gray-300 hover:border-[#9F8170]"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    >
                      <Printer className="w-5 h-5" />
                      <span>Imprimer</span>
                    </motion.button>
                  </div>

                  <div className="pt-2 border-t-2 border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-3">Partager via</p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* WhatsApp */}
                      <motion.button
                        type="button"
                        onClick={() => handleShare('whatsapp')}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-[#25D366] text-white border-2 border-[#25D366] shadow-lg"
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>WhatsApp</span>
                      </motion.button>

                      {/* Email */}
                      <motion.button
                        type="button"
                        onClick={() => handleShare('email')}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-blue-600 text-white border-2 border-blue-600 shadow-lg"
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <Mail className="w-5 h-5" />
                        <span>Email</span>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Note de bas de page */}
                <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">{`Note\u202f:`}</span>
                    {` Ce rapport sera automatiquement soumis au superviseur pour validation dans les 48h.`}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de performance hebdomadaire */}
      <AnimatePresence>
        {showWeeklyModal && (
          <div className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowWeeklyModal(false);
                weeklyTriggerRef.current?.focus();
              }}
            />

            {/* Modal Content */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={weeklyModalTitleId}
              className="relative bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] lg:max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 rounded-t-3xl z-10">
                <div className="flex items-center justify-between">
                  <h2 id={weeklyModalTitleId} className="font-bold text-gray-900 text-xl">Performance hebdomadaire</h2>
                  <motion.button
                    type="button"
                    aria-label="Fermer la fenêtre"
                    onClick={() => {
                      setShowWeeklyModal(false);
                      weeklyTriggerRef.current?.focus();
                    }}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 90 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Section titre et statut */}
                <div className="bg-gradient-to-br from-[#F5F0ED] to-white rounded-3xl p-5 border-2 border-[#9F8170]/20">
                  <div className="flex items-start gap-4">
                    <motion.div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9F8170] to-[#B39485] flex items-center justify-center flex-shrink-0 shadow-lg"
                      animate={prefersReducedMotion ? {} : { rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      aria-hidden="true"
                    >
                      <FileText className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">Cette semaine</h3>
                      <p className="text-sm text-gray-600 mb-3">Répartition par jour et par type</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Données agrégées</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPIs détaillés */}
                <div className="grid grid-cols-3 gap-3">
                  <motion.div
                    className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 border-2 border-blue-200"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <p className="text-xs text-gray-600 font-semibold">Identifications</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">acteurs enregistrés</p>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-4 border-2 border-green-200"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <p className="text-xs text-gray-600 font-semibold">Objectif</p>
                    </div>
                    <p className="text-3xl font-bold text-green-600">{stats.objectifMois || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">acteurs attendus</p>
                  </motion.div>

                  <motion.div
                    className={`bg-gradient-to-br rounded-2xl p-4 border-2 ${
                      stats.tauxValidation >= 75
                        ? 'from-amber-50 to-white border-amber-200'
                        : 'from-orange-50 to-white border-orange-200'
                    }`}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-5 h-5 ${stats.tauxValidation >= 75 ? 'text-amber-600' : 'text-orange-600'}`} />
                      <p className="text-xs text-gray-600 font-semibold">Taux</p>
                    </div>
                    <p className={`text-3xl font-bold ${stats.tauxValidation >= 75 ? 'text-amber-600' : 'text-orange-600'}`}>
                      {stats.tauxValidation}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.tauxValidation >= 75 ? 'Objectif dépassé' : 'En progression'}
                    </p>
                  </motion.div>
                </div>

                {/* Détails supplémentaires */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-5 border-2 border-gray-200 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#9F8170]" />
                    Détails de la période
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Marchands identifiés</p>
                      <p className="text-lg font-bold text-[#C66A2C]">
                        {identifications.filter((i: RawIdentification) => i.typeActeur === 'marchand').length}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Producteurs identifiés</p>
                      <p className="text-lg font-bold text-[#16A34A]">
                        {identifications.filter((i: RawIdentification) => i.typeActeur === 'producteur').length}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Zones couvertes</p>
                      <p className="text-lg font-bold text-blue-600">
                        {zonesCouvertesCount}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Commissions gagnées</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatMoneyXof(getTotalCommissions())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Actions disponibles</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Télécharger PDF */}
                    <motion.button
                      type="button"
                      disabled={generatingPdf}
                      aria-busy={generatingPdf}
                      onClick={() =>
                        handleDownload(
                          selectedRapport?.dossiers?.length
                            ? { ...selectedRapport, identifications: selectedRapport.dossiers }
                            : {}
                        )
                      }
                      className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white border-2 border-[#9F8170] shadow-lg ${generatingPdf ? 'opacity-60 cursor-not-allowed' : ''}`}
                      whileHover={generatingPdf ? {} : prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={generatingPdf ? {} : prefersReducedMotion ? {} : { scale: 0.98 }}
                    >
                      <Download className="w-5 h-5" />
                      <span>PDF</span>
                    </motion.button>

                    {/* Imprimer */}
                    <motion.button
                      type="button"
                      onClick={() => handleShare('print')}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-white text-gray-700 border-2 border-gray-300 hover:border-[#9F8170]"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    >
                      <Printer className="w-5 h-5" />
                      <span>Imprimer</span>
                    </motion.button>
                  </div>

                  <div className="pt-2 border-t-2 border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-3">Partager via</p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* WhatsApp */}
                      <motion.button
                        type="button"
                        onClick={() => handleShare('whatsapp')}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-[#25D366] text-white border-2 border-[#25D366] shadow-lg"
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>WhatsApp</span>
                      </motion.button>

                      {/* Email */}
                      <motion.button
                        type="button"
                        onClick={() => handleShare('email')}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold bg-blue-600 text-white border-2 border-blue-600 shadow-lg"
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      >
                        <Mail className="w-5 h-5" />
                        <span>Email</span>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Note de bas de page */}
                <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">{`Note\u202f:`}</span>
                    {` Ce rapport sera automatiquement soumis au superviseur pour validation dans les 48h.`}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals KPI */}
      <KpiMoisModal
        show={showKpiMoisModal}
        onClose={() => setShowKpiMoisModal(false)}
        total={stats.total}
        validees={stats.validees}
        tauxValidation={stats.tauxValidation}
        nbMarchands={identifications.filter((i: RawIdentification) => i.typeActeur === 'marchand').length}
        nbProducteurs={identifications.filter((i: RawIdentification) => i.typeActeur === 'producteur').length}
        objectif={stats.objectifMois || 0}
        moyenne={stats.total > 0 ? Math.round(stats.total / WORKING_DAYS_PER_MONTH) : 0}
        onDownload={() => {}}
        onShare={handleShare}
      />

      <KpiObjectifModal
        show={showKpiObjectifModal}
        onClose={() => setShowKpiObjectifModal(false)}
        total={stats.total}
        validees={stats.validees}
        tauxValidation={stats.tauxValidation}
        nbMarchands={identifications.filter((i: RawIdentification) => i.typeActeur === 'marchand').length}
        nbProducteurs={identifications.filter((i: RawIdentification) => i.typeActeur === 'producteur').length}
        objectif={stats.objectifMois || 0}
        moyenne={stats.total > 0 ? Math.round(stats.total / WORKING_DAYS_PER_MONTH) : 0}
        onDownload={() => {}}
        onShare={handleShare}
      />

      <KpiMoyenneModal
        show={showKpiMoyenneModal}
        onClose={() => setShowKpiMoyenneModal(false)}
        total={stats.total}
        validees={stats.validees}
        tauxValidation={stats.tauxValidation}
        nbMarchands={identifications.filter((i: RawIdentification) => i.typeActeur === 'marchand').length}
        nbProducteurs={identifications.filter((i: RawIdentification) => i.typeActeur === 'producteur').length}
        objectif={stats.objectifMois || 0}
        moyenne={stats.total > 0 ? Math.round(stats.total / WORKING_DAYS_PER_MONTH) : 0}
        onDownload={() => {}}
        onShare={handleShare}
      />
    </SubPageLayout>
  );
}