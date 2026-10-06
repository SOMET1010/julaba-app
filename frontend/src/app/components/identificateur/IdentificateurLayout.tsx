import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { IdentificateurProvider } from '../../contexts/IdentificateurContext';
import { ZoneProvider } from '../../contexts/ZoneContext';
import { CaisseProvider } from '../../contexts/CaisseContext';
import { ProducteurProvider } from '../../contexts/ProducteurContext';
import { CooperativeProvider } from '../../contexts/CooperativeContext';
import { Sidebar } from '../layout/Sidebar';
import { BottomBar } from '../layout/BottomBar';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { ScrollToTop } from '../layout/ScrollToTop';
import { useApp } from '../../contexts/AppContext';
import { AnimatePresence, motion } from 'motion/react';
import { WifiOff, Loader2 } from 'lucide-react';
import { TantieSagesseModal } from '../assistant/TantieSagesseModal';

export function IdentificateurLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, loading, user } = useApp();
  const [tataOuverte, setTataOuverte] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-[#9F8170]" aria-label="Chargement" /></div>;
  }
  if (!user) return null;

  // La route historique est redirigée vers l’unique route canonique du formulaire.
  if (location.pathname === '/identificateur/identification') {
    return <Navigate to="/identificateur/fiche-identification" replace state={location.state} />;
  }

  const hideBottomBar = location.pathname.startsWith('/identificateur/fiche-identification');

  return (
    <ZoneProvider>
      <IdentificateurProvider>
        <CaisseProvider>
          <ProducteurProvider>
            <CooperativeProvider>
              <div className="min-h-screen bg-gray-50">
                <ScrollToTop />
                {/* Shell unique : même modèle qu'AppLayout (pas de Navigation ici, évite double Sidebar / double BottomBar) */}
                <Sidebar role="identificateur" onMicClick={() => setTataOuverte(true)} />

                <AnimatePresence>
                  {!isOnline && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
                    >
                      <div className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                        <WifiOff className="w-4 h-4" aria-hidden="true" />
                        <span className="text-sm font-semibold">Mode hors ligne</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Contenu principal */}
                <main>
                  <Outlet />
                </main>

                {/* Navigation mobile - Masquée sur les pages de formulaire */}
                {!hideBottomBar && <BottomBar role="identificateur" onMicClick={() => setTataOuverte(true)} />}

                <TantieSagesseModal
                  isOpen={tataOuverte}
                  onClose={() => setTataOuverte(false)}
                  role={user.role}
                />

                {/* Dev only */}
                {import.meta.env.DEV && <ProfileSwitcher />}
              </div>
            </CooperativeProvider>
          </ProducteurProvider>
        </CaisseProvider>
      </IdentificateurProvider>
    </ZoneProvider>
  );
}
