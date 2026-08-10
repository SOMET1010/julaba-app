/**
 * 🏠 COMPOSANT UNIVERSEL - PAGE ACCUEIL
 * 
 * Clone exact de MarchandHome mais adaptatif à tous les profils.
 * Utilise RoleDashboard qui est déjà universel.
 * 
 * Utilisé par :
 * - Marchand → Dashboard avec gestion de journée
 * - Producteur → Dashboard production/revenus
 * - Coopérative → Dashboard membres/commandes
 * - Identificateur → Dashboard identifications
 * - Institution → Dashboard utilisateurs/volume
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../contexts/AppContext';
import { RoleDashboard } from '../RoleDashboard';
import { getRoleConfig, RoleType } from '../../../config/roleConfig';
import { UniversalAccueilProps } from './types';
import { TantieSagesseModal } from '../../assistant/TantieSagesseModal';
import { NotifBellButton, NotificationsPanel } from '../NotificationsPanel';

// Import des modals spécifiques selon le rôle (à créer pour chaque profil)
// Pour l'instant on utilise ceux du Marchand comme référence

export function UniversalAccueil({ role }: UniversalAccueilProps) {
  const navigate = useNavigate();
  const { user, speak, currentSession, getTodayStats } = useApp();
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isJourneeExpanded, setIsJourneeExpanded] = useState(false);
  
  // États des modals (à adapter selon le rôle)
  const [showOpenDayModal, setShowOpenDayModal] = useState(false);
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [showEditFondModal, setShowEditFondModal] = useState(false);
  const [showKPI1Modal, setShowKPI1Modal] = useState(false);
  const [showKPI2Modal, setShowKPI2Modal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showAction1Modal, setShowAction1Modal] = useState(false);
  const [showAction2Modal, setShowAction2Modal] = useState(false);
  const [showCoachMark, setShowCoachMark] = useState(false);
  
  // 🆕 Tata Nanti Lou Modal
  const [showTantieSagesseModal, setShowTantieSagesseModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Configuration du rôle
  const roleConfig = getRoleConfig(role);
  const stats = getTodayStats();

  // Stats adaptées selon le rôle
  const getDashboardStats = () => {
    switch (role) {
      case 'marchand':
        return {
          kpi1Value: stats.ventes,
          kpi2Value: stats.ventes - stats.cahier, // Marge
          caisse: stats.caisse,
        };
      
      case 'producteur':
        // FUTURE: GET /api/v1/producteur/stats
        return {
          kpi1Value: 1250, // Production (kg)
          kpi2Value: 450000, // Revenus (FCFA)
        };
      
      case 'cooperative':
        // FUTURE: GET /api/v1/cooperatives/stats
        return {
          kpi1Value: 45, // Membres actifs
          kpi2Value: 2500000, // Transactions (FCFA)
        };

      case 'cooperateur':
        // FUTURE: GET /api/v1/cooperatives/stats
        return {
          kpi1Value: 45, // Membres actifs
          kpi2Value: 2500000, // Transactions (FCFA)
        };
      
      case 'identificateur':
        // FUTURE: GET /api/v1/identifications/stats
        return {
          kpi1Value: 127, // Identifications
          kpi2Value: 63500, // Commissions (FCFA)
        };
      
      case 'institution':
        // FUTURE: GET /api/v1/admin/stats
        return {
          kpi1Value: 1850, // Utilisateurs actifs
          kpi2Value: 125000000, // Volume total (FCFA)
        };
      
      default:
        return {
          kpi1Value: 0,
          kpi2Value: 0,
        };
    }
  };

  const dashboardStats = getDashboardStats();

  // Coach mark pour les profils avec gestion de journée (Marchand uniquement pour l'instant)
  useEffect(() => {
    if (role === 'marchand' && !currentSession?.opened) {
      const timer = setTimeout(() => {
        setShowCoachMark(true);
        speak('Ouvre ta journée pour activer ta caisse');
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowCoachMark(false);
    }
  }, [role, currentSession?.opened, speak]);

  const handleDismissCoachMark = () => {
    setShowCoachMark(false);
  };

  // Message vocal adapté au rôle
  const handleListenMessage = () => {
    // Marchand : vérifier la session
    if (role === 'marchand') {
      if (!currentSession?.opened) {
        const message = `Bonjour ${user?.firstName} ! Ouvre ta journée pour commencer`;
        speak(message);
        return;
      }

      let message = '';
      if (stats.ventes > 0 && stats.cahier === 0) {
        message = `Bravo ! Tu as ${(stats.ventes || 0).toLocaleString()} francs CFA de ventes. Ta caisse est à ${(stats.caisse || 0).toLocaleString()} francs CFA`;
      } else if (stats.ventes > 0 && stats.cahier > 0) {
        message = `Ta caisse actuelle est de ${(stats.caisse || 0).toLocaleString()} francs CFA. Continue comme ça !`;
      } else if (stats.ventes === 0 && stats.cahier > 0) {
        message = `Attention, tu as ${(stats.cahier || 0).toLocaleString()} francs CFA de cahier. Ta caisse est à ${(stats.caisse || 0).toLocaleString()} francs CFA`;
      } else {
        message = `Ta caisse est prête avec ${(stats.caisse || 0).toLocaleString()} francs CFA. Commence à vendre !`;
      }
      speak(message);
      return;
    }

    // Autres rôles : message générique (marchand exclu — déjà géré ci-dessus)
    const messages: Record<Exclude<RoleType, 'marchand'>, string> = {
      producteur: `Bonjour ${user?.firstName} ! Tu as produit ${dashboardStats.kpi1Value} kg et gagné ${(dashboardStats.kpi2Value || 0).toLocaleString()} francs CFA`,
      cooperative: `Bonjour ${user?.firstName} ! Tu as ${dashboardStats.kpi1Value} membres actifs et ${(dashboardStats.kpi2Value || 0).toLocaleString()} francs CFA de transactions`,
      cooperateur: `Bonjour ${user?.firstName} ! Tu as ${dashboardStats.kpi1Value} membres actifs et ${(dashboardStats.kpi2Value || 0).toLocaleString()} francs CFA de transactions`,
      identificateur: `Bonjour ${user?.firstName} ! Tu as identifié ${dashboardStats.kpi1Value} acteurs et gagné ${(dashboardStats.kpi2Value || 0).toLocaleString()} francs CFA de commissions`,
      institution: `Bonjour ${user?.firstName} ! Il y a ${dashboardStats.kpi1Value} utilisateurs actifs pour un volume de ${(dashboardStats.kpi2Value || 0).toLocaleString()} francs CFA`,
      administrateur: `Bonjour ${user?.firstName} ! Il y a ${dashboardStats.kpi1Value} utilisateurs actifs pour un volume de ${(dashboardStats.kpi2Value || 0).toLocaleString()} francs CFA`,
    };

    speak(messages[role] || roleConfig.greeting);
  };

  // Greeting personnalisé selon le rôle
  const getCustomGreeting = () => {
    if (role === 'marchand') {
      if (currentSession?.opened && currentSession.opened === true) {
        if (stats.ventes > 0 && stats.cahier === 0) {
          return `Bravo ! Tu as ${(stats.ventes || 0).toLocaleString()} FCFA de ventes. Ta caisse est à ${(stats.caisse || 0).toLocaleString()} FCFA`;
        }
        if (stats.ventes > 0 && stats.cahier > 0) {
          return `Ta caisse actuelle est de ${(stats.caisse || 0).toLocaleString()} FCFA. Continue comme ça !`;
        }
        if (stats.ventes === 0 && stats.cahier > 0) {
          return `Attention, tu as ${(stats.cahier || 0).toLocaleString()} FCFA de cahier. Ta caisse est à ${(stats.caisse || 0).toLocaleString()} FCFA`;
        }
        return `Ta caisse est prête avec ${(stats.caisse || 0).toLocaleString()} FCFA. Commence à vendre !`;
      }
      return `Bonjour ${user?.firstName} ! Ouvre ta journée pour commencer`;
    }

    // Autres rôles : utiliser le greeting de la config
    return `Bonjour ${user?.firstName} ! ${roleConfig.greeting}`;
  };

  // 🆕 Handler Tata Nanti Lou (clone du comportement Marchand)
  const handleTataLouClick = () => {
    setShowTantieSagesseModal(true);
    speak('Bonjour ! Tu veux écrire ou parler avec moi ?');
  };

  return (
    <>
      {/* Dashboard universel */}
      <RoleDashboard
        roleConfig={roleConfig}
        role={role}
        user={user}
        currentSession={currentSession}
        stats={dashboardStats}
        isSpeaking={isSpeaking}
        isJourneeExpanded={isJourneeExpanded}
        setIsJourneeExpanded={setIsJourneeExpanded}
        handleListenMessage={handleListenMessage}
        setShowOpenDayModal={role === 'marchand' ? setShowOpenDayModal : undefined}
        setShowEditFondModal={role === 'marchand' ? setShowEditFondModal : undefined}
        setShowCloseDayModal={role === 'marchand' ? setShowCloseDayModal : undefined}
        setShowKPI1Modal={setShowKPI1Modal}
        setShowKPI2Modal={setShowKPI2Modal}
        setShowScoreModal={setShowScoreModal}
        setShowResumeModal={setShowResumeModal}
        setShowAction1Modal={setShowAction1Modal}
        setShowAction2Modal={setShowAction2Modal}
        speak={speak}
        navigate={navigate}
        showCoachMark={showCoachMark}
        onDismissCoachMark={handleDismissCoachMark}
        customGreeting={getCustomGreeting() as any}
        hasSessionManagement={role === 'marchand'} // Seul le Marchand a la gestion de journée
        showKeiwa={true} // Tous les profils ont un keiwa
      />

      {/* 🆕 Modal Tata Nanti Lou (universelle pour tous les profils) */}
      <TantieSagesseModal 
        isOpen={showTantieSagesseModal} 
        onClose={() => setShowTantieSagesseModal(false)}
        role={role}
      />

      {/* 
        FUTURE: modals spécifiques par rôle
        Pour l'instant, les modals sont vides.
        À créer : UniversalModals.tsx qui affiche les bons modals selon le rôle
      */}
      <NotificationsPanel userId={user?.id || ''} isOpen={showNotifications} onClose={() => setShowNotifications(false)} accentColor="#C46210" userRole={role} />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <NotifBellButton userId={user?.id || ''} accentColor="#C46210" onOpen={() => setShowNotifications(true)} />
      </div>
    </>
  );
}