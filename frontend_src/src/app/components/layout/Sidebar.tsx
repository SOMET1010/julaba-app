import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Home, ShoppingCart, Mic, Package, User, Menu, X, ShoppingBag, Warehouse, TrendingUp, UserCheck, BarChart3, Users, LogOut, UserPlus, Truck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { useCooperative } from '../../contexts/CooperativeContext';
import { useVoluntaryLogout } from '../../hooks/useVoluntaryLogout';
import { LogoutConfirmDialog } from '../shared/LogoutConfirmDialog';
import { getRoleConfig, getRoleColor } from '../../config/roleConfig';
import { IMG_LOGO_JULABA } from '../../assets/images';
import { BrandSignature } from '../shared/BrandSignature';

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
  const { speak, user: appUser, setUser: setAppUser } = useApp();
  const { user: profileUser, setUser: setProfileUser } = useUser();
  const logout = useVoluntaryLogout();
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

  // Déconnexion volontaire — orchestration centralisée (confirme si panier en cours).
  const handleLogout = () => {
    speak('À bientôt sur Jùlaba');
    logout.requestLogout();
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
      <aside className="flex flex-col w-full p-5" style={{ background: 'var(--commerce-sidebar)', color: 'var(--commerce-inverse)' }}>
        <div className="commerce-brand commerce-brand-inverse py-4">
          <img src={IMG_LOGO_JULABA} alt="JULABA" /><BrandSignature />
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto py-6 space-y-2">
          {tabs.filter(tab => !tab.isMic).map(tab => {
            const Icon = tab.icon || Home;
            const active = isActive(tab);
            return (
              <motion.button type="button" key={tab.id} onClick={() => handleTabClick(tab)}
                aria-current={active ? 'page' : undefined}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-semibold"
                style={{ background: active ? 'var(--commerce-action)' : 'transparent' }}
                whileHover={{ background: active ? 'var(--commerce-action)' : '#4A384A' }}
                whileTap={{ scale: 0.98 }}>
                <Icon aria-hidden="true" size={22} /><span>{tab.label}</span>
              </motion.button>
            );
          })}
        </nav>
        <button type="button" className="flex items-center gap-3 w-full p-4 rounded-xl text-left"
          style={{ border: '1px solid #87C3A6', color: '#BCE4CF' }}
          onClick={() => {
            const micTab = tabs.find(t => t.isMic);
            if (micTab) handleTabClick(micTab);
          }}>
          <Mic aria-hidden="true" size={24} />
          <span><span className="block font-semibold">Tata Nanti Lou</span>
            <span className="block text-sm">{isListening ? "Je t'écoute..." : "Besoin d'aide ?"}</span>
          </span>
        </button>
        {(appUser || profileUser) && (
          <div className="mt-5 pt-5 space-y-4" style={{ borderTop: '1px solid #665267' }}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center font-bold shrink-0" style={{ background: '#4A384A' }}>{displayInitials}</span>
              <div className="min-w-0">
                <p className="font-semibold truncate">{displayName}</p>
                <p className="text-sm" style={{ color: '#D3C6D4' }}>{appUser?.phone || profileUser?.telephone || '—'}</p>
                <p className="text-xs capitalize" style={{ color: '#D3C6D4' }}>{role}</p>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 w-full py-3 text-sm font-semibold">
              <LogOut aria-hidden="true" size={20} />Se déconnecter
            </button>
          </div>
        )}
      </aside>
      <LogoutConfirmDialog
        open={logout.confirmOpen}
        onConfirm={logout.confirmAndClear}
        onCancel={logout.cancel}
        color={activeColor}
      />
    </div>
  );
}
