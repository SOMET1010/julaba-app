import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, AlertTriangle, Ban, Trash2, MessageSquare,
  ChevronDown, CheckCircle2, Clock,
  Flag, User, XCircle,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp, hoverGlow, springSnappy } from './bo-animations';
import { toast } from 'sonner';
import {
  boGetUserFlags,
  boResolveUserFlag,
  type FlagResolutionAction,
  type UserFlagItem,
  type UserFlagType,
} from '../../services/backoffice-api';
import { UniversalConfirmModalBO } from './universal/UniversalConfirmModalBO';
import { UniversalRechercheBO } from './universal/UniversalRechercheBO';
import { UniversalFiltreBO, type FilterGroup } from './universal/UniversalFiltreBO';
import { UniversalSectionCardBO } from './universal/UniversalSectionCardBO';
import { UniversalActionButtonBO } from './universal/UniversalActionButtonBO';
import { API_URL } from '../../utils/api';

type SignalementStatut = 'nouveau' | 'en_cours' | 'traite' | 'rejete';

interface Signalement {
  id: string;
  type: UserFlagType;
  acteurNom: string;
  description: string;
  signalePar: string;
  date: string;
  statut: SignalementStatut;
  priorite: 'haute' | 'moyenne' | 'basse';
  flag: UserFlagItem;
}

const TYPE_CONFIG: Record<UserFlagType, { label: string; color: string; bg: string }> = {
  doublon: { label: 'Doublon', color: '#3B82F6', bg: '#EFF6FF' },
  fraude: { label: 'Fraude', color: '#EF4444', bg: '#FEF2F2' },
  abus: { label: 'Contenu abusif', color: '#8B5CF6', bg: '#FAF5FF' },
  spam: { label: 'Spam', color: '#F59E0B', bg: '#FFFBEB' },
  usurpation: { label: 'Usurpation', color: '#DC2626', bg: '#FEF2F2' },
  autre: { label: 'Autre', color: '#6B7280', bg: '#F9FAFB' },
};

const STATUT_CONFIG: Record<SignalementStatut, { label: string; color: string; bg: string }> = {
  nouveau: { label: 'Nouveau', color: '#EF4444', bg: '#FEF2F2' },
  en_cours: { label: 'En cours', color: '#F59E0B', bg: '#FFFBEB' },
  traite: { label: 'Traité', color: '#10B981', bg: '#F0FDF4' },
  rejete: { label: 'Rejeté', color: '#6B7280', bg: '#F9FAFB' },
};

const ACTION_LABELS: Record<FlagResolutionAction, string> = {
  avertissement: 'Avertissement',
  suspendre: 'Suspendre',
  bannir: 'Bannir',
  rejeter: 'Rejeter',
};

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'type',
    label: 'Type',
    type: 'options',
    options: [
      { value: 'all', label: 'Tous les types' },
      { value: 'doublon', label: 'Doublon' },
      { value: 'fraude', label: 'Fraude' },
      { value: 'abus', label: 'Contenu abusif' },
      { value: 'spam', label: 'Spam' },
      { value: 'usurpation', label: 'Usurpation' },
      { value: 'autre', label: 'Autre' },
    ],
  },
  {
    id: 'statut',
    label: 'Statut',
    type: 'options',
    options: [
      { value: 'all', label: 'Tous statuts' },
      { value: 'nouveau', label: 'Nouveau' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'traite', label: 'Traite' },
      { value: 'rejete', label: 'Rejete' },
    ],
  },
];

function formatName(first?: string | null, last?: string | null, fallback = 'Utilisateur inconnu'): string {
  const full = `${first || ''} ${last || ''}`.trim();
  return full || fallback;
}

function mapFlagToSignalement(flag: UserFlagItem): Signalement {
  return {
    id: flag.id,
    type: flag.flagType,
    acteurNom: formatName(flag.userFirstName, flag.userLastName, flag.userPhone || flag.userId),
    description: flag.raison,
    signalePar: formatName(flag.creatorFirstName, flag.creatorLastName, flag.createdBy),
    date: flag.createdAt,
    statut: 'nouveau',
    priorite: flag.flagType === 'fraude' || flag.flagType === 'usurpation' ? 'haute' : 'moyenne',
    flag,
  };
}

