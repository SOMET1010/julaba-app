import { eventBus, EVENTS } from '../services/eventBus';
import { useApp } from './AppContext';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import * as caisseApi from '../services/api/caisse-api';
import { getImageByNom } from '../data/catalogue-produits';
import { NOT_AUTHENTICATED } from '../services/api/api-client';
import { API_URL } from '../utils/api';
import { prixEffectif } from '../utils/promo.utils';
// Couche 2 offline : file d'attente durable des ventes/dépenses + synchro.
import {
  enfilerOperation, synchroniser,
  nbEchecs as offlineNbEchecs, lettresMortes as offlineLettresMortes, purgerLettreMorte as offlinePurger,
  type CaisseEndpoint, type LettreMorte,
} from '../voice-offline/offlineCaisse';
// Persistance locale du panier (Phase 1) : module pur, stockage injecté.
import { loadCart, saveCart, clearStoredCart, type KVStore } from '../services/cartStorage';

// localStorage respecte l'interface KVStore ; null en environnement sans window.
const cartStore: KVStore | null = typeof window !== 'undefined' ? window.localStorage : null;

// Rejoue une opération en attente vers la bonne route caisse (avec idempotency_key).
async function posterOperation(endpoint: CaisseEndpoint, payload: unknown): Promise<void> {
  if (endpoint === '/caisse/vente') await caisseApi.enregistrerVente(payload as caisseApi.EnregistrerVenteData);
  else await caisseApi.enregistrerDepense(payload as caisseApi.EnregistrerDepenseData);
}

// Clé d'idempotence : une par vente/dépense. Envoyée EN LIGNE (le backend
// déduplique) ET conservée dans le payload : si l'envoi échoue et qu'on enfile,
// le rejeu réutilise la MÊME clé → jamais de double-comptage, même si la vente
// avait en réalité déjà atteint le serveur.
function genererCle(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'op-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// Faut-il mettre l'opération dans la file durable plutôt que de la perdre ?
// Classé par STATUT HTTP (pas d'analyse de texte) : 5xx = transitoire (enfiler),
// 4xx = vraie erreur métier à remonter (rejouer en boucle n'aiderait pas). Sans
// statut (hors-ligne, fetch KO, session, JSON invalide) = transitoire → enfiler.
function doitEnfiler(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === 'number') return status >= 500; // 5xx enfiler ; 4xx surface
  return true; // pas de statut HTTP → transitoire (réseau/technique/session)
}

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
  /** Seuil d'alerte de stock bas (API: seuil_alerte) */
  seuil_alerte?: number;
  /** Date de péremption AAAA-MM-JJ (API: date_peremption) */
  date_peremption?: string | null;
  /** Prix promotionnel (API: prix_promo) — appliqué s'il est actif */
  prix_promo?: number | null;
  /** Fin de promo AAAA-MM-JJ (API: promo_fin) — null = sans date de fin */
  promo_fin?: string | null;
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
  /** Négoce (demi-grossiste/grossiste) : le prix unitaire se discute à la vente. */
  updateCartItemPrice: (productId: string, prix: number) => void;
  clearCart: () => void;
  getTotalCart: () => number;

  // Persistance / reprise du panier (Phase 1)
  venteEnCours: boolean;
  cartUpdatedAt: string | null;
  /** Panier « ancien » (> seuil) en attente de décision reprendre/effacer (R5). */
  staleCart: { items: CartItem[]; updatedAt: string } | null;
  resumeStaleCart: () => void;
  discardStaleCart: () => void;
  /** Efface le panier ET sa clé locale (déconnexion volontaire — R3). */
  clearCartAndStorage: () => void;

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

  // File hors-ligne — rejets définitifs (4xx) sortis de la file au rejeu.
  /** Nombre d'opérations hors-ligne refusées définitivement, à revoir. */
  syncEchecs: number;
  /** Détail des opérations refusées (montant, date, motif backend). */
  syncLettresMortes: LettreMorte[];
  /** Retire une opération refusée du registre (après revue). */
  purgerEchecSync: (id: string) => Promise<void>;
}

const CaisseContext = createContext<CaisseContextType | undefined>(undefined);

