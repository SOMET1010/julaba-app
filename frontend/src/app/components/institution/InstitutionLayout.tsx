import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home, Users, BarChart3, Eye, FileText, User,
  Lock, ShieldOff,
} from 'lucide-react';
import { useInstitutionAccess } from '../../contexts/InstitutionAccessContext';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';
import { useUser } from '../../contexts/UserContext';
import { ModuleAcces } from '../../contexts/BackOfficeContext';
import { ScrollToTop } from '../layout/ScrollToTop';

const PRIMARY_COLOR = '#712864';

// Map modules -> routes institution
const MODULE_ROUTES: Record<keyof ModuleAcces, string[]> = {
  dashboard: ['/institution', '/institution/dashboard', '/institution/dashboard-analytics'],
  analytics: ['/institution/analytics'],
  acteurs: ['/institution/acteurs'],
  supervision: ['/institution/supervision'],
  audit: ['/institution/audit-trail'],
  export: [],
};

// Items de navigation complets — filtrés selon les permissions
const ALL_NAV_ITEMS = [
  { label: 'Accueil', path: '/institution', icon: Home, module: 'dashboard' as keyof ModuleAcces, exact: true },
  { label: 'Acteurs', path: '/institution/acteurs', icon: Users, module: 'acteurs' as keyof ModuleAcces },
  { label: 'Supervision', path: '/institution/supervision', icon: Eye, module: 'supervision' as keyof ModuleAcces },
  { label: 'Analytics', path: '/institution/analytics', icon: BarChart3, module: 'analytics' as keyof ModuleAcces },
  { label: 'Audit', path: '/institution/audit-trail', icon: FileText, module: 'audit' as keyof ModuleAcces },
  { label: 'Moi', path: '/institution/profil', icon: User, module: null },
];

function AccessDenied({ module }: { module: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -5, 5, -5, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: `${PRIMARY_COLOR}15` }}
      >
        <Lock className="w-10 h-10" style={{ color: PRIMARY_COLOR }} />
      </motion.div>
      <h2 className="font-black text-gray-900 text-xl mb-2">Accès restreint</h2>
      <p className="text-gray-500 text-sm max-w-xs">
        Votre institution n'a pas accès au module <strong>{module}</strong>.
        Contactez l'administrateur du BackOffice Jùlaba pour demander un accès.
      </p>
      <div className="mt-6 px-4 py-2.5 rounded-2xl border-2 border-dashed text-xs text-gray-400" style={{ borderColor: `${PRIMARY_COLOR}40` }}>
        Accès géré par le Super Admin Jùlaba
      </div>
    </motion.div>
  );
}

function InstitutionSuspended() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 bg-red-50"
      >
        <ShieldOff className="w-12 h-12 text-red-400" />
      </motion.div>
      <h2 className="font-black text-gray-900 text-2xl mb-3">Compte suspendu</h2>
      <p className="text-gray-500 text-sm max-w-sm">
        Votre accès institutionnel a été temporairement suspendu par l'administrateur BackOffice.
        Contactez le support Jùlaba pour plus d'informations.
      </p>
    </motion.div>
  );
}

