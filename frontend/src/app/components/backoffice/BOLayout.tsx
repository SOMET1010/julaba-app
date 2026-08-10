import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, UserPlus, Eye, MapPin, Wallet,
  BookOpen, Target, Settings, FileText, LogOut, Menu, X,
  Bell, Search, ChevronRight, Shield, Volume2, BarChart3,
  Building2, Headphones, MessageSquare, Hash, Clock,
  CheckCircle2, Circle, AlertCircle, Sparkles, BellRing,
  ShieldAlert, Brain, TrendingUp, BarChart2, ShoppingBag,
  Truck, Send, Timer, Moon, Sun, Keyboard, Info,
  Briefcase, Zap, GraduationCap, Layers, Key, User, ArrowLeftRight,
} from 'lucide-react';
import { useBackOffice, BORoleType } from '../../contexts/BackOfficeContext';
import { useBackOfficeOptional } from '../../contexts/BackOfficeContext';
import { useTickets, Ticket, TicketStatut } from '../../contexts/TicketsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { ZoneProvider } from '../../contexts/ZoneContext';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { BOShortcutsModal } from './BOShortcutsModal';
import { ScrollToTop } from '../layout/ScrollToTop';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { IMG_LOGO_JULABA } from '../../assets/images';
import imgLogoOrange from "@/assets/images/logo-orange-bo.png";

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_general: 'Admin général',
  admin_national: 'Admin National',
  gestionnaire_zone: 'Gestionnaire Zone',
  operateur_terrain: 'Opérateur terrain',
  identificateur: 'Identificateur',
  cooperateur: 'Coopérateur',
  institution: 'Institution',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: BO_PRIMARY,
  admin_general: BO_PRIMARY,
  admin_national: '#3B82F6',
  gestionnaire_zone: '#10B981',
  operateur_terrain: '#EA580C',
  identificateur: '#F59E0B',
  cooperateur: '#10B981',
  institution: '#6B7280',
};

const STATUT_CONFIG = {
  nouveau: { label: 'Nouveau', color: '#EF4444', bg: '#FEF2F2' },
  en_cours: { label: 'En cours', color: '#F59E0B', bg: '#FFFBEB' },
  resolu: { label: 'Résolu', color: '#10B981', bg: '#F0FDF4' },
  ferme: { label: 'Fermé', color: '#6B7280', bg: '#F9FAFB' },
};

// ── NOUVELLE STRUCTURE AVEC ACCORDÉONS ───────────────────────────────────────
interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  permission?: string | null;
  superOnly?: boolean;
  roles?: string[];
  badge?: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: any;
  color: string;
  items: MenuItem[];
}

