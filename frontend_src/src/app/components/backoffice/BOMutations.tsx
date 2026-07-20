import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeftRight,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { API_URL } from '../../utils/api';
import { toast } from 'sonner';
import { BO_PRIMARY } from './bo-theme';

interface MutationItem {
  id: string;
  identificateur_id: string;
  identificateur_nom: string | null;
  identificateur_nom_calc?: string | null;
  zone_actuelle_nom: string | null;
  zone_demandee_nom: string;
  raison: string;
  statut: 'en_attente' | 'approuvee' | 'rejetee';
  decideur_id: string | null;
  motif_decision: string | null;
  date_decision: string | null;
  created_at: string;
}

type TabStatut = 'toutes' | 'en_attente' | 'approuvee' | 'rejetee';

function normalizeMutation(row: MutationItem): MutationItem {
  return {
    ...row,
    identificateur_nom:
      row.identificateur_nom?.trim() ||
      row.identificateur_nom_calc?.trim() ||
      null,
  };
}

export function BOMutations() {
  const { hasPermission, boUser, markCategoryRead } = useBackOffice();
  const canWrite = hasPermission('mutations.write') || boUser?.role === 'super_admin';
  const isMountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [mutations, setMutations] = useState<MutationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabStatut>('en_attente');
  const [selected, setSelected] = useState<MutationItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadMutations = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/mutations`, {
        credentials: 'include',
        signal: abortRef.current.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (isMountedRef.current && Array.isArray(data.data)) {
        setMutations(data.data.map((m: MutationItem) => normalizeMutation(m)));
      }
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === 'AbortError') return;
      console.warn('[BOMutations] load failed:', err?.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    markCategoryRead('mutation_decision');
    void loadMutations();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadMutations, markCategoryRead]);

  const filtered = mutations.filter(m =>
    activeTab === 'toutes' ? true : m.statut === activeTab,
  );

  const kpis = {
    enAttente: mutations.filter(m => m.statut === 'en_attente').length,
    approuvees: mutations.filter(m => m.statut === 'approuvee').length,
    rejetees: mutations.filter(m => m.statut === 'rejetee').length,
    total: mutations.length,
  };

  const TABS: { id: TabStatut; label: string; count: number }[] = [
    { id: 'en_attente', label: 'En attente', count: kpis.enAttente },
    { id: 'approuvee', label: 'Approuvées', count: kpis.approuvees },
    { id: 'rejetee', label: 'Rejetées', count: kpis.rejetees },
    { id: 'toutes', label: 'Toutes', count: kpis.total },
  ];

  return (
    <SubPageLayout role="administrateur" title="Demandes de mutation">
      <motion.div className="pb-10 max-w-3xl mx-auto space-y-4">

        <KPIGrid cols={3}>
          <UniversalKPI
            label="En attente"
            animatedTarget={kpis.enAttente}
            icon={Clock}
            color="#D97706"
            bgColor="rgba(255,247,237,0.9)"
            borderColor="rgba(249,115,22,0.35)"
            iconAnimation="pulse"
            active={activeTab === 'en_attente'}
            onClick={() => setActiveTab('en_attente')}
          />
          <UniversalKPI
            label="Approuvées"
            animatedTarget={kpis.approuvees}
            icon={CheckCircle}
            color="#16A34A"
            bgColor="rgba(240,253,244,0.9)"
            borderColor="rgba(34,197,94,0.35)"
            iconAnimation="bounce"
            active={activeTab === 'approuvee'}
            onClick={() => setActiveTab('approuvee')}
          />
          <UniversalKPI
            label="Rejetées"
            animatedTarget={kpis.rejetees}
            icon={XCircle}
            color="#DC2626"
            bgColor="rgba(254,242,242,0.9)"
            borderColor="rgba(239,68,68,0.35)"
            iconAnimation="pulse"
            active={activeTab === 'rejetee'}
            onClick={() => setActiveTab('rejetee')}
          />
        </KPIGrid>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all"
              style={activeTab === tab.id
                ? { background: BO_PRIMARY, color: '#fff' }
                : { background: '#F3F4F6', color: '#6B7280' }
              }
            >
              {tab.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={activeTab === tab.id
                  ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                  : { background: '#E5E7EB', color: '#6B7280' }
                }
              >
                {tab.count}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => void loadMutations()}
            aria-label="Rafraîchir la liste"
            className="ml-auto p-2.5 rounded-2xl bg-gray-100 text-gray-500"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-6 h-6" style={{ color: BO_PRIMARY }} />
            </motion.div>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-semibold text-sm">Aucune demande</p>
          </motion.div>
        ) : (
          <motion.div className="space-y-3">
            {filtered.map(mutation => (
              <motion.div
                key={mutation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border-2 p-4 space-y-3"
                style={{ borderColor: '#F3F4F6' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <motion.div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 flex-shrink-0" style={{ color: BO_PRIMARY }} />
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {mutation.identificateur_nom || 'Identificateur inconnu'}
                      </p>
                    </motion.div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{mutation.zone_actuelle_nom || 'Zone inconnue'}</span>
                      <ArrowLeftRight className="w-3 h-3" />
                      <span className="font-semibold text-gray-700">{mutation.zone_demandee_nom}</span>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={
                      mutation.statut === 'en_attente'
                        ? { background: '#FEF3C7', color: '#D97706' }
                        : mutation.statut === 'approuvee'
                          ? { background: '#DCFCE7', color: '#16A34A' }
                          : { background: '#FEE2E2', color: '#DC2626' }
                    }
                  >
                    {mutation.statut === 'en_attente'
                      ? 'En attente'
                      : mutation.statut === 'approuvee'
                        ? 'Approuvée'
                        : 'Rejetée'}
                  </span>
                </div>

                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                  <p className="text-xs text-gray-600 line-clamp-2">{mutation.raison}</p>
                </div>

                <motion.div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {new Date(mutation.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {canWrite && mutation.statut === 'en_attente' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(mutation);
                        setModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: BO_PRIMARY }}
                    >
                      Examiner
                    </button>
                  )}
                  {mutation.statut !== 'en_attente' && mutation.motif_decision && (
                    <p className="text-xs text-gray-400 italic truncate max-w-[180px]">
                      {mutation.motif_decision}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {modalOpen && selected && (
          <DecisionModal
            mutation={selected}
            boUserRole={boUser?.role}
            onClose={() => {
              setModalOpen(false);
              setSelected(null);
            }}
            onSuccess={() => {
              setModalOpen(false);
              setSelected(null);
              void loadMutations();
            }}
          />
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}

interface DecisionModalProps {
  mutation: MutationItem;
  boUserRole?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function DecisionModal({ mutation, boUserRole, onClose, onSuccess }: DecisionModalProps) {
  const modalTitleId = useId();
  const [decision, setDecision] = useState<'approuvee' | 'rejetee' | null>(null);
  const [motif, setMotif] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      isMountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSubmit = async () => {
    if (!decision) return;
    if (decision === 'rejetee' && motif.trim().length < 10) {
      toast.error('Le motif doit faire au moins 10 caractères');
      return;
    }
    if (isSubmitting) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/mutations/${mutation.id}/decision`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, motif: motif.trim() || undefined }),
        signal: abortRef.current.signal,
      });
      if (!isMountedRef.current) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { message?: string })?.message || 'Erreur lors de la décision');
        return;
      }
      toast.success('Décision enregistrée');
      onSuccess();
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === 'AbortError') return;
      console.warn('[DecisionModal] submit failed:', err?.message);
      if (isMountedRef.current) toast.error('Erreur réseau. Réessaie.');
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end lg:items-center lg:justify-center p-0 lg:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id={modalTitleId} className="font-bold text-gray-900">
            Examiner la demande
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <XCircle className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">
              {mutation.identificateur_nom || 'Identificateur inconnu'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{mutation.zone_actuelle_nom || '—'}</span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold">{mutation.zone_demandee_nom}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1 font-semibold">Raison</p>
            <p className="text-sm text-gray-700">{mutation.raison}</p>
          </div>
          <p className="text-xs text-gray-400">
            Soumise le {new Date(mutation.created_at).toLocaleDateString('fr-FR')}
          </p>
          {boUserRole === 'super_admin' && (
            <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
              <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-semibold">
                En tant que super admin, une mission sera créée automatiquement si vous approuvez.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision('approuvee')}
              className="py-3 rounded-2xl text-sm font-bold border-2 transition-all"
              style={decision === 'approuvee'
                ? { background: '#DCFCE7', borderColor: '#16A34A', color: '#16A34A' }
                : { background: '#fff', borderColor: '#E5E7EB', color: '#6B7280' }
              }
            >
              Approuver
            </button>
            <button
              type="button"
              onClick={() => setDecision('rejetee')}
              className="py-3 rounded-2xl text-sm font-bold border-2 transition-all"
              style={decision === 'rejetee'
                ? { background: '#FEE2E2', borderColor: '#DC2626', color: '#DC2626' }
                : { background: '#fff', borderColor: '#E5E7EB', color: '#6B7280' }
              }
            >
              Rejeter
            </button>
          </div>

          <AnimatePresence>
            {decision && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motif
                  {decision === 'rejetee' && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  {decision === 'approuvee' && (
                    <span className="text-gray-400 text-xs font-normal ml-1">(optionnel)</span>
                  )}
                </label>
                <textarea
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  rows={3}
                  placeholder={
                    decision === 'rejetee'
                      ? 'Expliquez le motif du rejet\u00a0(10 caractères min.)'
                      : 'Commentaire optionnel…'
                  }
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm resize-none"
                  style={{ fontFamily: 'inherit' }}
                  onFocus={e => { e.target.style.borderColor = BO_PRIMARY; }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!decision || isSubmitting}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: decision === 'rejetee' ? '#DC2626' : '#16A34A' }}
          >
            {isSubmitting ? 'Enregistrement…' : 'Confirmer la décision'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
