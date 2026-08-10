import { SubPageLayout } from '../layout/SubPageLayout';
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  MapPin,
  Users,
  TrendingUp,
  Award,
  Calendar,
  UserPlus,
  Eye,
  Clock,
  Target,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../contexts/UserContext';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import { useZones } from '../../contexts/ZoneContext';
import { useApp } from '../../contexts/AppContext';

const PRIMARY_COLOR = '#9F8170';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const repeatLoop = prefersReducedMotion ? 0 : Infinity;

function isCurrentMonth(iso: string | undefined | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatDateSafe(iso: string | undefined | null): string {
  if (!iso) return 'Date inconnue';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'Date inconnue';
  return d.toLocaleDateString('fr-FR');
}

function getActorTypeColor(type: string): string {
  switch (type) {
    case 'marchand':
      return '#C66A2C';
    case 'producteur':
      return '#2E8B57';
    case 'cooperative':
      return '#2E5B8B';
    case 'institution':
      return '#5B2E8B';
    default:
      return PRIMARY_COLOR;
  }
}

function getProgressPercent(
  achieved: number | undefined | null,
  target: number | undefined | null
): number {
  if (achieved == null || target == null || target <= 0) return 0;
  if (!Number.isFinite(achieved) || !Number.isFinite(target)) return 0;
  return Math.min(Math.max(0, (achieved / target) * 100), 100);
}

function getStatusChipConfig(statut: string): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  if (['valide', 'validee', 'approuve'].includes(statut)) {
    return {
      label: 'Validé',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    };
  }
  if (['en_attente', 'soumis', 'complement'].includes(statut)) {
    return {
      label: 'En cours',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
    };
  }
  if (['rejete', 'rejetee'].includes(statut)) {
    return {
      label: 'Rejeté',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
    };
  }
  return {
    label: 'Brouillon',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  };
}

