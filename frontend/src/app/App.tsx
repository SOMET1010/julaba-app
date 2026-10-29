import React from 'react';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Application principale
 * ═══════════════════════════════════════════════════════════════════
 */

// Providers
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import { AppProvider } from './contexts/AppContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { AuditProvider } from './contexts/AuditContext';
import { WalletProvider } from './contexts/WalletContext';
import { CommandeProvider } from './contexts/CommandeContext';
import { StockProviderInner } from './contexts/StockContext';
import { CaisseProvider } from './contexts/CaisseContext';
import { CooperativeProvider } from './contexts/CooperativeContext';
import { InstitutionProvider } from './contexts/InstitutionContext';
import { BackOfficeProvider } from './contexts/BackOfficeContext';
import { SupportConfigProvider } from './contexts/SupportConfigContext';
import { TicketsProvider } from './contexts/TicketsContext';
import { InstitutionAccessProvider } from './contexts/InstitutionAccessContext';
import { ProducteurProvider } from './contexts/ProducteurContext';
import { ShortcutsProvider } from './contexts/ShortcutsContext';
import { MotionConfig } from 'motion/react';
import { appliquerTailleTexteAuDocument } from './utils/tailleTexte';

function AnimationWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { setDark, setMode } = useTheme();
  const reduceAnimations = (user?.preferences?.reduce_animations as boolean) ?? false;
  const textSize = typeof user?.preferences?.text_size === 'number'
    ? (user.preferences.text_size as number)
    : 3;

  // Taille du texte = ZOOM réel (utils/tailleTexte). On n'écrit plus
  // --font-size inline : la valeur écrasait la base relevée du mode soleil.
  React.useEffect(() => {
    appliquerTailleTexteAuDocument(textSize);
  }, [textSize]);

  React.useEffect(() => {
    if (!user) return;
    const darkMode = user.preferences?.dark_mode;
    const themeMode = user.preferences?.theme_mode;
    if (typeof darkMode === 'boolean') setDark(darkMode);
    if (themeMode === 'auto' || themeMode === 'manuel') setMode(themeMode);
  }, [user?.id, user?.preferences?.dark_mode, user?.preferences?.theme_mode]);

  return (
    <MotionConfig reducedMotion={reduceAnimations ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ShortcutsProvider>
        <ModalProvider>
          <AppProvider>
          <UserProvider>
            <NotificationsProvider>
                <AuditProvider>
                  <WalletProvider>
                    <CommandeProvider>
                      <CaisseProvider>
                        <StockProviderInner>
                          <CooperativeProvider>
                            <InstitutionProvider>
                              <BackOfficeProvider>
                                <SupportConfigProvider>
                                  <TicketsProvider>
                                    <InstitutionAccessProvider>
                                        <ProducteurProvider>
                                          <AnimationWrapper>
                                            <ErrorBoundary><RouterProvider router={router} /></ErrorBoundary>
                                            <Toaster />
                                          </AnimationWrapper>
                                        </ProducteurProvider>
                                    </InstitutionAccessProvider>
                                  </TicketsProvider>
                                </SupportConfigProvider>
                              </BackOfficeProvider>
                            </InstitutionProvider>
                          </CooperativeProvider>
                        </StockProviderInner>
                      </CaisseProvider>
                    </CommandeProvider>
                  </WalletProvider>
                </AuditProvider>
            </NotificationsProvider>
          </UserProvider>
        </AppProvider>
        </ModalProvider>
      </ShortcutsProvider>
    </ThemeProvider>
  );
}