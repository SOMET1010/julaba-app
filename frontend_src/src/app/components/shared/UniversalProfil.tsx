import React, { useEffect, useState } from 'react';
import { definirPin, desactiverPin } from '../../services/api/auth-api';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Lock,
  LogOut,
  ChevronRight,
  CreditCard,
  GraduationCap,
  Wallet,
  Users,
  Package,
  Globe,
  Check,
  FileText,
  Building2,
  UserCheck,
  Store,
  Leaf,
  ArrowRightLeft,
  Shield,
  Gift,
  Coins,
  Fingerprint,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { useVoluntaryLogout } from '../../hooks/useVoluntaryLogout';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { SOUS_PROFILS_MARCHAND } from '../../types/sousProfilMarchand';
import { SubPageLayout } from '../layout/SubPageLayout';
import { NotificationButton } from '../marchand/NotificationButton';
import { ProfilUnifieModal } from './ProfilUnifieModal';
import { DocumentsCertificationsModalUniversal } from './DocumentsCertificationsModalUniversal';
import { SupportCardProfil } from './SupportCardProfil';
import { PartenairesLogos } from './PartenairesLogos';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ModalPIN } from './PinKeiwaModal';
import { useCaisse } from '../../contexts/CaisseContext';
import { useProducteur } from '../../contexts/ProducteurContext';
import { useCooperative } from '../../contexts/CooperativeContext';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import { useInstitutionData } from '../../hooks/useInstitutionData';
import { registerWebAuthn, verifyWebAuthnForKeiwa } from '../../hooks/useWebAuthn';
import { marquerBiometrie } from '../../services/comptesMemorises';
import { API_URL } from '../../utils/api';
import type { UserData } from '../../contexts/UserContext';

// ─── Types & config ───────────────────────────────────────────

export type ProfilRole =
  | 'marchand'
  | 'producteur'
  | 'cooperative'
  | 'identificateur'
  | 'institution';

export const ROLE_CONFIG: Record<
  ProfilRole,
  {
    color: string;
    label: string;
    version: string;
    profileIcon: React.ElementType;
    routes: {
      parametres: string;
      academy: string;
      keiwa: string;
      cooperative?: string;
      besoin?: string;
      tontines?: string;
    };
  }
> = {
  marchand: {
    color: '#B74725',
    label: 'Marchand',
    version: 'Jùlaba Marchand v1.0',
    profileIcon: Store,
    routes: {
      parametres: '/marchand/parametres',
      academy: '/marchand/academy',
      keiwa: '/marchand/keiwa',
      cooperative: '/marchand/cooperative',
      besoin: '/marchand/cooperative/besoin',
      tontines: '/marchand/tontines',
    },
  },
  producteur: {
    color: '#2E8B57',
    label: 'Producteur',
    version: 'Jùlaba Producteur v1.0',
    profileIcon: Leaf,
    routes: {
      parametres: '/producteur/parametres',
      academy: '/producteur/academy',
      keiwa: '/producteur/keiwa',
    },
  },
  cooperative: {
    color: '#2072AF',
    label: 'Coopérative',
    version: 'Jùlaba Coopérative v1.0',
    profileIcon: Users,
    routes: {
      parametres: '/cooperative/parametres',
      academy: '/cooperative/academy',
      keiwa: '/cooperative/keiwa',
    },
  },
  identificateur: {
    color: '#9F8170',
    label: 'Identificateur',
    version: 'Jùlaba Identificateur v1.0',
    profileIcon: UserCheck,
    routes: {
      parametres: '/identificateur/parametres',
      academy: '/identificateur/academy',
      keiwa: '/identificateur/keiwa',
    },
  },
  institution: {
    color: '#712864',
    label: 'Institution',
    version: 'Jùlaba Institution v1.0',
    profileIcon: Building2,
    routes: {
      parametres: '/institution/parametres',
      academy: '/institution/academy',
      keiwa: '/institution/keiwa',
    },
  },
};

// « Langue de Tata Nanti Lou » vit désormais UNIQUEMENT dans Réglages (elle y
// était déjà, correctement nommée) : ce doublon exact — même réglage
// (useLangPref), même modale, juste étiqueté « Langue » ici — est supprimé
// plutôt que renommé (audit accueil/profil).

