import { eventBus, EVENTS } from '../services/eventBus';
import { useApp } from './AppContext';
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import * as stocksApi from '../services/api/stocks-api';
import { enfilerOperation } from '../voice-offline/offlineCaisse';

function genererCleStock(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `stock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function doitEnfilerStock(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status !== 'number' || status >= 500;
}

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
  seuilAlerte?: number; // seuil d'alerte de stock bas (par produit)
  categorie?: string;   // catégorie du produit
  image?: string | null;
  datePeremption?: string | null; // date de péremption (AAAA-MM-JJ)
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
    seuilAlerte: s.seuil_alerte != null ? (parseFloat(s.seuil_alerte) || 0) : undefined,
    categorie: s.categorie || undefined,
    image: s.image || null,
    datePeremption: s.date_peremption || null,
    derniereModification: s.updated_at || s.created_at || new Date().toISOString(),
  };
}

// StockProvider : simple enveloppe de compatibilité. L'ancien bloc de polling
// référençait des identifiants INEXISTANTS (appUser, refreshStocks) — il aurait
// planté au premier rendu s'il avait été exécuté ; le vrai rafraîchissement vit
// dans StockProviderInner.
export function StockProvider({ children }: { children: ReactNode }) {
  return <StockProviderInner>{children}</StockProviderInner>;
}

export function StockProviderInner({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshStocks = useCallback(async () => {
    // Clé de cache par utilisateur (lue depuis la session en cache).
    const cacheKey = (() => {
      try { const r = localStorage.getItem('julaba_auth_user'); const id = r ? (JSON.parse(r).id || 'anon') : 'anon'; return `julaba_cache_stocks_${id}`; }
      catch { return 'julaba_cache_stocks_anon'; }
    })();
    if (!stocks?.length) setLoading(true);
    try {
      // UN SERVEUR QUI RÉPOND MAL EST PIRE QU'UN SERVEUR ABSENT. L'ancien code
      // faisait `if (!res.ok) return;` : sur un 500 ou un 503, la marchande se
      // retrouvait avec un stock VIDE alors que son téléphone en gardait la
      // copie. Le catalogue de la caisse avait déjà été corrigé ainsi le
      // 18/09/2026 ; le stock, lui, était resté en arrière. Désormais les DEUX
      // échecs — réponse en erreur et coupure réseau — tombent dans le `catch`
      // et servent le dernier stock connu.
      const list = await stocksApi.fetchStocks();
      const normalized = list.map(normalize);
      setStocks(normalized);
      // Cache local : dernier stock connu (consultation hors-ligne).
      try { localStorage.setItem(cacheKey, JSON.stringify(normalized)); } catch { /* ignore */ }
    } catch (e) {
      void e;
      // Hors-ligne : on sert le dernier stock connu.
      try { const raw = localStorage.getItem(cacheKey); if (raw) setStocks(JSON.parse(raw)); } catch { /* ignore */ }
    }
    finally { setLoading(false); }
  }, []);

  const { user: appUser } = useApp();
  useEffect(() => { if (appUser?.id) refreshStocks(); }, [appUser?.id]);

  const addStock = async (data: Omit<StockItem, 'id' | 'derniereModification'> & { nom?: string }) => {
    // L'ÉCHEC DE CRÉATION ÉTAIT MUET. Cet appel ne regardait pas la réponse :
    // un refus du serveur repartait comme un succès, et les trois appelants —
    // qui entourent tous `addProduct` d'un try/catch avec un message parlé —
    // annonçaient « C'est fait ! … ajoutés au stock » pour un produit qui
    // n'existait pas. À une marchande qui ne lit pas, c'est la voix elle-même
    // qui mentait. `apiRequest` lève ; les appelants font déjà le reste.
    await stocksApi.creerStock({ nom: data.nom || data.produit, produit: data.nom || data.produit, quantite: data.quantite, unite: data.unite, prix: (data as any).prixVente || data.prixUnitaire || 0, prix_achat: (data as any).prix_achat || (data as any).prixAchat || (data as any).purchasePrice || 0, categorie: (data as any).categorie || 'General', image: (data as any).image || null, seuil_alerte: (data as any).seuilAlerte ?? (data as any).seuil_alerte ?? null, date_peremption: (data as any).datePeremption ?? (data as any).date_peremption ?? null });
    eventBus.emit(EVENTS.STOCK_CREATED, data, { priority: 'medium' });
    await refreshStocks();
  };

  const updateStock = async (id: string, data: Partial<StockItem>) => {
    const payload = {
      quantite: data.quantite, prix_unitaire: data.prixUnitaire,
      ...(data.seuilAlerte !== undefined ? { seuil_alerte: data.seuilAlerte } : {}),
      ...(data.categorie !== undefined ? { categorie: data.categorie } : {}),
      ...(data.datePeremption !== undefined ? { date_peremption: data.datePeremption } : {}),
      idempotency_key: genererCleStock(),
    };
    const applyLocal = () => setStocks((current) => current.map((stock) => stock.id === id ? { ...stock, ...data, derniereModification: new Date().toISOString() } : stock));
    // FAIL CLOSED : sans utilisateur authentifié réel, on ne met JAMAIS la
    // mise à jour en file (jamais sous 'anon') — et on n'applique pas non
    // plus la mise à jour optimiste locale, qui mentirait sur un succès
    // impossible à persister durablement. L'action échoue visiblement au
    // lieu de créer une opération sans propriétaire fiable.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enfilerOperation(`/stocks/${id}`, payload, appUser?.id, undefined, 'PATCH');
      applyLocal();
      eventBus.emit(EVENTS.STOCK_UPDATED, { id, ...data, offline: true }, { idempotencyKey: payload.idempotency_key, priority: 'medium' });
      return;
    }
    try {
      // `apiRequest` lève une HttpError qui PORTE `.status` — c'est exactement
      // ce que `doitEnfilerStock` lit pour décider d'enfiler l'opération.
      await stocksApi.modifierStock(id, payload);
      applyLocal();
    } catch (error) {
      if (!doitEnfilerStock(error)) throw error;
      await enfilerOperation(`/stocks/${id}`, payload, appUser?.id, undefined, 'PATCH');
      applyLocal();
      eventBus.emit(EVENTS.STOCK_UPDATED, { id, ...data, offline: true }, { idempotencyKey: payload.idempotency_key, priority: 'medium' });
      return;
    }
    eventBus.emit(EVENTS.STOCK_UPDATED, { id, ...data }, { idempotencyKey: 'stock-' + id, priority: 'medium' });
  };

  const deleteStock = async (id: string) => {
    // On REMONTE l'échec (401, etc.) : sans ça, l'appelant annonçait « supprimé »
    // alors que rien n'était supprimé (illusion de perte de donnée relevée en recette).
    await stocksApi.supprimerStock(id);
    eventBus.emit(EVENTS.STOCK_DELETED, { id }, { priority: 'medium' });
    await refreshStocks();
  };

  const value: StockContextType = {
    stocks, stock: stocks, loading,
    addStock, updateStock, deleteStock, refreshStocks,
    getStockByProduit: (produit) => stocks.find(s => s.produit === produit),
    getStockTotal: () => stocks.reduce((sum, s) => sum + s.quantite, 0),
    // Stock faible = sous le SEUIL DU PRODUIT (seuil_alerte configuré), ou à
    // défaut le seuil global passé (5). Base des alertes de rupture marchand.
    getStockFaible: (seuil = 5) => stocks.filter(s => s.quantite <= (s.seuilAlerte ?? seuil)),
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
