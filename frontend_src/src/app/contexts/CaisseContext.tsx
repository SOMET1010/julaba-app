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
import { etatCatalogueCaisse, type EtatCatalogueCaisse, type LectureCatalogue } from '../services/etatCatalogueCaisse';
// Couche 2 offline : file d'attente durable des ventes/dépenses + synchro.
import {
  enfilerOperation, synchroniser,
  nbEchecs as offlineNbEchecs, lettresMortes as offlineLettresMortes, purgerLettreMorte as offlinePurger,
  ventesParties, ventesEncoreEnFile,
  type OfflineEndpoint, type OfflineMethod, type LettreMorte,
} from '../voice-offline/offlineCaisse';
// OFF-02 — les trois canaux d'une vente qui part enfin : la clé se choisit
// dans un module pur, la voix passe par le catalogue, la vibration par le
// module haptique commun. Rien n'est composé ici.
import { annonceVentesParties } from '../services/annonceVentesParties';
import { vibrerEnvoyee } from '../utils/haptique';
import { useSpeakMessage } from '../i18n/voice/speakMessage';
import { resoudreMessage, type Variables } from '../i18n/voice/runtime';
import type { MessageId } from '../i18n/voice/types';
import { guidageVocal } from '../utils/accessMode';
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

/**
 * CE QU'UNE VENTE EST DEVENUE, DIT À L'APPELANTE — OFF-01, 21/09/2026.
 *
 * `enregistrerVente` avait TROIS issues qui rendaient toutes `undefined` :
 * mise en file parce que le téléphone est hors ligne, acceptée par le serveur,
 * et mise en file parce que l'envoi est tombé alors que `navigator.onLine`
 * disait « en ligne » (le cas le plus traître). Indiscernables, l'écran les
 * annonçait toutes les trois « Vente réussie », avec vibration de succès et
 * voix de succès, sur une vente qui dormait dans la file.
 *
 * DEUX VALEURS, PAS TROIS : ce qui compte pour la marchande n'est pas POURQUOI
 * la vente attend, c'est QU'ELLE attend. Les deux chemins d'attente rendent
 * donc le même statut.
 *
 * UN OBJET, PAS UNE CHAÎNE NUE : `resultat.statut` se lit à l'appel, ne se
 * confond avec aucun autre `string` de la caisse, et laisse la place à un
 * champ supplémentaire (l'identifiant de file, par exemple) sans toucher aux
 * appelantes.
 *
 * OÙ VIT CE TYPE, ET QUI LE PRODUIT. Il est DÉCLARÉ une seule fois, dans
 * `types/statutEnregistrement` — un module sans dépendance, parce que le reçu
 * (`utils/recu.utils.ts`) doit le connaître et qu'un util pur n'a rien à faire
 * d'un module de contexte React. Il est ré-exporté ici pour que les écrans de
 * caisse continuent de le prendre à un seul endroit.
 *
 * Il est PRODUIT par `enregistrerVente`, ci-dessous, qui est le seul à savoir
 * ce qui est arrivé à la vente. UNE SEULE EXCEPTION, nommée : la vente à
 * CRÉDIT (`handleCreditSuccess` dans `POSCaisse.tsx`) pose `'confirmee'` en
 * dur. Elle ne passe pas par ici — le crédit a son propre appel serveur, et ce
 * gestionnaire ne tourne qu'APRÈS son accusé de réception ; le chemin est de
 * surcroît inactif en pilote espèces (`CAISSE_CREDIT_ACTIF = false`, modale
 * non montée). Le rebrancher sur le contexte pour la beauté du commentaire
 * ferait bouger du code d'argent mort et non couvert : on préfère l'écrire.
 *
 * Ce qu'aucun écran ne doit faire, en revanche : REDÉDUIRE ce statut de
 * `navigator.onLine` après coup. Le navigateur ment quand l'envoi tombe.
 *
 * CE QUI N'EST PAS UN STATUT : une erreur métier 4xx. Elle continue d'être
 * levée — une vente refusée n'est ni confirmée ni en attente.
 */
