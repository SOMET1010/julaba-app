import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Search,
  Filter,
  Store,
  Sprout,
  Eye,
  Edit2,
  MapPin,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  Download,
  Trophy,
  Shield,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIdentificateur, type Identification } from '../../contexts/IdentificateurContext';
import { useUser } from '../../contexts/UserContext';
import { toast } from 'sonner';
import { SubPageLayout } from '../layout/SubPageLayout';
import { NotificationButton } from '../marchand/NotificationButton';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';

const PRIMARY_COLOR = '#9F8170';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const repeatLoop = prefersReducedMotion ? 0 : Infinity;

function normalizeStatut(statut: string): 'submitted' | 'approved' | 'rejected' {
  switch (statut) {
    case 'en_cours':
      return 'submitted';
    case 'valide':
    case 'validee':
    case 'approuve':
      return 'approved';
    case 'rejete':
    case 'rejetee':
      return 'rejected';
    case 'soumis':
    case 'en_attente':
    case 'complement':
      return 'submitted';
    default:
      return 'submitted';
  }
}

function normalizeAccess(raw: boolean): { autorise: boolean; raison: string } {
  return {
    autorise: raw,
    raison: raw ? '' : 'Cet acteur n’est pas dans ta zone d’affectation.',
  };
}

function getActorTypeColor(type: string): string {
  if (type === 'marchand') return '#C66A2C';
  if (type === 'producteur') return '#2E8B57';
  return '#9F8170';
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('fr-FR') : '-';
}

