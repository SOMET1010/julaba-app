import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Volume2, AlertTriangle, ShieldAlert, Users, BarChart3, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { useInstitutionData } from '../../hooks/useInstitutionData';
import { ROLE_COLORS } from '../../config/roleConfig';
import { Card } from '../ui/card';
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';
import { messageAccueil, nomAffiche } from '../../services/accueilInstitution';
import { AccueilInstitutionChiffres } from './AccueilInstitutionChiffres';
import { AccueilInstitutionGraphiques } from './AccueilInstitutionGraphiques';
const tataLouImg =
  'https://res.cloudinary.com/dco5i2v0n/image/fetch/f_webp,q_auto:good,w_600,c_limit/https://i.postimg.cc/hGNkhd7V/tata-lou-icone-bleu.png';

// ── Component ────────────────────────────────────────────────────────────────
export function InstitutionHome() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { lectureDashboard, alertes = [], alertesHigh = [], loading } = useInstitutionData();
  type AlerteRow = { id: string; severity: 'high' | 'medium' | 'low'; message: string };
  const alertesList = alertes as AlerteRow[];

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAlertes, setShowAlertes] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleListenMessage = () => {
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <NotificationsPanel userId={user?.id || ''} isOpen={showNotifications} onClose={() => setShowNotifications(false)} accentColor={ROLE_COLORS.institution} userRole="institution" />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <NotifBellButton userId={user?.id || ''} accentColor={ROLE_COLORS.institution} variant="solid" onOpen={() => setShowNotifications(true)} />
      </div>
      <div className="pb-32 lg:pb-8 pt-16 lg:pt-10 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">

        {/* ── Tantie Nanti Lou — IDENTIQUE à IdentificateurHome ─────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mb-8"
        >
          <div className="flex items-stretch gap-2">
            {/* Image Tantie Nanti Lou à gauche — MÊME position/taille/animation */}
            <motion.div
              className="flex-shrink-0 flex items-center"
              animate={isSpeaking ? { y: [0, -8, 0] } : {}}
              transition={{ duration: 0.6, repeat: isSpeaking ? Infinity : 0 }}
            >
              <motion.img
                src={tataLouImg}
                alt="Tantie Nanti Lou"
                className="w-36 h-auto object-contain"
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
              />
            </motion.div>

            {/* Card contenu à droite */}
            <Card className="flex-1 px-4 py-5 rounded-3xl border-2 shadow-lg relative overflow-hidden" style={{ borderColor: ROLE_COLORS.institution }}>
              <motion.div
                className="absolute inset-0 opacity-5"
                style={{ 
                  background: `linear-gradient(135deg, ${ROLE_COLORS.institution}FF 0%, ${ROLE_COLORS.institution}99 100%)`,
                  willChange: 'transform'
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative z-10 flex flex-col h-full gap-4">
                {/* Titre */}
                <motion.h3
                  className="font-black text-gray-900 leading-none"
                  style={{ fontSize: '28px' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Tantie Nanti Lou
                </motion.h3>
                
                {/* Message */}
                <motion.p
                  className="text-gray-600 leading-snug flex-1 text-xl"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {messageAccueil(nomAffiche(user?.firstName, user?.lastName), lectureDashboard)}
                </motion.p>

                {/* Bouton écouter — bas droite */}
                <div className="flex justify-end flex-shrink-0">
                  <motion.button
                    onClick={handleListenMessage}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: ROLE_COLORS.institution }}
                    whileHover={{ scale: 1.1, boxShadow: `0 8px 20px ${ROLE_COLORS.institution}40` }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Volume2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* ── Alertes critiques actives ───────────────────────────────────── */}
        {alertesHigh.length > 0 && (
          <motion.button
            onClick={() => setShowAlertes(v => !v)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-6 bg-red-50 border-2 border-red-300 rounded-3xl p-4 text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"
              >
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </motion.div>
              <span className="font-bold text-red-800">{alertesList.length} alertes critiques actives</span>
              <span className="ml-auto text-red-500 text-sm">{showAlertes ? 'Fermer' : 'Voir tout'}</span>
            </div>
            <AnimatePresence>
              {showAlertes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  {alertesList.map(a => (
                    <div key={a.id} className={`flex items-start gap-2 p-3 rounded-2xl border-2 ${
                      a.severity === 'high' ? 'bg-red-50 border-red-200' :
                      a.severity === 'medium' ? 'bg-orange-50 border-orange-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        a.severity === 'high' ? 'text-red-500' :
                        a.severity === 'medium' ? 'text-orange-500' : 'text-yellow-500'
                      }`} />
                      <p className="text-sm text-gray-800 font-medium">{a.message}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}

        <AccueilInstitutionChiffres lecture={lectureDashboard} />
        <AccueilInstitutionGraphiques lecture={lectureDashboard} />

        {/* ── Accès rapide ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <motion.button
            onClick={() => navigate('/institution/acteurs')}
            className="text-left rounded-3xl p-6 shadow-2xl border-2 overflow-hidden relative"
            style={{
              background: 'linear-gradient(to right, #9333ea, #7e22ce, #9333ea)',
              borderColor: '#a855f7',
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.2), rgba(255,255,255,0))' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }}>
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Gérer les acteurs</h3>
                  <p className="text-white/80 text-sm">Suspendre, réactiver, voir dossiers</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </motion.button>

          <motion.button
            onClick={() => navigate('/institution/supervision')}
            className="text-left rounded-3xl p-6 shadow-2xl border-2 overflow-hidden relative"
            style={{
              background: 'linear-gradient(to right, #0d9488, #0f766e, #0d9488)',
              borderColor: '#14b8a6',
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.2), rgba(255,255,255,0))' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }}>
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Supervision</h3>
                  <p className="text-white/80 text-sm">Transactions, KPIs, Audit, Export</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}