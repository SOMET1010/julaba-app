import { eventBus, EVENTS } from '../services/eventBus';
import { useApp } from './AppContext';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import * as caisseApi from '../../imports/caisse-api';
import { getImageByNom } from '../data/catalogue-produits';
import { NOT_AUTHENTICATED } from '../../imports/api-client';
import { API_URL } from '../utils/api';

export interface CaisseTransaction {
  id: string;
  marchandId: string;
  type: 'vente' | 'depense' | 'approvisionnement';
  montant: number;
  produits?: any;
  mode_paiement?: string;
  notes?: string;
  date: string;
  source?: string;
  synced?: boolean;
  userId?: string;
}

export interface CaisseProduct {
  id: string;
  nom: string;
  prix: number;
  /** Prix d'achat unitaire (API: prix_achat) */
  prix_achat?: number;
  categorie: string;
  stock: number;
  unite: string;
  image?: string;
}

export interface CartItem {
  productId: string;
  nom: string;
  prix: number;
  quantite: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'entree' | 'sortie';
  quantite: number;
  date: string;
  raison?: string;
}

export interface CaisseStats {
  ventesJour: number;
  cahierJour: number;
  soldeJour: number;
  nombreVentes: number;
  nombreCahier: number;
}

interface CaisseContextType {
  transactions: CaisseTransaction[];
  loading: boolean;
  products: CaisseProduct[];
  cart: CartItem[];
  mouvements: StockMovement[];
  stats: CaisseStats;
  selectedProduct: CaisseProduct | null;
  setSelectedProduct: (p: CaisseProduct | null) => void;
  
  enregistrerVente: (montant: number, produits?: any, modePaiement?: string, notes?: string) => Promise<void>;
  enregistrerDepense: (montant: number, notes?: string) => Promise<void>;
  
  // POS Cart
  addToCart: (product: CaisseProduct, quantite?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantite: number) => void;
  clearCart: () => void;
  getTotalCart: () => number;
  
  // Products
  addProduct: (product: Omit<CaisseProduct, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<CaisseProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  
  // Transactions (alias)
  addTransaction: (tx: Omit<CaisseTransaction, 'id' | 'date'>) => Promise<void>;
  
  // Stock movements
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'date'>) => void;
  
  getSoldeJour: () => number;
  getVentesJour: () => CaisseTransaction[];
  getCahierJour: () => CaisseTransaction[];
  
  refreshTransactions: () => Promise<void>;
}

const CaisseContext = createContext<CaisseContextType | undefined>(undefined);

