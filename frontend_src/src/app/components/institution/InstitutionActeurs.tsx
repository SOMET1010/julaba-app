import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  MapPin,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  History,
  BarChart3,
  Phone,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { NotificationButton } from '../marchand/NotificationButton';
import { toast } from 'sonner';
import { matchesSearch } from '../../utils/searchUtils';
import { FicheActeurDetailModal } from '../shared/FicheActeurDetailModal';
import { useInstitutionData } from '../../hooks/useInstitutionData';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';

const PRIMARY_COLOR = '#712864';

// ✅ NETTOYAGE PHASE 2 : MOCK_ACTEURS supprimé - utilise BackOfficeContext

const REGIONS = ['Toutes', 'Abidjan', 'Gbêkê', 'Hambol', 'Haut-Sassandra', 'Poro', 'Woroba'];
const TYPES = ['Tous', 'marchand', 'producteur', 'cooperative', 'identificateur'];
const STATUTS = ['Tous', 'actif', 'suspendu'];

function getTypeColor(type: string) {
  if (type === 'marchand') return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
  if (type === 'producteur') return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
  if (type === 'cooperative') return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
  return { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' };
}

function getTypeLabel(type: string) {
  if (type === 'marchand') return 'Marchand';
  if (type === 'producteur') return 'Producteur';
  if (type === 'cooperative') return 'Coopérative';
  if (type === 'identificateur') return 'Identificateur';
  return type;
}

// ── Groupement par catégorie ──────────────────────────────────────────────────
function GroupeParCategorie({ acteurs, onVoirDossier }: { acteurs: any[], onVoirDossier: (a: any) => void }) {
  const categories = ['marchand', 'producteur', 'cooperative', 'identificateur'];
  return (
    <div className="space-y-4">
      {categories.map(cat => {
        const groupe = acteurs.filter(a => a.type === cat);
        if (groupe.length === 0) return null;
        const colors = getTypeColor(cat);
        return (
          <div key={cat}>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl mb-2 ${colors.bg} ${colors.text}`}>
              <Users className="w-4 h-4" />
              <span className="font-bold text-sm">{getTypeLabel(cat)}</span>
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-white/60`}>{groupe.length}</span>
            </div>
            {groupe.map(acteur => (
              <motion.div
                key={acteur.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-3 mb-2 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer"
                onClick={() => onVoirDossier(acteur)}
              >
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{acteur.prenoms} {acteur.nom}</p>
                  <p className="text-xs text-gray-500">{acteur.telephone} • {acteur.commune || acteur.region || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${acteur.statut === 'actif' ? 'bg-green-100 text-green-700' : acteur.statut === 'suspendu' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {acteur.statut}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </motion.div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function InstitutionActeurs() {
  const navigate = useNavigate();
  const { acteurs } = useInstitutionData();
  const acteurRows = acteurs as any[];

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'actif' | 'suspendu'>('all');
  const [selectedType, setSelectedType] = useState('Tous');
  const [selectedRegion, setSelectedRegion] = useState('Toutes');
  const [selectedActeur, setSelectedActeur] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeView, setActiveView] = useState<'liste' | 'detail'>('liste');
  const [detailActeur, setDetailActeur] = useState<any>(null);
  const [ficheActeur, setFicheActeur] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'groupe' | 'liste'>('groupe');

  // ✅ Stats basées sur données réelles BackOfficeContext
  const stats = useMemo(() => ({
    total: acteurRows.length,
    actifs: acteurRows.filter(a => a.statut === 'actif').length,
    suspendus: acteurRows.filter(a => a.statut === 'suspendu').length,
  }), [acteurRows]);

  // ✅ Filtrage sur données réelles
  const filtered = useMemo(() => {
    return acteurRows.filter(a => {
      const match = matchesSearch(searchQuery, a.nom, a.prenoms, a.telephone, a.commune);
      const matchStatut = activeFilter === 'all' || a.statut === activeFilter;
      const matchType = selectedType === 'Tous' || a.type === selectedType;
      const matchRegion = selectedRegion === 'Toutes' || (a.region?.normalize('NFD') ?? '').replace(/[\u0300-\u036f]/g, '').toLowerCase() === selectedRegion.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return match && matchStatut && matchType && matchRegion;
    });
  }, [acteurRows, searchQuery, activeFilter, selectedType, selectedRegion]);

  const handleSuspendre = async (id: string) => {
    try {
      await apiRequest(API_URL, `/acteurs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'suspendu' }),
      });
      window.location.reload();
      toast.success('Acteur suspendu');
    } catch { toast.error('Impossible de suspendre. Réessaie.'); }
  };

  const handleReactiver = async (id: string) => {
    try {
      await apiRequest(API_URL, `/acteurs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'actif' }),
      });
      window.location.reload();
      toast.success('Acteur réactivé');
    } catch { toast.error('Impossible de réactiver. Réessaie.'); }
  };

  const handleVoirDossier = (acteur: any) => {
    setDetailActeur(acteur);
    setActiveView('detail');
  };

  const handleCardClick = (acteur: any) => {
    setFicheActeur(acteur);
  };

  if (activeView === 'detail' && detailActeur) {
    return <ActeurDetail acteur={detailActeur} onBack={() => setActiveView('liste')} />;
  }

  return (
    <SubPageLayout
      role="institution"
      title="Acteurs"
      rightContent={(
        <>
          <NotificationButton />
          <motion.button
            onClick={() => setShowFilters(v => !v)}
            className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center border-2"
            style={{ borderColor: showFilters ? PRIMARY_COLOR : '#e5e7eb' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Filter className="w-5 h-5" style={{ color: showFilters ? PRIMARY_COLOR : '#6b7280' }} />
          </motion.button>
        </>
      )}
    >
      <div className="pt-6 pb-32 lg:pb-8 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-purple-50 to-white">

        <KPIGrid cols={3} className="mb-5">
          <UniversalKPI
            label="Total"
            animatedTarget={stats.total}
            icon={Users}
            color="#3B82F6"
            delay={0}
          />
          <UniversalKPI
            label="Actifs"
            animatedTarget={stats.actifs}
            icon={CheckCircle}
            color="#10B981"
            delay={30}
          />
          <UniversalKPI
            label="Suspendus"
            animatedTarget={stats.suspendus}
            icon={XCircle}
            color="#EF4444"
            delay={60}
          />
        </KPIGrid>

        {/* Barre de recherche */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 relative">
          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}20, ${PRIMARY_COLOR}40)` }}>
              <Search className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, téléphone, commune..."
              className="w-full pl-20 pr-6 py-5 rounded-3xl border-2 focus:outline-none text-base bg-white shadow-md"
              style={{ borderColor: searchQuery ? PRIMARY_COLOR : '#e5e7eb' }}
            />
          </div>
        </motion.div>

        {/* Filtres avancés */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-white rounded-3xl p-5 border-2 shadow-md"
              style={{ borderColor: `${PRIMARY_COLOR}30` }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2">Type d'acteur</p>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map(t => (
                      <motion.button
                        key={t}
                        onClick={() => setSelectedType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${selectedType === t ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                        style={selectedType === t ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR } : {}}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t === 'Tous' ? 'Tous' : getTypeLabel(t)}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2">Région</p>
                  <div className="flex flex-wrap gap-2">
                    {REGIONS.map(r => (
                      <motion.button
                        key={r}
                        onClick={() => setSelectedRegion(r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${selectedRegion === r ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                        style={selectedRegion === r ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR } : {}}
                        whileTap={{ scale: 0.95 }}
                      >
                        {r}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Résultats */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-500 font-semibold mb-3">
          {filtered.length} acteur{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
        </motion.p>

        {/* Liste */}
        <div className="space-y-3">
          {filtered.map((acteur, idx) => {
            const typeStyle = getTypeColor(acteur.type);
            return (
              <motion.div
                key={acteur.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white rounded-3xl border-2 shadow-sm overflow-hidden cursor-pointer"
                style={{ borderColor: '#f3f4f6' }}
                onClick={() => handleCardClick(acteur)}
                whileHover={{ scale: 1.01, y: -2, boxShadow: `0 8px 24px ${PRIMARY_COLOR}18`, borderColor: `${PRIMARY_COLOR}40` }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-md flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #9B3D8A)` }}>
                    {acteur.prenoms.charAt(0)}{acteur.nom.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-gray-900">{acteur.prenoms} {acteur.nom}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border-2 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                        {getTypeLabel(acteur.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{acteur.commune}, {acteur.region}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{acteur.telephone}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                      acteur.statut === 'actif' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {acteur.statut === 'actif' ? 'Actif' : 'Suspendu'}
                    </span>
                    <motion.div
                      className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                    >
                      <ChevronRight className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 bg-white rounded-3xl border-2 border-gray-100">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">Aucun acteur trouvé</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal fiche acteur */}
      {ficheActeur && (
        <FicheActeurDetailModal
          acteur={{
            ...ficheActeur,
            role: ficheActeur.type,
            statut: ficheActeur.statut,
            activite: ficheActeur.activite,
            dateCreation: ficheActeur.dateCreation,
            activiteRecente: ficheActeur.activiteRecente,
          }}
          onClose={() => setFicheActeur(null)}
          contextRole="institution"
        />
      )}
    </SubPageLayout>
  );
}

// ── Vue Détail Acteur ─────────────────────────────────────────────────────────
function ActeurDetail({ acteur, onBack }: { acteur: any; onBack: () => void }) {
  const { transactions } = useInstitutionData();
  const [activeTab, setActiveTab] = useState<'infos' | 'transactions' | 'historique' | 'stats'>('infos');
  const typeStyle = getTypeColor(acteur.type);

  // ✅ NETTOYAGE PHASE 2 : Utilise données réelles du BackOfficeContext
  // FUTURE: GET /api/v1/transactions?acteurId=
  const acteurTransactions = transactions.filter((t: any) => (t.acteurNom || '').includes(acteur.nom));
  const acteurHistorique: any[] = []; // FUTURE: GET /api/v1/transactions?acteurId=

  return (
    <>
      <motion.div className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-gray-100" initial={{ y: -80 }} animate={{ y: 0 }}>
        <div className="px-4 pt-10 pb-3 lg:pt-4 lg:pb-3 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto flex items-center gap-3">
          <motion.button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </motion.button>
          <h1 className="font-bold text-gray-900 text-xl">{acteur.prenoms} {acteur.nom}</h1>
        </div>
      </motion.div>

      <div className="pt-24 pb-32 lg:pb-8 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gray-50">
        {/* Header acteur */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 border-2 shadow-md mb-4" style={{ borderColor: `${PRIMARY_COLOR}30` }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
              style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #9B3D8A)` }}>
              {acteur.prenoms.charAt(0)}{acteur.nom.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-xl">{acteur.prenoms} {acteur.nom}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>{getTypeLabel(acteur.type)}</span>
            </div>
            <span className={`ml-auto px-3 py-1.5 rounded-full text-xs font-bold border-2 ${acteur.statut === 'actif' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {acteur.statut === 'actif' ? 'Actif' : 'Suspendu'}
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(['infos', 'transactions', 'historique', 'stats'] as const).map(tab => (
            <motion.button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap border-2 transition-all ${activeTab === tab ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
              style={activeTab === tab ? { backgroundColor: PRIMARY_COLOR } : {}}
              whileTap={{ scale: 0.95 }}>
              {tab === 'infos' ? 'Informations' : tab === 'transactions' ? 'Transactions' : tab === 'historique' ? 'Historique' : 'Statistiques'}
            </motion.button>
          ))}
        </div>

        {/* Contenu onglets */}
        <AnimatePresence mode="wait">
          {activeTab === 'infos' && (
            <motion.div key="infos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {[
                { label: 'Téléphone', value: acteur.telephone, icon: <Phone className="w-4 h-4" /> },
                { label: 'Région', value: acteur.region, icon: <MapPin className="w-4 h-4" /> },
                { label: 'Commune', value: acteur.commune, icon: <MapPin className="w-4 h-4" /> },
                { label: 'Activité', value: acteur.activite, icon: <Activity className="w-4 h-4" /> },
                { label: 'Date création', value: new Date(acteur.dateCreation).toLocaleDateString('fr-FR'), icon: <Calendar className="w-4 h-4" /> },
                { label: 'Dernière activité', value: new Date(acteur.activiteRecente).toLocaleDateString('fr-FR'), icon: <Clock className="w-4 h-4" /> },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-3xl p-4 border-2 border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}>{item.icon}</div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">{item.label}</p>
                    <p className="font-bold text-gray-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div key="tx" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {acteurTransactions.length === 0 && (
                <div className="bg-white rounded-3xl p-8 border-2 border-gray-100 text-center">
                  <p className="text-gray-500">Aucune transaction disponible</p>
                </div>
              )}
              {acteurTransactions.map(tx => (
                <div key={tx.id} className="bg-white rounded-3xl p-4 border-2 border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{tx.id}</p>
                      <p className="text-sm text-gray-500">
                        {new Date((tx as any).date || (tx as any).created_at || Date.now()).toLocaleDateString('fr-FR')} — {(tx as any).type || tx.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{((tx as any).montant ?? tx.amount ?? 0).toLocaleString()} FCFA</p>
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">{(tx as any).statut || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'historique' && (
            <motion.div key="hist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              {acteurHistorique.length === 0 && (
                <div className="bg-white rounded-3xl p-8 border-2 border-gray-100 text-center">
                  <p className="text-gray-500">Aucun historique disponible</p>
                </div>
              )}
              {acteurHistorique.map((h, i) => (
                <div key={i} className="bg-white rounded-3xl p-4 border-2 border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">{h.action}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{h.date}</span>
                    <span>IP : {h.ip}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-3">
              {[
                { label: 'Transactions totales', value: String(acteurTransactions.length), color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                {
                  label: 'Valeur totale',
                  value: `${acteurTransactions.reduce((s, t: any) => s + (t.montant ?? t.amount ?? 0), 0).toLocaleString()} FCFA`,
                  color: 'text-green-700',
                  bg: 'bg-green-50',
                  border: 'border-green-200',
                },
                { label: 'Taux activité', value: '—', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
                { label: 'Score fiabilité', value: '—', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
              ].map(s => (
                <div key={s.label} className={`rounded-3xl p-4 border-2 ${s.bg} ${s.border} text-center`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-600 font-semibold mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