function KPICard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="p-3 rounded-3xl border-2 bg-gradient-to-br from-white via-white to-gray-50 shadow-md"
      style={{ borderColor: `${color}55` }}
    >
      <p className="text-xs encre-3 mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function Toggle({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: value ? color : 'var(--trait)' }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ x: value ? 24 : 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </motion.button>
  );
}

function AcademyKeiwaRow({
  color,
  onAcademy,
  onKeiwa,
}: {
  color: string;
  onAcademy: () => void;
  /** Omis pour un rôle dont Keiwa a déjà une porte d'entrée ailleurs (ex.
      la tuile « Mon argent » de l'accueil marchand) — une seule suffit. */
  onKeiwa?: () => void;
}) {
  const cardStyle: React.CSSProperties = {
    borderColor: `${color}40`,
    background: `linear-gradient(to bottom right, ${color}14, #ffffff, ${color}14)`,
  };
  const iconBg = { backgroundColor: `${color}25` };
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03, type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        <motion.button
          type="button"
          onClick={onAcademy}
          className="w-full p-4 rounded-2xl border-2 shadow-md flex items-center justify-between"
          style={cardStyle}
          whileHover={{ scale: 1.02, borderColor: color }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={iconBg}>
              <GraduationCap className="w-6 h-6" style={{ color }} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold encre">JÙLABA Academy</h3>
              <p className="text-xs encre-3">Formations et micro-apprentissages</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 encre-4" />
        </motion.button>
      </motion.div>
      {onKeiwa && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, type: 'spring', stiffness: 200 }}
          className="mb-4"
        >
          <motion.button
            type="button"
            onClick={onKeiwa}
            className="w-full p-4 rounded-2xl border-2 shadow-md flex items-center justify-between"
            style={cardStyle}
            whileHover={{ scale: 1.02, borderColor: color }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={iconBg}>
                <Wallet className="w-6 h-6" style={{ color }} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold encre">Keiwa</h3>
                <p className="text-xs encre-3">Solde, recharge, historique</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 encre-4" />
          </motion.button>
        </motion.div>
      )}
    </>
  );
}

