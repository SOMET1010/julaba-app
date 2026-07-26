import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { ObjectifProvider } from '../../contexts/ObjectifContext';
import { RaccourcisProvider } from '../../contexts/RaccourcisContext';
import { stopChunkedSpeaking } from '../../services/elevenlabs';
import { safeGetItem, safeSetItem } from '../../utils/safeLocalStorage';
import { Navigation } from '../layout/Navigation';
import { RoleDashboard } from '../shared/RoleDashboard';
import { getRoleConfig, ROLE_COLORS } from '../../config/roleConfig';
import { VenteVocaleModal } from './VenteVocaleModal';
import {
  OpenDayModal,
  EditFondModal,
  CloseDayModal,
  StatsVentesModal,
  StatsMargeModal,
  ScoreModal,
  ResumeModal,
} from './MarchandModals';
import tataLouImgMarchand from "../../../assets/images/tantie-marchand.png";
import { MarchandAccueil } from './MarchandAccueil';
import { MarchandAccueilVoice } from './MarchandAccueilVoice';
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';
import { getEffectiveMode, guidageVocal } from '../../utils/accessMode';

export function MarchandHome() {
  const navigate = useNavigate();
  const { user, speak, currentSession, getTodayStats, isSpeaking, setIsModalOpen } = useApp();

  const [isJourneeExpanded, setIsJourneeExpanded] = useState(false);
  const [showOpenDayModal, setShowOpenDayModal] = useState(false);
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [showEditFondModal, setShowEditFondModal] = useState(false);
  const [showStatsVentesModal, setShowStatsVentesModal] = useState(false);
  const [showStatsMargeModal, setShowStatsMargeModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCoachMark, setShowCoachMark] = useState(false);
  const [showVenteVocaleModal, setShowVenteVocaleModal] = useState(false);

  useEffect(() => {
    const isAnyModalOpen = showOpenDayModal || showCloseDayModal || showEditFondModal ||
                          showStatsVentesModal || showStatsMargeModal || showScoreModal ||
                          showResumeModal || showVenteVocaleModal;
    setIsModalOpen(isAnyModalOpen);
    return () => setIsModalOpen(false);
  }, [showOpenDayModal, showCloseDayModal, showEditFondModal, showStatsVentesModal,
      showStatsMargeModal, showScoreModal, showResumeModal, showVenteVocaleModal,
      setIsModalOpen]);

  const [showNotifications, setShowNotifications] = useState(false);

  // Vue simple (voix-d'abord) vs avancée (tableau tactile). RÈGLE JULABA : par
  // défaut, on SUIT LE PROFIL D'ACCÈS (le même partout) — mode 'lecture' → vue
  // avancée tactile ; 'voix'/'mixte' → vue simple voix-d'abord. Un choix manuel
  // (bouton « Vue simple / avancée ») reste prioritaire s'il a été fait.
  const [modeSimple, setModeSimple] = useState<boolean>(() => {
    const saved = safeGetItem('julaba_marchand_mode');
    if (saved === 'advanced') return false;
    if (saved === 'simple') return true;
    return getEffectiveMode() !== 'lecture'; // pas de choix manuel → profil d'accès
  });

  const roleConfig = getRoleConfig('marchand');
  const stats = getTodayStats();

  // Message d'accueil CONTEXTUEL : recalculé selon l'état de la session (B12).
  // Avant, la bulle affichait toujours « Ouvre ta journée » même journée ouverte.
  const prenomAccueil = user?.prenoms || user?.firstName || 'toi';
  const accueilGreeting = currentSession?.opened
    ? `Bonjour ${prenomAccueil} ! Ta journée est ouverte, bonne vente !`
    : `Bonjour ${prenomAccueil} ! Ouvre ta journée pour commencer`;

  const dashboardStats = {
    kpi1Value: stats.ventes,
    kpi2Value: stats.cahier,
    caisse: stats.caisse,
  };

  useEffect(() => {
    const isMountedRef = { current: true };
    if (!currentSession?.opened) {
      const timer = setTimeout(() => {
        if (!isMountedRef.current) return;
        setShowCoachMark(true);
        // Guidage vocal AUTO selon le profil : silencieux en mode 'lecture'.
        if (guidageVocal()) speak('Ouvre ta journée pour activer ta caisse');
      }, 5000);
      return () => {
        isMountedRef.current = false;
        clearTimeout(timer);
        stopChunkedSpeaking();
      };
    } else {
      setShowCoachMark(false);
    }
  // speak ref instable dans AppContext (recreee a chaque render provider), exclue volontairement pour eviter boucle re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.opened]);

  // B11 : le mode Auto peut changer la présentation (simple ↔ avancée) quand il
  // apprend. Le problème n'est pas le changement (c'est la promesse produit) mais
  // le changement SILENCIEUX. Tata l'ANNONCE donc quand la vue diffère de la
  // dernière fois, et pointe le bouton pour revenir en arrière.
  useEffect(() => {
    try {
      const now = modeSimple ? 'simple' : 'avancee';
      const last = localStorage.getItem('julaba_last_view');
      if (last && last !== now && guidageVocal()) {
        const t = now === 'avancee'
          ? "J'ai remarqué que tu lis bien : je t'ai préparé l'écran complet. Tu peux revenir à l'écran simple en haut à droite."
          : "Je t'ai remis l'écran simple. Tu peux passer à l'écran complet quand tu veux.";
        setTimeout(() => speak(t), 1200);
      }
      localStorage.setItem('julaba_last_view', now);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleListenMessage = () => {
    if (!currentSession?.opened) {
      speak(`Bonjour ${user?.prenoms || user?.firstName || 'toi'} ! Ouvre ta journée pour commencer`);
      return;
    }
    let message = '';
    if (stats.ventes > 0 && stats.cahier === 0) {
      message = `Bravo ! Tu as ${(stats.ventes || 0).toLocaleString('fr-FR')} francs CFA de ventes. Ta caisse est à ${(stats.caisse || 0).toLocaleString('fr-FR')} francs CFA`;
    } else if (stats.ventes > 0 && stats.cahier > 0) {
      message = `Ta caisse actuelle est de ${(stats.caisse || 0).toLocaleString('fr-FR')} francs CFA. Continue comme ça !`;
    } else if (stats.ventes === 0 && stats.cahier > 0) {
      message = `Attention, tu as ${(stats.cahier || 0).toLocaleString('fr-FR')} francs CFA de cahier. Ta caisse est à ${(stats.caisse || 0).toLocaleString('fr-FR')} francs CFA`;
    } else {
      message = `Ta caisse est prête avec ${(stats.caisse || 0).toLocaleString('fr-FR')} francs CFA. Commence à vendre !`;
    }
    speak(message);
  };

  if (modeSimple) {
    return (
      <MarchandAccueilVoice
        onSwitchToAdvanced={() => {
          setModeSimple(false);
          safeSetItem('julaba_marchand_mode', 'advanced');
          // Pas de persistance via User.preferences : le backend n'expose pas cette propriété.
        }}
      />
    );
  }

  return (
    <>
      <NotificationsPanel userId={user?.id || ''} isOpen={showNotifications} onClose={() => setShowNotifications(false)} accentColor={ROLE_COLORS.marchand} userRole="marchand" />
      <RoleDashboard
        roleConfig={roleConfig}
        role="marchand"
        user={user}
        currentSession={currentSession}
        customGreeting={accueilGreeting}
        stats={dashboardStats}
        isSpeaking={isSpeaking}
        isJourneeExpanded={isJourneeExpanded}
        setIsJourneeExpanded={setIsJourneeExpanded}
        handleListenMessage={handleListenMessage}
        setShowOpenDayModal={setShowOpenDayModal}
        setShowEditFondModal={setShowEditFondModal}
        setShowCloseDayModal={setShowCloseDayModal}
        setShowKPI1Modal={setShowStatsVentesModal}
        setShowKPI2Modal={setShowStatsMargeModal}
        setShowScoreModal={setShowScoreModal}
        setShowResumeModal={setShowResumeModal}
        setShowAction1Modal={setShowVenteVocaleModal}
        speak={speak}
        navigate={navigate}
        showCoachMark={showCoachMark}
        onDismissCoachMark={() => setShowCoachMark(false)}
        hasSessionManagement={true}
        showKeiwa={true}
        tataLouImgSrc={tataLouImgMarchand}
        onAcademyClick={() => navigate('/marchand/academy')}
      />

      <Navigation role="marchand" />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setModeSimple(true);
            safeSetItem('julaba_marchand_mode', 'simple');
          }}
          style={{ background: 'white', border: '1.5px solid #F5E6D8', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: ROLE_COLORS.marchand, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          Vue simple
        </button>
        <NotifBellButton userId={user?.id || ''} accentColor={ROLE_COLORS.marchand} variant="solid" onOpen={() => setShowNotifications(true)} />
      </div>

      <OpenDayModal isOpen={showOpenDayModal} onClose={() => setShowOpenDayModal(false)} />
      <EditFondModal
        isOpen={showEditFondModal}
        onClose={() => setShowEditFondModal(false)}
        currentFond={currentSession?.fondInitial || 0}
      />
      <CloseDayModal
        isOpen={showCloseDayModal}
        onClose={() => setShowCloseDayModal(false)}
        stats={stats}
      />
      <StatsVentesModal
        isOpen={showStatsVentesModal}
        onClose={() => setShowStatsVentesModal(false)}
        montant={stats.ventes}
      />
      <StatsMargeModal
        isOpen={showStatsMargeModal}
        onClose={() => setShowStatsMargeModal(false)}
        marge={stats.marge}
      />
      <ScoreModal isOpen={showScoreModal} onClose={() => setShowScoreModal(false)} />
      <ResumeModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        stats={stats}
      />
      <RaccourcisProvider>
        <ObjectifProvider ventes={stats.ventes || 0}>
          <VenteVocaleModal
            isOpen={showVenteVocaleModal}
            onClose={() => setShowVenteVocaleModal(false)}
          />
        </ObjectifProvider>
      </RaccourcisProvider>
    </>
  );
}
