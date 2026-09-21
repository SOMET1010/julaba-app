/**
 * STUB d'AppContext pour l'APERÇU VISUEL de la caisse (lot F).
 * Une marchande fictive, en ligne, sans session serveur. `speak` ne dit rien.
 */
import React, { createContext, useContext, type ReactNode } from 'react';

export type UserRole = 'marchand' | 'producteur' | 'cooperative' | 'cooperateur' | 'institution' | 'identificateur' | 'administrateur';
export interface User { id: string; firstName?: string; lastName?: string; prenoms?: string; genre?: string; role: UserRole; sousProfilMarchand?: string | null; }
export interface DaySession { opened: boolean; }
export interface Transaction { id: string; type: string; montant: number; date: string; productName?: string; }

const Ctx = createContext<any>(undefined);

const USER: User = { id: 'demo', firstName: 'Awa', lastName: 'Koné', genre: 'femme', role: 'marchand', sousProfilMarchand: null };

export function AppProvider({ children }: { children: ReactNode }) {
  const noop = () => {};
  const noopAsync = async () => {};
  // TOUT CE QUI EST DIT EST ÉCRIT (banc de parcours). `speak` reste muet — il
  // n'y a pas de synthèse en headless — mais le texte part au journal : une
  // capture d'écran ne prouve pas qu'une phrase a été prononcée. Les phrases
  // venues d'une CLÉ du catalogue sont, elles, journalisées avec leur clé et
  // leurs variables (voir main.tsx).
  const speak = (texte: string) => {
    try { (((window as any).__journalDits ??= []) as string[]).push(String(texte)); } catch { /* ignore */ }
  };
  const value = {
    user: USER, setUser: noop, isAuthenticated: true, accessToken: null, setAccessToken: noop, loading: false,
    transactions: [], addTransaction: noop, reloadTransactions: noopAsync,
    marketplaceItems: [], addMarketplaceItem: noop,
    isOnline: true, voiceEnabled: true, globalVoiceOpen: false, setGlobalVoiceOpen: noop, setVoiceEnabled: noop,
    speak, voiceMuted: false, toggleVoiceMuted: noop, isSpeaking: false, speakingText: '',
    // Niveau de voix : celui par défaut, pour que `speakMessage` ne taise rien
    // que l'application ne tairait pas elle-même (voir i18n/voice/niveauVoix).
    niveauVoix: 'complet', setNiveauVoix: noop,
    roleColor: '#1E7A3A', isModalOpen: false, setIsModalOpen: noop, setAppTitle: noop,
    currentSession: { opened: true } as DaySession, openDay: noopAsync, closeDay: noopAsync, updateFondInitial: noopAsync,
    getTodayStats: () => ({ ventes: 12500, cahier: 0, caisse: 12500, nombreVentes: 7 }),
    getSalesHistory: () => [], getFinancialSummary: () => ({ totalVentes: 0, totalCahier: 0, beneficeNet: 0, nombreVentes: 0, nombreCahier: 0, moyenneVente: 0, topProduits: [] }),
    refreshUserData: noopAsync, logout: noopAsync,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp (stub) hors AppProvider');
  return c;
}
