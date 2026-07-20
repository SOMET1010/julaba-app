/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — DevModeContext
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Gère le mode développement pour navigation sans données
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { DEV_MODE, DEV_CONFIG, devLog } from '../config/devMode';

interface DevModeContextType {
  isDevMode: boolean;
  config: typeof DEV_CONFIG;
  shouldSkipApiCall: (endpoint: string) => boolean;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const shouldSkipApiCall = (endpoint: string) => {
    if (!DEV_MODE || !DEV_CONFIG.skipApiCalls) return false;
    
    devLog('API', `Appel ignoré : ${endpoint}`);
    return true;
  };

  return (
    <DevModeContext.Provider
      value={{
        isDevMode: DEV_MODE,
        config: DEV_CONFIG,
        shouldSkipApiCall,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode doit être utilisé dans DevModeProvider');
  }
  return context;
}
