import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Home, ShoppingCart, Mic, Package, User, Menu, X, ShoppingBag, Warehouse, TrendingUp, UserCheck, BarChart3, Users, LogOut, UserPlus, Truck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { useCooperative } from '../../contexts/CooperativeContext';
import { getRoleConfig, getRoleColor } from '../../config/roleConfig';
import { SIDEBAR_WIDTH } from '../../config/responsive';

interface SidebarProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  onMicClick?: () => void;
}

// Map des icônes disponibles
const ICON_MAP: Record<string, any> = {
  Home,
  Store: ShoppingCart,
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

export function Sidebar({ role, onMicClick }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { speak, user: appUser, setUser: setAppUser, logout: appLogout } = useApp();
  const { user: profileUser, setUser: setProfileUser, logout: userLogout } = useUser();
  const { cooperative } = useCooperative();
  const isCooperateur = appUser?.role === 'cooperateur' || appUser?.role === 'cooperative';
  const displayName = appUser
    ? (isCooperateur && cooperative?.nom
        ? cooperative.nom
        : `${appUser.firstName ?? ''} ${appUser.lastName ?? ''}`.trim())
    : profileUser
      ? `${profileUser.prenoms || ''} ${profileUser.nom || ''}`.trim() || 'Utilisateur'
      : '';
  const displayInitials = appUser
    ? isCooperateur && cooperative?.nom
      ? cooperative.nom.charAt(0).toUpperCase()
      : `${(appUser.firstName || '?').charAt(0)}${(appUser.lastName || '').charAt(0)}`
    : profileUser
      ? `${(profileUser.prenoms || '?').charAt(0)}${(profileUser.nom || '').charAt(0)}`
      : '?';
  const [isListening, setIsListening] = useState(false);

  // Utiliser roleConfig pour obtenir la couleur et les items
  const roleConfig = getRoleConfig(role);
  const activeColor = getRoleColor(role);

  // Fonction de déconnexion
  const handleLogout = async () => {
    speak('À bientôt sur Jùlaba');
    await appLogout();
    userLogout();
  };

  // Construire les tabs depuis roleConfig.bottomBar.items + Mic
  const configItems = roleConfig.bottomBar.items;
  const tabs = [
    ...configItems.map(item => ({
      id: item.path.split('/').pop() || 'home',
      label: item.label,
      icon: ICON_MAP[item.icon] || Home,
      path: item.path,
      isMic: false,
    })),
    // Ajouter Tata Nanti Lou à la fin pour Desktop
    {
      id: 'mic',
      label: 'Tata Nanti Lou',
      icon: Mic,
      path: null,
      isMic: true,
    },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.isMic) {
      // Activate Tata Nanti Lou
      setIsListening(!isListening);
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

  return (
    <div className="hidden lg:flex fixed left-0 top-0 bottom-0 z-[45] lg:w-[280px] xl:w-[320px]">
      {/* Glassmorphism Background */}
      <div 
        className="relative mx-4 my-4 rounded-[2rem] overflow-hidden flex flex-col w-full"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Header with Logo JULABA */}
        <div className="px-4 py-5 border-b border-gray-100">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md"
                style={{ backgroundColor: activeColor }}
              >
                J
              </div>
              <div className="flex-1">
                <h1 className="font-black text-xl" style={{ color: activeColor, fontFamily: 'Calisga, serif' }}>Jùlaba</h1>
                <p className="text-xs text-gray-500 font-medium">Plateforme nationale</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation Items */}
        <div className="relative flex-1 py-6 overflow-y-auto">
          {/* Active indicator */}
          <AnimatePresence mode="wait">
            {tabs.filter(t => !t.isMic).map((tab) => {
              if (isActive(tab)) {
                const index = tabs.filter(t => !t.isMic).findIndex(t => t.id === tab.id);
                return (
                  <motion.div
                    key={tab.id}
                    className="absolute left-0 w-1.5 h-16 rounded-r-full"
                    style={{ 
                      backgroundColor: activeColor,
                    }}
                    initial={{ top: 0, opacity: 0 }}
                    animate={{ 
                      top: `${index * 80 + 24}px`,
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

          {/* Menu items (sans Mic) */}
          <div className="flex flex-col gap-3 px-4">
            {tabs.filter(tab => !tab.isMic).map((tab) => {
              const Icon = tab.icon || Home;
              const active = isActive(tab);

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`relative flex items-center gap-5 px-5 py-4 rounded-2xl transition-all ${
                    active ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Icon with 3D effect */}
                  <motion.div
                    className="relative flex items-center justify-center"
                    animate={active ? {
                      y: [0, -2, 0],
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
                        className="absolute inset-0 blur-lg opacity-50"
                        style={{ backgroundColor: activeColor }}
                        animate={{
                          scale: [1, 1.3, 1],
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
                      className="w-7 h-7 relative z-10 transition-all" 
                      style={{ 
                        color: active ? activeColor : '#9CA3AF',
                        filter: active ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none',
                      }}
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    className="text-base font-semibold transition-all"
                    style={{ 
                      color: active ? activeColor : '#9CA3AF',
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      scale: active ? [1, 1.02, 1] : 1,
                    }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={active ? {
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      opacity: { duration: 0.2 },
                      x: { duration: 0.2 },
                    } : {
                      duration: 0.2
                    }}
                  >
                    {tab.label}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Tata Nanti Lou Card - En bas */}
        <div className="px-4 pb-3 border-t border-gray-100">
          <motion.button
            onClick={() => {
              const micTab = tabs.find(t => t.isMic);
              if (micTab) handleTabClick(micTab);
            }}
            className="w-full mt-3 relative overflow-hidden rounded-2xl p-4 transition-all hover:shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${activeColor}15, ${activeColor}25)`,
              border: `2px solid ${activeColor}40`,
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Permanent pulse animation background */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ backgroundColor: activeColor }}
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.05, 0.15, 0.05]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Listening pulse */}
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ backgroundColor: activeColor }}
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ backgroundColor: activeColor }}
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                  />
                </>
              )}
            </AnimatePresence>

            <div className="relative z-10 flex items-center gap-3">
              {/* Mic Icon */}
              <motion.div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: activeColor }}
                animate={isListening ? { 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                } : { 
                  y: [0, -2, 0]
                }}
                transition={{ 
                  duration: isListening ? 0.6 : 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Mic className="w-6 h-6 text-white" strokeWidth={2.5} />
              </motion.div>

              {/* Text */}
              <motion.div
                className="flex-1 text-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="font-bold text-sm" style={{ color: activeColor }}>
                  Tata Nanti Lou
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {isListening ? "Je t'écoute..." : "Besoin d'aide ?"}
                </p>
              </motion.div>

              {/* Glow effect when listening */}
              {isListening && (
                <motion.div
                  className="absolute -right-2 -top-2 w-4 h-4 rounded-full"
                  style={{ backgroundColor: activeColor }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                />
              )}
            </div>
          </motion.button>
        </div>

        {/* Footer - User Profile & Logout (AppContext et/ou UserContext — IdentificateurLayout ne passe pas par AppLayout) */}
        <div className="px-4 pb-4 space-y-3">
          {/* User Info Card */}
          {(appUser || profileUser) && (
            <>
              <motion.div
                className="px-4 py-3 rounded-xl border-2"
                style={{ 
                  backgroundColor: `${activeColor}10`,
                  borderColor: `${activeColor}30`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md"
                    style={{ backgroundColor: activeColor }}
                  >
                    {displayInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      {appUser?.phone || profileUser?.telephone || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600">Profil</p>
                  <p className="text-xs font-bold capitalize" style={{ color: activeColor }}>
                    {role}
                  </p>
                </div>
              </motion.div>

              {/* Logout Button */}
              <motion.button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 border-2 border-red-200 transition-all"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
              >
                <LogOut className="w-5 h-5 text-red-600" strokeWidth={2.5} />
                <span className="text-sm font-bold text-red-600">Se déconnecter</span>
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}