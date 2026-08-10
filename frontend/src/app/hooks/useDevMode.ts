/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Hook useDevMode
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Hook personnalisé pour gérer le mode développement dans les contextes
 */

import { useEffect, useRef } from 'react';
import { DEV_MODE, devLog } from '../config/devMode';

/**
 * Hook pour court-circuiter les useEffect en mode dev
 * Usage : if (useDevModeSkip('ContextName')) return;
 */
export function useDevModeSkip(contextName: string): boolean {
  const hasLogged = useRef(false);
  
  useEffect(() => {
    if (DEV_MODE && !hasLogged.current) {
      devLog(contextName, 'Contexte en mode dev - Chargement données désactivé');
      hasLogged.current = true;
    }
  }, [contextName]);
  
  return DEV_MODE;
}

/**
 * Wrapper pour les appels fetch en mode dev
 */
export async function devFetch<T>(
  url: string,
  options: RequestInit,
  mockData: T,
  contextName: string
): Promise<T> {
  if (DEV_MODE) {
    devLog(contextName, `Fetch ignoré : ${url}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockData;
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Helper pour retourner des données vides en mode dev
 */
export function devOrReal<T>(devData: T, realDataFn: () => T): T {
  return DEV_MODE ? devData : realDataFn();
}
