import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Plus, Edit2, Eye, Trash2, Users, Star, Clock,
  CheckCircle2, Play, Award, BarChart3, TrendingUp, Save,
  ChevronDown, ChevronUp, X, Video, FileText, Mic,
  Archive, HelpCircle, CheckCircle, XCircle, ToggleLeft, ToggleRight,
  Target, Layers, Filter, Search, Zap, Shield, GraduationCap,
  Hash, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { BOProgressBar } from './BOProgressBar';
import { toast } from 'sonner';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { UserRole } from '../academy/types';
import { ImagePickerField } from '../shared/ImagePickerField';
import { API_URL } from '../../utils/api';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────
type ActiveTab = 'dashboard' | 'modules' | 'questions';

interface AcademyQuestion {
  id: string;
  role: string;
  chapter: number;
  lesson: number;
  question: string;
  options: { text: string; icon: string }[];
  correctIndex: number;
  explanation?: string;
  active?: boolean;
  actif?: boolean;
  moduleId?: string | null;
  module_id?: string | null;
}


const STATUT_CONFIG = {
  publie: { label: 'Publié', bg: 'bg-green-50', text: 'text-green-700', dot: '#10B981' },
  brouillon: { label: 'Brouillon', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: '#F59E0B' },
  archive: { label: 'Archive', bg: 'bg-gray-50', text: 'text-gray-500', dot: '#9CA3AF' },
} as const;

const TYPE_CONFIG = {
  video: { label: 'Vidéo', icon: Video, color: '#3B82F6' },
  audio: { label: 'Audio', icon: Mic, color: '#8B5CF6' },
  quiz: { label: 'Quiz', icon: HelpCircle, color: '#F59E0B' },
  texte: { label: 'Texte', icon: FileText, color: '#10B981' },
} as const;

const NIVEAU_CONFIG = {
  debutant: { label: 'Débutant', color: '#10B981' },
  intermediaire: { label: 'Intermédiaire', color: '#F59E0B' },
  avance: { label: 'Avance', color: '#EF4444' },
} as const;

type ModuleType = 'video' | 'audio' | 'quiz' | 'texte';
type NiveauType = 'debutant' | 'intermediaire' | 'avance';
type ProfilType = 'marchand' | 'producteur' | 'cooperative' | 'identificateur' | 'tous';

interface AcademyModule {
  id: string;
  titre: string;
  description: string;
  type: ModuleType;
  niveau: NiveauType;
  profil: ProfilType;
  duree: number;
  points: number;
  statut: 'publie' | 'brouillon' | 'archive';
  nbInscrits: number;
  tauxCompletion: number;
  dateCreation: string;
  image: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// ROLES TERRAIN
// ──────────────────────────────────────────────────────────────────────────────
const ROLES: UserRole[] = ['marchand', 'producteur', 'cooperative', 'identificateur', 'institution'];
const ROLE_LABELS: Record<UserRole, string> = {
  marchand: 'Marchand', producteur: 'Producteur', cooperative: 'Coopérative',
  identificateur: 'Identificateur', institution: 'Institution',
};
const ROLE_COLORS: Record<UserRole, string> = {
  marchand: '#C66A2C', producteur: '#2E8B57', cooperative: '#2072AF',
  identificateur: '#9F8170', institution: '#712864',
};
const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  marchand: Zap, producteur: Target, cooperative: Users,
  identificateur: Shield, institution: GraduationCap,
};

// ──────────────────────────────────────────────────────────────────────────────
// MOCK MODULES PRE-REMPLIS
// ──────────────────────────────────────────────────────────────────────────────
// INITIAL_MODULES supprimé — données depuis API
// ──────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

const CHAPTER_THEMES: Record<string, {ch1:string;ch2:string;ch3:string;icons:[string,string,string]}> = {
  marchand:       {ch1:'Mes Ventes',    ch2:'Marchandise',     ch3:'Keiwa',         icons:['ShoppingBag','Package','Wallet']},
  producteur:     {ch1:'Ma Culture',    ch2:'Ma Recolte',      ch3:'Mon Marché',     icons:['Leaf','Sprout','Store']},
  cooperative:    {ch1:'Mes Membres',   ch2:'Mes Commandes',   ch3:'Ma Gestion',     icons:['Users','Layers','BarChart2']},
  identificateur: {ch1:'Mon Terrain',   ch2:'Mes Dossiers',    ch3:'Ma Validation',  icons:['MapPin','FileText','CheckCircle']},
  institution:    {ch1:'Mes Donnees',   ch2:'Mes Rapports',    ch3:'Ma Strategie',   icons:['Database','BarChart2','Target']},
};


const boApi = async (path: string, method = 'GET', body?: any) => {
  const r = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);
  return data;
};

