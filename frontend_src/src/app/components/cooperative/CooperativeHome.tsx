import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Wallet, Users, UserPlus } from 'lucide-react';
import { Card } from '../ui/card';
import { useApp } from '../../contexts/AppContext';
import { useModalRegister } from '../../contexts/ModalContext';
import { useCooperative } from '../../contexts/CooperativeContext';
import { usePredictiveTTS } from '../../services/predictiveTTS';
import { Navigation } from '../layout/Navigation';
import { RoleDashboard } from '../shared/RoleDashboard';
import { getRoleConfig, ROLE_COLORS } from '../../config/roleConfig';
import {
  VolumeModal,
  TransactionsModal,
  ScoreModal,
  ResumeModal,
  AchatsGroupesModal,
  VentesGroupeesModal,
} from './CooperativeModals';
import tataLouImgCooperative from "../../../assets/images/tantie-cooperative.png";
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';

export function CooperativeHome() {
  const navigate = useNavigate();
  const { user, speak } = useApp();
  const { stats, getMembresActifs, cooperative, membres } = useCooperative();

  usePredictiveTTS({
    module: 'dashboard',
    prenom: user?.prenoms || user?.prenoms || 'ma chere',
    hasVentes: (getMembresActifs?.().length || 0) > 0,
    recentIntents: [],
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isJourneeExpanded, setIsJourneeExpanded] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showAchatsGroupesModal, setShowAchatsGroupesModal] = useState(false);
  const [showVentesGroupeesModal, setShowVentesGroupeesModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const pendingBesoinsCount = (membres || []).filter((m) => m.statut === 'en_attente').length;

  // Gérer l'affichage de la bottom bar selon l'état des modals
  useModalRegister(
    showVolumeModal || showTransactionsModal || showScoreModal ||
    showResumeModal || showAchatsGroupesModal || showVentesGroupeesModal
  );

  // Configuration du rôle Coopérative
  const roleConfig = getRoleConfig('cooperative');

  // Stats pour le dashboard
  const dashboardStats = {
    kpi1Value: stats.volumeGroupe, // Montant FCFA des ventes groupees validees
    kpi2Value: stats.tresorerieActuelle, // Solde trésorerie en FCFA
    caisse: stats.totalCotisations, // Total cotisations en FCFA (ligne3 du résumé)
  };

  const currentSession = null; // Pas de session pour coopérative

  const handleListenMessage = () => {
    const message = `Bonjour ! La coopérative ${cooperative?.nom || user?.prenoms} compte ${getMembresActifs().length} membres actifs avec ${(dashboardStats.kpi1Value || 0).toLocaleString()} francs CFA de ventes groupées et ${(dashboardStats.kpi2Value || 0).toLocaleString()} francs CFA en trésorerie`;
    speak(message);
  };

  // Greeting personnalisé
  const customGreeting = (
    <>
      {dashboardStats.kpi1Value > 0 && (
        `${(dashboardStats.kpi1Value || 0).toLocaleString()} FCFA groupés • ${(dashboardStats.kpi2Value || 0).toLocaleString()} FCFA en trésorerie`
      )}
      {dashboardStats.kpi1Value === 0 && (
        `Bienvenue ${cooperative?.nom || user?.prenoms} ! ${roleConfig.greeting}`
      )}
    </>
  );

  // Stats pour le modal résumé
  const resumeStats = {
    volume: dashboardStats.kpi1Value,
    transactions: dashboardStats.kpi2Value,
    membres: getMembresActifs().length,
  };

  return (
    <>
      {/* Dashboard Coopérative harmonisé */}
      <RoleDashboard
        roleConfig={roleConfig}
        role="cooperative"
        user={user}
        currentSession={currentSession}
        stats={dashboardStats}
        isSpeaking={isSpeaking}
        isJourneeExpanded={isJourneeExpanded}
        setIsJourneeExpanded={setIsJourneeExpanded}
        handleListenMessage={handleListenMessage}
        setShowKPI1Modal={setShowVolumeModal}
        setShowKPI2Modal={setShowTransactionsModal}
        setShowScoreModal={setShowScoreModal}
        setShowResumeModal={setShowResumeModal}
        setShowAction1Modal={setShowAchatsGroupesModal}
        setShowAction2Modal={setShowVentesGroupeesModal}
        hideMainActions={true}
        speak={speak}
        navigate={navigate}
        customGreeting={customGreeting as any}
        hasSessionManagement={false}
        showKeiwa={true}
        tataLouImgSrc={tataLouImgCooperative}
        onAcademyClick={() => navigate('/cooperative/academy')}
      />

      <div className="px-4 lg:px-8 -mt-2 mb-4 lg:pl-[320px]">
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'finances', label: 'Finances', subtitle: 'Trésorerie', icon: Wallet, onClick: () => navigate('/cooperative/finances') },
            { key: 'membres', label: 'Membres', subtitle: 'Gérer les membres', icon: Users, onClick: () => navigate('/cooperative/membres') },
            { key: 'ajouter', label: 'Ajouter membre', subtitle: 'Nouveau marchand', icon: UserPlus, onClick: () => navigate('/cooperative/membres?openAdd=1') },
          ].map(({ key, label, subtitle, icon: Icon, onClick }) => (
            <motion.div key={key} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
              <button type="button" onClick={onClick} className="w-full text-left">
                <Card
                  className="p-3 rounded-3xl border-2 bg-gradient-to-br from-blue-50 via-white to-blue-50"
                  style={{ borderColor: '#2072AF' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium mb-0.5 font-bold text-[16px] text-gray-600">{label}</p>
                      <p className="text-xs text-gray-600">{subtitle}</p>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#2072AF22' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: '#2072AF' }} />
                    </motion.div>
                  </div>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
        {pendingBesoinsCount > 0 && (
          <div
            className="mt-3 px-3 py-2"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 14,
              color: '#92400e',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {pendingBesoinsCount} adhésions en attente. À traiter dans la gestion des membres.
          </div>
        )}
      </div>

      <Navigation role="cooperative" />
      <NotificationsPanel userId={user?.id || ''} isOpen={showNotifications} onClose={() => setShowNotifications(false)} accentColor={ROLE_COLORS.cooperative} userRole="cooperative" />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <NotifBellButton userId={user?.id || ''} accentColor={ROLE_COLORS.cooperative} variant="solid" onOpen={() => setShowNotifications(true)} />
      </div>

      {/* Modals KPIs */}
      <VolumeModal 
        isOpen={showVolumeModal} 
        onClose={() => setShowVolumeModal(false)}
        volume={dashboardStats.kpi1Value}
      />
      <TransactionsModal 
        isOpen={showTransactionsModal} 
        onClose={() => setShowTransactionsModal(false)}
        montant={dashboardStats.kpi2Value}
      />
      <ScoreModal isOpen={showScoreModal} onClose={() => setShowScoreModal(false)} />
      <ResumeModal 
        isOpen={showResumeModal} 
        onClose={() => setShowResumeModal(false)}
        stats={resumeStats}
      />

      {/* Modals Actions */}
      <AchatsGroupesModal 
        isOpen={showAchatsGroupesModal} 
        onClose={() => setShowAchatsGroupesModal(false)}
      />
      <VentesGroupeesModal 
        isOpen={showVentesGroupeesModal} 
        onClose={() => setShowVentesGroupeesModal(false)}
      />
    </>
  );
}