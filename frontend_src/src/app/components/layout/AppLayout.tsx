import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { BottomBar } from './BottomBar';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { ScrollToTop } from './ScrollToTop';
import { getRoleConfig } from '../../config/roleConfig';
import { ROLE_ROUTES, normalizeRole } from '../../types/constants';
import { NotificationToastContainer } from '../shared/NotificationToast';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, loading, user } = useApp();
  const { setUser: setUserProfile } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }
    if (!loading && user) {
      const normalizedRole = normalizeRole(user.role);
      const allowedPrefix = ROLE_ROUTES[normalizedRole] || '/';
      const currentPath = location.pathname;
      const isBackoffice = currentPath.startsWith('/backoffice') || currentPath.startsWith('/admin');
      const isAllowed =
        currentPath.startsWith(allowedPrefix) ||
        (isBackoffice && ['super_admin', 'admin', 'admin_national'].includes(user.role));
      if (!isAllowed) {
        navigate(allowedPrefix);
      }
    }
  }, [user, loading, navigate, location.pathname]);

  useEffect(() => {
    if (user) {
      setUserProfile(user);
    }
  }, [user]);

  // NOTIF_NEW : toast Sonner retiré du layout (géré par NotificationsContext + NotificationToastContainer).

  // Pendant le chargement initial : afficher un écran d'attente
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#C46210]" />
          <p className="text-gray-500 text-sm font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Masquer la BottomBar sur les pages Academy (plein écran immersif)
  const hiddenPaths = ['/academy', '/marchand/cahier', '/marchand/ventes-passees', '/marchand/commandes', '/marchand/support', '/marchand/alertes', '/producteur/support', '/producteur/alertes', '/cooperative/commandes', '/cooperative/support', '/institution/support'];
  const hideBottomBar = hiddenPaths.some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <NotificationToastContainer
        accentColor={getRoleConfig(user.role)?.primaryColor || '#C46210'}
        userRole={user.role}
      />
      {/* Sidebar Desktop Unifié */}
      <Sidebar role={user.role} />

      {/* Offline Badge */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-semibold">Mode hors ligne</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-h-screen pb-20 lg:pb-0 lg:pl-[280px] xl:pl-[320px]" style={{ backgroundColor: getRoleConfig(user.role)?.bgWarm || '#F8F9FA' }}>
        <Outlet />
      </main>

      {/* Bottom Navigation Mobile — masquée sur Academy */}
      {!hideBottomBar && <BottomBar role={user.role} />}

      {/* Dev Profile Switcher - Only in development */}
      {import.meta.env.DEV && <ProfileSwitcher />}
    </div>
  );
}