export function CaisseProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<CaisseTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CaisseProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mouvements, setMouvements] = useState<StockMovement[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CaisseProduct | null>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { transactions: data } = await caisseApi.fetchCaisseTransactions();
      
      const txList: CaisseTransaction[] = data.map((tx: any) => ({
        id: tx.id,
        marchandId: tx.marchand_id,
        type: tx.type,
        montant: parseFloat(tx.montant) || 0,
        produits: tx.produits,
        mode_paiement: tx.mode_paiement,
        notes: tx.notes,
        date: tx.created_at,
      }));
      setTransactions(txList);
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial + re-fetch quand user change
  const { user: appUser } = useApp();
  useEffect(() => {
    if (appUser?.id) {
      loadTransactions();
    }
  }, [appUser?.id]);

  // ── Stats calculees ────────────────────────────────────────
  const getToday = () => new Date().toISOString().split('T')[0];

  const stats: CaisseStats = {
    ventesJour: transactions
      .filter(tx => tx.type === 'vente' && tx.date.startsWith(getToday()))
      .reduce((sum, tx) => sum + tx.montant, 0),
    cahierJour: transactions
      .filter(tx => tx.type === 'depense' && tx.date.startsWith(getToday()))
      .reduce((sum, tx) => sum + tx.montant, 0),
    soldeJour: 0,
    nombreVentes: transactions.filter(tx => tx.type === 'vente' && tx.date.startsWith(getToday())).length,
    nombreCahier: transactions.filter(tx => tx.type === 'depense' && tx.date.startsWith(getToday())).length,
  };
  stats.soldeJour = stats.ventesJour - stats.cahierJour;

  // ── Ventes / Cahier ──────────────────────────────────────
  const enregistrerVente = async (
    montant: number,
    produits?: any,
    modePaiement?: string,
    notes?: string
  ) => {
    if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant de vente invalide');
    try {
      // Calculer prix_achat depuis les produits du panier
      const lignes = Array.isArray(produits) ? produits : [];
      const prixAchatTotal = lignes.reduce((sum: number, p: any) => {
        const qte = Number(p.quantite || p.quantity || 1);
        const pa = Number(p.prix_achat || p.prixAchat || p.purchasePrice || 0);
        return sum + (pa * qte);
      }, 0);
      await caisseApi.enregistrerVente({
        montant,
        produits,
        details: produits,
        mode_paiement: modePaiement,
        notes,
        prix_achat: prixAchatTotal > 0 ? prixAchatTotal : undefined,
        prix_vente: montant,
      });
      await loadTransactions();
      // Notifier AppContext de recharger ses transactions
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant }, { priority: 'high' });
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
      throw error;
    }
  };

  const enregistrerDepense = async (montant: number, notes?: string) => {
    if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant de dépense invalide');
    try {
      await caisseApi.enregistrerDepense({
        montant,
        notes,
      });
      await loadTransactions();
      // Notifier AppContext de recharger ses transactions
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant }, { priority: 'high' });
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
      throw error;
    }
  };

  const addTransaction = async (tx: Omit<CaisseTransaction, 'id' | 'date'>) => {
    if (tx.type === 'vente') {
      await enregistrerVente(tx.montant, tx.produits, tx.mode_paiement, tx.notes);
    } else if (tx.type === 'depense') {
      await enregistrerDepense(tx.montant, tx.notes);
    }
  };

  // ── POS Cart ───────────────────────────────────────────────
  const addToCart = (product: CaisseProduct, quantite: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantite: item.quantite + quantite }
            : item
        );
      }
      return [...prev, { productId: product.id, nom: product.nom, prix: product.prix, quantite }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateCartItemQuantity = (productId: string, quantite: number) => {
    if (quantite <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, quantite } : item
    ));
  };

  const clearCart = () => setCart([]);

  const getTotalCart = () => cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  // ── Products ───────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/caisse/produits`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const produits = data.produits || [];
      setProducts(produits.map((p: any) => ({
        id: p.id, nom: p.nom, prix: Number(p.prix),
        prix_achat: Number(p.prix_achat ?? p.prixAchat ?? 0) || 0,
        categorie: p.categorie, stock: Number(p.stock),
        unite: p.unite, image: p.image || getImageByNom(p.nom)
      })));
    } catch (err: unknown) { console.warn('[CaisseContext] loadProducts failed:', err instanceof Error ? err.message : err); }
  }, []);

  useEffect(() => {
    if (appUser?.id) loadProducts();
  }, [appUser?.id, loadProducts]);

  const addProduct = async (product: Omit<CaisseProduct, 'id'>) => {
    try {
      const imageToStore = product.image && product.image.startsWith('http') ? product.image : null;
      const produitData = {
        nom: product.nom, prix: product.prix, categorie: product.categorie, stock: product.stock || 0, unite: product.unite, image: imageToStore,
        ...((() => { const pa = Number(product.prix_achat ?? (product as any).prixAchat ?? (product as any).purchasePrice ?? 0); return pa > 0 ? { prix_achat: pa } : {}; })()),
      };
      const res = await fetch(`${API_URL}/caisse/produits`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(produitData) });
      if (res.ok) eventBus.emit(EVENTS.PRODUCT_CREATED, produitData, { priority: 'medium' });
      if (res.ok) {
        const data = await res.json();
        const p = data.produit;
        setProducts(prev => [...prev, {
          id: p.id,
          nom: p.nom,
          prix: Number(p.prix),
          prix_achat: Number(p?.prix_achat ?? p?.prixAchat ?? product.prix_achat ?? 0) || 0,
          categorie: p.categorie,
          stock: Number(p.stock),
          unite: p.unite,
          image: p.image || getImageByNom(p.nom),
        }]);
      } else {
        throw new Error(`Erreur ${res.status} lors de la création du produit`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du produit';
      throw new Error(message);
    }
  };

  const updateProduct = async (id: string, updates: Partial<CaisseProduct>) => {
    try {
      const current = products.find(p => p.id === id);
      const updated = { ...current, ...updates };
      const prixAchat = Number(
        (updates as any).prix_achat ??
        (updates as any).prixAchat ??
        (updates as any).purchasePrice ??
        current?.prix_achat ?? 0
      );
      const updatedWithPrixAchat = {
        ...updated,
        prix_achat: prixAchat,
      };
      const res = await fetch(`${API_URL}/caisse/produits/${id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedWithPrixAchat) });
      if (!res.ok) throw new Error(`Erreur ${res.status} lors de la mise à jour`);
      eventBus.emit(EVENTS.PRODUCT_UPDATED, { id, ...updated }, { idempotencyKey: 'prod-' + id, priority: 'medium' });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      throw new Error(message);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/caisse/produits/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(`Erreur ${res.status} lors de la suppression`);
      eventBus.emit(EVENTS.PRODUCT_DELETED, { id }, { priority: 'medium' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      throw err;
    }
  };

  // ── Stock Movements ────────────────────────────────────────
  const addStockMovement = (movement: Omit<StockMovement, 'id' | 'date'>) => {
    const newMovement: StockMovement = {
      ...movement,
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
    };
    setMouvements(prev => [newMovement, ...prev]);

    // Mettre a jour le stock du produit
    const delta = movement.type === 'entree' ? movement.quantite : -movement.quantite;
    setProducts(prev => prev.map(p =>
      p.id === movement.productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p
    ));
  };

  const getSoldeJour = () => stats.soldeJour;

  const getVentesJour = () => {
    return transactions.filter(tx => tx.type === 'vente' && tx.date.startsWith(getToday()));
  };

  const getCahierJour = () => {
    return transactions.filter(tx => tx.type === 'depense' && tx.date.startsWith(getToday()));
  };

  const refreshTransactions = async () => {
    await loadTransactions();
  };

  const value: CaisseContextType = {
    transactions,
    loading,
    products,
    cart,
    mouvements,
    stats,
    selectedProduct,
    setSelectedProduct,
    enregistrerVente,
    enregistrerDepense,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    getTotalCart,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts: loadProducts,
    addTransaction,
    addStockMovement,
    getSoldeJour,
    getVentesJour,
    getCahierJour,
    refreshTransactions,
  };


  // Auto-refresh polling
  useAutoRefresh({
    intervalMs: 60000,
    enabled: !!appUser?.id,
    debugLabel: "CaisseContext",
    onRefresh: async () => { if (appUser?.id) await loadTransactions(); },
  });

  return <CaisseContext.Provider value={value}>{children}</CaisseContext.Provider>;
}

export function useCaisse() {
  const context = useContext(CaisseContext);
  if (!context) {
    throw new Error('useCaisse must be used within CaisseProvider');
  }
  return context;
}