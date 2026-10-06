/**
 * DevModeHome — page supprimée en production.
 * Redirige vers la racine.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function DevModeHome() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/', { replace: true }); }, [navigate]);
  return null;
}
