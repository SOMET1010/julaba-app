import React from 'react';
import { useLocation } from 'react-router';
import { BottomBar } from './BottomBar';
import { Sidebar } from './Sidebar';
import { useApp } from '../../contexts/AppContext';

interface NavigationProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  onMicClick?: () => void;
}

export function Navigation({ role, onMicClick }: NavigationProps) {
  const { isModalOpen } = useApp();
  const location = useLocation();

  const mainRoutes = [
    '/marchand',
    '/producteur',
    '/cooperative',
    '/institution',
    '/identificateur',
  ];
  const marchandExcluded = ['/marchand/depense'];
  const isMainRoute =
    mainRoutes.some(r => location.pathname === r) ||
    (location.pathname.startsWith('/marchand/') &&
      !marchandExcluded.includes(location.pathname));

  if (!role) return null;

  return (
    <>
      <Sidebar role={role} onMicClick={onMicClick} />
      <div className="lg:hidden">
        <BottomBar role={role} onMicClick={onMicClick} />
      </div>
    </>
  );
}