function formatDateLong(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTimeShort(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

type IdentificationWithMarche = Identification & { marche?: string };

export function SuiviIdentifications() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { peutConsulterActeur, getStatsIdentificateur, identifications } = useIdentificateur();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');
  const [selectedIdentification, setSelectedIdentification] = useState<string | null>(null);
  const [historiqueActeur, setHistoriqueActeur] = useState<
    Array<{ id: string; date: string; type: string; description: string }>
  >([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [showRapports, setShowRapports] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'all' | 'marchand' | 'producteur'>('all');

  const isMountedRef = useRef(true);
  const historiqueAbortRef = useRef<AbortController | null>(null);
  const filtresTriggerRef = useRef<HTMLButtonElement>(null);
  const detailOpenFocusRef = useRef<HTMLElement | null>(null);

  const filtresTitleIdRaw = useId();
  const filtresTitleId = `suivi-filtres-title-${filtresTitleIdRaw.replace(/:/g, '')}`;
  const detailTitleIdRaw = useId();
  const detailTitleId = `suivi-detail-title-${detailTitleIdRaw.replace(/:/g, '')}`;

  const kpiIconAnim = prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 5, -5, 0] };
  const kpiIconTransition = prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: repeatLoop };
  const kpiScaleAnim = prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.05, 1] };
  const kpiScaleTransition = prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: repeatLoop };
  const kpiGreenScaleTransition = prefersReducedMotion ? { duration: 0 } : { duration: 1.5, repeat: repeatLoop };
  const kpiHover = prefersReducedMotion ? {} : { scale: 1.05, y: -4, boxShadow: '0 10px 30px rgba(59, 130, 246, 0.15)' };
  const kpiTap = prefersReducedMotion ? {} : { scale: 0.95 };
  const kpiHoverGreen = prefersReducedMotion ? {} : { scale: 1.05, y: -4, boxShadow: '0 10px 30px rgba(34, 197, 94, 0.15)' };
  const kpiHoverRed = prefersReducedMotion ? {} : { scale: 1.05, y: -4, boxShadow: '0 10px 30px rgba(239, 68, 68, 0.15)' };
  const actionBtnHover = prefersReducedMotion ? {} : { scale: 1.02, y: -2 };
  const actionBtnTap = prefersReducedMotion ? {} : { scale: 0.98 };
  const listItemHover = (locked: boolean) =>
    prefersReducedMotion ? {} : { scale: locked ? 1 : 1.01, y: locked ? 0 : -2 };
  const modalBackdropAnim = prefersReducedMotion ? { opacity: 1 } : { opacity: 0 };
  const modalBackdropExit = prefersReducedMotion ? { opacity: 1 } : { opacity: 0 };
  const modalPanelInitial = prefersReducedMotion ? { y: 0 } : { y: '100%' };
  const modalPanelAnimate = prefersReducedMotion ? { y: 0 } : { y: 0 };
  const modalPanelExit = prefersReducedMotion ? { y: 0 } : { y: '100%' };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (historiqueAbortRef.current) {
        historiqueAbortRef.current.abort();
        historiqueAbortRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (location.state?.filter) {
      const filter = location.state.filter;
      if (filter === 'submitted' || filter === 'approved' || filter === 'rejected') {
        setActiveFilter(filter);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!selectedIdentification) {
      setHistoriqueActeur([]);
      return;
    }

    const ident = identifications.find((x) => x.id === selectedIdentification);
    if (!ident?.acteurId) {
      if (isMountedRef.current) {
        setHistoriqueActeur([]);
        setLoadingHistorique(false);
      }
      return;
    }

    if (historiqueAbortRef.current) historiqueAbortRef.current.abort();
    const controller = new AbortController();
    historiqueAbortRef.current = controller;

    setLoadingHistorique(true);
    (async () => {
      try {
        let data: any;
        try {
          data = await apiRequest<any>(API_URL, `/users/${ident.acteurId}/historique`, { method: 'GET', signal: controller.signal });
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
          console.warn('[SuiviIdentifications] historique HTTP error:', (err as Error)?.message);
          return;
        }
        if (!isMountedRef.current) return;
        const hist = data?.historique;
        const list = Array.isArray(hist) ? hist : [];
        if (isMountedRef.current) setHistoriqueActeur(list);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[SuiviIdentifications] historique fetch failed:', err instanceof Error ? err.message : err);
      } finally {
        if (isMountedRef.current) setLoadingHistorique(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedIdentification, identifications]);

  useEffect(() => {
    if (!selectedIdentification) return;
    detailOpenFocusRef.current = document.activeElement as HTMLElement | null;
  }, [selectedIdentification]);

  const mesIdentifications = useMemo(
    () => identifications.filter((i) => i.statut !== 'brouillon'),
    [identifications]
  );

  const stats = getStatsIdentificateur(user?.id || '');

  const approvedCount = useMemo(
    () => mesIdentifications.filter((i) => normalizeStatut(i.statut) === 'approved').length,
    [mesIdentifications]
  );
  const rejectedCount = useMemo(
    () => mesIdentifications.filter((i) => normalizeStatut(i.statut) === 'rejected').length,
    [mesIdentifications]
  );

  const filteredIdentifications = useMemo(() => {
    let list = mesIdentifications;
    if (activeFilter !== 'all') {
      list = list.filter((i) => normalizeStatut(i.statut) === activeFilter);
    }
    if (selectedRole !== 'all') {
      list = list.filter((i) => i.typeActeur === selectedRole);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const digits = searchQuery.replace(/\s/g, '');
      list = list.filter(
        (i) =>
          (i.acteurNom || '').toLowerCase().includes(q) ||
          (i.telephone || '').includes(digits)
      );
    }
    return list;
  }, [mesIdentifications, activeFilter, selectedRole, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleConsulter = (ident: Identification) => {
    const canView = !!(ident.acteurId && peutConsulterActeur(ident.acteurId));
    if (!canView) {
      const { raison } = normalizeAccess(false);
      toast.error('Accès refusé', { description: raison });
      return;
    }
    setSelectedIdentification(ident.id);
  };

  const closeFiltresModal = useCallback(() => {
    setShowRapports(false);
    requestAnimationFrame(() => {
      try {
        filtresTriggerRef.current?.focus();
      } catch {
        /* noop */
      }
    });
  }, []);

  const closeDetailModal = useCallback(() => {
    const el = detailOpenFocusRef.current;
    setSelectedIdentification(null);
    detailOpenFocusRef.current = null;
    requestAnimationFrame(() => {
      try {
        if (el && typeof el.focus === 'function') el.focus();
      } catch {
        /* noop */
      }
    });
  }, []);

  useEffect(() => {
    if (!showRapports) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFiltresModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showRapports, closeFiltresModal]);

  useEffect(() => {
    if (!selectedIdentification) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDetailModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIdentification, closeDetailModal]);

  return (
    <SubPageLayout
      role="identificateur"
      title="Suivi"
      rightContent={
        <div className="flex items-center gap-3">
          <NotificationButton />
          <motion.button
            ref={filtresTriggerRef}
            type="button"
            aria-label="Ouvrir les filtres"
            onClick={() => setShowRapports(!showRapports)}
            className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center"
            whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          >
            <Filter className="w-5 h-5 text-gray-700" aria-hidden="true" />
          </motion.button>
        </div>
      }
    >
      <div className="pb-32 lg:pb-8 px-4 max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-[#F5F0ED] to-white">
        <div
          className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
          role="status"
          aria-live="polite"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-900">
            {
              'Écran sensible. Données personnelles identifiées affichées. Ne pas capturer ni partager cet écran.'
            }
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <motion.button
            type="button"
            aria-label="Afficher toutes les identifications"
            onClick={() => {
              setActiveFilter('all');
              toast('Affichage de toutes les identifications');
            }}
            className={`relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 ${
              activeFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-blue-200'
            } text-left cursor-pointer`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            whileHover={kpiHover}
            whileTap={kpiTap}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Total</p>
              <motion.div
                className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
                animate={kpiIconAnim}
                transition={kpiIconTransition}
              >
                <UserCheck className="w-5 h-5 text-blue-600" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
            </div>
            <motion.p
              className="text-3xl font-bold text-blue-600"
              animate={kpiScaleAnim}
              transition={kpiScaleTransition}
            >
              {stats.total}
            </motion.p>
            {activeFilter === 'all' && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full" />
            )}
          </motion.button>

          <motion.button
            type="button"
            aria-label="Filtrer les identifications approuvées"
            onClick={() => {
              setActiveFilter('approved');
              if (approvedCount === 0) {
                toast.success('Aucune identification approuvée');
              } else {
                toast(`${approvedCount} identification${approvedCount > 1 ? 's' : ''} approuvée${approvedCount > 1 ? 's' : ''}`);
              }
            }}
            className={`relative bg-gradient-to-br from-green-50 via-white to-green-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 ${
              activeFilter === 'approved' ? 'border-green-500 ring-2 ring-green-300' : 'border-green-200'
            } text-left cursor-pointer`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            whileHover={kpiHoverGreen}
            whileTap={kpiTap}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Approuvés</p>
              <motion.div
                className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
                animate={approvedCount > 0 && !prefersReducedMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={kpiGreenScaleTransition}
              >
                <CheckCircle2 className="w-5 h-5 text-green-600" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
            </div>
            <motion.p
              className="text-3xl font-bold text-green-600"
              animate={approvedCount > 0 && !prefersReducedMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={kpiGreenScaleTransition}
            >
              {approvedCount}
            </motion.p>
            {activeFilter === 'approved' && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-500 rounded-full" />
            )}
          </motion.button>

          <motion.button
            type="button"
            aria-label="Filtrer les identifications rejetées"
            onClick={() => {
              setActiveFilter('rejected');
              if (rejectedCount === 0) {
                toast.success('Aucune identification rejetée');
              } else {
                toast(`${rejectedCount} identification${rejectedCount > 1 ? 's' : ''} rejetée${rejectedCount > 1 ? 's' : ''}`);
              }
            }}
            className={`relative bg-gradient-to-br from-red-50 via-white to-red-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 ${
              activeFilter === 'rejected' ? 'border-red-500 ring-2 ring-red-300' : 'border-red-200'
            } text-left cursor-pointer`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            whileHover={kpiHoverRed}
            whileTap={kpiTap}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Rejetés</p>
              <motion.div
                className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"
                animate={rejectedCount > 0 && !prefersReducedMotion ? { rotate: [0, 5, -5, 0] } : { rotate: 0 }}
                transition={kpiIconTransition}
              >
                <XCircle className="w-5 h-5 text-red-600" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
            </div>
            <motion.p
              className="text-3xl font-bold text-red-600"
              animate={rejectedCount > 0 && !prefersReducedMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={kpiIconTransition}
            >
              {rejectedCount}
            </motion.p>
            {activeFilter === 'rejected' && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-red-500 rounded-full" />
            )}
          </motion.button>
        </div>

        <motion.div
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            type="button"
            onClick={() => {
              navigate('/identificateur/rapports');
            }}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#9F8170] transition-colors"
            whileHover={actionBtnHover}
            whileTap={actionBtnTap}
          >
            <Download className="w-5 h-5 text-[#9F8170]" aria-hidden="true" />
            <span className="font-semibold text-gray-700">Rapports</span>
          </motion.button>

          <motion.button
            type="button"
            disabled
            aria-label="Performance bientôt disponible"
            onClick={undefined}
            className="flex cursor-not-allowed items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-gray-200 bg-white opacity-50 transition-colors"
            whileHover={{}}
            whileTap={{}}
          >
            <Trophy className="w-5 h-5 text-[#9F8170] opacity-50" aria-hidden="true" />
            <span className="font-semibold text-gray-700">Performance (bientôt)</span>
          </motion.button>
        </motion.div>

        <motion.div className="mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              aria-label="Rechercher une identification"
              placeholder="Rechercher par nom ou numéro…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none"
            />
          </div>
        </motion.div>

        <div className="space-y-3">
          {filteredIdentifications.map((ident, index) => {
            const row = ident as IdentificationWithMarche;
            const isLocked = !ident.acteurId || !peutConsulterActeur(ident.acteurId);
            const typeColor = getActorTypeColor(ident.typeActeur);

            return (
              <motion.div
                key={ident.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${
                  isLocked ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : index * 0.03 }}
                whileHover={listItemHover(isLocked)}
                layout
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: typeColor }}
                  >
                    {(ident.acteurNom || '?').charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{ident.acteurNom || '-'}</p>
                        <p className="text-xs text-gray-600">{ident.activite}</p>
                      </div>
                      {isLocked && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100">
                          <Lock className="w-3 h-3 text-orange-600" aria-hidden="true" />
                          <span className="text-xs text-orange-700 font-medium">Hors zone</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-3 h-3 text-gray-500" aria-hidden="true" />
                      <span className="text-xs text-gray-600">{row.marche || ident.commune || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            normalizeStatut(ident.statut) === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : normalizeStatut(ident.statut) === 'submitted'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {normalizeStatut(ident.statut) === 'approved' && (
                            <CheckCircle2 className="w-3 h-3 inline mr-1" aria-hidden="true" />
                          )}
                          {normalizeStatut(ident.statut) === 'submitted' && (
                            <Clock className="w-3 h-3 inline mr-1" aria-hidden="true" />
                          )}
                          {normalizeStatut(ident.statut) === 'rejected' && (
                            <XCircle className="w-3 h-3 inline mr-1" aria-hidden="true" />
                          )}
                          {normalizeStatut(ident.statut) === 'approved'
                            ? 'Validé'
                            : normalizeStatut(ident.statut) === 'submitted'
                              ? 'En cours'
                              : 'Rejeté'}
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(ident.dateIdentification)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConsulter(ident)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                        style={{
                          backgroundColor: isLocked ? '#FED7AA' : `${PRIMARY_COLOR}20`,
                          color: isLocked ? '#C2410C' : PRIMARY_COLOR,
                        }}
                      >
                        {isLocked ? (
                          <Lock className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <Eye className="w-3 h-3" aria-hidden="true" />
                        )}
                        {isLocked ? 'Restreint' : 'Consulter'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredIdentifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
              aria-live="polite"
            >
              <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" aria-hidden="true" />
              <p className="text-lg font-semibold text-gray-600">Aucune identification trouvée</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? 'Essaie une autre recherche' : 'Commence par identifier des acteurs'}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showRapports && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-6"
            initial={modalBackdropAnim}
            animate={{ opacity: 1 }}
            exit={modalBackdropExit}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            onClick={closeFiltresModal}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={filtresTitleId}
              className="bg-white rounded-t-3xl lg:rounded-3xl w-full lg:max-w-md p-6"
              initial={modalPanelInitial}
              animate={modalPanelAnimate}
              exit={modalPanelExit}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 id={filtresTitleId} className="text-xl font-bold text-gray-900">
                  Filtres
                </h2>
                <button
                  type="button"
                  aria-label="Fermer la fenêtre"
                  onClick={closeFiltresModal}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-700" aria-hidden="true" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">{'Type d’acteur'}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('all')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      selectedRole === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('marchand')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                      selectedRole === 'marchand' ? 'text-white' : 'bg-orange-50 text-orange-700'
                    }`}
                    style={{ backgroundColor: selectedRole === 'marchand' ? '#C66A2C' : undefined }}
                  >
                    <Store className="w-4 h-4" aria-hidden="true" />
                    Marchands
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('producteur')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                      selectedRole === 'producteur' ? 'text-white' : 'bg-green-50 text-green-700'
                    }`}
                    style={{ backgroundColor: selectedRole === 'producteur' ? '#2E8B57' : undefined }}
                  >
                    <Sprout className="w-4 h-4" aria-hidden="true" />
                    Producteurs
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">Statut</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      activeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('submitted')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      activeFilter === 'submitted' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    <Clock className="w-3 h-3 inline mr-1" aria-hidden="true" />
                    Soumis
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('approved')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      activeFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 inline mr-1" aria-hidden="true" />
                    Approuvé
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('rejected')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      activeFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    <XCircle className="w-3 h-3 inline mr-1" aria-hidden="true" />
                    Rejeté
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={closeFiltresModal}
                className="w-full py-3 rounded-xl text-white font-semibold"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                Appliquer les filtres
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIdentification && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-6"
            initial={modalBackdropAnim}
            animate={{ opacity: 1 }}
            exit={modalBackdropExit}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            onClick={closeDetailModal}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={detailTitleId}
              className="bg-white rounded-t-3xl lg:rounded-3xl w-full lg:max-w-md max-h-[85vh] overflow-y-auto"
              initial={modalPanelInitial}
              animate={modalPanelAnimate}
              exit={modalPanelExit}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 id={detailTitleId} className="text-xl font-bold text-gray-900">
                    {'Détails'}
                  </h2>
                  <button
                    type="button"
                    aria-label="Fermer la fenêtre"
                    onClick={closeDetailModal}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-700" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const ident = mesIdentifications.find((x) => x.id === selectedIdentification);
                    if (!ident) return <p className="text-gray-500">Dossier introuvable.</p>;
                    const row = ident as IdentificationWithMarche;
                    const canModify = !!(ident.acteurId && peutConsulterActeur(ident.acteurId));
                    const typeColor = getActorTypeColor(ident.typeActeur);
                    const histRows = Array.isArray(historiqueActeur) ? historiqueActeur : [];

                    return (
                      <>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                          <p className="font-bold text-gray-900">{ident.acteurNom || '-'}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                          <p className="font-medium text-gray-900">{ident.telephone}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Type</p>
                          <div
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white font-medium"
                            style={{ backgroundColor: typeColor }}
                          >
                            {ident.typeActeur === 'marchand' ? (
                              <Store className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Sprout className="w-4 h-4" aria-hidden="true" />
                            )}
                            {ident.typeActeur}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Activité</p>
                          <p className="font-medium text-gray-900">{ident.activite || '-'}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Zone</p>
                          <p className="font-medium text-gray-900">{row.marche || ident.commune || '-'}</p>
                        </div>

                        {/* Q10 backlog : réactiver une section CNI quand le backend expose un champ officiel et son statut de vérification. */}

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Statut</p>
                          <div
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium ${
                              normalizeStatut(ident.statut) === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : normalizeStatut(ident.statut) === 'submitted'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {normalizeStatut(ident.statut) === 'approved'
                              ? 'Validé'
                              : normalizeStatut(ident.statut) === 'submitted'
                                ? 'En cours'
                                : 'Rejeté'}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Commission</p>
                          <p className="font-bold text-gray-900 text-lg">
                            {(ident.commission || 0).toLocaleString('fr-FR')}
                            {' '}FCFA
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {ident.commissionPayee ? 'Versée' : 'En attente de versement'}
                          </p>
                        </div>

                        <div className="pt-4 border-t">
                          <p className="text-xs text-gray-500">
                            {'Identifié le '}
                            {formatDateLong(ident.dateIdentification)}
                          </p>
                        </div>

                        <div className="pt-4 border-t">
                          <p className="text-sm font-bold text-gray-900 mb-3">Historique des modifications</p>
                          {loadingHistorique && (
                            <p className="text-sm text-gray-400 text-center py-2">Chargement…</p>
                          )}
                          {!loadingHistorique && histRows.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-2">Aucun historique disponible</p>
                          )}
                          {!loadingHistorique &&
                            histRows.map((h) => (
                              <div key={h.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{h.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDateLong(h.date)}
                                    {' à '}
                                    {formatTimeShort(h.date)}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>

                        {canModify && (
                          <button
                            type="button"
                            onClick={() => {
                              closeDetailModal();
                              navigate(`/identificateur/acteur/${ident.acteurId || ident.telephone}`);
                            }}
                            className="w-full mt-6 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                            style={{ backgroundColor: PRIMARY_COLOR }}
                          >
                            <Edit2 className="w-5 h-5" aria-hidden="true" />
                            Modifier les informations
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}