function ProfilMarchandExtras({ color, navigate, sousProfil }: { color: string; navigate: (path: string) => void; sousProfil: string | null }) {
  const sousProfilLabel = SOUS_PROFILS_MARCHAND.find((s) => s.value === sousProfil)?.label || null;
  const cfg = ROLE_CONFIG.marchand.routes;

  return (
    <>
      {sousProfilLabel && (
        <div className="w-full p-4 rounded-2xl border-2 shadow-md mb-4" style={{ borderColor: `${color}55`, background: `linear-gradient(to bottom right, ${color}14, #ffffff)` }}>
          <p className="text-xs encre-3 mb-1">Sous-profil marchand</p>
          <p className="text-xl font-black" style={{ color }}>{sousProfilLabel}</p>
        </div>
      )}

      {/* Mes services — nettement séparé de « Mon compte » : ce sont des
          produits financiers/sociaux, pas des réglages d'identité (audit
          accueil/profil). Keiwa n'y est PAS repris : il vit uniquement sur
          la tuile « Mon argent » de l'accueil, une seule porte suffit. */}
      <div className="w-full p-3 rounded-3xl mb-4" style={{ backgroundColor: 'var(--commerce-apricot, #F5D6BD)' }}>
        <p className="text-xs font-bold uppercase tracking-wide px-2 pt-1 pb-2" style={{ color }}>Mes services</p>
        <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.045, type: 'spring', stiffness: 200 }}
        className=""
      >
        <div
          className="w-full p-4 rounded-2xl border-2 shadow-md flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: `${color}40`,
            background: `linear-gradient(to bottom right, ${color}14, #ffffff, ${color}14)`,
          }}
        >
          <motion.button
            type="button"
            onClick={() => navigate(cfg.cooperative || '/marchand/cooperative')}
            className="flex items-center gap-3 text-left flex-1"
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}25` }}>
              <Users className="w-6 h-6" style={{ color }} />
            </div>
            <div>
              <h3 className="text-lg font-bold encre">Ma coopérative</h3>
              <p className="text-xs encre-3">Rejoindre ou voir ma coop</p>
            </div>
            <ChevronRight className="w-6 h-6 encre-4 ml-auto sm:ml-0" />
          </motion.button>
          <motion.button
            type="button"
            onClick={() => navigate(cfg.besoin || '/marchand/cooperative/besoin')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 shrink-0"
            style={{ borderColor: color, color, backgroundColor: `${color}10` }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Package className="w-4 h-4" />
            Soumettre un besoin
          </motion.button>
        </div>
      </motion.div>
      {/* Tontine — épargne tournante réelle entre commerçantes (argent réel, module sacré) */}
      <motion.button
        type="button"
        onClick={() => navigate(cfg.tontines || '/marchand/tontines')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 200 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 rounded-2xl border-2 shadow-md flex items-center gap-3 text-left"
        style={{ borderColor: `${color}40`, background: `linear-gradient(to bottom right, ${color}14, #ffffff, ${color}14)` }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}25` }}>
          <Coins className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold encre">Mes tontines</h3>
          <p className="text-xs encre-3">Épargne tournante entre commerçantes</p>
        </div>
        <ChevronRight className="w-6 h-6 encre-4" />
      </motion.button>
      {/* Protection sociale — socle CNPS/CNAM (CDC 8.1.2) */}
      <motion.button
        type="button"
        onClick={() => navigate('/marchand/protection-sociale')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, type: 'spring', stiffness: 200 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 rounded-2xl border-2 shadow-md flex items-center gap-3 text-left"
        style={{ borderColor: `${color}40`, background: `linear-gradient(to bottom right, ${color}14, #ffffff, ${color}14)` }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}25` }}>
          <Shield className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <h3 className="text-lg font-bold encre">Ma protection sociale</h3>
          <p className="text-xs encre-3">Cotisations CNPS (retraite) & CNAM (santé)</p>
        </div>
        <ChevronRight className="w-6 h-6 encre-4 ml-auto" />
      </motion.button>

      {/* Programme de fidélité paramétrable (CDC 8.1.2) */}
      <motion.button
        type="button"
        onClick={() => navigate('/marchand/fidelite')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, type: 'spring', stiffness: 200 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 rounded-2xl border-2 shadow-md flex items-center gap-3 text-left"
        style={{ borderColor: `${color}40`, background: `linear-gradient(to bottom right, ${color}14, #ffffff, ${color}14)` }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}25` }}>
          <Gift className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <h3 className="text-lg font-bold encre">Fidélité clients</h3>
          <p className="text-xs encre-3">Points & récompenses — barème réglable</p>
        </div>
        <ChevronRight className="w-6 h-6 encre-4 ml-auto" />
      </motion.button>
        </div>
      </div>
    </>
  );
}

function ProfilProducteurExtras({ color }: { color: string }) {
  const { recoltes: rawRecoltes, cycles: rawCycles } = useProducteur();
  const recoltes = Array.isArray(rawRecoltes) ? rawRecoltes : [];
  const cycles = Array.isArray(rawCycles) ? rawCycles : [];
  const actifs = cycles.filter((c) => c.status === 'active').length;
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <KPICard label="Récoltes" value={recoltes.length} color={color} />
      <KPICard label="Plantations actives" value={actifs} color={color} />
    </div>
  );
}