export function IdentificateurDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getMesIdentifications, getStatsIdentificateur, getMissionsActives } = useIdentificateur();
  const { getZoneById } = useZones();
  const { setAppTitle } = useApp();

  const mesIdentifications = useMemo(() => getMesIdentifications(), [getMesIdentifications]);

  const missionsActives = useMemo(() => getMissionsActives(), [getMissionsActives]);

  const missionsActivesAffichees = useMemo(
    () => missionsActives.slice(0, 2),
    [missionsActives]
  );

  const stats = useMemo(
    () => getStatsIdentificateur(user?.id || user?.phone || ''),
    [getStatsIdentificateur, user?.id, user?.phone]
  );

  const validatesCeMois = useMemo(() => {
    return mesIdentifications.filter(
      (i) =>
        ['validee', 'valide', 'approuve'].includes(i.statut) &&
        isCurrentMonth(i.dateIdentification)
    ).length;
  }, [mesIdentifications]);

  const mesIdentificationsRecentes = useMemo(() => {
    return [...mesIdentifications]
      .sort((a, b) => {
        const ta = new Date(a.dateIdentification).getTime();
        const tb = new Date(b.dateIdentification).getTime();
        const fa = Number.isFinite(ta) ? ta : 0;
        const fb = Number.isFinite(tb) ? tb : 0;
        if (fb !== fa) return fb - fa;
        return String(b.id).localeCompare(String(a.id));
      })
      .slice(0, 5);
  }, [mesIdentifications]);

  useEffect(() => {
    setAppTitle('Tableau de bord');
    return () => {
      setAppTitle('JULABA');
    };
  }, [setAppTitle]);

  if (!user) {
    return (
      <SubPageLayout role="identificateur" title="Tableau de bord">
        <div className="p-6 text-gray-600 font-medium">Chargement</div>
      </SubPageLayout>
    );
  }

  const zoneAttribuee = user.zoneNom || user.market || 'Zone non définie';
  const zoneId = user.zoneId || '';
  const zone = getZoneById(zoneId);

  const moisActuel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const kpiCardHover = prefersReducedMotion ? {} : { y: -4, scale: 1.02 };
  const missionCardHover = prefersReducedMotion ? {} : { scale: 1.01 };
  const identCardHover = prefersReducedMotion ? {} : { x: 4, scale: 1.01 };
  const zoneMiniCardHover = prefersReducedMotion ? {} : { y: -4 };
  const headerBtnHover = prefersReducedMotion ? {} : { scale: 1.05 };
  const headerBtnTap = prefersReducedMotion ? {} : { scale: 0.95 };
  const ctaHover = prefersReducedMotion ? {} : { scale: 1.02, y: -4 };
  const ctaTap = prefersReducedMotion ? {} : { scale: 0.98 };
  const emptyBtnHover = prefersReducedMotion ? {} : { scale: 1.05 };
  const emptyBtnTap = prefersReducedMotion ? {} : { scale: 0.95 };

  return (
    <SubPageLayout role="identificateur" title="Tableau de bord">
      <div className="min-h-screen bg-gradient-to-b from-[#9F8170]/5 via-white to-gray-50 pb-24 lg:pl-[320px]">
        {/* Header avec Zone */}
        <div className="p-6 bg-white/80 backdrop-blur-sm border-b-2 border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold">Bienvenue,</p>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">
                {user.prenoms} {user.nom}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <MapPin
                  className="w-4 h-4"
                  style={{ color: PRIMARY_COLOR }}
                  aria-hidden="true"
                />
                <span className="text-sm font-bold" style={{ color: PRIMARY_COLOR }}>
                  {zoneAttribuee}
                </span>
              </div>
            </div>
            <motion.button
              type="button"
              aria-label="Nouvelle identification"
              onClick={() => navigate('/identificateur/fiche-identification')}
              className="px-5 py-3 rounded-3xl text-white font-bold shadow-lg flex items-center gap-2 border-2"
              style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
              whileTap={headerBtnTap}
              whileHover={headerBtnHover}
            >
              <UserPlus className="w-5 h-5" aria-hidden="true" />
              <span className="hidden sm:inline">Nouveau</span>
            </motion.button>
          </div>
        </div>

        <div
          className="mx-6 mt-4 mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
          role="status"
          aria-live="polite"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-900">
            Écran sensible. Ne pas capturer ni partager cet écran.
          </p>
        </div>

        {/* Mon Territoire - Stats rapides */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Mon Territoire</h2>
            <span className="text-xs text-gray-500 font-semibold">{moisActuel}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              className="bg-white rounded-3xl p-5 shadow-lg border-2 border-blue-100"
              whileHover={kpiCardHover}
            >
              <div className="flex items-center justify-between mb-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: repeatLoop }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center"
                >
                  <Users className="w-6 h-6 text-blue-600" aria-hidden="true" />
                </motion.div>
                <span className="text-xs text-gray-500 font-semibold">Total</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalIdentifications}</p>
              <p className="text-xs text-gray-600 mt-1 font-semibold">Identifications</p>
            </motion.div>

            <motion.div
              className="bg-white rounded-3xl p-5 shadow-lg border-2 border-green-100"
              whileHover={kpiCardHover}
            >
              <div className="flex items-center justify-between mb-3">
                <motion.div
                  animate={{ y: [-2, 2, -2] }}
                  transition={{ duration: 2, repeat: repeatLoop }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center"
                >
                  <TrendingUp className="w-6 h-6 text-green-600" aria-hidden="true" />
                </motion.div>
                <span className="text-xs text-gray-500 font-semibold">Ce mois</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{validatesCeMois}</p>
              <p className="text-xs text-gray-600 mt-1 font-semibold">Validées</p>
            </motion.div>

            <motion.div
              className="bg-white rounded-3xl p-5 shadow-lg border-2 border-[#9F8170]/20"
              whileHover={kpiCardHover}
            >
              <div className="flex items-center justify-between mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: repeatLoop }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9F8170]/20 to-[#9F8170]/30 flex items-center justify-center"
                >
                  <Award className="w-6 h-6" style={{ color: PRIMARY_COLOR }} aria-hidden="true" />
                </motion.div>
                <span className="text-xs text-gray-500 font-semibold">Taux</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.tauxValidation.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600 mt-1 font-semibold">Validation</p>
            </motion.div>

            <motion.div
              className="bg-white rounded-3xl p-5 shadow-lg border-2 border-orange-100"
              whileHover={kpiCardHover}
            >
              <div className="flex items-center justify-between mb-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: repeatLoop }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center"
                >
                  <Clock className="w-6 h-6 text-orange-600" aria-hidden="true" />
                </motion.div>
                <span className="text-xs text-gray-500 font-semibold">En cours</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.identificationsEnCours}</p>
              <p className="text-xs text-gray-600 mt-1 font-semibold">À valider</p>
            </motion.div>
          </div>

          {/* CTA Principal - Nouveau dossier */}
          <motion.button
            type="button"
            aria-label="Ouvrir le formulaire de nouvelle identification"
            onClick={() => {
              navigate('/identificateur/fiche-identification');
            }}
            className="relative mb-6 w-full cursor-pointer overflow-hidden rounded-3xl border-2 border-[#9F8170] bg-gradient-to-r from-[#9F8170] via-[#B39485] to-[#9F8170] p-6 text-left shadow-2xl"
            style={{
              appearance: 'none',
              font: 'inherit',
            }}
            whileHover={ctaHover}
            whileTap={ctaTap}
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.1 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
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

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border-2 border-white/30"
                  animate={
                    prefersReducedMotion
                      ? { scale: 1, rotate: 0 }
                      : {
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0],
                        }
                  }
                  transition={{
                    duration: 2,
                    repeat: repeatLoop,
                  }}
                >
                  <UserPlus className="w-8 h-8 text-white" strokeWidth={2.5} aria-hidden="true" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    Nouveau dossier
                  </h3>
                  <p className="text-sm text-white/90 font-medium">
                    Identifier un nouvel acteur vivrier
                  </p>
                </div>
              </div>
              <motion.div
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30"
                animate={prefersReducedMotion ? { x: 0 } : { x: [0, 10, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: repeatLoop,
                }}
              >
                <ArrowRight className="w-6 h-6 text-white" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
            </div>
          </motion.button>

          {/* Missions actives */}
          {missionsActives.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-orange-600" aria-hidden="true" />
                <h3 className="text-sm font-bold text-gray-900">Missions en cours</h3>
              </div>
              {missionsActivesAffichees.map((mission) => {
                const missionProgressPct = getProgressPercent(mission.progres, mission.objectif);
                return (
                  <motion.div
                    key={mission.id}
                    className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-3xl p-5 mb-3 border-2 border-orange-200 shadow-md"
                    whileHover={missionCardHover}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-base">
                          {mission.description?.trim() ? mission.description : 'Mission sans titre'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-gray-600" aria-hidden="true" />
                          <p className="text-sm text-gray-600">
                            Jusqu{'\u2019'}au {formatDateSafe(mission.dateFin)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-600">
                          {(mission.recompense || 0).toLocaleString()} FCFA
                        </p>
                        <p className="text-xs text-gray-600 font-semibold">Prime</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex-1 h-3 bg-orange-200 rounded-full overflow-hidden border-2 border-orange-300">
                        <motion.div
                          initial={{
                            width: prefersReducedMotion ? `${missionProgressPct}%` : 0,
                          }}
                          animate={{ width: `${missionProgressPct}%` }}
                          transition={
                            prefersReducedMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut' }
                          }
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 min-w-[60px] text-right">
                        {mission.progres ?? 0}/{mission.objectif ?? 0}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Dernières identifications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Dernières identifications</h3>
              <button
                type="button"
                aria-label="Voir toutes les identifications"
                onClick={() => navigate('/identificateur/suivi')}
                className="inline-flex items-center gap-1 text-xs font-bold"
                style={{ color: PRIMARY_COLOR }}
              >
                Voir tout
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              {mesIdentificationsRecentes.map((ident) => {
                const acteurNom = ident.acteurNom || 'Acteur sans nom';
                const chip = getStatusChipConfig(ident.statut);
                return (
                  <motion.div
                    key={ident.id}
                    className="bg-white rounded-3xl p-5 shadow-lg border-2 border-gray-100"
                    whileHover={identCardHover}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          role="img"
                          aria-label={`Avatar de ${acteurNom}`}
                          className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white shadow-md"
                          style={{ backgroundColor: getActorTypeColor(ident.typeActeur) }}
                        >
                          {(ident.acteurNom || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{acteurNom}</p>
                          <p className="text-xs text-gray-600 font-semibold">{ident.activite}</p>
                          <p className="text-xs text-gray-500 mt-1 font-medium">
                            {ident.typeActeur}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold ${chip.bg} ${chip.text} ${chip.border}`}
                        >
                          {chip.label}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          {formatDateSafe(ident.dateIdentification)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {mesIdentifications.length === 0 && (
                <div className="py-16 text-center">
                  <motion.div
                    animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: repeatLoop }}
                  >
                    <Eye className="mx-auto mb-4 h-16 w-16 text-gray-300" aria-hidden="true" />
                  </motion.div>
                  <p className="text-lg font-bold text-gray-600">Aucune identification</p>
                  <p className="mt-2 mb-6 text-sm text-gray-500">
                    Commence par identifier un nouvel acteur
                  </p>
                  <motion.button
                    type="button"
                    onClick={() => navigate('/identificateur/fiche-identification')}
                    className="rounded-3xl border-2 px-6 py-3 font-bold text-white shadow-lg"
                    style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
                    whileHover={emptyBtnHover}
                    whileTap={emptyBtnTap}
                  >
                    Identifier un acteur
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Infos zone */}
          {zone && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? {} : { delay: 0.2 }}
              className="mt-6 rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 p-6 shadow-lg"
            >
              <div className="mb-4 flex items-center gap-3">
                <motion.div
                  animate={prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: repeatLoop }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-md"
                >
                  <MapPin className="h-5 w-5 text-white" aria-hidden="true" />
                </motion.div>
                <h3 className="text-base font-bold text-gray-900">Informations de ma zone</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <motion.div
                  whileHover={zoneMiniCardHover}
                  className="rounded-3xl border-2 border-purple-100 bg-white p-4 shadow-md"
                >
                  <p className="text-2xl font-bold text-gray-900">{zone.nombreMarchands}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-600">Marchands</p>
                </motion.div>
                <motion.div
                  whileHover={zoneMiniCardHover}
                  className="rounded-3xl border-2 border-purple-100 bg-white p-4 shadow-md"
                >
                  <p className="text-2xl font-bold text-gray-900">{zone.nombreProducteurs}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-600">Producteurs</p>
                </motion.div>
                <motion.div
                  whileHover={zoneMiniCardHover}
                  className="rounded-3xl border-2 border-purple-100 bg-white p-4 shadow-md"
                >
                  <p className="text-2xl font-bold text-gray-900">{zone.nombreIdentificateurs}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-600">Identificateurs</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </SubPageLayout>
  );
}