export type { StatutEnregistrement, ResultatEnregistrement } from '../types/statutEnregistrement';
import type { ResultatEnregistrement } from '../types/statutEnregistrement';

export interface CaisseTransaction {
  id: string;
  marchandId: string;
  type: 'vente' | 'depense' | 'approvisionnement';
  montant: number;
  produits?: LigneDeVente[] | unknown;
  mode_paiement?: string;
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

/** Des ventes gardées hors ligne viennent d'être acceptées par le serveur.
 *  `restantes` = les ventes encore en file APRÈS ce tour : sans elle, on
 *  laisserait croire que tout est parti. */
export interface VentesSynchronisees {
  ventes: number;
  restantes: number;
  /** Horodatage de la nouvelle (la plus récente l'emporte à l'affichage). */
  a: number;
}

interface CaisseContextType {
  transactions: CaisseTransaction[];
  loading: boolean;
  products: CaisseProduct[];
  cart: CartItem[];
  stats: CaisseStats;
  selectedProduct: CaisseProduct | null;
  setSelectedProduct: (p: CaisseProduct | null) => void;
  
  /** Rend TOUJOURS le statut de la vente (OFF-01) : `confirmee` quand le
   *  serveur a accusé réception, `en_attente` quand elle dort dans la file
   *  durable. Une erreur métier 4xx est levée, pas rendue. */
  enregistrerVente: (montant: number, produits?: LigneDeVente[], modePaiement?: string, notes?: string, source?: 'vocal' | 'kassa') => Promise<ResultatEnregistrement>;
  /** `description` : le MOTIF de la dépense, sous son nom canonique — celui de
   *  la colonne, de l'entité et de la route. Il s'appelait `notes` ici, et le
   *  serveur ne le lisait jamais (DEP-01). */
  enregistrerDepense: (montant: number, description?: string) => Promise<void>;
  
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
  /** CAI-01 — ce que la caisse a le DROIT d'affirmer sur son catalogue.
   *  Ne remplace pas `products` : il dit seulement pourquoi la liste
   *  est ce qu'elle est. Un écran ne peut plus confondre « rien créé »
   *  et « pas pu demander ». */
  etatCatalogue: EtatCatalogueCaisse;
  
  // Transactions (alias)
  addTransaction: (tx: Omit<CaisseTransaction, 'id' | 'date'>) => Promise<void>;

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

