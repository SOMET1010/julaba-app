import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Bell,
  UserPlus,
  MapPin,
  Phone,
  Users,
  Clock,
  Mic,
  MicOff,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Package,
  ShieldAlert,
  ShieldCheck,
  Star,
  Award,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  UserX,
  RefreshCw,
  Loader2,
  Filter,
  Calendar,
  BarChart3,
  Truck,
  Banknote,
  Weight,
  Plus,
  Info,
  Archive,
  Activity,
} from 'lucide-react';
import { useSearchParams } from 'react-router';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useCooperative } from '../../contexts/CooperativeContext';
import { useModalRegister } from '../../contexts/ModalContext';
import { NotificationButton } from '../marchand/NotificationButton';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
// ─── Couleurs coopérative ────────────────────────────────────────────────────
const C = '#2072AF';
const C_LIGHT = '#EBF4FB';
const C_DARK = '#1E5A8E';

// ─── Données Régions CI complètes ────────────────────────────────────────────
const REGIONS_CI: Record<string, string[]> = {
  'Abidjan': ['Abobo', 'Adjamé', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Anyama', 'Songon'],
  'Agnéby-Tiassa': ['Agboville', 'Taabo', 'Sikensi', 'Tiassalé', 'Grand-Morié'],
  'Bafing': ['Touba', 'Koro', 'Ouaninou'],
  'Bagoué': ['Boundiali', 'Gbon', 'Kouto', 'Tengrela', 'Kasséré'],
  'Bélier': ['Didiévi', 'Djékanou', 'Toumodi', 'Tiébissou'],
  'Béré': ['Mankono', 'Kounahiri', 'Zuénoula'],
  'Bounkani': ['Bouna', 'Doropo', 'Nassian', 'Téhini', 'Sandégué'],
  'Cavally': ['Guiglo', 'Bloléquin', 'Taï', 'Zagné'],
  'Folon': ['Minignan', 'Kaniasso', 'Madinani'],
  'Gbèkè': ['Bouaké', 'Béoumi', 'Botro', 'Sakassou', 'M\'Bahiakro'],
  'Gbôklé': ['Sassandra', 'Fresco', 'Guitry'],
  'Gôh': ['Gagnoa', 'Oumé', 'Ouragahio'],
  'Grands-Ponts': ['Dabou', 'Grand-Lahou', 'Jacqueville', 'Toupah'],
  'Guémon': ['Bangolo', 'Kouibly', 'Méagui', 'Facobly'],
  'Hambol': ['Katiola', 'Niakaramandougou', 'Dabakala', 'Fronan'],
  'Haut-Sassandra': ['Daloa', 'Issia', 'Vavoua', 'Zoukougbeu'],
  'Iffou': ['Daoukro', 'M\'Bahiakro', 'Prikro', 'Kouassi-Datékro'],
  'Indénié-Djuablin': ['Abengourou', 'Agnibilékrou', 'Anoumaba', 'Zaranou'],
  'Kabadougou': ['Odienné', 'Gbéléban', 'Samatiguila', 'Séguélon'],
  'La Mé': ['Alépé', 'Yakassé-Attobrou', 'Bonoua'],
  'Lôh-Djiboua': ['Lakota', 'Guitry', 'Divo', 'Hiré'],
  'Marahoué': ['Bouaflé', 'Sinfra', 'Zuenoula', 'Bonon'],
  'Moronou': ['Bongouanou', 'M\'Batto', 'Arrah'],
  'Nawa': ['Soubré', 'Buyo', 'Méagui', 'Grand-Zattry'],
  'N\'Zi': ['Dimbokro', 'Bocanda', 'Kouassi-Kouassikro'],
  'Poro': ['Korhogo', 'Dikodougou', 'Sinématiali', 'M\'Bengué', 'Napiéolédougou'],
  'San-Pédro': ['San-Pédro', 'Tabou', 'Grabo', 'Grand-Béréby'],
  'Sud-Comoé': ['Aboisso', 'Grand-Bassam', 'Adiaké', 'Ayamé'],
  'Tchologo': ['Ferkessédougou', 'Ouangolo', 'Kong', 'Niellé'],
  'Tonkpi': ['Man', 'Biankouma', 'Danané', 'Zouan-Hounien', 'Sipilou'],
  'Worodougou': ['Séguéla', 'Kéably', 'Sifié', 'Massala'],
  'Yamoussoukro': ['Yamoussoukro', 'Attiégouakro', 'Didiévi', 'Kossou'],
  'Zanzan': ['Bondoukou', 'Tanda', 'Sandégué', 'Nassian', 'Koun-Fao'],
};

// ─── Types ───────────────────────────────────────────────────────────────────
type StatutMembre = 'actif' | 'suspendu' | 'en_attente' | 'exclu';
type PeriodType = 'mois' | 'annuel' | 'historique';
type TabType = 'actifs' | 'en_attente';
type DrawerTab = 'performances' | 'transactions' | 'infos';

interface Membre {
  id: string;
  userId?: string;
  nom: string;
  prenom: string;
  telephone: string;
  region: string;
  commune: string;
  zone?: string;
  activite: string;
  /** Statut dans la coopérative (aligné sur API statut_membre) */
  statut: StatutMembre;
  scoreJulaba: number;
  nbTransactions: number;
  txLivraison: number;
  volumeFCFA: { mois: number; annuel: number; historique: number };
  volumeKg: { mois: number; annuel: number; historique: number };
  dateAdhesion: string;
  chefDeGroupe: boolean;
  motifSuspension?: string;
  dateAdhesionCooperative: string;
}

// ─── Composant Mes Points Jùlaba ───────────────────────────────────────────────────
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score === 0 ? '#9CA3AF' : score >= 71 ? '#16A34A' : score >= 41 ? '#EA580C' : '#DC2626';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - filled }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
function mapApiMembreRowToMembre(m: Record<string, unknown>): Membre {
  const statutMembre = String(m.statut_membre ?? 'en_attente').toLowerCase();
  let statut: StatutMembre = 'en_attente';
  if (statutMembre === 'actif') statut = 'actif';
  else if (statutMembre === 'suspendu') statut = 'suspendu';
  else if (statutMembre === 'en_attente') statut = 'en_attente';
  else if (statutMembre === 'exclu' || statutMembre === 'archive' || statutMembre === 'archivé') statut = 'exclu';

  const prenom = String(m.firstName ?? m.prenom ?? '');
  const nom = String(m.lastName ?? m.nom ?? '');
  const roleMembre = String(m.role_membre ?? m.role ?? 'membre').toLowerCase();

  return {
    id: String(m.id ?? ''),
    userId: m.user_id != null ? String(m.user_id) : undefined,
    nom,
    prenom,
    telephone: String(m.phone ?? m.telephone ?? ''),
    region: String(m.region ?? ''),
    commune: String(m.commune ?? ''),
    zone: m.zone != null ? String(m.zone) : undefined,
    activite: String(m.typeActivite ?? m.activite ?? m.activity ?? ''),
    statut,
    scoreJulaba: Number(m.scoreJulaba ?? m.scoreCredit ?? 0) || 0,
    nbTransactions: Number(m.nbTransactions ?? 0) || 0,
    txLivraison: Number(m.txLivraison ?? 0) || 0,
    volumeFCFA: (m.volumeFCFA as Membre['volumeFCFA']) || { mois: 0, annuel: 0, historique: 0 },
    volumeKg: (m.volumeKg as Membre['volumeKg']) || { mois: 0, annuel: 0, historique: 0 },
    dateAdhesion: String(m.dateAdhesion ?? m.date_adhesion ?? new Date().toISOString().split('T')[0]),
    chefDeGroupe: roleMembre === 'president',
    motifSuspension: m.motifSuspension != null ? String(m.motifSuspension) : undefined,
    dateAdhesionCooperative: String(
      m.dateAdhesionCooperative ?? m.date_adhesion ?? m.dateAdhesion ?? new Date().toISOString().split('T')[0],
    ),
  };
}

