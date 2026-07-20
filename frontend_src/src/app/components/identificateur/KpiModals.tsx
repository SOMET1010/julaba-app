import React, { useId, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Users,
  Target,
  TrendingUp,
  Calendar,
  Download,
  Mail,
  MessageCircle,
  Printer,
  CheckCircle2,
  FileText,
  Award,
  Zap,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const repeatLoop = prefersReducedMotion ? 0 : Infinity;

function formatCurrentMonthLabel(): string {
  const now = new Date();
  const formatted = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (!formatted) return '';
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getProgressPercent(
  achieved: number | undefined | null,
  target: number | undefined | null
): number {
  if (achieved == null || target == null || target <= 0) return 0;
  if (!Number.isFinite(achieved) || !Number.isFinite(target)) return 0;
  return Math.min(Math.max(0, (achieved / target) * 100), 100);
}

export interface KpiModalProps {
  show: boolean;
  onClose: () => void;
  onDownload: () => void;
  onShare: (platform: 'whatsapp' | 'email' | 'print') => void;
  total?: number;
  validees?: number;
  tauxValidation?: number;
  nbMarchands?: number;
  nbProducteurs?: number;
  objectif?: number;
  moyenne?: number;
}

interface KpiModalWrapperProps {
  show: boolean;
  onClose: () => void;
  title: string;
  showBetaBanner?: boolean;
  children: React.ReactNode;
}

function KpiModalWrapper({ show, onClose, title, showBetaBanner = false, children }: KpiModalWrapperProps) {
  const reactId = useId();
  const modalTitleId = `kpi-modal-title-${reactId.replace(/:/g, '')}`;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleCloseProxied = useCallback(() => {
    const el = triggerElementRef.current;
    triggerElementRef.current = null;
    try {
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
    } catch {
      /* noop */
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!show) return;
    triggerElementRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      if (isMountedRef.current) {
        closeButtonRef.current?.focus();
      }
    });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseProxied();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [show, handleCloseProxied]);

  if (!show) return null;

  const btnHover = prefersReducedMotion ? {} : { scale: 1.1, rotate: 90 };
  const btnTap = prefersReducedMotion ? {} : { scale: 0.9 };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 lg:items-center lg:p-4">
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        onClick={handleCloseProxied}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl lg:max-h-[85vh] lg:rounded-3xl"
        initial={{ y: prefersReducedMotion ? 0 : '100%', opacity: prefersReducedMotion ? 1 : 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: prefersReducedMotion ? 0 : '100%', opacity: prefersReducedMotion ? 1 : 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 rounded-t-3xl border-b-2 border-gray-200 bg-white px-6 py-4 lg:rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 id={modalTitleId} className="text-xl font-bold text-gray-900">
              {title}
            </h2>
            <motion.button
              ref={closeButtonRef}
              type="button"
              aria-label="Fermer la fenêtre"
              onClick={handleCloseProxied}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
              whileHover={btnHover}
              whileTap={btnTap}
            >
              <X className="h-5 w-5 text-gray-600" aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {showBetaBanner ? (
          <div
            className="mx-6 mb-4 mt-4 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3"
            role="status"
            aria-live="polite"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" aria-hidden="true" />
            <p className="text-sm font-medium text-orange-900">
              Certaines métriques (zones couvertes, points XP, classement, performance moyenne) sont en cours de
              développement. Les valeurs réelles seront disponibles bientôt.
            </p>
          </div>
        ) : null}

        <span className="sr-only" aria-live="polite" />

        <div className="space-y-6 p-6 pt-4">{children}</div>
      </motion.div>
    </div>
  );
}

function KpiModalActions({
  onShare,
}: {
  onShare: (platform: 'whatsapp' | 'email' | 'print') => void;
}) {
  const cardHover = prefersReducedMotion ? {} : { scale: 1.02, y: -2 };
  const cardTap = prefersReducedMotion ? {} : { scale: 0.98 };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">Actions disponibles</p>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          disabled
          aria-label="Export PDF bientôt disponible"
          className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border-2 border-[#9F8170] bg-gradient-to-r from-[#9F8170] to-[#B39485] px-4 py-3.5 font-semibold text-white opacity-50 shadow-lg"
          whileHover={undefined}
          whileTap={undefined}
        >
          <Download className="h-5 w-5 opacity-50" aria-hidden="true" />
          <span>PDF (bientôt)</span>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => onShare('print')}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-300 bg-white px-4 py-3.5 font-semibold text-gray-700 hover:border-[#9F8170]"
          whileHover={cardHover}
          whileTap={cardTap}
        >
          <Printer className="h-5 w-5" aria-hidden="true" />
          <span>Imprimer</span>
        </motion.button>
      </div>

      <div className="border-t-2 border-gray-200 pt-2">
        <p className="mb-3 text-xs font-semibold text-gray-600">Partager via</p>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            type="button"
            onClick={() => onShare('whatsapp')}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366] bg-[#25D366] px-4 py-3.5 font-semibold text-white shadow-lg"
            whileHover={cardHover}
            whileTap={cardTap}
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span>WhatsApp</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => onShare('email')}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-blue-600 bg-blue-600 px-4 py-3.5 font-semibold text-white shadow-lg"
            whileHover={cardHover}
            whileTap={cardTap}
          >
            <Mail className="h-5 w-5" aria-hidden="true" />
            <span>Email</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function KpiMoisModal({
  show,
  onClose,
  onDownload: _onDownload,
  onShare,
  total = 0,
  validees = 0,
  tauxValidation = 0,
  nbMarchands = 0,
  nbProducteurs = 0,
  objectif = 0,
  moyenne: _moyenne = 0,
}: KpiModalProps) {
  const monthLabel = formatCurrentMonthLabel();
  const pct = Math.round(getProgressPercent(total, objectif));
  const iconWiggle = prefersReducedMotion
    ? { rotate: 0 }
    : { rotate: [0, 5, -5, 0] };
  const cardHover = prefersReducedMotion ? {} : { scale: 1.02, y: -2 };

  return (
    <KpiModalWrapper show={show} onClose={onClose} title="Identifications du mois" showBetaBanner>
      <>
        <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="flex items-start gap-4">
            <motion.div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg"
              animate={iconWiggle}
              transition={{ duration: 3, repeat: repeatLoop }}
            >
              <Users className="h-8 w-8 text-white" strokeWidth={2.5} aria-hidden="true" />
            </motion.div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-gray-900">{total || 0} Identifications</h3>
              <p className="mb-3 text-sm text-gray-600">
                {monthLabel} - Mois en cours
              </p>
              <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  {objectif > 0
                    ? `Objectif ${total >= objectif ? 'atteint' : 'en cours'} (${pct}%)`
                    : 'Objectif non défini'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h4 className="font-bold text-gray-900">Qu\u2019est-ce que ce chiffre repr\u00e9sente\u202f?</h4>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">
            Ce chiffre repr\u00e9sente le <span className="font-bold">nombre total d\u2019acteurs identifi\u00e9s</span>{' '}
            durant le mois en cours ({monthLabel}). Il inclut \u00e0 la fois les{' '}
            <span className="font-bold text-[#C66A2C]">marchands</span> et les{' '}
            <span className="font-bold text-[#16A34A]">producteurs</span> que tu as enregistr\u00e9s dans le syst\u00e8me
            Julaba. Chaque identification valid\u00e9e contribue \u00e0 ton score Julaba.
          </p>
        </div>

        {/* TODO RapportsIdentificateur audit : filtrer marchands/producteurs/validees par mois courant (helper isCurrentMonth) avant de passer en props - Q9 backlog */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4"
            whileHover={cardHover}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C66A2C]/20">
                <Users className="h-5 w-5 text-[#C66A2C]" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-gray-600">Marchands</p>
            </div>
            <p className="text-3xl font-bold text-[#C66A2C]">{nbMarchands || 0}</p>
            <p className="mt-1 text-xs text-gray-500">Ce mois</p>
          </motion.div>

          <motion.div
            className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-4"
            whileHover={cardHover}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16A34A]/20">
                <Users className="h-5 w-5 text-[#16A34A]" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-gray-600">Producteurs</p>
            </div>
            <p className="text-3xl font-bold text-[#16A34A]">{nbProducteurs || 0}</p>
            <p className="mt-1 text-xs text-gray-500">Ce mois</p>
          </motion.div>
        </div>

        <div className="space-y-4 rounded-3xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
          <h4 className="flex items-center gap-2 font-bold text-gray-900">
            <BarChart3 className="h-5 w-5 text-[#9F8170]" aria-hidden="true" />
            Statistiques d\u00e9taill\u00e9es
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="mb-1 text-xs text-gray-500">Zones couvertes</p>
              <p className="text-lg font-bold text-blue-600">12</p>
              <p className="mt-1 text-xs text-gray-500">Territoires diff\u00e9rents</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="mb-1 text-xs text-gray-500">Identifications valid\u00e9es</p>
              <p className="text-lg font-bold text-purple-600">{validees || 0}</p>
              <p className="mt-1 text-xs text-gray-500">ce mois</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="mb-1 text-xs text-gray-500">Meilleure journ\u00e9e</p>
              <p className="text-lg font-bold text-indigo-600">Donn\u00e9es indisponibles</p>
              <p className="mt-1 text-xs text-gray-500">Moyenne journali\u00e8re</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="mb-1 text-xs text-gray-500">Taux validation</p>
              <p className="text-lg font-bold text-green-600">{tauxValidation || 0}%</p>
              <p className="mt-1 text-xs text-gray-500">Dossiers approuv\u00e9s</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" aria-hidden="true" />
            <h4 className="font-bold text-gray-900">Ton impact</h4>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" aria-hidden="true" />
              <span>
                Tu as aid\u00e9 <span className="font-bold">{total || 0} acteurs vivriers</span> \u00e0 rejoindre
                l\u2019\u00e9conomie formelle
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" aria-hidden="true" />
              <span>
                Ton score Julaba a augment\u00e9 de <span className="font-bold text-[#9F8170]">+580 points XP</span>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" aria-hidden="true" />
              <span>
                Tu es dans le <span className="font-bold">Top 15%</span> des identificateurs de ta r\u00e9gion
              </span>
            </p>
          </div>
        </div>

        <KpiModalActions onShare={onShare} />
      </>
    </KpiModalWrapper>
  );
}
export function KpiObjectifModal({
  show,
  onClose,
  onDownload: _onDownload,
  onShare,
  total = 0,
  validees: _validees = 0,
  tauxValidation: _tauxValidation = 0,
  nbMarchands: _nbMarchands = 0,
  nbProducteurs: _nbProducteurs = 0,
  objectif = 0,
  moyenne: _moyenne = 0,
}: KpiModalProps) {
  const pctRounded = Math.round(getProgressPercent(total, objectif));
  const iconPulse = prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.05, 1] };
  const cardHover = prefersReducedMotion ? {} : { scale: 1.02, y: -2 };

  return (
    <KpiModalWrapper show={show} onClose={onClose} title="Atteinte des objectifs" showBetaBanner={false}>
      <>
        <div className="rounded-3xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-5">
          <div className="flex items-start gap-4">
            <motion.div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg"
              animate={iconPulse}
              transition={{ duration: 2, repeat: repeatLoop }}
            >
              <Target className="h-8 w-8 text-white" strokeWidth={2.5} aria-hidden="true" />
            </motion.div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-gray-900">{pctRounded}% d\u2019atteinte</h3>
              <p className="mb-3 text-sm text-gray-600">
                {objectif > 0 && total >= objectif ? 'Objectif atteint sur la p\u00e9riode' : 'Objectif en progression'}
              </p>
              {objectif > 0 && total >= objectif ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">
                  <Award className="h-4 w-4" aria-hidden="true" />
                  <span>Performance exceptionnelle\u202f!</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h4 className="font-bold text-gray-900">Qu\u2019est-ce que ce chiffre repr\u00e9sente\u202f?</h4>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">
            Ce pourcentage indique le <span className="font-bold">taux d\u2019atteinte de tes objectifs mensuels</span>.
            Ton objectif est de <span className="font-bold text-blue-600">{objectif || 0} identifications</span> pour
            la p\u00e9riode en cours, et tu as r\u00e9alis\u00e9{' '}
            <span className="font-bold text-green-600">{total || 0} identifications</span>
            {total >= objectif && objectif > 0 ? (
              <>
                , soit{' '}
                <span className="font-bold">{Math.max(total - objectif, 0)} identification(s) suppl\u00e9mentaire(s)</span>
                . Ce d\u00e9passement te permet d\u2019obtenir des{' '}
                <span className="font-bold text-purple-600">primes exceptionnelles</span> et d\u2019am\u00e9liorer
                significativement ton score Julaba.
              </>
            ) : objectif > 0 ? (
              <>
                . Il te reste{' '}
                <span className="font-bold text-orange-600">{Math.max(objectif - total, 0)} identification(s)</span>{' '}
                pour atteindre ton objectif.
              </>
            ) : (
              <>. Aucun objectif n\u2019est d\u00e9fini pour cette p\u00e9riode.</>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4"
            whileHover={cardHover}
          >
            <div className="mb-2 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <p className="text-xs font-semibold text-gray-600">Objectif fix\u00e9</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">{objectif || 0}</p>
            <p className="mt-1 text-xs text-gray-500">Identifications attendues</p>
          </motion.div>

          <motion.div
            className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-4"
            whileHover={cardHover}
          >
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
              <p className="text-xs font-semibold text-gray-600">R\u00e9alis\u00e9</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{total || 0}</p>
            <p className="mt-1 text-xs text-gray-500">Identifications valid\u00e9es</p>
          </motion.div>
        </div>

        <div className="rounded-3xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
          <h4 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <Calendar className="h-5 w-5 text-[#9F8170]" aria-hidden="true" />
            Progression
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Taux d\u2019atteinte</span>
            <span className="text-lg font-bold text-blue-600">{pctRounded}%</span>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-blue-500"
              style={{ width: `${Math.round(getProgressPercent(total, objectif))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {total} / {objectif} identifications
          </p>
        </div>

        <div className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" aria-hidden="true" />
            <h4 className="font-bold text-gray-900">R\u00e9compenses</h4>
          </div>
          {total >= objectif && objectif > 0 ? (
            <p className="text-sm font-medium text-green-600">
              Objectif atteint\u202f! Contacte ton superviseur pour tes r\u00e9compenses.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Les r\u00e9compenses seront d\u00e9bloqu\u00e9es une fois ton objectif atteint.
            </p>
          )}
        </div>

        <KpiModalActions onShare={onShare} />
      </>
    </KpiModalWrapper>
  );
}

export function KpiMoyenneModal({
  show,
  onClose,
  onDownload: _onDownload,
  onShare,
  total = 0,
  validees: _validees = 0,
  tauxValidation: _tauxValidation = 0,
  nbMarchands: _nbMarchands = 0,
  nbProducteurs: _nbProducteurs = 0,
  objectif: _objectif = 0,
  moyenne = 0,
}: KpiModalProps) {
  const monthLabel = formatCurrentMonthLabel();
  const iconWiggle = prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 5, -5, 0] };
  const cardHover = prefersReducedMotion ? {} : { scale: 1.02, y: -2 };

  return (
    <KpiModalWrapper show={show} onClose={onClose} title="Moyenne journali\u00e8re" showBetaBanner>
      <>
        <div className="rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-start gap-4">
            <motion.div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg"
              animate={iconWiggle}
              transition={{ duration: 3, repeat: repeatLoop }}
            >
              <TrendingUp className="h-8 w-8 text-white" strokeWidth={2.5} aria-hidden="true" />
            </motion.div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-bold text-gray-900">{moyenne || 0} identifications/jour</h3>
              <p className="mb-3 text-sm text-gray-600">Moyenne calcul\u00e9e sur {monthLabel}</p>
              <div className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                <span>+5% par rapport au mois dernier</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" aria-hidden="true" />
            <h4 className="font-bold text-gray-900">Qu\u2019est-ce que ce chiffre repr\u00e9sente\u202f?</h4>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">
            Ce chiffre repr\u00e9sente ta <span className="font-bold">moyenne d\u2019identifications par jour travaill\u00e9</span>{' '}
            durant le mois en cours. Il est calcul\u00e9 en divisant le nombre total d\u2019identifications ({total || 0}) par
            le nombre de jours travaill\u00e9s (22 jours). Cette m\u00e9trique est importante car elle permet
            d\u2019\u00e9valuer ta <span className="font-bold text-[#9F8170]">r\u00e9gularit\u00e9</span> et ta{' '}
            <span className="font-bold text-blue-600">productivit\u00e9 quotidienne</span>. Plus cette moyenne est
            \u00e9lev\u00e9e et stable, plus tu optimises ton temps de travail.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <motion.div
            className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-3"
            whileHover={cardHover}
          >
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              <p className="text-xs font-semibold text-gray-600">Meilleur</p>
            </div>
            <p className="text-2xl font-bold text-indigo-600">Donn\u00e9es indisponibles</p>
            <p className="mt-1 text-xs text-gray-500">N/A</p>
          </motion.div>

          <motion.div
            className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3"
            whileHover={cardHover}
          >
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <p className="text-xs font-semibold text-gray-600">Moyenne</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{moyenne || 0}</p>
            <p className="mt-1 text-xs text-gray-500">par jour</p>
          </motion.div>

          <motion.div
            className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-3"
            whileHover={cardHover}
          >
            <div className="mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-600" aria-hidden="true" />
              <p className="text-xs font-semibold text-gray-600">Minimum</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">Donn\u00e9es indisponibles</p>
            <p className="mt-1 text-xs text-gray-500">N/A</p>
          </motion.div>
        </div>

        <div className="rounded-3xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
          <h4 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <Calendar className="h-5 w-5 text-[#9F8170]" aria-hidden="true" />
            Performance par jour
          </h4>
          <p className="text-sm text-gray-500">
            Les statistiques sont calcul\u00e9es \u00e0 partir des donn\u00e9es identificateur disponibles.
          </p>
        </div>

        <KpiModalActions onShare={onShare} />
      </>
    </KpiModalWrapper>
  );
}