const SIDEBAR_MENU: (MenuItem | MenuGroup)[] = [
  // Dashboard seul
  { 
    id: 'dashboard', 
    label: 'Tableau de bord', 
    icon: LayoutDashboard, 
    path: '/backoffice/dashboard', 
    permission: null 
  },
  
  // Groupe: Opérations terrain
  {
    id: 'operations',
    label: 'Opérations terrain',
    icon: Briefcase,
    color: '#3B82F6',
    items: [
      { id: 'acteurs', label: 'Acteurs', icon: Users, path: '/backoffice/acteurs', permission: 'acteurs.read' },
      { id: 'enrolement', label: 'Enrôlement', icon: UserPlus, path: '/backoffice/enrolement', permission: 'enrolement.read' },
      { id: 'supervision', label: 'Supervision', icon: Eye, path: '/backoffice/supervision', permission: 'supervision.read' },
      { id: 'zones', label: 'Zones & Territoires', icon: MapPin, path: '/backoffice/zones', permission: 'zones.read' },
      { id: 'carte', label: 'Carte des Acteurs', icon: MapPin, path: '/backoffice/carte', permission: 'acteurs.read' },
      { id: 'moderation', label: 'Modération', icon: ShieldAlert, path: '/backoffice/moderation', permission: 'moderation.read' },
      { id: 'mutations', label: 'Mutations', icon: ArrowLeftRight, path: '/backoffice/mutations', permission: 'mutations.read' },
    ],
  },
  
  // Groupe: Plateforme
  {
    id: 'plateforme',
    label: 'Plateforme',
    icon: Layers,
    color: '#8B5CF6',
    items: [
      { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, path: '/backoffice/marketplace', permission: 'marketplace.read' },
      { id: 'livraison', label: 'Livraison', icon: Truck, path: '/backoffice/livraison', permission: 'livraison.read' },
      { id: 'communication', label: 'Communication', icon: Send, path: '/backoffice/communication', permission: 'communication.read' },
      { id: 'contenus', label: 'Contenus', icon: FileText, path: '/backoffice/contenus', permission: 'contenus.read' },
    ],
  },

  {
    id: 'keiwa',
    label: 'Keiwa Wallet',
    icon: Wallet,
    color: '#C66A2C',
    items: [
      { id: 'keiwa', label: 'Tableau de bord', icon: Wallet, path: '/backoffice/keiwa', permission: null },
    ],
  },
  
  // Groupe: Administration
  {
    id: 'administration',
    label: 'Administration',
    icon: Shield,
    color: BO_PRIMARY,
    items: [
      { id: 'utilisateurs', label: 'Utilisateurs BO', icon: Shield, path: '/backoffice/utilisateurs', permission: 'utilisateurs.read', superOnly: true },
      { id: 'institutions', label: 'Institutions', icon: Building2, path: '/backoffice/institutions', permission: 'utilisateurs.read', superOnly: true },
      { id: 'config-institution', label: 'Config Institution', icon: Settings, path: '/backoffice/config-institution', permission: 'parametres.read', superOnly: true },
      { id: 'audit', label: 'Audit & Logs', icon: FileText, path: '/backoffice/audit', permission: 'audit.read' },
    ],
  },
  
  // Groupe: Intelligence
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: Brain,
    color: '#10B981',
    items: [
      { id: 'monitoring-ia', label: 'Monitoring IA', icon: Brain, path: '/backoffice/monitoring-ia', permission: 'monitoring_ia.read', superOnly: true },
      { id: 'event-monitor', label: 'Event Monitor', icon: Zap, path: '/backoffice/event-monitor', permission: 'audit.read', superOnly: true },
      { id: 'analytics', label: 'Analytics produit', icon: TrendingUp, path: '/backoffice/analytics', permission: 'analytics_produit.read', superOnly: true },
      { id: 'score-financier', label: 'Score Financier', icon: BarChart2, path: '/backoffice/score-financier', permission: 'audit.read', superOnly: true },
      { id: 'api-keys', label: 'Clés API', icon: Key, path: '/backoffice/api-keys', permission: 'audit.read', superOnly: true },
      { id: 'rapports', label: 'Rapports', icon: BarChart3, path: '/backoffice/rapports', permission: 'audit.read', roles: ['admin_general'] },
    ],
  },
  
  // Groupe: Formation & Missions
  {
    id: 'formation',
    label: 'Formation',
    icon: GraduationCap,
    color: '#F59E0B',
    items: [
      { id: 'academy', label: 'Julaba Academy', icon: BookOpen, path: '/backoffice/academy', permission: 'academy.read' },
      { id: 'missions', label: 'Missions', icon: Target, path: '/backoffice/missions', permission: 'missions.read' },
    ],
  },
  
  // Groupe: Système
  {
    id: 'systeme',
    label: 'Système',
    icon: Zap,
    color: '#6B7280',
    items: [
      { id: 'cron', label: 'Tâches planifiées', icon: Timer, path: '/backoffice/cron', permission: 'cron.read' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/backoffice/notifications', permission: null },
      { id: 'support', label: 'Support', icon: Headphones, path: '/backoffice/support', permission: null },
      { id: 'parametres', label: 'Paramètres', icon: Settings, path: '/backoffice/parametres', permission: 'parametres.read' },
    ],
  },
];

const MOBILE_BOTTOM = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, path: '/backoffice/dashboard' },
  { id: 'acteurs', label: 'Acteurs', icon: Users, path: '/backoffice/acteurs' },
  { id: 'supervision', label: 'Supervision', icon: Eye, path: '/backoffice/supervision' },
  { id: 'support', label: 'Support', icon: Headphones, path: '/backoffice/support' },
  { id: 'profil', label: 'Profil', icon: Shield, path: '/backoffice/profil' },
];

// ─── Panneau de notifications BO ────────────────────────────────────────

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

interface NotifPanelProps {
  open: boolean;
  onClose: () => void;
  tickets: Ticket[];
  nouveauxCount: number;
  onVoirTicket: (id: string) => void;
  onMarquerLu: (id: string) => void;
}