export function CaisseProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<CaisseTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CaisseProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mouvements, setMouvements] = useState<StockMovement[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CaisseProduct | null>(null);

  // Persistance du panier (Phase 1) : alerte d'échec unique (R4), panier « ancien »
  // en attente de décision (R5). La sauvegarde se fait à la MUTATION (voir
  // persistCart) et non via un effet sur `cart` — un effet créait une course au
  // montage qui effaçait un panier ancien avant que l'utilisatrice ne choisisse.
  const saveWarnedRef = useRef(false);
  const [staleCart, setStaleCart] = useState<{ items: CartItem[]; updatedAt: string } | null>(null);
  const [cartUpdatedAt, setCartUpdatedAt] = useState<string | null>(null);
  // Rejets définitifs (4xx) sortis de la file au rejeu : surfaçage obligatoire.
  const [syncEchecs, setSyncEchecs] = useState(0);
  const [syncLettresMortes, setSyncLettresMortes] = useState<LettreMorte[]>([]);
  const rafraichirEchecs = useCallback(async () => {
    try { setSyncEchecs(await offlineNbEchecs()); setSyncLettresMortes(await offlineLettresMortes()); }
    catch { /* IndexedDB indisponible : on ignore */ }
  }, []);
  const purgerEchecSync = useCallback(async (id: string) => {
    try { await offlinePurger(id); } finally { await rafraichirEchecs(); }
  }, [rafraichirEchecs]);

  const loadTransactions = async () => {
    const cacheKey = `julaba_cache_tx_${appUser?.id || 'anon'}`;
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
      // Cache local : dernière version connue de l'historique (lecture hors-ligne).
      try { localStorage.setItem(cacheKey, JSON.stringify(txList)); } catch { /* ignore */ }
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
      // Hors-ligne (ou serveur injoignable) : on sert le dernier historique connu.
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) setTransactions(JSON.parse(raw));
      } catch { /* ignore */ }
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

  // Synchro des ventes/dépenses faites hors-ligne : au retour du réseau + au montage.
  useEffect(() => {
    const sync = async () => {
      try {
        const avant = await offlineNbEchecs().catch(() => 0);
        const { ok, echecs } = await synchroniser(posterOperation);
        if (ok > 0) await loadTransactions();
        await rafraichirEchecs();
        if (echecs > avant) {
          const n = echecs - avant;
          toast.error(`${n} opération${n > 1 ? 's' : ''} hors-ligne refusée${n > 1 ? 's' : ''} — à revoir`);
        }
      } catch { /* on retentera au prochain 'online' */ }
    };
    sync(); // rattrape une file laissée par une session hors-ligne précédente
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  // ── Persistance du panier ──────────────────────────────────
  // HYDRATATION : au montage et à CHAQUE changement d'utilisateur. LECTURE SEULE
  // (ne supprime jamais la clé) : on lit la clé DU BON utilisateur et on peuple
  // l'état. Comme la sauvegarde se fait à la mutation, aucune course ne peut
  // effacer un panier ancien avant la décision de l'utilisatrice.
  useEffect(() => {
    const id = appUser?.id ?? null;
    saveWarnedRef.current = false;
    setStaleCart(null);
    if (!id || !cartStore) {
      setCart([]);
      setCartUpdatedAt(null);
      return;
    }
    const loaded = loadCart(cartStore, id, Date.now());
    if (loaded && loaded.age === 'recent') {
      setCart(loaded.items);
      setCartUpdatedAt(loaded.updatedAt);
    } else if (loaded && loaded.age === 'stale') {
      // Panier ancien : on ne restaure PAS ; on propose reprendre/effacer (R5).
      // La clé reste intacte tant que la décision n'est pas prise.
      setCart([]);
      setCartUpdatedAt(null);
      setStaleCart({ items: loaded.items, updatedAt: loaded.updatedAt });
    } else {
      setCart([]);
      setCartUpdatedAt(null);
    }
  }, [appUser?.id]);

  // SAUVEGARDE à la MUTATION (jamais via un effet sur `cart`, pour éviter la course
  // au montage). Un panier vide EFFACE la clé (saveCart). Échec de stockage non
  // bloquant, averti une seule fois (R4).
  const persistCart = useCallback((items: CartItem[]) => {
    const id = appUser?.id;
    if (!id || !cartStore) return;
    const res = saveCart(cartStore, id, items, new Date().toISOString());
    if (!res.ok && !saveWarnedRef.current) {
      saveWarnedRef.current = true;
      toast.warning('Cette vente ne pourra peut-être pas être retrouvée si l\'application se ferme.');
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
    // Calculer prix_achat depuis les produits du panier
    const lignes = Array.isArray(produits) ? produits : [];
    const prixAchatTotal = lignes.reduce((sum: number, p: any) => {
      const qte = Number(p.quantite || p.quantity || 1);
      const pa = Number(p.prix_achat || p.prixAchat || p.purchasePrice || 0);
      return sum + (pa * qte);
    }, 0);
    const payload: caisseApi.EnregistrerVenteData = {
      montant,
      produits,
      details: produits,
      mode_paiement: modePaiement,
      notes,
      prix_achat: prixAchatTotal > 0 ? prixAchatTotal : undefined,
      prix_vente: montant,
      idempotency_key: genererCle(),
    };
    // Hors-ligne : on met la vente dans la file durable (rejeu à la reconnexion).
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enfilerOperation('/caisse/vente', payload);
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
      return;
    }
    try {
      await caisseApi.enregistrerVente(payload);
      await loadTransactions();
      // Notifier AppContext de recharger ses transactions
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant }, { priority: 'high' });
    } catch (error: any) {
      // Ne JAMAIS perdre une vente : hors-ligne, token expiré, panne réseau ou
      // serveur temporairement KO -> on l'enfile (rejeu avec la MÊME clé, donc
      // pas de double-comptage même si la vente était déjà passée). Une vraie
      // erreur métier 4xx est remontée à l'utilisateur.
      if (doitEnfiler(error)) {
        await enfilerOperation('/caisse/vente', payload);
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
        return;
      }
      throw error;
    }
  };

  const enregistrerDepense = async (montant: number, notes?: string) => {
    if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant de dépense invalide');
    const payload: caisseApi.EnregistrerDepenseData = { montant, notes, idempotency_key: genererCle() };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enfilerOperation('/caisse/depense', payload);
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
      return;
    }
    try {
      await caisseApi.enregistrerDepense(payload);
      await loadTransactions();
      // Notifier AppContext de recharger ses transactions
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant }, { priority: 'high' });
    } catch (error: any) {
      // Ne JAMAIS perdre une dépense : hors-ligne, token expiré, panne réseau ou
      // serveur temporairement KO -> on l'enfile (rejeu avec la MÊME clé).
      if (doitEnfiler(error)) {
        await enfilerOperation('/caisse/depense', payload);
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
        return;
      }
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
    const existing = cart.find(item => item.productId === product.id);
    const next = existing
      ? cart.map(item =>
          item.productId === product.id ? { ...item, quantite: item.quantite + quantite } : item)
      // Prix effectif : applique automatiquement le prix promo s'il est actif.
      : [...cart, { productId: product.id, nom: product.nom, prix: prixEffectif(product), quantite }];
    setCart(next);
    persistCart(next);
  };

  const removeFromCart = (productId: string) => {
    const next = cart.filter(item => item.productId !== productId);
    setCart(next);
    persistCart(next);
  };

  const updateCartItemQuantity = (productId: string, quantite: number) => {
    if (quantite <= 0) {
      removeFromCart(productId);
      return;
    }
    const next = cart.map(item =>
      item.productId === productId ? { ...item, quantite } : item);
    setCart(next);
    persistCart(next);
  };

  // Négoce (demi-grossiste/grossiste) : le prix se discute à chaque vente —
  // la ligne du panier porte le prix CONVENU, persisté comme le reste.
  const updateCartItemPrice = (productId: string, prix: number) => {
    if (!prix || isNaN(prix) || prix <= 0) return;
    const next = cart.map(item =>
      item.productId === productId ? { ...item, prix } : item);
    setCart(next);
    persistCart(next);
  };

  const clearCart = () => { setCart([]); persistCart([]); };

  const getTotalCart = () => cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  // ── Persistance / reprise du panier (Phase 1) ──────────────
  const venteEnCours = cart.length > 0;

  // Reprendre un panier « ancien » proposé au démarrage (R5) → il redevient actif
  // et est ré-enregistré avec un horodatage frais.
  const resumeStaleCart = useCallback(() => {
    if (!staleCart) return;
    const items = staleCart.items;
    setCart(items);
    setStaleCart(null);
    persistCart(items);
  }, [staleCart, persistCart]);

  // Effacer un panier « ancien » sans le reprendre (R5).
  const discardStaleCart = useCallback(() => {
    const id = appUser?.id;
    if (id && cartStore) clearStoredCart(cartStore, id);
    setStaleCart(null);
    setCart([]);
  }, [appUser?.id]);

  // Effacer le panier ET sa clé locale (déconnexion volontaire — R3).
  const clearCartAndStorage = useCallback(() => {
    const id = appUser?.id;
    if (id && cartStore) clearStoredCart(cartStore, id);
    setStaleCart(null);
    setCart([]);
  }, [appUser?.id]);

  // ── Products ───────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    const cacheKey = (() => {
      try { const r = localStorage.getItem('julaba_auth_user'); const id = r ? (JSON.parse(r).id || 'anon') : 'anon'; return `julaba_cache_produits_${id}`; }
      catch { return 'julaba_cache_produits_anon'; }
    })();
    try {
      const res = await fetch(`${API_URL}/caisse/produits`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const produits = data.produits || [];
      const mapped = produits.map((p: any) => ({
        id: p.id, nom: p.nom, prix: Number(p.prix),
        prix_achat: Number(p.prix_achat ?? p.prixAchat ?? 0) || 0,
        categorie: p.categorie, stock: Number(p.stock),
        unite: p.unite, image: p.image || getImageByNom(p.nom),
        seuil_alerte: p.seuil_alerte != null ? Number(p.seuil_alerte) : undefined,
        date_peremption: p.date_peremption || null,
        prix_promo: p.prix_promo != null ? Number(p.prix_promo) : null,
        promo_fin: p.promo_fin || null,
      }));
      setProducts(mapped);
      // Cache local : derniers produits connus (vente/stock consultables hors-ligne).
      try { localStorage.setItem(cacheKey, JSON.stringify(mapped)); } catch { /* ignore */ }
    } catch (err: unknown) {
      console.warn('[CaisseContext] loadProducts failed:', err instanceof Error ? err.message : err);
      // Hors-ligne : servir les derniers produits connus.
      try { const raw = localStorage.getItem(cacheKey); if (raw) setProducts(JSON.parse(raw)); } catch { /* ignore */ }
    }
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
        ...((product as any).seuil_alerte != null || (product as any).seuilAlerte != null || (product as any).threshold != null
          ? { seuil_alerte: Number((product as any).seuil_alerte ?? (product as any).seuilAlerte ?? (product as any).threshold) } : {}),
        ...((product as any).date_peremption || (product as any).datePeremption ? { date_peremption: (product as any).date_peremption ?? (product as any).datePeremption } : {}),
        ...((product as any).prix_promo != null || (product as any).prixPromo != null
          ? { prix_promo: Number((product as any).prix_promo ?? (product as any).prixPromo) || null } : {}),
        ...((product as any).promo_fin || (product as any).promoFin ? { promo_fin: (product as any).promo_fin ?? (product as any).promoFin } : {}),
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
          prix_promo: p.prix_promo != null ? Number(p.prix_promo) : null,
          promo_fin: p.promo_fin || null,
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
      const seuil = (updates as any).seuil_alerte ?? (updates as any).seuilAlerte ?? (updates as any).threshold;
      const peremption = (updates as any).date_peremption ?? (updates as any).datePeremption;
      // Promo : présente dans `updates` seulement si le formulaire l'a envoyée.
      // On la transmet alors explicitement (valeur ou null pour la retirer).
      const promoFournie = 'prix_promo' in updates || 'prixPromo' in (updates as any);
      const prixPromoRaw = (updates as any).prix_promo ?? (updates as any).prixPromo;
      const promoFin = (updates as any).promo_fin ?? (updates as any).promoFin ?? null;
      const updatedWithPrixAchat = {
        ...updated,
        prix_achat: prixAchat,
        ...(seuil != null ? { seuil_alerte: Number(seuil) } : {}),
        ...(peremption ? { date_peremption: peremption } : {}),
        ...(promoFournie
          ? { prix_promo: prixPromoRaw != null && prixPromoRaw !== '' ? Number(prixPromoRaw) : null, promo_fin: promoFin || null }
          : {}),
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
    updateCartItemPrice,
    clearCart,
    getTotalCart,
    venteEnCours,
    cartUpdatedAt,
    staleCart,
    resumeStaleCart,
    discardStaleCart,
    clearCartAndStorage,
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
    syncEchecs,
    syncLettresMortes,
    purgerEchecSync,
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