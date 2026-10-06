import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { useCaisse } from '../contexts/CaisseContext';

/**
 * Déconnexion VOLONTAIRE — orchestration unique et réutilisable (Phase 1, R3).
 *
 * À utiliser par TOUS les boutons de déconnexion volontaire (profil, paramètres,
 * menu latéral). N'est PAS destiné à l'expiration de session / déconnexion forcée
 * (celles-ci passent par `julaba:force-logout` et ne doivent jamais afficher la
 * confirmation ni effacer le panier — voir la spec §3).
 *
 * Doit être appelé sous <CaisseProvider> (il lit l'état du panier).
 *
 * Orchestration :
 *   1. détecte un panier en cours (venteEnCours) ;
 *   2. demande confirmation si — et seulement si — une vente est en cours ;
 *   3. n'efface le panier + sa clé locale qu'APRÈS « Se déconnecter et effacer » ;
 *   4. déconnecte les deux contextes DANS L'ORDRE (App puis User) ;
 *   5. redirige vers l'écran de connexion.
 *
 * La séquence de déconnexion est centralisée dans `performLogout` : une fois
 * lancée, elle s'exécute jusqu'au bout même si l'écran appelant se démonte
 * (la continuation de la promesse est indépendante du cycle de vie React), donc
 * le second nettoyage (userLogout) et la redirection ne sont jamais « coupés ».
 */
export function useVoluntaryLogout() {
  const navigate = useNavigate();
  const { logout: appLogout } = useApp();
  const { logout: userLogout } = useUser();
  const { venteEnCours, clearCartAndStorage } = useCaisse();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Séquence complète (sans effacer le panier : l'effacement n'a lieu que sur
  // confirmation explicite, via confirmAndClear). Le nettoyage du 2ᵉ contexte et
  // la redirection sont dans un `finally` : ils s'exécutent MÊME SI appLogout
  // échoue (rejet réseau, etc.), pour ne jamais laisser une session à moitié
  // déconnectée. Chaque étape est isolée pour qu'une erreur n'en bloque pas une autre.
  const performLogout = useCallback(async () => {
    try {
      await appLogout();   // AppContext : logout serveur + purge locale (user = null)
    } catch (e) {
      console.warn('[logout] appLogout a échoué — on poursuit le nettoyage local:', e);
    } finally {
      try {
        userLogout();      // UserContext : purge de son propre état (synchrone)
      } catch (e) {
        console.warn('[logout] userLogout a échoué:', e);
      }
      navigate('/', { replace: true });
    }
  }, [appLogout, userLogout, navigate]);

  /** Ouvre explicitement la confirmation « panier en cours » (R3). */
  const openCartConfirm = useCallback(() => setConfirmOpen(true), []);

  /** Point d'entrée par défaut : confirme si un panier existe, sinon déconnecte. */
  const requestLogout = useCallback(() => {
    if (venteEnCours) setConfirmOpen(true);
    else void performLogout();
  }, [venteEnCours, performLogout]);

  /** « Se déconnecter et effacer » : efface le panier PUIS déconnecte. */
  const confirmAndClear = useCallback(() => {
    clearCartAndStorage();
    setConfirmOpen(false);
    void performLogout();
  }, [clearCartAndStorage, performLogout]);

  /** « Continuer la vente » : annule, aucune déconnexion, panier intact. */
  const cancel = useCallback(() => setConfirmOpen(false), []);

  return {
    venteEnCours,
    requestLogout,
    openCartConfirm,
    performLogout,
    confirmOpen,
    confirmAndClear,
    cancel,
  };
}