function NotifPanel({ open, onClose, tickets, nouveauxCount, onVoirTicket, onMarquerLu }: NotifPanelProps) {
  const navigate = useNavigate();
  const nonLus  = tickets.filter(t => !t.luParBO && t.statut !== 'ferme');
  const [tab, setTab] = React.useState<'nonlus' | 'tous'>('nonlus');
  const displayed = tab === 'nonlus' ? nonLus : tickets.slice(0, 20);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panneau */}
          <motion.div
            className="fixed top-[72px] right-2 sm:right-4 z-50 w-[calc(100vw-16px)] sm:w-96 max-h-[calc(100vh-96px)] flex flex-col overflow-hidden rounded-3xl border-2 shadow-2xl bg-white"
            style={{ borderColor: `${BO_PRIMARY}30` }}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {/* Header dégradé */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${BO_PRIMARY}14 0%, ${BO_PRIMARY}06 100%)`,
                borderBottom: `2px solid ${BO_PRIMARY}20`,
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-11 h-11 rounded-3xl flex items-center justify-center border-2"
                  style={{
                    background: `linear-gradient(135deg, ${BO_PRIMARY}25, ${BO_PRIMARY}10)`,
                    borderColor: `${BO_PRIMARY}35`,
                  }}
                  animate={nouveauxCount > 0 ? { scale: [1, 1.06, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <BellRing className="w-5 h-5" style={{ color: BO_PRIMARY }} />
                </motion.div>
                <div>
                  <h3 className="font-black text-gray-900 text-base leading-tight">Tickets entrants</h3>
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: BO_PRIMARY }}>
                    {nouveauxCount > 0
                      ? `${nouveauxCount} nouveau${nouveauxCount > 1 ? 'x' : ''} ticket${nouveauxCount > 1 ? 's' : ''}`
                      : 'Tout est traité'}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.88 }}
                className="w-9 h-9 rounded-2xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </motion.button>
            </div>

            {/* Filtres */}
            <div
              className="flex gap-2 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: `2px solid ${BO_PRIMARY}12` }}
            >
              {([
                { key: 'nonlus', label: 'Non traités', count: nonLus.length },
                { key: 'tous',   label: 'Tous',         count: tickets.length },
              ] as const).map(({ key, label, count }) => {
                const active = tab === key;
                return (
                  <motion.button
                    key={key}
                    onClick={() => setTab(key)}
                    whileTap={{ scale: 0.94 }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-2xl border-2 text-xs font-bold flex items-center gap-1.5 transition-all"
                    style={
                      active
                        ? {
                            background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_PRIMARY}CC)`,
                            color: '#fff',
                            borderColor: BO_PRIMARY,
                            boxShadow: `0 4px 10px ${BO_PRIMARY}40`,
                          }
                        : { color: '#6B7280', borderColor: '#E5E7EB', backgroundColor: '#fff' }
                    }
                  >
                    {label}
                    <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-xs font-black flex items-center justify-center ${active ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Liste */}
            <div className="overflow-y-auto flex-1">
              {displayed.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 px-4 gap-4"
                >
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center border-2"
                    style={{
                      background: `linear-gradient(135deg, ${BO_PRIMARY}12, ${BO_PRIMARY}06)`,
                      borderColor: `${BO_PRIMARY}20`,
                    }}
                  >
                    <CheckCircle2 className="w-9 h-9" style={{ color: `${BO_PRIMARY}90` }} />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-gray-700">Tout est à jour</p>
                    <p className="text-xs text-gray-400 mt-1">Aucun ticket en attente</p>
                  </div>
                </motion.div>
              ) : (
                <div className="p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {displayed.map((ticket, i) => {
                      const statut  = STATUT_CONFIG[ticket.statut as keyof typeof STATUT_CONFIG] ?? STATUT_CONFIG.nouveau;
                      const dernier = ticket.messages?.[ticket.messages.length - 1];
                      const isNew   = !ticket.luParBO;
                      return (
                        <motion.div
                          key={ticket.id}
                          layout
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ delay: i * 0.04, type: 'spring', damping: 26, stiffness: 280 }}
                          className={`rounded-3xl border-2 overflow-hidden cursor-pointer transition-all ${
                            isNew ? 'border-orange-200 bg-gradient-to-r from-amber-50 to-orange-50' : 'border-gray-100 bg-gray-50'
                          }`}
                          style={isNew ? { borderColor: `${BO_PRIMARY}50` } : {}}
                          onClick={() => { onVoirTicket(ticket.id); onMarquerLu(ticket.id); onClose(); }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Barre gauche colorée */}
                          <div
                            className="flex items-start gap-3 pl-4 pr-3 py-3 relative"
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
                              style={{ backgroundColor: isNew ? BO_PRIMARY : statut.color }}
                            />

                            {/* Icône statut */}
                            <div
                              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: statut.bg }}
                            >
                              {ticket.statut === 'nouveau'
                                ? <AlertCircle className="w-5 h-5" style={{ color: statut.color }} />
                                : <Circle className="w-4 h-4" style={{ color: statut.color }} />
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="font-black text-xs" style={{ color: BO_PRIMARY }}>{ticket.numero}</span>
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: statut.bg, color: statut.color }}
                                >
                                  {statut.label}
                                </span>
                                {isNew && (
                                  <motion.span
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.8 }}
                                    className="w-2 h-2 rounded-full bg-red-500 ml-auto shrink-0"
                                  />
                                )}
                              </div>
                              <p className="font-bold text-gray-800 text-xs truncate">{ticket.sujet}</p>
                              <p className="text-gray-500 text-[11px] truncate mt-0.5">{ticket.role} - {dernier?.auteurNom}</p>
                              {dernier && (
                                <p className="text-gray-400 text-[11px] mt-1 line-clamp-1 italic">
                                  "{dernier.texte}"
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatRelTime(ticket.dateCreation)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${BO_PRIMARY}08, ${BO_PRIMARY}04)`,
                borderTop: `2px solid ${BO_PRIMARY}18`,
              }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('support')}
                className="w-full py-3 rounded-3xl border-2 font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_PRIMARY}CC)`,
                  borderColor: BO_PRIMARY,
                  color: '#fff',
                  boxShadow: `0 4px 14px ${BO_PRIMARY}40`,
                }}
              >
                <Hash className="w-4 h-4" />
                Gérer tous les tickets
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Toast notification push ────────────────────────────────────────────────

