import { eventBus, EVENTS } from '../services/eventBus';
import { useApp } from './AppContext';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import * as caisseApi from '../services/api/caisse-api';
import { getImageByNom } from '../data/catalogue-produits';
import { NOT_AUTHENTICATED, apiRequest } from '../services/api/api-client';
import { API_URL } from '../utils/api';
import { prixEffectif } from '../utils/promo.utils';
import type { LigneDeVente, ProduitServeur, AliasSaisieProduit } from '../types/vente';
import { jourLocal } from '../utils/jourLocal';
import {
  soumettreOperationCaisse,
  type ResultatOperationCaisse,
} from '../services/statutOperationCaisse';
// Couche 2 offline : file d'attente durable des ventes/dépenses + synchro.
import {
  enfilerOperation, synchroniser,
  nbEnAttente as offlineNbEnAttente, operationsEnAttente as offlineOperationsEnAttente,
  nbEchecs as offlineNbEchecs, lettresMortes as offlineLettresMortes, purgerLettreMorte as offlinePurger,
  type OfflineEndpoint, type OfflineMethod, type LettreMorte, type OperationCaisse,
} from '../voice-offline/offlineCaisse';
// Persistance locale du panier (Phase 1) : module pur, stockage injecté.
import { loadCart, saveCart, clearStoredCart, type KVStore } from '../services/cartStorage';

// localStorage respecte l'interface KVStore ; null en environnement sans window.
const cartStore: KVStore | null = typeof window !== 'undefined' ? window.localStorage : null;

