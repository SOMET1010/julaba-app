/**
 * JULABA — Panel Notifications v6
 * Modal détail via portal. Notifications lues grisées, jamais supprimées.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { useNavigate } from 'react-router';
import { Bell, X, CheckCircle, ShoppingCart, CreditCard, Package, AlertTriangle, Users, FileText, Shield, Zap, Info, Star, Trash2, Check, Leaf } from 'lucide-react';
import { useNotifications, JulabaNotification, NotifType } from '../../contexts/NotificationsContext';
import { useApp } from '../../contexts/AppContext';
import { useModalRegister } from '../../contexts/ModalContext';
import { ROLE_COLORS } from '../../config/roleConfig';
import { getRouteForNotifType } from './NotificationToast';

// ─── Helpers ──────────────────────────────────────────────────

function hexToPale(hex: string, l = 0.93): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r + (255 - r) * l)},${Math.round(g + (255 - g) * l)},${Math.round(b + (255 - b) * l)})`;
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

function getSenderInitials(metadata?: Record<string, unknown>): string {
  const name = typeof metadata?.senderName === 'string' ? metadata.senderName : '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || 'ME';
}

// ─── Icône par type ───────────────────────────────────────────

function getIconConfig(type: NotifType, accent: string): { icon: React.ReactNode; bg: string } {
  const sz = 'w-5 h-5';
  switch (type) {
    case 'paiement_valide': case 'paiement_recu': case 'paiement_collectif':
      return { icon: <CreditCard className={sz} />, bg: accent };
    case 'paiement_echoue': return { icon: <CreditCard className={sz} />, bg: '#ef4444' };
    case 'commande_recue': case 'nouvelle_commande': case 'commande_groupee_validee':
    case 'commande': case 'commande_statut': case 'negociation':
      return { icon: <ShoppingCart className={sz} />, bg: '#007aff' };
    case 'vente': return { icon: <CreditCard className={sz} />, bg: '#34c759' };
    case 'stock_faible': case 'offre_expiree':
      return { icon: <Package className={sz} />, bg: '#f59e0b' };
    case 'stock_rupture': return { icon: <Package className={sz} />, bg: '#ef4444' };
    case 'recolte_proche': case 'distribution_prete':
      return { icon: <Leaf className={sz} />, bg: '#34c759' };
    case 'dossier_valide': case 'document_valide': case 'objectif_atteint': case 'reactivation':
      return { icon: <CheckCircle className={sz} />, bg: '#34c759' };
    case 'dossier_rejete': case 'suspension':
      return { icon: <AlertTriangle className={sz} />, bg: '#ef4444' };
    case 'dossier_assigne': case 'dossier_en_attente':
      return { icon: <FileText className={sz} />, bg: '#007aff' };
    case 'membre_ajoute': case 'nouveau_identificateur':
      return { icon: <Users className={sz} />, bg: '#34c759' };
    case 'evaluation_recue': return { icon: <Star className={sz} />, bg: '#f59e0b' };
    case 'alerte_fraude': case 'tentative_acces': case 'modification_critique':
      return { icon: <Shield className={sz} />, bg: '#ef4444' };
    case 'pic_transaction': case 'anomalie_systeme':
      return { icon: <Zap className={sz} />, bg: '#f59e0b' };
    case 'journee_non_ouverte': return { icon: <Bell className={sz} />, bg: '#f59e0b' };
    case 'statut_change': return { icon: <Shield className={sz} />, bg: '#007aff' };
    case 'info': return { icon: <Info className={sz} />, bg: '#2072AF' };
    default: return { icon: <Info className={sz} />, bg: '#aeaeb2' };
  }
}

// ─── Modal détail via portal ──────────────────────────────────

interface DetailModalProps {
  notif: JulabaNotification;
  accentColor: string;
  userRole: string;
  onClose: () => void;
}

function PanelDetailModal({ notif, accentColor, userRole, onClose }: DetailModalProps) {
  const navigate = useNavigate();
  const route = getRouteForNotifType(notif.type, userRole, notif.metadata);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
          <div style={{ width: 64, height: 64, borderRadius: 32, background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
            {getSenderInitials(notif.metadata)}
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
    </motion.div>,
    document.body
  );
}

// ─── Carte notification ───────────────────────────────────────

interface NotifCardProps {
  notif: JulabaNotification;
  accentColor: string;
  userRole: string;
  onClose: () => void;
  onShowDetail: (n: JulabaNotification) => void;
  showRestore?: boolean;
  onRestore?: () => void;
}

function NotifCard({ notif, accentColor, userRole, onClose, onShowDetail, showRestore, onRestore }: NotifCardProps) {
  const navigate = useNavigate();
  const { markAsRead, deleteNotif } = useNotifications();
  const { icon, bg } = getIconConfig(notif.type, accentColor);

  const handleClick = () => {
    // Ouvrir détail ou naviguer AVANT de marquer lu
    const hasSentBy = notif.metadata?.sentBy != null;
    if (notif.type === 'info' && hasSentBy) {
      onShowDetail(notif);
      // Marquer lu en arrière-plan sans bloquer l'UI
      void markAsRead(notif.id);
      return;
    }
    const route = getRouteForNotifType(notif.type, userRole, notif.metadata);
    if (route) {
      void markAsRead(notif.id);
      onClose();
      navigate(route);
    } else {
      void markAsRead(notif.id);
    }
  };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60) {
      void deleteNotif(notif.id).catch((e: any) => console.warn('[NotifCard] deleteNotif failed:', e?.message));
    }
    if (info.offset.x > 60 && !notif.isRead) void markAsRead(notif.id);
  };

  const borderColor = notif.priority === 'critical' ? '#ef4444'
    : notif.priority === 'high' ? '#f59e0b'
    : `${accentColor}40`;

  return (
    <motion.div layout className="relative" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}>
      {/* Fond swipe gauche — supprimer (toujours visible) */}
      {!showRestore && !notif.isRead && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', borderRadius: 16 }}>
          <Trash2 className="w-4 h-4 text-white" />
        </div>
      )}
      {/* Fond swipe droite — marquer lu (masqué si déjà lu) */}
      {!notif.isRead && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#34c759', borderRadius: 16 }}>
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <motion.div
        drag={notif.isRead ? false : "x"}
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.08}
        onDragEnd={notif.isRead ? undefined : handleDragEnd}
        onClick={handleClick}
        className="relative flex items-center gap-3 cursor-pointer"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '12px',
          opacity: notif.isRead || showRestore ? 0.45 : 1,
          border: `1.5px solid ${borderColor}`,
          zIndex: 1,
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Icône */}
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: notif.isRead ? '#aeaeb2' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          {icon}
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: notif.isRead ? '#aaa' : accentColor, opacity: 0.8, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
            {notif.type.replace(/_/g, ' ')}
          </p>
          <p style={{ fontSize: 14, fontWeight: notif.isRead ? 400 : 600, color: notif.isRead ? '#999' : '#111', marginBottom: 2 }} className="truncate">
            {notif.title}
          </p>
          <p style={{ fontSize: 12, color: notif.isRead ? '#bbb' : '#666' }} className="truncate">
            {notif.message}
          </p>
        </div>

        {/* Méta */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#aaa' }}>{formatRelative(notif.createdAt)}</span>
          {!notif.isRead && (
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accentColor }} />
          )}
        </div>
      </motion.div>

      {showRestore && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <motion.button onClick={e => { e.stopPropagation(); onRestore?.(); }} whileTap={{ scale: 0.97 }}
            style={{ padding: '5px 14px', borderRadius: 10, background: 'transparent', color: accentColor, fontWeight: 600, fontSize: 12, border: `1.5px solid ${accentColor}50`, cursor: 'pointer' }}>
            Restaurer
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Séparateur date ──────────────────────────────────────────

function DateSep({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: `${color}1A` }} />
      <span style={{ fontSize: 11, color: `${color}80`, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: `${color}1A` }} />
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────

const FILTRES = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'non-lues', label: 'Non lues' },
  { key: 'critiques', label: 'Critiques' },
  { key: 'corbeille', label: 'Corbeille' },
] as const;

