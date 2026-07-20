import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { SOUS_PROFILS_MARCHAND } from '../../types/sousProfilMarchand';
import { useLangPref, LANG_FLAGS, LANG_LABELS, type AppLang } from '../../hooks/useLangPref';
import { SubPageLayout } from '../layout/SubPageLayout';
import { NotificationButton } from '../marchand/NotificationButton';
import { ProfilUnifieModal } from './ProfilUnifieModal';
import { DocumentsCertificationsModalUniversal } from './DocumentsCertificationsModalUniversal';
import { SupportCardProfil } from './SupportCardProfil';
import { PartenairesLogos } from './PartenairesLogos';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useCaisse } from '../../contexts/CaisseContext';
import { useProducteur } from '../../contexts/ProducteurContext';
import { useCooperative } from '../../contexts/CooperativeContext';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import { useInstitutionData } from '../../hooks/useInstitutionData';
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
    };
  }
> = {
  marchand: {
    color: '#C66A2C',
    label: 'Marchand',
    version: 'Jùlaba Marchand v1.0',
    profileIcon: Store,
    routes: {
      parametres: '/marchand/parametres',
      academy: '/marchand/academy',
      keiwa: '/marchand/keiwa',
      cooperative: '/marchand/cooperative',
      besoin: '/marchand/cooperative/besoin',
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

const LANGS: AppLang[] = ['french', 'dioula', 'bambara'];

function ModalLang({
  isOpen,
  onClose,
  lang,
  setLang,
  color,
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: AppLang;
  setLang: (l: AppLang) => void;
  color: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Langue de Tata Lou</h3>
            <p className="text-sm text-gray-500 mb-6">Dans quelle langue tu veux me parler aujourd&apos;hui ?</p>
            <div className="space-y-3">
              {LANGS.map((id) => {
                const isActive = lang === id;
                return (
                  <motion.button
                    key={id}
                    onClick={() => {
                      setLang(id);
                      onClose();
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left"
                    style={{
                      borderColor: isActive ? color : '#E5E7EB',
                      backgroundColor: isActive ? `${color}08` : 'white',
                    }}
                  >
                    <span className="text-3xl">{LANG_FLAGS[id]}</span>
                    <div>
                      <p className="font-bold text-gray-900">{LANG_LABELS[id]}</p>
                      {isActive && (
                        <p className="text-xs mt-0.5" style={{ color }}>
                          Langue actuelle
                        </p>
                      )}
                    </div>
                    {isActive && <Check className="w-5 h-5 ml-auto" style={{ color }} strokeWidth={3} />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function AcademyKeiwaRow({
  color,
  onAcademy,
  onKeiwa,
}: {
  color: string;
  onAcademy: () => void;
  onKeiwa: () => void;
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
              <h3 className="text-lg font-bold text-gray-900">JÙLABA Academy</h3>
              <p className="text-xs text-gray-500">Formations et micro-apprentissages</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400" />
        </motion.button>
      </motion.div>
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
              <h3 className="text-lg font-bold text-gray-900">Keiwa</h3>
              <p className="text-xs text-gray-500">Solde, recharge, historique</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400" />
        </motion.button>
      </motion.div>
    </>
  );
}

function ProfilMarchandExtras({ color, navigate, sousProfil }: { color: string; navigate: (path: string) => void; sousProfil: string | null }) {
  const sousProfilLabel = SOUS_PROFILS_MARCHAND.find((s) => s.value === sousProfil)?.label || null;
  const { transactions: rawTransactions } = useCaisse();
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const ventes = transactions.filter((t) => t.type === 'vente').length;
  const cahier = transactions.filter((t) => t.type === 'depense').length;
  const cfg = ROLE_CONFIG.marchand.routes;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.045, type: 'spring', stiffness: 200 }}
        className="mb-4"
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
              <h3 className="text-lg font-bold text-gray-900">Ma coopérative</h3>
              <p className="text-xs text-gray-500">Rejoindre ou voir ma coop</p>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400 ml-auto sm:ml-0" />
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
      {sousProfilLabel && (
        <div className="w-full p-4 rounded-2xl border-2 shadow-md mb-4" style={{ borderColor: `${color}55`, background: `linear-gradient(to bottom right, ${color}14, #ffffff)` }}>
          <p className="text-xs text-gray-500 mb-1">Sous-profil marchand</p>
          <p className="text-xl font-black" style={{ color }}>{sousProfilLabel}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <KPICard label="Ventes (transactions)" value={ventes} color={color} />
        <KPICard label="Cahier (dépenses)" value={cahier} color={color} />
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Identité coopérative</p>
            <h3 className="text-lg font-black text-gray-900">{cooperative?.nom || 'Coopérative'}</h3>
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
        <KPICard label="Identifications validées" value={stats.identificationsValidees} color={color} />
        <KPICard label="Identifications en cours" value={stats.identificationsEnCours} color={color} />
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
  const { speak, setIsModalOpen, logout: appLogout, user: appUser } = useApp();
  const { user, updateUser, logout: userLogout } = useUser();
  const { lang, setLang } = useLangPref();

  const [showProfilUnifie, setShowProfilUnifie] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showDocumentsCertifications, setShowDocumentsCertifications] = useState(false);

  useEffect(() => {
    const anyOpen = showProfilUnifie || showChangePwd || showLang || showDocumentsCertifications;
    setIsModalOpen(anyOpen);
  }, [showProfilUnifie, showChangePwd, showLang, showDocumentsCertifications, setIsModalOpen]);

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
                  <p className="text-xl font-black text-gray-900 mb-2">Carte professionnelle Jùlaba</p>
                  <p className="text-sm text-gray-600">Utilise « Afficher ma carte » pour ouvrir ta carte digitale.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AcademyKeiwaRow
            color={color}
            onAcademy={() => navigate(routes.academy)}
            onKeiwa={() => navigate(routes.keiwa)}
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
                <p className="font-bold text-gray-900">Documents et certifications</p>
                <p className="text-xs text-gray-500">Pièces officielles et suivi</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.button>

          <SupportCardProfil role={role} />

          <div className="mt-4 mb-3 rounded-2xl border-2 border-gray-100 bg-white overflow-hidden">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-4 pt-3 pb-1">Actions rapides</p>
            <motion.button
              type="button"
              onClick={() => setShowChangePwd(true)}
              className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 text-left"
              whileTap={{ scale: 0.99 }}
            >
              <span className="font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" />
                Mot de passe
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setShowLang(true)}
              className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 text-left"
              whileTap={{ scale: 0.99 }}
            >
              <span className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                Langue
              </span>
              <span className="text-xs text-gray-500">{LANG_LABELS[lang]}</span>
            </motion.button>
          </div>

          <motion.button
            type="button"
            onClick={async () => {
              await appLogout();
              userLogout();
            }}
            className="w-full mb-2 py-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2"
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </motion.button>

          <PartenairesLogos />

          <p className="text-center text-xs text-gray-500 py-4">{version} · By ICONE SOLUTION</p>
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
      <ModalLang isOpen={showLang} onClose={() => setShowLang(false)} lang={lang} setLang={setLang} color={color} />
    </>
  );
}
