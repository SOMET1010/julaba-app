/**
 * JULABA — Bouton Notifications Marchand
 * Utilise le système unifié NotificationsContext via useApp pour le userId réel.
 */
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { ROLE_COLORS } from '../../config/roleConfig';
import { NotificationsPanel } from '../shared/NotificationsPanel';
import { NotifBellButton } from '../shared/NotificationsPanel';

export function NotificationButton({ accentColor: accentColorProp }: { accentColor?: string }) {
  const { user } = useApp();
  const { user: profileUser } = useUser();
  const [showNotifications, setShowNotifications] = useState(false);

  const accentColorFromRole =
    ROLE_COLORS[user?.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.marchand;
  const accentColor = accentColorProp ?? accentColorFromRole;

  const userId = user?.id || profileUser?.id || '';

  const handleClick = () => {
    if (!userId) {
      console.warn('[NotificationButton] userId vide — notifications non chargées');
      return;
    }
    setShowNotifications(true);
  };

  return (
    <>
      <NotifBellButton
        userId={userId}
        accentColor={accentColor}
        onOpen={handleClick}
      />
      <NotificationsPanel
        userId={userId}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        accentColor={accentColor}
        userRole={user?.role || ''}
      />
    </>
  );
}
