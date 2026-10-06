import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { SupportContact } from './SupportContact';

type RoleType = 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur' | 'administrateur';

export function SupportPage() {
  const { user } = useUser();
  const role = (user?.role as RoleType) || 'marchand';
  const userName = user ? `${user.prenoms || ''} ${user.nom || ''}`.trim() || 'Utilisateur' : 'Utilisateur';

  return <SupportContact role={role} userName={userName} showBack />;
}