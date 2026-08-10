import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { BOLayout } from './BOLayout';
import { useBackOfficeOptional } from '../../contexts/BackOfficeContext';

export function BORoot() {
  // Souscrire au router pour propager les re-renders au sous-arbre BOLayout
  // à chaque changement de route. Sans cette ligne, BORoot ne dépend que de
  // useBackOfficeOptional, n'est jamais re-render au pushState, et BOLayout
  // reste figé sur l'ancienne route (Outlet ne réévalue pas la route enfant).
  useLocation();

  const boCtx = useBackOfficeOptional();
  // Roles BO canoniques autorises a l'entree du back-office, alignes sur
  // auth.service.ts BO_ROLES cote backend. admin_general doit pouvoir entrer ;
  // le litteral fantome 'admin' (aucun compte de ce role en base) est retire.
  const ROLES: readonly string[] = [
    'super_admin',
    'admin_general',
    'admin_national',
    'gestionnaire_zone',
    'operateur_terrain',
  ];
  const isBoUser = boCtx?.boUser && ROLES.includes(boCtx.boUser.role);

  // Attendre que loadUser soit terminé avant de rediriger
  if (boCtx?.isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isBoUser) {
    return <Navigate to="/backoffice/login" replace />;
  }

  return <BOLayout />;
}
