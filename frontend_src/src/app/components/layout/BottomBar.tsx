import React, { useState, useEffect } from 'react';
import { isCooperatif } from '../../types/constants';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Home, ShoppingCart, Mic, Package, User, ShoppingBag, Warehouse, TrendingUp, UserCircle, UserCheck, BarChart3, Users, UserPlus, Truck, Store, Wallet } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useModal } from '../../contexts/ModalContext';
import { TantieSagesseModal } from '../assistant/TantieSagesseModal';
import { getRoleConfig, getRoleColor } from '../../config/roleConfig';
// Import des images Tata Nanti Lou
import tataLouIcon from "../../../assets/images/tantie-icon-marchand.png";
import tataLouCooperativeIcon from "../../../assets/images/tantie-icon-cooperative.png";
import tataLouProducteurIcon from "../../../assets/images/tantie-icon-producteur.png";
import { IMG_TANTIE_SAGESSE_ICON_INSTITUTION, IMG_TANTIE_SAGESSE_ICON_IDENTIFICATEUR } from '../../assets/images';
const tataLouInstitutionIcon = IMG_TANTIE_SAGESSE_ICON_INSTITUTION;
const tataLouIdentificateurIcon = IMG_TANTIE_SAGESSE_ICON_IDENTIFICATEUR;

interface BottomBarProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  onMicClick?: () => void;
}

// Map des icônes disponibles
const ICON_MAP: Record<string, any> = {
  Home,
  Store,
  Package,
  User,
  ShoppingCart,
  Sprout: Warehouse,
  Users,
  UserCheck,
  UserPlus,
  BarChart3,
  Truck,
};

