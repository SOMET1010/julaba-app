import { eventBus, EVENTS } from '../services/eventBus';
import { useApp } from './AppContext';
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { API_URL } from '../utils/api';

const headers = () => ({ 'Content-Type': 'application/json' });

export interface StockItem {
  id: string;
  marchandId: string;
  userId?: string;
  produit: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  prixAchat?: number;   // alias prixUnitaire
  prixVente?: number;
  updatedAt?: string;   // alias derniereModification
  derniereModification: string;
}

interface StockContextType {
  stocks: StockItem[];
  stock: StockItem[];
  loading: boolean;
  addStock: (data: Omit<StockItem, 'id' | 'derniereModification'>) => Promise<void>;
  updateStock: (id: string, data: Partial<StockItem>) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  getStockByProduit: (produit: string) => StockItem | undefined;
  getStockTotal: () => number;
  getStockFaible: (seuil?: number) => StockItem[];
  getValeurTotaleStock: () => number;
  getStock: () => StockItem[];
  addProduct: (data: Omit<StockItem, 'id' | 'derniereModification'>) => Promise<void>;
  recordSale: (produit: string, quantite: number) => Promise<void>;
  refreshStocks: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

function normalize(s: any): StockItem {
  return {
    id: s.id,
    marchandId: s.proprietaire_id || '',
    produit: s.produit || '',
    quantite: parseFloat(s.quantite) || 0,
    unite: s.unite || 'unité',
    prixUnitaire: parseFloat(s.prix_unitaire || s.prix) || 0,
    derniereModification: s.updated_at || s.created_at || new Date().toISOString(),
  };
}

// StockProvider vide pour compatibilité
export function StockProvider({ children }: { children: ReactNode }) {

  // Auto-refresh polling
  useAutoRefresh({
    intervalMs: 30000,
    enabled: !!appUser?.id,
    debugLabel: "StockContext",
    onRefresh: async () => { if (appUser?.id) await refreshStocks(); },
  });

  return <StockProviderInner>{children}</StockProviderInner>;
}

export function StockProviderInner({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshStocks = useCallback(async () => {
    if (!stocks?.length) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/stocks`, { credentials: 'include', headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.stocks || data.data || (Array.isArray(data) ? data : []);
      setStocks(list.map(normalize));
    } catch (e) { void e; }
    finally { setLoading(false); }
  }, []);

  const { user: appUser } = useApp();
  useEffect(() => { if (appUser?.id) refreshStocks(); }, [appUser?.id]);

  const addStock = async (data: Omit<StockItem, 'id' | 'derniereModification'>) => {
    await fetch(`${API_URL}/stocks`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ nom: data.nom || data.produit, produit: data.nom || data.produit, quantite: data.quantite, unite: data.unite, prix: (data as any).prixVente || data.prixUnitaire || 0, prix_achat: (data as any).prix_achat || (data as any).prixAchat || (data as any).purchasePrice || 0, categorie: (data as any).categorie || 'General', image: (data as any).image || null }),
    });
    eventBus.emit(EVENTS.STOCK_CREATED, data, { priority: 'medium' });
    await refreshStocks();
  };

  const updateStock = async (id: string, data: Partial<StockItem>) => {
    await fetch(`${API_URL}/stocks/${id}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ quantite: data.quantite, prix_unitaire: data.prixUnitaire }),
    });
    eventBus.emit(EVENTS.STOCK_UPDATED, { id, ...data }, { idempotencyKey: 'stock-' + id, priority: 'medium' });
    await refreshStocks();
  };

  const deleteStock = async (id: string) => {
    await fetch(`${API_URL}/stocks/${id}`, { method: 'DELETE', headers: headers() });
    eventBus.emit(EVENTS.STOCK_DELETED, { id }, { priority: 'medium' });
    await refreshStocks();
  };

  const value: StockContextType = {
    stocks, stock: stocks, loading,
    addStock, updateStock, deleteStock, refreshStocks,
    getStockByProduit: (produit) => stocks.find(s => s.produit === produit),
    getStockTotal: () => stocks.reduce((sum, s) => sum + s.quantite, 0),
    getStockFaible: (seuil = 5) => stocks.filter(s => s.quantite <= seuil),
    getValeurTotaleStock: () => stocks.reduce((sum, s) => sum + s.quantite * s.prixUnitaire, 0),
    getStock: () => stocks,
    addProduct: addStock,
    recordSale: async (produit, quantite) => {
      const item = stocks.find(s => s.produit === produit);
      if (item) await updateStock(item.id, { quantite: Math.max(0, item.quantite - quantite) });
    },
  };

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const context = useContext(StockContext);
  if (!context) throw new Error('useStock must be used within StockProviderInner');
  return context;
}