type Filtre = typeof FILTRES[number]['key'];

interface NotificationsPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  userRole?: string;
}

export function NotificationsPanel({ userId, isOpen, onClose, accentColor: accentProp = '', userRole = 'marchand' }: NotificationsPanelProps) {
  const { notifications, trashNotifications, markAllAsRead, deleteNotif, restoreNotification, refreshTrashNotifications } = useNotifications();
  const { user } = useApp();
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [selectedNotif, setSelectedNotif] = useState<JulabaNotification | null>(null);

  const accentColor = accentProp || ROLE_COLORS[user?.role as keyof typeof ROLE_COLORS] || '#C46210';
  const rawRole = (userRole && userRole !== 'marchand')
    ? userRole
    : (user?.role || userRole || 'marchand');
  const role = (rawRole === 'cooperateur') ? 'cooperative' : rawRole;
  const effectiveUserId = user?.id || userId;
  const myNotifs = notifications.filter(n => !effectiveUserId || n.userId === effectiveUserId);

  useModalRegister(isOpen);

  useEffect(() => {
    if (isOpen) void refreshTrashNotifications().catch((e: any) => console.warn('[NotificationsPanel] refreshTrash failed:', e?.message));
  }, [isOpen]);

  // Fermer la modal détail quand le panel se ferme
  useEffect(() => {
    if (!isOpen) setSelectedNotif(null);
  }, [isOpen]);

  const trash = trashNotifications.filter(n => !effectiveUserId || n.userId === effectiveUserId);
  const unreadCount = myNotifs.filter(n => !n.isRead).length;
  const criticalCount = myNotifs.filter(n => n.priority === 'critical' && !n.isRead).length;

  const filtered = (filtre === 'corbeille' ? trash : myNotifs).filter(n => {
    if (filtre === 'non-lues') return !n.isRead;
    if (filtre === 'critiques') return n.priority === 'critical';
    return true;
  }).slice(0, 10);

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterStr = new Date(now.getTime() - 86400000).toDateString();

  const grouped = filtered.reduce<{ today: JulabaNotification[]; yesterday: JulabaNotification[]; older: JulabaNotification[] }>(
    (acc, n) => {
      const d = new Date(n.createdAt).toDateString();
      if (d === todayStr) acc.today.push(n);
      else if (d === yesterStr) acc.yesterday.push(n);
      else acc.older.push(n);
      return acc;
    },
    { today: [], yesterday: [], older: [] }
  );

  const chipCount = (key: Filtre) => {
    if (key === 'toutes') return myNotifs.length;
    if (key === 'non-lues') return unreadCount;
    if (key === 'critiques') return criticalCount;
    return trash.length;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 200 }}
            onClick={onClose}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', left: 12, right: 12, bottom: 80,
                borderRadius: 28, background: hexToPale(accentColor),
                boxShadow: '0 24px 54px rgba(0,0,0,0.22)',
                display: 'flex', flexDirection: 'column',
                minHeight: 'calc(100vh - 240px)',
                maxHeight: 'calc(100vh - 160px)',
                overflow: 'hidden',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: `${accentColor}33` }} />
              </div>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: `0 1px 4px ${accentColor}1F` }}>
                    <Bell style={{ width: 20, height: 20, color: accentColor }} />
                    {unreadCount > 0 && (
                      <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: criticalCount > 0 ? '#ef4444' : '#ff3b30', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>Notifications</h2>
                    <p style={{ fontSize: 13, color: accentColor, margin: 0, fontWeight: 500 }}>
                      {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
                    </p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
                  style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(0,0,0,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 16, height: 16, color: '#555' }} />
                </motion.button>
              </div>

              {/* Filtres 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 20px 16px' }}>
                {FILTRES.map(({ key, label }) => (
                  <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setFiltre(key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: filtre === key ? accentColor : '#fff',
                      color: filtre === key ? '#fff' : '#6B7280',
                      boxShadow: filtre === key ? 'none' : '0 0 0 0.5px rgba(0,0,0,0.08)',
                    }}>
                    {label}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                      background: filtre === key ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                      color: filtre === key ? '#fff' : '#9CA3AF',
                    }}>
                      {chipCount(key)}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Liste */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell style={{ width: 32, height: 32, color: `${accentColor}60` }} />
                    </div>
                    <p style={{ fontWeight: 600, color: '#555', margin: 0 }}>
                      {filtre === 'non-lues' ? 'Tout est lu !' : 'Aucune notification'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {grouped.today.length > 0 && (
                      <React.Fragment key="today">
                        <DateSep label="Aujourd'hui" color={accentColor} />
                        {grouped.today.map(n => (
                          <NotifCard key={n.id} notif={n} accentColor={accentColor} userRole={role}
                            onClose={onClose} onShowDetail={setSelectedNotif}
                            showRestore={filtre === 'corbeille'}
                            onRestore={() => void restoreNotification(n.id)} />
                        ))}
                      </React.Fragment>
                    )}
                    {grouped.yesterday.length > 0 && (
                      <React.Fragment key="yesterday">
                        <DateSep label="Hier" color={accentColor} />
                        {grouped.yesterday.map(n => (
                          <NotifCard key={n.id} notif={n} accentColor={accentColor} userRole={role}
                            onClose={onClose} onShowDetail={setSelectedNotif}
                            showRestore={filtre === 'corbeille'}
                            onRestore={() => void restoreNotification(n.id)} />
                        ))}
                      </React.Fragment>
                    )}
                    {grouped.older.length > 0 && (
                      <React.Fragment key="older">
                        <DateSep label="Plus ancien" color={accentColor} />
                        {grouped.older.map(n => (
                          <NotifCard key={n.id} notif={n} accentColor={accentColor} userRole={role}
                            onClose={onClose} onShowDetail={setSelectedNotif}
                            showRestore={filtre === 'corbeille'}
                            onRestore={() => void restoreNotification(n.id)} />
                        ))}
                      </React.Fragment>
                    )}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <p style={{ fontSize: 12, color: `${accentColor}66`, margin: 0 }}>
                  {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
                </p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                  if (!window.confirm('Effacer toutes les notifications ?')) return;
                  for (const n of myNotifs) { await deleteNotif(n.id); }
                }}
                  style={{ fontSize: 12, fontWeight: 500, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Tout effacer
                </motion.button>
              </div>

              {unreadCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 20px', flexShrink: 0 }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => void markAllAsRead()}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 24, background: accentColor, color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                    <Check style={{ width: 16, height: 16 }} />
                    Tout marquer comme lu
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal détail via portal — z-index au-dessus de tout */}
      <AnimatePresence>
        {selectedNotif && (
          <PanelDetailModal
            notif={selectedNotif}
            accentColor={accentColor}
            userRole={role}
            onClose={() => setSelectedNotif(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Bouton cloche ────────────────────────────────────────────

interface NotifBellButtonProps {
  userId: string;
  accentColor?: string;
  onOpen: () => void;
  variant?: 'solid' | 'ghost';
}

export function NotifBellButton({ userId, accentColor = '#C46210', onOpen, variant = 'ghost' }: NotifBellButtonProps) {
  const { notifications } = useNotifications();
  const { user } = useApp();
  const effectiveId = user?.id || userId;
  const myNotifs = notifications.filter(n => !effectiveId || n.userId === effectiveId);
  const count = myNotifs.filter(n => !n.isRead).length;
  const hasCritical = myNotifs.some(n => n.priority === 'critical' && !n.isRead);

  return (
    <motion.button onClick={onOpen} whileTap={{ scale: 0.9 }}
      style={{
        width: 40, height: 40, borderRadius: 13, cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: variant === 'solid' ? accentColor : 'rgba(255,255,255,0.15)',
        border: variant === 'solid' ? `1px solid #a05510` : '1px solid rgba(255,255,255,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, padding: '0 3px',
          background: hasCritical ? '#ef4444' : '#FFD166', borderRadius: 9,
          fontSize: 9, fontWeight: 900, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid rgba(143,68,24,0.9)',
        }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </motion.button>
  );
}