function ProfilCooperativeExtras({
  color,
  user,
  onLegalDocs,
}: {
  color: string;
  user: UserData | null;
  onLegalDocs: () => void;
}) {
  const { membres: rawMembres, tresorerie: rawTresorerie, cooperative } = useCooperative();
  const membres = Array.isArray(rawMembres) ? rawMembres : [];
  const tresorerie = Array.isArray(rawTresorerie) ? rawTresorerie : [];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard label="Membres" value={membres.length} color={color} />
        <KPICard label="Transactions trésorerie" value={tresorerie.length} color={color} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-4 rounded-2xl border-2 bg-white shadow-sm"
        style={{ borderColor: `${color}40` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold encre-3 uppercase tracking-wide mb-1">Identité coopérative</p>
            <h3 className="text-lg font-black encre">{cooperative?.nom || 'Coopérative'}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Statut juridique : <span className="font-semibold">{user?.statut?.trim() ? user.statut : 'Non renseigné'}</span>
            </p>
          </div>
          <motion.button
            type="button"
            onClick={onLegalDocs}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: color }}
            whileTap={{ scale: 0.97 }}
          >
            Documents légaux
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

function ProfilIdentificateurExtras({ color, user }: { color: string; user: UserData | null }) {
  const navigate = useNavigate();
  const { getStatsIdentificateur } = useIdentificateur();
  const uid = user?.telephone?.trim() || user?.id || '';
  const stats = getStatsIdentificateur(uid || '-');
  const badge = (user as UserData & { numeroIdentificateur?: string })?.numeroIdentificateur || 'IDEN-2026-0001';
  return (
    <>
      <motion.button
        type="button"
        onClick={() => navigate('/identificateur/demande-mutation')}
        className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm shadow-sm border-2 bg-white"
        style={{ borderColor: color, color }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
      >
        <ArrowRightLeft className="w-4 h-4" aria-hidden="true" />
        Demande de mutation
      </motion.button>
      <div className="mb-4 flex justify-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-bold text-sm"
          style={{ borderColor: `${color}55`, color, backgroundColor: `${color}10` }}
        >
          <UserCheck className="w-4 h-4" />
          Fiche identification : {badge}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard label="Identifications validées" value={stats.validees} color={color} />
        <KPICard label="Identifications en cours" value={stats.enAttente} color={color} />
      </div>
    </>
  );
}

function ProfilInstitutionExtras({ color }: { color: string }) {
  const { macroKPIs, resumeJour } = useInstitutionData();
  const vol = macroKPIs.valeurMonetaireFormatted;
  const volLabel = typeof vol === 'number' && vol > 0 ? `${vol.toLocaleString('fr-FR')} Md FCFA` : String(vol ?? 0);
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <KPICard label="Acteurs total" value={macroKPIs.totalActeurs} color={color} />
      <KPICard label="Acteurs actifs" value={macroKPIs.acteursActifs} color={color} />
      <KPICard label="Volume transactions" value={volLabel} color={color} />
      <KPICard label="Croissance (nouveaux inscrits)" value={resumeJour.nouveauxInscrits} color={color} />
    </div>
  );
}

interface UniversalProfilProps {
  role: ProfilRole;
}

export function UniversalProfil({ role }: UniversalProfilProps) {
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[role];
  const { color, routes, version } = cfg;
  const { speak, setIsModalOpen, user: appUser, setUser } = useApp();
  const { user, updateUser } = useUser();

  // Déconnexion volontaire (R3) — orchestration centralisée (hook réutilisable).
  const logout = useVoluntaryLogout();

  const [showProfilUnifie, setShowProfilUnifie] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showDocumentsCertifications, setShowDocumentsCertifications] = useState(false);

  // Sécurité (déménagée de Réglages : mot de passe + PIN Keiwa + reconnaissance
  // vivent maintenant au même endroit — « Mon compte » — plutôt que coupés
  // entre deux écrans sans raison visible, audit accueil/profil).
  const pinEnabled = !!appUser?.pinSecurityEnabled;
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'create' | 'modify' | 'disable'>('create');

  useEffect(() => {
    const anyOpen = showProfilUnifie || showChangePwd || showPinModal || showDocumentsCertifications;
    setIsModalOpen(anyOpen);
  }, [showProfilUnifie, showChangePwd, showPinModal, showDocumentsCertifications, setIsModalOpen]);

  const handleSavePin = async (newPin: string, currentPin?: string) => {
    try {
      // API-01 : la session expirée est un état à part, jamais un « PIN
      // incorrect ». Sinon on reproche à la marchande une faute qu'elle n'a
      // pas commise.
      const r = await definirPin(newPin, currentPin);
      if (r.etat === 'session_expiree') { toast.error('Ta session a expiré. Reconnecte-toi.'); return; }
      if (r.etat === 'erreur_metier') { toast.error(r.message || 'Erreur PIN'); return; }
      if (appUser) setUser({ ...appUser, pinSecurityEnabled: true });
      toast.success('Code PIN activé');
    } catch { toast.error('Erreur réseau'); }
  };

  const handleDisablePin = async (currentPin: string) => {
    try {
      const r = await desactiverPin(currentPin);
      if (r.etat === 'session_expiree') { toast.error('Ta session a expiré. Reconnecte-toi.'); return; }
      if (r.etat === 'erreur_metier') { toast.error(r.message || 'PIN incorrect'); return; }
      if (appUser) setUser({ ...appUser, pinSecurityEnabled: false });
      toast.success('Code PIN désactivé');
    } catch { toast.error('Erreur réseau'); }
  };

  const handleRegisterBiometric = async () => {
    const r = await registerWebAuthn();
    // API-01b : chaque cas dit ce qui s'est VRAIMENT passé. Une session finie
    // n'est pas un doigt refusé, et une annulation n'est pas un échec.
    if (r.etat === 'session_expiree') { toast.error('Ta session a expiré. Reconnecte-toi, puis réessaie.'); return; }
    if (r.etat === 'annulee') { toast('Tu as annulé. Tu peux réessayer quand tu veux.'); return; }
    if (r.etat === 'indisponible') { toast.error(r.message || 'Ça ne marche pas sur ce téléphone.'); return; }
    if (r.etat === 'non_reconnue') { toast.error('Ton téléphone n’a pas pu enregistrer. Réessaie.'); return; }
    toast.success('FaceID / Empreinte activé');
    try {
      const tel = String((appUser as any)?.phone || '').replace(/^\+225/, '');
      if (/^\d{10}$/.test(tel)) marquerBiometrie(window.localStorage, tel, true);
    } catch { /* ignore */ }
  };

  const handleTestBiometric = async () => {
    const r = await verifyWebAuthnForKeiwa();
    if (r.etat === 'ok') { toast.success('Ton téléphone t’a reconnue'); return; }
    // ICI ÉTAIT LE REPROCHE INJUSTE : sur session expirée, l'invite d'empreinte
    // ne s'ouvrait même pas, et on lui disait pourtant qu'elle n'avait pas été
    // reconnue.
    if (r.etat === 'session_expiree') { toast.error('Ta session a expiré. Reconnecte-toi — ce n’est pas ton doigt.'); return; }
    if (r.etat === 'annulee') { toast('Tu as annulé.'); return; }
    if (r.etat === 'indisponible') { toast.error(r.message || 'La reconnaissance ne marche pas ici.'); return; }
    toast.error('Ton téléphone ne t’a pas reconnue. Réessaie.');
  };

  if (!user) return null;

  const pageBg = `linear-gradient(to bottom, ${color}12, #ffffff)`;

  return (
    <>
      <SubPageLayout role={role} title="Mon profil" noPadding rightContent={<NotificationButton />}>
        <div className="lg:pb-8 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen" style={{ background: pageBg }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 pt-2">
            <div className="flex items-center gap-3 mb-3">
              <motion.button
                type="button"
                onClick={() => setShowProfilUnifie(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm shadow-lg text-white"
                style={{ backgroundColor: color }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
              >
                <CreditCard className="w-4 h-4" />
                Afficher ma carte
              </motion.button>
              <motion.button
                type="button"
                onClick={() => navigate(routes.parametres)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm shadow-sm border-2 bg-white"
                style={{ borderColor: color, color }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
              >
                <Settings className="w-4 h-4" />
                Réglages
              </motion.button>
            </div>
          </motion.div>

          <AnimatePresence>
            {!showProfilUnifie && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4"
              >
                <div
                  className="p-8 rounded-3xl text-center border-[3px]"
                  style={{ borderColor: color, background: `linear-gradient(to bottom right, ${color}18, #fff, ${color}12)` }}
                >
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-[3px] mx-auto mb-3" style={{ backgroundColor: `${color}18`, borderColor: color }}>
                    <CreditCard className="w-10 h-10" style={{ color }} />
                  </div>
                  <p className="text-xl font-black encre mb-2">Carte professionnelle Jùlaba</p>
                  <p className="text-sm text-gray-600">Utilise « Afficher ma carte » pour ouvrir ta carte digitale.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AcademyKeiwaRow
            color={color}
            onAcademy={() => navigate(routes.academy)}
            onKeiwa={role === 'marchand' ? undefined : () => navigate(routes.keiwa)}
          />

          {role === 'marchand' && <ProfilMarchandExtras color={color} navigate={navigate} sousProfil={appUser?.sousProfilMarchand ?? null} />}
          {role === 'producteur' && <ProfilProducteurExtras color={color} />}
          {role === 'cooperative' && (
            <ProfilCooperativeExtras color={color} user={user} onLegalDocs={() => setShowDocumentsCertifications(true)} />
          )}
          {role === 'identificateur' && <ProfilIdentificateurExtras color={color} user={user} />}
          {role === 'institution' && <ProfilInstitutionExtras color={color} />}

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowDocumentsCertifications(true)}
            className="w-full mb-4 p-4 rounded-2xl border-2 shadow-sm flex items-center justify-between bg-white"
            style={{ borderColor: `${color}40` }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <FileText className="w-5 h-5" style={{ color }} />
              </div>
              <div className="text-left">
                <p className="font-bold encre">Documents et certifications</p>
                <p className="text-xs encre-3">Pièces officielles et suivi</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 encre-4" />
          </motion.button>

          <SupportCardProfil role={role} />

          <div className="mt-4 mb-3 rounded-2xl border-2 border-gray-100 bg-white overflow-hidden">
            <p className="text-xs font-bold encre-3 uppercase tracking-wide px-4 pt-3 pb-1">Mon compte</p>
            <motion.button
              type="button"
              onClick={() => setShowChangePwd(true)}
              className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 text-left"
              whileTap={{ scale: 0.99 }}
            >
              <span className="font-semibold encre flex items-center gap-2">
                <Lock className="w-4 h-4 encre-3" />
                Mot de passe
              </span>
              <ChevronRight className="w-4 h-4 encre-4" />
            </motion.button>
            {role === 'marchand' && (
              <>
                <div className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <div>
                    <span className="font-semibold encre flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 encre-3" />
                      Code PIN Keiwa
                    </span>
                    <p className="text-xs encre-3 mt-0.5 ml-6">
                      {pinEnabled ? 'PIN activé — Keiwa sécurisé' : 'Active le PIN pour sécuriser ton Keiwa'}
                    </p>
                    {pinEnabled && (
                      <motion.button
                        onClick={() => { setPinMode('modify'); setShowPinModal(true); }}
                        className="mt-1 ml-6 text-sm font-bold" style={{ color }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Mode de déverrouillage
                      </motion.button>
                    )}
                  </div>
                  <Toggle
                    value={pinEnabled}
                    color={color}
                    onChange={(v) => { if (v) { setPinMode('create'); setShowPinModal(true); } else { setPinMode('disable'); setShowPinModal(true); } }}
                  />
                </div>
                <motion.button
                  type="button"
                  onClick={() => { void handleRegisterBiometric(); }}
                  className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 text-left"
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="font-semibold encre flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 encre-3" />
                    Me faire reconnaître
                  </span>
                  <ChevronRight className="w-4 h-4 encre-4" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => { void handleTestBiometric(); }}
                  className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 text-left"
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="font-semibold encre flex items-center gap-2">
                    <Shield className="w-4 h-4 encre-3" />
                    Tester la reconnaissance
                  </span>
                  <ChevronRight className="w-4 h-4 encre-4" />
                </motion.button>
              </>
            )}
          </div>

          <motion.button
            type="button"
            onClick={logout.requestLogout}
            className="w-full mb-2 py-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2"
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </motion.button>

          {/* R3 — confirmation avant d'effacer un panier en cours à la déconnexion */}
          <LogoutConfirmDialog
            open={logout.confirmOpen}
            onConfirm={logout.confirmAndClear}
            onCancel={logout.cancel}
            color={color}
          />

          <PartenairesLogos />

          <p className="text-center text-xs encre-3 py-4">{version} · Projet DGE × ANSUT · édité par Icone Solution</p>
        </div>
      </SubPageLayout>

      <AnimatePresence>
        {showProfilUnifie && (
          <ProfilUnifieModal
            onClose={() => setShowProfilUnifie(false)}
            speak={speak}
            user={user}
            onSave={(updates) => updateUser(updates)}
            onOpenDocuments={() => {
              setShowProfilUnifie(false);
              setShowDocumentsCertifications(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDocumentsCertifications && (
          <DocumentsCertificationsModalUniversal
            onClose={() => setShowDocumentsCertifications(false)}
            speak={speak}
            documents={{}}
            onDocumentClick={() => {}}
            totalDocuments={0}
            completedDocuments={0}
            roleColor={color}
          />
        )}
      </AnimatePresence>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} speak={speak} />}
      {role === 'marchand' && (
        <ModalPIN
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          color={color}
          mode={pinMode}
          onSave={handleSavePin}
          onDisable={handleDisablePin}
        />
      )}
    </>
  );
}