function BadgeStatut({ statut }: { statut: StatutMembre }) {
  const cfg: Record<StatutMembre, { label: string; bg: string; text: string; Icon: React.ElementType }> = {
    actif: { label: 'Actif', bg: 'bg-green-100', text: 'text-green-700', Icon: CheckCircle },
    suspendu: { label: 'Suspendu', bg: 'bg-red-100', text: 'text-red-700', Icon: ShieldAlert },
    en_attente: { label: 'En attente', bg: 'bg-orange-100', text: 'text-orange-700', Icon: Clock },
    exclu: { label: 'Exclu', bg: 'bg-gray-200', text: 'text-gray-600', Icon: Archive },
  };
  const { label, bg, text, Icon } = cfg[statut];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
type MarchandTrouveAdd = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  role?: string;
};

export function Membres() {
  const { speak } = useApp();
  const { addNotification } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── États généraux ───────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabType>('actifs');
  const periode: PeriodType = 'mois';
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCommune, setFilterCommune] = useState('');
  const [filterPerf, setFilterPerf] = useState<'all' | 'haut' | 'moyen' | 'bas'>('all');
  const [filterStatut, setFilterStatut] = useState<'all' | 'actif' | 'suspendu'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── États modals / drawers ───────────────────────────────────────────────
  const [selectedMembre, setSelectedMembre] = useState<Membre | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('performances');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTelRecherche, setAddTelRecherche] = useState('');
  const [addMarchandTrouve, setAddMarchandTrouve] = useState<MarchandTrouveAdd | null>(null);
  const [addRoleMembre, setAddRoleMembre] = useState('membre');
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addSearchError, setAddSearchError] = useState('');

  // ── États actions ────────────────────────────────────────────────────────
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showExcludeModal, setShowExcludeModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState<Membre | null>(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyTitre, setNotifyTitre] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [motifSuspension, setMotifSuspension] = useState('');
  const [motifExclusion, setMotifExclusion] = useState('');
  const [membres, setMembres] = useState<Membre[]>([]);
  const [membresTotalApi, setMembresTotalApi] = useState<number | null>(null);
  const { refreshMembres, ajouterMembre } = useCooperative();

  const loadMembresFromApi = useCallback(async () => {
    try {
      const data = await apiRequest<{ membres?: unknown[]; total?: number } | null>(API_URL, '/cooperatives/membres', { method: 'GET' });
      if (!data) return;
      const raw = Array.isArray(data.membres) ? data.membres : [];
      const mapped = raw.map(row => mapApiMembreRowToMembre(row as Record<string, unknown>));
      setMembres(mapped);
      if (typeof data.total === 'number') setMembresTotalApi(data.total);
      else {
        setMembresTotalApi(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des membres';
      toast.error(message);
    }
  }, []);

  // ── Charger membres (contexte + liste conforme API enrichie) ───────────
  useEffect(() => {
    void refreshMembres();
    void loadMembresFromApi();
  }, []);

  useEffect(() => {
    if (searchParams.get('openAdd') === '1') {
      setShowAddModal(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('openAdd');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  // ── Synchronisation Bottom Bar ──────────────────────────────────────────
  // Sync ModalContext
  useModalRegister(
    selectedMembre !== null || showAddModal || showSuspendModal ||
    showExcludeModal || showPromoteModal || showNotifyModal !== null
  );

  // ─── Communes dynamiques selon région ───────────────────────────────────
  const communesDisponibles = useMemo(
    () => (filterRegion ? REGIONS_CI[filterRegion] || [] : []),
    [filterRegion]
  );

  // ─── Filtrage + pagination ───────────────────────────────────────────────
  const membresFiltres = useMemo(() => {
    return membres.filter((m) => {
      // Tab
      if (tab === 'actifs' && (m.statut === 'en_attente' || m.statut === 'exclu')) return false;
      if (tab === 'en_attente' && m.statut !== 'en_attente') return false;

      // Recherche
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${m.prenom} ${m.nom}`.toLowerCase().includes(q) &&
            !m.telephone.includes(q) && !m.commune.toLowerCase().includes(q)) return false;
      }

      // Région
      if (filterRegion && m.region !== filterRegion) return false;
      if (filterCommune && m.commune !== filterCommune) return false;

      // Performance
      if (filterPerf === 'haut' && m.scoreJulaba < 71) return false;
      if (filterPerf === 'moyen' && (m.scoreJulaba < 41 || m.scoreJulaba > 70)) return false;
      if (filterPerf === 'bas' && m.scoreJulaba > 40) return false;

      // Statut (uniquement sur tab actifs)
      if (tab === 'actifs' && filterStatut !== 'all' && m.statut !== filterStatut) return false;

      return true;
    });
  }, [membres, tab, searchQuery, filterRegion, filterCommune, filterPerf, filterStatut]);

  const membresArchivesFiltres = useMemo(() => {
    return membres.filter((m) => {
      if (m.statut !== 'exclu') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${m.prenom} ${m.nom}`.toLowerCase().includes(q) &&
            !m.telephone.includes(q) && !m.commune.toLowerCase().includes(q)) return false;
      }
      if (filterRegion && m.region !== filterRegion) return false;
      if (filterCommune && m.commune !== filterCommune) return false;
      if (filterPerf === 'haut' && m.scoreJulaba < 71) return false;
      if (filterPerf === 'moyen' && (m.scoreJulaba < 41 || m.scoreJulaba > 70)) return false;
      if (filterPerf === 'bas' && m.scoreJulaba > 40) return false;
      return true;
    });
  }, [membres, searchQuery, filterRegion, filterCommune, filterPerf]);

  const totalPages = Math.max(1, Math.ceil(membresFiltres.length / PAGE_SIZE));
  const membresPagines = membresFiltres.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const actifs = membres.filter(m => m.statut === 'actif');
    const vKey = periode;
    const totalAffiche =
      membresTotalApi !== null
        ? membresTotalApi
        : membres.filter(m => m.statut === 'actif').length;
    return {
      total: totalAffiche,
      actifs: actifs.length,
      suspendus: membres.filter(m => m.statut === 'suspendu').length,
      enAttente: membres.filter(m => m.statut === 'en_attente').length,
      volumeFCFA: actifs.reduce((s, m) => s + m.volumeFCFA[vKey], 0),
      volumeKg: actifs.reduce((s, m) => s + m.volumeKg[vKey], 0),
    };
  }, [membres, membresTotalApi, periode]);

  // ─── Reconnaissance vocale ───────────────────────────────────────────────
  // STT via Groq Whisper
  const { startRecording: _groqStart_startVoiceSearch, stopRecording: _groqStop_startVoiceSearch } = useVoiceCore({
    onTranscript: (text) => { setSearchQuery(text); setIsListening(false); },
    onError: () => setIsListening(false),
  });

  const startVoiceSearch = () => {
    if (isListening) { _groqStop_startVoiceSearch(); setIsListening(false); }
    else { setIsListening(true); _groqStart_startVoiceSearch(); }
  };

  const voiceLecture = () => {
    const msg = `Vous avez ${kpis.actifs} membres actifs, ${kpis.suspendus} suspendus, et ${kpis.enAttente} en attente de confirmation. Le volume total ce ${periode === 'mois' ? 'mois' : periode === 'annuel' ? 'an' : 'historique'} est de ${(kpis.volumeFCFA / 1000000).toFixed(1)} millions de francs CFA.`;
    speak(msg);
    toast.info('Tata Nanti Lou parle...');
  };

  // ─── Actions membres ─────────────────────────────────────────────────────
  const doSuspend = async () => {
    if (!motifSuspension.trim()) {
      toast.error('Le motif de suspension est obligatoire');
      return;
    }
    const snapshot = membres;
    setMembres(prev => prev.map(m =>
      m.id === selectedMembre?.id ? { ...m, statut: 'suspendu' as StatutMembre, motifSuspension } : m
    ));
    try {
      await apiRequest(API_URL, `/cooperatives/membres/${selectedMembre?.id}/statut`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'suspendu', motif: motifSuspension }),
      });
      toast.success(`${selectedMembre?.prenom} ${selectedMembre?.nom} suspendu(e).`);
    } catch {
      setMembres(snapshot);
      toast.error('Erreur réseau lors de la suspension');
      return;
    }
    speak(`${selectedMembre?.prenom} ${selectedMembre?.nom} a été suspendu. Une notification a été envoyée.`);
    if (selectedMembre?.userId || selectedMembre?.id) {
      addNotification({
        type: 'statut_change',
        titre: 'Accès suspendu',
        message: `Votre accès à la coopérative a été suspendu. ${motifSuspension ? 'Motif : ' + motifSuspension : ''}`,
        priority: 'high',
        category: 'compte',
        icon: 'warning',
      });
    }
    setShowSuspendModal(false);
    setMotifSuspension('');
    setSelectedMembre(null);
  };

  const doReactivate = async (m: Membre) => {
    const snapshot = membres;
    setMembres(prev => prev.map(mb => mb.id === m.id ? { ...mb, statut: 'actif' as StatutMembre, motifSuspension: undefined } : mb));
    try {
      await apiRequest(API_URL, `/cooperatives/membres/${m.id}/statut`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'actif' }),
      });
      toast.success(`${m.prenom} ${m.nom} réactivé(e).`);
    } catch {
      setMembres(snapshot);
      toast.error('Erreur réseau lors de la réactivation');
      return;
    }
    speak(`${m.prenom} ${m.nom} a été réactivé`);
    if (m?.userId || m?.id) {
      addNotification({
        type: 'statut_change',
        titre: 'Accès réactivé',
        message: `Votre accès à la coopérative a été réactivé. Bienvenue !`,
        priority: 'medium',
        category: 'compte',
        icon: 'check',
      });
    }
    setSelectedMembre(null);
  };

  const doExclude = async () => {
    if (!motifExclusion.trim()) {
      toast.error('Le motif d\'exclusion est obligatoire');
      return;
    }
    const snapshot = membres;
    setMembres(prev => prev.map(m =>
      m.id === selectedMembre?.id ? { ...m, statut: 'exclu' as StatutMembre, motifSuspension: motifExclusion } : m
    ));
    try {
      await apiRequest(API_URL, `/cooperatives/membres/${selectedMembre?.id}/statut`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'exclu', motif: motifExclusion }),
      });
      toast.success(`${selectedMembre?.prenom} ${selectedMembre?.nom} exclu(e) définitivement.`);
    } catch {
      setMembres(snapshot);
      toast.error("Erreur réseau lors de l'exclusion");
      return;
    }
    speak(`${selectedMembre?.prenom} a été exclu définitivement de la coopérative`);
    setShowExcludeModal(false);
    setMotifExclusion('');
    setSelectedMembre(null);
  };

  const doPromote = async (m: Membre) => {
    const snapshot = membres;
    setMembres(prev => prev.map(mb => mb.id === m.id ? { ...mb, chefDeGroupe: !mb.chefDeGroupe } : mb));
    const action = m.chefDeGroupe ? 'retiré de' : 'promu chef de';
    try {
      await apiRequest(API_URL, `/cooperatives/membres/${m.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: m.chefDeGroupe ? 'membre' : 'president' }),
      });
      toast.success(`${m.prenom} ${m.nom} ${action} groupe`);
    } catch {
      setMembres(snapshot);
      toast.error('Erreur réseau lors de la mise à jour du rôle');
      return;
    }
    setShowPromoteModal(false);
    setSelectedMembre(null);
  };

  const doAcceptMembre = async (m: Membre) => {
    const snapshot = membres;
    setMembres(prev => prev.map(mb => mb.id === m.id ? { ...mb, statut: 'actif' as StatutMembre } : mb));
    try {
      await apiRequest(API_URL, `/cooperatives/membres/${m.id}/statut`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'actif' }),
      });
      toast.success(`${m.prenom} ${m.nom} accepté(e) dans la coopérative`);
    } catch {
      setMembres(snapshot);
      toast.error("Erreur réseau lors de l'acceptation");
      return;
    }
    speak(`${m.prenom} ${m.nom} a rejoint la coopérative`);
  };

  const doRefuserMembre = async (m: Membre) => {
    const snapshot = membres;
    setMembres(prev => prev.filter(mb => mb.id !== m.id));
    try {
      await apiRequest(API_URL, `/cooperatives/membres/${m.id}`, { method: 'DELETE' });
      toast.info(`Demande de ${m.prenom} ${m.nom} refusée`);
    } catch {
      setMembres(snapshot);
      toast.error('Erreur réseau lors du refus du membre');
      return;
    }
    speak(`La demande de ${m.prenom} ${m.nom} a été refusée`);
  };

  const handleRechercherMarchand = async () => {
    const digits = addTelRecherche.replace(/\D/g, '');
    if (digits.length !== 10) return;
    setAddSearchLoading(true);
    setAddSearchError('');
    setAddMarchandTrouve(null);
    try {
      const phoneFull = `+225${digits}`;
      const data = await apiRequest<any>(API_URL, `/cooperatives/search-marchand?phone=${encodeURIComponent(phoneFull)}`, { method: 'GET' }).catch(() => null);
      if (!data) {
        setAddSearchError('Aucun marchand trouvé avec ce numéro');
        return;
      }
      const found = (data.user || data) as Record<string, unknown>;
      if (!found || String(found.role ?? '').toLowerCase() !== 'marchand') {
        setAddSearchError('Ce numéro ne correspond pas à un marchand Jùlaba');
        return;
      }
      const id = String(found.id ?? '');
      const first_name = String(found.first_name ?? found.firstName ?? found.prenoms ?? '');
      const last_name = String(found.last_name ?? found.lastName ?? found.nom ?? '');
      const phone = String(found.phone ?? found.telephone ?? phoneFull);
      setAddMarchandTrouve({ id, first_name, last_name, phone, role: found.role != null ? String(found.role) : undefined });
    } catch {
      setAddSearchError('Erreur de connexion');
    } finally {
      setAddSearchLoading(false);
    }
  };

  const handleAjouterMarchand = async () => {
    if (!addMarchandTrouve) {
      toast.error('Recherchez un marchand d\'abord');
      return;
    }
    try {
      await ajouterMembre(addMarchandTrouve.id, addRoleMembre);
      toast.success(`${addMarchandTrouve.first_name} ajouté comme membre`);
      setShowAddModal(false);
      setAddTelRecherche('');
      setAddMarchandTrouve(null);
      setAddRoleMembre('membre');
      setAddSearchError('');
      void refreshMembres();
      void loadMembresFromApi();
    } catch {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleNotifyMember = (m: Membre) => {
    setNotifyMessage('');
    setNotifyTitre('');
    setShowNotifyModal(m);
  };

  const handleSendNotification = async () => {
    if (!showNotifyModal || !notifyMessage.trim()) return;
    setNotifySending(true);
    try {
      await apiRequest(API_URL, '/notifications/notify-member', {
        method: 'POST',
        body: JSON.stringify({
          memberId: showNotifyModal.id,
          titre: notifyTitre.trim() || 'Message de votre coopérative',
          message: notifyMessage.trim(),
        }),
      });
      toast.success(`Notification envoyée à ${showNotifyModal.prenom} ${showNotifyModal.nom}`);
      setShowNotifyModal(null);
    } catch {
      toast.error('Erreur lors de l\'envoi. Réessaie.');
    } finally {
      setNotifySending(false);
    }
  };

  // ─── Render carte membre — Style Identificateur ──────────────────────────
  const renderCarte = (m: Membre, index: number) => {
    const scoreColor = m.scoreJulaba >= 71 ? '#16A34A' : m.scoreJulaba >= 41 ? '#EA580C' : '#ef4444';
    const initiales = `${(m.prenom?.[0] || '?')}${(m.nom?.[0] || '?')}`.toUpperCase();
    const besoinKg = Math.max(0, Math.round(m.volumeKg?.mois || 0));
    const commandesMois = Math.max(0, Number(m.nbTransactions || 0));
    const cotisationLabel =
      m.statut === 'suspendu'
        ? 'Suspendu'
        : m.cotisationPayee
          ? 'Actif'
          : 'En retard';
    const cotisationStyle =
      m.statut === 'suspendu'
        ? { background: '#fee2e2', color: '#ef4444' }
        : m.cotisationPayee
          ? { background: '#dcfce7', color: '#166534' }
          : { background: '#fef3c7', color: '#92400e' };

    return (
      <motion.div
        key={m.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: index * 0.03 }}
        className="bg-white overflow-hidden"
        style={{
          borderRadius: 20,
          border: '1.5px solid rgba(32,114,175,0.12)',
          boxShadow: '0 4px 16px rgba(32,114,175,0.08)',
        }}
      >
        <div className="p-4 flex items-start gap-3.5">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: '#2072AF' }}>
            <div className="w-full h-full flex items-center justify-center text-white text-[22px] font-extrabold">
              {initiales}
            </div>
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.28) 45%, transparent 100%)' }}
              animate={{ x: ['-120%', '120%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-extrabold text-[#111] mb-2 truncate">{m.prenom} {m.nom}</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: '#dbeafe', color: '#1e40af' }}>
                {m.activite || 'Spécialité'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: '#f3f4f6', color: '#374151' }}>
                {commandesMois.toString().padStart(2, '0')} commandes
              </span>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: '#fef3c7', color: '#92400E' }}>
                {besoinKg} kg besoin
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <motion.span
              className="px-2 py-1 rounded-full text-[10px] font-bold"
              style={cotisationStyle}
              animate={m.cotisationPayee && m.statut !== 'suspendu' ? { opacity: [1, 0.55, 1] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              {cotisationLabel}
            </motion.span>
            <div className="w-11 h-11 rounded-full flex items-center justify-center border-[2.5px] text-[15px] font-extrabold"
              style={{ borderColor: scoreColor, color: scoreColor }}>
              {m.scoreJulaba}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: '#f0f2f8', margin: '0 18px' }} />

        <div style={{ background: '#f7f9ff', padding: '16px 18px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#2072AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Fiche membre
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cotisation {new Date().toLocaleDateString('fr-FR', { month: 'long' })}</span>
              <span className="px-2 py-1 rounded-full font-bold" style={m.cotisationPayee ? { background: '#dcfce7', color: '#166534' } : { background: '#fee2e2', color: '#ef4444' }}>
                {m.cotisationPayee ? 'Payée' : 'Non payée'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Participations groupées</span>
              <span className="font-bold text-gray-800">{commandesMois} ce mois</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Besoin en cours</span>
              <span className="font-bold" style={{ color: besoinKg > 0 ? '#F59E0B' : '#9ca3af' }}>
                {besoinKg > 0 ? `${besoinKg} kg` : 'Aucun'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: '#f0f2f8', margin: '0 18px' }} />

        <div className="grid grid-cols-2 gap-2.5 p-4 pt-4">
          <motion.button
            onClick={() => { void handleNotifyMember(m); }}
            className="rounded-[14px] py-[15px] text-[13px] font-bold text-white flex items-center justify-center gap-2"
            style={{ background: '#2072AF' }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span animate={{ rotate: [0, 12, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity }}>
              <Bell className="w-4 h-4" />
            </motion.span>
            Notifier
          </motion.button>
          <motion.button
            onClick={() => { setSelectedMembre(m); setDrawerTab('performances'); }}
            className="rounded-[14px] py-[15px] text-[13px] font-bold flex items-center justify-center gap-2 border-2"
            style={{ background: 'white', color: '#2072AF', borderColor: '#2072AF' }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span animate={{ scaleY: [1, 0.2, 1] }} transition={{ duration: 4, repeat: Infinity }}>
              <Eye className="w-4 h-4" />
            </motion.span>
            Voir détails
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // ─── Drawer détail membre ──────────���─────────────────────────────────────
  const renderDrawer = () => {
    if (!selectedMembre) return null;
    const m = selectedMembre;
    const vol = m.volumeFCFA[periode];
    const kg = m.volumeKg[periode];
    const initiales = `${(m.prenom?.[0] || '?')}${(m.nom?.[0] || '?')}`.toUpperCase();
    const perfColor = m.scoreJulaba >= 71 ? '#16A34A' : m.scoreJulaba >= 41 ? '#EA580C' : '#DC2626';

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end"
          onClick={() => setSelectedMembre(null)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-gray-300" />
            </div>

            {/* Header drawer */}
            <div className="px-5 pb-4 border-b border-gray-100 flex items-center gap-4">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-white border-2"
                  style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})`, borderColor: C }}
                >
                  {initiales}
                </div>
                {m.chefDeGroupe && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                    <Crown className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 text-lg">{m.prenom} {m.nom}</h2>
                <p className="text-sm text-gray-500 truncate">{m.activite} - {m.commune}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <BadgeStatut statut={m.statut} />
                  {m.chefDeGroupe && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                      <Crown className="w-2.5 h-2.5" /> Chef de groupe
                    </span>
                  )}
                </div>
              </div>
              <motion.button
                onClick={() => setSelectedMembre(null)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>

            {/* Tabs drawer */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              {([
                { id: 'performances', label: 'Performances', Icon: Activity },
                { id: 'transactions', label: 'Transactions', Icon: BarChart3 },
                { id: 'infos', label: 'Infos', Icon: Info },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setDrawerTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${
                    drawerTab === id ? `border-[${C}] text-[${C}]` : 'border-transparent text-gray-500'
                  }`}
                  style={drawerTab === id ? { borderBottomColor: C, color: C } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Contenu tabs */}
            <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-4">
              {drawerTab === 'performances' && (
                <>
                  {/* Score central */}
                  <div className="flex items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-white rounded-3xl border-2 border-blue-100 p-5">
                    <ScoreRing score={m.scoreJulaba} size={80} />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Mes Points Jùlaba</p>
                      <p className="text-4xl font-bold" style={{ color: perfColor }}>{m.scoreJulaba}<span className="text-base text-gray-400">/100</span></p>
                      <p className="text-xs mt-1 font-semibold" style={{ color: perfColor }}>
                        {m.scoreJulaba >= 71 ? 'Excellente performance' : m.scoreJulaba >= 41 ? 'Performance moyenne' : 'Performance faible'}
                      </p>
                    </div>
                  </div>

                  {/* Indicateurs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-2xl border-2 border-blue-100 p-4 text-center">
                      <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
                      <p className="text-2xl font-bold text-gray-900">{m.nbTransactions}</p>
                      <p className="text-xs text-gray-500">Transactions totales</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl border-2 border-green-100 p-4 text-center">
                      <Truck className="w-6 h-6 text-green-600 mx-auto mb-1.5" />
                      <p className="text-2xl font-bold text-gray-900">{m.txLivraison}%</p>
                      <p className="text-xs text-gray-500">Taux de livraison</p>
                    </div>
                  </div>

                  {/* Volume par période */}
                  <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Volume contribué - Mois en cours</p>
                    <div className="flex items-center gap-3">
                      <Banknote className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Volume FCFA</p>
                        <p className="font-bold text-green-700">{(vol || 0).toLocaleString('fr-FR')} <span className="text-[10px] opacity-60">FCFA</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Weight className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Volume en kg</p>
                        <p className="font-bold text-amber-700">{(kg || 0).toLocaleString('fr-FR')} kg ({(kg / 1000).toFixed(2)} T)</p>
                      </div>
                    </div>
                  </div>

                  {/* Barre de taux de livraison */}
                  <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-gray-600">Taux de livraison</p>
                      <span className="text-xs font-bold" style={{ color: perfColor }}>{m.txLivraison}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: perfColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${m.txLivraison}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Motif suspension si suspendu */}
                  {m.statut === 'suspendu' && m.motifSuspension && (
                    <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        <p className="text-xs font-bold text-red-700">Motif de suspension</p>
                      </div>
                      <p className="text-sm text-red-800">{m.motifSuspension}</p>
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'transactions' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Historique des dernières transactions</p>
                  {m.nbTransactions === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucune transaction pour ce membre</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {m.nbTransactions} transaction(s) enregistrée(s) ce mois.
                      </p>
                      <p className="text-xs text-gray-500">
                        Consulte la page Historique pour le détail des transactions.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'infos' && (
                <div className="space-y-3">
                  {[
                    { Icon: Phone, label: 'Téléphone', value: m.telephone },
                    { Icon: MapPin, label: 'Commune', value: `${m.commune}, ${m.region}` },
                    { Icon: Package, label: 'Activité', value: m.activite },
                    { Icon: Calendar, label: 'Adhésion coopérative', value: new Date(m.dateAdhesionCooperative).toLocaleDateString('fr-FR') },
                    { Icon: Star, label: 'Mes Points Jùlaba', value: `${m.scoreJulaba}/100` },
                  ].map(({ Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 bg-gray-50 rounded-2xl border border-gray-100 p-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: C_LIGHT }}>
                        <Icon className="w-4 h-4" style={{ color: C }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">{label}</p>
                        <p className="text-sm font-bold text-gray-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions en bas du drawer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white space-y-2">
              <motion.button
                type="button"
                onClick={() => setDrawerTab('transactions')}
                className="w-full py-3 rounded-2xl bg-white text-[#2072AF] border-2 border-[#2072AF] font-bold text-sm flex items-center justify-center gap-1.5"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
              >
                <BarChart3 className="w-4 h-4" />
                Transactions
              </motion.button>
              {m.statut === 'actif' && (
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    onClick={() => { setShowSuspendModal(true); }}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-red-50 text-red-700 border-2 border-red-200 text-sm font-bold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <ShieldAlert className="w-4 h-4" /> Suspendre
                  </motion.button>
                  <motion.button
                    onClick={() => setShowPromoteModal(true)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-amber-50 text-amber-700 border-2 border-amber-200 text-sm font-bold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Crown className="w-4 h-4" /> {m.chefDeGroupe ? 'Retirer chef' : 'Promouvoir'}
                  </motion.button>
                </div>
              )}
              {m.statut === 'suspendu' && (
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    onClick={() => void doReactivate(m)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-green-50 text-green-700 border-2 border-green-200 text-sm font-bold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <RefreshCw className="w-4 h-4" /> Réactiver
                  </motion.button>
                  <motion.button
                    onClick={() => setShowExcludeModal(true)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gray-100 text-gray-700 border-2 border-gray-200 text-sm font-bold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <UserX className="w-4 h-4" /> Exclure
                  </motion.button>
                </div>
              )}
              {m.statut === 'en_attente' && (
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    onClick={() => void doAcceptMembre(m)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-green-600 text-white text-sm font-bold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <CheckCircle className="w-4 h-4" /> Accepter
                  </motion.button>
                  <motion.button
                    onClick={() => void doRefuserMembre(m)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-bold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <XCircle className="w-4 h-4" /> Refuser
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const closeAddMarchandModal = () => {
    setShowAddModal(false);
    setAddTelRecherche('');
    setAddMarchandTrouve(null);
    setAddRoleMembre('membre');
    setAddSearchError('');
    setAddSearchLoading(false);
  };

  // ─── Modal Ajouter membre (marchand par téléphone) ─────────────────────────
  const renderAddModal = () => (
    <AnimatePresence>
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end"
          onClick={closeAddMarchandModal}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-gray-300" />
            </div>
            <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Ajouter un marchand</h2>
                <p className="text-xs text-gray-500">Recherche par numéro de téléphone</p>
              </div>
              <motion.button
                type="button"
                onClick={closeAddMarchandModal}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                whileHover={{ rotate: 90 }}
              >
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3 text-sm text-blue-900">
                Seuls les marchands enrôlés sur Jùlaba peuvent rejoindre la coopérative.
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">Numéro de téléphone</label>
                <div className="flex gap-2">
                  <span className="flex h-12 items-center rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-600">
                    +225
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="07 XX XX XX XX"
                    value={addTelRecherche}
                    onChange={(e) => {
                      setAddTelRecherche(e.target.value);
                      setAddSearchError('');
                      setAddMarchandTrouve(null);
                    }}
                    className="min-w-0 flex-1 rounded-2xl border-2 border-gray-200 px-3 py-3 text-sm focus:outline-none"
                    style={{ borderColor: addTelRecherche ? C : undefined }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => void handleRechercherMarchand()}
                    disabled={addSearchLoading || addTelRecherche.replace(/\D/g, '').length !== 10}
                    className="shrink-0 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {addSearchLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Chercher'}
                  </motion.button>
                </div>
              </div>

              {addSearchError ? (
                <p className="text-sm font-semibold text-red-600">{addSearchError}</p>
              ) : null}

              {addMarchandTrouve ? (
                <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-800 mb-1">Marchand trouvé</p>
                  <p className="font-bold text-gray-900">
                    {addMarchandTrouve.first_name} {addMarchandTrouve.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{addMarchandTrouve.phone}</p>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">Rôle dans la coopérative</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'membre', label: 'Membre' },
                    { value: 'tresorier', label: 'Trésorier' },
                    { value: 'secretaire', label: 'Secrétaire' },
                    { value: 'logisticien', label: 'Logisticien' },
                  ] as const).map(({ value, label }) => (
                    <motion.button
                      key={value}
                      type="button"
                      onClick={() => setAddRoleMembre(value)}
                      className={`rounded-2xl border-2 py-3 text-xs font-bold ${
                        addRoleMembre === value ? 'text-white' : 'border-gray-200 bg-white text-gray-600'
                      }`}
                      style={
                        addRoleMembre === value
                          ? { borderColor: C, background: `linear-gradient(135deg, ${C}, ${C_DARK})` }
                          : {}
                      }
                      whileTap={{ scale: 0.98 }}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <motion.button
                type="button"
                onClick={() => void handleAjouterMarchand()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
              >
                <UserPlus className="h-4 w-4" />
                Ajouter ce marchand
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── Modal Suspendre ──────────────────────────────────────────────────────
  const renderSuspendModal = () => (
    <AnimatePresence>
      {showSuspendModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Suspendre le membre</h3>
                <p className="text-xs text-gray-500">{selectedMembre?.prenom} {selectedMembre?.nom}</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">Les transactions de ce membre via la coopérative seront bloquées. Une notification sera envoyée.</p>
            </div>

            <label className="text-xs font-bold text-gray-700 block mb-2">
              Motif de suspension <span className="text-red-500">*</span>
            </label>
            <div className="mb-2">
              {['Non-respect des délais', 'Litige financier', 'Fraude documentaire', 'Comportement inapproprié'].map((m) => (
                <motion.button
                  key={m}
                  onClick={() => setMotifSuspension(m)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-xl mb-1 border ${motifSuspension === m ? 'border-red-400 bg-red-50 text-red-700 font-bold' : 'border-gray-200 text-gray-600'}`}
                  whileTap={{ scale: 0.98 }}
                >
                  {m}
                </motion.button>
              ))}
            </div>
            <textarea
              placeholder="Ou précisez un motif personnalisé..."
              value={motifSuspension.includes('\n') || !['Non-respect des délais', 'Litige financier', 'Fraude documentaire', 'Comportement inapproprié'].includes(motifSuspension) ? motifSuspension : ''}
              onChange={(e) => setMotifSuspension(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-red-400 focus:outline-none text-sm resize-none"
              rows={3}
            />

            <div className="flex gap-2 mt-4">
              <motion.button
                onClick={() => { setShowSuspendModal(false); setMotifSuspension(''); }}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Annuler
              </motion.button>
              <motion.button
                onClick={() => void doSuspend()}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Confirmer
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── Modal Exclure ────────────────────────────────────────────────────────
  const renderExcludeModal = () => (
    <AnimatePresence>
      {showExcludeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <UserX className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Exclusion définitive</h3>
                <p className="text-xs text-gray-500">{selectedMembre?.prenom} {selectedMembre?.nom}</p>
              </div>
            </div>

            <div className="bg-gray-100 border border-gray-300 rounded-2xl p-3 mb-4">
              <p className="text-xs text-gray-700">Ce membre sera archivé et ne pourra plus effectuer de transactions avec la coopérative. Cette action est irréversible.</p>
            </div>

            <label className="text-xs font-bold text-gray-700 block mb-2">Motif d'exclusion <span className="text-red-500">*</span></label>
            <textarea
              placeholder="Motif obligatoire d'exclusion définitive..."
              value={motifExclusion}
              onChange={(e) => setMotifExclusion(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none text-sm resize-none mb-4"
              rows={3}
            />

            <div className="flex gap-2">
              <motion.button
                onClick={() => { setShowExcludeModal(false); setMotifExclusion(''); }}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Annuler
              </motion.button>
              <motion.button
                onClick={() => void doExclude()}
                className="flex-1 py-3 rounded-2xl bg-gray-700 text-white font-bold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Exclure définitivement
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── Modal Promouvoir ─────────────────────────────────────────────────────
  const renderPromoteModal = () => (
    <AnimatePresence>
      {showPromoteModal && selectedMembre && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{selectedMembre.chefDeGroupe ? 'Retirer le rôle de chef' : 'Promouvoir chef de groupe'}</h3>
                <p className="text-xs text-gray-500">{selectedMembre.prenom} {selectedMembre.nom}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {selectedMembre.chefDeGroupe
                ? `${selectedMembre.prenom} perdra son badge "Chef de groupe".`
                : `${selectedMembre.prenom} recevra un badge "Chef de groupe" visible par tous les membres.`
              }
            </p>
            <div className="flex gap-2">
              <motion.button
                onClick={() => setShowPromoteModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                Annuler
              </motion.button>
              <motion.button
                onClick={() => void doPromote(selectedMembre)}
                className="flex-1 py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm"
                whileTap={{ scale: 0.97 }}
              >
                {selectedMembre.chefDeGroupe ? 'Retirer' : 'Promouvoir'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── RENDU PRINCIPAL — Style Identificateur ──────────────────────────────
  return (
    <>
    <SubPageLayout
      role="cooperateur"
      title="Gestion de Membres"
      rightContent={<NotificationButton />}
    >
      <div className="pb-32 lg:pb-8 max-w-2xl lg:max-w-7xl mx-auto min-h-screen">
        <KPIGrid cols={2} className="mb-3">
          <UniversalKPI
            label="Actifs"
            animatedTarget={kpis.actifs}
            icon={CheckCircle}
            color="#16a34a"
            bgColor="rgba(240,253,244,0.9)"
            borderColor="rgba(34,197,94,0.35)"
            iconAnimation="bounce"
            active={tab === 'actifs' && filterStatut === 'actif'}
            onClick={() => { setFilterStatut('actif'); setTab('actifs'); setPage(1); }}
          />
          <UniversalKPI
            label="En attente"
            animatedTarget={kpis.enAttente}
            icon={Clock}
            color="#ea580c"
            bgColor="rgba(255,247,237,0.9)"
            borderColor="rgba(249,115,22,0.35)"
            iconAnimation="pulse"
            active={tab === 'en_attente'}
            onClick={() => { setTab('en_attente'); setFilterStatut('all'); setPage(1); }}
          />
          <UniversalKPI
            label="Suspendus"
            animatedTarget={kpis.suspendus}
            icon={ShieldAlert}
            color="#dc2626"
            bgColor="rgba(254,242,242,0.9)"
            borderColor="rgba(239,68,68,0.35)"
            iconAnimation="pulse"
            active={tab === 'actifs' && filterStatut === 'suspendu'}
            onClick={() => { setFilterStatut('suspendu'); setTab('actifs'); setPage(1); }}
          />
          <UniversalKPI
            label="Total"
            animatedTarget={membres.length}
            icon={Users}
            color="#2072AF"
            bgColor="rgba(239,246,255,0.9)"
            borderColor="rgba(59,130,246,0.35)"
            iconAnimation="float"
            active={tab === 'actifs' && filterStatut === 'all'}
            onClick={() => { setFilterStatut('all'); setTab('actifs'); setPage(1); }}
          />
        </KPIGrid>

        {/* Pills filtre liste */}
        <motion.div className="mb-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            <div className="grid grid-cols-4 gap-2">
              <motion.button
                type="button"
                onClick={() => { setFilterStatut('all'); setTab('actifs'); setPage(1); }}
                className={`relative flex items-center justify-center px-2 py-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all ${
                  tab === 'actifs' && filterStatut === 'all'
                    ? 'bg-gradient-to-r from-[#2072AF] to-[#1E5A8E] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                Tous
              </motion.button>
              <motion.button
                type="button"
                onClick={() => { setFilterStatut('actif'); setTab('actifs'); setPage(1); }}
                className={`relative flex items-center justify-center px-2 py-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all ${
                  tab === 'actifs' && filterStatut === 'actif'
                    ? 'bg-gradient-to-r from-[#2072AF] to-[#1E5A8E] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                Actifs
              </motion.button>
              <motion.button
                type="button"
                onClick={() => { setTab('en_attente'); setFilterStatut('all'); setPage(1); }}
                className={`relative flex items-center justify-center px-2 py-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all ${
                  tab === 'en_attente'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                En attente
              </motion.button>
              <motion.button
                type="button"
                onClick={() => { setFilterStatut('suspendu'); setTab('actifs'); setPage(1); }}
                className={`relative flex items-center justify-center px-2 py-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all ${
                  tab === 'actifs' && filterStatut === 'suspendu'
                    ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                Suspendus
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Barre de recherche + filtres */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Rechercher par nom, commune, téléphone..."
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-20 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:outline-none text-base placeholder:text-gray-400 shadow-sm"
              style={{ borderColor: searchQuery ? C : undefined }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <motion.button onClick={startVoiceSearch} className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isListening ? C_LIGHT : undefined }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              >
                {isListening ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}><MicOff className="w-5 h-5" style={{ color: C }} /></motion.div> : <Mic className="w-5 h-5 text-gray-400" />}
              </motion.button>
              <motion.button onClick={() => setShowFilters(!showFilters)}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${showFilters ? '' : 'border-gray-200 bg-white'}`}
                style={showFilters ? { backgroundColor: C_LIGHT, borderColor: C } : {}} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              >
                <Filter className="w-4 h-4" style={showFilters ? { color: C } : { color: '#9CA3AF' }} />
              </motion.button>
            </div>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-3 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1.5">Région</label>
                    <select value={filterRegion} onChange={(e) => { setFilterRegion(e.target.value); setFilterCommune(''); setPage(1); }}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none bg-white" style={{ borderColor: filterRegion ? C : undefined }}
                    >
                      <option value="">Toutes les régions</option>
                      {Object.keys(REGIONS_CI).sort().map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1.5">Commune</label>
                    <select value={filterCommune} onChange={(e) => { setFilterCommune(e.target.value); setPage(1); }} disabled={!filterRegion}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none bg-white disabled:opacity-50" style={{ borderColor: filterCommune ? C : undefined }}
                    >
                      <option value="">{filterRegion ? 'Toutes les communes' : 'Choisir une région d\'abord'}</option>
                      {communesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1.5">Performance (Mes Points Jùlaba)</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([{ id: 'all', label: 'Tous' }, { id: 'haut', label: '71-100', color: 'text-green-700 bg-green-50 border-green-200' }, { id: 'moyen', label: '41-70', color: 'text-orange-700 bg-orange-50 border-orange-200' }, { id: 'bas', label: '0-40', color: 'text-red-700 bg-red-50 border-red-200' }] as const).map(({ id, label, color }) => (
                        <motion.button key={id} onClick={() => { setFilterPerf(id); setPage(1); }}
                          className={`py-2 rounded-xl border-2 text-xs font-bold text-center ${filterPerf === id ? (id === 'all' ? 'text-white border-transparent' : (color || '')) : 'border-gray-200 text-gray-500'}`}
                          style={filterPerf === id && id === 'all' ? { background: `linear-gradient(135deg, ${C}, ${C_DARK})` } : {}} whileTap={{ scale: 0.95 }}
                        >{label}</motion.button>
                      ))}
                    </div>
                  </div>
                  {tab === 'actifs' && (
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1.5">Statut</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([{ id: 'all', label: 'Tous' }, { id: 'actif', label: 'Actifs' }, { id: 'suspendu', label: 'Suspendus' }] as const).map(({ id, label }) => (
                          <motion.button key={id} onClick={() => { setFilterStatut(id); setPage(1); }}
                            className={`py-2 rounded-xl border-2 text-xs font-bold ${filterStatut === id ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'}`}
                            style={filterStatut === id ? { background: `linear-gradient(135deg, ${C}, ${C_DARK})` } : {}} whileTap={{ scale: 0.95 }}
                          >{label}</motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  <motion.button onClick={() => { setFilterRegion(''); setFilterCommune(''); setFilterPerf('all'); setFilterStatut('all'); setTab('actifs'); setPage(1); }}
                    className="w-full py-2 rounded-xl border border-gray-200 text-xs text-gray-500 font-semibold" whileTap={{ scale: 0.97 }}
                  >Réinitialiser les filtres</motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sections groupées — style Identificateur */}
        {(() => {
          const groupes = [
            { items: membresPagines.filter(m => m.statut === 'actif'), label: 'Actifs', Icon: CheckCircle, iconColor: '#16A34A' },
            { items: membresPagines.filter(m => m.statut === 'en_attente'), label: 'En attente', Icon: Clock, iconColor: '#EA580C' },
            { items: membresPagines.filter(m => m.statut === 'suspendu'), label: 'Suspendus', Icon: ShieldAlert, iconColor: '#DC2626' },
          ].filter(g => g.items.length > 0);
          if (membresPagines.length === 0) return (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Users className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-semibold">Aucun membre trouvé</p>
              <p className="text-xs text-gray-400 mt-1">Modifiez vos filtres</p>
            </motion.div>
          );
          return (
            <div className="space-y-6">
              {groupes.map(({ items, label, Icon, iconColor }) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Icon className="w-5 h-5" style={{ color: iconColor }} />
                    <h2 className="font-bold text-gray-900 text-lg">{label}</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${iconColor}20`, color: iconColor }}>{items.length}</span>
                  </div>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">{items.map((m, i) => renderCarte(m, i))}</AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <motion.div
            className="flex items-center justify-center gap-3 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-200 bg-white disabled:opacity-40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </motion.button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5) {
                if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
              }
              return (
                <motion.button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    page === p ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                  style={page === p ? { background: `linear-gradient(135deg, ${C}, ${C_DARK})` } : {}}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {p}
                </motion.button>
              );
            })}

            <motion.button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-200 bg-white disabled:opacity-40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </motion.button>
          </motion.div>
        )}

        {membresArchivesFiltres.length > 0 && (
          <motion.div
            className="mt-8 border-t border-gray-200 pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              type="button"
              onClick={() => setShowArchives((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
            >
              <span className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-gray-500" />
                <span className="font-bold text-gray-800">Archivés</span>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
                  {membresArchivesFiltres.length}
                </span>
              </span>
              {showArchives ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            <AnimatePresence initial={false}>
              {showArchives && (
                <motion.div
                  key="archives-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3">
                    {membresArchivesFiltres.map((m, i) => (
                      <div key={m.id} className="opacity-75 saturate-50">
                        {renderCarte(m, i)}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </SubPageLayout>

      <motion.button
        type="button"
        aria-label="Ajouter un membre"
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 z-[120] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg lg:bottom-8"
        style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </motion.button>

      {/* Drawers & Modals */}
      {selectedMembre && !showSuspendModal && !showExcludeModal && !showPromoteModal && renderDrawer()}
      {renderAddModal()}
      {renderSuspendModal()}
      {renderExcludeModal()}
      {renderPromoteModal()}

      {/* ── MODAL NOTIFIER MEMBRE ── */}
      <AnimatePresence>
        {showNotifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowNotifyModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Notifier {showNotifyModal.prenom}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>La notification arrivera dans son app</div>
                </div>
                <button type="button" onClick={() => setShowNotifyModal(null)} style={{ background: '#f2f2f2', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Titre (optionnel)</div>
                <input
                  value={notifyTitre}
                  onChange={e => setNotifyTitre(e.target.value)}
                  placeholder="Message de votre coopérative"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Message <span style={{ color: '#ef4444' }}>*</span></div>
                <textarea
                  value={notifyMessage}
                  onChange={e => setNotifyMessage(e.target.value)}
                  placeholder={`Bonjour ${showNotifyModal.prenom}, ...`}
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 15, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => void handleSendNotification()}
                disabled={!notifyMessage.trim() || notifySending}
                style={{ width: '100%', padding: '15px', borderRadius: 14, background: notifyMessage.trim() ? '#2072AF' : '#ccc', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: notifyMessage.trim() ? 'pointer' : 'not-allowed' }}
              >
                {notifySending ? 'Envoi...' : `Envoyer à ${showNotifyModal.prenom}`}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