function BottomNav({ navItems, institutionProfil }: { navItems: typeof ALL_NAV_ITEMS; institutionProfil: any }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Afficher 5 items : 4 principaux + "Moi"
  const mainModuleItems = navItems.filter(item => item.module !== null).slice(0, 4);
  const moiItem = navItems.find(item => item.label === 'Moi');
  const mainItems = moiItem ? [...mainModuleItems, moiItem] : mainModuleItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative mx-4 mb-4 rounded-[2rem] overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Active indicator wave */}
        <AnimatePresence mode="wait">
          {mainItems.map((item, index) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            if (isActive) {
              return (
                <motion.div
                  key={item.path}
                  className="absolute top-0 h-1 rounded-full"
                  style={{ 
                    backgroundColor: PRIMARY_COLOR,
                    width: `${100 / mainItems.length}%`,
                  }}
                  initial={{ left: '0%', opacity: 0 }}
                  animate={{ 
                    left: `${(index * 100) / mainItems.length}%`,
                    opacity: 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30 
                  }}
                />
              );
            }
            return null;
          })}
        </AnimatePresence>

        {/* Tabs Container */}
        <div className="flex items-center justify-between px-1">
          {mainItems.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const Icon = item.icon || Home;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center transition-all py-3 px-1"
                style={{ width: `${100 / mainItems.length}%` }}
                whileTap={{ scale: 0.85 }}
              >
                {/* Icon with 3D effect */}
                <motion.div
                  className="relative mb-1"
                  animate={isActive ? {
                    y: [0, -4, 0],
                    rotateY: [0, 5, 0, -5, 0],
                  } : {}}
                  transition={isActive ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                >
                  {/* 3D Shadow */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 blur-md opacity-50"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  
                  <Icon 
                    className="w-6 h-6 relative z-10 transition-all" 
                    style={{ 
                      color: isActive ? PRIMARY_COLOR : '#9CA3AF',
                      filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none',
                    }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>

                {/* Label */}
                <motion.span
                  className="text-xs font-medium transition-all"
                  style={{ 
                    color: isActive ? PRIMARY_COLOR : '#9CA3AF',
                  }}
                  animate={isActive ? {
                    scale: [1, 1.05, 1],
                  } : {}}
                  transition={isActive ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                >
                  {item.label}
                </motion.span>

                {/* Active dot */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 w-1 h-1 rounded-full"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}

function DesktopSidebar({ navItems }: { navItems: typeof ALL_NAV_ITEMS }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { institutionProfil } = useInstitutionAccess();

  if (!institutionProfil) return null;

  return (
    <nav className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r-2 border-gray-100 flex-col z-40 shadow-sm">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: PRIMARY_COLOR }}>
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-gray-900">Jùlaba</p>
            <p className="text-xs text-gray-400 truncate max-w-[140px]">{institutionProfil.nom.split(' — ')[0]}</p>
          </div>
        </div>
      </div>

      {/* Region badge */}
      <div className="px-6 py-3 border-b border-gray-50">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Supervision</span>
        <p className="text-sm font-bold text-gray-700 mt-0.5">{institutionProfil.region}</p>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left font-bold text-sm"
              style={isActive
                ? { backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }
                : { color: '#6B7280', backgroundColor: '#ffffff' }
              }
              whileHover={isActive ? {} : { backgroundColor: '#F9FAFB' }}
              whileTap={{ scale: 0.97 }}
            >
              {item.icon && React.createElement(item.icon, {className: "w-5 h-5 flex-shrink-0"})}
              {item.label}
            </motion.button>
          );
        })}
      </div>

      {/* Statut accès */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Accès accordés</p>
          <p className="text-xs font-bold" style={{ color: PRIMARY_COLOR }}>
            {Object.values(institutionProfil.modules).filter(v => v !== 'aucun').length} modules actifs
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Géré par le BackOffice Jùlaba</p>
        </div>
      </div>
    </nav>
  );
}

export function InstitutionLayout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { canAccess, institutionProfil } = useInstitutionAccess();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const institutionId = user?.id || 'institution-001';

  // Debug en mode DEV
  if (import.meta.env.DEV) {

  }

  // Vérifier si l'utilisateur est connecté en tant qu'institution
  if (user?.role !== 'institution') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl border-2 border-gray-200 p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${PRIMARY_COLOR}20` }}>
            <ShieldOff className="w-10 h-10" style={{ color: PRIMARY_COLOR }} />
          </div>
          <h2 className="font-black text-gray-900 text-xl mb-3">Accès Institution requis</h2>
          <p className="text-gray-600 text-sm mb-2">
            Cette page est réservée aux utilisateurs avec un profil <strong>Institution</strong>.
          </p>
          {import.meta.env.DEV && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4 text-left">
              <p className="text-xs font-bold text-blue-900 mb-2">MODE DÉVELOPPEMENT</p>
              <p className="text-xs text-blue-700 mb-3">
                Utilisez le bouton <strong>DEV</strong> en bas à droite pour changer de profil.
                Sélectionnez <strong>Institution — Jean Kouadio</strong> pour accéder à cette interface.
              </p>
              <p className="text-[10px] text-blue-600">
                Role actuel : <strong>{user?.role || 'Non connecté'}</strong>
              </p>
            </div>
          )}
          <motion.button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-2xl font-bold text-white"
            style={{ backgroundColor: PRIMARY_COLOR }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Retour à l'accueil
          </motion.button>
        </motion.div>
        {import.meta.env.DEV && <ProfileSwitcher />}
      </div>
    );
  }

  // Vérifier si le profil institution est chargé
  if (!institutionProfil) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full animate-pulse" style={{ backgroundColor: `${PRIMARY_COLOR}20` }} />
          <p className="text-gray-500">Chargement du profil institution...</p>
        </div>
        {import.meta.env.DEV && <ProfileSwitcher />}
      </div>
    );
  }

  // Construire la liste de navigation filtrée
  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (!item.module) return true; // "Moi" toujours visible
    return canAccess(item.module);
  });

  // Vérifier si l'institution est suspendue
  if (institutionProfil.statut === 'suspendu') {
    return (
      <div className="min-h-screen bg-gray-50">
        <InstitutionSuspended />
        {import.meta.env.DEV && <ProfileSwitcher />}
      </div>
    );
  }

  // Vérifier l'accès à la route actuelle
  const currentRouteBlocked = (() => {
    for (const item of ALL_NAV_ITEMS) {
      if (!item.module) continue;
      const matches = item.exact
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path);
      if (matches && !canAccess(item.module)) {
        return item.label;
      }
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      {/* Sidebar Desktop */}
      <DesktopSidebar navItems={navItems} />

      {/* Boutons flottants : Notifications */}
      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-6 flex items-center gap-2">
        <NotifBellButton
          userId={institutionId}
          accentColor={PRIMARY_COLOR}
          onOpen={() => setShowNotifications(true)}
        />
      </div>

      {/* Panel Notifications */}
      <NotificationsPanel
        userId={institutionId}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        accentColor={PRIMARY_COLOR}
        userRole={user?.role || 'institution'}
      />

      {/* Contenu principal */}
      <main className="lg:ml-64">
        {currentRouteBlocked ? (
          <AccessDenied module={currentRouteBlocked} />
        ) : (
          <Outlet />
        )}
      </main>

      {/* Navigation mobile — filtrée */}
      <BottomNav navItems={navItems} institutionProfil={institutionProfil} />

      {/* Dev only */}
      {import.meta.env.DEV && <ProfileSwitcher />}
    </div>
  );
}