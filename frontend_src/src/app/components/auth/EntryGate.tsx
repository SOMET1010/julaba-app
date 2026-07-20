/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Entry Gate (Point d'entrée unique)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Gère le flow strict :
 * 1. Splash (Welcome)
 * 2. Onboarding (4 écrans)
 * 3. Login (LoginPassword)
 * 4. Application principale
 * 
 * AUCUNE redirection en cascade - Logique centralisée unique
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { normalizeRole, ROLE_ROUTES, isKnownRole, isBORole } from '../../types/constants';
import { toast } from 'sonner';
import { Welcome } from './Welcome';
import { OnboardingSlides } from './OnboardingSlides';
import { LoginPassword } from './LoginPassword';

// Clés localStorage
const STORAGE_KEYS = {
  SEEN_SPLASH: 'julaba_seen_splash',
  COMPLETED_ONBOARDING: 'julaba_completed_onboarding',
};

export function EntryGate() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { user: appUser } = useApp();

  const [hasSeenSplash, setHasSeenSplash] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SEEN_SPLASH) === 'true';
    } catch (err) {
      console.warn('[EntryGate] localStorage read failed (splash):', err instanceof Error ? err.message : err);
      return false;
    }
  });
  
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.COMPLETED_ONBOARDING) === 'true';
    } catch (err) {
      console.warn('[EntryGate] localStorage read failed (onboarding):', err instanceof Error ? err.message : err);
      return false;
    }
  });

  // Callback pour marquer le splash comme vu
  const handleSplashComplete = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEEN_SPLASH, 'true');
    } catch (err) {
      console.warn('[EntryGate] localStorage write failed (splash):', err instanceof Error ? err.message : err);
    }
    setHasSeenSplash(true);
  };

  // Callback pour marquer l'onboarding comme complété
  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPLETED_ONBOARDING, 'true');
    } catch (err) {
      console.warn('[EntryGate] localStorage write failed (onboarding):', err instanceof Error ? err.message : err);
    }
    setHasCompletedOnboarding(true);
  };

  // Si utilisateur authentifié, rediriger vers son interface
  useEffect(() => {
    if (!user || !hasSeenSplash || !hasCompletedOnboarding) return;

    // Compte en changement de mot de passe obligatoire : router vers l'écran dédié, ne pas monter le dashboard
    if ((appUser as { mustChangePassword?: boolean } | null)?.mustChangePassword) {
      navigate('/change-password', { replace: true });
      return;
    }

    const userRole = typeof user.role === 'string' ? user.role : '';

    // Cas rôle inconnu : logout forcé + toast (anti état zombie post-auth)
    if (!isKnownRole(userRole)) {
      console.warn('[EntryGate] unknown role detected:', userRole);
      toast.error('Rôle utilisateur non reconnu. Reconnexion requise.');
      // Tentative logout via event global (BackOffice/AppContext écoutent)
      window.dispatchEvent(new CustomEvent('julaba:force-logout'));
      // Fallback navigation immédiate vers login
      navigate('/', { replace: true });
      return;
    }

    // Routing centralisé via ROLE_ROUTES (étendu avec rôles BO)
    const target = isBORole(userRole)
      ? '/backoffice/dashboard'
      : ROLE_ROUTES[normalizeRole(userRole)] ?? '/';

    navigate(target, { replace: true });
  }, [user, appUser, hasSeenSplash, hasCompletedOnboarding, navigate]);

  // ═══════════════════════════════════════════════════════════════════
  // LOGIQUE UNIQUE - PAS DE NAVIGATION EN CASCADE
  // ═══════════════════════════════════════════════════════════════════

  // 1. Splash non vu
  if (!hasSeenSplash) {
    return <Welcome onComplete={handleSplashComplete} />;
  }

  // 2. Onboarding non complété
  if (!hasCompletedOnboarding) {
    return <OnboardingSlides onComplete={handleOnboardingComplete} />;
  }

  // 3. Non authentifié
  if (!user) {
    return <LoginPassword />;
  }

  // 4. Authentifié - L'useEffect ci-dessus gère la redirection
  // Afficher un écran de chargement pendant la redirection
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600"
      style={{ minHeight: '100dvh' }}
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"
          aria-hidden="true"
        ></div>
        <p className="text-white text-xl font-bold">Chargement...</p>
      </div>
    </div>
  );
}
