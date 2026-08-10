import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Plus, CheckCircle2, Clock, TrendingUp, Award,
  MapPin, Users, AlertTriangle, Edit2, Save, X, Trophy, Loader2,
  Flame, BarChart3, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { BOProgressBar } from './BOProgressBar';
import { toast } from 'sonner';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

interface Mission {
  id: string;
  titre: string;
  description: string;
  type: 'identification' | 'formation' | 'transaction' | 'zone';
  cible: string;
  objectif: number;
  realise: number;
  dateDebut: string;
  dateFin: string;
  statut: 'active' | 'terminee' | 'echouee' | 'draft';
  region: string;
  points: number;
  participantsCount: number;
}

interface ActeurLeaderboard {
  id?: string;
  nom?: string;
  zone?: string;
  rang?: number;
  pts?: number;
  dossiers?: number;
  role?: string;
  type?: string;
}

const TYPE_CONFIG: Record<Mission['type'], { label: string; color: string; icon: any }> = {
  identification: { label: 'Identification', color: BO_PRIMARY, icon: Users },
  formation: { label: 'Formation', color: '#8B5CF6', icon: Award },
  transaction: { label: 'Transaction', color: '#3B82F6', icon: TrendingUp },
  zone: { label: 'Couverture zone', color: '#10B981', icon: MapPin },
};

const STATUT_CONFIG: Record<Mission['statut'], { label: string; bg: string; text: string; icon: any }> = {
  active: { label: 'Activée', bg: 'bg-green-100', text: 'text-green-700', icon: Flame },
  terminee: { label: 'Terminée', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle2 },
  echouee: { label: 'Échouée', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  draft: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
};

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = Math.min(Math.round((total <= 0 ? 0 : (value / total) * 100)), 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-bold text-gray-700">{pct}% accompli</span>
        <span className="text-xs text-gray-500">{(value || 0).toLocaleString()} / {(total || 0).toLocaleString()}</span>
      </div>
      <BOProgressBar
        value={pct}
        color={pct >= 100 ? '#10B981' : pct >= 70 ? color : pct >= 40 ? BO_PRIMARY : '#EF4444'}
        height="md"
        delay={0.1}
      />
    </div>
  );
}

