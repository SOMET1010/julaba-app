/**
 * MesDonnees.tsx — Écran « Mes données » pour la marchande.
 *
 * Initialise la conformité visible à la loi ivoirienne n°2013-450 sur la
 * protection des données à caractère personnel. La conformité technique
 * (chiffrement AES-256-GCM, anonymisation prouvée par invariant, fin du
 * takeover `0000`) était déjà solide ; il manquait une politique VISIBLE
 * pour les utilisatrices — c'est l'objet de cet écran.
 *
 * Voice-first (Constitution §1) : un bouton micro lit la synthèse à voix
 * haute via Tata Nanti Lou, parce que la cible première est la marchande
 * non-lectrice. La Doctrine voice-first (Patrick, 20/09/2026) interdit
 * qu'une information importante existe uniquement sous forme de texte.
 *
 * A11y : tous les boutons portent un `aria-label` explicite ; les modales
 * de confirmation piègent le focus (focus trap) et se ferment avec Échap.
 *
 * TS strict : aucun `any`. Toutes les valeurs externes sont typées.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, Volume2, ChevronRight, FileText, Trash2, AlertTriangle,
  Eye, Pencil, Ban, X, Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useTranslation, Trans } from 'react-i18next';

import { SubPageLayout } from '../../components/layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { supprimerCompte } from '../../services/api/auth-api';

// ─── Types ────────────────────────────────────────────────────

type Droit = 'acces' | 'rectification' | 'opposition';

// ─── Données affichées (synthèse lisible, pas le markdown complet) ─
//
// Les libellés et détails sont tirés via i18next (clés `mesDonnees.donneesGardees.*`
// et `mesDonnees.finalites.*` dans `i18n/locales/fr.json`). On ne stocke ici que
// la structure (clé i18n + icône éventuelle) pour permettre la traduction sans
// dupliquer les chaînes françaises dans le code.

interface DonneeGardee {
  cle: 'telephone' | 'nom' | 'photo' | 'activite' | 'caisse' | 'keiwa' | 'nin' | 'geoloc' | 'pin' | 'preferences' | 'audit';
}

const DONNEES_GARDEES: readonly DonneeGardee[] = [
  { cle: 'telephone' },
  { cle: 'nom' },
  { cle: 'photo' },
  { cle: 'activite' },
  { cle: 'caisse' },
  { cle: 'keiwa' },
  { cle: 'nin' },
  { cle: 'geoloc' },
  { cle: 'pin' },
  { cle: 'preferences' },
  { cle: 'audit' },
];

interface Finalite {
  cle: 'telephone' | 'nom' | 'photo' | 'stock' | 'nin' | 'geoloc' | 'pin' | 'audit';
}

const FINALITES: readonly Finalite[] = [
  { cle: 'telephone' },
  { cle: 'nom' },
  { cle: 'photo' },
  { cle: 'stock' },
  { cle: 'nin' },
  { cle: 'geoloc' },
  { cle: 'pin' },
  { cle: 'audit' },
];

// Sections de la politique de confidentialité — clés i18n numérotées 1..15.
const SECTIONS_POLITIQUE_CLES: readonly (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15)[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

// ─── Focus trap simple (a11y) ──────────────────────────────────

/**
 * Piège le focus clavier à l'intérieur d'un élément tant que `active` est vrai.
 * Indispensable pour les modales : un utilisateur clavier ne doit pas pouvoir
 * tabuler vers un bouton caché derrière la modale.
 */
function useFocusTrap(ref: React.RefObject<HTMLDivElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;

    const focusables = node.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', handleKey);
    return () => node.removeEventListener('keydown', handleKey);
  }, [active, ref]);
}

// ─── Modale de suppression de compte (confirmation double) ─────

interface ModalSuppressionProps {
  isOpen: boolean;
  onClose: () => void;
  onSupprime: () => void;
  speak: (text: string) => void;
}

