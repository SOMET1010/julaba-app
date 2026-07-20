/**
 * JULABA — Notifications Context v4
 * Source unique de vérité. ApiNotifRow (camelCase) → JulabaNotification.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import * as notificationsApi from '../../imports/notifications-api';
import { NOT_AUTHENTICATED } from '../../imports/api-client';
import { WebSocketTransport } from '../services/WebSocketTransport';
import { eventBus, EVENTS } from '../services/eventBus';
import { API_URL } from '../utils/api';

export type NotifRole =
  | 'marchand' | 'producteur' | 'cooperative'
  | 'identificateur' | 'institution' | 'admin';

export type NotifPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotifType =
  | 'commande_recue' | 'paiement_valide' | 'paiement_echoue'
  | 'stock_faible' | 'document_valide' | 'suspension' | 'reactivation'
  | 'nouvelle_commande' | 'paiement_recu' | 'offre_expiree' | 'recolte_proche'
  | 'evaluation_recue' | 'membre_ajoute' | 'contribution_recue'
  | 'paiement_collectif' | 'commande_groupee_validee' | 'distribution_prete'
  | 'dossier_valide' | 'dossier_rejete' | 'objectif_atteint' | 'dossier_assigne'
  | 'pic_transaction' | 'baisse_activite' | 'nouveau_identificateur'
  | 'dossier_en_attente' | 'alerte_fraude' | 'creation_acteur'
  | 'modification_critique' | 'tentative_acces' | 'anomalie_systeme'
  | 'info' | 'systeme' | 'commande' | 'vente' | 'statut_change'
  | 'commande_statut' | 'negociation' | 'stock_rupture'
  | 'journee_non_ouverte' | 'success';

export interface JulabaNotification {
  id: string;
  userId: string;
  role: NotifRole;
  type: NotifType;
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  createdAt: string;
  priority: NotifPriority;
  actionLink?: string;
  metadata?: Record<string, unknown>;
}

interface ApiNotifRow {
  id: string;
  userId: string;
  role?: string;
  type: string;
  titre: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  priority?: string;
  metadata?: unknown;
}

interface NotifNewPayload {
  id?: string;
  userId?: string;
  user_id?: string;
  role?: string;
  type?: string;
  titre?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
  priority?: string;
  metadata?: unknown;
}

function normMeta(raw: unknown): Record<string, unknown> | undefined {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return undefined;
}

function metaStr(meta: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!meta) return undefined;
  const v = meta[key];
  return typeof v === 'string' ? v : undefined;
}

function rowToNotif(n: ApiNotifRow): JulabaNotification {
  const meta = normMeta(n.metadata);
  return {
    id: n.id,
    userId: n.userId,
    role: (n.role || 'marchand') as NotifRole,
    type: n.type as NotifType,
    title: n.titre,
    message: n.message,
    entityId: metaStr(meta, 'entityId'),
    entityType: metaStr(meta, 'entityType'),
    isRead: Boolean(n.isRead),
    createdAt: n.createdAt,
    priority: (n.priority || 'medium') as NotifPriority,
    actionLink: metaStr(meta, 'actionLink'),
    metadata: meta,
  };
}

interface NotificationsContextType {
  notifications: JulabaNotification[];
  trashNotifications: JulabaNotification[];
  loading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotif: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  restoreNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshTrashNotifications: () => Promise<void>;
  addNotification: (notif: Omit<JulabaNotification, 'id' | 'userId' | 'isRead' | 'createdAt'>) => Promise<void>;
  triggerInfo: (userId: string, role: NotifRole, title: string, message: string) => Promise<void>;
  triggerPaiementValideMarchand: (userId: string, montant: number, reference: string) => Promise<void>;
  getUnreadNotifications: () => JulabaNotification[];
  getNotificationsByType: (type: NotifType) => JulabaNotification[];
  getNotificationsByPriority: (priority: NotifPriority) => JulabaNotification[];
  getNotificationsForUser: (userId: string) => JulabaNotification[];
  getUnreadCount: (userId: string) => number;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const [notifications, setNotifications] = useState<JulabaNotification[]>([]);
  const [trashNotifications, setTrashNotifications] = useState<JulabaNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const loadNotifications = async () => {
    if (!user?.id || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const { notifications: data } = await notificationsApi.fetchNotifications();
      setNotifications((data as unknown as ApiNotifRow[]).map(rowToNotif));
    } catch (error: unknown) {
      if (error instanceof Error && error.message === NOT_AUTHENTICATED) return;
      console.error('[Notif] loadNotifications:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const refreshTrashNotifications = async () => {
    if (!user?.id) return;
    try {
      const { notifications: data } = await notificationsApi.fetchTrashNotifications();
      setTrashNotifications((data as unknown as ApiNotifRow[]).map(rowToNotif));
    } catch (error) {
      console.error('[Notif] refreshTrash:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  // Auto-refresh toutes les 30s
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // WebSocket temps réel
  useEffect(() => {
    if (!user?.id) return;
    const wsBase = API_URL.replace(/\/api\/v1$/, '');
    const ws = new WebSocketTransport(wsBase);
    eventBus.useTransport(ws);
    ws.connect();

    const unsub = eventBus.subscribe(EVENTS.NOTIF_NEW, (payload: NotifNewPayload) => {
      if (!payload?.id) return;
      const destId = payload.userId || payload.user_id;
      if (destId !== user.id) return;

      const meta = normMeta(payload.metadata) ?? {};
      const notif: JulabaNotification = {
        id: payload.id,
        userId: user.id,
        role: (payload.role || user.role || 'marchand') as NotifRole,
        type: (payload.type || 'info') as NotifType,
        title: payload.titre || payload.title || '',
        message: payload.message || '',
        isRead: false,
        createdAt: payload.createdAt || payload.created_at || new Date().toISOString(),
        priority: (payload.priority || 'medium') as NotifPriority,
        actionLink: metaStr(meta, 'actionLink'),
        metadata: meta,
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev].slice(0, 50);
      });
    });

    return () => {
      unsub?.();
      ws.disconnect();
    };
  }, [user?.id, user?.role]);

  const markAsRead = async (id: string) => {
    // Optimistic update immédiat
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    try {
      await notificationsApi.markNotificationAsRead(id);
    } catch (error) {
      console.error('[Notif] markAsRead:', error);
      // Rollback si échec
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: false } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await notificationsApi.markAllNotificationsAsRead();
    } catch (error) {
      console.error('[Notif] markAllAsRead:', error);
      await loadNotifications();
    }
  };

  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await notificationsApi.deleteNotification(id);
      await refreshTrashNotifications();
    } catch (error) {
      console.error('[Notif] deleteNotif:', error);
      await loadNotifications();
    }
  };

  const clearAll = async () => {
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    try {
      await Promise.all(ids.map(id => notificationsApi.deleteNotification(id)));
      await refreshTrashNotifications();
    } catch (error) {
      console.error('[Notif] clearAll:', error);
      await loadNotifications();
    }
  };

  const restoreNotification = async (id: string) => {
    try {
      await notificationsApi.restoreNotification(id);
      await Promise.all([loadNotifications(), refreshTrashNotifications()]);
    } catch (error) {
      console.error('[Notif] restore:', error);
    }
  };

  const addNotification = async (
    notif: Omit<JulabaNotification, 'id' | 'userId' | 'isRead' | 'createdAt'>
  ) => {
    if (!user?.id) return;
    try {
      await notificationsApi.createNotification({
        titre: notif.title,
        message: notif.message,
        type: notif.type,
        priority: notif.priority,
        metadata: {
          ...(notif.metadata ?? {}),
          ...(notif.entityId ? { entityId: notif.entityId } : {}),
          ...(notif.entityType ? { entityType: notif.entityType } : {}),
          ...(notif.actionLink ? { actionLink: notif.actionLink } : {}),
        },
      });
      await loadNotifications();
    } catch (error) {
      console.error('[Notif] addNotification:', error);
    }
  };

  const triggerInfo = async (userId: string, role: NotifRole, title: string, message: string) => {
    await addNotification({ type: 'info', role, priority: 'low', title, message });
  };

  const triggerPaiementValideMarchand = async (userId: string, montant: number, reference: string) => {
    await addNotification({
      type: 'paiement_valide', role: 'marchand', priority: 'medium',
      title: 'Paiement validé',
      message: `Rechargement de ${montant.toLocaleString('fr-FR')} FCFA confirmé (Réf: ${reference}).`,
    });
  };

  const getUnreadNotifications = () => notifications.filter(n => !n.isRead);
  const getNotificationsByType = (type: NotifType) => notifications.filter(n => n.type === type);
  const getNotificationsByPriority = (p: NotifPriority) => notifications.filter(n => n.priority === p);
  const getNotificationsForUser = (userId: string) => {
    if (!userId) return notifications;
    return notifications.filter(n => n.userId === userId);
  };
  const getUnreadCount = (userId: string) =>
    getNotificationsForUser(userId).filter(n => !n.isRead).length;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationsContext.Provider value={{
      notifications,
      trashNotifications,
      loading,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotif,
      deleteNotification: deleteNotif,
      clearAll,
      restoreNotification,
      refreshNotifications: loadNotifications,
      refreshTrashNotifications,
      addNotification,
      triggerInfo,
      triggerPaiementValideMarchand,
      getUnreadNotifications,
      getNotificationsByType,
      getNotificationsByPriority,
      getNotificationsForUser,
      getUnreadCount,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

export const PRIORITY_CONFIG = {
  critical: { label: 'Critique', dot: 'bg-red-500' },
  high: { label: 'Important', dot: 'bg-orange-500' },
  medium: { label: 'Normal', dot: 'bg-amber-500' },
  low: { label: 'Info', dot: 'bg-blue-500' },
};
