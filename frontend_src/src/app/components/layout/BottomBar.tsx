import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Home, ShoppingCart, Mic, Package, User, ShoppingBag, Warehouse, TrendingUp, UserCircle, UserCheck, BarChart3, Users, UserPlus, Truck, Store, Wallet } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useModal } from '../../contexts/ModalContext';
import { TantieSagesseModal } from '../assistant/TantieSagesseModal';
import { getRoleConfig, getRoleColor } from '../../config/roleConfig';
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bottom-bar-container commerce-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <nav aria-label="Navigation principale" className="flex items-stretch px-2" style={{ minHeight: 72 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon || Home;
          const active = isActive(tab);
          return (
            <motion.button
              type="button"
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.isMic ? 'Ouvrir Tata Nanti Lou' : tab.label}
              className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-1 py-3"
              style={{ color: tab.isMic ? 'var(--commerce-green)' : active ? activeColor : 'var(--encre-3)',
                borderTop: active ? `3px solid ${activeColor}` : '3px solid transparent' }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon aria-hidden="true" size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-semibold">{tab.isMic ? 'Tata' : tab.label}</span>
            </motion.button>
          );
        })}
      </nav>
      <TantieSagesseModal
        isOpen={isTantieOpen}
        onClose={() => setIsTantieOpen(false)}
        role={role}
      />
    </div>
  );
}
