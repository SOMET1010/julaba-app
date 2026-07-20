/**
 * JULABA — Toast notifications style iOS
 * Un seul container monté dans AppLayout
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useNotifications, JulabaNotification, NotifType } from '../../contexts/NotificationsContext';
import { useApp } from '../../contexts/AppContext';
import {
  CreditCard, ShoppingCart, Package, CheckCircle,
  AlertTriangle, Users, FileText, Zap, Star, Shield,
  Info, Leaf, Bell,
} from 'lucide-react';

// ─── Keyframes ────────────────────────────────────────────────

let injected = false;
function injectKeyframes() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.textContent = `@keyframes julaba-progress{from{transform:scaleX(1)}to{transform:scaleX(0)}}`;
  document.head.appendChild(el);
}

// ─── Routing ──────────────────────────────────────────────────

export function getRouteForNotifType(type: NotifType, role: string, metadata?: Record<string, unknown>): string | null {
  const normalizedRole = (role === 'cooperateur') ? 'cooperative' : role;
  const base = `/${normalizedRole}`;
  const link = typeof metadata?.actionLink === 'string' ? metadata.actionLink : undefined;
  const hasSentBy = metadata?.sentBy != null;

  switch (type) {
    case 'paiement_valide': case 'paiement_recu':
    case 'paiement_collectif': case 'paiement_echoue':
    case 'success': return `${base}/keiwa`;
    case 'commande_recue': case 'nouvelle_commande':
    case 'commande_groupee_validee': case 'commande':
    case 'commande_statut': case 'negociation':
      return `${base}/commandes`;
    case 'vente':
      return role === 'marchand' ? `${base}/ventes-passees` : `${base}/commandes`;
    case 'stock_faible': case 'offre_expiree': case 'stock_rupture':
      return role === 'producteur' ? `${base}/stocks` : `${base}/stock`;
    case 'recolte_proche': case 'distribution_prete':
      return `${base}/recoltes`;
    case 'dossier_valide': case 'document_valide': case 'objectif_atteint':
    case 'reactivation': case 'dossier_rejete': case 'suspension':
    case 'evaluation_recue': case 'alerte_fraude': case 'tentative_acces':
    case 'modification_critique': case 'statut_change':
      return `${base}/profil`;
    case 'dossier_assigne': case 'dossier_en_attente':
      return role === 'identificateur' ? `${base}/identifications` : `${base}/production`;
    case 'membre_ajoute': case 'nouveau_identificateur':
      return (role === 'cooperative' || role === 'cooperateur') ? `${base}/membres` : base;
    case 'pic_transaction': case 'anomalie_systeme':
      return `${base}/keiwa/historique`;
    case 'journee_non_ouverte': return `${base}/caisse`;
    case 'info': return hasSentBy ? null : (link || base);
    default: return link || base;
  }
}

// ─── Icône + couleur ──────────────────────────────────────────

function resolveIcon(type: NotifType, metadata?: Record<string, unknown>): { bg: string; icon: React.ReactNode; round: boolean } {
  const sz = 'w-5 h-5 text-white';
  const hasSentBy = metadata?.sentBy != null;

  if (type === 'info' && hasSentBy) {
    const name = typeof metadata?.senderName === 'string' ? metadata.senderName : '';
    const parts = name.trim().split(/\s+/);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (parts[0]?.slice(0, 2).toUpperCase() || 'ME');
    return { bg: '#2072AF', icon: <span className="text-[13px] font-bold text-white">{initials}</span>, round: true };
  }

  const colors: Partial<Record<NotifType, string>> = {
    paiement_valide: '#C46210', paiement_recu: '#C46210', paiement_collectif: '#C46210',
    paiement_echoue: '#ef4444', vente: '#34c759',
    commande: '#007aff', commande_recue: '#007aff', nouvelle_commande: '#007aff',
    commande_groupee_validee: '#007aff', commande_statut: '#007aff', negociation: '#007aff',
    stock_faible: '#f59e0b', offre_expiree: '#f59e0b', stock_rupture: '#ef4444',
    recolte_proche: '#34c759', distribution_prete: '#34c759',
    dossier_valide: '#34c759', document_valide: '#34c759',
    objectif_atteint: '#34c759', reactivation: '#34c759',
    dossier_rejete: '#ef4444', suspension: '#ef4444',
    dossier_assigne: '#007aff', dossier_en_attente: '#007aff',
    membre_ajoute: '#34c759', nouveau_identificateur: '#34c759',
    evaluation_recue: '#f59e0b', alerte_fraude: '#ef4444',
    tentative_acces: '#ef4444', modification_critique: '#ef4444',
    pic_transaction: '#f59e0b', anomalie_systeme: '#f59e0b',
    journee_non_ouverte: '#f59e0b', statut_change: '#007aff',
  };

  const icons: Partial<Record<NotifType, React.ReactNode>> = {
    paiement_valide: <CreditCard className={sz} />, paiement_recu: <CreditCard className={sz} />,
    paiement_collectif: <CreditCard className={sz} />, paiement_echoue: <CreditCard className={sz} />,
    vente: <CreditCard className={sz} />,
    commande: <ShoppingCart className={sz} />, commande_recue: <ShoppingCart className={sz} />,
    nouvelle_commande: <ShoppingCart className={sz} />, commande_groupee_validee: <ShoppingCart className={sz} />,
    commande_statut: <ShoppingCart className={sz} />, negociation: <ShoppingCart className={sz} />,
    stock_faible: <Package className={sz} />, offre_expiree: <Package className={sz} />,
    stock_rupture: <Package className={sz} />,
    recolte_proche: <Leaf className={sz} />, distribution_prete: <Leaf className={sz} />,
    dossier_valide: <CheckCircle className={sz} />, document_valide: <CheckCircle className={sz} />,
    objectif_atteint: <CheckCircle className={sz} />, reactivation: <CheckCircle className={sz} />,
    dossier_rejete: <AlertTriangle className={sz} />, suspension: <AlertTriangle className={sz} />,
    dossier_assigne: <FileText className={sz} />, dossier_en_attente: <FileText className={sz} />,
    membre_ajoute: <Users className={sz} />, nouveau_identificateur: <Users className={sz} />,
    evaluation_recue: <Star className={sz} />,
    alerte_fraude: <Shield className={sz} />, tentative_acces: <Shield className={sz} />,
    modification_critique: <Shield className={sz} />, statut_change: <Shield className={sz} />,
    pic_transaction: <Zap className={sz} />, anomalie_systeme: <Zap className={sz} />,
    journee_non_ouverte: <Bell className={sz} />,
  };

  return {
    bg: colors[type] || '#aeaeb2',
    icon: icons[type] || <Info className={sz} />,
    round: false,
  };
}

function formatRelative(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 1) return 'maintenant';
  if (min < 60) return `${min} min`;
  if (h < 24) return `${h}h`;
  if (d === 1) return 'Hier';
  return `${d}j`;
}

function formatFullTime(iso: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
}

function roleToLabel(role?: string): string {
  const map: Record<string, string> = {
    cooperateur: 'COOPÉRATIVE', cooperative: 'COOPÉRATIVE',
    marchand: 'MARCHAND', producteur: 'PRODUCTEUR',
    identificateur: 'IDENTIFICATEUR', institution: 'INSTITUTION',
    admin: 'ADMIN', super_admin: 'ADMIN',
  };
  return map[String(role || '').toLowerCase()] || 'JULABA';
}

// ─── Toast individuel ─────────────────────────────────────────

interface ToastItemProps {
  notif: JulabaNotification;
  accentColor: string;
  userRole: string;
  onDismiss: () => void;
  onOpenDetail: (n: JulabaNotification) => void;
}

function ToastItem({ notif, accentColor, userRole, onDismiss, onOpenDetail }: ToastItemProps) {
  const navigate = useNavigate();
  const meta = notif.metadata;
  const { bg, icon, round } = resolveIcon(notif.type, meta);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(onDismiss, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const pause = () => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    elapsedRef.current += Date.now() - startRef.current;
  };

  const resume = () => {
    if (timerRef.current) return;
    const remaining = Math.max(0, 4000 - elapsedRef.current);
    startRef.current = Date.now();
    timerRef.current = setTimeout(onDismiss, remaining);
  };

  const sentByRole = typeof meta?.sentByRole === 'string' ? meta.sentByRole : undefined;
  const sourceLabel = notif.type === 'info' && sentByRole ? roleToLabel(sentByRole) : 'JULABA';
  const hasSentBy = meta?.sentBy != null;

  // Couleur de fond légère dérivée de bg
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const bgLight = '#FFFFFF';
  const borderLight = '#E5E7EB';

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (notif.type === 'info' && hasSentBy) {
      onOpenDetail(notif);
      onDismiss();
      return;
    }
    const route = getRouteForNotifType(notif.type, userRole, meta);
    onDismiss();
    if (route) void navigate(route);
  };

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      onMouseDown={pause} onMouseUp={resume}
      onTouchStart={pause} onTouchEnd={resume}
      onClick={handleClick}
      className="w-full cursor-pointer"
      style={{ maxWidth: 420 }}
    >
      <div style={{
        background: bgLight,
        borderRadius: 20,
        border: `1px solid ${borderLight}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'stretch',
        gap: 12,
      }}>
        {/* Icône animée — même hauteur que le contenu texte */}
        <motion.div
          animate={{
            scale: [1, 1.12, 0.96, 1.06, 1],
            rotate: [0, -8, 8, -4, 0],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            repeatDelay: 2,
            ease: 'easeInOut',
          }}
          style={{
            width: 44,
            alignSelf: 'stretch',
            borderRadius: round ? 9999 : 13,
            backgroundColor: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </motion.div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: bg, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {sourceLabel}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>{formatRelative(notif.createdAt)}</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.85)', lineHeight: 1.3 }} className="truncate">
            {notif.title}
          </p>
          {notif.title !== notif.message && (
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 1.3 }} className="truncate">
              {notif.message}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Modal détail ─────────────────────────────────────────────

interface DetailModalProps {
  notif: JulabaNotification;
  accentColor: string;
  userRole: string;
  onClose: () => void;
}

function DetailModal({ notif, accentColor, userRole, onClose }: DetailModalProps) {
  const navigate = useNavigate();
  const meta = notif.metadata;
  const route = getRouteForNotifType(notif.type, userRole, meta);

  const name = typeof meta?.senderName === 'string' ? meta.senderName : '';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.slice(0, 2).toUpperCase() || 'ME');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={{ background: '#fff', borderRadius: 28, margin: '0 16px', padding: '24px 20px 32px', maxWidth: 380, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: '#2072AF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
              {initials}
            </div>
          </div>
          <h3 style={{ textAlign: 'center', fontSize: 17, fontWeight: 600, color: '#111', marginBottom: 8 }}>
            {notif.title}
          </h3>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
            {notif.message}
          </p>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginBottom: 24 }}>
            {formatFullTime(notif.createdAt)}
          </p>
          {route && (
            <motion.button whileTap={{ scale: 0.98 }}
              style={{ width: '100%', borderRadius: 16, padding: '14px 0', background: accentColor, color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 10, border: 'none', cursor: 'pointer' }}
              onClick={() => { onClose(); void navigate(route); }}
            >
              Ouvrir
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.98 }}
            style={{ width: '100%', borderRadius: 16, padding: '14px 0', background: '#f5f5f5', color: '#333', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}
            onClick={onClose}
          >
            Fermer
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Container principal ──────────────────────────────────────

interface NotificationToastContainerProps {
  accentColor?: string;
  userRole?: string;
}

export function NotificationToastContainer({ accentColor = '#C46210', userRole = 'marchand' }: NotificationToastContainerProps) {
  const { notifications } = useNotifications();
  const { user } = useApp();
  const [visible, setVisible] = useState<JulabaNotification[]>([]);
  const [detailNotif, setDetailNotif] = useState<JulabaNotification | null>(null);
  const shownIds = useRef<Set<string>>(new Set<string>());
  const prevUserId = useRef<string | undefined>(undefined);
  const role = userRole || user?.role || 'marchand';

  useEffect(() => { injectKeyframes(); }, []);

  // Reset si changement d'utilisateur
  useEffect(() => {
    if (user?.id && user.id !== prevUserId.current) {
      prevUserId.current = user.id;
      shownIds.current = new Set<string>();
      setVisible([]);
      setDetailNotif(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Marquer les notifications déjà lues comme déjà montrées
    notifications
      .filter(n => n.userId === user.id && n.isRead)
      .forEach(n => shownIds.current.add(n.id));

    // Nouvelles notifications non lues pour cet utilisateur
    const newNotifs = notifications.filter(n =>
      n.userId === user.id &&
      !n.isRead &&
      !shownIds.current.has(n.id)
    );

    if (newNotifs.length === 0) return;
    newNotifs.forEach(n => shownIds.current.add(n.id));

    newNotifs.slice(0, 3).forEach((n, i) => {
      setTimeout(() => {
        setVisible(prev => {
          if (prev.some(p => p.id === n.id)) return prev;
          return [n, ...prev].slice(0, 3);
        });
      }, i * 600);
    });
  }, [notifications, user?.id]);

  const dismiss = (id: string) => setVisible(prev => prev.filter(n => n.id !== id));

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div style={{
        position: 'fixed',
        top: 'max(16px, env(safe-area-inset-top, 16px))',
        left: 0, right: 0,
        zIndex: 8000,
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '0 12px',
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {visible.map(notif => (
            <div key={notif.id} style={{ pointerEvents: 'all' }}>
              <ToastItem
                notif={notif}
                accentColor={accentColor}
                userRole={role}
                onDismiss={() => dismiss(notif.id)}
                onOpenDetail={setDetailNotif}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {detailNotif && (
        <DetailModal
          notif={detailNotif}
          accentColor={accentColor}
          userRole={role}
          onClose={() => setDetailNotif(null)}
        />
      )}
    </>,
    document.body
  );
}
