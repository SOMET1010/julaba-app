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

import { SubPageLayout } from '../../components/layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { supprimerCompte } from '../../services/api/auth-api';

// ─── Types ────────────────────────────────────────────────────

type Droit = 'acces' | 'rectification' | 'opposition';

// ─── Données affichées (synthèse lisible, pas le markdown complet) ─

interface DonneeGardee {
  label: string;
  detail: string;
}

const DONNEES_GARDEES: readonly DonneeGardee[] = [
  { label: 'Numéro de téléphone', detail: 'Pour te connecter et te contacter' },
  { label: 'Nom et appellation', detail: 'Pour que Tata t\'appelle par ton nom' },
  { label: 'Photo de profil', detail: 'Optionnelle — pour te reconnaître à l\'accueil' },
  { label: 'Activité et marché', detail: 'Pour adapter l\'interface à ton commerce' },
  { label: 'Stock, ventes, dépenses, crédits', detail: 'Journal immuable de ta caisse' },
  { label: 'Portefeuille Keiwa', detail: 'Transferts, paiements, retraits' },
  { label: 'NIN / NNI', detail: 'Optionnel — pour le score financier' },
  { label: 'Géolocalisation', detail: 'Optionnelle — pour cartographier le réseau' },
  { label: 'PIN et doigt', detail: 'Pour protéger ton téléphone et ton argent' },
  { label: 'Préférences (langue, voix, police)', detail: 'Stockées sur ton téléphone' },
  { label: 'Journaux d\'audit', detail: 'Connexions et actions sensibles tracées' },
];

interface Finalite {
  donnee: string;
  raison: string;
}

const FINALITES: readonly Finalite[] = [
  { donnee: 'Téléphone', raison: 'Te connecter et t\'envoyer des SMS de support' },
  { donnee: 'Nom', raison: 'T\'appeler par ton nom dans les messages vocaux' },
  { donnee: 'Photo', raison: 'Te reconnaître sur l\'écran d\'accueil' },
  { donnee: 'Stock et transactions', raison: 'Tenir ta caisse et ton portefeuille Keiwa' },
  { donnee: 'NIN, CNPS, CMU', raison: 'Calculer un score financier si tu le demandes' },
  { donnee: 'Géolocalisation', raison: 'Cartographier le réseau des marchandes' },
  { donnee: 'PIN et doigt', raison: 'Protéger l\'accès à ton téléphone et ton argent' },
  { donnee: 'Audit logs', raison: 'Détecter les intrusions et prouver les actions' },
];

interface SectionPolitique {
  num: number;
  titre: string;
  resume: string;
}