function ModalSuppression({ isOpen, onClose, onSupprime, speak }: ModalSuppressionProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useFocusTrap(ref, isOpen);

  // Réinitialiser l'état à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Fermer avec Échap
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleConfirm = async () => {
    if (password.length < 4) {
      setError(t('mesDonnees.modalSuppressionErreurCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await supprimerCompte(password);
      if (r.etat === 'session_expiree') {
        setError(t('mesDonnees.modalSuppressionErreurSession'));
        return;
      }
      if (r.etat === 'erreur_metier') {
        setError(r.message || 'Erreur');
        return;
      }
      toast.success(t('mesDonnees.toastCompteAnonymise'));
      speak(t('mesDonnees.voixCompteAnonymise'));
      onSupprime();
    } catch {
      setError(t('mesDonnees.modalSuppressionErreurReseau'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-5"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            ref={ref}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 pb-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="suppression-titre"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

            {step === 1 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" aria-hidden="true" />
                </div>
                <h3 id="suppression-titre" className="text-xl font-bold text-center mb-2 text-gray-900">
                  {t('mesDonnees.modalSuppressionTitre')}
                </h3>
                <p className="text-sm text-gray-700 text-center mb-3">
                  <Trans i18nKey="mesDonnees.modalSuppressionTexteDefinitif"
                    components={{ gras: <span className="font-bold text-red-600" /> }}
                  />
                </p>
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 mb-4">
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <Trans i18nKey="mesDonnees.modalSuppressionAttention"
                      components={{ gras: <span className="font-bold" /> }}
                    />
                  </p>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    onClick={onClose}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
                    aria-label={t('mesDonnees.modalSuppressionAriaAnnuler')}
                  >
                    {t('common.annuler')}
                  </motion.button>
                  <motion.button
                    onClick={() => setStep(2)}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white"
                    aria-label={t('mesDonnees.modalSuppressionAriaContinuer')}
                  >
                    {t('common.continuer')}
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <h3 id="suppression-titre" className="text-xl font-bold text-center mb-2 text-gray-900">
                  {t('mesDonnees.modalSuppressionConfirmeTitre')}
                </h3>
                <p className="text-sm text-gray-700 text-center mb-6">
                  {t('mesDonnees.modalSuppressionConfirmeIndice')}
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••"
                  aria-label={t('mesDonnees.modalSuppressionAriaCode')}
                  className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-2xl border-2 border-gray-200 focus:border-red-400 focus:outline-none mb-3"
                />
                {error && (
                  <p role="alert" className="text-sm text-red-600 text-center mb-3">{error}</p>
                )}
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setStep(1)}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
                    aria-label={t('mesDonnees.modalSuppressionAriaRetour')}
                  >
                    {t('common.retour')}
                  </motion.button>
                  <motion.button
                    onClick={() => void handleConfirm()}
                    whileTap={{ scale: 0.97 }}
                    disabled={loading}
                    className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white disabled:opacity-50"
                    aria-label={t('mesDonnees.modalSuppressionAriaConfirmer')}
                  >
                    {loading ? t('mesDonnees.modalSuppressionBoutonSupprimerEnCours') : t('mesDonnees.modalSuppressionBoutonSupprimer')}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Modale « Voir la politique complète » ────────────────────

interface ModalPolitiqueProps {
  isOpen: boolean;
  onClose: () => void;
}

function ModalPolitique({ isOpen, onClose }: ModalPolitiqueProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-3"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            ref={ref}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 pb-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="politique-titre"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="politique-titre" className="text-xl font-bold text-gray-900">
                {t('mesDonnees.modalPolitiqueTitre')}
              </h3>
              <button
                onClick={onClose}
                aria-label={t('mesDonnees.modalPolitiqueAriaFermer')}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              {t('mesDonnees.modalPolitiqueSousTitre')}
            </p>

            <ol className="space-y-3">
              {SECTIONS_POLITIQUE_CLES.map((num) => (
                <li key={num} className="border-l-2 pl-3" style={{ borderColor: '#C46210' }}>
                  <p className="font-semibold text-gray-900 text-sm">
                    {num}. {t(`mesDonnees.politiqueSections.${num}.titre`)}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                    {t(`mesDonnees.politiqueSections.${num}.resume`)}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-5 p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600 leading-relaxed">
                <Trans i18nKey="mesDonnees.modalPolitiqueTexte"
                  components={{
                    fichier: <code className="text-[10px] bg-white px-1 py-0.5 rounded">docs/POLITIQUE-CONFIDENTIALITE.md</code>,
                    dpo: <span className="font-semibold">dpo@julaba.online</span>,
                  }}
                />
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-5 py-3 rounded-2xl bg-[#C46210] text-white font-bold"
              aria-label={t('mesDonnees.modalPolitiqueAriaFermer')}
            >
              {t('mesDonnees.modalPolitiqueBouton')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Composant principal ──────────────────────────────────────

export function MesDonnees() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { speak } = useApp();
  const [showSuppression, setShowSuppression] = useState(false);
  const [showPolitique, setShowPolitique] = useState(false);

  const COLOR = '#C46210'; // Couleur marchand (cf. ROLE_CONFIG marchand)

  const lireVoixHaute = () => {
    const texte = [
      t('mesDonnees.voixSyntheseIntro'),
      t('mesDonnees.voixSyntheseDonnees'),
      t('mesDonnees.voixSyntheseRaison'),
      t('mesDonnees.voixSyntheseDroits'),
      t('mesDonnees.voixSyntheseSuppression'),
    ].join(' ');
    speak(texte);
  };

  const exercerDroit = (droit: Droit) => {
    switch (droit) {
      case 'acces':
        toast.success(t('mesDonnees.toastAccesEnregistre'));
        speak(t('mesDonnees.voixAccesEnregistre'));
        break;
      case 'rectification':
        speak(t('mesDonnees.voixRectification'));
        navigate('/marchand/profil');
        break;
      case 'opposition':
        toast.success(t('mesDonnees.toastOppositionEnregistre'));
        speak(t('mesDonnees.voixOppositionEnregistre'));
        break;
    }
  };

  return (
    <SubPageLayout
      role="marchand"
      title={t('mesDonnees.titre')}
      subtitle={t('mesDonnees.sousTitre')}
      rightContent={
        <button
          onClick={lireVoixHaute}
          aria-label={t('mesDonnees.ariaLireVoixHaute')}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: COLOR }}
        >
          <Mic className="w-5 h-5" aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-4 max-w-2xl mx-auto">

        {/* Bandeau d'introduction */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-4 flex items-start gap-3"
          style={{ backgroundColor: `${COLOR}10`, border: `1px solid ${COLOR}25` }}
        >
          <Volume2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: COLOR }} aria-hidden="true" />
          <p className="text-sm leading-relaxed" style={{ color: '#5C3A1A' }}>
            <span className="font-bold">{t('mesDonnees.introTataPeutTeLire')}</span>{' '}
            {t('mesDonnees.introToucheBouton')} {t('mesDonnees.introDroitSavoir')}
          </p>
        </motion.div>

        {/* Section 1 — Quelles données JULABA garde sur moi */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden"
        >
          <div
            className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
            style={{ background: `linear-gradient(90deg, ${COLOR}10 0%, transparent 100%)` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}15` }}>
              <Eye className="w-5 h-5" style={{ color: COLOR }} aria-hidden="true" />
            </div>
            <h3 className="font-bold text-gray-900">{t('mesDonnees.sectionDonneesTitre')}</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {DONNEES_GARDEES.map((d) => (
              <li key={d.cle} className="px-5 py-3 flex items-start justify-between gap-4">
                <p className="font-semibold text-gray-900 text-sm">{t(`mesDonnees.donneesGardees.${d.cle}.label`)}</p>
                <p className="text-xs text-gray-500 text-right max-w-[55%]">{t(`mesDonnees.donneesGardees.${d.cle}.detail`)}</p>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Section 2 — Pourquoi JULABA les garde */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden"
        >
          <div
            className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
            style={{ background: `linear-gradient(90deg, ${COLOR}10 0%, transparent 100%)` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}15` }}>
              <FileText className="w-5 h-5" style={{ color: COLOR }} aria-hidden="true" />
            </div>
            <h3 className="font-bold text-gray-900">{t('mesDonnees.sectionFinalitesTitre')}</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {FINALITES.map((f) => (
              <li key={f.cle} className="px-5 py-3 flex items-center gap-3">
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${COLOR}15`, color: COLOR }}
                >
                  {t(`mesDonnees.finalites.${f.cle}.donnee`)}
                </span>
                <p className="text-sm text-gray-700">{t(`mesDonnees.finalites.${f.cle}.raison`)}</p>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Section 3 — Mes droits */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden"
        >
          <div
            className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
            style={{ background: `linear-gradient(90deg, ${COLOR}10 0%, transparent 100%)` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}15` }}>
              <Shield className="w-5 h-5" style={{ color: COLOR }} aria-hidden="true" />
            </div>
            <h3 className="font-bold text-gray-900">{t('mesDonnees.sectionDroitsTitre')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <button
              onClick={() => exercerDroit('acces')}
              aria-label={t('mesDonnees.ariaDroitAcces')}
              className="rounded-2xl border-2 p-4 text-left hover:bg-gray-50 transition-colors"
              style={{ borderColor: `${COLOR}30` }}
            >
              <Eye className="w-5 h-5 mb-2" style={{ color: COLOR }} aria-hidden="true" />
              <p className="font-semibold text-sm text-gray-900">{t('mesDonnees.droitAccesTitre')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('mesDonnees.droitAccesDescription')}</p>
            </button>
            <button
              onClick={() => exercerDroit('rectification')}
              aria-label={t('mesDonnees.ariaDroitRectification')}
              className="rounded-2xl border-2 p-4 text-left hover:bg-gray-50 transition-colors"
              style={{ borderColor: `${COLOR}30` }}
            >
              <Pencil className="w-5 h-5 mb-2" style={{ color: COLOR }} aria-hidden="true" />
              <p className="font-semibold text-sm text-gray-900">{t('mesDonnees.droitRectificationTitre')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('mesDonnees.droitRectificationDescription')}</p>
            </button>
            <button
              onClick={() => setShowSuppression(true)}
              aria-label={t('mesDonnees.ariaDroitSuppression')}
              className="rounded-2xl border-2 p-4 text-left hover:bg-red-50 transition-colors"
              style={{ borderColor: '#FECACA' }}
            >
              <Trash2 className="w-5 h-5 mb-2 text-red-500" aria-hidden="true" />
              <p className="font-semibold text-sm text-red-600">{t('mesDonnees.droitSuppressionTitre')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('mesDonnees.droitSuppressionDescription')}</p>
            </button>
            <button
              onClick={() => exercerDroit('opposition')}
              aria-label={t('mesDonnees.ariaDroitOpposition')}
              className="rounded-2xl border-2 p-4 text-left hover:bg-gray-50 transition-colors"
              style={{ borderColor: `${COLOR}30` }}
            >
              <Ban className="w-5 h-5 mb-2" style={{ color: COLOR }} aria-hidden="true" />
              <p className="font-semibold text-sm text-gray-900">{t('mesDonnees.droitOppositionTitre')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('mesDonnees.droitOppositionDescription')}</p>
            </button>
          </div>
        </motion.section>

        {/* Section 4 — Supprimer mon compte (bloc dédié, rouge) */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 rounded-3xl border-2 border-red-200 p-5"
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-500" aria-hidden="true" />
            <div>
              <h3 className="font-bold text-red-700">{t('mesDonnees.sectionSuppressionTitre')}</h3>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                <Trans i18nKey="mesDonnees.sectionSuppressionDescription"
                  components={{ gras: <span className="font-bold" /> }}
                />
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSuppression(true)}
            className="w-full py-3 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
            aria-label={t('mesDonnees.ariaSupprimerCompteConfirme')}
          >
            <Trash2 className="w-5 h-5" aria-hidden="true" />
            {t('mesDonnees.boutonSupprimerMonCompte')}
          </button>
        </motion.section>

        {/* Section 5 — Lien politique complète */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowPolitique(true)}
          whileTap={{ scale: 0.99 }}
          className="w-full bg-white rounded-3xl border-2 border-gray-100 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          aria-label={t('mesDonnees.ariaVoirPolitiqueComplete')}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}15` }}>
              <FileText className="w-5 h-5" style={{ color: COLOR }} aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">{t('mesDonnees.lienVoirPolitiqueTitre')}</p>
              <p className="text-xs text-gray-500">{t('mesDonnees.lienVoirPolitiqueSousTitre')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </motion.button>

        {/* Mention ANSUT + ICONE */}
        <p className="text-[10px] text-gray-400 text-center leading-relaxed pt-2">
          {t('mesDonnees.mentionAnsut')}
        </p>
      </div>

      <ModalSuppression
        isOpen={showSuppression}
        onClose={() => setShowSuppression(false)}
        onSupprime={() => navigate('/')}
        speak={speak}
      />
      <ModalPolitique
        isOpen={showPolitique}
        onClose={() => setShowPolitique(false)}
      />
    </SubPageLayout>
  );
}

export default MesDonnees;
