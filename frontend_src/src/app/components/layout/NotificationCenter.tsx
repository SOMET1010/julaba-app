/**
 * JULABA — NotificationCenter
 * Wrapper de compatibilité → délègue au NotificationsPanel unifié.
 * Récupère automatiquement le userId du user connecté.
 */
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { getRoleColor } from '../../config/roleConfig';
import { NotificationsPanel } from '../shared/NotificationsPanel';
import { useUser } from '../../contexts/UserContext';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user: appUser } = useApp();
  const { user: contextUser } = useUser();
  const activeUser = contextUser || appUser;
  const userId = activeUser?.id || '';
  const accentColor = getRoleColor(activeUser?.role as any) || '#C46210';

  return (
    <NotificationsPanel
      userId={userId}
      isOpen={isOpen}
      onClose={onClose}
      accentColor={accentColor}
      userRole={activeUser?.role || appUser?.role || 'marchand'}
    />
  );
}
