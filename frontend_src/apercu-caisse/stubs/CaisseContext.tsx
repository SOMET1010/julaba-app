/**
 * STUB de CaisseContext pour l'APERÇU VISUEL de la caisse (lot F).
 * Remplace le vrai contexte par alias Vite (voir ../vite.config.ts) : aucun
 * backend, aucune connexion, aucune écriture. Les DONNÉES sont celles de la
 * maquette (Tomate 3 tas, Oignon 1 kg, Banane 2 pièces = 2 900 F). Le panier
 * est un vrai état React pour que − / + et « Vider » bougent à l'écran.
 * `enregistrerVente` ne fait RIEN : c'est un décor, pas une caisse.
 */
import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { vignetteProduit } from '../../src/app/utils/emojiTile';

export interface CaisseProduct {
  id: string; nom: string; prix: number; prix_achat?: number; categorie: string; stock: number; unite: string;
  image?: string; seuil_alerte?: number; date_peremption?: string | null; prix_promo?: number | null; promo_fin?: string | null;
}
export interface CartItem {
  productId: string; nom: string; prix: number; quantite: number; prix_achat?: number; totalExact?: number; unite?: string; origine?: 'vocal';
}
export interface CaisseTransaction { id: string; type: 'vente' | 'depense'; montant: number; date: string; productName?: string; }
export interface CaisseStats { ventesJour: number; cahierJour: number; soldeJour: number; nombreVentes: number; nombreCahier: number; }

const produit = (id: string, nom: string, prix: number, unite: string, stock: number): CaisseProduct =>
  // Vignettes LOCALES (emoji rendu en SVG, comme le fait déjà l'appli hors
  // ligne) : les photos du catalogue sont distantes et la capture se fait
  // sans réseau. On le dit dans le rapport.
  ({ id, nom, prix, prix_achat: Math.round(prix * 0.7), categorie: 'legumes', stock, unite, image: vignetteProduit(nom) });

export const PRODUITS_DEMO: CaisseProduct[] = [
  produit('tomate', 'Tomate', 500, 'tas', 24),
  produit('oignon', 'Oignon', 800, 'kg', 12),
  produit('piment', 'Piment', 300, 'tas', 6),
  produit('banane', 'Banane', 300, 'pièce', 30),
  produit('igname', 'Igname', 1000, 'tas', 15),
  produit('riz', 'Riz', 500, 'kg', 40),
  produit('gombo', 'Gombo', 300, 'tas', 9),
  produit('aubergine', 'Aubergine', 400, 'kg', 18),
];

const PANIER_DEMO: CartItem[] = [
  { productId: 'tomate', nom: 'Tomate', prix: 500, quantite: 3, unite: 'tas', prix_achat: 350 },
  { productId: 'oignon', nom: 'Oignon', prix: 800, quantite: 1, unite: 'kg', prix_achat: 560 },
  { productId: 'banane', nom: 'Banane', prix: 300, quantite: 2, unite: 'pièce', prix_achat: 210 },
];

// Des ventes passées pour que « vente rapide » (topProducts) ait un sens :
// Piment et Igname sont les plus vendus — et ne sont pas au panier, donc
// l'éclair se voit.
const TRANSACTIONS_DEMO: CaisseTransaction[] = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, type: 'vente' as const, montant: 300, date: '2026-09-20', productName: 'Piment' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `i${i}`, type: 'vente' as const, montant: 1000, date: '2026-09-20', productName: 'Igname' })),
];

const Ctx = createContext<any>(undefined);

/**
 * LE COMPTE D'UNE NOUVELLE MARCHANDE — banc de parcours (21/09/2026).
 * `?catalogue=vide` rejoue exactement l'écran du terrain : « Produits : Aucun
 * produit », panier vide. C'est dans cet état, et seulement lui, que le trou
 * principal se voit. `?panier=vide` garde le catalogue mais vide le panier.
 */
function param(nom: string): string | null {
  try { return new URLSearchParams(location.search).get(nom); } catch { return null; }
}

export function CaisseProvider({ children }: { children: ReactNode }) {
  const catalogueVide = param('catalogue') === 'vide';
  const produits = catalogueVide ? [] : PRODUITS_DEMO;
  const [cart, setCart] = useState<CartItem[]>(catalogueVide || param('panier') === 'vide' ? [] : PANIER_DEMO);
  // Le panier, lisible par le banc : ce qui entre VRAIMENT au panier est la
  // seule preuve qui compte sur l'argent — une capture n'en dit rien.
  React.useEffect(() => { (window as any).__panier = cart; }, [cart]);
  const noop = async () => {};
  const value = {
    transactions: catalogueVide ? [] : TRANSACTIONS_DEMO, loading: false, products: produits, cart,
    stats: { ventesJour: 12500, cahierJour: 0, soldeJour: 12500, nombreVentes: 7, nombreCahier: 0 } as CaisseStats,
    selectedProduct: null, setSelectedProduct: () => {},
    enregistrerVente: noop, enregistrerDepense: noop,
    addToCart: (p: CaisseProduct, quantite = 1, totalExact?: number, origine?: 'vocal') => setCart(c => {
      const ex = c.find(i => i.productId === p.id);
      if (ex) return c.map(i => i.productId === p.id ? { ...i, quantite: i.quantite + quantite, totalExact: undefined, ...(origine ? { origine } : {}) } : i);
      return [...c, { productId: p.id, nom: p.nom, prix: p.prix, quantite, unite: p.unite, prix_achat: p.prix_achat, totalExact, ...(origine ? { origine } : {}) }];
    }),
    removeFromCart: (id: string) => setCart(c => c.filter(i => i.productId !== id)),
    updateCartItemQuantity: (id: string, q: number) => setCart(c => q <= 0 ? c.filter(i => i.productId !== id) : c.map(i => i.productId === id ? { ...i, quantite: q, totalExact: undefined } : i)),
    updateCartItemPrice: (id: string, prix: number) => setCart(c => c.map(i => i.productId === id ? { ...i, prix, totalExact: undefined } : i)),
    clearCart: () => setCart([]),
    getTotalCart: () => cart.reduce((s, i) => s + (i.totalExact ?? i.prix * i.quantite), 0),
    venteEnCours: cart.length > 0, cartUpdatedAt: null, staleCart: null, resumeStaleCart: () => {}, discardStaleCart: () => {}, clearCartAndStorage: () => {},
    addProduct: noop, updateProduct: noop, deleteProduct: noop, refreshProducts: noop, addTransaction: noop,
    getSoldeJour: () => 12500, getVentesJour: () => TRANSACTIONS_DEMO, getCahierJour: () => [], refreshTransactions: noop,
    syncEchecs: 0, syncLettresMortes: [], purgerEchecSync: noop,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCaisse() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCaisse (stub) hors CaisseProvider');
  return c;
}
