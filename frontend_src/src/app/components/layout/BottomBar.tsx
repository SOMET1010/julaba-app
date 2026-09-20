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

  // Tabs = TOUS les items de roleConfig.bottomBar.items, à plat (3, 4, peu
  // importe le nombre). Le micro « Tata » n'est PLUS un item égal aux autres :
  // avant, il s'intercalait entre les 2 premiers et les 2 derniers items,
  // avec le même style plat — ça le faisait ressembler à une destination du
  // quotidien au même titre qu'Accueil, alors que c'est un bouton d'aide.
  // Il devient un bouton rond flottant au-dessus de la barre (audit
  // accueil/profil), visuellement distinct de la navigation.
  const tabs = roleConfig.bottomBar.items.map(item => ({
    id: item.path.split('/').pop() || 'home',
    label: item.label,
    icon: ICON_MAP[item.icon] || Home,
    path: item.path,
  }));

  const handleMicClick = () => {
    setIsTantieOpen(true);
    if (onMicClick) onMicClick();
  };

  const isActive = (tab: typeof tabs[0]) => location.pathname === tab.path;

  // UN SEUL MICRO SUR LA CAISSE (VOIX-03, décision de Patrick du 20/09/2026).
  // La caisse a son propre micro, orange, câblé à la vente ET à
  // l'encaissement, qui entend l'unité dictée. Celui-ci — le bouton vert
  // « Tata » → TantieSagesseModal — vend SANS l'unité (« deux tas de gombo »
  // devient « 2 unité ») et ne connaît pas « encaisse ». Deux micros sur le
  // même écran dont l'un se trompe sur l'unité et ignore l'argent : rien ne
  // les distingue pour une marchande qui ne lit pas. On masque donc le
  // BOUTON sur la route de la caisse, pas la barre : Accueil, Stock, Profil
  // restent atteignables, et l'assistant reste partout ailleurs.
  const ROUTES_SANS_TATA = ['/marchand/caisse'];
  const tataMasquee = ROUTES_SANS_TATA.includes(location.pathname);

  // Masquer la bottom bar sur la page Wallet
  if (location.pathname.endsWith('/keiwa')) return null;
  if (isAnyModalOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bottom-bar-container commerce-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {!tataMasquee && (
        <>
          <motion.button
            type="button"
            onClick={handleMicClick}
            aria-label="Ouvrir Tata Nanti Lou"
            className="absolute flex flex-col items-center justify-center"
            style={{
              right: 18, top: -26, width: 52, height: 52, borderRadius: '50%',
              background: 'var(--commerce-green)', color: '#fff', border: '3px solid var(--commerce-paper, #fff)',
              boxShadow: '0 8px 18px -6px rgba(0,86,59,0.55)',
            }}
            whileTap={{ scale: 0.94 }}
          >
            <Mic aria-hidden="true" size={20} strokeWidth={2} />
          </motion.button>
          <span aria-hidden="true" className="absolute text-[10px] font-extrabold" style={{ right: 24, top: -34, color: 'var(--commerce-green)' }}>Tata</span>
        </>
      )}

      <nav aria-label="Navigation principale" className="flex items-stretch px-2" style={{ minHeight: 72 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon || Home;
          const active = isActive(tab);
          return (
            <motion.button
              type="button"
              key={tab.id}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-1 py-3"
              style={{ color: active ? activeColor : 'var(--encre-3)',
                borderTop: active ? `3px solid ${activeColor}` : '3px solid transparent' }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon aria-hidden="true" size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-semibold">{tab.label}</span>
            </motion.button>
          );
        })}
      </nav>
      {/* Le double-tap global (globalVoiceOpen) ouvre aussi cette modale :
          sur la caisse, il ne doit pas rouvrir le second moteur par la
          fenêtre après l'avoir fermé par la porte. */}
      <TantieSagesseModal
        isOpen={isTantieOpen && !tataMasquee}
        onClose={() => setIsTantieOpen(false)}
        role={role}
      />
    </div>
  );
}
