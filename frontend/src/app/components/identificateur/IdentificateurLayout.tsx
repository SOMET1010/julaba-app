import React from 'react';
import { Outlet, useLocation } from 'react-router';
import { IdentificateurProvider } from '../../contexts/IdentificateurContext';
import { ZoneProvider } from '../../contexts/ZoneContext';
import { CaisseProvider } from '../../contexts/CaisseContext';
import { ProducteurProvider } from '../../contexts/ProducteurContext';
import { CooperativeProvider } from '../../contexts/CooperativeContext';
import { Sidebar } from '../layout/Sidebar';
import { BottomBar } from '../layout/BottomBar';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { ScrollToTop } from '../layout/ScrollToTop';

export function IdentificateurLayout() {
  const location = useLocation();

  // Masquage BottomBar restreint aux routes formulaire identificateur (préfixe explicite)
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
                <Sidebar role="identificateur" />

                {/* Contenu principal */}
                <main>
                  <Outlet />
                </main>

                {/* Navigation mobile - Masquée sur les pages de formulaire */}
                {!hideBottomBar && <BottomBar role="identificateur" />}

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