export function BottomBar({ role, onMicClick }: BottomBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { speak, isModalOpen: isLegacyModalOpen, globalVoiceOpen, setGlobalVoiceOpen } = useApp();
  const { isAnyModalOpen } = useModal();
  const [isListening, setIsListening] = useState(false);
  const [isTantieOpen, setIsTantieOpen] = useState(false);

  // Synchro avec double-tap global
  useEffect(() => {
    if (globalVoiceOpen) {
      setIsTantieOpen(true);
      setGlobalVoiceOpen(false);
    }
  }, [globalVoiceOpen, setGlobalVoiceOpen]);

  // Utiliser roleConfig pour obtenir la couleur et les items
  const roleConfig = getRoleConfig(role);
  const activeColor = getRoleColor(role);

  // Construire les tabs depuis roleConfig.bottomBar.items + Mic au milieu
  const configItems = roleConfig.bottomBar.items;
  const tabs = [
    // Premier et deuxième items
    ...configItems.slice(0, 2).map(item => ({
      id: item.path.split('/').pop() || 'home',
      label: item.label,
      icon: ICON_MAP[item.icon] || Home,
      path: item.path,
      isMic: false,
    })),
    // Mic au milieu
    {
      id: 'mic',
      label: 'Micro',
      icon: Mic,
      path: null,
      isMic: true,
    },
    // Troisième et quatrième items
    ...configItems.slice(2, 4).map(item => ({
      id: item.path.split('/').pop() || 'item',
      label: item.label,
      icon: ICON_MAP[item.icon] || Package,
      path: item.path,
      isMic: false,
    })),
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.isMic) {
      // Ouvrir le modal Tata Nanti Lou
      setIsTantieOpen(true);
      if (onMicClick) {
        onMicClick();
      }
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.isMic) return false;
    return location.pathname === tab.path;
  };

  // Masquer la bottom bar sur la page Wallet
  if (location.pathname.endsWith('/keiwa')) return null;
  if (isAnyModalOpen) return null;

  // Sélectionner l'image Tata Nanti Lou selon le rôle
  const tataLouImage = 
    isCooperatif(role) ? tataLouCooperativeIcon :
    role === 'producteur' ? tataLouProducteurIcon :
    role === 'institution' ? tataLouInstitutionIcon :
    role === 'identificateur' ? tataLouIdentificateurIcon :
    tataLouIcon;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe lg:hidden bottom-bar-container" style={{ backgroundColor: '#FFF2E9' }}>
      {/* Glassmorphism Background */}
      <AnimatePresence>
        {(
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div 
              className="relative overflow-visible"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 -1px 0 rgba(0, 0, 0, 0.08)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Active indicator wave */}
              <AnimatePresence mode="wait">
                {tabs.map((tab) => {
                  if (isActive(tab)) {
                    const index = tabs.findIndex(t => t.id === tab.id);
                    return (
                      <motion.div
                        key={tab.id}
                        className="absolute top-0 h-1 rounded-full"
                        style={{ 
                          backgroundColor: activeColor,
                          width: '20%',
                        }}
                        initial={{ left: '0%', opacity: 0 }}
                        animate={{ 
                          left: `${index * 20}%`,
                          opacity: 1,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 30 
                        }}
                      />
                    );
                  }
                  return null;
                })}
              </AnimatePresence>

              {/* Tabs Container */}
              <div className="flex items-center justify-around px-2" style={{ height: 72, overflow: 'visible' }}>
                {tabs.map((tab, index) => {
                  const Icon = tab.icon || Home;
                  const active = isActive(tab);
                  const isMic = tab.isMic;

                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => handleTabClick(tab)}
                      className={`relative flex flex-col items-center justify-center ${
                        isMic ? 'w-16 h-16' : 'flex-1 h-full'
                      } transition-all`}
                      whileTap={{ scale: 0.85 }}
                    >
                      {/* Mic Button - Special styling - FLOTTANT */}
                      {isMic ? (
                        <div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                          style={{ marginTop: -8, borderRadius: '50%' }}
                        >
                          {/* Permanent pulse animation - RÉDUIT */}
                          <motion.div
                            className="absolute inset-0 rounded-full -m-1"
                            style={{ backgroundColor: activeColor }}
                            animate={{
                              scale: [1, 1.03, 1],
                              opacity: [0.06, 0, 0.06]
                            }}
                            transition={{ 
                              duration: 3.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />

                          {/* Listening pulse */}
                          <AnimatePresence>
                            {isListening && (
                              <>
                                <motion.div
                                  className="absolute inset-0 rounded-full -m-3"
                                  style={{ backgroundColor: activeColor }}
                                  initial={{ scale: 1, opacity: 0.6 }}
                                  animate={{ scale: 2, opacity: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                />
                                <motion.div
                                  className="absolute inset-0 rounded-full -m-3"
                                  style={{ backgroundColor: activeColor }}
                                  initial={{ scale: 1, opacity: 0.6 }}
                                  animate={{ scale: 2.5, opacity: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                />
                              </>
                            )}
                          </AnimatePresence>

                          {/* Mic Circle - AGRANDI */}
                          <motion.div
                            className="relative w-16 h-16 rounded-full flex items-center justify-center"
                            animate={{ 
                              y: [0, -2, 0],
                            }}
                            transition={{ 
                              duration: 3.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <motion.img
                              src={tataLouImage}
                              alt="Tata Nanti Lou"
                              className="w-full h-full object-cover"
                              animate={isListening ? { 
                                scale: [1, 1.1, 1],
                                rotate: [0, 3, -3, 0]
                              } : { 
                                scale: [1, 1.05, 1]
                              }}
                              transition={{ 
                                duration: isListening ? 0.6 : 3.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          </motion.div>
                        </div>
                      ) : (
                        // Regular Tab
                        <>
                          {/* Icon with 3D effect */}
                          <motion.div
                            className="relative mb-1"
                            animate={active ? {
                              y: [0, -4, 0],
                              rotateY: [0, 5, 0, -5, 0],
                            } : {}}
                            transition={active ? {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            } : {}}
                          >
                            {/* 3D Shadow */}
                            {active && (
                              <motion.div
                                className="absolute inset-0 blur-md opacity-50"
                                style={{ backgroundColor: activeColor }}
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.3, 0.5, 0.3],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              />
                            )}
                            
                            <Icon 
                              className="w-6 h-6 relative z-10 transition-all" 
                              style={{ 
                                color: active ? activeColor : '#9CA3AF',
                                filter: active ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none',
                              }}
                              strokeWidth={active ? 2.5 : 2}
                            />
                          </motion.div>

                          {/* Label */}
                          <motion.span
                            className="text-xs font-medium transition-all"
                            style={{ 
                              color: active ? activeColor : '#9CA3AF',
                            }}
                            animate={active ? {
                              scale: [1, 1.05, 1],
                            } : {}}
                            transition={active ? {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            } : {}}
                          >
                            {tab.label}
                          </motion.span>

                          {/* Active dot */}
                          <AnimatePresence>
                            {active && (
                              <motion.div
                                className="absolute -bottom-1 w-1 h-1 rounded-full"
                                style={{ backgroundColor: activeColor }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                              />
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tata Nanti Lou Modal */}
      <TantieSagesseModal
        isOpen={isTantieOpen}
        onClose={() => setIsTantieOpen(false)}
        role={role}
      />
    </div>
  );
}