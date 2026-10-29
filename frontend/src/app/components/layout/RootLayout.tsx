import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { redirectionHorsPilote } from '../../config/modulesPilote';

/**
 * Racine de TOUTES les routes (routes.tsx) — c'est donc ici, et une seule
 * fois, que se pose la garde des modules hors pilote qui portent de l'argent
 * (décision de Patrick, 07/10/2026 — voir config/modulesPilote.ts).
 *
 * Ici plutôt que route par route : une garde par route s'oublie à la
 * prochaine route ajoutée, et une garde posée dans un layout de profil
 * laisserait passer le paiement public `/pay/*`, qui n'en a pas. Ici, aucune
 * URL n'échappe — lien profond, notification, voix, ou bouton resté dans un
 * fichier gelé du périmètre de l'argent qu'on n'a pas le droit d'éditer.
 *
 * `replace` : le retour arrière ne ramène pas sur l'URL masquée.
 */
export function RootLayout() {
  const { pathname } = useLocation();
  const accueil = redirectionHorsPilote(pathname);
  if (accueil) return <Navigate to={accueil} replace />;
  return <Outlet />;
}