  // File hors-ligne — ventes GARDÉES qui viennent enfin de partir (OFF-02).
  /** La dernière nouvelle à donner à la marchande, ou `null` s'il n'y en a
   *  pas. Elle vit ICI, dans le contexte monté pour toute l'application, et
   *  non dans l'écran de vente : le rejeu tourne souvent alors que la
   *  marchande est ailleurs, ou que l'application vient de redémarrer. Une
   *  notification posée dans un composant démonté serait perdue. */
  ventesSynchronisees: VentesSynchronisees | null;
  /** La marchande a vu la nouvelle : on l'efface. */
  accuserVentesSynchronisees: () => void;
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
  // ── CAI-01 — OÙ EN EST LA LECTURE DU CATALOGUE ───────────────────────────
  // `loadProducts` avale son échec et se replie sur le cache du téléphone :
  // c'est la BONNE décision sur un marché sans réseau. Mais quand le cache est
  // vide lui aussi, la liste reste `[]` — et `[]` s'affichait « Aucun produit »,
  // la même phrase que « tu n'as rien créé ». Deux situations, une phrase.
  // On CONSERVE donc l'information au lieu de la perdre : ce que la caisse a le
  // droit d'affirmer se décide dans `services/etatCatalogueCaisse.ts`.
  const [lectureCatalogue, setLectureCatalogue] = useState<LectureCatalogue>('jamais');
  const [produitsDepuisCache, setProduitsDepuisCache] = useState(false);
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
  // OFF-02 : la bonne nouvelle, gardée au niveau du contexte pour qu'elle
  // survive à l'écran de vente refermé (voir CaisseContextType).
  const [ventesSynchronisees, setVentesSynchronisees] = useState<VentesSynchronisees | null>(null);
  const accuserVentesSynchronisees = useCallback(() => setVentesSynchronisees(null), []);
  // LES PHRASES SONT DES CLÉS. `direMessage` dit la phrase quand le guidage
  // vocal est actif, et rend TOUJOURS son texte résolu — pour que ce qui est
  // affiché soit exactement ce qui est dit, sans seconde rédaction. Le mute
  // global reste en aval (AppContext.speak) : muette veut dire muette, argent
  // compris — arbitrage de Patrick, il n'est pas contourné ici.
  const speakMessage = useSpeakMessage();
  const direMessage = (id: MessageId, vars?: Variables) => (
    guidageVocal() ? speakMessage(id, vars) : resoudreMessage(id, vars)
  );
  const rafraichirEchecs = useCallback(async () => {
    const uid = appUser?.id;
    if (!uid) { setSyncEchecs(0); setSyncLettresMortes([]); return; }
    try { setSyncEchecs(await offlineNbEchecs(uid)); setSyncLettresMortes(await offlineLettresMortes(uid)); }
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

      const txList: CaisseTransaction[] = data.map((tx: caisseApi.CaisseTransaction) => ({
        id: tx.id,
        marchandId: tx.marchand_id,
        type: tx.type,
        montant: parseFloat(String(tx.montant)) || 0,
        produits: tx.produits,
        mode_paiement: tx.mode_paiement,
        notes: tx.notes,
        date: tx.created_at,
        statut: tx.statut,
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
        const bilan = await synchroniser(posterOperation, uid);
        const { ok, echecs, reste } = bilan;
        if (ok > 0) await loadTransactions();
        await rafraichirEchecs();
        // OFF-02 — LA VENTE QUI PART ENFIN SE SAIT.
        //
        // On ne le déduit JAMAIS de `ok`, qui compte des opérations toutes
        // natures confondues : une dépense rejouée y pèse autant qu'une
        // vente. On lit la ventilation par point de terminaison, la nature
        // que la file portait déjà. Zéro vente partie = silence total.
        //
        // UNE SALVE, UNE ANNONCE : trois ventes se disent une fois avec leur
        // nombre. Et tant qu'il en reste en file, la phrase le dit — on
        // n'annonce pas « tout est parti » sur une file à moitié vidée.
        const annonce = annonceVentesParties(ventesParties(bilan), ventesEncoreEnFile(bilan));
        if (annonce) {
          const message = direMessage(annonce.cle, annonce.variables);
          vibrerEnvoyee();
          setVentesSynchronisees((precedent) => ({
            // Deux salves avant qu'elle n'ait regardé : on additionne, on ne
            // remplace pas — sinon la première nouvelle disparaîtrait sans
            // avoir été vue.
            ventes: (precedent?.ventes ?? 0) + annonce.variables.nombre,
            restantes: annonce.variables.reste,
            a: Date.now(),
          }));
          toast.success(message.texte);
        }
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
  ): Promise<ResultatEnregistrement> => {
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
    // Hors-ligne : on met la vente dans la file durable (rejeu à la reconnexion).
    // FAIL CLOSED : si appUser?.id est absent (session perdue), enfilerOperation
    // refuse — jamais de vente mise en file sous un propriétaire de secours
    // ('anon'). L'erreur remonte à l'appelant (déjà géré par l'UI existante).
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enfilerOperation('/caisse/vente', payload, appUser?.id);
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
      // La vente est GARDÉE, pas enregistrée : c'est ce que l'appelante doit
      // pouvoir dire à la marchande (OFF-01).
      return { statut: 'en_attente' };
    }
    try {
      await caisseApi.enregistrerVente(payload);
      await loadTransactions();
      // Notifier AppContext de recharger ses transactions
      eventBus.emit(EVENTS.CAISSE_VENTE, { montant }, { priority: 'high' });
      // Le serveur a accusé réception : c'est la SEULE issue qui vaut succès.
      return { statut: 'confirmee' };
    } catch (error: any) {
      // Ne JAMAIS perdre une vente : hors-ligne, token expiré, panne réseau ou
      // serveur temporairement KO -> on l'enfile (rejeu avec la MÊME clé, donc
      // pas de double-comptage même si la vente était déjà passée). Une vraie
      // erreur métier 4xx est remontée à l'utilisateur.
      if (doitEnfiler(error)) {
        await enfilerOperation('/caisse/vente', payload, appUser?.id);
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
        // LE CAS TRAÎTRE : `navigator.onLine` disait « en ligne », l'envoi est
        // tombé quand même. La vente attend exactement comme hors ligne, et se
        // dit de la même façon — une seule attente, un seul statut.
        return { statut: 'en_attente' };
      }
      throw error;
    }
  };

  // LE MOTIF DE LA DÉPENSE PART SOUS SON VRAI NOM — DEP-01, 21/09/2026.
  //
  // Ce payload envoyait `notes`. Le serveur lit `description`, la colonne
  // s'appelle `description` : le motif saisi par la marchande n'arrivait JAMAIS
  // en base, et rien ne le disait. La même perte se rejouait à la
  // synchronisation, la file repoussant le payload tel quel.
  const enregistrerDepense = async (montant: number, description?: string) => {
    if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant de dépense invalide');
    const payload: caisseApi.EnregistrerDepenseData = { montant, description, idempotency_key: genererCle() };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enfilerOperation('/caisse/depense', payload, appUser?.id);
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
        await enfilerOperation('/caisse/depense', payload, appUser?.id);
        eventBus.emit(EVENTS.CAISSE_VENTE, { montant, offline: true }, { priority: 'high' });
        return;
      }
      throw error;
    }
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
      if (raw) {
        setProducts(JSON.parse(raw));
        // On NOTE que ces produits viennent du téléphone, pas du serveur.
        // Les montrer est juste ; les présenter comme à jour ne l'est pas.
        setProduitsDepuisCache(true);
      }
    } catch { /* un cache illisible ne doit jamais casser l'écran */ }
  };

