import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  TrendingUp,
  Target,
  Users,
  UserPlus,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import { useApp } from '../../contexts/AppContext';
import { ROLE_COLORS } from '../../config/roleConfig';
import { Card } from '../ui/card';
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';
import { BarreRechercheDynamique, ActeurRecherche } from '../shared/BarreRechercheDynamique';
import tataLouImg from '../../../assets/images/tantie-identificateur.png';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';

const LOG_PREFIX = '[IdentificateurHome]';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const repeatLoop = prefersReducedMotion ? 0 : Infinity;

function getProgressPercent(
  achieved: number | undefined | null,
  target: number | undefined | null
): number {
  if (achieved == null || target == null || target <= 0) return 0;
  if (!Number.isFinite(achieved) || !Number.isFinite(target)) return 0;
  return Math.min(Math.max(0, (achieved / target) * 100), 100);
}

function safeNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchDraftsCount(userId: string, signal?: AbortSignal): Promise<number> {
  try {
    const data = await apiRequest<any>(API_URL, `/identifications/drafts/${userId}`, { method: 'GET', signal });
    return Array.isArray(data?.drafts) ? data.drafts.length : 0;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 0;
    if ((e as Error)?.name === 'AbortError') return 0;
    console.warn(`${LOG_PREFIX} fetchDraftsCount failed:`, e instanceof Error ? e.message : e);
    return 0;
  }
}

