/** STUB de StockContext pour l'APERÇU VISUEL de la caisse (lot F). */
import React, { type ReactNode } from 'react';

export interface StockItem {
  id: string; marchandId: string; produit: string; quantite: number; unite: string; prixUnitaire: number;
  updatedAt?: string; derniereModification: string;
}

const STOCKS: StockItem[] = [
  { id: 's1', marchandId: 'demo', produit: 'Tomate', quantite: 24, unite: 'tas', prixUnitaire: 500, updatedAt: '2026-09-20T07:00:00Z', derniereModification: '2026-09-20T07:00:00Z' },
  { id: 's2', marchandId: 'demo', produit: 'Oignon', quantite: 12, unite: 'kg', prixUnitaire: 800, updatedAt: '2026-09-19T07:00:00Z', derniereModification: '2026-09-19T07:00:00Z' },
];

const valeur = {
  stocks: STOCKS, stock: STOCKS, loading: false,
  addStock: async () => {}, updateStock: async () => {}, deleteStock: async () => {},
  getStockByProduit: (p: string) => STOCKS.find(s => s.produit === p), getStockTotal: () => 36, getStockFaible: () => [],
  getValeurTotaleStock: () => 0, getStock: () => STOCKS, addProduct: async () => {}, recordSale: async () => {}, refreshStocks: async () => {},
};

export function StockProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
export function StockProviderInner({ children }: { children: ReactNode }) { return <>{children}</>; }
export function useStock() { return valeur; }
