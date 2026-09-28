import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { BottomBar } from './BottomBar';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { ScrollToTop } from './ScrollToTop';
import { getRoleConfig } from '../../config/roleConfig';
import { checkRouteAccess } from '../../types/constants';
import { NotificationToastContainer } from '../shared/NotificationToast';
import * as audioManager from '../../services/audioManager';
import { TantieSagesseModal } from '../assistant/TantieSagesseModal';
import * as vtrace from '../../utils/voiceTrace'; // VOICE-01 : « arrivée sur un écran » dans le journal de voix
import { vlogPartager } from '../../utils/voiceDebug';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, loading, user, globalVoiceOpen, setGlobalVoiceOpen } = useApp();
  const { setUser: setUserProfile } = useUser();
  const [tataOuverte, setTataOuverte] = useState(false);
  const tataMasquee = location.pathname === '/marchand/caisse';

  // Une seule propriétaire pour Tata : le bouton mobile, la sidebar desktop et
  // le double-tap global ouvrent exactement la même modale.
  useEffect(() => {
    if (!globalVoiceOpen) return;
    if (tataMasquee) {
      setTataOuverte(false);
      setGlobalVoiceOpen(false);
      return;
    }
    setTataOuverte(true);
    setGlobalVoiceOpen(false);
  }, [globalVoiceOpen, setGlobalVoiceOpen, tataMasquee]);

  // Les callbacks restent identiques pour desktop et mobile ; si un geste ou
  // un événement global tente d'ouvrir Tantie sur la caisse, on referme aussitôt.
  useEffect(() => {
    if (tataMasquee && tataOuverte) setTataOuverte(false);
  }, [tataMasquee, tataOuverte]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }
    if (!loading && user) {
      // Le rôle primaire ne suffit pas : un utilisateur peut cumuler un rôle
      // (ex: marchand) et une adhésion à une coopérative — checkRouteAccess
      // couvre ce cumul pour les quelques routes où le backend l'autorise
      // (ex: Stock commun /cooperative/stock, ouvert à tout membre).
      const { allowed, allowedPrefix, deniedForMissingCooperative } = checkRouteAccess(
        user.role,
        location.pathname,
        user.estMembreCooperative,
      );
      if (!allowed) {
        // Refus légitime (pas de lien coopérative) : on l'explique au lieu
        // de rediriger en silence — l'utilisateur croyait sinon à un bug.
        if (deniedForMissingCooperative) {
          toast.error("Le stock commun est réservé aux membres d'une coopérative. Rejoins une coopérative pour y accéder.");
        }
        navigate(allowedPrefix);
      }
    }
  }, [user, loading, navigate, location.pathname]);

  useEffect(() => {
    if (user) {
      setUserProfile(user);
    }
  }, [user]);

  // Chef d'orchestre voix — on annule la voix de l'ANCIEN écran dans le CLEANUP lié à
  // l'ancien pathname. React exécute tous les cleanups d'un commit AVANT les nouveaux
  // effets : l'annulation précède donc le démarrage d'une voix par le nouvel écran, et
  // une voix du nouvel écran SURVIT. (Ne pas annuler dans le corps de l'effet : il
  // s'exécute APRÈS les effets enfants du nouvel écran et les couperait.)
  useEffect(() => {
    vtrace.ecran(location.pathname);
    return () => audioManager.cancelObsoleteVoice();
  }, [location.pathname]);

  // NOTIF_NEW : toast Sonner retiré du layout (géré par NotificationsContext + NotificationToastContainer).

  // Pendant le chargement initial : afficher un écran d'attente
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#B74725]" />
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
    <div className="commerce-front min-h-screen bg-gray-50">
      <ScrollToTop />
      <NotificationToastContainer
        accentColor={getRoleConfig(user.role)?.primaryColor || '#B74725'}
        userRole={user.role}
      />
      {/* Sidebar Desktop Unifié */}
      <Sidebar role={user.role as 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur'} onMicClick={() => setTataOuverte(true)} />

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
      {!hideBottomBar && <BottomBar role={user.role as 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur'} onMicClick={() => setTataOuverte(true)} />}

      <TantieSagesseModal
        isOpen={tataOuverte && !tataMasquee}
        onClose={() => setTataOuverte(false)}
        role={user.role}
      />

      {/* ── 🐞 RAPPORT DE TEST, ATTEIGNABLE DEPUIS N'IMPORTE QUEL ÉCRAN ──────
          RÉGLAGE DE PÉRIODE — demande de Patrick, 28/09, et son mot exact :
          « s'il est sur la première page il est impossible de revenir dessus
          quand on est sur une page ».

          LE DÉFAUT QU'IL DÉCRIT. Le rapport vivait à deux endroits seulement :
          l'écran de connexion (qu'on a quitté) et les Paramètres (deux gestes
          depuis la Caisse). Or c'est PENDANT l'anomalie qu'il faut l'attraper.
          Le journal, lui, n'était pas en cause : il est en anneau, recopié
          dans localStorage à chaque événement, et il survit au changement
          d'écran comme au redémarrage. C'était le BOUTON qui manquait, pas la
          trace.

          POURQUOI ICI. `AppLayout` enveloppe toutes les pages connectées : un
          seul bouton, tous les écrans — plutôt qu'un par page, dont la moitié
          finirait par manquer.

          PLACÉ À GAUCHE, AU-DESSUS DE LA BARRE DU BAS : ni sous le micro (qui
          est au centre de la BottomBar), ni sur la pastille « Mode hors ligne »
          (en haut, au centre). Rien de ce qui sert à vendre n'est recouvert.

          À RETIRER QUAND LE PILOTE SERA QUALIFIÉ. Ce n'est pas un élément de
          la charte : c'est un instrument de recette. */}
      <button
        type="button"
        aria-label="Rapport de test — copier le journal"
        onClick={async () => {
          const r = await vlogPartager();
          if (r.methode === 'copie') toast.success('Rapport copié — colle-le dans la conversation.');
          else if (r.methode === 'aucune') window.alert('Rapport :\n\n' + r.texte);
        }}
        className="lg:left-[292px] xl:left-[332px]"
        style={{
          position: 'fixed', left: 12, bottom: 96, zIndex: 60,
          display: 'flex', alignItems: 'center', gap: 8,
          minHeight: 56, padding: '10px 18px',
          fontSize: 17, lineHeight: '22px', fontWeight: 800, fontFamily: 'inherit',
          color: '#7A4A24', background: '#F5D6BD', border: '2px solid #D9A87A',
          borderRadius: 999, boxShadow: '0 4px 14px rgba(0,0,0,0.18)', cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 24 }}>🐞</span>
        Rapport
      </button>

      {/* Dev Profile Switcher - Only in development */}
      {import.meta.env.DEV && <ProfileSwitcher />}
    </div>
  );
}