export function BOMissions() {
  const _boCtx = useBackOffice();
  const missions: Mission[] = Array.isArray(_boCtx.missions) ? (_boCtx.missions as Mission[]) : [];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { void _boCtx.refreshMissions?.(); }, []);
  const { hasPermission, addMission, updateMissionStatut, acteurs } = _boCtx;
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [form, setForm] = useState({ titre: '', description: '', type: 'identification' as Mission['type'], objectif: 50, region: 'Abidjan', cible: '', dateDebut: '', dateFin: '', points: 300 });

  const canWrite = hasPermission('missions.write');

  const filtered: Mission[] = useMemo(
    () => missions.filter((m) =>
      (filterStatut === 'all' || m.statut === filterStatut) &&
      (filterType === 'all' || m.type === filterType)
    ),
    [missions, filterStatut, filterType]
  );

  const { actives, terminees, totalNonDraft, tauxSucces } = useMemo(() => {
    const a = missions.filter((m) => m.statut === 'active').length;
    const t = missions.filter((m) => m.statut === 'terminee').length;
    const n = missions.filter((m) => m.statut !== 'draft').length;
    const ts = n > 0 ? Math.round((t / n) * 100) : 0;
    return { actives: a, terminees: t, totalNonDraft: n, tauxSucces: ts };
  }, [missions]);

  const identificateurs = useMemo<ActeurLeaderboard[]>(() => {
    if (!Array.isArray(acteurs)) return [];
    return (acteurs as ActeurLeaderboard[]).filter(
      (a) => a.role === 'identificateur' || a.type === 'identificateur'
    );
  }, [acteurs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addMission(form);
      toast.success(`Mission "${form.titre}" créée en brouillon`);
      setShowCreate(false);
      setForm({ titre: '', description: '', type: 'identification', objectif: 50, region: 'Abidjan', cible: '', dateDebut: '', dateFin: '', points: 300 });
    } catch (err) {
      console.warn('[BOMissions] addMission failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la création de la mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublier = async (id: string) => {
    if (publishingId) return;
    setPublishingId(id);
    try {
      await updateMissionStatut(id, 'active');
      toast.success('Mission activée');
    } catch (err) {
      console.warn('[BOMissions] publier failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de l’activation de la mission');
    } finally {
      setPublishingId(null);
    }
  };

  const handleCloturer = async (id: string) => {
    if (closingId) return;
    setClosingId(id);
    try {
      await updateMissionStatut(id, 'terminee');
      toast.info('Mission clôturée - résultats archivés');
    } catch (err) {
      console.warn('[BOMissions] cloturer failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la clôture de la mission');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Missions & Objectifs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pilotage de la performance nationale par zones</p>
        </div>
        {canWrite && (
          <motion.button onClick={() => setShowCreate(true)}
            aria-haspopup="dialog"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold shadow-lg"
            style={{ backgroundColor: BO_PRIMARY }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouvelle mission</span>
          </motion.button>
        )}
      </motion.div>

      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI label="Total missions" animatedTarget={missions.length} icon={Target} color="#712864" />
        <UniversalKPI label="Actives" animatedTarget={actives} icon={Zap} color="#16a34a" />
        <UniversalKPI label="Terminées" animatedTarget={terminees} icon={CheckCircle2} color="#2072AF" />
        <UniversalKPI label="Taux succès" value={`${tauxSucces}%`} icon={TrendingUp} color="#F59E0B" />
      </KPIGrid>

      {/* Classement / Leaderboard */}
      <motion.div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm mb-6 overflow-hidden"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <button onClick={() => setShowLeaderboard(!showLeaderboard)}
          aria-label={showLeaderboard ? 'Masquer le classement' : 'Afficher le classement'}
          aria-expanded={showLeaderboard}
          aria-controls="leaderboard-panel"
          className="w-full flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${BO_PRIMARY}15` }}>
              <Trophy className="w-5 h-5" style={{ color: BO_PRIMARY }} />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">Classement national - identificateurs</p>
              <p className="text-xs text-gray-400">Top performers de la période en cours</p>
            </div>
          </div>
          {showLeaderboard ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              id="leaderboard-panel"
              className="overflow-hidden border-t-2 border-gray-100">
              {identificateurs.length === 0 ? (
                <p key="empty" className="px-6 py-4 text-sm text-gray-400">Aucun identificateur disponible</p>
              ) : (
                identificateurs.map((p, i) => (
                  <motion.div key={p.id ?? `acteur-rank-${i}`} className="flex items-center gap-4 px-6 py-3 border-b border-gray-50 last:border-0"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${((p.rang ?? 0) <= 3 && (p.rang ?? 0) > 0) ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                      style={((p.rang ?? 0) <= 3 && (p.rang ?? 0) > 0) ? { backgroundColor: p.rang === 1 ? '#F59E0B' : p.rang === 2 ? '#9CA3AF' : '#C66A2C' } : {}}>
                      {p.rang ?? '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{p.nom ?? '-'}</p>
                      <p className="text-xs text-gray-400 truncate">{p.zone ?? '-'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-sm" style={{ color: BO_PRIMARY }}>{(p.pts || 0).toLocaleString()} pts</p>
                      <p className="text-xs text-gray-400">{p.dossiers ?? 0} dossiers</p>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'terminee', 'echouee', 'draft'].map(s => (
            <motion.button key={s} onClick={() => setFilterStatut(s)}
              className="px-4 py-2 rounded-2xl text-sm font-bold border-2 transition-all"
              style={{
                backgroundColor: filterStatut === s ? BO_PRIMARY : 'white',
                color: filterStatut === s ? 'white' : '#374151',
                borderColor: filterStatut === s ? BO_PRIMARY : '#e5e7eb',
              }}
              whileHover={filterStatut !== s ? { y: -2 } : {}} whileTap={{ scale: 0.97 }}>
              {s === 'all' ? 'Toutes' : STATUT_CONFIG[s as Mission['statut']]?.label}
            </motion.button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...Object.keys(TYPE_CONFIG)].map(t => (
            <motion.button key={t} onClick={() => setFilterType(t)}
              className="px-3 py-2 rounded-2xl text-xs font-bold border-2 transition-all"
              style={{
                backgroundColor: filterType === t ? BO_DARK : 'white',
                color: filterType === t ? 'white' : '#374151',
                borderColor: filterType === t ? BO_DARK : '#e5e7eb',
              }}
              whileHover={filterType !== t ? { y: -2 } : {}} whileTap={{ scale: 0.97 }}>
              {t === 'all' ? 'Tous types' : TYPE_CONFIG[t as Mission['type']]?.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Liste missions */}
      <div className="space-y-4">
        {filtered.map((mission, index) => {
          const typeConf = TYPE_CONFIG[mission.type];
          const statutConf = STATUT_CONFIG[mission.statut];
          const TypeIcon = typeConf.icon || Target;
          const StatutIcon = statutConf.icon || Target;
          const isExpanded = expanded === mission.id;

          return (
            <motion.div key={mission.id} className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              layout>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${typeConf.color}20` }}>
                    <TypeIcon className="w-6 h-6" style={{ color: typeConf.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                      <div>
                        <p className="font-black text-gray-900">{mission.titre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{mission.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold ${statutConf.bg} ${statutConf.text}`}>
                          <StatutIcon className="w-3.5 h-3.5" />
                          {statutConf.label}
                        </div>
                        <motion.button onClick={() => setExpanded(isExpanded ? null : mission.id)}
                          aria-label={isExpanded ? 'Masquer les actions' : 'Afficher les actions'}
                          aria-expanded={isExpanded}
                          className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
                          whileTap={{ scale: 0.9 }}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{mission.region}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{mission.cible} ({mission.participantsCount} participants)</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" style={{ color: BO_PRIMARY }} /><strong style={{ color: BO_PRIMARY }}>{mission.points} pts</strong></span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                        {new Date(mission.dateDebut).toLocaleDateString('fr-FR')} → {new Date(mission.dateFin).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {mission.statut !== 'draft' && (
                      <ProgressBar value={mission.realise} total={mission.objectif} color={typeConf.color} />
                    )}
                  </div>
                </div>

                {/* Actions expandable */}
                <AnimatePresence>
                  {isExpanded && canWrite && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="mt-4 pt-4 border-t-2 border-gray-100 flex gap-2 flex-wrap">
                        {mission.statut === 'draft' && (
                          <motion.button onClick={() => handlePublier(mission.id)}
                            disabled={publishingId === mission.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#10B981' }}
                            whileHover={publishingId === mission.id ? {} : { y: -2 }} whileTap={publishingId === mission.id ? {} : { scale: 0.97 }}>
                            <Flame className="w-4 h-4" />Activer la mission
                          </motion.button>
                        )}
                        {mission.statut === 'active' && (
                          <motion.button onClick={() => handleCloturer(mission.id)}
                            disabled={closingId === mission.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border-2 border-blue-200 text-blue-700 bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={closingId === mission.id ? {} : { y: -2 }} whileTap={closingId === mission.id ? {} : { scale: 0.97 }}>
                            <CheckCircle2 className="w-4 h-4" />Clôturer
                          </motion.button>
                        )}
                        <motion.button
                          type="button"
                          disabled
                          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                          title="Indisponible : audit en cours">
                          <Edit2 className="w-4 h-4" />Modifier
                        </motion.button>
                        <motion.button onClick={() => setShowLeaderboard(true)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border-2"
                          style={{ borderColor: BO_PRIMARY, color: BO_PRIMARY }}
                          whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                          <Trophy className="w-4 h-4" />Classement
                        </motion.button>
                        <motion.button
                          type="button"
                          disabled
                          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                          title="Indisponible : audit en cours">
                          <BarChart3 className="w-4 h-4" />Analytics
                        </motion.button>
                        {canWrite && (
                          <div className="mt-3 rounded-xl border-2 border-orange-200 bg-orange-50 px-3 py-2">
                            <p className="text-[11px] font-semibold text-orange-900">
                              Modifier et Analytics : indisponibles, audit en cours.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal création */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}>
            <motion.div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-2 max-h-[90vh] overflow-y-auto"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-create-title"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 id="modal-create-title" className="font-black text-gray-900 text-xl">Nouvelle Mission</h2>
                <button onClick={() => setShowCreate(false)} aria-label="Fermer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="mission-titre" className="block text-sm font-bold text-gray-700 mb-1">Titre *</label>
                  <input id="mission-titre" value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} required
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" placeholder="Ex : Sprint Identification Korhogo" />
                </div>
                <div>
                  <label htmlFor="mission-description" className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea id="mission-description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm resize-none"
                    placeholder="Objectif de la mission..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="mission-type" className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                    <select id="mission-type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Mission['type'] }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm">
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="mission-region" className="block text-sm font-bold text-gray-700 mb-1">Région</label>
                    <input id="mission-region" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" placeholder="Abidjan" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="mission-cible" className="block text-sm font-bold text-gray-700 mb-1">Cible</label>
                    <input id="mission-cible" value={form.cible} onChange={e => setForm(p => ({ ...p, cible: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" placeholder="Identificateurs" />
                  </div>
                  <div>
                    <label htmlFor="mission-objectif" className="block text-sm font-bold text-gray-700 mb-1">Objectif chiffré</label>
                    <input id="mission-objectif" type="number" value={form.objectif} onChange={e => setForm(p => ({ ...p, objectif: +e.target.value }))} min={1}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="mission-date-debut" className="block text-sm font-bold text-gray-700 mb-1">Date début *</label>
                    <input id="mission-date-debut" type="date" value={form.dateDebut} onChange={e => setForm(p => ({ ...p, dateDebut: e.target.value }))} required
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label htmlFor="mission-date-fin" className="block text-sm font-bold text-gray-700 mb-1">Date fin *</label>
                    <input id="mission-date-fin" type="date" value={form.dateFin} onChange={e => setForm(p => ({ ...p, dateFin: e.target.value }))} required
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label htmlFor="mission-points" className="block text-sm font-bold text-gray-700 mb-1">Points récompense</label>
                  <input id="mission-points" type="number" value={form.points} onChange={e => setForm(p => ({ ...p, points: +e.target.value }))} min={0} step={50}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: BO_PRIMARY }}
                    whileHover={isSubmitting ? {} : { scale: 1.02 }}
                    whileTap={isSubmitting ? {} : { scale: 0.97 }}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSubmitting ? 'Création...' : 'Créer'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMission && (
          <motion.div className="fixed inset-0 bg-black/50 z-[210] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingMission(null)}>
            <motion.div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-2"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-edit-title"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h2 id="modal-edit-title" className="font-black text-gray-900 text-lg">Modifier mission</h2>
                <button onClick={() => setEditingMission(null)} aria-label="Fermer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3 mb-4">
                <p className="text-xs font-bold text-orange-900">
                  Indisponible : audit en cours. Cette fonctionnalité sera réactivée prochainement.
                </p>
              </div>
              <p className="text-sm text-gray-600">Placeholder edition: {editingMission.titre}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}