// Rejoue une opération en attente vers la bonne route caisse (avec idempotency_key).
async function posterOperation(endpoint: OfflineEndpoint, payload: unknown, method: OfflineMethod): Promise<void> {
  if (endpoint === '/caisse/vente') await caisseApi.enregistrerVente(payload as caisseApi.EnregistrerVenteData);
  else if (endpoint === '/caisse/depense') await caisseApi.enregistrerDepense(payload as caisseApi.EnregistrerDepenseData);
  else {
    // Rejeu d'une opération de STOCK (`/stocks/:id`). Passe par le client
    // commun : l'erreur levée est une HttpError qui porte `.status`, ce que
    // `doitEnfiler` lit déjà pour distinguer un 5xx transitoire d'un 4xx
    // définitif. Le rejeu hors-ligne survient souvent après de longues heures —
    // c'est précisément le moment où le jeton a expiré et où le
    // rafraîchissement silencieux évite de perdre l'opération.
    await apiRequest(API_URL, endpoint, { method, body: JSON.stringify(payload) });
  }
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
  produits?: LigneDeVente[] | unknown;
  mode_paiement?: string;
  /** Nom lisible utilisé pour calculer les raccourcis de vente. */
  productName?: string;
  /** Motif d'une dépense. */
  description?: string;
  notes?: string;
  date: string;
  source?: string;
  synced?: boolean;
  userId?: string;
  statut?: string; // 'validee' | 'annulee' | 'gelee' | 'litige' — une vente annulée sort du CA.
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
  /** Prix d'achat UNITAIRE — nécessaire pour calculer la marge de la vente.
   *  Sans lui, la ligne partait à prix_achat:0 → marge = prix de vente entier.
   *  Optionnel : un panier restauré d'avant ce correctif ne le porte pas (le
   *  downstream défaulte à 0 → « marge — » honnête via beneficeDepuisDetails). */
  prix_achat?: number;
  /** Montant TOTAL exact convenu/dicté pour cette ligne (même quantité) —
   *  prioritaire sur `prix * quantite`. En FCFA, un montant comme 500/3 ne
   *  retombe pas juste : `prix` reste l'unitaire ARRONDI (affichage/édition),
   *  mais c'est ce total qui fait foi (même principe que
   *  `LigneVenteVocale.total` dans venteVocale.ts, bug #11 de l'audit).
   *  Invalidé (undefined) dès que la ligne est modifiée manuellement
   *  (quantité, prix, fusion) : il ne vaut que pour la ligne telle que créée. */
  totalExact?: number;
  /** L'UNITÉ AU MOMENT DE LA VENTE — « tas », « kg », « sac », « régime »…
   *
   *  POURQUOI ELLE VIT SUR LA LIGNE, arbitrage de Patrick du 19/09/2026.
   *  L'unité ne vivait que dans `produits.unite`, que la marchande peut changer
   *  à tout moment. Le jour où elle passe la tomate du tas au kilo, TOUTES ses
   *  ventes passées se relisaient au kilo — et un reçu disant « 3 × Tomate »
   *  devenait indéchiffrable : trois quoi ? Aucune reconstitution n'était
   *  possible, l'information était détruite.
   *
   *  Une vente doit garder son contexte historique. Le catalogue peut changer
   *  après ; ce qui a été vendu, non. C'est la même règle que `prix_achat`,
   *  figé à la vente pour que la marge d'hier ne bouge pas quand le
   *  fournisseur change de tarif. */
  unite?: string;
  /** D'où vient CETTE ligne. Posé à 'vocal' quand c'est la voix qui l'a créée.
   *
   *  POURQUOI CE CHAMP EXISTE, relevé par Patrick le 18/09 sur ses ventes
   *  réelles : l'écran « Ventes passées » badgeait TOUT en « kassa », y compris
   *  ce qu'il avait dicté, et l'onglet « Par la voix » restait vide quoi qu'il
   *  fasse. La cause n'était pas l'affichage : une vente vocale et une vente à
   *  la caisse empruntent le MÊME chemin — la voix ne fait que remplir le
   *  panier, c'est toujours « Encaisser » qui enregistre. Rien, nulle part, ne
   *  disait donc d'où venait la vente.
   *
   *  C'est la LIGNE qui sait, pas la vente : seule elle a été créée par la
   *  voix ou par le doigt. La vente en hérite (voir sourceDuPanier).
   *
   *  Conservé en fusion, contrairement à totalExact : qu'on ajoute un article à
   *  la main sur une ligne dictée ne change pas le fait que la voix a servi. */
  origine?: 'vocal';
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
  stats: CaisseStats;
  selectedProduct: CaisseProduct | null;
  setSelectedProduct: (p: CaisseProduct | null) => void;
  
  enregistrerVente: (montant: number, produits?: LigneDeVente[], modePaiement?: string, notes?: string, source?: 'vocal' | 'kassa') => Promise<ResultatOperationCaisse>;
  enregistrerDepense: (montant: number, notes?: string) => Promise<ResultatOperationCaisse>;
  
  // POS Cart
  addToCart: (product: CaisseProduct, quantite?: number, totalExact?: number, origine?: 'vocal') => void;
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

  getSoldeJour: () => number;
  getVentesJour: () => CaisseTransaction[];
  getCahierJour: () => CaisseTransaction[];
  
  refreshTransactions: () => Promise<void>;

  // File hors-ligne — opérations gardées sur le téléphone, pas encore confirmées.
  syncEnAttente: number;
  syncOperationsEnAttente: OperationCaisse[];
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
  // P0-1 : lu ici, en tête, pour que tout ce qui touche la file hors-ligne
  // (rafraîchissement, purge, rejeu) connaisse l'utilisateur ACTUELLEMENT
  // connecté — jamais une valeur figée dans une fermeture créée avant un
  // logout/login (terminal partagé).
  const { user: appUser } = useApp();
  const [transactions, setTransactions] = useState<CaisseTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CaisseProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [syncEnAttente, setSyncEnAttente] = useState(0);
  const [syncOperationsEnAttente, setSyncOperationsEnAttente] = useState<OperationCaisse[]>([]);
  const rafraichirEchecs = useCallback(async () => {
    const uid = appUser?.id;
    if (!uid) {
      setSyncEnAttente(0); setSyncOperationsEnAttente([]);
      setSyncEchecs(0); setSyncLettresMortes([]); return;
    }
    try {
      const [enAttente, operations, echecs, lettres] = await Promise.all([
        offlineNbEnAttente(uid), offlineOperationsEnAttente(uid),
        offlineNbEchecs(uid), offlineLettresMortes(uid),
      ]);
      setSyncEnAttente(enAttente);
      setSyncOperationsEnAttente(operations);
      setSyncEchecs(echecs);
      setSyncLettresMortes(lettres);
    }
    catch { /* IndexedDB indisponible : on ignore */ }
  }, [appUser?.id]);
  const purgerEchecSync = useCallback(async (id: string) => {
    const uid = appUser?.id;
    if (!uid) return;
    try { await offlinePurger(id, uid); } finally { await rafraichirEchecs(); }
  }, [appUser?.id, rafraichirEchecs]);

  const loadTransactions = async () => {
    const cacheKey = `julaba_cache_tx_${appUser?.id || 'anon'}`;
    try {
      setLoading(true);
      const { transactions: data } = await caisseApi.fetchCaisseTransactions();

      const txList: CaisseTransaction[] = data.map((tx: caisseApi.CaisseTransaction) => {
        const lignes = tx.details || tx.produits || [];
        return {
          id: tx.id,
          marchandId: tx.marchand_id,
          type: tx.type,
          montant: parseFloat(String(tx.montant)) || 0,
          produits: tx.produits || tx.details,
          mode_paiement: tx.mode_paiement,
          description: tx.description || tx.notes,
          notes: tx.notes || tx.description,
          productName: tx.produit || tx.description || lignes[0]?.nom || '',
          source: tx.source,
          date: tx.created_at,
          statut: tx.statut,
        };
      });
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
  useEffect(() => {
    if (appUser?.id) {
      loadTransactions();
    }
  }, [appUser?.id]);

  // Synchro des ventes/dépenses faites hors-ligne : au retour du réseau + au montage.
  // P0-1 : dépend de `appUser?.id` — sans ça, cet effet ne se relançait JAMAIS
  // au changement d'utilisateur (tableau de dépendances vide), et son closure
  // gardait la première session vue. Sur un terminal partagé (A se déconnecte,
  // B se connecte, le réseau revient), la file de A aurait pu être rejouée avec
  // les identifiants encore valides de B. On relit l'identité à CHAQUE montage
  // de l'effet (donc à chaque changement d'utilisateur) et on ne synchronise
  // JAMAIS sans utilisateur connu.
  useEffect(() => {
    const uid = appUser?.id;
    if (!uid) return;

    // UNE VENTE QUI RESTE EN FILE DOIT ÊTRE RETENTÉE — correctif du 18/09/2026.
    //
    // `synchroniser` rend `reste`, et personne ne le lisait. Sur une erreur
    // PASSAGÈRE (un 503 de deux secondes au retour du réseau), la boucle
    // s'arrête et les opérations restent en file. Le prochain essai n'arrivait
    // qu'au prochain montage ou au prochain événement « online » — qui ne
    // vient jamais si le téléphone reste connecté. Une vente de 1 500 F
    // pouvait ainsi dormir indéfiniment : pas en lettre morte, donc AUCUNE
    // alerte, et absente du chiffre d'affaires.
    //
    // On relance donc nous-mêmes, en espaçant : 5 s, 15 s, 1 min, puis toutes
    // les 5 minutes. L'espacement protège un réseau de marché déjà fragile ;
    // l'absence de limite protège l'argent, qui ne doit jamais être abandonné.
    const DELAIS_MS = [5000, 15000, 60000];
    const DELAI_MAX_MS = 5 * 60 * 1000;
    let minuterie: ReturnType<typeof setTimeout> | null = null;
    let essai = 0;
    let arrete = false;

    const programmerRelance = () => {
      if (arrete) return;
      const delai = DELAIS_MS[essai] ?? DELAI_MAX_MS;
      essai++;
      minuterie = setTimeout(() => { void sync(); }, delai);
    };

    const sync = async () => {
      if (arrete) return;
      if (minuterie) { clearTimeout(minuterie); minuterie = null; }
      try {
        const avant = await offlineNbEchecs(uid).catch(() => 0);
        const { ok, echecs, reste } = await synchroniser(posterOperation, uid);
        setSyncEnAttente(reste);
        if (ok > 0) await loadTransactions();
        await rafraichirEchecs();
        if (echecs > avant) {
          const n = echecs - avant;
          toast.error(`${n} opération${n > 1 ? 's' : ''} hors-ligne refusée${n > 1 ? 's' : ''} — à revoir`);
        }
        // Il reste de l'argent en attente : on retentera, sans rien demander
        // à la marchande. Un compteur qui ne descend pas est un compteur qui
        // ment ; celui-ci finit toujours par descendre ou par basculer en
        // lettre morte, qui elle est signalée.
        if (reste > 0) programmerRelance();
        else essai = 0;
      } catch {
        // Même un échec complet de la synchronisation doit être réessayé :
        // ne rien faire ici, c'était abandonner la file jusqu'au prochain
        // redémarrage de l'application.
        programmerRelance();
      }
    };

    void sync(); // rattrape une file laissée par une session hors-ligne précédente — la SIENNE uniquement
    window.addEventListener('online', sync);
    return () => {
      arrete = true;
      if (minuterie) clearTimeout(minuterie);
      window.removeEventListener('online', sync);
    };
  }, [appUser?.id, rafraichirEchecs]);

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
  // Jour LOCAL (appareil) des deux côtés — cf. utils/jourLocal. À Abidjan (UTC+0)
  // identique à l'ancien jour UTC ; correct ailleurs. On compare le jour local de
  // la transaction au jour local courant (l'ancien `startsWith` sur l'ISO UTC ne
  // marcherait pas avec une clé locale).
  const getToday = () => jourLocal();
  const estDuJour = (iso: string) => jourLocal(iso) === getToday();

  // Une vente ANNULÉE sort du CA du jour (cohérence avec l'annulation self-service
  // #20 : le montant reste tracé côté serveur, mais n'entre plus dans le chiffre).
  const venteActive = (tx: CaisseTransaction) =>
    tx.type === 'vente' && tx.statut !== 'annulee' && estDuJour(tx.date);
  const stats: CaisseStats = {
    ventesJour: transactions
      .filter(venteActive)
      .reduce((sum, tx) => sum + tx.montant, 0),
    cahierJour: transactions
      .filter(tx => tx.type === 'depense' && estDuJour(tx.date))
      .reduce((sum, tx) => sum + tx.montant, 0),
    soldeJour: 0,
    nombreVentes: transactions.filter(venteActive).length,
    nombreCahier: transactions.filter(tx => tx.type === 'depense' && estDuJour(tx.date)).length,
  };
  stats.soldeJour = stats.ventesJour - stats.cahierJour;

  // ── Ventes / Cahier ──────────────────────────────────────
  const enregistrerVente = async (
    montant: number,
    produits?: LigneDeVente[],
    modePaiement?: string,
    notes?: string,
    /** D'où vient la vente. Le backend l'accepte déjà (`source: body.source ||
     *  'kassa'`) ; c'est le front qui ne l'envoyait jamais, d'où un écran où
     *  tout paraissait venir de la caisse. */
    source?: 'vocal' | 'kassa',
  ) => {
    if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant de vente invalide');
    // Calculer prix_achat depuis les produits du panier
    const lignes = Array.isArray(produits) ? produits : [];
    const prixAchatTotal = lignes.reduce((sum: number, p: LigneDeVente) => {
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
      // Part aussi dans la file hors-ligne : une vente dictée rejouée après une
      // coupure reste une vente dictée.
      ...(source ? { source } : {}),
      idempotency_key: genererCle(),
    };
    // Le résultat remonte jusqu'à l'écran : seule une réponse serveur réussie
    // vaut `confirmee`. Une copie IndexedDB est `en_attente`, même si la requête
    // a peut-être atteint le serveur avant de perdre sa réponse. La clé
    // d'idempotence permettra au rejeu de trancher sans double-comptage.
    return soumettreOperationCaisse({
      horsLigne: typeof navigator !== 'undefined' && navigator.onLine === false,
      envoyer: async () => {
        await caisseApi.enregistrerVente(payload);
        await loadTransactions();
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant }, { priority: 'high' });
      },
      enfiler: async () => {
        const operationId = await enfilerOperation('/caisse/vente', payload, appUser?.id);
        await rafraichirEchecs();
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
        return operationId;
      },
      doitEnfiler,
    });
  };

  const enregistrerDepense = async (montant: number, notes?: string) => {
    if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant de dépense invalide');
    // `description` est le contrat canonique du backend et du cahier. `notes`
    // reste dupliqué temporairement pour que toute file issue d'une ancienne
    // version soit rejouable sans perdre son motif.
    const payload: caisseApi.EnregistrerDepenseData = {
      montant, description: notes, notes, idempotency_key: genererCle(),
    };
    return soumettreOperationCaisse({
      horsLigne: typeof navigator !== 'undefined' && navigator.onLine === false,
      envoyer: async () => {
        await caisseApi.enregistrerDepense(payload);
        await loadTransactions();
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant }, { priority: 'high' });
      },
      enfiler: async () => {
        const operationId = await enfilerOperation('/caisse/depense', payload, appUser?.id);
        await rafraichirEchecs();
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
        return operationId;
      },
      doitEnfiler,
    });
  };

  const addTransaction = async (tx: Omit<CaisseTransaction, 'id' | 'date'>) => {
    if (tx.type === 'vente') {
      await enregistrerVente(tx.montant, tx.produits as LigneDeVente[] | undefined, tx.mode_paiement, tx.notes);
    } else if (tx.type === 'depense') {
      await enregistrerDepense(tx.montant, tx.notes);
    }
  };

  // ── POS Cart ───────────────────────────────────────────────
  // `totalExact` (optionnel) : montant TOTAL exact pour CETTE quantité,
  // fourni par un appelant qui connaît déjà le total dicté/résolu (voix,
  // vente guidée) — voir CartItem.totalExact. Ignoré en fusion : une ligne
  // existante grossit en quantité, or un total figé ne « scale » pas ;
  // mieux vaut retomber sur prix*quantite (comportement déjà existant avant
  // ce correctif) que de garder un total exact devenu faux pour la nouvelle
  // quantité.
  const addToCart = (product: CaisseProduct, quantite: number = 1, totalExact?: number, origine?: 'vocal') => {
    const existing = cart.find(item => item.productId === product.id);
    const next = existing
      ? cart.map(item =>
          item.productId === product.id
            // `origine` se CUMULE en fusion (une ligne dictée puis complétée au
            // doigt reste une ligne où la voix a servi), là où `totalExact` est
            // invalidé — le total dicté, lui, ne vaut plus pour la nouvelle
            // quantité.
            // LA FUSION NE DOIT PAS PERDRE D'ARGENT — corrigé le 18/09/2026.
            // Avant : la quantité s'additionnait, mais le PRIX de la première
            // ligne était conservé et `totalExact` jeté. « 1 tomate à 500 »
            // puis « 1 tomate à 700 » donnait 2 × 500 = 1 000 F au lieu de
            // 1 200 F. Elle perdait 200 F, sur son propre panier, sans rien
            // voir.
            // Désormais on ADDITIONNE les deux totaux réels. Le total de
            // chaque côté est son `totalExact` s'il en a un (montant négocié
            // ou dicté), sinon prix × quantité. La règle vaut aussi pour le
            // tactile, où elle ne change rien : prix × q1 + prix × q2 est
            // exactement prix × (q1+q2).
            ? {
                ...item,
                quantite: item.quantite + quantite,
                totalExact:
                  (item.totalExact ?? item.prix * item.quantite) +
                  (totalExact ?? prixEffectif(product) * quantite),
                ...(origine ? { origine } : {}),
              }
            : item)
      // Prix effectif : applique automatiquement le prix promo s'il est actif.
      : [...cart, {
          productId: product.id, nom: product.nom, prix: prixEffectif(product), quantite,
          prix_achat: Number(product.prix_achat) || 0,
          // FIGÉE À LA CRÉATION DE LA LIGNE, comme le prix d'achat : c'est
          // l'unité telle qu'elle était au moment de la vente.
          ...(product.unite ? { unite: String(product.unite) } : {}),
          ...(totalExact != null && totalExact > 0 ? { totalExact } : {}),
          ...(origine ? { origine } : {}),
        }];
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
    // Le total exact éventuel ne valait que pour l'ancienne quantité.
    const next = cart.map(item =>
      item.productId === productId ? { ...item, quantite, totalExact: undefined } : item);
    setCart(next);
    persistCart(next);
  };

  // Négoce (demi-grossiste/grossiste) : le prix se discute à chaque vente —
  // la ligne du panier porte le prix CONVENU, persisté comme le reste.
  const updateCartItemPrice = (productId: string, prix: number) => {
    if (!prix || isNaN(prix) || prix <= 0) return;
    // Le total exact éventuel ne valait que pour l'ancien prix.
    const next = cart.map(item =>
      item.productId === productId ? { ...item, prix, totalExact: undefined } : item);
    setCart(next);
    persistCart(next);
  };

  const clearCart = () => { setCart([]); persistCart([]); };

  const getTotalCart = () => cart.reduce((sum, item) => sum + (item.totalExact ?? item.prix * item.quantite), 0);

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
  /** Repli sur le catalogue mémorisé du téléphone. Partagé par les DEUX
   *  chemins d'échec (réponse en erreur, et coupure réseau) : c'est leur
   *  divergence qui laissait un écran vide sur un simple 503. */
  const restaurerDepuisCache = (cacheKey: string) => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) setProducts(JSON.parse(raw));
    } catch { /* un cache illisible ne doit jamais casser l'écran */ }
  };

  const loadProducts = useCallback(async () => {
    const cacheKey = (() => {
      try { const r = localStorage.getItem('julaba_auth_user'); const id = r ? (JSON.parse(r).id || 'anon') : 'anon'; return `julaba_cache_produits_${id}`; }
      catch { return 'julaba_cache_produits_anon'; }
    })();
    try {
      // UN SERVEUR QUI RÉPOND MAL EST PIRE QU'UN SERVEUR ABSENT — corrigé le
      // 18/09/2026. Le catalogue restait VIDE sur un 500/503 alors que le cache
      // local contenait ses produits et leurs prix. Sur un marché, le réseau
      // dégradé est le cas NORMAL — et un catalogue vide, c'est une marchande
      // qui ne peut plus rien vendre ni faire dire un prix à Tata.
      // Les DEUX échecs (réponse en erreur, coupure réseau) tombent maintenant
      // dans le même `catch` et servent le cache.
      const { produits } = await caisseApi.fetchProduitsCaisse();
      // DÉFAUT NOMMÉ, VOLONTAIREMENT NON CORRIGÉ DANS CE LOT. Le typage de la
      // réponse montre que le serveur peut omettre l'identifiant ou le nom : un
      // tel article entre dans la caisse et la vente partira ensuite sans
      // produit. L'écarter serait la bonne correction — mais un article qui
      // disparaît de l'écran, c'est un changement visible par la marchande, donc
      // un chantier fonctionnel, pas de l'hygiène. On DÉCLARE le trou ; on ne le
      // bouche pas ici. Le comportement reste strictement celui d'avant.
      const mapped = produits.map((p: ProduitServeur) => ({
        id: p.id as string, nom: p.nom as string, prix: Number(p.prix),
        prix_achat: Number(p.prix_achat ?? p.prixAchat ?? 0) || 0,
        categorie: p.categorie as string, stock: Number(p.stock),
        unite: p.unite as string, image: p.image || getImageByNom(p.nom as string),
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
      restaurerDepuisCache(cacheKey);
    }
  }, []);

  useEffect(() => {
    if (appUser?.id) loadProducts();
  }, [appUser?.id, loadProducts]);

  const addProduct = async (product: Omit<CaisseProduct, 'id'> & AliasSaisieProduit) => {
    try {
      const imageToStore = product.image && product.image.startsWith('http') ? product.image : null;
      const produitData = {
        nom: product.nom, prix: product.prix, categorie: product.categorie, stock: product.stock || 0, unite: product.unite, image: imageToStore,
        ...((() => { const pa = Number(product.prix_achat ?? product.prixAchat ?? product.purchasePrice ?? 0); return pa > 0 ? { prix_achat: pa } : {}; })()),
        ...(product.seuil_alerte != null || product.seuilAlerte != null || product.threshold != null
          ? { seuil_alerte: Number(product.seuil_alerte ?? product.seuilAlerte ?? product.threshold) } : {}),
        ...(product.date_peremption || product.datePeremption ? { date_peremption: product.date_peremption ?? product.datePeremption } : {}),
        ...(product.prix_promo != null || product.prixPromo != null
          ? { prix_promo: Number(product.prix_promo ?? product.prixPromo) || null } : {}),
        ...(product.promo_fin || product.promoFin ? { promo_fin: product.promo_fin ?? product.promoFin } : {}),
      };
      const data = await caisseApi.creerProduitCaisse(produitData);
      eventBus.emit(EVENTS.PRODUCT_CREATED, produitData, { priority: 'medium' });
      {
        const p = data.produit;
        // UN PRODUIT SANS IDENTIFIANT N'EST PAS UN PRODUIT. Le typage de la
        // réponse (axe 4) a montré que ce bloc l'acceptait : la ligne entrait
        // dans le catalogue avec `id: undefined`, et la première vente de cet
        // article partait donc sans produit — invendable, sans message.
        // Même défaut nommé qu'au chargement du catalogue, même retenue : le
        // refuser ferait échouer une création qui « passait » avant.
        setProducts(prev => [...prev, {
          id: p.id as string,
          nom: p.nom ?? product.nom,
          prix: Number(p.prix),
          prix_achat: Number(p?.prix_achat ?? p?.prixAchat ?? product.prix_achat ?? 0) || 0,
          categorie: p.categorie ?? product.categorie,
          stock: Number(p.stock),
          unite: p.unite ?? product.unite,
          image: p.image || getImageByNom(p.nom ?? product.nom),
          prix_promo: p.prix_promo != null ? Number(p.prix_promo) : null,
          promo_fin: p.promo_fin || null,
        }]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du produit';
      throw new Error(message);
    }
  };

  const updateProduct = async (id: string, updates: Partial<CaisseProduct> & AliasSaisieProduit) => {
    try {
      const current = products.find(p => p.id === id);
      const updated = { ...current, ...updates };
      const prixAchat = Number(
        updates.prix_achat ??
        updates.prixAchat ??
        updates.purchasePrice ??
        current?.prix_achat ?? 0
      );
      const seuil = updates.seuil_alerte ?? updates.seuilAlerte ?? updates.threshold;
      const peremption = updates.date_peremption ?? updates.datePeremption;
      // Promo : présente dans `updates` seulement si le formulaire l'a envoyée.
      // On la transmet alors explicitement (valeur ou null pour la retirer).
      const promoFournie = 'prix_promo' in updates || 'prixPromo' in updates;
      const prixPromoRaw = updates.prix_promo ?? updates.prixPromo;
      const promoFin = updates.promo_fin ?? updates.promoFin ?? null;
      const updatedWithPrixAchat = {
        ...updated,
        prix_achat: prixAchat,
        ...(seuil != null ? { seuil_alerte: Number(seuil) } : {}),
        ...(peremption ? { date_peremption: peremption } : {}),
        ...(promoFournie
          ? { prix_promo: prixPromoRaw != null && prixPromoRaw !== '' ? Number(prixPromoRaw) : null, promo_fin: promoFin || null }
          : {}),
      };
      await caisseApi.modifierProduitCaisse(id, updatedWithPrixAchat as Record<string, unknown>);
      eventBus.emit(EVENTS.PRODUCT_UPDATED, { id, ...updated }, { idempotencyKey: 'prod-' + id, priority: 'medium' });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      throw new Error(message);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await caisseApi.supprimerProduitCaisse(id);
      eventBus.emit(EVENTS.PRODUCT_DELETED, { id }, { priority: 'medium' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      throw err;
    }
  };

  const getSoldeJour = () => stats.soldeJour;

  const getVentesJour = () => {
    return transactions.filter(tx => tx.type === 'vente' && estDuJour(tx.date));
  };

  const getCahierJour = () => {
    return transactions.filter(tx => tx.type === 'depense' && estDuJour(tx.date));
  };

  const refreshTransactions = async () => {
    await loadTransactions();
  };

  const value: CaisseContextType = {
    transactions,
    loading,
    products,
    cart,
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
    getSoldeJour,
    getVentesJour,
    getCahierJour,
    refreshTransactions,
    syncEnAttente,
    syncOperationsEnAttente,
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