  const loadProducts = useCallback(async () => {
    const cacheKey = (() => {
      try { const r = localStorage.getItem('julaba_auth_user'); const id = r ? (JSON.parse(r).id || 'anon') : 'anon'; return `julaba_cache_produits_${id}`; }
      catch { return 'julaba_cache_produits_anon'; }
    })();
    setLectureCatalogue('chargement');
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
      setProduitsDepuisCache(false);
      setLectureCatalogue('lu');
      // Cache local : derniers produits connus (vente/stock consultables hors-ligne).
      try { localStorage.setItem(cacheKey, JSON.stringify(mapped)); } catch { /* ignore */ }
    } catch (err: unknown) {
      console.warn('[CaisseContext] loadProducts failed:', err instanceof Error ? err.message : err);
      // Hors-ligne : servir les derniers produits connus. L'échec n'est plus
      // avalé — il est CONSERVÉ, pour que l'écran cesse de dire « aucun ».
      setLectureCatalogue('echec');
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
    // La règle vit dans un module pur, pas ici : elle est relisible seule.
    etatCatalogue: etatCatalogueCaisse({
      lecture: lectureCatalogue,
      nbProduits: products.length,
      servisDepuisCache: produitsDepuisCache,
    }),
    addTransaction,
    getSoldeJour,
    getVentesJour,
    getCahierJour,
    refreshTransactions,
    syncEchecs,
    syncLettresMortes,
    purgerEchecSync,
    ventesSynchronisees,
    accuserVentesSynchronisees,
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
