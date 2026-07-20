import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { 
  KeiwaAccount, 
  KeiwaTransaction, 
  KeiwaTransactionType,
  EscrowPayment 
} from '../types/julaba.types';
import { useUser } from './UserContext';
import * as keiwasApi from '../../imports/wallets-api';
import { DEV_MODE, devLog } from '../config/devMode';
import { NOT_AUTHENTICATED } from '../../imports/api-client';

interface WalletContextType {
  keiwa: KeiwaAccount | null;
  transactions: KeiwaTransaction[];
  escrowPayments: EscrowPayment[];
  loading: boolean;
  
  bloquerArgent: (commandeId: string, montant: number, receiverId: string) => Promise<string>;
  libererArgent: (escrowId: string, receiverId: string) => Promise<void>;
  rembourserArgent: (escrowId: string, payerId: string) => Promise<void>;
  recupererArgent: (escrowId: string) => Promise<void>;
  
  getBalance: () => number;
  getEscrowBalance: () => number;
  getAvailableBalance: () => number;
  canAfford: (montant: number) => boolean;
  
  getTransactionHistory: (limit?: number) => KeiwaTransaction[];
  getPendingEscrows: () => EscrowPayment[];
  
  refreshKeiwa: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [keiwa, setKeiwa] = useState<KeiwaAccount | null>(null);
  const [transactions, setTransactions] = useState<KeiwaTransaction[]>([]);
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger le keiwa depuis Supabase
  const loadKeiwa = async () => {
    if (DEV_MODE) {
      devLog('WalletContext', 'Mode dev - skip API call');
      return;
    }
    if (!user?.id) {
      setKeiwa(null);
      setTransactions([]);
      setEscrowPayments([]);
      return;
    }

    try {
      if (!keiwa && transactions.length === 0) setLoading(true);
      
      // Charger keiwa et transactions
      const [keiwaData, transactionsData] = await Promise.all([
        keiwasApi.fetchKeiwa(),
        keiwasApi.fetchKeiwaTransactions(),
      ]);

      // Convertir en types frontend
      const w = (keiwaData as any).keiwa || keiwaData;
      const keiwaAccount: KeiwaAccount = {
        userId: w.userId || w.user_id,
        balance: w.solde || 0,
        currency: 'FCFA',
        escrowBalance: w.soldeBloque || w.solde_bloque || 0,
        totalReceived: 0,
        totalSent: 0,
        createdAt: w.createdAt || w.created_at,
        updatedAt: w.updatedAt || w.updated_at,
      };

      const txArray = (transactionsData as any).transactions || transactionsData || [];
      const txList: KeiwaTransaction[] = (Array.isArray(txArray) ? txArray : []).map((tx: any) => ({
        id: tx.id,
        userId: tx.user_id,
        type: tx.type as KeiwaTransactionType,
        amount: tx.montant,
        currency: 'FCFA',
        description: tx.description || '',
        status: tx.statut,
        createdAt: tx.createdAt || tx.created_at,
        relatedEntityType: tx.related_entity_type,
        relatedEntityId: tx.related_entity_id,
        metadata: tx.metadata,
      }));

      setKeiwa(keiwaAccount);
      setTransactions(txList);
      setLoading(false);
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) { setLoading(false); return; }
      console.warn('[WalletContext] Erreur chargement keiwa:', error?.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeiwa();
  }, [user?.id]);

  const refreshKeiwa = async () => {
    await loadKeiwa();
  };

  const bloquerArgent = async (
    commandeId: string,
    montant: number,
    receiverId: string
  ): Promise<string> => {
    console.warn('[WalletContext] bloquerArgent non implémenté — endpoint /escrow manquant');
    // FUTURE: POST /api/v1/escrow
    const escrowId = Date.now().toString();
    return escrowId;
  };

  const libererArgent = async (escrowId: string, receiverId: string) => {
    console.warn('[WalletContext] libererArgent non implémenté — endpoint /escrow manquant');
    // FUTURE: POST /api/v1/escrow
  };

  const rembourserArgent = async (escrowId: string, payerId: string) => {
    console.warn('[WalletContext] rembourserArgent non implémenté — endpoint /escrow manquant');
    // FUTURE: POST /api/v1/escrow
  };

  const recupererArgent = async (escrowId: string) => {
    console.warn('[WalletContext] recupererArgent non implémenté — endpoint /escrow manquant');
    // FUTURE: POST /api/v1/escrow
  };

  const getBalance = () => keiwa?.balance || 0;
  const getEscrowBalance = () => keiwa?.escrowBalance || 0;
  const getAvailableBalance = () => (keiwa?.balance || 0) - (keiwa?.escrowBalance || 0);
  const canAfford = (montant: number) => getAvailableBalance() >= montant;

  const getTransactionHistory = (limit?: number) => {
    const sorted = [...transactions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  };

  const getPendingEscrows = () => {
    return escrowPayments.filter(e => e.status === 'PENDING');
  };

  const value: WalletContextType = {
    keiwa,
    transactions,
    escrowPayments,
    loading,
    bloquerArgent,
    libererArgent,
    rembourserArgent,
    recupererArgent,
    getBalance,
    getEscrowBalance,
    getAvailableBalance,
    canAfford,
    getTransactionHistory,
    getPendingEscrows,
    refreshKeiwa,
  };


  // Auto-refresh polling
  useAutoRefresh({
    intervalMs: 30000,
    enabled: !!user?.id,
    debugLabel: "WalletContext",
    onRefresh: async () => { if (user?.id) await loadKeiwa(); },
  });

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet doit être utilisé dans un WalletProvider');
  }
  return context;
}