import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useProducteur } from '../../contexts/ProducteurContext';
import { Navigation } from '../layout/Navigation';
import { RoleDashboard } from '../shared/RoleDashboard';
import { getRoleConfig, ROLE_COLORS } from '../../config/roleConfig';
import {
  RecoltesModal,
  VentesModal,
  ScoreModal,
  ResumeModal,
} from './ProducteurModals';
import tataLouImgProducteur from "../../../assets/images/tantie-producteur.png";
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';

export function ProducteurHome() {
  const navigate = useNavigate();
  const { user, speak, setIsModalOpen } = useApp();
  const { stats } = useProducteur();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isJourneeExpanded, setIsJourneeExpanded] = useState(false);
  const [showRecoltesModal, setShowRecoltesModal] = useState(false);
  const [showVentesModal, setShowVentesModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const isAnyModalOpen = showRecoltesModal || showVentesModal || showScoreModal ||
                          showResumeModal || showNotifications;
    setIsModalOpen(isAnyModalOpen);
    return () => setIsModalOpen(false);
  }, [showRecoltesModal, showVentesModal, showScoreModal, showResumeModal,
      showNotifications, setIsModalOpen]);

  const roleConfig = getRoleConfig('producteur');

  const dashboardStats = {
    kpi1Value: stats?.recoltesTotales ?? 0,
    kpi2Value: stats?.revenusTotal ?? 0,
  };

  const handleListenMessage = () => {
    let message = ''
    const production = stats?.recoltesTotales ?? 0;
    const revenus = stats?.revenusTotal ?? 0;
    if (production > 0 && revenus === 0) {
      message = `Tu as ${(production || 0).toLocaleString()} kilogrammes de production. Commence à vendre !`;
    } else if (production > 0 && revenus > 0) {
      message = `Bravo ! Tu as ${(production || 0).toLocaleString()} kilogrammes produits et ${(revenus || 0).toLocaleString()} francs CFA de revenus`;
    } else {
      message = `Bonjour ${user?.prenoms} ! Crée ta première plantation agricole pour démarrer`;
    }
    speak(message);
  };

  const customGreeting = (
    <>
      {(stats?.recoltesTotales ?? 0) > 0 && (stats?.revenusTotal ?? 0) === 0 && (
        `Tu as ${(stats?.recoltesTotales ?? 0).toLocaleString()} kg de production. Commence à vendre !`
      )}
      {(stats?.recoltesTotales ?? 0) > 0 && (stats?.revenusTotal ?? 0) > 0 && (
        `Bravo ! ${(stats?.recoltesTotales ?? 0).toLocaleString()} kg produits et ${(stats?.revenusTotal ?? 0).toLocaleString()} FCFA de revenus`
      )}
      {(stats?.recoltesTotales ?? 0) === 0 && (
        `Bonjour ${user?.prenoms} ! ${roleConfig.greeting}`
      )}
    </>
  );

  return (
    <>
      <RoleDashboard
        roleConfig={roleConfig}
        role="producteur"
        user={user}
        currentSession={null}
        stats={dashboardStats}
        isSpeaking={isSpeaking}
        isJourneeExpanded={isJourneeExpanded}
        setIsJourneeExpanded={setIsJourneeExpanded}
        handleListenMessage={handleListenMessage}
        setShowKPI1Modal={setShowRecoltesModal}
        setShowKPI2Modal={setShowVentesModal}
        setShowScoreModal={setShowScoreModal}
        setShowResumeModal={setShowResumeModal}
        setShowAction1Modal={undefined}
        setShowAction2Modal={undefined}
        speak={speak}
        navigate={navigate}
        customGreeting={customGreeting as any}
        hasSessionManagement={false}
        showKeiwa={true}
        tataLouImgSrc={tataLouImgProducteur}
        onAcademyClick={() => navigate('/producteur/academy')}
      />

      <Navigation role="producteur" />
      <NotificationsPanel userId={user?.id || ''} isOpen={showNotifications} onClose={() => setShowNotifications(false)} accentColor={ROLE_COLORS.producteur} userRole="producteur" />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <NotifBellButton userId={user?.id || ''} accentColor={ROLE_COLORS.producteur} variant="solid" onOpen={() => setShowNotifications(true)} />
      </div>

      <RecoltesModal isOpen={showRecoltesModal} onClose={() => setShowRecoltesModal(false)} />
      <VentesModal isOpen={showVentesModal} onClose={() => setShowVentesModal(false)} />
      <ScoreModal isOpen={showScoreModal} onClose={() => setShowScoreModal(false)} />
      <ResumeModal isOpen={showResumeModal} onClose={() => setShowResumeModal(false)} />
    </>
  );
}