interface PushToastProps {
  ticket: Ticket | null;
  onClose: () => void;
  onOuvrir: () => void;
}

function PushToast({ ticket, onClose, onOuvrir }: PushToastProps) {
  useEffect(() => {
    if (!ticket) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [ticket, onClose]);

  return (
    <AnimatePresence>
      {ticket && (
        <motion.div
          className="fixed top-20 right-2 sm:right-4 z-[100] w-[calc(100vw-16px)] sm:w-80 bg-white rounded-3xl shadow-2xl border-2 overflow-hidden"
          style={{ borderColor: BO_PRIMARY }}
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        >
          {/* Barre de progression */}
          <motion.div
            className="h-1 rounded-full"
            style={{ backgroundColor: BO_PRIMARY }}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 6, ease: 'linear' }}
          />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <motion.div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#FEE2E2' }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <BellRing className="w-5 h-5 text-red-500" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-black text-xs" style={{ color: BO_PRIMARY }}>Nouveau ticket</p>
                  <button onClick={onClose}>
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <p className="font-bold text-gray-800 text-sm">{ticket.sujet}</p>
                <p className="text-gray-500 text-xs">{ticket.role} · {ticket.messages?.[0]?.auteurNom}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
                    {ticket.numero}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { onOuvrir(); onClose(); }}
                className="flex-1 h-9 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-1.5"
                style={{ backgroundColor: BO_PRIMARY }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Répondre
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="h-9 px-3 rounded-2xl text-xs font-bold border-2 border-gray-200 text-gray-500"
              >
                Ignorer
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Sidebar navigation (mémo au niveau module : identité de composant stable) ─

const BADGE_MAP: Record<string, string> = {
  identification_soumise: 'enrolement',
  marche_suggestion: 'zones',
  acteur_alerte: 'acteurs',
  support_ticket: 'support',
  transaction_litige: 'supervision',
  moderation: 'moderation',
  mutation_decision: 'mutations',
};

function getBadgeForItem(itemId: string, parCategory: Record<string, number>): number {
  return Object.entries(BADGE_MAP)
    .filter(([, id]) => id === itemId)
    .reduce((sum, [cat]) => sum + (parCategory[cat] ?? 0), 0);
}

function getCategoryForItem(itemId: string): string {
  return Object.entries(BADGE_MAP).find(([, id]) => id === itemId)?.[0] ?? '';
}

const SidebarNavItem = React.memo(function SidebarNavItem({
  item,
  onClick,
  badge,
  nouveauxCount = 0,
}: {
  item: MenuItem;
  onClick?: () => void;
  badge?: string | number;
  nouveauxCount?: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const Icon = item.icon || Zap;
  const path = item.path;
  const active =
    Boolean(path) &&
    (location.pathname === path || location.pathname.startsWith(`${path}/`));
  const isSupport = item.id === 'support';
  const numericBadge = typeof badge === 'number' ? badge : Number.NaN;
  return (
    <motion.button
      onClick={() => {
        navigate(item.path);
        onClick?.();
      }}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors"
      style={{
        background: active ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
      }}
      whileHover={{ background: 'rgba(255, 255, 255, 0.08)' }}
      whileTap={{ scale: 0.97 }}
    >
      <motion.div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 26,
          height: 26,
          background: active ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 7,
        }}
        animate={{
          opacity: [0.92, 1, 0.92],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon className="w-3 h-3" style={{ color: '#fff' }} strokeWidth={2.2} />
      </motion.div>
      <span
        className="flex-1 text-[12px] font-medium"
        style={{ color: '#fff' }}
      >
        {item.label}
      </span>
      {!Number.isNaN(numericBadge) && numericBadge > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: 'rgba(220, 38, 38, 0.95)',
            color: '#fff',
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {numericBadge > 99 ? '99+' : numericBadge}
        </span>
      )}
      {typeof badge === 'string' && badge.trim() && (
        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full">
          {badge}
        </span>
      )}
      {isSupport && nouveauxCount > 0 && !active && (
        <motion.span
          className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {nouveauxCount}
        </motion.span>
      )}
    </motion.button>
  );
});

const SidebarGroup = React.memo(function SidebarGroup({
  group,
  onClick,
  nouveauxCount = 0,
}: {
  group: MenuGroup;
  onClick?: () => void;
  nouveauxCount?: number;
}) {
  const { hasPermission, boCounts, markCategoryRead, boUser } = useBackOffice();
  const Icon = group.icon || Zap;
  const isSuper = boUser?.role === 'super_admin';
  const visibleGroupItems = group.items.filter(item =>
    (item.superOnly ? isSuper : true) &&
    (!item.roles || isSuper || item.roles.includes(boUser?.role ?? '')) &&
    (item.permission === null || item.permission === undefined || hasPermission(item.permission))
  );

  if (visibleGroupItems.length === 0) return null;

  return (
    <div className="w-full mb-1.5">
      {/* Header de groupe (Option B - bg subtil) */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }} strokeWidth={2.5} />
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.6px' }}
        >
          {group.label}
        </span>
      </div>

      {/* Items du groupe (toujours visibles) */}
      <div className="space-y-0 pl-1">
        {visibleGroupItems.map(item => {
          const dynamicBadge = getBadgeForItem(item.id, boCounts.par_category);
          return (
            <SidebarNavItem
              key={item.id}
              item={item}
              onClick={() => {
                const category = getCategoryForItem(item.id);
                if (category) markCategoryRead(category);
                onClick?.();
              }}
              badge={dynamicBadge > 0 ? dynamicBadge : item.badge}
              nouveauxCount={nouveauxCount}
            />
          );
        })}
      </div>
      <div className="h-px mt-2" style={{ background: 'rgba(255, 255, 255, 0.08)' }} />
    </div>
  );
});

// ─── BOLayout principal ───────────────────────────────────────────────────────

export function BOLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { speak } = useApp();
  const { logout, user, setSearchQuery, searchQuery, hasPermission, setBOUser, refreshUser, boCounts, markCategoryRead } = useBackOffice();
  const { tickets = [], nouveauxCount = 0, creerTicketDemo = () => {}, marquerLuParBO = () => {} } = useTickets() || {};
  const boUser = user ? {
    ...user,
    // Lecture directe des vrais champs (pas de split de full_name qui
    // tronquerait les noms multi-mots, dont la raison sociale des entites).
    prenom: user.firstName || '',
    nom: user.lastName || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.role,
  } : null;
    const { isDark, toggleDark } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pushTicket, setPushTicket] = useState<Ticket | null>(null);
  const [bellShake, setBellShake] = useState(false);
  const [profilDropdownOpen, setProfilDropdownOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const prevCount = useRef(nouveauxCount);
  const notifPermission = useRef<NotificationPermission>('default');
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voirTicketTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profilDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (voirTicketTimerRef.current) clearTimeout(voirTicketTimerRef.current);
    };
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const idleLogout = useCallback(() => {
    try {
      localStorage.removeItem('julaba_bo_user');
    } catch {
      void 0;
    }
    logout();
    navigate('/backoffice/login');
  }, [logout, navigate]);

  const { showWarning, secondsRemaining, reset } = useIdleTimer({
    timeoutMs: 30 * 60 * 1000,
    warningMs: 60 * 1000,
    onLogout: idleLogout,
  });

  useEffect(() => {
    if (!profilDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (profilDropdownRef.current && !profilDropdownRef.current.contains(event.target as Node)) {
        setProfilDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profilDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('search-globale-input');
        if (input) (input as HTMLInputElement).focus();
      }
      if (e.key === 'Escape') {
        setProfilDropdownOpen(false);
        setShortcutsModalOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Placeholder contextuel + reset recherche au changement de page ──────────
  const searchPlaceholder = (() => {
    const p = location.pathname;
    if (p.includes('/zones')) return 'Rechercher une zone, ville, marché...';
    if (p.includes('/acteurs')) return 'Rechercher un acteur...';
    if (p.includes('/missions')) return 'Rechercher une mission...';
    if (p.includes('/audit')) return 'Rechercher dans les logs...';
    if (p.includes('/tickets') || p.includes('/support')) return 'Rechercher un ticket...';
    if (p.includes('/utilisateurs')) return 'Rechercher un utilisateur...';
    if (p.includes('/institutions')) return 'Rechercher une institution...';
    return 'Recherche globale...';
  })();

  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname]);

  // ── Détecter nouveaux tickets → push ──────────────────────────────────────
  useEffect(() => {
    let bellTimer: ReturnType<typeof setTimeout> | null = null;
    if (nouveauxCount > prevCount.current) {
      const nouveaux = tickets.filter(t => !t.luParBO && t.statut !== 'ferme');
      const dernier = nouveaux[0];
      if (dernier) {
        // Afficher le toast in-app
        setPushTicket(dernier);
        // Shake la cloche
        setBellShake(true);
        bellTimer = setTimeout(() => setBellShake(false), 1000);
        // Browser push notification si autorisée
        if ('Notification' in window && notifPermission.current === 'granted') {
          new Notification('Nouveau ticket JÙLABA', {
            body: `${dernier.sujet} - ${dernier.role} (${dernier.numero})`,
            icon: '/favicon.ico',
          });
        }
      }
    }
    prevCount.current = nouveauxCount;
    return () => {
      if (bellTimer) clearTimeout(bellTimer);
    };
  }, [nouveauxCount, tickets]);

  const ensureNotifPermission = useCallback(() => {
    if (!('Notification' in window)) return;
    if (notifPermission.current === 'granted' || notifPermission.current === 'denied') return;
    Notification.requestPermission().then(p => {
      notifPermission.current = p;
    }).catch(err => {
      console.warn('[BOLayout] notification permission request failed:', err instanceof Error ? err.message : err);
    });
  }, []);

  const handleLogout = () => {
    void speak('Au revoir. Déconnexion du Back-Office.');
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      // signOut Supabase efface automatiquement la session (clés sb-*)
      
      localStorage.removeItem('julaba_bo_user');
      navigate('/backoffice/login');
    }, 1000);
  };

  // ── Détecter la session expirée (événement émis par backoffice-api) ────────
  useEffect(() => {
    const handleSessionExpired = async () => {
      
      localStorage.removeItem('julaba_bo_user');
      navigate('/backoffice/login');
    };
    window.addEventListener('julaba:bo-session-expired', handleSessionExpired);
    return () => window.removeEventListener('julaba:bo-session-expired', handleSessionExpired);
  }, [navigate, setBOUser]);

  const handleVoirTicket = useCallback((ticketId: string) => {
    navigate('/backoffice/support');
    // Passe l'id via state pour que BOSupport puisse ouvrir ce ticket
    if (voirTicketTimerRef.current) clearTimeout(voirTicketTimerRef.current);
    voirTicketTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bo-open-ticket', { detail: { ticketId } }));
    }, 300);
  }, [navigate]);

  if (!boUser) return null;

  const isSuperUser = boUser?.role === 'super_admin';
  const visibleItems = SIDEBAR_MENU.filter(item =>
    'permission' in item
      ? (item.superOnly ? isSuperUser : true)
        && (!item.roles || isSuperUser || item.roles.includes(boUser?.role ?? ''))
        && (item.permission === null || hasPermission(item.permission))
      : true
  );

  const isActive = (path: string) =>
    path && (location.pathname === path || location.pathname.startsWith(path + '/'));

  // Vérifier si un groupe contient un item actif
  const isGroupActive = (group: MenuGroup) => {
    return group.items.some(item => isActive(item.path));
  };

  const mustChangePwd = Boolean(user?.mustChangePassword);

  return (
    <ZoneProvider>
    <div className={`min-h-screen bg-gray-50 flex overflow-x-hidden ${mustChangePwd ? 'pt-12' : ''}`}>
      <ScrollToTop />

      {mustChangePwd && (
        <div
          className="fixed top-0 left-0 right-0 z-[130] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-white text-sm shadow-md"
          style={{ backgroundColor: '#EA580C' }}
          role="status"
        >
          <span>
            Vous devez changer votre mot de passe au plus vite. Accès limité tant que ce n&apos;est pas fait.
          </span>
          <button
            type="button"
            className="shrink-0 px-3 py-1 rounded-lg font-bold text-orange-900 bg-white hover:bg-orange-50"
            onClick={() => navigate('/change-password')}
          >
            Changer maintenant
          </button>
        </div>
      )}

      {showWarning && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bo-idle-title"
        >
          <div
            className="rounded-3xl border-2 bg-white p-6 max-w-md w-full shadow-xl"
            style={{ borderColor: BO_PRIMARY }}
          >
            <h2 id="bo-idle-title" className="text-lg font-bold text-gray-900 mb-2">
              Inactivité détectée
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Vous serez déconnecté dans {secondsRemaining}{' '}
              seconde{secondsRemaining <= 1 ? '' : 's'} pour des raisons de sécurité.
            </p>
            <button
              type="button"
              className="w-full py-2.5 rounded-xl font-bold text-white"
              style={{ backgroundColor: BO_PRIMARY }}
              onClick={reset}
            >
              Rester connecté
            </button>
          </div>
        </div>
      )}

      {/* ── PUSH TOAST ─────────────────────────────────────────────────── */}
      <PushToast
        ticket={pushTicket}
        onClose={() => setPushTicket(null)}
        onOuvrir={() => pushTicket && handleVoirTicket(pushTicket.id)}
      />

      {/* ── SIDEBAR DESKTOP ───────────────────────────────────────────── */}
      <div
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[280px] xl:w-[300px] z-50 flex-col"
        style={{ backgroundColor: BO_DARK }}
      >
        {/* Logo - cliquable vers tableau de bord */}
        <motion.button
          onClick={() => navigate('/backoffice')}
          className="w-full px-4 py-5 border-b border-white/10 cursor-pointer text-left"
          style={{ backgroundColor: 'rgba(0,0,0,0)' }}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="flex flex-col items-start"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img src={IMG_LOGO_JULABA} alt="Julaba" className="w-full max-h-14 object-contain object-left" />
            
          </motion.div>
        </motion.button>

        {/* User Info */}
        <motion.button
          onClick={() => navigate('/backoffice/profil')}
          className="w-full px-3 py-2.5 border-b border-white/10 cursor-pointer text-left"
          style={{ backgroundColor: 'rgba(0,0,0,0)' }}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
              style={{
                background: boUser.photo_url
                  ? 'transparent'
                  : 'linear-gradient(135deg, #C4B8A8, #8A7E70)',
                border: '2px solid rgba(255,255,255,0.2)',
                backgroundImage: boUser.photo_url ? `url(${boUser.photo_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!boUser.photo_url && (
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>
                  {(boUser.firstName?.[0] || '') + (boUser.lastName?.[0] || '')}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[13px] font-bold leading-tight truncate"
                style={{ color: '#fff' }}
              >
                {boUser.firstName} {boUser.lastName}
              </div>
              <div
                className="text-[10.5px] mt-0.5"
                style={{ color: 'rgba(196,184,168,0.95)' }}
              >
                {boUser.role}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(196,184,168,0.7)' }} strokeWidth={2.5} />
          </div>
        </motion.button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0">
          {visibleItems.map((item, i) => {
            if ('items' in item) {
              return <SidebarGroup key={item.id + i} group={item} nouveauxCount={nouveauxCount} />;
            } else {
              const dynamicBadge = getBadgeForItem(item.id, boCounts.par_category);
              return (
                <SidebarNavItem
                  key={item.id + i}
                  item={item}
                  onClick={() => {
                    const category = getCategoryForItem(item.id);
                    if (category) markCategoryRead(category);
                  }}
                  badge={dynamicBadge > 0 ? dynamicBadge : item.badge}
                  nouveauxCount={nouveauxCount}
                />
              );
            }
          })}
        </nav>

        {/* Tantie + Logout */}
        <div className="px-4 pb-6 space-y-2 border-t border-white/10 pt-4">
  
          <motion.button
            onClick={() => speak(`Bonjour ${boUser.prenom || boUser.firstName}. Vous êtes connecté en tant que ${ROLE_LABELS[boUser.role]}. Il y a ${nouveauxCount} ticket${nouveauxCount > 1 ? 's' : ''} en attente. Comment puis-je vous aider ?`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ backgroundColor: `${BO_PRIMARY}20` }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div animate={isSpeaking ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}>
              <Volume2 className="w-5 h-5" style={{ color: BO_PRIMARY }} />
            </motion.div>
            <span className="font-semibold text-sm" style={{ color: BO_PRIMARY }}>Tata Nanti Lou</span>
          </motion.button>
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
            whileHover={{ background: 'rgba(255, 255, 255, 0.16)' }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 24,
                height: 24,
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: 7,
              }}
              animate={{ opacity: [0.92, 1, 0.92] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LogOut className="w-3 h-3" style={{ color: '#fff' }} strokeWidth={2.5} />
            </motion.div>
            <span style={{ color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Déconnexion</span>
          </motion.button>
        </div>
      </div>

      {/* ── TOPBAR DESKTOP ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex fixed top-0 right-0 z-40 h-16 items-center bg-white border-b-2 border-gray-100 shadow-sm"
        style={{ left: '280px' }}
      >
        <div className="w-full h-full flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
          {/* Recherche à gauche */}
          <div className="relative w-56 xl:w-72 flex-shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="search-globale-input"
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm bg-gray-50 transition-colors"
            />
          </div>

          {/* Groupe actions aligné à droite */}
          <div className="flex items-center gap-2.5">
            {/* Cloche notifications */}
            <motion.button
              onClick={() => { ensureNotifPermission(); setNotifOpen(o => !o); }}
              className="relative w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white shadow-sm overflow-visible cursor-pointer"
              style={{
                borderColor: notifOpen ? BO_PRIMARY : '#E5E7EB',
                background: notifOpen
                  ? `linear-gradient(135deg, ${BO_PRIMARY}18, ${BO_PRIMARY}08)`
                  : '#FFFFFF',
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              animate={bellShake ? { rotate: [0, -14, 14, -10, 10, -6, 6, 0] } : {}}
              transition={{ duration: 0.6 }}
            >
              {nouveauxCount > 0 && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: BO_PRIMARY }}
                  animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.18, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
              <Bell className="w-[18px] h-[18px]" style={{ color: nouveauxCount > 0 ? BO_PRIMARY : '#6B7280' }} />
              <AnimatePresence>
                {nouveauxCount > 0 && (
                  <motion.span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    key={nouveauxCount}
                    transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                  >
                    {nouveauxCount > 9 ? '9+' : nouveauxCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <div className="relative" ref={profilDropdownRef}>
              <motion.button
                onClick={() => setProfilDropdownOpen(open => !open)}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs cursor-pointer shadow-sm border-2 border-white"
                style={{ backgroundColor: ROLE_COLORS[boUser.role] }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Menu profil"
                aria-haspopup="menu"
                aria-expanded={profilDropdownOpen}
                title={`${boUser.prenom || boUser.firstName} ${boUser.nom || boUser.lastName} - ${ROLE_LABELS[boUser.role]}`}
              >
                {(boUser.prenom || boUser.firstName || '?').charAt(0)}{(boUser.nom || boUser.lastName || '').charAt(0)}
              </motion.button>

              <AnimatePresence>
                {profilDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden z-[200]"
                    role="menu"
                    aria-label="Menu profil"
                  >
                    <div className="px-4 py-3 border-b border-gray-100" style={{ backgroundColor: `${ROLE_COLORS[boUser.role]}10` }}>
                      <p className="font-bold text-gray-900 text-sm truncate">{boUser.prenom || boUser.firstName} {boUser.nom || boUser.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{ROLE_LABELS[boUser.role]}</p>
                    </div>

                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfilDropdownOpen(false);
                        navigate('/backoffice/profil');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-gray-500" aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-700">Profil</span>
                    </button>

                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfilDropdownOpen(false);
                        setShortcutsModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Keyboard className="w-4 h-4 text-gray-500" aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-700">Raccourcis</span>
                    </button>

                    <button
                      role="menuitem"
                      onClick={() => {
                        toggleDark();
                        setProfilDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      {isDark ? (
                        <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
                      ) : (
                        <Moon className="w-4 h-4 text-gray-500" aria-hidden="true" />
                      )}
                      <span className="text-sm font-medium text-gray-700">{isDark ? 'Mode clair' : 'Mode sombre'}</span>
                    </button>

                    <div className="border-t border-gray-100" />

                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfilDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-500" aria-hidden="true" />
                      <span className="text-sm font-medium text-red-600">Déconnexion</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Panneau notifications */}
        <NotifPanel
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          tickets={tickets}
          nouveauxCount={nouveauxCount}
          onVoirTicket={handleVoirTicket}
          onMarquerLu={marquerLuParBO}
        />
        <BOShortcutsModal isOpen={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
      </div>

      {/* ── TOPBAR MOBILE ──────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/backoffice')} className="flex items-center gap-2">
            <img src={imgLogoOrange} alt="Julaba" className="h-7 object-contain" />
          </button>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => { ensureNotifPermission(); setNotifOpen(o => !o); }}
              className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
              animate={bellShake ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
            >
              <Bell className="w-4 h-4 text-gray-600" />
              <AnimatePresence>
                {nouveauxCount > 0 && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    key={nouveauxCount}
                  >
                    {nouveauxCount > 9 ? '9+' : nouveauxCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>

        {/* Panneau notif mobile (sous la topbar) */}
        <NotifPanel
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          tickets={tickets}
          nouveauxCount={nouveauxCount}
          onVoirTicket={handleVoirTicket}
          onMarquerLu={marquerLuParBO}
        />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed top-0 right-0 bottom-0 w-72 z-50 flex flex-col"
              style={{ backgroundColor: BO_DARK }}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={IMG_LOGO_JULABA} alt="Julaba" className="h-6 object-contain" />
                </div>
                <button onClick={() => setMobileMenuOpen(false)}><X className="w-5 h-5 text-white/80" /></button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0">
                {visibleItems.map((item, i) => {
                  if ('items' in item) {
                    return <SidebarGroup key={item.id + i} group={item} onClick={() => setMobileMenuOpen(false)} nouveauxCount={nouveauxCount} />;
                  } else {
                    const dynamicBadge = getBadgeForItem(item.id, boCounts.par_category);
                    return (
                      <SidebarNavItem
                        key={item.id + i}
                        item={item}
                        nouveauxCount={nouveauxCount}
                        badge={dynamicBadge > 0 ? dynamicBadge : undefined}
                        onClick={() => {
                          const category = getCategoryForItem(item.id);
                          if (category) markCategoryRead(category);
                          setMobileMenuOpen(false);
                        }}
                      />
                    );
                  }
                })}
              </nav>
              <motion.div className="px-4 pb-8 pt-4 border-t border-white/10 space-y-2">
                {import.meta.env.DEV && (
                  <motion.button
                    onClick={() => { creerTicketDemo(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Sparkles className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-xs text-red-300">Simuler ticket entrant</span>
                  </motion.button>
                )}
                <motion.button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                  }}
                  whileHover={{ background: 'rgba(255, 255, 255, 0.16)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24,
                      height: 24,
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: 7,
                    }}
                    animate={{ opacity: [0.92, 1, 0.92] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <LogOut className="w-3 h-3" style={{ color: '#fff' }} strokeWidth={2.5} />
                  </motion.div>
                  <span style={{ color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Déconnexion</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CONTENT ────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-[280px] xl:ml-[300px] pt-14 lg:pt-16 pb-20 lg:pb-6 min-h-screen min-w-0 max-w-full overflow-x-hidden">
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor:'#AF5B23'}}></div></div>}>
          <Outlet key={location.pathname} />
        </Suspense>
      </main>

      {/* ── BOTTOM BAR MOBILE ─────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-100 shadow-lg">
        <div className="flex items-center justify-around px-2 py-2">
          {MOBILE_BOTTOM.map(item => {
            const Icon = item.icon || Zap;
            const active = isActive(item.path);
            const isSupport = item.id === 'support';
            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-2xl flex-1 relative"
                style={active ? { backgroundColor: `${BO_PRIMARY}20` } : {}}
                whileTap={{ scale: 0.9 }}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" style={{ color: active ? BO_PRIMARY : '#9ca3af' }} strokeWidth={active ? 2.5 : 2} />
                  {isSupport && nouveauxCount > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[7px] font-black flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {nouveauxCount > 9 ? '9+' : nouveauxCount}
                    </motion.span>
                  )}
                </div>
                <span className="text-[9px] font-bold" style={{ color: active ? BO_PRIMARY : '#9ca3af' }}>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ProfileSwitcher en mode DEV */}
      {import.meta.env.DEV && <ProfileSwitcher />}
    </div>
    </ZoneProvider>
  );
}