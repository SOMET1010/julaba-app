import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock, Play, Pause, CheckCircle2, XCircle, RefreshCw,
  Calendar, Zap, Activity, PauseCircle, AlertCircle, List,
} from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp, hoverGlow } from './bo-animations';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

type TaskStatut = 'actif' | 'pause' | 'erreur' | 'termine';
const VALID_STATUTS: TaskStatut[] = ['actif', 'pause', 'erreur', 'termine'];

function normalizeStatut(raw: any): TaskStatut {
  if (raw === 'idle' || raw === 'running' || raw === 'active') return 'actif';
  if (raw === 'failed' || raw === 'error') return 'erreur';
  if (raw === 'done' || raw === 'completed' || raw === 'finished') return 'termine';
  if (raw === 'paused' || raw === 'pause') return 'pause';
  return VALID_STATUTS.includes(raw) ? raw : 'erreur';
}

interface CronTask {
  id: string;
  nom: string;
  description: string;
  cron: string;
  cronHumain: string;
  statut: TaskStatut;
  derniereExecution: string;
  prochaineExecution: string;
  dureeMs: number;
  nbExecutions: number;
  derniereErreur: string | null;
}


const STATUT_CONFIG: Record<TaskStatut, { label: string; color: string; bg: string; icon: any }> = {
  actif: { label: 'Actif', color: '#10B981', bg: '#F0FDF4', icon: CheckCircle2 },
  pause: { label: 'Pause', color: '#F59E0B', bg: '#FFFBEB', icon: Pause },
  erreur: { label: 'Erreur', color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
  termine: { label: 'Terminé', color: '#6B7280', bg: '#F9FAFB', icon: CheckCircle2 },
};

export function BOCronDashboard() {
  const [tasks, setTasks] = useState<CronTask[]>([]);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/cron`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
      .then(d => {
        const jobs = Array.isArray(d?.jobs) ? d.jobs : Array.isArray(d) ? d : [];
        if (jobs.length === 0) toast.info('Aucune tâche cron disponible');
        const mapped: CronTask[] = jobs.map((j: any) => ({
          id: j.nom,
          nom: j.nom,
          description: j.description || '',
          cron: j.cron || '* * * * *',
          cronHumain: j.cronHumain || 'Planifié',
          statut: normalizeStatut(j.statut),
          derniereExecution: j.derniere_exec || '-',
          prochaineExecution: j.prochaine_exec || '-',
          dureeMs: j.duree_ms || 0,
          nbExecutions: j.nb_executions || 0,
          derniereErreur: j.derniere_erreur || null,
        }));
        setTasks(mapped);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn('[BOCronDashboard] fetch cron failed:', err instanceof Error ? err.message : err);
        toast.error('Erreur chargement des tâches cron');
      });
    return () => controller.abort();
  }, []);

  const counts = {
    actif: tasks.filter(t => t.statut === 'actif').length,
    pause: tasks.filter(t => t.statut === 'pause').length,
    erreur: tasks.filter(t => t.statut === 'erreur').length,
    total: tasks.length,
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/cron/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur toggle cron');
      setTasks(prev => prev.map(t => {
        if (t.id !== id) return t;
        const newStatut: TaskStatut = t.statut === 'actif' ? 'pause' : 'actif';
        return { ...t, statut: newStatut };
      }));
      toast.success('Statut mis à jour');
    } catch (err) {
      console.warn('[BOCronDashboard] handleToggle failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible de modifier le statut');
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/cron/${id}/retry`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur retry cron');
      setTasks(prev => prev.map(t => t.id === id ? { ...t, statut: 'actif' as const, derniereErreur: null } : t));
      toast.success('Tâche relancée');
    } catch (err) {
      console.warn('[BOCronDashboard] handleRetry failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible de relancer la tâche');
    }
  };

  const formatTime = (iso: string) => {
    if (!iso || iso === '-') return '-';
    const d = new Date(iso);
    return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Tâches planifiées</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cron jobs, sauvegardes et opérations automatiques</p>
      </motion.div>

      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI label="Total tâches" animatedTarget={counts.total} icon={List} color="#712864" />
        <UniversalKPI label="Actives" animatedTarget={counts.actif} icon={Activity} color="#16a34a" />
        <UniversalKPI label="En pause" animatedTarget={counts.pause} icon={PauseCircle} color="#F59E0B" />
        <UniversalKPI label="En erreur" animatedTarget={counts.erreur} icon={AlertCircle} color="#dc2626" />
      </KPIGrid>

      {/* Liste taches */}
      <div className="space-y-3">
        {tasks.map((task, i) => {
          const statut = STATUT_CONFIG[task.statut] ?? Object.values(STATUT_CONFIG)[0];
          const StatutIcon = statut.icon || Zap;
          return (
            <motion.div key={task.id} {...fadeInUp(i * 0.04)} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden" {...hoverGlow(BO_PRIMARY)}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statut.bg }}>
                    <StatutIcon className="w-5 h-5" style={{ color: statut.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-gray-900 text-sm">{task.nom}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: statut.bg, color: statut.color }}>{statut.label}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{task.cron}</span>
                    </div>
                    <p className="text-xs text-gray-600">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{task.cronHumain}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Dernière : {formatTime(task.derniereExecution)}</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{task.dureeMs}ms</span>
                      <span className="font-bold">{task.nbExecutions} exécutions</span>
                    </div>
                    {task.statut !== 'pause' && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        Prochaine exécution : <span className="font-bold">{formatTime(task.prochaineExecution)}</span>
                      </p>
                    )}
                    {task.derniereErreur && (
                      <div className="mt-2 p-2 rounded-xl bg-red-50 border border-red-200">
                        <p className="text-xs text-red-700 font-mono">{task.derniereErreur}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {task.statut === 'erreur' && (
                      <motion.button onClick={() => handleRetry(task.id)} whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-xl bg-blue-50 border border-blue-200" title="Relancer">
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                      </motion.button>
                    )}
                    <motion.button onClick={() => handleToggle(task.id)} whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-xl bg-gray-50 border border-gray-200" title={task.statut === 'actif' ? 'Mettre en pause' : 'Activer'}>
                      {task.statut === 'actif' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-green-500" />}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}