export function BOModeration() {
  const { hasPermission, refreshActeurs, markCategoryRead } = useBackOffice();
  const canWrite = hasPermission('moderation.write');
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshActeursRef = useRef(refreshActeurs);
  refreshActeursRef.current = refreshActeurs;

  useEffect(() => {
    void refreshActeursRef.current();
  }, []);

  const [marchesEnAttente, setMarchesEnAttente] = useState<any[]>([]);
  const [marchesLoading, setMarchesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signalements' | 'marches'>('signalements');

  const loadMarchesEnAttente = async () => {
    setMarchesLoading(true);
    try {
      const res = await fetch(`${API_URL}/marches?statut=en_attente`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMarchesEnAttente(data);
      }
    } catch (e: any) {
      console.warn('[BOModeration] loadMarchesEnAttente failed:', e?.message);
    } finally {
      setMarchesLoading(false);
    }
  };

  useEffect(() => {
    void loadMarchesEnAttente();
    markCategoryRead('marche_suggestion');
    markCategoryRead('moderation');
  }, []);

  const handleValiderMarche = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/marches/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'actif' }),
      });
      if (res.ok) {
        setMarchesEnAttente(prev => prev.filter(m => m.id !== id));
        toast.success('Marché validé et ajouté à la liste officielle');
      }
    } catch (e: any) {
      console.warn('[BOModeration] handleValiderMarche failed:', e?.message);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleRejeterMarche = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/marches/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'rejete', actif: false }),
      });
      if (res.ok) {
        setMarchesEnAttente(prev => prev.filter(m => m.id !== id));
        toast.info('Marché rejeté');
      }
    } catch (e: any) {
      console.warn('[BOModeration] handleRejeterMarche failed:', e?.message);
      toast.error('Erreur lors du rejet');
    }
  };

  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [processingFlagId, setProcessingFlagId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ signalement: Signalement; action: 'suspendre' | 'bannir' } | null>(null);

  const loadSignalements = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await boGetUserFlags(false, controller.signal);
      if (!isMountedRef.current) return;
      setSignalements(data.items.map(mapFlagToSignalement));
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      if (!isMountedRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Échec du chargement des signalements.');
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadSignalements();
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [loadSignalements]);

  const filtered = signalements.filter(s => {
    if (search && !s.acteurNom.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterStatut !== 'all' && s.statut !== filterStatut) return false;
    return true;
  });

  const counts = {
    nouveau: signalements.filter(s => s.statut === 'nouveau').length,
    en_cours: signalements.filter(s => s.statut === 'en_cours').length,
    traite: signalements.filter(s => s.statut === 'traite').length,
    total: signalements.length,
  };

  const handleAction = async (signalement: Signalement, action: FlagResolutionAction) => {
    if (processingFlagId) return;
    setProcessingFlagId(signalement.id);
    try {
      await boResolveUserFlag(signalement.id, action);
      if (!isMountedRef.current) return;
      toast.success(`Signalement traité : ${ACTION_LABELS[action]}.`);
      setSelected(null);
      setConfirmAction(null);
      await loadSignalements();
      if (action === 'suspendre' || action === 'bannir') {
        await refreshActeurs().catch(() => undefined);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Échec du traitement du signalement.');
    } finally {
      if (isMountedRef.current) setProcessingFlagId(null);
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Moderation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestion des signalements et contenus abusifs</p>
      </motion.div>

      {/* Compteurs */}
      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI label="Nouveaux" animatedTarget={counts.nouveau} icon={AlertTriangle} color="#EF4444" iconAnimation="pulse" />
        <UniversalKPI label="En cours" animatedTarget={counts.en_cours} icon={Clock} color="#F59E0B" iconAnimation="float" />
        <UniversalKPI label="Traités" animatedTarget={counts.traite} icon={CheckCircle2} color="#10B981" iconAnimation="float" />
        <UniversalKPI label="Total" animatedTarget={counts.total} icon={ShieldAlert} color={BO_PRIMARY} iconAnimation="bounce" />
      </KPIGrid>

      <motion.div {...fadeInUp(0.15)}>
        <motion.div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: '0.5px solid #E5E7EB',
          paddingBottom: '0',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('signalements')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'signalements' ? 700 : 500,
              color: activeTab === 'signalements' ? BO_PRIMARY : '#6B7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'signalements' ? `2px solid ${BO_PRIMARY}` : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Signalements
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('marches'); void loadMarchesEnAttente(); }}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'marches' ? 700 : 500,
              color: activeTab === 'marches' ? BO_PRIMARY : '#6B7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'marches' ? `2px solid ${BO_PRIMARY}` : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Marchés à valider
            {marchesEnAttente.length > 0 && (
              <span style={{
                background: '#EF4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {marchesEnAttente.length}
              </span>
            )}
          </button>
        </motion.div>
      </motion.div>

      {activeTab === 'signalements' && (
      <>
      {/* Filtres */}
      <motion.div {...fadeInUp(0.2)} className="bg-white rounded-3xl border-2 border-gray-100 p-4 mb-6 shadow-sm">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap', position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <UniversalRechercheBO
              onChange={(query) => setSearch(query)}
              placeholder="Rechercher..."
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <UniversalFiltreBO
              groups={FILTER_GROUPS}
              value={{ type: filterType, statut: filterStatut }}
              onChange={(value) => {
                setFilterType(typeof value.type === 'string' ? value.type : 'all');
                setFilterStatut(typeof value.statut === 'string' ? value.statut : 'all');
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Liste */}
      <UniversalSectionCardBO
        title="Signalements"
        icon={Flag}
        iconAnimated={true}
        variant="warning"
        delay={0.3}
      >
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              Aucun signalement trouve.
            </div>
          )}
          <AnimatePresence>
            {filtered.map((sig, i) => {
              const type = TYPE_CONFIG[sig.type] ?? Object.values(TYPE_CONFIG)[0];
              const statut = STATUT_CONFIG[sig.statut] ?? Object.values(STATUT_CONFIG)[0];
              const isOpen = selected === sig.id;
              return (
                <motion.div key={sig.id} {...fadeInUp(0.05 * i)} layout
                  className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden"
                  {...hoverGlow(BO_PRIMARY)}>
                  <div className="p-4 cursor-pointer" onClick={() => setSelected(isOpen ? null : sig.id)}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: type.bg }}>
                        <Flag className="w-5 h-5" style={{ color: type.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-gray-900 text-sm">{sig.acteurNom}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: type.bg, color: type.color }}>{type.label}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: statut.bg, color: statut.color }}>{statut.label}</span>
                          {sig.priorite === 'haute' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">URGENT</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">{sig.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{sig.signalePar}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(sig.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={springSnappy}>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </motion.div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t-2 border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50">
                          <p className="text-sm text-gray-700 mb-4">{sig.description}</p>
                          {canWrite && sig.statut !== 'traite' && sig.statut !== 'rejete' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <UniversalActionButtonBO
                                variant="warning"
                                size="sm"
                                onClick={() => void handleAction(sig, 'avertissement')}
                                disabled={!!processingFlagId}
                                icon={MessageSquare}
                                label="Avertissement"
                              />
                              <UniversalActionButtonBO
                                variant="warning"
                                size="sm"
                                onClick={() => setConfirmAction({ signalement: sig, action: 'suspendre' })}
                                disabled={!!processingFlagId}
                                icon={Ban}
                                label="Suspendre"
                              />
                              <UniversalActionButtonBO
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirmAction({ signalement: sig, action: 'bannir' })}
                                disabled={!!processingFlagId}
                                icon={Trash2}
                                label="Bannir"
                              />
                              <UniversalActionButtonBO
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleAction(sig, 'rejeter')}
                                disabled={!!processingFlagId}
                                icon={XCircle}
                                label="Rejeter"
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </UniversalSectionCardBO>
      </>
      )}

      {activeTab === 'marches' && (
        <div className="space-y-3">
          {marchesLoading ? (
            <motion.div className="flex justify-center py-10">
              <motion.div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: BO_PRIMARY }} />
            </motion.div>
          ) : marchesEnAttente.length === 0 ? (
            <motion.div className="text-center py-10">
              <p className="text-gray-500 text-sm font-semibold">Aucun marché en attente</p>
            </motion.div>
          ) : (
            marchesEnAttente.map(marche => (
              <motion.div key={marche.id}
                className="bg-white rounded-2xl border-2 p-4 space-y-3"
                style={{ borderColor: '#E5E7EB' }}
              >
                <motion.div className="flex items-start justify-between gap-3">
                  <motion.div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{marche.nom}</p>
                    <p className="text-xs text-gray-500 mt-1">{marche.commune}</p>
                    {marche.responsable_nom && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Responsable : {marche.responsable_nom}
                      </p>
                    )}
                  </motion.div>
                  <span style={{
                    background: '#FEF3C7',
                    color: '#D97706',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  }}>
                    À valider
                  </span>
                </motion.div>
                {canWrite && (
                  <motion.div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleValiderMarche(marche.id)}
                      className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold"
                      style={{ background: '#16A34A' }}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRejeterMarche(marche.id)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2"
                      style={{ color: '#DC2626', borderColor: '#DC2626', background: '#fff' }}
                    >
                      Rejeter
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      <UniversalConfirmModalBO
        open={!!confirmAction}
        onClose={() => {
          if (processingFlagId) return;
          setConfirmAction(null);
        }}
        onConfirm={() => confirmAction ? handleAction(confirmAction.signalement, confirmAction.action) : undefined}
        title={confirmAction?.action === 'bannir' ? 'Bannir cet acteur ?' : 'Suspendre cet acteur ?'}
        message={
          confirmAction
            ? `Confirmer l’action ${ACTION_LABELS[confirmAction.action].toLowerCase()} pour ${confirmAction.signalement.acteurNom}. Le signalement sera marqué comme traité.`
            : ''
        }
        severity="danger"
        confirmLabel={confirmAction?.action === 'bannir' ? 'Bannir' : 'Suspendre'}
        cancelLabel="Annuler"
        requireTypedConfirmation={confirmAction?.action === 'bannir' ? 'BANNIR' : 'SUSPENDRE'}
        typedConfirmationHelper={confirmAction?.action === 'bannir' ? 'Tape BANNIR pour confirmer.' : 'Tape SUSPENDRE pour confirmer.'}
        loading={!!confirmAction && processingFlagId === confirmAction.signalement.id}
      />
    </div>
  );
}