export function IdentificateurHome() {
  const navigate = useNavigate();
  const { user: currentUser, setIsModalOpen } = useApp();
  const { stats: ctxStats, getMesIdentifications } = useIdentificateur();

  const [showNotifications, setShowNotifications] = useState(false);
  const [countDraft, setCountDraft] = useState(0);

  const isMountedRef = useRef(true);
  const searchAbortRef = useRef<AbortController | null>(null);
  const draftAbortRef = useRef<AbortController | null>(null);

  const mesIdentifications = useMemo(() => getMesIdentifications(), [getMesIdentifications]);

  const { countSubmitted, countApproved, countRejected } = useMemo(() => {
    let submitted = 0;
    let approved = 0;
    let rejected = 0;
    for (const i of mesIdentifications) {
      if (['soumis', 'en_attente', 'complement'].includes(i.statut)) submitted += 1;
      else if (['validee', 'valide', 'approuve'].includes(i.statut)) approved += 1;
      else if (['rejetee', 'rejete'].includes(i.statut)) rejected += 1;
    }
    return {
      countSubmitted: submitted,
      countApproved: approved,
      countRejected: rejected,
    };
  }, [mesIdentifications]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      searchAbortRef.current?.abort();
      draftAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      draftAbortRef.current?.abort();
      setCountDraft(0);
      return;
    }
    draftAbortRef.current?.abort();
    const ac = new AbortController();
    draftAbortRef.current = ac;
    void (async () => {
      const n = await fetchDraftsCount(currentUser.id, ac.signal);
      if (!isMountedRef.current) return;
      setCountDraft(n);
    })();
    return () => {
      ac.abort();
    };
  }, [currentUser?.id]);

  const handleSearch = useCallback(
    async (query: string): Promise<ActeurRecherche[]> => {
      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) return [];

      const myZoneId = currentUser?.zoneId || null;
      if (!myZoneId) {
        console.warn(`${LOG_PREFIX} zoneId pas encore chargé, recherche reportée`);
        return [];
      }

      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;
      const { signal } = ac;

      try {
        let data: any;
        try {
          data = await apiRequest<any>(API_URL, `/users/search-identificateur?q=${encodeURIComponent(trimmed)}&limit=10`, { method: 'GET', signal });
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return [];
          if (!isMountedRef.current) return [];
          console.warn(`${LOG_PREFIX} search HTTP error:`, (err as Error)?.message);
          toast.error('La recherche a échoué. Réessaie dans un instant.');
          return [];
        }
        if (!isMountedRef.current) return [];
        const users = Array.isArray(data?.results) ? data.results : [];
        return users.map((u: Record<string, unknown>) => {
          const acteurZoneId = (u.zoneId ?? u.zone_id) as string | undefined;
          const horsZone = !acteurZoneId || acteurZoneId !== myZoneId;
          return {
            id: String(u.id ?? ''),
            nom: String(u.lastName ?? u.last_name ?? ''),
            prenoms: String(u.firstName ?? u.first_name ?? ''),
            telephone: String(u.phone ?? ''),
            numero: String(u.phone ?? '')
              .replace(/\D/g, '')
              .slice(-10),
            role: String(u.role ?? 'marchand'),
            activite: String(u.activity ?? ''),
            marche: String(u.market ?? ''),
            commune: String(u.commune ?? ''),
            statut: u.validated ? 'approved' : 'soumis',
            photo: (u.photoUrl ?? u.photo ?? null) as string | null,
            zoneId: acteurZoneId,
            zoneNom: String(u.market ?? ''),
            horsZone,
          };
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return [];
        console.warn(`${LOG_PREFIX} search failed:`, err instanceof Error ? err.message : err);
        if (isMountedRef.current) {
          toast.error('La recherche a échoué. Réessaie dans un instant.');
        }
        return [];
      }
    },
    [currentUser]
  );

  const handleSelect = useCallback(
    (acteur: ActeurRecherche) => {
      navigate(`/identificateur/acteur/${acteur.id || acteur.numero}`);
      setIsModalOpen(false);
    },
    [navigate, setIsModalOpen]
  );

  const handleNonEnrole = useCallback(
    (_query: string) => {
      navigate('/identificateur/fiche-identification');
      setIsModalOpen(false);
    },
    [navigate, setIsModalOpen]
  );

  const handleCounterClick = (filter: string) => {
    if (filter === 'draft') {
      navigate('/identificateur/brouillons');
      return;
    }
    navigate('/identificateur/suivi', { state: { filter } });
  };

  if (!currentUser?.id) {
    return (
      <div className="min-h-[40vh] px-4 py-16 text-center text-gray-600 font-medium">Chargement</div>
    );
  }

  const zoneAttribuee = currentUser.zoneNom || currentUser.market || 'Zone non définie';
  const objectifProgressPct = getProgressPercent(ctxStats.total, ctxStats.objectifMois);
  const tauxVal = safeNumber(ctxStats.tauxValidation);
  const tauxDisplay = tauxVal != null ? `${Math.round(tauxVal)}%` : '0%';

  const counterHover = prefersReducedMotion ? {} : { y: -4, scale: 1.02 };
  const counterTap = prefersReducedMotion ? {} : { scale: 0.98 };
  const zoneBadgeHover = prefersReducedMotion ? {} : { scale: 1.02 };
  const kpiCardHover = prefersReducedMotion ? {} : { y: -4 };
  const missionCardHover = prefersReducedMotion ? {} : { scale: 1.01 };
  const ctaHover = prefersReducedMotion ? {} : { scale: 1.02, y: -4 };
  const ctaTap = prefersReducedMotion ? {} : { scale: 0.98 };

  return (
    <>
      <NotificationsPanel
        userId={currentUser.id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        accentColor={ROLE_COLORS.identificateur}
        userRole="identificateur"
      />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <NotifBellButton
          userId={currentUser.id}
          accentColor={ROLE_COLORS.identificateur}
          variant="solid"
          onOpen={() => setShowNotifications(true)}
        />
      </div>
      <div className="mx-auto min-h-screen max-w-2xl bg-gradient-to-b from-[#9F8170]/5 via-white to-gray-50 px-4 pb-32 pt-16 lg:max-w-7xl lg:pb-8 lg:pl-[320px] lg:pt-10">
        {/* Card Tata Lou */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { type: 'spring', stiffness: 300, damping: 20 }}
          className="mb-8"
        >
          <div className="flex items-stretch gap-2">
            <motion.div className="flex flex-shrink-0 items-center">
              <motion.img
                src={tataLouImg}
                alt="Tata Lou"
                className="h-auto w-36 object-contain"
                whileHover={prefersReducedMotion ? {} : { scale: 1.05, rotate: 2 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              />
            </motion.div>

            <Card
              className="relative flex-1 overflow-hidden rounded-3xl border-2 px-4 py-5 shadow-lg"
              style={{ borderColor: ROLE_COLORS.identificateur }}
            >
              <motion.div
                className="absolute inset-0 opacity-5"
                style={{
                  background: `linear-gradient(135deg, ${ROLE_COLORS.identificateur}FF 0%, ${ROLE_COLORS.identificateur}99 100%)`,
                  willChange: prefersReducedMotion ? 'auto' : 'transform',
                }}
                animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: repeatLoop }}
              />

              <div className="relative z-10 flex h-full flex-col gap-4">
                <motion.h3
                  className="font-black leading-none text-gray-900"
                  style={{ fontSize: '28px' }}
                  initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.2 }}
                >
                  Tata Lou
                </motion.h3>

                <motion.p
                  className="flex-1 text-xl leading-snug text-gray-600"
                  initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.3 }}
                >
                  Bonjour {currentUser.prenoms || 'identificateur'}
                  {'\u202f'}! Ta zone {zoneAttribuee} a {ctxStats.total} identifications enregistrées.
                </motion.p>
              </div>
            </Card>
          </div>
        </motion.div>

        <div
          className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
          role="status"
          aria-live="polite"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-900">
            {'Écran sensible. Ne pas capturer ni partager cet écran.'}
          </p>
        </div>

        <motion.div
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { delay: 0.1 }}
          className="mb-6"
          style={{ position: 'relative', zIndex: 50 }}
        >
          <BarreRechercheDynamique
            primaryColor={ROLE_COLORS.identificateur}
            placeholder={'Tape un numéro ou un nom\u2026'}
            onSearch={handleSearch}
            onSelect={handleSelect}
            onNonEnrole={handleNonEnrole}
            showCompteur={true}
          />
        </motion.div>

        <motion.button
          type="button"
          aria-label="Ouvrir le formulaire de nouvelle identification"
          onClick={() => {
            navigate('/identificateur/fiche-identification');
            setIsModalOpen(false);
          }}
          className="relative mb-6 w-full cursor-pointer overflow-hidden rounded-3xl border-2 border-[#9F8170] bg-gradient-to-r from-[#9F8170] via-[#B39485] to-[#9F8170] p-6 text-left shadow-2xl"
          style={{
            appearance: 'none',
            color: 'inherit',
            cursor: 'pointer',
            font: 'inherit',
            padding: 0,
            textAlign: 'left',
            width: '100%',
          }}
          whileHover={ctaHover}
          whileTap={ctaTap}
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { delay: 0.15 }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
            aria-hidden="true"
            animate={prefersReducedMotion ? { x: '0%' } : { x: ['-100%', '100%'] }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: 3,
                    repeat: repeatLoop,
                    ease: 'linear',
                  }
            }
          />

          <div className="relative z-10 flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <motion.div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 shadow-xl backdrop-blur-sm"
                animate={
                  prefersReducedMotion
                    ? { scale: 1, rotate: 0 }
                    : {
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }
                }
                transition={{ duration: 2, repeat: repeatLoop }}
              >
                <UserPlus className="h-8 w-8 text-white" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-xl font-bold text-white">Nouveau dossier</h3>
                <p className="text-sm font-medium text-white/90">Identifier un nouvel acteur vivrier</p>
              </div>
            </div>
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-sm"
              animate={prefersReducedMotion ? { x: 0 } : { x: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: repeatLoop }}
            >
              <ArrowRight className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
            </motion.div>
          </div>
        </motion.button>

        <motion.div
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { delay: 0.2 }}
          className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <motion.button
            type="button"
            aria-label={`Voir mes brouillons (${countDraft} éléments)`}
            onClick={() => handleCounterClick('draft')}
            className="relative rounded-3xl border-2 border-gray-100 bg-white p-3 text-left shadow-lg transition-all hover:shadow-xl"
            whileHover={counterHover}
            whileTap={counterTap}
          >
            <span className="mb-1 block text-xs font-semibold text-gray-500">Brouillons</span>
            <p className="text-2xl font-black text-gray-900">{countDraft}</p>

            <motion.div
              animate={prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 2, repeat: repeatLoop, repeatDelay: 1 }}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100"
            >
              <Clock className="h-6 w-6 text-gray-600" aria-hidden="true" />
            </motion.div>
          </motion.button>

          <motion.button
            type="button"
            aria-label={`Voir les identifications en attente (${countSubmitted} éléments)`}
            onClick={() => handleCounterClick('submitted')}
            className="relative rounded-3xl border-2 border-orange-100 bg-white p-3 text-left shadow-lg transition-all hover:shadow-xl"
            whileHover={counterHover}
            whileTap={counterTap}
          >
            <span className="mb-1 block text-xs font-semibold text-gray-500">En attente</span>
            <p className="text-2xl font-black text-orange-600">{countSubmitted}</p>

            <motion.div
              animate={
                prefersReducedMotion
                  ? { scale: 1, rotate: 0 }
                  : { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
              }
              transition={{ duration: 2, repeat: repeatLoop, repeatDelay: 0.5 }}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-orange-100"
            >
              <Clock className="h-6 w-6 text-orange-600" aria-hidden="true" />
            </motion.div>
          </motion.button>

          <motion.button
            type="button"
            aria-label={`Voir les identifications validées (${countApproved} éléments)`}
            onClick={() => handleCounterClick('approved')}
            className="relative rounded-3xl border-2 border-green-100 bg-white p-3 text-left shadow-lg transition-all hover:shadow-xl"
            whileHover={counterHover}
            whileTap={counterTap}
          >
            <span className="mb-1 block text-xs font-semibold text-gray-500">Validés</span>
            <p className="text-2xl font-black text-green-600">{countApproved}</p>

            <motion.div
              animate={prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 360] }}
              transition={{ duration: 3, repeat: repeatLoop, ease: 'linear' }}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-green-100"
            >
              <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
            </motion.div>
          </motion.button>

          <motion.button
            type="button"
            aria-label={`Voir les identifications rejetées (${countRejected} éléments)`}
            onClick={() => handleCounterClick('rejected')}
            className="relative rounded-3xl border-2 border-red-100 bg-white p-3 text-left shadow-lg transition-all hover:shadow-xl"
            whileHover={counterHover}
            whileTap={counterTap}
          >
            <span className="mb-1 block text-xs font-semibold text-gray-500">Rejetés</span>
            <p className="text-2xl font-black text-red-600">{countRejected}</p>

            <motion.div
              animate={
                prefersReducedMotion
                  ? { x: 0, rotate: 0 }
                  : {
                      x: [-3, 3, -3],
                      rotate: [0, 5, -5, 0],
                    }
              }
              transition={{ duration: 2, repeat: repeatLoop, repeatDelay: 0.8 }}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-red-100"
            >
              <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </motion.div>
          </motion.button>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { delay: 0.3 }}
          className="rounded-3xl border-2 border-[#9F8170]/20 bg-gradient-to-br from-[#9F8170]/10 via-white to-[#9F8170]/5 p-6 shadow-lg"
        >
          <div className="mb-6 flex items-center gap-3">
            <motion.div
              animate={prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: repeatLoop }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#9F8170] to-[#7a6558] shadow-lg"
            >
              <MapPin className="h-6 w-6 text-white" aria-hidden="true" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900">Mon Territoire</h2>
          </div>

          <motion.div
            whileHover={zoneBadgeHover}
            className="mb-5 inline-block rounded-3xl border-2 border-[#9F8170]/20 bg-white p-4 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#9F8170] to-[#7a6558] shadow-md">
                <MapPin className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Zone assignée</p>
                <p className="text-lg font-bold text-gray-900">{zoneAttribuee}</p>
              </div>
            </div>
          </motion.div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <motion.div
              whileHover={kpiCardHover}
              className="rounded-3xl border-2 border-blue-100 bg-white p-5 text-center shadow-md"
            >
              <motion.div
                animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: repeatLoop }}
              >
                <Users className="mx-auto mb-2 h-6 w-6 text-blue-600" aria-hidden="true" />
              </motion.div>
              <p className="text-2xl font-bold text-gray-900">{ctxStats.total}</p>
              <p className="mt-1 text-xs font-semibold text-gray-600">Identifications</p>
            </motion.div>
            <motion.div
              whileHover={kpiCardHover}
              className="rounded-3xl border-2 border-green-100 bg-white p-5 text-center shadow-md"
            >
              <motion.div
                animate={prefersReducedMotion ? { y: 0 } : { y: [-2, 2, -2] }}
                transition={{ duration: 2, repeat: repeatLoop }}
              >
                <TrendingUp className="mx-auto mb-2 h-6 w-6 text-green-600" aria-hidden="true" />
              </motion.div>
              <p className="text-2xl font-bold text-gray-900">{tauxDisplay}</p>
              <p className="mt-1 text-xs font-semibold text-gray-600">Taux validation</p>
            </motion.div>
            <motion.div
              whileHover={kpiCardHover}
              className="rounded-3xl border-2 border-orange-100 bg-white p-5 text-center shadow-md"
            >
              <motion.div
                animate={prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: repeatLoop }}
              >
                <Target className="mx-auto mb-2 h-6 w-6 text-orange-600" aria-hidden="true" />
              </motion.div>
              <p className="text-2xl font-bold text-gray-900">{ctxStats.enAttente}</p>
              <p className="mt-1 text-xs font-semibold text-gray-600">En cours</p>
            </motion.div>
          </div>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? {} : { delay: 0.4 }}
            className="mt-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" aria-hidden="true" />
              <h3 className="text-sm font-bold text-gray-900">Missions en cours</h3>
            </div>
            {ctxStats.objectifMois > 0 ? (
              <motion.div
                whileHover={missionCardHover}
                className="rounded-3xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-5 shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">Objectif mensuel</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Identifier {ctxStats.objectifMois} nouveaux acteurs ce mois
                    </p>
                  </div>
                  {ctxStats.primeObjectif > 0 ? (
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">
                        {ctxStats.primeObjectif.toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="text-xs font-semibold text-gray-600">Prime</p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-orange-300 bg-orange-200">
                    <motion.div
                      initial={{
                        width: prefersReducedMotion ? `${objectifProgressPct}%` : 0,
                      }}
                      animate={{ width: `${objectifProgressPct}%` }}
                      transition={
                        prefersReducedMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut' }
                      }
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
                    />
                  </div>
                  <span className="min-w-[60px] text-right text-sm font-bold text-gray-900">
                    {ctxStats.total}/{ctxStats.objectifMois}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-3xl border-2 border-gray-200 bg-gray-50 p-5 text-center">
                <p className="text-sm font-medium text-gray-600">
                  Aucun objectif défini pour cette période
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Ton superviseur fixera bientôt ton objectif mensuel
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