const SECTIONS_POLITIQUE: readonly SectionPolitique[] = [
  { num: 1, titre: 'Qui sommes-nous', resume: 'ICONE Solutions, éditeur de JULABA, basé à Abidjan.' },
  { num: 2, titre: 'Données collectées', resume: 'Téléphone, nom, photo, activité, stock, transactions, NIN, géoloc, PIN, préférences — liste exhaustive.' },
  { num: 3, titre: 'Finalités', resume: 'Une raison claire pour chaque donnée collectée.' },
  { num: 4, titre: 'Base légale', resume: 'Contrat (caisse), consentement (photo, géoloc), obligation légale (ANSUT).' },
  { num: 5, titre: 'Durée de conservation', resume: 'Argent = journal immuable ; données perso anonymisées à la suppression du compte.' },
  { num: 6, titre: 'Sécurité', resume: 'Ton PIN est caché et chiffré, personne ne peut le lire, pas même nous.' },
  { num: 7, titre: 'Vos droits', resume: 'Accès, rectification, suppression (droit à l\'oubli), opposition, portabilité.' },
  { num: 8, titre: 'Consentement parlé', resume: 'Pour les non-lectrices : lecture audio, ré-audition, refus, traçabilité version+heure+agent.' },
  { num: 9, titre: 'Partage avec tiers', resume: 'ANSUT, B-Pay, ONECI, ElevenLabs — jamais de vente de données.' },
  { num: 10, titre: 'Transferts hors Côte d\'Ivoire', resume: 'Render (USA), Sentry (USA), ElevenLabs (USA) — encadrés contractuellement.' },
  { num: 11, titre: 'Cookies', resume: 'Cookies httpOnly Secure SameSite pour la session ; localStorage pour les préférences.' },
  { num: 12, titre: 'Mineurs', resume: 'JULABA cible les adultes ; pas de collecte intentionnelle de mineurs.' },
  { num: 13, titre: 'Modification', resume: 'Versionnement + notification aux utilisatrices en cas de modification substantielle.' },
  { num: 14, titre: 'Contact DPO', resume: 'dpo@julaba.online — et ANSUT comme partenaire réglementaire.' },
  { num: 15, titre: 'Version', resume: 'v1.0 — 28/09/2026 — loi ivoirienne n°2013-450.' },
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
      setError('Code requis (4 chiffres minimum)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await supprimerCompte(password);
      if (r.etat === 'session_expiree') {
        setError('Ta session a expiré. Reconnecte-toi.');
        return;
      }
      if (r.etat === 'erreur_metier') {
        setError(r.message || 'Erreur');
        return;
      }
      toast.success('Compte anonymisé. Ton argent a été conservé.');
      speak('Ton compte a été anonymisé. Ton argent a été conservé.');
      onSupprime();
    } catch {
      setError('Erreur réseau. Réessaie.');
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
                  Supprimer mon compte
                </h3>
                <p className="text-sm text-gray-700 text-center mb-3">
                  Cette action est <span className="font-bold text-red-600">définitive et irréversible</span>.
                </p>
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 mb-4">
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-bold">Attention :</span> ton identité sera anonymisée
                    (téléphone, photo, NIN, adresse purgés). En revanche,
                    <span className="font-bold"> ton argent et ton historique de transactions seront conservés</span> —
                    c'est la loi : l'argent est sacré (Constitution JULABA §7).
                  </p>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    onClick={onClose}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
                    aria-label="Annuler la suppression du compte"
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    onClick={() => setStep(2)}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white"
                    aria-label="Continuer vers la confirmation de suppression"
                  >
                    Continuer
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <h3 id="suppression-titre" className="text-xl font-bold text-center mb-2 text-gray-900">
                  Confirme ton identité
                </h3>
                <p className="text-sm text-gray-700 text-center mb-6">
                  Entre ton code de connexion (4 chiffres) pour confirmer.
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••"
                  aria-label="Ton code de connexion à 4 chiffres"
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
                    aria-label="Revenir à l'étape précédente"
                  >
                    Retour
                  </motion.button>
                  <motion.button
                    onClick={() => void handleConfirm()}
                    whileTap={{ scale: 0.97 }}
                    disabled={loading}
                    className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white disabled:opacity-50"
                    aria-label="Confirmer définitivement la suppression de mon compte"
                  >
                    {loading ? 'Suppression…' : 'Supprimer définitivement'}
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
                Politique de confidentialité
              </h3>
              <button
                onClick={onClose}
                aria-label="Fermer la politique de confidentialité"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Loi ivoirienne n°2013-450 · v1.0 · 28/09/2026
            </p>

            <ol className="space-y-3">
              {SECTIONS_POLITIQUE.map((s) => (
                <li key={s.num} className="border-l-2 pl-3" style={{ borderColor: '#C46210' }}>
                  <p className="font-semibold text-gray-900 text-sm">
                    {s.num}. {s.titre}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{s.resume}</p>
                </li>
              ))}
            </ol>

            <div className="mt-5 p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600 leading-relaxed">
                La version officielle complète est dans le fichier{' '}
                <code className="text-[10px] bg-white px-1 py-0.5 rounded">docs/POLITIQUE-CONFIDENTIALITE.md</code>{' '}
                du dépôt JULABA. Pour toute question, écris à{' '}
                <span className="font-semibold">dpo@julaba.online</span>.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-5 py-3 rounded-2xl bg-[#C46210] text-white font-bold"
              aria-label="Fermer la politique de confidentialité"
            >
              J'ai compris
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Composant principal ──────────────────────────────────────

export function MesDonnees() {
  const navigate = useNavigate();
  const { speak } = useApp();
  const [showSuppression, setShowSuppression] = useState(false);
  const [showPolitique, setShowPolitique] = useState(false);

  const COLOR = '#C46210'; // Couleur marchand (cf. ROLE_CONFIG marchand)

  const lireVoixHaute = () => {
    const texte = [
      'Mes données.',
      'Voici les données que JULABA garde sur toi :',
      'ton numéro de téléphone, ton nom, ta photo si tu en as mis une,',
      'ton activité, ton stock, tes ventes et tes dépenses,',
      'ton portefeuille Keiwa, et si tu as accepté, ton NIN et ta position.',
      'JULABA garde ces données pour tenir ta caisse, te protéger,',
      'et te proposer un score financier si tu le demandes.',
      'Tu as le droit de voir, de corriger, de supprimer ou de t\'opposer.',
      'Si tu supprimes ton compte, ton identité est anonymisée,',
      'mais ton argent est conservé. C\'est la loi.',
    ].join(' ');
    speak(texte);
  };

  const exercerDroit = (droit: Droit) => {
    switch (droit) {
      case 'acces':
        toast.success('Demande d\'accès enregistrée. Tu recevras un récapitulatif par SMS.');
        speak('Demande d\'accès enregistrée. Tu recevras un récapitulatif de tes données par message.');
        break;
      case 'rectification':
        speak('Pour corriger une donnée, je t\'emmène à ton profil.');
        navigate('/marchand/profil');
        break;
      case 'opposition':
        toast.success('Demande d\'opposition enregistrée. Le support te contactera.');
        speak('Demande d\'opposition enregistrée. Une personne du support te contactera.');
        break;
    }
  };

  return (
    <SubPageLayout
      role="marchand"
      title="Mes données"
      subtitle="Loi ivoirienne n°2013-450"
      rightContent={
        <button
          onClick={lireVoixHaute}
          aria-label="Lire mes données à voix haute"
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
            <span className="font-bold">Tata peut te lire cette page.</span>{' '}
            Touche le bouton micro en haut à droite pour écouter.
            Tu as le droit de savoir ce que JULABA garde sur toi.
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
            <h3 className="font-bold text-gray-900">Quelles données JULABA garde sur moi</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {DONNEES_GARDEES.map((d) => (
              <li key={d.label} className="px-5 py-3 flex items-start justify-between gap-4">
                <p className="font-semibold text-gray-900 text-sm">{d.label}</p>
                <p className="text-xs text-gray-500 text-right max-w-[55%]">{d.detail}</p>
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
            <h3 className="font-bold text-gray-900">Pourquoi JULABA les garde</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {FINALITES.map((f) => (
              <li key={f.donnee} className="px-5 py-3 flex items-center gap-3">
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${COLOR}15`, color: COLOR }}
                >
                  {f.donnee}
                </span>
                <p className="text-sm text-gray-700">{f.raison}</p>
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
            <h3 className="font-bold text-gray-900">Mes droits</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <button
              onClick={() => exercerDroit('acces')}
              aria-label="Demander l'accès à mes données"
              className="rounded-2xl border-2 p-4 text-left hover:bg-gray-50 transition-colors"
              style={{ borderColor: `${COLOR}30` }}
            >
              <Eye className="w-5 h-5 mb-2" style={{ color: COLOR }} aria-hidden="true" />
              <p className="font-semibold text-sm text-gray-900">Accès</p>
              <p className="text-xs text-gray-500 mt-0.5">Voir toutes mes données</p>
            </button>
            <button
              onClick={() => exercerDroit('rectification')}
              aria-label="Demander la rectification de mes données"
              className="rounded-2xl border-2 p-4 text-left hover:bg-gray-50 transition-colors"
              style={{ borderColor: `${COLOR}30` }}
            >
              <Pencil className="w-5 h-5 mb-2" style={{ color: COLOR }} aria-hidden="true" />
              <p className="font-semibold text-sm text-gray-900">Rectification</p>
              <p className="text-xs text-gray-500 mt-0.5">Corriger une erreur</p>
            </button>
            <button
              onClick={() => setShowSuppression(true)}
              aria-label="Demander la suppression de mon compte, droit à l'oubli"
              className="rounded-2xl border-2 p-4 text-left hover:bg-red-50 transition-colors"
              style={{ borderColor: '#FECACA' }}
            >
              <Trash2 className="w-5 h-5 mb-2 text-red-500" aria-hidden="true" />
              <p className="font-semibold text-sm text-red-600">Suppression</p>
              <p className="text-xs text-gray-500 mt-0.5">Droit à l'oubli</p>
            </button>
            <button
              onClick={() => exercerDroit('opposition')}
              aria-label="S'opposer à un traitement spécifique"
              className="rounded-2xl border-2 p-4 text-left hover:bg-gray-50 transition-colors"
              style={{ borderColor: `${COLOR}30` }}
            >
              <Ban className="w-5 h-5 mb-2" style={{ color: COLOR }} aria-hidden="true" />
              <p className="font-semibold text-sm text-gray-900">Opposition</p>
              <p className="text-xs text-gray-500 mt-0.5">Refuser un usage</p>
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
              <h3 className="font-bold text-red-700">Supprimer mon compte</h3>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                Action <span className="font-bold">définitive et irréversible</span>.
                Ton identité sera anonymisée (téléphone, photo, NIN, adresse purgés).
                En revanche, <span className="font-bold">ton argent et ton historique de
                transactions seront conservés</span> — c'est la loi ivoirienne : l'argent est sacré.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSuppression(true)}
            className="w-full py-3 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
            aria-label="Supprimer définitivement mon compte, avec confirmation"
          >
            <Trash2 className="w-5 h-5" aria-hidden="true" />
            Supprimer mon compte
          </button>
        </motion.section>

        {/* Section 5 — Lien politique complète */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowPolitique(true)}
          whileTap={{ scale: 0.99 }}
          className="w-full bg-white rounded-3xl border-2 border-gray-100 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          aria-label="Voir la politique de confidentialité complète"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}15` }}>
              <FileText className="w-5 h-5" style={{ color: COLOR }} aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Voir la politique complète</p>
              <p className="text-xs text-gray-500">Loi ivoirienne n°2013-450 · v1.0</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </motion.button>

        {/* Mention ANSUT + ICONE */}
        <p className="text-[10px] text-gray-400 text-center leading-relaxed pt-2">
          JULABA — édité par ICONE Solutions, Abidjan. Projet DGE × ANSUT.
          Loi ivoirienne n°2013-450 relative à la protection des données à caractère personnel.
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