export function BOAcademy() {
  const { hasPermission, addAuditLog, boUser } = useBackOffice();
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [availableModules, setAvailableModules] = useState<Array<{ id: string; titre: string; profil: string }>>([]);
  const [academyStats, setAcademyStats] = React.useState<any>(null);

  React.useEffect(() => {
    const h = { };
    fetch(`${API_URL}/academy/modules`, { headers: h })
      .then(r => r.json())
      .then(d => setModules((d.modules || []).map((m: any) => ({
        ...m,
        nbInscrits: m.nbInscrits || m.nb_inscrits || 0,
        tauxCompletion: m.tauxCompletion || m.taux_completion || 0,
        dateCreation: m.dateCreation || m.created_at || '',
      }))))
      .catch(() => {});
    fetch(`${API_URL}/academy/stats`, { headers: h })
      .then(r => r.json())
      .then(setAcademyStats)
      .catch(() => {});
  }, []);
  React.useEffect(() => {
    fetch(`${API_URL}/academy/modules`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const list = Array.isArray(data) ? data : (data.modules || data.data || []);
        setAvailableModules(list.map((m: any) => ({ id: m.id, titre: m.titre, profil: m.profil || 'tous' })));
      })
      .catch(() => {});
  }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterProfil, setFilterProfil] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ titre: '', description: '', type: 'video' as ModuleType, niveau: 'debutant' as NiveauType, profil: 'tous' as ProfilType, duree: 10, points: 50, image: '' });

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Questions du Jeu
  const [qRole, setQRole] = useState<UserRole>('marchand');
  const [qChapter, setQChapter] = useState<number>(1);
  const [editingQ, setEditingQ] = useState<AcademyQuestion | null>(null);
  const [showQEditor, setShowQEditor] = useState(false);
  const [qForm, setQForm] = useState<Partial<AcademyQuestion>>({});
  const [qSearch, setQSearch] = useState('');
  const [showPreview, setShowPreview] = useState<AcademyQuestion | null>(null);

  const canWrite = hasPermission('academy.write');

  // Cache questions
  const [questionsCache, setQuestionsCache] = useState<Record<string, AcademyQuestion[]>>({});
  const fetchQuestions = async (role: UserRole, ch: number) => {
    const key = `${role}-${ch}`;
    if (questionsCache[key]) return;
    try {
      const r = await fetch(`${API_URL}/academy/questions?role=${role}&chapter=${ch}`, { credentials: 'include', headers: { } });
      const d = await r.json();
      const qs = (d.questions || []).map((q: any) => ({
        ...q,
        correctIndex: q.correctIndex ?? q.correct_index ?? 0,
        active: q.actif ?? q.active ?? true,
        options: (q.options || []).map((o: any) => typeof o === 'string' ? { text: o, icon: 'circle' } : o),
      }));
      setQuestionsCache(prev => ({ ...prev, [key]: qs }));
    } catch (e) { void e; }
  };
  const getQuestions = (role: UserRole, ch: number) => {
    const key = `${role}-${ch}`;
    if (!questionsCache[key]) { fetchQuestions(role, ch); return []; }
    return questionsCache[key];
  };

  const currentQuestions = getQuestions(qRole, qChapter);
  const filteredQuestions = qSearch
    ? currentQuestions.filter(q => q.question.toLowerCase().includes(qSearch.toLowerCase()))
    : currentQuestions;

  const chTheme = CHAPTER_THEMES[qRole];
  const chapterNames = [chTheme.ch1, chTheme.ch2, chTheme.ch3];

  // Stats par role
  const roleStats = useMemo(() => {
    return ROLES.map(role => {
      const allQ = [1,2,3].flatMap(ch => questionsCache[`${role}-${ch}`] || []);
      const active = allQ.filter(q => q.active ?? q.actif ?? true).length;
      const total = allQ.length || 75;
      const byChapter = [1,2,3].map(ch => (questionsCache[`${role}-${ch}`] || []).length || 25);
      return { role, active, total, byChapter };
    });
  }, [questionsCache]);

  // Module stats
  const totalInscrits = academyStats?.totalInscrits ?? modules.reduce((acc, m) => acc + (m.nbInscrits || 0), 0);
  const tauxMoyen = useMemo(() => {
    const publies = modules.filter(m => m.statut === 'publie');
    const total = publies.reduce((acc, m) => acc + m.tauxCompletion, 0);
    return publies.length ? Math.round(total / publies.length) : 0;
  }, [modules]);
  const nbPublies = academyStats?.publies ?? modules.filter(m => m.statut === 'publie').length;
  const nbBrouillons = academyStats?.brouillons ?? modules.filter(m => m.statut === 'brouillon').length;
  const totalQuestions = academyStats?.totalQuestions ?? roleStats.reduce((acc, r) => acc + r.total, 0);
  const activeQuestions = academyStats?.activeQuestions ?? roleStats.reduce((acc, r) => acc + r.active, 0);

  // Stats par profil pour modules
  const modulesByProfil = useMemo(() => {
    const map: Record<string, { count: number; inscrits: number }> = {};
    modules.filter(m => m.statut === 'publie').forEach(m => {
      const p = m.profil;
      if (!map[p]) map[p] = { count: 0, inscrits: 0 };
      map[p].count++;
      map[p].inscrits += m.nbInscrits;
    });
    return map;
  }, [modules]);

  // Handlers questions
  const handleToggleQuestion = async (q: AcademyQuestion) => {
    try {
      await boApi(`/academy/questions/${q.id}`, 'PATCH', { actif: !q.active });
      const key = `${qRole}-${qChapter}`;
      setQuestionsCache(prev => ({
        ...prev,
        [key]: (prev[key] || []).map(item => item.id === q.id ? { ...item, active: !item.active, actif: !item.active } : item),
      }));
      toast.success(q.active ? 'Question désactivée' : 'Question activée');
    } catch { toast.error('Erreur toggle question'); }
  };

  const handleDeleteQuestion = async (q: AcademyQuestion) => {
    try {
      await boApi(`/academy/questions/${q.id}`, 'DELETE');
      const key = `${qRole}-${qChapter}`;
      setQuestionsCache(prev => ({
        ...prev,
        [key]: (prev[key] || []).filter(item => item.id !== q.id),
      }));
      toast.error('Question supprimée');
    } catch { toast.error('Erreur suppression question'); }
  };

  const openQEditor = (q?: AcademyQuestion) => {
    if (q) {
      setEditingQ(q);
      setQForm({ ...q });
    } else {
      setEditingQ(null);
      setQForm({
        id: `q-${Date.now()}`, role: qRole, chapter: qChapter, lesson: 1,
        question: '', correctIndex: 0, explanation: '', active: true,
        moduleId: null,
        options: [
          { text: '', icon: 'CheckCircle' }, { text: '', icon: 'XCircle' },
          { text: '', icon: 'Minus' }, { text: '', icon: 'AlertCircle' },
        ],
      });
    }
    setShowQEditor(true);
  };

  const handleSaveQuestion = async () => {
    if (!qForm.question || !qForm.options || qForm.options.some(o => !o.text)) {
      toast.error('Remplis tous les champs');
      return;
    }
    const key = `${qRole}-${qChapter}`;
    try {
      if (editingQ) {
        const saved = await boApi(`/academy/questions/${editingQ.id}`, 'PATCH', {
          ...qForm,
          module_id: qForm.moduleId || qForm.module_id || null,
        });
        setQuestionsCache(prev => ({
          ...prev,
          [key]: (prev[key] || []).map(item => item.id === editingQ.id ? { ...item, ...saved } : item),
        }));
        toast.success('Question modifiée');
      } else {
        const saved = await boApi('/academy/questions', 'POST', {
          ...qForm,
          role: qRole,
          chapter: qChapter,
          module_id: qForm.moduleId || qForm.module_id || null,
        });
        setQuestionsCache(prev => ({ ...prev, [key]: [...(prev[key] || []), saved] }));
        toast.success('Question ajoutée');
      }
      setShowQEditor(false);
    } catch { toast.error('Erreur lors de la sauvegarde de la question'); return; }
    if (boUser) addAuditLog({ action: editingQ ? 'MODIFICATION question Academy' : 'AJOUT question Academy', utilisateurBO: `${boUser.prenom} ${boUser.nom}`, roleBO: boUser.role, acteurImpacte: qForm.question || '', ancienneValeur: '--', nouvelleValeur: qRole, ip: '127.0.0.1', module: 'Academy' });
  };

  // Handlers modules
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await boApi('/academy/modules', 'POST', { ...form, statut: 'brouillon' });
      setModules(prev => [{ ...saved, nbInscrits: 0, tauxCompletion: 0, dateCreation: saved.created_at || new Date().toISOString() }, ...prev]);
      if (boUser) addAuditLog({ action: 'CREATION module Academy', utilisateurBO: `${boUser.prenom} ${boUser.nom}`, roleBO: boUser.role, acteurImpacte: form.titre, ancienneValeur: '--', nouvelleValeur: 'brouillon', ip: '127.0.0.1', module: 'Academy' });
      toast.success(`Module "${form.titre}" créé en brouillon`);
      setShowCreate(false);
      setForm({ titre: '', description: '', type: 'video', niveau: 'debutant', profil: 'tous', duree: 10, points: 50, image: '' });
    } catch { toast.error('Erreur création module'); }
  };

  const handlePublier = async (id: string) => {
    try {
      await boApi(`/academy/modules/${id}`, 'PATCH', { statut: 'publie' });
      setModules(prev => prev.map(m => m.id === id ? { ...m, statut: 'publie' } : m));
      toast.success('Module publié');
    } catch { toast.error('Erreur publication'); }
  };

  const handleArchiver = async (id: string) => {
    try {
      await boApi(`/academy/modules/${id}`, 'PATCH', { statut: 'archive' });
      setModules(prev => prev.map(m => m.id === id ? { ...m, statut: 'archive' } : m));
      toast.warning('Module archivé');
    } catch { toast.error('Erreur archivage'); }
  };

  const handleSupprimer = async (id: string) => {
    try {
      await boApi(`/academy/modules/${id}`, 'DELETE');
      setModules(prev => prev.filter(m => m.id !== id));
      toast.error('Module supprimé');
    } catch { toast.error('Erreur suppression'); }
  };

  const filtered = useMemo(() => {
    return modules.filter(m => {
      if (filterStatut !== 'all' && m.statut !== filterStatut) return false;
      if (filterProfil !== 'all' && m.profil !== filterProfil) return false;
      if (searchQuery && !m.titre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [modules, filterStatut, filterProfil, searchQuery]);

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${BO_PRIMARY}15` }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <GraduationCap className="w-6 h-6" style={{ color: BO_PRIMARY }} />
          </motion.div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Julaba Academy</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestion des modules et questions par role</p>
          </div>
        </div>
        {canWrite && activeTab === 'modules' && (
          <motion.button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold shadow-lg"
            style={{ backgroundColor: BO_PRIMARY }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouveau module</span>
          </motion.button>
        )}
        {canWrite && activeTab === 'questions' && (
          <motion.button onClick={() => openQEditor()}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold shadow-lg"
            style={{ backgroundColor: ROLE_COLORS[qRole] }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouvelle question</span>
          </motion.button>
        )}
      </motion.div>

      {/* ── Onglets principaux ── */}
      <div className="flex gap-1.5 mb-6 bg-gray-100 p-1.5 rounded-2xl overflow-x-auto">
        {([
          ['dashboard', 'Vue d\'ensemble', BarChart3],
          ['modules', 'Modules', BookOpen],
          ['questions', 'Questions par Role', HelpCircle],
        ] as const).map(([tab, label, Icon]) => (
          <motion.button key={tab} onClick={() => setActiveTab(tab as ActiveTab)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all"
            style={{
              backgroundColor: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? BO_DARK : '#6B7280',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
            }}
            whileHover={activeTab !== tab ? { y: -1 } : {}} whileTap={{ scale: 0.97 }}>
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB : DASHBOARD VUE D'ENSEMBLE                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* KPIs globaux */}
          <KPIGrid>
            <UniversalKPI label="Modules publies" animatedTarget={nbPublies} icon={BookOpen} color={BO_PRIMARY} iconAnimation="float" delay={0} />
            <UniversalKPI label="Apprenants total" animatedTarget={totalInscrits} icon={Users} color="#3B82F6" iconAnimation="bounce" delay={0.06} />
            <UniversalKPI label="Taux moyen" value={`${tauxMoyen}`} suffix="%" icon={TrendingUp} color="#10B981" iconAnimation="float" delay={0.12} />
            <UniversalKPI label="Questions actives" animatedTarget={activeQuestions} suffix={`/${totalQuestions}`} icon={HelpCircle} color="#F59E0B" iconAnimation="spin" delay={0.18} />
          </KPIGrid>

          {/* Repartition par Role — Grille de cartes */}
          <h2 className="font-black text-gray-900 text-lg mb-4 mt-2 flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: BO_PRIMARY }} />
            Questions par Role (5 profils terrain)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {roleStats.map((rs, i) => {
              const RIcon = ROLE_ICONS[rs.role];
              const color = ROLE_COLORS[rs.role];
              return (
                <motion.div
                  key={rs.role}
                  className="bg-white rounded-3xl border-2 p-5 shadow-sm relative overflow-hidden cursor-pointer"
                  style={{ borderColor: `${color}30` }}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.25) }}
                  whileHover={{ y: -4, boxShadow: `0 8px 24px ${color}20` }}
                  onClick={() => { setActiveTab('questions'); setQRole(rs.role); setQChapter(1); }}
                >
                  {/* Fond gradient subtil */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{ background: `linear-gradient(135deg, ${color}, transparent)` }} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: `${color}15` }}
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                        >
                          <RIcon className="w-5 h-5" style={{ color }} />
                        </motion.div>
                        <div>
                          <p className="font-black text-gray-900">{ROLE_LABELS[rs.role]}</p>
                          <p className="text-xs text-gray-500">{rs.active} actives / {rs.total} total</p>
                        </div>
                      </div>
                      <motion.div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${color}10` }}
                        whileHover={{ scale: 1.1 }}
                      >
                        <ChevronDown className="w-4 h-4" style={{ color }} />
                      </motion.div>
                    </div>

                    {/* Progress bar */}
                    <BOProgressBar
                      value={rs.total > 0 ? Math.round((rs.active / rs.total) * 100) : 0}
                      color={color}
                      height="sm"
                      delay={i * 0.1}
                      className="mb-3"
                    />

                    {/* Chapitres */}
                    <div className="flex gap-2">
                      {rs.byChapter.map((count, ci) => (
                        <div key={ci} className="flex-1 bg-gray-50 rounded-xl px-2 py-1.5 text-center border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold">Ch.{ci + 1}</p>
                          <p className="font-black text-sm" style={{ color }}>{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Carte total */}
            <motion.div
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl border-2 border-gray-700 p-5 shadow-lg text-white relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              whileHover={{ y: -4 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.05), rgba(255,255,255,0))' }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/10">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-white">Total Banque de Questions</p>
                    <p className="text-xs text-white/60">Tous roles confondus</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">{totalQuestions}</p>
                    <p className="text-xs text-white/60">Questions</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">{activeQuestions}</p>
                    <p className="text-xs text-white/60">Actives</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Modules par profil */}
          <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: BO_PRIMARY }} />
            Modules par profil cible
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {['tous', 'marchand', 'producteur', 'cooperative', 'identificateur'].map((p, i) => {
              const data = modulesByProfil[p] || { count: 0, inscrits: 0 };
              const color = p === 'tous' ? BO_PRIMARY : ROLE_COLORS[p as UserRole] || '#6B7280';
              return (
                <motion.div
                  key={p}
                  className="bg-white rounded-2xl border-2 p-4 shadow-sm text-center cursor-pointer"
                  style={{ borderColor: `${color}30` }}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }}
                  whileHover={{ y: -3, borderColor: color }}
                  onClick={() => { setActiveTab('modules'); setFilterProfil(p); }}
                >
                  <p className="font-black text-xl" style={{ color }}>{data.count}</p>
                  <p className="text-xs text-gray-500 font-bold mb-1">{p === 'tous' ? 'Tous profils' : p.charAt(0).toUpperCase() + p.slice(1)}</p>
                  <p className="text-[10px] text-gray-400">{(data.inscrits || 0).toLocaleString()} inscrits</p>
                </motion.div>
              );
            })}
          </div>

          {/* Top modules */}
          <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: '#F59E0B' }} />
            Top 5 modules (inscrits)
          </h2>
          <div className="space-y-2 mb-6">
            {modules
              .filter(m => m.statut === 'publie')
              .sort((a, b) => b.nbInscrits - a.nbInscrits)
              .slice(0, 5)
              .map((m, i) => (
                <motion.div
                  key={m.id}
                  className="flex items-center gap-3 bg-white rounded-2xl border-2 border-gray-100 p-3 shadow-sm"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.25) }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm"
                    style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#B45309' : BO_PRIMARY }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{m.titre}</p>
                    <p className="text-xs text-gray-400">{m.profil === 'tous' ? 'Tous' : m.profil} - {m.duree} min</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm" style={{ color: BO_PRIMARY }}>{(m.nbInscrits || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{m.tauxCompletion}% acheve</p>
                  </div>
                  <BOProgressBar value={m.tauxCompletion} color={BO_PRIMARY} height="sm" className="w-20 hidden sm:block" />
                </motion.div>
              ))}
          </div>
        </motion.div>
        )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB : MODULES                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'modules' && (
        <>
          {/* KPIs */}
          <KPIGrid>
            <UniversalKPI label="Modules publiés" animatedTarget={nbPublies} icon={BookOpen} color={BO_PRIMARY} iconAnimation="float" onClick={() => setFilterStatut('publie')} active={filterStatut === 'publie'} delay={0} />
            <UniversalKPI label="Apprenants total" animatedTarget={totalInscrits} icon={Users} color="#3B82F6" iconAnimation="bounce" delay={0.06} />
            <UniversalKPI label="Taux moyen" value={`${tauxMoyen}`} suffix="%" icon={TrendingUp} color="#10B981" iconAnimation="float" delay={0.12} />
            <UniversalKPI label="En brouillon" animatedTarget={nbBrouillons} icon={Edit2} color="#F59E0B" iconAnimation="spin" onClick={() => setFilterStatut('brouillon')} active={filterStatut === 'brouillon'} delay={0.18} />
          </KPIGrid>

          {/* Barre recherche + Filtres */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un module..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'publie', 'brouillon', 'archive'].map(s => (
                <motion.button key={s} onClick={() => setFilterStatut(s)}
                  className="px-3 py-2 rounded-2xl text-xs font-bold border-2 transition-all"
                  style={{
                    backgroundColor: filterStatut === s ? BO_PRIMARY : 'white',
                    color: filterStatut === s ? 'white' : '#374151',
                    borderColor: filterStatut === s ? BO_PRIMARY : '#e5e7eb',
                  }}
                  whileHover={filterStatut !== s ? { y: -1 } : {}} whileTap={{ scale: 0.97 }}>
                  {s === 'all' ? 'Tous' : STATUT_CONFIG[s as keyof typeof STATUT_CONFIG]?.label}
                </motion.button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'marchand', 'producteur', 'cooperative', 'identificateur', 'tous'].map(p => (
                <motion.button key={p} onClick={() => setFilterProfil(p)}
                  className="px-3 py-2 rounded-2xl text-xs font-bold border-2 transition-all"
                  style={{
                    backgroundColor: filterProfil === p ? BO_DARK : 'white',
                    color: filterProfil === p ? 'white' : '#374151',
                    borderColor: filterProfil === p ? BO_DARK : '#e5e7eb',
                  }}
                  whileHover={filterProfil !== p ? { y: -1 } : {}} whileTap={{ scale: 0.97 }}>
                  {p === 'all' ? 'Tous profils' : p === 'tous' ? 'Universel' : p.charAt(0).toUpperCase() + p.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Liste modules */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border-2 border-gray-100">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-bold text-gray-500">Aucun module trouvé</p>
                <p className="text-sm text-gray-400 mt-1">Ajustez les filtres ou créez un nouveau module</p>
              </div>
            )}
            {filtered.map((module, index) => {
              const typeConf = TYPE_CONFIG[module.type] ?? Object.values(TYPE_CONFIG)[0];
              const TypeIcon = typeConf.icon || Zap;
              const niveauConf = NIVEAU_CONFIG[module.niveau] ?? Object.values(NIVEAU_CONFIG)[0];
              const statutConf = STATUT_CONFIG[module.statut] ?? Object.values(STATUT_CONFIG)[0];
              const isExpanded = expanded === module.id;

              return (
                <motion.div key={module.id} className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden"
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                  layout>
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${typeConf.color}20` }}>
                        <TypeIcon className="w-6 h-6" style={{ color: typeConf.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-bold text-gray-900">{module.titre}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{module.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statutConf.bg} ${statutConf.text}`}>{statutConf.label}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: `${niveauConf.color}20`, color: niveauConf.color }}>{niveauConf.label}</span>
                          <span className="text-xs text-gray-500">{module.profil === 'tous' ? 'Tous profils' : module.profil.charAt(0).toUpperCase() + module.profil.slice(1)}</span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />{module.duree} min
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold" style={{ color: BO_PRIMARY }}>
                            <Star className="w-3 h-3" />{module.points} pts
                          </span>
                          {module.statut === 'publie' && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="w-3 h-3" />{(module.nbInscrits || 0).toLocaleString()} inscrits
                            </span>
                          )}
                        </div>

                        {module.statut === 'publie' && (
                          <div className="mt-2 flex items-center gap-2">
                            <BOProgressBar value={module.tauxCompletion} color={module.tauxCompletion >= 75 ? '#10B981' : BO_PRIMARY} height="sm" delay={index * 0.05} className="flex-1" />
                            <span className="text-xs font-bold text-gray-700 flex-shrink-0">{module.tauxCompletion}%</span>
                          </div>
                        )}
                      </div>

                      <motion.button onClick={() => setExpanded(isExpanded ? null : module.id)}
                        className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"
                        whileTap={{ scale: 0.9 }}>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                      </motion.button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && canWrite && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 border-t-2 border-gray-100 pt-4 flex flex-wrap gap-2">
                          <motion.button onClick={() => toast.info('Éditeur module')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-700"
                            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                            <Edit2 className="w-4 h-4" />Modifier
                          </motion.button>
                          {module.statut === 'brouillon' && (
                            <motion.button onClick={() => handlePublier(module.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm text-white"
                              style={{ backgroundColor: '#10B981' }}
                              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                              <Play className="w-4 h-4" />Publier
                            </motion.button>
                          )}
                          {module.statut === 'publie' && (
                            <motion.button onClick={() => handleArchiver(module.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm text-white bg-orange-500"
                              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                              <Archive className="w-4 h-4" />Archiver
                            </motion.button>
                          )}
                          {module.statut === 'archive' && (
                            <motion.button onClick={() => handleSupprimer(module.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm text-white bg-red-500"
                              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                              <Trash2 className="w-4 h-4" />Supprimer
                            </motion.button>
                          )}
                          <motion.button onClick={() => toast.info('Statistiques module')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border-2"
                            style={{ borderColor: BO_PRIMARY, color: BO_PRIMARY }}
                            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                            <BarChart3 className="w-4 h-4" />Stats
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
        )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB : QUESTIONS PAR ROLE                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'questions' && (
        <div>
          {/* KPIs questions par role selectionne */}
          <KPIGrid>
            {ROLES.map((r, i) => {
              const count = (questionsCache[`${r}-${qChapter}`] || []).filter((q: any) => q.active).length;
              return (
                <UniversalKPI
                  key={r}
                  label={ROLE_LABELS[r]}
                  animatedTarget={count}
                  icon={ROLE_ICONS[r] as any}
                  color={ROLE_COLORS[r]}
                  active={qRole === r}
                  onClick={() => { setQRole(r); setQChapter(1); setQSearch(''); }}
                  delay={i * 0.06}
                  iconAnimation="float"
                />
              );
            })}
          </KPIGrid>

          {/* Selecteur role avec couleur + icone */}
          <div className="flex gap-2 flex-wrap mb-4">
            {ROLES.map(r => {
              const RIcon = ROLE_ICONS[r];
              return (
                <motion.button key={r} onClick={() => { setQRole(r); setQChapter(1); setQSearch(''); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all"
                  style={{
                    backgroundColor: qRole === r ? ROLE_COLORS[r] : 'white',
                    color: qRole === r ? 'white' : '#374151',
                    borderColor: qRole === r ? ROLE_COLORS[r] : '#E5E7EB',
                  }}
                  whileHover={qRole !== r ? { y: -2 } : {}} whileTap={{ scale: 0.97 }}>
                  <RIcon className="w-4 h-4" />
                  {ROLE_LABELS[r]}
                </motion.button>
              );
            })}
          </div>

          {/* Selecteur Chapitre */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(ch => {
              const chQs = getQuestions(qRole, ch);
              const activeCount = chQs.filter(q => q.active).length;
              return (
                <motion.button key={ch} onClick={() => { setQChapter(ch); setQSearch(''); }}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 transition-all relative overflow-hidden"
                  style={{
                    backgroundColor: qChapter === ch ? ROLE_COLORS[qRole] : 'white',
                    color: qChapter === ch ? 'white' : '#374151',
                    borderColor: qChapter === ch ? ROLE_COLORS[qRole] : '#E5E7EB',
                  }}
                  whileHover={qChapter !== ch ? { y: -2 } : {}} whileTap={{ scale: 0.97 }}>
                  <span className="block text-xs opacity-70">Chapitre {ch}</span>
                  <span className="block">{chapterNames[ch - 1]}</span>
                  <span className="block text-[10px] mt-0.5 opacity-60">{activeCount} / {chQs.length} questions</span>
                </motion.button>
              );
            })}
          </div>

          {/* Barre recherche questions */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={qSearch}
              onChange={e => setQSearch(e.target.value)}
              placeholder="Rechercher une question..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm"
              style={{ borderColor: qSearch ? ROLE_COLORS[qRole] : undefined }}
            />
            {qSearch && (
              <button onClick={() => setQSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Info role context */}
          <motion.div
            className="flex items-center gap-3 p-4 rounded-2xl border-2 mb-4"
            style={{ borderColor: `${ROLE_COLORS[qRole]}30`, backgroundColor: `${ROLE_COLORS[qRole]}05` }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            key={`${qRole}-${qChapter}`}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ROLE_COLORS[qRole]}20` }}>
              <Hash className="w-4 h-4" style={{ color: ROLE_COLORS[qRole] }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-gray-900">
                {ROLE_LABELS[qRole]} - Chapitre {qChapter} : {chapterNames[qChapter - 1]}
              </p>
              <p className="text-xs text-gray-500">
                {filteredQuestions.length} question{filteredQuestions.length > 1 ? 's' : ''} affichee{filteredQuestions.length > 1 ? 's' : ''}
                {' '}/ {filteredQuestions.filter(q => q.active).length} active{filteredQuestions.filter(q => q.active).length > 1 ? 's' : ''}
              </p>
            </div>
            {canWrite && (
              <motion.button
                onClick={() => {
                  setQuestionsCache({});
                  toast.success('Cache rafraichi');
                }}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </motion.button>
            )}
          </motion.div>

          {/* Liste questions */}
          <div className="space-y-3">
            {filteredQuestions.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border-2 border-gray-100">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-bold text-gray-500">Aucune question pour ce chapitre</p>
                <p className="text-sm text-gray-400 mt-1">Clique sur "Nouvelle question" pour en ajouter</p>
              </div>
            )}
            {filteredQuestions.map((q, idx) => (
              <motion.div key={q.id}
                className="bg-white rounded-2xl shadow-sm border-2 p-4 overflow-hidden"
                style={{ borderColor: q.active ? `${ROLE_COLORS[qRole]}30` : '#F3F4F6', opacity: q.active ? 1 : 0.6 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: q.active ? 1 : 0.6, y: 0 }}
                transition={{ delay: idx * 0.03 }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-sm"
                    style={{ backgroundColor: ROLE_COLORS[qRole] }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-gray-100 text-gray-500">L{q.lesson}</span>
                      {(q.moduleId || q.module_id) && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-blue-50 text-blue-700" title={availableModules.find(m => m.id === (q.moduleId || q.module_id))?.titre || ''}>
                          📚 {availableModules.find(m => m.id === (q.moduleId || q.module_id))?.titre?.slice(0, 20) || 'Module'}
                        </span>
                      )}
                      {!q.active && <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-red-50 text-red-500">Desactivee</span>}
                    </div>
                    <p className="font-bold text-gray-900 mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 overflow-hidden flex items-center gap-1 ${oi === q.correctIndex ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                          {oi === q.correctIndex && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                          <span className="truncate">{opt.text}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 italic">{q.explanation}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {/* Preview */}
                    <motion.button onClick={() => setShowPreview(q)}
                      className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Eye className="w-4 h-4 text-purple-600" />
                    </motion.button>
                    {canWrite && (
                      <>
                        <motion.button onClick={() => openQEditor(q)}
                          className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </motion.button>
                        <motion.button onClick={() => handleToggleQuestion(q)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: q.active ? '#D1FAE5' : '#FEE2E2' }}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          {q.active
                            ? <ToggleRight className="w-4 h-4 text-green-600" />
                            : <ToggleLeft className="w-4 h-4 text-red-500" />}
                        </motion.button>
                        <motion.button onClick={() => handleDeleteQuestion(q)}
                          className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL : CREATION MODULE                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}>
            <motion.div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-2 max-h-[90vh] overflow-y-auto"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-gray-900 text-xl">Nouveau module Academy</h2>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <ImagePickerField
                  label="Miniature du module"
                  value={(form as any).image || ''}
                  onChange={(url) => setForm(p => ({ ...p, image: url }))}
                  primaryColor={BO_PRIMARY}
                  shape="rect"
                  size={90}
                />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Titre du module *</label>
                  <input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} required
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm"
                    placeholder="Ex : Gestion des stocks quotidienne" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm resize-none"
                    placeholder="Décrivez l'objectif de ce module..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ModuleType }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm">
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Niveau</label>
                    <select value={form.niveau} onChange={e => setForm(p => ({ ...p, niveau: e.target.value as NiveauType }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm">
                      {Object.entries(NIVEAU_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Profil cible</label>
                    <select value={form.profil} onChange={e => setForm(p => ({ ...p, profil: e.target.value as ProfilType }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm">
                      {['tous', 'marchand', 'producteur', 'cooperative', 'identificateur'].map(p => (
                        <option key={p} value={p}>{p === 'tous' ? 'Tous profils' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Durée (min)</label>
                    <input type="number" value={form.duree} onChange={e => setForm(p => ({ ...p, duree: +e.target.value }))} min={1}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Points de gamification</label>
                  <input type="number" value={form.points} onChange={e => setForm(p => ({ ...p, points: +e.target.value }))} min={0} step={10}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                  <motion.button type="submit" className="flex-1 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: BO_PRIMARY }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Save className="w-4 h-4" />Créer en brouillon
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL : EDITEUR QUESTION                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showQEditor && (
          <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowQEditor(false)}>
            <motion.div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-2 max-h-[90vh] overflow-y-auto"
              style={{ borderColor: ROLE_COLORS[qRole] }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-black text-gray-900 text-xl">{editingQ ? 'Modifier la question' : 'Nouvelle question'}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{ROLE_LABELS[qRole]} - Chapitre {qChapter} : {chapterNames[qChapter - 1]}</p>
                </div>
                <button onClick={() => setShowQEditor(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Lesson picker */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lecon (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(l => (
                      <motion.button key={l} type="button" onClick={() => setQForm(p => ({ ...p, lesson: l }))}
                        className="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                        style={{
                          backgroundColor: qForm.lesson === l ? ROLE_COLORS[qRole] : 'white',
                          color: qForm.lesson === l ? 'white' : '#374151',
                          borderColor: qForm.lesson === l ? ROLE_COLORS[qRole] : '#E5E7EB',
                        }}
                        whileTap={{ scale: 0.95 }}>
                        L{l}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Module assignment */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Module rattaché</label>
                  <select
                    value={qForm.moduleId || qForm.module_id || ''}
                    onChange={e => setQForm(p => ({ ...p, moduleId: e.target.value || null, module_id: e.target.value || null }))}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm bg-white"
                    style={{ borderColor: ROLE_COLORS[qRole] + '60' }}
                  >
                    <option value="">-- Aucun module (question libre) --</option>
                    {availableModules
                      .filter(m => m.profil === qRole || m.profil === 'tous')
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.titre}{m.profil === 'tous' ? ' (Tous)' : ''}</option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choisis un module pour que cette question apparaisse lors de la formation correspondante.</p>
                </div>

                {/* Question */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Question *</label>
                  <textarea value={qForm.question || ''} onChange={e => setQForm(p => ({ ...p, question: e.target.value }))} rows={2}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm resize-none"
                    style={{ borderColor: ROLE_COLORS[qRole] + '60' }}
                    placeholder="Max 10 mots, simple et clair" />
                </div>

                {/* 4 options */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">4 Reponses *</label>
                  <div className="space-y-2">
                    {(qForm.options || []).map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-2 p-3 rounded-2xl border-2 ${oi === qForm.correctIndex ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                        <motion.button type="button"
                          onClick={() => setQForm(p => ({ ...p, correctIndex: oi }))}
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${oi === qForm.correctIndex ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}
                          whileTap={{ scale: 0.9 }}>
                          {oi === qForm.correctIndex && <CheckCircle className="w-5 h-5 text-white" />}
                        </motion.button>
                        <input value={opt.text} onChange={e => {
                          const newOpts = [...(qForm.options || [])];
                          newOpts[oi] = { ...newOpts[oi], text: e.target.value };
                          setQForm(p => ({ ...p, options: newOpts }));
                        }}
                          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none"
                          placeholder={`Reponse ${oi + 1}${oi === qForm.correctIndex ? ' (correcte)' : ''}`} />
                        <select value={opt.icon} onChange={e => {
                          const newOpts = [...(qForm.options || [])];
                          newOpts[oi] = { ...newOpts[oi], icon: e.target.value };
                          setQForm(p => ({ ...p, options: newOpts }));
                        }} className="text-xs bg-transparent text-gray-500 focus:outline-none">
                          {['CheckCircle', 'XCircle', 'Minus', 'AlertCircle', 'Star', 'Award', 'Keiwa', 'Package', 'Users', 'TrendingUp', 'Target', 'Leaf', 'ShoppingBag', 'BookOpen', 'Globe', 'Heart'].map(ic => (
                            <option key={ic} value={ic}>{ic}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Clique le cercle pour marquer la bonne reponse</p>
                </div>

                {/* Explication */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Explication (montree apres reponse)</label>
                  <textarea value={qForm.explanation || ''} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} rows={2}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm resize-none"
                    placeholder="Explication courte et simple..." />
                </div>

                {/* Boutons */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowQEditor(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                  <motion.button onClick={handleSaveQuestion}
                    className="flex-1 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: ROLE_COLORS[qRole] }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Save className="w-4 h-4" />{editingQ ? 'Modifier' : 'Ajouter'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL : PREVIEW QUESTION (style mobile Duolingo)                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showPreview && (
          <motion.div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPreview(null)}>
            <motion.div
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border-2 overflow-hidden"
              style={{ borderColor: ROLE_COLORS[qRole] }}
              initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}>
              {/* Header preview */}
              <div className="px-5 py-4 text-white relative overflow-hidden" style={{ backgroundColor: ROLE_COLORS[qRole] }}>
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.1), rgba(255,255,255,0))' }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60 font-bold">Preview - {ROLE_LABELS[qRole]}</p>
                    <p className="font-black text-lg">Chapitre {showPreview.chapter} - Lecon {showPreview.lesson}</p>
                  </div>
                  <button onClick={() => setShowPreview(null)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Question */}
              <div className="p-5">
                <motion.p
                  className="font-black text-gray-900 text-lg mb-5 text-center"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                >
                  {showPreview.question}
                </motion.p>

                {/* Options simulees */}
                <div className="space-y-3">
                  {showPreview.options.map((opt, oi) => (
                    <motion.div
                      key={oi}
                      className={`p-4 rounded-2xl border-2 font-bold text-sm cursor-pointer ${
                        oi === showPreview.correctIndex
                          ? 'bg-green-50 border-green-400 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + oi * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          oi === showPreview.correctIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + oi)}
                        </div>
                        <span>{opt.text}</span>
                        {oi === showPreview.correctIndex && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Explication */}
                <motion.div
                  className="mt-4 p-4 rounded-2xl bg-blue-50 border-2 border-blue-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-xs font-bold text-blue-700 mb-1">Explication :</p>
                  <p className="text-sm text-blue-800">{showPreview.explanation}</p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
