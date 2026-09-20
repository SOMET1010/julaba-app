import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Home, ShoppingCart, Mic, Package, User, ShoppingBag, Warehouse, TrendingUp, UserCircle, UserCheck, BarChart3, Users, UserPlus, Truck, Store, Wallet } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';
import { getRoleConfig, getRoleColor } from '../../config/roleConfig';
import tataAccueil from '../../../assets/redesign/tata-accueil.webp';
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
  const { isAnyModalOpen } = useModal();

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
            className="commerce-tata-dock absolute flex flex-col items-center justify-center"
            whileTap={{ scale: 0.94 }}
          >
            <img src={tataAccueil} alt="" aria-hidden="true" />
          </motion.button>
          <span aria-hidden="true" className="commerce-tata-label absolute">Tata</span>
        </>
      )}

      <nav aria-label="Navigation principale" className="flex items-stretch px-2 commerce-bottom-nav" style={{ minHeight: 74 }}>
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
              className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 commerce-bottom-tab"
              data-active={active ? 'true' : 'false'}
              style={{ color: active ? activeColor : 'var(--encre-3)' }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="commerce-bottom-icon"><Icon aria-hidden="true" size={24} strokeWidth={active ? 2.7 : 2} /></span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </motion.button>
          );
        })}
      </nav>

    </div>
  );
}
