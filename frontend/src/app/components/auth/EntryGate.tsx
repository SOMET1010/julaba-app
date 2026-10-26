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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { normalizeRole, ROLE_ROUTES, isKnownRole, isBORole } from '../../types/constants';
import { toast } from 'sonner';
import { Welcome } from './Welcome';
import { OnboardingSlides } from './OnboardingSlides';
import { LoginPassword } from './LoginPassword';
import { noterLancement } from '../../utils/parcours';
// AUTH-14 — le diagnostic technique se tait dans le build livré (DEV seulement).
import { warnDev } from '../../utils/warnDev';
// LA REVUE « TOUT ENCORE », 26/10 : le toast « rôle non reconnu » était MUET.
// Même cas limite que /non-enregistre : la page peut être fraîchement chargée
// (session en cache + rôle inconnu), donc le filet audio-unlock s'applique.
import { speakClipOrText } from '../../services/audioManager';
import { ENTREE_VOICE_CLIPS } from '../../services/entreeVoix';
import { guidageVocal } from '../../utils/accessMode';
import { useAudioUnlockFallback } from '../../hooks/useAudioUnlockFallback';

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
      warnDev('[EntryGate] localStorage read failed (splash):', err instanceof Error ? err.message : err);
      return false;
    }
  });

  // ── LA VOIX DU RÔLE INCONNU (revue « tout encore », 26/10) ───────────────
  // Le toast seul, pour quelqu'un qui ne lit pas, c'est une déconnexion sans
  // explication. Le hook audio-unlock n'est appelable QU'AU NIVEAU DU
  // COMPOSANT : il rejoue `direRoleInconnu` au premier geste — mais ne dit
  // RIEN tant que `roleInconnuActifRef` est faux (aucun rôle inconnu = aucun
  // son, jamais). Le texte affiché (toast) est le texte DU CLIP (login-71).
  const roleInconnuActifRef = useRef(false);
  const direRoleInconnu = useCallback(() => {
    if (!roleInconnuActifRef.current || !guidageVocal()) return;
    const annonce = ENTREE_VOICE_CLIPS.roleNonReconnu;
    void speakClipOrText({ clipUrl: annonce.file, text: annonce.texte })
      .catch(() => { /* la voix n'est jamais bloquante */ });
  }, []);
  useAudioUnlockFallback(direRoleInconnu);
  
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.COMPLETED_ONBOARDING) === 'true';
    } catch (err) {
      warnDev('[EntryGate] localStorage read failed (onboarding):', err instanceof Error ? err.message : err);
      return false;
    }
  });

  // Callback pour marquer le splash comme vu
  const handleSplashComplete = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEEN_SPLASH, 'true');
    } catch (err) {
      warnDev('[EntryGate] localStorage write failed (splash):', err instanceof Error ? err.message : err);
    }
    setHasSeenSplash(true);
  };

  // Callback pour marquer l'onboarding comme complété
  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPLETED_ONBOARDING, 'true');
    } catch (err) {
      warnDev('[EntryGate] localStorage write failed (onboarding):', err instanceof Error ? err.message : err);
    }
    setHasCompletedOnboarding(true);
  };

  // Compte 1 lancement d'app par ouverture (sert au « fondu » de Tata : elle
  // accompagne au début, puis s'efface avec l'habitude). Une seule fois au mount.
  useEffect(() => { noterLancement(); }, []);

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
    // ── CETTE ÉVENTUALITÉ SE DIT (revue « tout encore », 26/10) ───────────
    // Toast + clip login-71 (mot pour mot) + filet audio-unlock : la page
    // peut être fraîchement chargée ici (session en cache + rôle inconnu).
    if (!isKnownRole(userRole)) {
      warnDev('[EntryGate] unknown role detected:', userRole);
      const annonce = ENTREE_VOICE_CLIPS.roleNonReconnu;
      toast.error(annonce.texte);
      roleInconnuActifRef.current = true;
      direRoleInconnu();
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
